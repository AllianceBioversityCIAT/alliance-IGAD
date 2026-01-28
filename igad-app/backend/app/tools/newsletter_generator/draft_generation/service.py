"""
Draft Generation Service

Generates full newsletter drafts using AI based on:
- Step 3 outline (sections and items)
- Step 2 retrieved content from Knowledge Base
- Step 1 configuration (tone, audience, length)

Features:
- Generates complete markdown content for each section
- Maintains consistent tone and style
- Supports section-by-section regeneration
- Tracks user edits and modifications
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
from app.tools.newsletter_generator.draft_generation.config import (
    AI_COMPLETE_SETTINGS,
    DRAFT_GENERATION_SETTINGS,
    LENGTH_WORD_TARGETS,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class DraftGenerationService:
    """
    Service for generating newsletter drafts using AI.

    Transforms outline items into full newsletter content,
    maintaining tone, style, and formatting consistency.
    """

    def __init__(self) -> None:
        """Initialize service with Bedrock client and DynamoDB."""
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")
        self.table = self.dynamodb.Table(self.table_name)

    def generate_draft(
        self,
        newsletter_code: str,
    ) -> Dict[str, Any]:
        """
        Generate full newsletter draft from outline.

        Args:
            newsletter_code: Newsletter identifier (NL-YYYYMMDD-XXXX)

        Returns:
            Dict with draft sections and status

        Raises:
            Exception: If newsletter not found or Step 3 incomplete
        """
        try:
            pk = f"NEWSLETTER#{newsletter_code}"

            # Step 1: Load newsletter metadata
            logger.info(f"📋 Loading newsletter: {newsletter_code}")
            metadata = db_client.get_item_sync(pk=pk, sk="METADATA")

            if not metadata:
                raise Exception(f"Newsletter {newsletter_code} not found")

            # Step 2: Load outline data (Step 3)
            outline_data = db_client.get_item_sync(pk=pk, sk="OUTLINE")

            if not outline_data:
                raise Exception("Step 3 outline not found")

            outline_status = outline_data.get("outline_status", "pending")
            if outline_status != "completed":
                raise Exception(
                    f"Step 3 outline not completed. Status: {outline_status}"
                )

            outline_sections = outline_data.get("sections", [])
            if not outline_sections:
                raise Exception("No outline sections found in Step 3")

            # Verify all sections have items
            sections_with_items = [s for s in outline_sections if s.get("items")]
            if not sections_with_items:
                raise Exception("No outline items found. Please add items in Step 3.")

            logger.info(f"✅ Found {len(sections_with_items)} sections with items")

            # Step 3: Load topics/content data (Step 2)
            topics_data = db_client.get_item_sync(pk=pk, sk="TOPICS")
            retrieved_content = []
            if topics_data:
                retrieved_content = topics_data.get("retrieved_content", [])
            logger.info(f"✅ Found {len(retrieved_content)} content chunks")

            # Step 4: Get prompt from DynamoDB
            prompt_data = self._load_prompt()

            # Step 5: Build context
            context = {
                "tone_preset": metadata.get("tone_preset", "industry_insight"),
                "length_preference": metadata.get("length_preference", "standard"),
                "target_audience": metadata.get("target_audience", []),
                "geographic_focus": metadata.get("geographic_focus", "IGAD region"),
                "title": metadata.get("title", "Newsletter"),
            }

            # Step 6: Generate draft using AI
            logger.info("🤖 Generating draft with AI...")
            start_time = time.time()

            draft_sections = self._generate_draft_with_ai(
                prompt_data=prompt_data,
                context=context,
                outline_sections=outline_sections,
                retrieved_content=retrieved_content,
            )

            elapsed_time = time.time() - start_time
            logger.info(f"✅ AI generation completed in {elapsed_time:.2f}s")

            # Step 7: Calculate metadata
            total_words = sum(len(s.get("content", "").split()) for s in draft_sections)
            reading_time = self._calculate_reading_time(total_words)

            # Step 8: Save draft to DynamoDB
            now = datetime.now(timezone.utc).isoformat()

            draft_item = {
                "PK": pk,
                "SK": "DRAFT",
                "title": context["title"],
                "subtitle": f"Newsletter for {context['geographic_focus']}",
                "sections": draft_sections,
                "draft_status": "completed",
                "draft_error": None,
                "generated_at": now,
                "generation_config": {
                    "tone_preset": context["tone_preset"],
                    "length_preference": context["length_preference"],
                    "target_audience": context["target_audience"],
                },
                "metadata": {
                    "wordCount": total_words,
                    "readingTime": reading_time,
                },
                "user_edits": {
                    "sectionsEdited": 0,
                    "lastEditedAt": None,
                },
                "updated_at": now,
            }

            self.table.put_item(Item=draft_item)
            logger.info("✅ Draft saved to DynamoDB")

            return {
                "success": True,
                "draft_status": "completed",
                "title": draft_item["title"],
                "subtitle": draft_item["subtitle"],
                "sections": draft_sections,
                "generated_at": now,
                "metadata": draft_item["metadata"],
            }

        except Exception as e:
            logger.error(f"❌ Draft generation failed: {e}")

            # Save error status
            now = datetime.now(timezone.utc).isoformat()

            error_item = {
                "PK": f"NEWSLETTER#{newsletter_code}",
                "SK": "DRAFT",
                "title": "",
                "sections": [],
                "draft_status": "failed",
                "draft_error": str(e),
                "updated_at": now,
            }

            try:
                self.table.put_item(Item=error_item)
            except Exception as db_err:
                logger.error(f"Failed to save error status: {db_err}")

            return {
                "success": False,
                "draft_status": "failed",
                "draft_error": str(e),
            }

    def _load_prompt(self) -> Dict[str, str]:
        """Load draft generation prompt from DynamoDB."""
        table = self.dynamodb.Table(self.table_name)

        filter_expr = (
            Attr("is_active").eq(True)
            & Attr("section").eq(DRAFT_GENERATION_SETTINGS["section"])
            & Attr("sub_section").eq(DRAFT_GENERATION_SETTINGS["sub_section"])
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
            "system_prompt": """You are an expert newsletter writer specializing in
