"""Structure and Workplan Analysis Service"""
import json
import logging
import os
import time
import boto3
from typing import Dict, Any
from boto3.dynamodb.conditions import Attr
from app.shared.ai.bedrock_service import BedrockService
from app.database.client import db_client
from app.tools.proposal_writer.structure_workplan.config import STRUCTURE_WORKPLAN_SETTINGS

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
            rfp_analysis = proposal.get('rfp_analysis', {})
            if not rfp_analysis:
                raise Exception("RFP analysis not found. Please complete Step 1 first.")

            # Step 3: Get concept evaluation (try both keys)
            concept_evaluation = proposal.get('concept_evaluation')
            if not concept_evaluation:
                # Fallback to concept_analysis
                concept_evaluation = proposal.get('concept_analysis')

            if not concept_evaluation:
                raise Exception("Concept evaluation not found. Please complete Step 2 first.")

            logger.info(f"✅ Found RFP analysis and concept evaluation")

            # Step 4: Get prompt from DynamoDB
            logger.info(f"📝 Loading prompt from DynamoDB...")

            table = self.dynamodb.Table(self.table_name)
            response = table.scan(
                FilterExpression=(
                    Attr("is_active").eq(True)
                    & Attr("section").eq(STRUCTURE_WORKPLAN_SETTINGS["section"])
                    & Attr("sub_section").eq(STRUCTURE_WORKPLAN_SETTINGS["sub_section"])
                    & Attr("categories").contains(STRUCTURE_WORKPLAN_SETTINGS["category"])
                )
            )

            if not response.get("Items"):
                raise Exception("Structure workplan prompt not found in DynamoDB")

            prompt_item = response["Items"][0]
            system_prompt = prompt_item.get("system_prompt", "")
            user_prompt_template = prompt_item.get("user_prompt_template", "")
            output_format = prompt_item.get("output_format", "")

            # Step 5: Build complete user prompt with output format
            # Combine template + output format instructions
            complete_template = user_prompt_template
            if output_format:
                complete_template = f"{user_prompt_template}\n\n{output_format}"

            # Step 6: Inject context into user prompt
            user_prompt = complete_template.replace(
                "{{rfp_analysis}}", json.dumps(rfp_analysis, indent=2)
            ).replace(
                "{{concept_evaluation}}", json.dumps(concept_evaluation, indent=2)
            )

            logger.info(f"🤖 Sending to Bedrock...")
            logger.info(f"   Model: {STRUCTURE_WORKPLAN_SETTINGS['model']}")
            logger.info(f"   Max tokens: {STRUCTURE_WORKPLAN_SETTINGS['max_tokens']}")
            logger.info(f"   Temperature: {STRUCTURE_WORKPLAN_SETTINGS['temperature']}")

            # Step 7: Call Bedrock with metrics
            start_time = time.time()

            response_text = self.bedrock.invoke_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model_id=STRUCTURE_WORKPLAN_SETTINGS["model"],
                max_tokens=STRUCTURE_WORKPLAN_SETTINGS["max_tokens"],
                temperature=STRUCTURE_WORKPLAN_SETTINGS["temperature"]
            )

            elapsed_time = time.time() - start_time
            logger.info(f"✅ Bedrock response received in {elapsed_time:.2f}s")

            # Step 8: Parse response
            analysis_text = response_text

            # Log first 500 chars for debugging
            logger.info(f"📄 Bedrock response preview (first 500 chars):")
            logger.info(f"{analysis_text[:500]}")

            # Extract JSON from response
            json_start = analysis_text.find("{")
            json_end = analysis_text.rfind("}") + 1

            if json_start == -1 or json_end == 0:
                logger.error(f"❌ No JSON found. Full response length: {len(analysis_text)}")
                logger.error(f"📄 Full response: {analysis_text[:1000]}")  # First 1000 chars
                raise Exception("No JSON found in Bedrock response")

            analysis_json = json.loads(analysis_text[json_start:json_end])

            # Extract narrative (text before JSON)
            narrative_overview = analysis_text[:json_start].strip()

            result = {
                "structure_workplan_analysis": {
                    "narrative_overview": narrative_overview,
                    **analysis_json
                },
                "status": "completed"
            }

            # Step 9: Save to DynamoDB
            logger.info(f"💾 Saving structure workplan analysis...")

            try:
                db_client.update_item_sync(
                    pk=f"PROPOSAL#{proposal_code}",
                    sk="METADATA",
                    update_expression="SET structure_workplan_analysis = :analysis",
                    expression_attribute_values={":analysis": result}
                )
                logger.info(f"✅ Structure workplan analysis saved successfully")
            except Exception as db_error:
                logger.error(f"❌ Failed to save to DynamoDB: {db_error}")
                raise

            logger.info(f"✅ Structure workplan analysis completed")
            return result

        except ValueError as ve:
            logger.error(f"❌ Validation error: {ve}")
            raise
        except Exception as e:
            logger.error(f"❌ Error in structure workplan analysis: {e}")
            import traceback
            traceback.print_exc()
            raise
