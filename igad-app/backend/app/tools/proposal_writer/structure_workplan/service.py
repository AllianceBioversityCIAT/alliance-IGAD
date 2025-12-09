"""Structure and Workplan Analysis Service"""
import json
from typing import Dict, Any
from app.services.bedrock_service import BedrockService
from app.database.client import db_client
from app.tools.proposal_writer.structure_workplan.config import STRUCTURE_WORKPLAN_SETTINGS


class StructureWorkplanService:
    def __init__(self):
        self.bedrock = BedrockService()

    def analyze_structure_workplan(self, proposal_id: str) -> Dict[str, Any]:
        """
        Generate proposal structure and workplan based on RFP and concept evaluation.

        Args:
            proposal_id: Unique proposal identifier

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
        """
        try:
            # Step 1: Load proposal
            print(f"📋 Loading proposal: {proposal_id}")
            proposal = db_client.get_item_sync(
                pk=f"PROPOSAL#{proposal_id}", sk="METADATA"
            )

            if not proposal:
                raise Exception(f"Proposal {proposal_id} not found")

            # Step 2: Get RFP analysis
            rfp_analysis = proposal.get('rfp_analysis', {})
            if not rfp_analysis:
                raise Exception("RFP analysis not found. Please complete Step 1 first.")

            # Step 3: Get concept evaluation
            concept_evaluation = proposal.get('concept_evaluation', {})
            if not concept_evaluation:
                raise Exception("Concept evaluation not found. Please complete Step 2 first.")

            print(f"✅ Found RFP analysis and concept evaluation")

            # Step 4: Get prompt from DynamoDB
            print(f"📝 Loading prompt from DynamoDB...")
            from boto3.dynamodb.conditions import Attr
            
            table = self.bedrock.dynamodb.Table(self.bedrock.table_name)
            response = table.scan(
                FilterExpression=(
                    Attr("is_active").eq(True)
                    & Attr("section").eq("proposal_writer")
                    & Attr("sub_section").eq("step-3")
                    & Attr("categories").contains("Initial Proposal")
                )
            )

            if not response.get("Items"):
                raise Exception("Structure workplan prompt not found in DynamoDB")

            prompt_item = response["Items"][0]
            system_prompt = prompt_item.get("system_prompt", "")
            user_prompt_template = prompt_item.get("user_prompt_template", "")

            # Step 5: Inject context into user prompt
            user_prompt = user_prompt_template.replace(
                "{{rfp_analysis}}", json.dumps(rfp_analysis, indent=2)
            ).replace(
                "{{concept_evaluation}}", json.dumps(concept_evaluation, indent=2)
            )

            print(f"🤖 Sending to Bedrock...")

            # Step 6: Call Bedrock
            response = self.bedrock.invoke_model(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model_id=STRUCTURE_WORKPLAN_SETTINGS["model"],
                max_tokens=16000,
                temperature=0.3
            )

            # Step 7: Parse response
            analysis_text = response.get("content", [{}])[0].get("text", "")
            
            # Extract JSON from response
            json_start = analysis_text.find("{")
            json_end = analysis_text.rfind("}") + 1
            
            if json_start == -1 or json_end == 0:
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

            # Step 8: Save to DynamoDB
            print(f"💾 Saving structure workplan analysis...")
            db_client.update_item_sync(
                pk=f"PROPOSAL#{proposal_id}",
                sk="METADATA",
                update_expression="SET structure_workplan_analysis = :analysis",
                expression_attribute_values={":analysis": result}
            )

            print(f"✅ Structure workplan analysis completed")
            return result

        except Exception as e:
            print(f"❌ Error in structure workplan analysis: {e}")
            import traceback
            traceback.print_exc()
            raise
