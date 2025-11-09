import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import boto3
from boto3.dynamodb.conditions import Attr, Key

from app.models.prompt_model import (
    Comment,
    CommentCreate,
    Prompt,
    PromptChange,
    PromptCreate,
    PromptHistory,
    PromptListResponse,
    PromptUpdate,
    ProposalSection,
)

logger = logging.getLogger(__name__)


class PromptService:
    def __init__(self):
        # Use specific AWS profile and region
        session = boto3.Session(profile_name="IBD-DEV", region_name="us-east-1")
        self.dynamodb = session.resource("dynamodb")
        self.table_name = "igad-testing-main-table"  # Use existing table
        self.table = self.dynamodb.Table(self.table_name)

    def _generate_prompt_id(self) -> str:
        """Generate unique prompt ID"""
        return str(uuid.uuid4())

    def _get_current_timestamp(self) -> str:
        """Get current ISO timestamp"""
        return datetime.utcnow().isoformat() + "Z"

    def _prompt_to_item(self, prompt: Prompt) -> Dict[str, Any]:
        """Convert Prompt model to DynamoDB item"""
        item = {
            "PK": f"prompt#{prompt.id}",
            "SK": f"version#{prompt.version}",
            "id": prompt.id,
            "name": prompt.name,
            "section": prompt.section.value,
            "tags": prompt.tags,
            "version": prompt.version,
            "is_active": prompt.is_active,
            "system_prompt": prompt.system_prompt,
            "user_prompt_template": prompt.user_prompt_template,
            "created_by": prompt.created_by,
            "updated_by": prompt.updated_by,
            "created_at": prompt.created_at.isoformat() + "Z",
            "updated_at": prompt.updated_at.isoformat() + "Z",
        }

        if prompt.route:
            item["route"] = prompt.route

        if prompt.few_shot:
            item["few_shot"] = [fs.dict() for fs in prompt.few_shot]

        if prompt.context:
            item["context"] = prompt.context.dict(exclude_none=True)

        return item

    def _item_to_prompt(self, item: Dict[str, Any]) -> Prompt:
        """Convert DynamoDB item to Prompt model"""
        return Prompt(
            id=item["id"],
            name=item["name"],
            section=ProposalSection(item["section"]),
            route=item.get("route"),
            tags=item.get("tags", []),
            version=item["version"],
            is_active=item.get(
                "is_active", True
            ),  # Default to True for backward compatibility
            system_prompt=item["system_prompt"],
            user_prompt_template=item["user_prompt_template"],
            few_shot=item.get("few_shot"),
            context=item.get("context"),
            created_by=item["created_by"],
            updated_by=item["updated_by"],
            created_at=datetime.fromisoformat(item["created_at"].replace("Z", "")),
            updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "")),
            comments_count=item.get("comments_count", 0),
        )

    async def create_prompt(self, prompt_data: PromptCreate, user_id: str) -> Prompt:
        """Create a new prompt (version 1, active by default)"""
        prompt_id = self._generate_prompt_id()
        now = datetime.utcnow()

        # Check for active prompt conflict (new prompts are active by default)
        is_active = True
        existing_active = self._find_active_prompt_by_section_route(
            prompt_data.section, prompt_data.route or ""
        )
        if existing_active:
            raise ValueError("Duplicate active prompt for this section and route")

        prompt = Prompt(
            id=prompt_id,
            version=1,
            is_active=is_active,
            created_by=user_id,
            updated_by=user_id,
            created_at=now,
            updated_at=now,
            **prompt_data.dict(),
        )

        item = self._prompt_to_item(prompt)

        try:
            self.table.put_item(Item=item)

            # Record initial creation in history
            await self.record_change(
                prompt_id=prompt_id,
                version=1,
                change_type="create",
                changes={},  # No changes for initial creation
                user_id=user_id,
                user_name=user_id,  # user_id is now email
                comment="Initial prompt creation",
            )

            logger.info(f"Created prompt {prompt_id} v{prompt.version}")
            return prompt
        except Exception as e:
            logger.error(f"Error creating prompt: {e}")
            raise

    async def get_prompt(
        self, prompt_id: str, version: Optional[int] = None
    ) -> Optional[Prompt]:
        """Get a specific prompt version or latest"""
        try:
            if version:
                # Get specific version
                response = self.table.get_item(
                    Key={"PK": f"prompt#{prompt_id}", "SK": f"version#{version}"}
                )
            else:
                # Get latest version
                response = self.table.query(
                    KeyConditionExpression=Key("PK").eq(f"prompt#{prompt_id}"),
                    ScanIndexForward=False,  # Descending order
                    Limit=1,
                )

            if version and "Item" in response:
                return self._item_to_prompt(response["Item"])
            elif not version and response["Items"]:
                return self._item_to_prompt(response["Items"][0])
            else:
                return None

        except Exception as e:
            logger.error(f"Error getting prompt {prompt_id}: {e}")
            raise

    async def update_prompt(
        self, prompt_id: str, prompt_data: PromptUpdate, user_id: str
    ) -> Prompt:
        """Update prompt (creates new version if published, edits draft if draft)"""
        # Get current prompt
        current_prompt = await self.get_prompt(prompt_id)
        if not current_prompt:
            raise ValueError(f"Prompt {prompt_id} not found")

        # Create updated prompt
        update_data = prompt_data.dict(exclude_none=True)
        prompt_dict = current_prompt.dict()

        # Track changes for history
        changes = {}
        for key, new_value in update_data.items():
            if key == "change_comment":
                continue  # Don't track the comment itself as a change
            old_value = prompt_dict.get(key)
            if old_value != new_value:
                changes[key] = {"old": old_value, "new": new_value}

        prompt_dict.update(update_data)
        prompt_dict.update({"updated_by": user_id, "updated_at": datetime.utcnow()})

        # Check for active prompt conflict if this update would make it active
        if prompt_dict.get("is_active", False):
            section = prompt_dict.get("section")
            route = prompt_dict.get("route", "")

            existing_active = self._find_active_prompt_by_section_route(
                section, route, exclude_id=prompt_id
            )
            # If there's another active prompt with same section+route, reject the update
            if existing_active:
                raise ValueError("Duplicate active prompt for this section and route")

        updated_prompt = Prompt(**prompt_dict)
        item = self._prompt_to_item(updated_prompt)

        try:
            self.table.put_item(Item=item)

            # Record change in history if there were actual changes
            if changes:
                await self.record_change(
                    prompt_id=prompt_id,
                    version=current_prompt.version,
                    change_type="update",
                    changes=changes,
                    user_id=user_id,
                    user_name=user_id,  # Now user_id is email, so use it as display name too
                    comment=update_data.get("change_comment"),
                )

            logger.info(f"Updated prompt {prompt_id}")
            return updated_prompt
        except Exception as e:
            logger.error(f"Error updating prompt: {e}")
            raise

    async def delete_prompt(
        self, prompt_id: str, version: Optional[int] = None
    ) -> bool:
        """Delete a prompt version or all versions"""
        try:
            if version:
                # Delete specific version
                self.table.delete_item(
                    Key={"PK": f"prompt#{prompt_id}", "SK": f"version#{version}"}
                )
                logger.info(f"Deleted prompt {prompt_id} v{version}")
            else:
                # Delete all versions
                response = self.table.query(
                    KeyConditionExpression=Key("PK").eq(f"prompt#{prompt_id}")
                )

                for item in response["Items"]:
                    self.table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})

                logger.info(f"Deleted all versions of prompt {prompt_id}")

            return True
        except Exception as e:
            logger.error(f"Error deleting prompt: {e}")
            raise

    async def list_prompts(
        self,
        section: Optional[ProposalSection] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        route: Optional[str] = None,
        is_active: Optional[bool] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> PromptListResponse:
        """List prompts with filtering and pagination"""
        try:
            # For MVP, we'll scan the table and filter in memory
            # In production, consider using GSIs for better performance

            response = self.table.scan()
            items = response["Items"]

            # Filter out helper items
            items = [item for item in items if item["SK"].startswith("version#")]

            # Apply filters
            if section:
                items = [item for item in items if item.get("section") == section.value]

            if tag:
                items = [item for item in items if tag in item.get("tags", [])]

            if route:
                items = [item for item in items if route in (item.get("route") or "")]

            if is_active is not None:
                items = [
                    item for item in items if item.get("is_active", True) == is_active
                ]

            if search:
                search_lower = search.lower()
                items = [
                    item
                    for item in items
                    if search_lower in item.get("name", "").lower()
                    or search_lower in item.get("system_prompt", "").lower()
                    or search_lower in item.get("user_prompt_template", "").lower()
                    or search_lower in item.get("route", "").lower()
                    or any(search_lower in tag.lower() for tag in item.get("tags", []))
                ]

            # Sort by updated_at descending
            items.sort(key=lambda x: x.get("updated_at", ""), reverse=True)

            # Pagination
            total = len(items)
            start_idx = offset
            end_idx = offset + limit
            page_items = items[start_idx:end_idx]

            prompts = [self._item_to_prompt(item) for item in page_items]

            return PromptListResponse(
                prompts=prompts, total=total, has_more=end_idx < total
            )

        except Exception as e:
            logger.error(f"Error listing prompts: {e}")
            raise

    async def get_prompt_by_section(self, section: ProposalSection) -> Optional[Prompt]:
        """Get the latest published prompt for a section"""
        try:
            # For MVP, scan and filter
            # In production, use GSI_Section_Status
            response = self.table.scan(
                FilterExpression=Attr("section").eq(section.value)
                & Attr("status").eq("published")
            )

            if not response["Items"]:
                return None

            # Get the latest by updated_at
            items = sorted(
                response["Items"], key=lambda x: x.get("updated_at", ""), reverse=True
            )
            return self._item_to_prompt(items[0])

        except Exception as e:
            logger.error(f"Error getting prompt by section {section}: {e}")
            raise

    async def toggle_active(self, prompt_id: str) -> Optional[Prompt]:
        """Toggle prompt active status"""
        try:
            # Get current prompt - use the correct key structure
            response = self.table.query(
                KeyConditionExpression=Key("PK").eq(f"prompt#{prompt_id}"),
                ScanIndexForward=False,
                Limit=1,
            )

            if not response["Items"]:
                return None

            item = response["Items"][0]
            current_active = item.get("is_active", True)
            new_active = not current_active

            # If activating, check for conflicts
            if new_active:
                section = item.get("section")
                route = item.get("route", "")

                # Check for other active prompts with same section and route
                existing_active = await self._find_active_prompt_by_section_route(
                    section, route, prompt_id
                )
                if existing_active:
                    raise ValueError(
                        f"Another prompt is already active for section '{section}' and route '{route}'. Only one prompt can be active per section-route combination."
                    )

            # Update active status
            now = datetime.utcnow()

            # Update the item
            self.table.update_item(
                Key={"PK": item["PK"], "SK": item["SK"]},
                UpdateExpression="SET is_active = :active, updated_at = :updated_at",
                ExpressionAttributeValues={
                    ":active": new_active,
                    ":updated_at": now.isoformat(),
                },
            )

            # Return updated prompt
            item["is_active"] = new_active
            item["updated_at"] = now.isoformat()

            return self._item_to_prompt(item)

        except Exception as e:
            logger.error(f"Error toggling prompt active status: {e}")
            raise

    def _find_active_prompt_by_section_route(
        self, section: str, route: str, exclude_id: str = None
    ) -> Optional[Prompt]:
        """Find active prompt with same section and route"""
        try:
            # Get all prompts and filter in Python (more reliable than DynamoDB FilterExpression)
            response = self.table.scan()
            items = response.get("Items", [])

            # Filter for prompts (not other items)
            prompt_items = [
                item
                for item in items
                if item.get("PK", "").startswith("prompt#")
                and item.get("SK", "").startswith("version#")
            ]

            # Find active prompt with matching section and route
            for item in prompt_items:
                if (
                    item.get("section") == section
                    and item.get("route") == route
                    and item.get("is_active", False) is True
                ):

                    # Exclude the current prompt if specified
                    prompt_id = item.get("PK", "").replace("prompt#", "")
                    if exclude_id and prompt_id == exclude_id:
                        continue

                    return self._item_to_prompt(item)

            return None

        except Exception as e:
            logger.error(f"Error finding active prompt by section/route: {e}")
            return None

    # Comments Methods
    async def add_comment(
        self,
        prompt_id: str,
        comment_data: "CommentCreate",
        user_id: str,
        user_name: str,
    ) -> "Comment":
        """Add a comment to a prompt."""
        comment_id = str(uuid.uuid4())
        now = datetime.utcnow()

        comment = Comment(
            id=comment_id,
            prompt_id=prompt_id,
            parent_id=comment_data.parent_id,
            content=comment_data.content,
            author=user_id,
            author_name=user_name,
            created_at=now,
        )

        # Store comment in DynamoDB
        item = {
            "PK": f"prompt#{prompt_id}",
            "SK": f"comment#{comment_id}",
            "id": comment_id,
            "prompt_id": prompt_id,
            "parent_id": comment_data.parent_id,
            "content": comment_data.content,
            "author": user_id,
            "author_name": user_name,
            "created_at": now.isoformat(),
            "type": "comment",
        }

        try:
            self.table.put_item(Item=item)

            # Update comments count
            await self.update_comments_count(prompt_id)

            logger.info(f"Added comment {comment_id} to prompt {prompt_id}")
            return comment
        except Exception as e:
            logger.error(f"Error adding comment: {e}")
            raise

    async def get_comments(self, prompt_id: str) -> List["Comment"]:
        """Get all comments for a prompt"""
        from app.models.prompt_model import Comment

        try:
            response = self.table.query(
                KeyConditionExpression=Key("PK").eq(f"prompt#{prompt_id}")
                & Key("SK").begins_with("comment#")
            )

            comments = []
            for item in response.get("Items", []):
                comment = Comment(
                    id=item["id"],
                    prompt_id=item["prompt_id"],
                    parent_id=item.get("parent_id"),
                    content=item["content"],
                    author=item["author"],
                    author_name=item["author_name"],
                    created_at=datetime.fromisoformat(item["created_at"]),
                    updated_at=(
                        datetime.fromisoformat(item["updated_at"])
                        if item.get("updated_at")
                        else None
                    ),
                )
                comments.append(comment)

            # Organize replies
            comment_dict = {c.id: c for c in comments}
            root_comments = []

            for comment in comments:
                if comment.parent_id and comment.parent_id in comment_dict:
                    comment_dict[comment.parent_id].replies.append(comment)
                else:
                    root_comments.append(comment)

            return sorted(root_comments, key=lambda x: x.created_at, reverse=True)

        except Exception as e:
            logger.error(f"Error getting comments for prompt {prompt_id}: {e}")
            return []

    # Change History Methods
    async def record_change(
        self,
        prompt_id: str,
        version: int,
        change_type: str,
        changes: Dict[str, Any],
        user_id: str,
        user_name: str,
        comment: Optional[str] = None,
    ):
        """Record a change in prompt history"""
        change_id = str(uuid.uuid4())
        now = datetime.utcnow()

        item = {
            "PK": f"prompt#{prompt_id}",
            "SK": f"change#{now.isoformat()}#{change_id}",
            "id": change_id,
            "prompt_id": prompt_id,
            "version": version,
            "change_type": change_type,
            "changes": changes,
            "comment": comment,
            "author": user_id,
            "author_name": user_name,
            "created_at": now.isoformat(),
            "type": "change",
        }

        try:
            self.table.put_item(Item=item)
            logger.info(f"Recorded change {change_id} for prompt {prompt_id}")
        except Exception as e:
            logger.error(f"Error recording change: {e}")

    async def get_prompt_history(self, prompt_id: str) -> "PromptHistory":
        """Get change history for a prompt."""
        try:
            response = self.table.query(
                KeyConditionExpression=Key("PK").eq(f"prompt#{prompt_id}")
                & Key("SK").begins_with("change#"),
                ScanIndexForward=False,  # Most recent first
            )

            changes = []
            for item in response.get("Items", []):
                change = PromptChange(
                    id=item["id"],
                    prompt_id=item["prompt_id"],
                    version=item["version"],
                    change_type=item["change_type"],
                    changes=item["changes"],
                    comment=item.get("comment"),
                    author=item["author"],
                    author_name=item["author_name"],
                    created_at=datetime.fromisoformat(item["created_at"]),
                )
                changes.append(change)

            return PromptHistory(
                prompt_id=prompt_id, changes=changes, total=len(changes)
            )

        except Exception as e:
            logger.error(f"Error getting history for prompt {prompt_id}: {e}")
            return PromptHistory(prompt_id=prompt_id, changes=[], total=0)

    async def update_comments_count(self, prompt_id: str):
        """Update the comments count for a prompt"""
        try:
            # Count comments for this prompt
            response = self.table.query(
                KeyConditionExpression=Key("PK").eq(f"prompt#{prompt_id}")
                & Key("SK").begins_with("comment#")
            )

            comments_count = len(response.get("Items", []))

            # Update the prompt with the new count
            prompt = await self.get_prompt(prompt_id)
            if prompt:
                item = self._prompt_to_item(prompt)
                item["comments_count"] = comments_count

                self.table.put_item(Item=item)
                logger.info(
                    f"Updated comments count for prompt {prompt_id}: {comments_count}"
                )

        except Exception as e:
            logger.error(f"Error updating comments count for prompt {prompt_id}: {e}")
