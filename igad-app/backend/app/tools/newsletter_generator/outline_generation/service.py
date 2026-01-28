"""
Outline Generation Service

Generates newsletter outlines using AI based on:
- Step 1 configuration (tone, audience, length)
- Step 2 retrieved content from Knowledge Base

Features:
- Maps retrieved content to newsletter sections
- Generates item titles and descriptions using AI
- Supports configurable length preferences
- Preserves custom user items during regeneration
"""

import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import boto3
from boto3.dynamodb.conditions import Attr

from app.database.client import db_client
from app.shared.ai.bedrock_service import BedrockService
from app.tools.newsletter_generator.outline_generation.config import (
    LENGTH_ITEM_COUNTS,
    NEWSLETTER_SECTIONS,
    OUTLINE_GENERATION_SETTINGS,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class OutlineGenerationService:
    """
    Service for generating newsletter outlines using AI.

    Uses retrieved content from Knowledge Base (Step 2) and newsletter
    configuration (Step 1) to generate a structured outline with
    AI-generated titles and descriptions.
    """

    def __init__(self) -> None:
        """Initialize service with Bedrock client and DynamoDB."""
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")
        self.table = self.dynamodb.Table(self.table_name)

    def generate_outline(
        self,
        newsletter_code: str,
        preserve_custom_items: bool = True,
    ) -> Dict[str, Any]:
        """
        Generate newsletter outline from Step 2 content.

        Args:
            newsletter_code: Newsletter identifier (NL-YYYYMMDD-XXXX)
            preserve_custom_items: Keep user-added items during regeneration

        Returns:
            Dict with outline sections and status

        Raises:
            Exception: If newsletter not found or Step 2 incomplete
        """
        try:
            pk = f"NEWSLETTER#{newsletter_code}"

            # Step 1: Load newsletter metadata
            logger.info(f"📋 Loading newsletter: {newsletter_code}")
            metadata = db_client.get_item_sync(pk=pk, sk="METADATA")

            if not metadata:
                raise Exception(f"Newsletter {newsletter_code} not found")

            # Step 2: Load topics data (Step 2 content)
            topics_data = db_client.get_item_sync(pk=pk, sk="TOPICS")

            if not topics_data:
                raise Exception("Step 2 topics data not found")

            retrieval_status = topics_data.get("retrieval_status", "pending")
            if retrieval_status != "completed":
                raise Exception(
                    f"Step 2 content retrieval not completed. "
                    f"Status: {retrieval_status}"
                )

            retrieved_content = topics_data.get("retrieved_content", [])
            if not retrieved_content:
                raise Exception("No content retrieved in Step 2")

            logger.info(f"✅ Found {len(retrieved_content)} content chunks")

            # Step 3: Get existing custom items if preserving
            custom_items = []
            if preserve_custom_items:
                existing_outline = db_client.get_item_sync(pk=pk, sk="OUTLINE")
                if existing_outline:
                    custom_items = self._extract_custom_items(existing_outline)
                    logger.info(f"✅ Preserving {len(custom_items)} custom items")

            # Step 4: Get prompt from DynamoDB
            prompt_data = self._load_prompt()

            # Step 5: Build context from metadata and content
            context = {
                "tone_preset": metadata.get("tone_preset", "industry_insight"),
                "length_preference": metadata.get("length_preference", "standard"),
                "target_audience": metadata.get("target_audience", []),
                "geographic_focus": metadata.get("geographic_focus", "IGAD region"),
                "selected_topics": topics_data.get("selected_types", []),
            }

            # Step 6: Generate outline using AI
            logger.info("🤖 Generating outline with AI...")
            start_time = time.time()

            sections = self._generate_outline_with_ai(
                prompt_data=prompt_data,
                context=context,
                retrieved_content=retrieved_content,
            )

            elapsed_time = time.time() - start_time
            logger.info(f"✅ AI generation completed in {elapsed_time:.2f}s")

            # Step 7: Merge custom items back
            if custom_items:
                sections = self._merge_custom_items(sections, custom_items)

            # Step 8: Save outline to DynamoDB
            now = datetime.now(timezone.utc).isoformat()

            outline_item = {
                "PK": pk,
                "SK": "OUTLINE",
                "sections": sections,
                "outline_status": "completed",
                "outline_error": None,
                "generated_at": now,
                "generation_config": {
                    "tone_preset": context["tone_preset"],
                    "length_preference": context["length_preference"],
                    "target_audience": context["target_audience"],
                },
                "user_modifications": {
                    "items_added": len(custom_items),
                    "items_removed": 0,
                    "items_edited": 0,
                },
                "updated_at": now,
            }

            self.table.put_item(Item=outline_item)
            logger.info("✅ Outline saved to DynamoDB")

            return {
                "success": True,
                "outline_status": "completed",
                "sections": sections,
                "generated_at": now,
            }

        except Exception as e:
            logger.error(f"❌ Outline generation failed: {e}")

            # Save error status
            now = datetime.now(timezone.utc).isoformat()

            error_item = {
                "PK": f"NEWSLETTER#{newsletter_code}",
                "SK": "OUTLINE",
                "sections": [],
                "outline_status": "failed",
                "outline_error": str(e),
                "updated_at": now,
            }

            try:
                self.table.put_item(Item=error_item)
            except Exception as db_err:
                logger.error(f"Failed to save error status: {db_err}")

            return {
                "success": False,
                "outline_status": "failed",
                "outline_error": str(e),
            }

    def _load_prompt(self) -> Dict[str, str]:
        """Load outline generation prompt from DynamoDB."""
        table = self.dynamodb.Table(self.table_name)

        filter_expr = (
            Attr("is_active").eq(True)
            & Attr("section").eq(OUTLINE_GENERATION_SETTINGS["section"])
            & Attr("sub_section").eq(OUTLINE_GENERATION_SETTINGS["sub_section"])
        )

        items = []
        response = table.scan(FilterExpression=filter_expr)
        items.extend(response.get("Items", []))

        while "LastEvaluatedKey" in response:
            response = table.scan(
                FilterExpression=filter_expr,
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            items.extend(response.get("Items", []))

        if not items:
            logger.warning("⚠️ No prompt found in DynamoDB, using fallback")
            return self._get_fallback_prompt()

        prompt_item = items[0]
        logger.info(f"✅ Loaded prompt: {prompt_item.get('name', 'Unnamed')}")

        return {
            "system_prompt": prompt_item.get("system_prompt", ""),
            "user_prompt_template": prompt_item.get("user_prompt_template", ""),
            "output_format": prompt_item.get("output_format", ""),
        }

    def _get_fallback_prompt(self) -> Dict[str, str]:
        """Return fallback prompt if DynamoDB prompt not found."""
        return {
            "system_prompt": """You are an expert newsletter editor specializing in
agricultural development and food security content for the IGAD region. Your task
is to create a structured outline for a newsletter based on retrieved content.""",
            "user_prompt_template": """Create a newsletter outline based on the
following configuration and content:

CONFIGURATION:
- Tone: {{tone_preset}}
- Length: {{length_preference}}
- Target Audience: {{target_audience}}
- Geographic Focus: {{geographic_focus}}
- Selected Topics: {{selected_topics}}

RETRIEVED CONTENT:
{{retrieved_content}}

Generate a structured outline with sections and items. Each item should have:
- A compelling title (max 80 characters)
- A brief description (max 200 characters)
- Reference to source content

{{output_format}}""",
            "output_format": """Return JSON in this exact format:
{
  "sections": [
    {
      "id": "section-id",
      "name": "Section Name",
      "order": 1,
      "items": [
        {
          "id": "item-001",
          "title": "Item Title",
          "description": "Brief description of the content",
          "content_sources": ["chunk-001"],
          "order": 1
        }
      ]
    }
  ]
}""",
        }

    def _generate_outline_with_ai(
        self,
        prompt_data: Dict[str, str],
        context: Dict[str, Any],
        retrieved_content: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Generate outline sections using Bedrock Claude.

        Args:
            prompt_data: System and user prompts
            context: Newsletter configuration
            retrieved_content: Chunks from Step 2

        Returns:
            List of section dicts with items
        """
        # Build user prompt
        user_prompt = prompt_data["user_prompt_template"]
        output_format = prompt_data.get("output_format", "")

        if output_format:
            user_prompt = f"{user_prompt}\n\n{output_format}"

        # Substitute variables
        content_summary = self._summarize_content(retrieved_content)

        user_prompt = user_prompt.replace("{{tone_preset}}", context["tone_preset"])
        user_prompt = user_prompt.replace(
            "{{length_preference}}", context["length_preference"]
        )
        user_prompt = user_prompt.replace(
            "{{target_audience}}", ", ".join(context["target_audience"]) or "general"
        )
        user_prompt = user_prompt.replace(
            "{{geographic_focus}}", context["geographic_focus"]
        )
        user_prompt = user_prompt.replace(
            "{{selected_topics}}", ", ".join(context["selected_topics"])
        )
        user_prompt = user_prompt.replace("{{retrieved_content}}", content_summary)

        # Handle alternate placeholder format {[key]}
        user_prompt = user_prompt.replace("{[tone_preset]}", context["tone_preset"])
        user_prompt = user_prompt.replace(
            "{[length_preference]}", context["length_preference"]
        )
        user_prompt = user_prompt.replace(
            "{[target_audience]}", ", ".join(context["target_audience"]) or "general"
        )
        user_prompt = user_prompt.replace(
            "{[geographic_focus]}", context["geographic_focus"]
        )
        user_prompt = user_prompt.replace(
            "{[selected_topics]}", ", ".join(context["selected_topics"])
        )
        user_prompt = user_prompt.replace("{[retrieved_content]}", content_summary)

        logger.info(f"📝 Built user prompt: {len(user_prompt)} characters")

        # Call Bedrock
        response_text = self.bedrock.invoke_claude(
            system_prompt=prompt_data["system_prompt"],
            user_prompt=user_prompt,
            model_id=OUTLINE_GENERATION_SETTINGS["model"],
            max_tokens=OUTLINE_GENERATION_SETTINGS["max_tokens"],
            temperature=OUTLINE_GENERATION_SETTINGS["temperature"],
        )

        # Parse JSON from response
        sections = self._parse_ai_response(response_text, context, retrieved_content)

        return sections

    def _summarize_content(self, retrieved_content: List[Dict[str, Any]]) -> str:
        """Summarize retrieved content for prompt injection."""
        summaries = []
        for i, chunk in enumerate(retrieved_content[:30]):  # Limit to 30 chunks
            topic_id = chunk.get("topic_id", "general")
            content = chunk.get("content", "")[:500]  # Truncate long content
            source = chunk.get("source_url", "")

            summaries.append(
                f"[{i+1}] Topic: {topic_id}\n"
                f"Content: {content}\n"
                f"Source: {source}"
            )

        return "\n\n".join(summaries)

    def _parse_ai_response(
        self,
        response_text: str,
        context: Dict[str, Any],
        retrieved_content: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Parse AI response and build sections structure."""
        try:
            # Extract JSON from response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1

            if json_start == -1 or json_end == 0:
                logger.warning("⚠️ No JSON found in AI response, using fallback")
                return self._build_fallback_sections(context, retrieved_content)

            response_json = json.loads(response_text[json_start:json_end])

            # Handle both "sections" array and wrapped format
            sections = response_json.get("sections", [])
            if not sections and isinstance(response_json, list):
                sections = response_json

            # Validate and normalize sections
            normalized_sections = []
            for section in sections:
                normalized = self._normalize_section(section)
                if normalized:
                    normalized_sections.append(normalized)

            if not normalized_sections:
                logger.warning("⚠️ No valid sections parsed, using fallback")
                return self._build_fallback_sections(context, retrieved_content)

            return normalized_sections

        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse AI response JSON: {e}")
            return self._build_fallback_sections(context, retrieved_content)

    def _normalize_section(self, section: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize section structure with required fields."""
        if not isinstance(section, dict):
            return None

        section_id = section.get("id") or f"section-{uuid.uuid4().hex[:8]}"
        name = section.get("name") or "Untitled Section"
        order = section.get("order", 0)

        items = []
        for item in section.get("items", []):
            normalized_item = self._normalize_item(item, section_id)
            if normalized_item:
                items.append(normalized_item)

        return {
            "id": section_id,
            "name": name,
            "order": order,
            "items": items,
        }

    def _normalize_item(
        self, item: Dict[str, Any], section_id: str
    ) -> Optional[Dict[str, Any]]:
        """Normalize item structure with required fields."""
        if not isinstance(item, dict):
            return None

        item_id = item.get("id") or f"item-{uuid.uuid4().hex[:8]}"
        title = item.get("title") or "Untitled Item"
        description = item.get("description") or ""

        return {
            "id": item_id,
            "section_id": section_id,
            "title": title[:200],  # Limit title length
            "description": description[:500],  # Limit description length
            "content_sources": item.get("content_sources", []),
            "order": item.get("order", 0),
            "is_custom": False,
            "is_editable": True,
        }

    def _build_fallback_sections(
        self,
        context: Dict[str, Any],
        retrieved_content: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Build basic sections from retrieved content without AI."""
        logger.info("📋 Building fallback sections from content")

        length_pref = context.get("length_preference", "standard")
        item_counts = LENGTH_ITEM_COUNTS.get(
            length_pref, LENGTH_ITEM_COUNTS["standard"]
        )

        # Group content by topic
        content_by_topic: Dict[str, List[Dict[str, Any]]] = {}
        for chunk in retrieved_content:
            topic_id = chunk.get("topic_id", "general")
            if topic_id not in content_by_topic:
                content_by_topic[topic_id] = []
            content_by_topic[topic_id].append(chunk)

        sections = []
        for section_def in NEWSLETTER_SECTIONS:
            section_id = section_def["id"]
            max_items = item_counts.get(section_id, 2)

            # Get relevant content for this section
            relevant_content = []
            topic_categories = section_def.get("topic_categories", [])

            if topic_categories:
                for topic in topic_categories:
                    if topic in content_by_topic:
                        relevant_content.extend(content_by_topic[topic])
            else:
                # For intro/conclusion, use all content
                for chunks in content_by_topic.values():
                    relevant_content.extend(chunks)

            # Build items from content
            items = []
            for i, chunk in enumerate(relevant_content[:max_items]):
                content_text = chunk.get("content", "")
                # Create title from first line or truncate
                title = content_text.split("\n")[0][:80] or f"Item {i+1}"

                items.append(
                    {
                        "id": f"item-{uuid.uuid4().hex[:8]}",
                        "section_id": section_id,
                        "title": title,
                        "description": content_text[:200],
                        "content_sources": [chunk.get("chunk_id", "")],
                        "order": i + 1,
                        "is_custom": False,
                        "is_editable": True,
                    }
                )

            sections.append(
                {
                    "id": section_id,
                    "name": section_def["name"],
                    "order": section_def["order"],
                    "items": items,
                }
            )

        return sections

    def _extract_custom_items(
        self, existing_outline: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Extract custom (user-added) items from existing outline."""
        custom_items = []
        sections = existing_outline.get("sections", [])

        for section in sections:
            for item in section.get("items", []):
                if item.get("is_custom", False):
                    custom_items.append(
                        {
                            **item,
                            "original_section_id": section.get("id"),
                        }
                    )

        return custom_items

    def _merge_custom_items(
        self,
        sections: List[Dict[str, Any]],
        custom_items: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Merge preserved custom items back into sections."""
        # Create section lookup
        section_map = {s["id"]: s for s in sections}

        for custom_item in custom_items:
            section_id = custom_item.pop("original_section_id", None)
            if section_id and section_id in section_map:
                section_map[section_id]["items"].append(custom_item)

        return sections
