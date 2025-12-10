"""Draft Proposal Feedback Analysis Service

Analyzes user's draft proposal against RFP requirements to provide:
- Section-by-section feedback with status ratings (EXCELLENT, GOOD, NEEDS_IMPROVEMENT)
- Specific improvement suggestions for each section
- Overall assessment and alignment with RFP requirements
"""
import json
import logging
import os
import time
import boto3
from typing import Dict, Any, Optional
from boto3.dynamodb.conditions import Attr
from app.shared.ai.bedrock_service import BedrockService
from app.database.client import db_client
from app.tools.proposal_writer.draft_feedback.config import DRAFT_FEEDBACK_SETTINGS
from app.utils.document_extraction import extract_text_from_file

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class DraftFeedbackService:
    """Service for analyzing draft proposals and generating feedback."""

    def __init__(self):
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")
        self.s3_client = boto3.client("s3")
        self.bucket_name = os.environ.get("PROPOSALS_BUCKET")

    def analyze_draft_feedback(self, proposal_id: str) -> Dict[str, Any]:
        """
        Analyze draft proposal and generate section-by-section feedback.

        Args:
            proposal_id: Proposal code (PROP-YYYYMMDD-XXXX) or UUID

        Returns:
            Dict with structure:
            {
                "draft_feedback_analysis": {
                    "overall_assessment": "...",
                    "sections": [
                        {
                            "title": "Executive Summary",
                            "status": "EXCELLENT" | "GOOD" | "NEEDS_IMPROVEMENT",
                            "feedback": "...",
                            "suggestions": ["...", "..."]
                        },
                        ...
                    ],
                    "summary_stats": {
                        "excellent_count": 3,
                        "good_count": 2,
                        "needs_improvement_count": 1
                    }
                },
                "status": "completed"
            }

        Raises:
            ValueError: If proposal_id is invalid
            Exception: If proposal not found, prerequisites missing, or analysis fails
        """
        try:
            # Step 1: Validate input
            if not proposal_id or not isinstance(proposal_id, str):
                raise ValueError("proposal_id must be a non-empty string")

            if not proposal_id.strip():
                raise ValueError("proposal_id cannot be whitespace only")

            # Step 2: Load proposal
            logger.info(f"📋 Loading proposal: {proposal_id}")

            if proposal_id.startswith("PROP-"):
                pk = f"PROPOSAL#{proposal_id}"
            else:
                pk = f"PROPOSAL#{proposal_id}"

            proposal = db_client.get_item_sync(pk=pk, sk="METADATA")

            if not proposal:
                raise Exception(f"Proposal {proposal_id} not found")

            proposal_code = proposal.get("proposalCode", proposal_id)
            logger.info(f"📋 Using proposal_code: {proposal_code}")

            # Step 3: Get draft proposal text from S3
            draft_documents = proposal.get("uploaded_files", {}).get("draft-proposal", [])
            if not draft_documents:
                raise Exception("No draft proposal document found. Please upload your draft first.")

            draft_filename = draft_documents[0]
            draft_text = self._extract_draft_text(proposal_code, draft_filename)

            if not draft_text or len(draft_text.strip()) < 100:
                raise Exception("Could not extract text from draft proposal document or document is too short.")

            logger.info(f"✅ Extracted {len(draft_text)} characters from draft proposal")

            # Step 4: Get RFP analysis (required context)
            rfp_analysis = proposal.get("rfp_analysis", {})
            if not rfp_analysis:
                raise Exception("RFP analysis not found. Please complete Step 1 first.")

            logger.info(f"✅ Found RFP analysis")

            # Step 5: Load prompt from DynamoDB
            logger.info(f"📝 Loading prompt from DynamoDB...")

            table = self.dynamodb.Table(self.table_name)
            response = table.scan(
                FilterExpression=(
                    Attr("is_active").eq(True)
                    & Attr("section").eq(DRAFT_FEEDBACK_SETTINGS["section"])
                    & Attr("sub_section").eq(DRAFT_FEEDBACK_SETTINGS["sub_section"])
                    & Attr("categories").contains(DRAFT_FEEDBACK_SETTINGS["category"])
                )
            )

            if not response.get("Items"):
                raise Exception("Draft Feedback prompt not found in DynamoDB")

            prompt_item = response["Items"][0]
            system_prompt = prompt_item.get("system_prompt", "")
            user_prompt_template = prompt_item.get("user_prompt_template", "")
            output_format = prompt_item.get("output_format", "")

            logger.info(f"✅ Loaded prompt: {prompt_item.get('name', 'Unnamed')}")

            # Step 6: Build complete user prompt
            user_prompt = self._build_user_prompt(
                user_prompt_template=user_prompt_template,
                output_format=output_format,
                draft_proposal=draft_text,
                rfp_analysis=rfp_analysis
            )

            logger.info(f"🤖 Sending to Bedrock...")
            logger.info(f"   Model: {DRAFT_FEEDBACK_SETTINGS['model']}")
            logger.info(f"   Max tokens: {DRAFT_FEEDBACK_SETTINGS['max_tokens']}")
            logger.info(f"   Temperature: {DRAFT_FEEDBACK_SETTINGS['temperature']}")

            # Step 7: Call Bedrock with metrics
            start_time = time.time()

            response_text = self.bedrock.invoke_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model_id=DRAFT_FEEDBACK_SETTINGS["model"],
                max_tokens=DRAFT_FEEDBACK_SETTINGS["max_tokens"],
                temperature=DRAFT_FEEDBACK_SETTINGS["temperature"]
            )

            elapsed_time = time.time() - start_time
            logger.info(f"✅ Bedrock response received in {elapsed_time:.2f}s")

            # Step 8: Parse response
            logger.info(f"📄 Bedrock response preview (first 500 chars):")
            logger.info(f"{response_text[:500]}")

            analysis_result = self._parse_response(response_text)

            result = {
                "draft_feedback_analysis": analysis_result,
                "status": "completed"
            }

            # Step 9: Save to DynamoDB
            logger.info(f"💾 Saving draft feedback analysis...")

            try:
                db_client.update_item_sync(
                    pk=f"PROPOSAL#{proposal_code}",
                    sk="METADATA",
                    update_expression="SET draft_feedback_analysis = :analysis",
                    expression_attribute_values={":analysis": result}
                )
                logger.info(f"✅ Draft feedback analysis saved successfully")
            except Exception as db_error:
                logger.error(f"❌ Failed to save to DynamoDB: {db_error}")
                raise

            logger.info(f"✅ Draft feedback analysis completed")
            return result

        except ValueError as ve:
            logger.error(f"❌ Validation error: {ve}")
            raise
        except Exception as e:
            logger.error(f"❌ Error in draft feedback analysis: {e}")
            import traceback
            traceback.print_exc()
            raise

    # ==================== PRIVATE HELPER METHODS ====================

    def _extract_draft_text(self, proposal_code: str, filename: str) -> str:
        """
        Extract text from uploaded draft proposal document in S3.

        Args:
            proposal_code: Proposal code (PROP-YYYYMMDD-XXXX)
            filename: Filename of the uploaded document

        Returns:
            Extracted text content
        """
        s3_key = f"{proposal_code}/documents/draft_proposal/{filename}"

        logger.info(f"📥 Downloading draft from S3: {s3_key}")

        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            file_bytes = response["Body"].read()

            logger.info(f"📄 Downloaded {len(file_bytes)} bytes from S3")

            # Extract text using existing utility
            extracted_text = extract_text_from_file(file_bytes, filename)

            if not extracted_text:
                raise Exception(f"Could not extract text from {filename}")

            return extracted_text

        except self.s3_client.exceptions.NoSuchKey:
            raise Exception(f"Draft proposal document not found in S3: {s3_key}")
        except Exception as e:
            logger.error(f"❌ Failed to extract draft text: {e}")
            raise

    def _build_user_prompt(
        self,
        user_prompt_template: str,
        output_format: str,
        draft_proposal: str,
        rfp_analysis: Dict[str, Any]
    ) -> str:
        """
        Build complete user prompt with all data injected.

        Injects:
        - Draft proposal text ({{draft_proposal}})
        - RFP analysis JSON ({{rfp_analysis}})

        Args:
            user_prompt_template: User prompt template from DynamoDB
            output_format: Output format instructions from DynamoDB
            draft_proposal: Extracted text from draft proposal document
            rfp_analysis: RFP analysis from Step 1

        Returns:
            Complete user prompt ready for Claude
        """
        # Combine template + output format
        complete_template = user_prompt_template
        if output_format:
            complete_template = f"{user_prompt_template}\n\n{output_format}"

        # Unwrap RFP analysis if nested
        unwrapped_rfp = self._unwrap_analysis(rfp_analysis, "rfp_analysis")
        rfp_json = json.dumps(unwrapped_rfp, indent=2)

        # Inject placeholders
        user_prompt = complete_template.replace("{{draft_proposal}}", draft_proposal)
        user_prompt = user_prompt.replace("{{rfp_analysis}}", rfp_json)

        logger.info(f"📝 Built user prompt: {len(user_prompt)} characters")
        logger.info(f"   - Draft proposal: {len(draft_proposal)} chars")
        logger.info(f"   - RFP analysis: {len(rfp_json)} chars")

        return user_prompt

    def _unwrap_analysis(
        self,
        analysis: Optional[Dict[str, Any]],
        key: str
    ) -> Dict[str, Any]:
        """
        Unwrap nested analysis structure.

        Analysis data may come wrapped as:
        {key: {...}, 'status': '...'} or {'data': {key: {...}}}

        Args:
            analysis: Analysis data (possibly nested or None)
            key: The key to unwrap (e.g., "rfp_analysis")

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

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse Claude's response into structured feedback.

        Expected response format:
        - Narrative text (overall assessment)
        - JSON with sections array

        Args:
            response: Raw response from Claude

        Returns:
            Structured feedback dict with sections and summary stats
        """
        try:
            # Extract JSON from response
            json_start = response.find("{")
            json_end = response.rfind("}") + 1

            if json_start == -1 or json_end == 0:
                logger.error(f"❌ No JSON found in response. Full response length: {len(response)}")
                logger.error(f"📄 Full response: {response[:1000]}")
                raise Exception("No JSON found in Bedrock response")

            analysis_json = json.loads(response[json_start:json_end])

            # Extract overall assessment (text before JSON)
            overall_assessment = response[:json_start].strip()

            # Get sections array
            sections = analysis_json.get("sections", [])

            # Calculate summary stats
            summary_stats = {
                "excellent_count": sum(1 for s in sections if s.get("status") == "EXCELLENT"),
                "good_count": sum(1 for s in sections if s.get("status") == "GOOD"),
                "needs_improvement_count": sum(1 for s in sections if s.get("status") == "NEEDS_IMPROVEMENT")
            }

            logger.info(f"📊 Parsed {len(sections)} sections")
            logger.info(f"   - Excellent: {summary_stats['excellent_count']}")
            logger.info(f"   - Good: {summary_stats['good_count']}")
            logger.info(f"   - Needs Improvement: {summary_stats['needs_improvement_count']}")

            return {
                "overall_assessment": overall_assessment,
                "sections": sections,
                "summary_stats": summary_stats
            }

        except json.JSONDecodeError as e:
            logger.error(f"❌ JSON parsing failed: {e}")
            # Return fallback with raw response
            return {
                "overall_assessment": response,
                "sections": [],
                "summary_stats": {
                    "excellent_count": 0,
                    "good_count": 0,
                    "needs_improvement_count": 0
                }
            }
