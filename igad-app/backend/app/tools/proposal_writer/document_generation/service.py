"""
Document Generation Service

Generates comprehensive concept documents based on:
- RFP analysis and requirements
- User concept evaluation and selections
- Proposal outline structure and guidance

The service enriches selected sections with proposal outline data
and uses Claude to generate detailed, donor-aligned documentation.
"""

import json
import logging
import re
import traceback
from typing import Any, Dict, Optional
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Attr

from app.shared.ai.bedrock_service import BedrockService
from app.tools.proposal_writer.document_generation.config import (
    DOCUMENT_GENERATION_SETTINGS,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class ConceptDocumentGenerator:
    """
    Generates concept documents using AI.

    Workflow:
    1. Load prompt template from DynamoDB
    2. Retrieve proposal outline (if not provided)
    3. Prepare context with RFP analysis and concept evaluation
    4. Inject context into prompt
    5. Call Claude via Bedrock
    6. Parse and structure the generated document
    """

    def __init__(self):
        """Initialize Bedrock and DynamoDB clients."""
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = DOCUMENT_GENERATION_SETTINGS.get(
            "table_name", "igad-testing-main-table"
        )

    def generate_document(
        self,
        proposal_code: str,
        rfp_analysis: Dict[str, Any],
        concept_evaluation: Dict[str, Any],
        proposal_outline: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate concept document using AI.

        Args:
            proposal_code: Proposal identifier for logging
            rfp_analysis: RFP analysis from step 1
            concept_evaluation: User selections from step 2
            proposal_outline: Optional proposal outline (loads from DB if not provided)

        Returns:
            Dict with 'generated_concept_document' and 'sections'

        Raises:
            ValueError: If prompt template not found
            Exception: If document generation fails
        """
        try:
            logger.info(f"📋 Generating document for proposal: {proposal_code}")

            # Step 1: Load prompt template
            logger.info("📝 Loading prompt template...")
            prompt_parts = self._get_prompt_template()

            if not prompt_parts:
                raise ValueError("Prompt template not found in DynamoDB")

            # Step 2: Load proposal outline if needed
            if not proposal_outline:
                logger.info("📥 Loading proposal outline...")
                proposal_outline = self._load_proposal_outline(proposal_code)
                if proposal_outline:
                    outline_count = len(
                        proposal_outline.get("proposal_outline", [])
                    )
                    logger.info(f"✅ Loaded {outline_count} outline sections")

            # Step 3: Prepare context
            logger.info("🔄 Preparing context...")
            context = self._prepare_context(
                rfp_analysis, concept_evaluation, proposal_outline
            )

            # Step 4: Build final prompt
            user_prompt = self._inject_context(
                prompt_parts["user_prompt"], context
            )
            final_prompt = f"{user_prompt}\n\n{prompt_parts['output_format']}".strip()

            # Step 5: Call Bedrock
            logger.info(
                "📡 Calling Bedrock (this may take 3-5 minutes)..."
            )
            start_time = datetime.utcnow()

            ai_response = self.bedrock.invoke_claude(
                system_prompt=prompt_parts["system_prompt"],
                user_prompt=final_prompt,
                max_tokens=DOCUMENT_GENERATION_SETTINGS.get(
                    "max_tokens", 12000
                ),
                temperature=DOCUMENT_GENERATION_SETTINGS.get(
                    "temperature", 0.2
                ),
                model_id=DOCUMENT_GENERATION_SETTINGS["model"],
            )

            elapsed = (datetime.utcnow() - start_time).total_seconds()
            logger.info(f"✅ Response received in {elapsed:.1f} seconds")

            # Step 6: Parse response
            logger.info("📊 Parsing response...")
            document = self._parse_response(ai_response)

            logger.info(f"✅ Document generated successfully")
            return document

        except Exception as e:
            logger.error(f"❌ Document generation failed: {str(e)}")
            traceback.print_exc()
            raise

    # ==================== PRIVATE HELPER METHODS ====================

    def _get_prompt_template(self) -> Optional[Dict[str, str]]:
        """
        Load document generation prompt from DynamoDB.

        Filters for:
        - is_active: true
        - section: "proposal_writer"
        - sub_section: "step-2"
        - categories: contains "Concept Review"

        Returns:
            Dict with 'system_prompt', 'user_prompt', 'output_format', or None
        """
        try:
            table = self.dynamodb.Table(self.table_name)
            response = table.scan(
                FilterExpression=(
                    Attr("is_active").eq(True)
                    & Attr("section").eq("proposal_writer")
                    & Attr("sub_section").eq("step-2")
                    & Attr("categories").contains("Concept Review")
                )
            )

            items = response.get("Items", [])
            if not items:
                logger.warning("⚠️  No prompts found in DynamoDB")
                return None

            prompt_item = items[0]
            logger.info(f"✅ Loaded prompt: {prompt_item.get('name', 'Unnamed')}")

            return {
                "system_prompt": prompt_item.get("system_prompt", ""),
                "user_prompt": prompt_item.get("user_prompt_template", ""),
                "output_format": prompt_item.get("output_format", ""),
            }

        except Exception as e:
            logger.error(f"❌ Error loading prompt: {str(e)}")
            return None

    def _load_proposal_outline(
        self, proposal_code: str
    ) -> Optional[Dict[str, Any]]:
        """
        Load proposal outline from DynamoDB.

        Args:
            proposal_code: Proposal code to search for

        Returns:
            Proposal outline dict or None
        """
        try:
            table = self.dynamodb.Table(self.table_name)
            response = table.scan(
                FilterExpression=Attr("proposalCode").eq(proposal_code)
            )

            items = response.get("Items", [])
            if not items:
                logger.warning(f"⚠️  No proposal found: {proposal_code}")
                return None

            proposal_outline = items[0].get("proposal_outline")
            if not proposal_outline:
                logger.warning(f"⚠️  No outline found in proposal")
                return None

            logger.info(f"✅ Loaded outline for {proposal_code}")
            return proposal_outline

        except Exception as e:
            logger.error(f"❌ Error loading outline: {str(e)}")
            return None

    def _prepare_context(
        self,
        rfp_analysis: Dict[str, Any],
        concept_evaluation: Dict[str, Any],
        proposal_outline: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Prepare context for prompt injection.

        Process:
        1. Filter to selected sections
        2. Enrich with outline data
        3. Return as JSON strings for prompt

        Args:
            rfp_analysis: RFP analysis data
            concept_evaluation: Concept evaluation with selections
            proposal_outline: Optional proposal outline for enrichment

        Returns:
            Dict with 'rfp_analysis' and 'concept_evaluation' as JSON strings
        """
        # Filter to selected sections
        filtered_evaluation = self._filter_selected_sections(
            concept_evaluation
        )

        # Enrich with outline data if available
        if proposal_outline:
            logger.info("🔄 Enriching sections with outline data...")
            enriched_evaluation = self._enrich_with_outline(
                filtered_evaluation, proposal_outline
            )
        else:
            logger.info("ℹ️  Proceeding without outline enrichment")
            enriched_evaluation = filtered_evaluation

        return {
            "rfp_analysis": json.dumps(rfp_analysis, indent=2),
            "concept_evaluation": json.dumps(enriched_evaluation, indent=2),
        }

    def _filter_selected_sections(
        self, concept_evaluation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Filter concept evaluation to only selected sections.

        Args:
            concept_evaluation: Full evaluation data

        Returns:
            Filtered evaluation with only selected sections

        Raises:
            Returns original data if filtering fails
        """
        try:
            # Handle nested structure
            concept_analysis = concept_evaluation.get("concept_analysis", {})
            if "concept_analysis" in concept_analysis:
                concept_analysis = concept_analysis["concept_analysis"]

            sections = concept_analysis.get("sections_needing_elaboration", [])
            logger.info(f"📊 Total sections: {len(sections)}")

            # Filter to selected
            selected = [s for s in sections if s.get("selected", False)]
            logger.info(f"✅ Selected: {len(selected)} sections")

            # Log selected titles
            for section in selected:
                title = section.get("section", section.get("title", "Unknown"))
                logger.info(f"   ✓ {title}")

            return {
                "concept_analysis": {
                    **concept_analysis,
                    "sections_needing_elaboration": selected,
                },
                "status": concept_evaluation.get("status", "completed"),
            }

        except Exception as e:
            logger.error(f"❌ Error filtering sections: {str(e)}")
            return concept_evaluation

    def _enrich_with_outline(
        self,
        filtered_evaluation: Dict[str, Any],
        proposal_outline: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Enrich selected sections with proposal outline data.

        Adds to each section:
        - recommended_word_count
        - purpose
        - content_guidance
        - guiding_questions

        Args:
            filtered_evaluation: Filtered concept evaluation
            proposal_outline: Proposal outline structure

        Returns:
            Enriched evaluation

        Raises:
            Returns original if enrichment fails
        """
        try:
            outline_sections = proposal_outline.get("proposal_outline", [])
            if not outline_sections:
                logger.warning("⚠️  No sections in proposal_outline")
                return filtered_evaluation

            concept_analysis = filtered_evaluation.get("concept_analysis", {})
            selected_sections = concept_analysis.get(
                "sections_needing_elaboration", []
            )

            if not selected_sections:
                logger.warning("⚠️  No sections to enrich")
                return filtered_evaluation

            # Create lookup for selected sections only
            selected_titles = [
                s.get("section", s.get("title", "")) for s in selected_sections
            ]
            outline_lookup = {
                os.get("section_title"): os
                for os in outline_sections
                if os.get("section_title") in selected_titles
            }

            logger.info(
                f"📊 Enriching {len(outline_lookup)} sections "
                f"(from {len(outline_sections)} total)"
            )

            # Enrich each section
            enriched_sections = []
            for section in selected_sections:
                section_title = section.get("section", section.get("title", ""))
                outline_data = outline_lookup.get(section_title)

                if outline_data:
                    logger.info(f"   ✓ Enriching {section_title}")
                    content_guidance = outline_data.get("content_guidance", "")

                    # Summarize long guidance
                    if len(content_guidance) > 1000:
                        content_guidance = self._summarize_guidance(
                            content_guidance
                        )

                    enriched_section = {
                        **section,
                        "recommended_word_count": outline_data.get(
                            "recommended_word_count", ""
                        ),
                        "purpose": outline_data.get("purpose", ""),
                        "content_guidance": content_guidance,
                        "guiding_questions": outline_data.get(
                            "guiding_questions", []
                        ),
                    }
                    enriched_sections.append(enriched_section)
                else:
                    logger.info(f"   ⚠️  No outline for {section_title}")
                    enriched_sections.append(section)

            logger.info(f"✅ Enriched {len(enriched_sections)} sections")

            return {
                "concept_analysis": {
                    **concept_analysis,
                    "sections_needing_elaboration": enriched_sections,
                },
                "status": filtered_evaluation.get("status", "completed"),
            }

        except Exception as e:
            logger.error(f"❌ Error enriching sections: {str(e)}")
            return filtered_evaluation

    def _summarize_guidance(self, guidance: str) -> str:
        """
        Summarize long content guidance.

        Extracts bullet points or truncates to 500 chars.

        Args:
            guidance: Full content guidance text

        Returns:
            Summarized guidance
        """
        try:
            # Extract bullet points if available
            if any(marker in guidance for marker in ["•", "-", "*"]):
                lines = guidance.split("\n")
                bullets = [
                    line.strip()
                    for line in lines
                    if line.strip()
                    and line.strip()[0] in ("•", "-", "*")
                ]
                if bullets:
                    return "\n".join(bullets[:8])

            # Truncate to 500 chars
            return (
                guidance[:500] + "..."
                if len(guidance) > 500
                else guidance
            )

        except Exception as e:
            logger.error(f"❌ Error summarizing: {str(e)}")
            return guidance[:300]

    def _inject_context(self, template: str, context: Dict[str, Any]) -> str:
        """
        Inject context variables into prompt template.

        Replaces {{key}} with context values.

        Args:
            template: Prompt template with {{placeholders}}
            context: Dict of context values

        Returns:
            Prompt with injected context
        """
        prompt = template
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            prompt = prompt.replace(placeholder, str(value))
        return prompt

    # ==================== RESPONSE PARSING ====================

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse AI response into structured document.

        Supports multiple formats:
        1. JSON with ```json``` wrapper
        2. Raw JSON object
        3. Plain text with markdown sections

        Args:
            response: Raw response from Claude

        Returns:
            Dict with 'generated_concept_document' and 'sections'
        """
        try:
            # Try JSON parsing first
            json_match = re.search(
                r"```json\s*(\{.*?\})\s*```", response, re.DOTALL
            )
            if json_match:
                parsed = json.loads(json_match.group(1))
                logger.info("📦 Parsed JSON from code block")
            else:
                # Try direct JSON
                json_match = re.search(r"\{.*?\}", response, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    logger.info("📦 Parsed JSON directly")
                else:
                    parsed = None

            if parsed:
                # Handle wrapped format
                if "concept_document" in parsed:
                    return {
                        "generated_concept_document": parsed[
                            "concept_document"
                        ].get("generated_concept_document", ""),
                        "sections": parsed["concept_document"].get(
                            "sections", {}
                        ),
                    }

                # Handle flat format
                if "generated_concept_document" in parsed:
                    return {
                        "generated_concept_document": parsed.get(
                            "generated_concept_document", ""
                        ),
                        "sections": parsed.get("sections", {}),
                    }

        except json.JSONDecodeError:
            logger.info("ℹ️  JSON parsing failed, using fallback")

        # Fallback to text extraction
        logger.info("📝 Extracting sections from text")
        return {
            "generated_concept_document": response,
            "sections": self._extract_sections_from_text(response),
        }

    def _extract_sections_from_text(
        self, text: str
    ) -> Dict[str, str]:
        """
        Extract sections from markdown text.

        Looks for ## Section Title markers.

        Args:
            text: Markdown or plain text

        Returns:
            Dict of section_title: content
        """
        sections = {}
        current_section = None
        current_content = []

        for line in text.split("\n"):
            if line.startswith("## "):
                if current_section:
                    sections[current_section] = (
                        "\n".join(current_content).strip()
                    )
                current_section = line[3:].strip()
                current_content = []
            elif current_section:
                current_content.append(line)

        if current_section:
            sections[current_section] = "\n".join(current_content).strip()

        return sections
