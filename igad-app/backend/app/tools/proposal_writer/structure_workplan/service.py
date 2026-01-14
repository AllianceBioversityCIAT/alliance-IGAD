"""Structure and Workplan Analysis Service

Generates proposal structure and workplan based on:
- RFP Analysis (from Step 1)
- Concept Document V2 (generated in Step 2)
- Reference Proposals Analysis (from Step 2)
- Existing Work Analysis (from Step 2)
"""

import json
import logging
import os
import time
from typing import Any, Dict, Optional

import boto3
from boto3.dynamodb.conditions import Attr

from app.database.client import db_client
from app.shared.ai.bedrock_service import BedrockService
from app.tools.proposal_writer.structure_workplan.config import (
    STRUCTURE_WORKPLAN_SETTINGS,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class StructureWorkplanService:
    def __init__(self):
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")

    def analyze_structure_workplan(self, proposal_id: str) -> Dict[str, Any]:
        """
        Generate proposal structure and workplan based on RFP and concept evaluation.

        Args:
            proposal_id: Proposal code (PROP-YYYYMMDD-XXXX) or UUID

        Returns:
            Dict with structure:
            {
                "structure_workplan_analysis": {
                    "narrative_overview": "...",
                    "proposal_mandatory": [...],
                    "proposal_outline": [...],
                    "hcd_notes": [...]
                },
                "status": "completed"
            }

        Raises:
            ValueError: If proposal_id is invalid
            Exception: If proposal not found, prerequisites missing, or analysis fails
        """
        try:
            # Validate input
            if not proposal_id or not isinstance(proposal_id, str):
                raise ValueError("proposal_id must be a non-empty string")

            if not proposal_id.strip():
                raise ValueError("proposal_id cannot be whitespace only")

            # Step 1: Load proposal - handle both UUID and proposal code
            logger.info(f"📋 Loading proposal: {proposal_id}")

            # Try as proposal code first
            if proposal_id.startswith("PROP-"):
                pk = f"PROPOSAL#{proposal_id}"
            else:
                # It's a UUID, need to find the proposal code
                pk = f"PROPOSAL#{proposal_id}"

            proposal = db_client.get_item_sync(pk=pk, sk="METADATA")

            if not proposal:
                raise Exception(f"Proposal {proposal_id} not found")

            # Get proposal code for consistent usage
            proposal_code = proposal.get("proposalCode", proposal_id)
            logger.info(f"📋 Using proposal_code: {proposal_code}")

            # Step 2: Get RFP analysis
            rfp_analysis = proposal.get("rfp_analysis", {})
            if not rfp_analysis:
                raise Exception("RFP analysis not found. Please complete Step 1 first.")

            # Step 3: Get concept document v2 (try both keys)
            concept_document_v2 = proposal.get("concept_document_v2")
            if not concept_document_v2:
                # Fallback to concept_analysis
                concept_document_v2 = proposal.get("concept_analysis")

            if not concept_document_v2:
                raise Exception(
                    "Concept document not found. Please complete Step 2 first."
                )

            # Step 4: Get reference proposals analysis (optional but recommended)
            reference_proposals_analysis = proposal.get(
                "reference_proposals_analysis", {}
            )
            if reference_proposals_analysis:
                logger.info("✅ Found reference proposals analysis")
            else:
                logger.warning("⚠️  No reference proposals analysis found (optional)")

            # Step 5: Get existing work analysis (optional but recommended)
            existing_work_analysis = proposal.get("existing_work_analysis", {})
            if existing_work_analysis:
                logger.info("✅ Found existing work analysis")
            else:
                logger.warning("⚠️  No existing work analysis found (optional)")

            logger.info("✅ Found RFP analysis and concept document")

            # Step 6: Get prompt from DynamoDB
            logger.info("📝 Loading prompt from DynamoDB...")

            table = self.dynamodb.Table(self.table_name)
            filter_expr = (
                Attr("is_active").eq(True)
                & Attr("section").eq(STRUCTURE_WORKPLAN_SETTINGS["section"])
                & Attr("sub_section").eq(STRUCTURE_WORKPLAN_SETTINGS["sub_section"])
                & Attr("categories").contains(STRUCTURE_WORKPLAN_SETTINGS["category"])
            )

            # Handle DynamoDB pagination
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
                raise Exception("Structure workplan prompt not found in DynamoDB")

            prompt_item = items[0]
            system_prompt = prompt_item.get("system_prompt", "")
            user_prompt_template = prompt_item.get("user_prompt_template", "")
            output_format = prompt_item.get("output_format", "")

            logger.info(f"✅ Loaded prompt: {prompt_item.get('name', 'Unnamed')}")

            # Step 7: Build complete user prompt with all analyses
            user_prompt = self._build_user_prompt(
                user_prompt_template=user_prompt_template,
                output_format=output_format,
                rfp_analysis=rfp_analysis,
                concept_document_v2=concept_document_v2,
                reference_proposals_analysis=reference_proposals_analysis,
                existing_work_analysis=existing_work_analysis,
            )

            logger.info("🤖 Sending to Bedrock...")
            logger.info(f"   Model: {STRUCTURE_WORKPLAN_SETTINGS['model']}")
            logger.info(f"   Max tokens: {STRUCTURE_WORKPLAN_SETTINGS['max_tokens']}")
            logger.info(f"   Temperature: {STRUCTURE_WORKPLAN_SETTINGS['temperature']}")

            # Step 8: Call Bedrock with metrics
            start_time = time.time()

            response_text = self.bedrock.invoke_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model_id=STRUCTURE_WORKPLAN_SETTINGS["model"],
                max_tokens=STRUCTURE_WORKPLAN_SETTINGS["max_tokens"],
                temperature=STRUCTURE_WORKPLAN_SETTINGS["temperature"],
            )

            elapsed_time = time.time() - start_time
            logger.info(f"✅ Bedrock response received in {elapsed_time:.2f}s")

            # Step 9: Parse response
            analysis_text = response_text

            # Log first 500 chars for debugging
            logger.info("📄 Bedrock response preview (first 500 chars):")
            logger.info(f"{analysis_text[:500]}")

            # Extract JSON from response
            json_start = analysis_text.find("{")
            json_end = analysis_text.rfind("}") + 1

            if json_start == -1 or json_end == 0:
                logger.error(
                    f"❌ No JSON found. Full response length: {len(analysis_text)}"
                )
                logger.error(
                    f"📄 Full response: {analysis_text[:1000]}"
                )  # First 1000 chars
                raise Exception("No JSON found in Bedrock response")

            analysis_json = json.loads(analysis_text[json_start:json_end])

            # Extract narrative (text before JSON)
            narrative_overview = analysis_text[:json_start].strip()

            result = {
                "structure_workplan_analysis": {
                    "narrative_overview": narrative_overview,
                    **analysis_json,
                },
                "status": "completed",
            }

            # Step 10: Save to DynamoDB
            logger.info("💾 Saving structure workplan analysis...")

            try:
                db_client.update_item_sync(
                    pk=f"PROPOSAL#{proposal_code}",
                    sk="METADATA",
                    update_expression="SET structure_workplan_analysis = :analysis",
                    expression_attribute_values={":analysis": result},
                )
                logger.info("✅ Structure workplan analysis saved successfully")
            except Exception as db_error:
                logger.error(f"❌ Failed to save to DynamoDB: {db_error}")
                raise

            logger.info("✅ Structure workplan analysis completed")
            return result

        except ValueError as ve:
            logger.error(f"❌ Validation error: {ve}")
            raise
        except Exception as e:
            logger.error(f"❌ Error in structure workplan analysis: {e}")
            import traceback

            traceback.print_exc()
            raise

    # ==================== PRIVATE HELPER METHODS ====================

    def _build_user_prompt(
        self,
        user_prompt_template: str,
        output_format: str,
        rfp_analysis: Dict[str, Any],
        concept_document_v2: Dict[str, Any],
        reference_proposals_analysis: Optional[Dict[str, Any]] = None,
        existing_work_analysis: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Build complete user prompt with all analyses injected.

        Injects:
        - RFP analysis ({{rfp_analysis}})
        - Concept document v2 ({{concept_document_v2}})
        - Reference proposals analysis ({{reference_proposals_analysis}})
        - Existing work analysis ({{existing_work_analysis}})

        Args:
            user_prompt_template: User prompt template from DynamoDB
            output_format: Output format instructions from DynamoDB
            rfp_analysis: RFP analysis from Step 1
            concept_document_v2: Concept document from Step 2
            reference_proposals_analysis: Reference proposals analysis from Step 2 (optional)
            existing_work_analysis: Existing work analysis from Step 2 (optional)

        Returns:
            Complete user prompt ready for Claude
        """
        # Combine template + output format
        complete_template = user_prompt_template
        if output_format:
            complete_template = f"{user_prompt_template}\n\n{output_format}"

        # Unwrap nested structures
        unwrapped_rfp = self._unwrap_analysis(rfp_analysis, "rfp_analysis")
        unwrapped_concept = self._unwrap_analysis(
            concept_document_v2, "concept_document_v2"
        )
        unwrapped_ref_proposals = self._unwrap_analysis(
            reference_proposals_analysis, "reference_proposals_analysis"
        )
        unwrapped_existing_work = self._unwrap_analysis(
            existing_work_analysis, "existing_work_analysis"
        )

        # Prepare JSON strings for injection
        rfp_json = json.dumps(unwrapped_rfp, indent=2)
        concept_json = json.dumps(unwrapped_concept, indent=2)
        ref_proposals_json = (
            json.dumps(unwrapped_ref_proposals, indent=2)
            if unwrapped_ref_proposals
            else "{}"
        )
        existing_work_json = (
            json.dumps(unwrapped_existing_work, indent=2)
            if unwrapped_existing_work
            else "{}"
        )

        # Inject all placeholders
        user_prompt = complete_template.replace("{{rfp_analysis}}", rfp_json)
        user_prompt = user_prompt.replace("{{concept_document_v2}}", concept_json)
        user_prompt = user_prompt.replace(
            "{{reference_proposals_analysis}}", ref_proposals_json
        )
        user_prompt = user_prompt.replace(
            "{{existing_work_analysis}}", existing_work_json
        )

        logger.info(f"📝 Built user prompt: {len(user_prompt)} characters")
        logger.info(f"   - RFP analysis: ✅ ({len(rfp_json)} chars)")
        logger.info(f"   - Concept document: ✅ ({len(concept_json)} chars)")
        logger.info(
            f"   - Reference proposals: {'✅' if unwrapped_ref_proposals else '⚠️  (empty)'}"
        )
        logger.info(
            f"   - Existing work: {'✅' if unwrapped_existing_work else '⚠️  (empty)'}"
        )

        return user_prompt

    def _unwrap_analysis(
        self, analysis: Optional[Dict[str, Any]], key: str
    ) -> Dict[str, Any]:
        """
        Unwrap nested analysis structure.

        Analysis data may come wrapped as:
        {key: {...}, 'status': '...'} or {'data': {key: {...}}}

        Args:
            analysis: Analysis data (possibly nested or None)
            key: The key to unwrap (e.g., "rfp_analysis", "reference_proposals_analysis")

        Returns:
            Unwrapped analysis dict, or empty dict if None
        """
        if not analysis or not isinstance(analysis, dict):
            return {}

        # Try to unwrap by key
        if key in analysis:
            return analysis[key]

        # Try nested 'data' structure
        if "data" in analysis and isinstance(analysis["data"], dict):
            nested = analysis["data"]
            if key in nested:
                return nested[key]
            return nested

        # Return as-is if no wrapping found
        return analysis