agricultural development and food security content for the IGAD region. Your task
is to transform a newsletter outline into complete, publication-ready content.

Write engaging, informative content that:
- Maintains a consistent tone throughout
- Uses clear, accessible language
- Includes relevant details from source materials
- Follows professional newsletter formatting
- Engages readers with compelling narratives""",
            "user_prompt_template": """Transform this newsletter outline into full content.

CONFIGURATION:
- Title: {{title}}
- Tone: {{tone_preset}}
- Length: {{length_preference}}
- Target Audience: {{target_audience}}
- Geographic Focus: {{geographic_focus}}

OUTLINE SECTIONS:
{{outline_sections}}

SOURCE CONTENT:
{{retrieved_content}}

Generate complete markdown content for each section. Each section should flow
naturally and maintain the specified tone. Include appropriate headings,
formatting, and transitions.

{{output_format}}""",
            "output_format": """Return JSON in this exact format:
{
  "sections": [
    {
      "id": "draft-section-001",
      "sectionId": "section-intro",
      "title": "Section Title",
      "content": "## Section Title\\n\\nFull markdown content here...",
      "items": [{"id": "item-001", "title": "Item title"}],
      "order": 1,
      "isEdited": false
    }
  ]
}""",
        }

    def _generate_draft_with_ai(
        self,
        prompt_data: Dict[str, str],
        context: Dict[str, Any],
        outline_sections: List[Dict[str, Any]],
        retrieved_content: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Generate draft sections using Bedrock Claude.

        Args:
            prompt_data: System and user prompts
            context: Newsletter configuration
            outline_sections: Sections from Step 3
            retrieved_content: Chunks from Step 2

        Returns:
            List of draft section dicts with content
        """
        # Build user prompt
        user_prompt = prompt_data["user_prompt_template"]
        output_format = prompt_data.get("output_format", "")

        if output_format:
            user_prompt = f"{user_prompt}\n\n{output_format}"

        # Format outline sections
        outline_text = self._format_outline_sections(outline_sections)

        # Summarize content
        content_summary = self._summarize_content(retrieved_content)

        # Get word targets
        length_pref = context.get("length_preference", "standard")
        word_targets = LENGTH_WORD_TARGETS.get(
            length_pref, LENGTH_WORD_TARGETS["standard"]
        )

        # Substitute variables - handle both formats
        replacements = {
            "title": context.get("title", "Newsletter"),
            "tone_preset": context["tone_preset"],
            "length_preference": context["length_preference"],
            "target_audience": ", ".join(context["target_audience"]) or "general",
            "geographic_focus": context["geographic_focus"],
            "outline_sections": outline_text,
            "retrieved_content": content_summary,
            "word_targets": json.dumps(word_targets),
        }

        for key, value in replacements.items():
            # Format 1: {{KEY}}
            user_prompt = user_prompt.replace("{{" + key + "}}", str(value))
            # Format 2: {[KEY]}
            user_prompt = user_prompt.replace("{[" + key + "]}", str(value))

        logger.info(f"📝 Built user prompt: {len(user_prompt)} characters")

        # Call Bedrock
        response_text = self.bedrock.invoke_claude(
            system_prompt=prompt_data["system_prompt"],
            user_prompt=user_prompt,
            model_id=DRAFT_GENERATION_SETTINGS["model"],
            max_tokens=DRAFT_GENERATION_SETTINGS["max_tokens"],
            temperature=DRAFT_GENERATION_SETTINGS["temperature"],
        )

        # Parse JSON from response
        sections = self._parse_ai_response(response_text, outline_sections)

        return sections

    def _format_outline_sections(self, outline_sections: List[Dict[str, Any]]) -> str:
        """Format outline sections for prompt injection."""
        formatted = []
        for section in outline_sections:
            section_text = f"### {section.get('name', 'Untitled')}\n"
            items = section.get("items", [])
            for item in items:
                title = item.get("title", "")
                description = item.get("description", "")
                section_text += f"- **{title}**: {description}\n"
            formatted.append(section_text)
        return "\n".join(formatted)

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
        outline_sections: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Parse AI response and build draft sections structure."""
        try:
            # Extract JSON from response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1

            if json_start == -1 or json_end == 0:
                logger.warning("⚠️ No JSON found in AI response, using fallback")
                return self._build_fallback_sections(outline_sections)

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
                return self._build_fallback_sections(outline_sections)

            return normalized_sections

        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse AI response JSON: {e}")
            return self._build_fallback_sections(outline_sections)

    def _normalize_section(self, section: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Normalize draft section structure with required fields."""
        if not isinstance(section, dict):
            return None

        section_id = section.get("id") or f"draft-section-{uuid.uuid4().hex[:8]}"
        outline_section_id = section.get("sectionId") or section.get("section_id", "")
        title = section.get("title") or "Untitled Section"
        content = section.get("content") or ""
        order = section.get("order", 0)

        # Normalize items
        items = []
        for item in section.get("items", []):
            if isinstance(item, dict):
                items.append(
                    {
                        "id": item.get("id", f"item-{uuid.uuid4().hex[:8]}"),
                        "title": item.get("title", ""),
                    }
                )

        return {
            "id": section_id,
            "sectionId": outline_section_id,
            "title": title,
            "content": content,
            "items": items,
            "order": order,
            "isEdited": False,
        }

    def _build_fallback_sections(
        self,
        outline_sections: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Build basic draft sections from outline without AI."""
        logger.info("📋 Building fallback sections from outline")

        draft_sections = []
        for i, section in enumerate(outline_sections):
            section_name = section.get("name", "Section")
            items = section.get("items", [])

            # Build content from items
            content_parts = [f"## {section_name}\n"]
            for item in items:
                title = item.get("title", "")
                description = item.get("description", "")
                content_parts.append(f"### {title}\n\n{description}\n")

            draft_sections.append(
                {
                    "id": f"draft-section-{uuid.uuid4().hex[:8]}",
                    "sectionId": section.get("id", ""),
                    "title": section_name,
                    "content": "\n".join(content_parts),
                    "items": [
                        {"id": item.get("id", ""), "title": item.get("title", "")}
                        for item in items
                    ],
                    "order": i + 1,
                    "isEdited": False,
                }
            )

        return draft_sections

    def _calculate_reading_time(self, word_count: int) -> str:
        """Calculate estimated reading time."""
        # Average reading speed: 200-250 words per minute
        minutes = word_count / 225
        if minutes < 1:
            return "< 1 min"
        elif minutes < 2:
            return "1-2 min"
        elif minutes < 5:
            return f"{int(minutes)}-{int(minutes)+1} min"
        else:
            return f"{int(minutes)}-{int(minutes)+2} min"

    def ai_complete(
        self,
        prompt: str,
        context: Optional[str] = None,
    ) -> str:
        """
        Generate AI autocomplete suggestion for inline editing.

        Args:
            prompt: The user's prompt/partial text
            context: Optional surrounding context

        Returns:
            AI-generated completion text
        """
        system_prompt = """You are a helpful newsletter writing assistant.
Complete the user's text naturally and professionally. Keep completions
concise and relevant to agricultural development and food security topics.
Only return the completion text, no explanations or formatting."""

        user_prompt = prompt
        if context:
            user_prompt = f"Context:\n{context}\n\nComplete this:\n{prompt}"

        response = self.bedrock.invoke_claude(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            model_id=AI_COMPLETE_SETTINGS["model"],
            max_tokens=AI_COMPLETE_SETTINGS["max_tokens"],
            temperature=AI_COMPLETE_SETTINGS["temperature"],
        )

        return response.strip()
