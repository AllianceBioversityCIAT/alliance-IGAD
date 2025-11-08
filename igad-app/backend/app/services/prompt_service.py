import boto3
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from boto3.dynamodb.conditions import Key, Attr
from app.models.prompt_model import (
    Prompt, PromptCreate, PromptUpdate, PromptStatus, 
    ProposalSection, PromptListResponse
)
import logging

logger = logging.getLogger(__name__)

class PromptService:
    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = 'igad-testing-main-table'  # Use existing table
        self.table = self.dynamodb.Table(self.table_name)
        
    def _generate_prompt_id(self) -> str:
        """Generate unique prompt ID"""
        return str(uuid.uuid4())
    
    def _get_current_timestamp(self) -> str:
        """Get current ISO timestamp"""
        return datetime.utcnow().isoformat() + 'Z'
    
    def _prompt_to_item(self, prompt: Prompt) -> Dict[str, Any]:
        """Convert Prompt model to DynamoDB item"""
        item = {
            'PK': f'prompt#{prompt.id}',
            'SK': f'version#{prompt.version}',
            'id': prompt.id,
            'name': prompt.name,
            'section': prompt.section.value,
            'tags': prompt.tags,
            'version': prompt.version,
            'status': prompt.status.value,
            'system_prompt': prompt.system_prompt,
            'user_prompt_template': prompt.user_prompt_template,
            'created_by': prompt.created_by,
            'updated_by': prompt.updated_by,
            'created_at': prompt.created_at.isoformat() + 'Z',
            'updated_at': prompt.updated_at.isoformat() + 'Z'
        }
        
        if prompt.route:
            item['route'] = prompt.route
            
        if prompt.few_shot:
            item['few_shot'] = [fs.dict() for fs in prompt.few_shot]
            
        if prompt.context:
            item['context'] = prompt.context.dict(exclude_none=True)
            
        return item
    
    def _item_to_prompt(self, item: Dict[str, Any]) -> Prompt:
        """Convert DynamoDB item to Prompt model"""
        return Prompt(
            id=item['id'],
            name=item['name'],
            section=ProposalSection(item['section']),
            route=item.get('route'),
            tags=item.get('tags', []),
            version=item['version'],
            status=PromptStatus(item['status']),
            system_prompt=item['system_prompt'],
            user_prompt_template=item['user_prompt_template'],
            few_shot=item.get('few_shot'),
            context=item.get('context'),
            created_by=item['created_by'],
            updated_by=item['updated_by'],
            created_at=datetime.fromisoformat(item['created_at'].replace('Z', '')),
            updated_at=datetime.fromisoformat(item['updated_at'].replace('Z', ''))
        )
    
    async def create_prompt(self, prompt_data: PromptCreate, user_id: str) -> Prompt:
        """Create a new prompt (version 1, draft status)"""
        prompt_id = self._generate_prompt_id()
        now = datetime.utcnow()
        
        prompt = Prompt(
            id=prompt_id,
            version=1,
            status=PromptStatus.DRAFT,
            created_by=user_id,
            updated_by=user_id,
            created_at=now,
            updated_at=now,
            **prompt_data.dict()
        )
        
        item = self._prompt_to_item(prompt)
        
        try:
            self.table.put_item(Item=item)
            logger.info(f"Created prompt {prompt_id} v{prompt.version}")
            return prompt
        except Exception as e:
            logger.error(f"Error creating prompt: {e}")
            raise
    
    async def get_prompt(self, prompt_id: str, version: Optional[int] = None) -> Optional[Prompt]:
        """Get a specific prompt version or latest"""
        try:
            if version:
                # Get specific version
                response = self.table.get_item(
                    Key={
                        'PK': f'prompt#{prompt_id}',
                        'SK': f'version#{version}'
                    }
                )
            else:
                # Get latest version
                response = self.table.query(
                    KeyConditionExpression=Key('PK').eq(f'prompt#{prompt_id}'),
                    ScanIndexForward=False,  # Descending order
                    Limit=1
                )
                
            if version and 'Item' in response:
                return self._item_to_prompt(response['Item'])
            elif not version and response['Items']:
                return self._item_to_prompt(response['Items'][0])
            else:
                return None
                
        except Exception as e:
            logger.error(f"Error getting prompt {prompt_id}: {e}")
            raise
    
    async def update_prompt(self, prompt_id: str, prompt_data: PromptUpdate, user_id: str) -> Prompt:
        """Update prompt (creates new version if published, edits draft if draft)"""
        # Get current latest version
        current_prompt = await self.get_prompt(prompt_id)
        if not current_prompt:
            raise ValueError(f"Prompt {prompt_id} not found")
        
        # If current is published, create new version
        if current_prompt.status == PromptStatus.PUBLISHED:
            new_version = current_prompt.version + 1
        else:
            # Edit current draft
            new_version = current_prompt.version
            # Delete current draft
            self.table.delete_item(
                Key={
                    'PK': f'prompt#{prompt_id}',
                    'SK': f'version#{current_prompt.version}'
                }
            )
        
        # Create updated prompt
        update_data = prompt_data.dict(exclude_none=True)
        prompt_dict = current_prompt.dict()
        prompt_dict.update(update_data)
        prompt_dict.update({
            'version': new_version,
            'status': PromptStatus.DRAFT,
            'updated_by': user_id,
            'updated_at': datetime.utcnow()
        })
        
        updated_prompt = Prompt(**prompt_dict)
        item = self._prompt_to_item(updated_prompt)
        
        try:
            self.table.put_item(Item=item)
            logger.info(f"Updated prompt {prompt_id} to v{new_version}")
            return updated_prompt
        except Exception as e:
            logger.error(f"Error updating prompt: {e}")
            raise
    
    async def publish_prompt(self, prompt_id: str, version: int, user_id: str) -> Prompt:
        """Publish a specific version of a prompt"""
        prompt = await self.get_prompt(prompt_id, version)
        if not prompt:
            raise ValueError(f"Prompt {prompt_id} v{version} not found")
        
        if prompt.status == PromptStatus.PUBLISHED:
            return prompt  # Already published
        
        # Update status to published
        prompt.status = PromptStatus.PUBLISHED
        prompt.updated_by = user_id
        prompt.updated_at = datetime.utcnow()
        
        item = self._prompt_to_item(prompt)
        
        try:
            self.table.put_item(Item=item)
            
            # Create/update latest published pointer
            self.table.put_item(
                Item={
                    'PK': f'prompt#{prompt_id}',
                    'SK': 'published#latest',
                    'latest_version': version,
                    'updated_at': self._get_current_timestamp()
                }
            )
            
            logger.info(f"Published prompt {prompt_id} v{version}")
            return prompt
        except Exception as e:
            logger.error(f"Error publishing prompt: {e}")
            raise
    
    async def delete_prompt(self, prompt_id: str, version: Optional[int] = None) -> bool:
        """Delete a prompt version or all versions"""
        try:
            if version:
                # Delete specific version
                self.table.delete_item(
                    Key={
                        'PK': f'prompt#{prompt_id}',
                        'SK': f'version#{version}'
                    }
                )
                logger.info(f"Deleted prompt {prompt_id} v{version}")
            else:
                # Delete all versions
                response = self.table.query(
                    KeyConditionExpression=Key('PK').eq(f'prompt#{prompt_id}')
                )
                
                for item in response['Items']:
                    self.table.delete_item(
                        Key={
                            'PK': item['PK'],
                            'SK': item['SK']
                        }
                    )
                
                logger.info(f"Deleted all versions of prompt {prompt_id}")
            
            return True
        except Exception as e:
            logger.error(f"Error deleting prompt: {e}")
            raise
    
    async def list_prompts(
        self,
        section: Optional[ProposalSection] = None,
        status: Optional[PromptStatus] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> PromptListResponse:
        """List prompts with filtering and pagination"""
        try:
            # For MVP, we'll scan the table and filter in memory
            # In production, consider using GSIs for better performance
            
            response = self.table.scan()
            items = response['Items']
            
            # Filter out helper items
            items = [item for item in items if item['SK'].startswith('version#')]
            
            # Apply filters
            if section:
                items = [item for item in items if item.get('section') == section.value]
            
            if status:
                items = [item for item in items if item.get('status') == status.value]
            
            if tag:
                items = [item for item in items if tag in item.get('tags', [])]
            
            if search:
                search_lower = search.lower()
                items = [
                    item for item in items 
                    if search_lower in item.get('name', '').lower() or
                       search_lower in item.get('system_prompt', '').lower()
                ]
            
            # Sort by updated_at descending
            items.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
            
            # Pagination
            total = len(items)
            start_idx = offset
            end_idx = offset + limit
            page_items = items[start_idx:end_idx]
            
            prompts = [self._item_to_prompt(item) for item in page_items]
            
            return PromptListResponse(
                prompts=prompts,
                total=total,
                has_more=end_idx < total
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
                FilterExpression=Attr('section').eq(section.value) & Attr('status').eq('published')
            )
            
            if not response['Items']:
                return None
            
            # Get the latest by updated_at
            items = sorted(response['Items'], key=lambda x: x.get('updated_at', ''), reverse=True)
            return self._item_to_prompt(items[0])
            
        except Exception as e:
            logger.error(f"Error getting prompt by section {section}: {e}")
            raise
