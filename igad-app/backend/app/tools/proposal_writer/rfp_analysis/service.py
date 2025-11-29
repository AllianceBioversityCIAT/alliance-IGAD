"""
RFP Analysis Service

Analyzes RFP (Request for Proposal) documents to extract key information including:
- Donor information and funding details
- Eligibility requirements and constraints
- Evaluation criteria
- Geographic scope and target beneficiaries

The service supports both:
1. Dynamic prompts from DynamoDB (preferred)
2. Default fallback prompts (for reliability)
"""

import json
import os
import re
import time
from typing import Any, Dict, Optional

import boto3
from boto3.dynamodb.conditions import Attr
from PyPDF2 import PdfReader
from io import BytesIO

from app.database.client import db_client
from app.shared.ai.bedrock_service import BedrockService
from app.tools.proposal_writer.rfp_analysis.config import RFP_ANALYSIS_SETTINGS


class SimpleRFPAnalyzer:
    """
    Analyzes RFP documents and extracts structured information.

    Workflow:
    1. Load RFP PDF from S3
    2. Extract text from PDF
    3. Load prompt from DynamoDB (or use defaults)
    4. Send to Claude via Bedrock
    5. Parse and return structured JSON response
    """

    def __init__(self):
        """Initialize S3, DynamoDB, and Bedrock clients."""
        self.s3 = boto3.client("s3")
        self.bucket = os.environ.get("PROPOSALS_BUCKET")
        if not self.bucket:
            raise Exception("PROPOSALS_BUCKET environment variable not set")

        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")

    def analyze_rfp(self, proposal_id: str) -> Dict[str, Any]:
        """
        Analyze RFP document and extract structured information.

        Args:
            proposal_id: Unique proposal identifier

        Returns:
            Dict with structure:
            {
                "rfp_analysis": {
                    "summary": {...},
                    "extracted_data": {...}
                },
                "status": "completed"
            }

        Raises:
            Exception: If proposal not found, PDF missing, or analysis fails
        """
        try:
            # Step 1: Retrieve proposal metadata
            print(f"📋 Loading proposal: {proposal_id}")
            proposal = db_client.get_item_sync(
                pk=f"PROPOSAL#{proposal_id}", sk="METADATA"
            )

            if not proposal:
                raise Exception(f"Proposal {proposal_id} not found")

            proposal_code = proposal.get("proposalCode")
            if not proposal_code:
                raise Exception("Proposal code not found")

            # Step 2: Retrieve RFP PDF from S3
            print(f"🔍 Locating RFP document for: {proposal_code}")
            rfp_text = self._get_rfp_text_from_s3(proposal_code)

            # Step 3: Validate extracted text
            if not rfp_text or len(rfp_text) < 100:
                raise Exception(
                    "Insufficient text extracted from PDF. "
                    "The file might be image-based or encrypted."
                )

            print(f"✅ Extracted {len(rfp_text)} characters from PDF")

            # Step 4: Load prompt and inject RFP text
            print("📝 Loading analysis prompt...")
            prompt_parts = self._load_prompt(rfp_text)

            # Step 5: Call Bedrock for analysis
            print("📡 Sending to Bedrock for analysis...")
            start_time = time.time()

            ai_response = self.bedrock.invoke_claude(
                system_prompt=prompt_parts["system_prompt"],
                user_prompt=prompt_parts["user_prompt"],
                max_tokens=RFP_ANALYSIS_SETTINGS.get("max_tokens", 12000),
                temperature=RFP_ANALYSIS_SETTINGS.get("temperature", 0.2),
                model_id=RFP_ANALYSIS_SETTINGS["model"],
            )

            elapsed = time.time() - start_time
            print(f"⏱️ Bedrock response time: {elapsed:.2f} seconds")

            # Step 6: Parse response
            print("🔄 Parsing AI response...")
            result = self.parse_response(ai_response)

            print("✅ RFP analysis completed successfully")

            return {"rfp_analysis": result, "status": "completed"}

        except Exception as e:
            print(f"❌ RFP analysis failed: {str(e)}")
            raise Exception(f"RFP analysis failed: {str(e)}")

    # ==================== PRIVATE HELPER METHODS ====================

    def _get_rfp_text_from_s3(self, proposal_code: str) -> str:
        """
        Retrieve and extract text from RFP PDF in S3.

        Attempts to find PDF in new structure first, then falls back to old path.

        Args:
            proposal_code: Proposal code for path construction

        Returns:
            Extracted text from PDF

        Raises:
            Exception: If PDF not found or extraction fails
        """
        # Try new folder structure first
        pdf_key = f"{proposal_code}/documents/rfp/"
        response = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=pdf_key)

        # Fallback to old structure
        if "Contents" not in response or len(response["Contents"]) == 0:
            print(f"ℹ️  No RFP in /rfp/ folder, trying legacy path...")
            pdf_key = f"{proposal_code}/documents/"
            response = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=pdf_key)

        if "Contents" not in response or len(response["Contents"]) == 0:
            raise Exception("No RFP document found. Please upload a PDF.")

        # Find PDF file
        pdf_file = self._find_pdf_file(response["Contents"])
        if not pdf_file:
            raise Exception("No PDF file found in proposal folder.")

        # Download and extract
        print(f"📥 Downloading: {pdf_file}")
        pdf_obj = self.s3.get_object(Bucket=self.bucket, Key=pdf_file)
        pdf_bytes = pdf_obj["Body"].read()

        print("📖 Extracting PDF text...")
        return self.extract_text_from_pdf(pdf_bytes)

    def _find_pdf_file(self, contents: list) -> Optional[str]:
        """
        Find PDF file in S3 contents list.

        Args:
            contents: List of S3 object summaries

        Returns:
            PDF file key if found, None otherwise
        """
        for obj in contents:
            if obj["Key"].lower().endswith(".pdf"):
                return obj["Key"]
        return None

    def _load_prompt(self, rfp_text: str) -> Dict[str, str]:
        """
        Load analysis prompt from DynamoDB or use defaults.

        Args:
            rfp_text: Extracted RFP text to inject into prompt

        Returns:
            Dict with 'system_prompt', 'user_prompt'
        """
        prompt_parts = self.get_prompt_from_dynamodb()
        prepared_text = self._prepare_rfp_text(rfp_text)

        if prompt_parts:
            print("✅ Using DynamoDB prompt")
            # Inject RFP text with proper placeholder
            user_prompt = prompt_parts["user_prompt"].replace(
                "{{rfp_analysis.rfp_text}}", prepared_text
            )
            user_prompt = (
                f"{user_prompt}\n\n{prompt_parts['output_format']}"
            ).strip()

            return {
                "system_prompt": prompt_parts["system_prompt"],
                "user_prompt": user_prompt,
            }
        else:
            print("⚠️  Using default prompts (DynamoDB not available)")
            return {
                "system_prompt": self._get_default_system_prompt(),
                "user_prompt": f"{self._get_default_user_template()}\n\n{prepared_text}",
            }

    def _prepare_rfp_text(self, rfp_text: str) -> str:
        """
        Prepare RFP text for injection into prompt.

        Truncates to configurable limit and adds truncation notice if needed.

        Args:
            rfp_text: Full extracted RFP text

        Returns:
            Prepared text (possibly truncated)
        """
        max_chars = RFP_ANALYSIS_SETTINGS.get("max_chars", 50000)

        if len(rfp_text) <= max_chars:
            print(f"📄 RFP text within limit ({len(rfp_text)} chars)")
            return rfp_text

        print(f"✂️  Truncating RFP text from {len(rfp_text)} to {max_chars} chars")
        return rfp_text[:max_chars] + "\n\n[... Document truncated for analysis ...]"

    # ==================== PDF EXTRACTION ====================

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """
        Extract text from PDF bytes.

        Args:
            pdf_bytes: PDF file content as bytes

        Returns:
            Extracted text

        Raises:
            Exception: If PDF extraction fails
        """
        try:
            pdf_file = BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)
            text = ""

            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"

            return text.strip()

        except Exception as e:
            raise Exception(f"PDF extraction failed: {str(e)}")

    # ==================== PROMPT MANAGEMENT ====================

    def get_prompt_from_dynamodb(self) -> Optional[Dict[str, str]]:
        """
        Load prompt template from DynamoDB.

        Searches for active prompt with specific criteria:
        - is_active: true
        - section: "proposal_writer"
        - sub_section: "step-1"
        - categories: contains "RFP / Call for Proposals"

        Returns:
            Dict with 'system_prompt', 'user_prompt', 'output_format', or None
        """
        try:
            table = self.dynamodb.Table(self.table_name)
            response = table.scan(
                FilterExpression=(
                    Attr("is_active").eq(True)
                    & Attr("section").eq("proposal_writer")
                    & Attr("sub_section").eq("step-1")
                    & Attr("categories").contains("RFP / Call for Proposals")
                )
            )

            items = response.get("Items", [])
            if not items:
                print("⚠️  No active prompts found in DynamoDB")
                return None

            prompt_item = items[0]
            print(f"✅ Loaded prompt: {prompt_item.get('name', 'Unnamed')}")

            return {
                "system_prompt": prompt_item.get("system_prompt", ""),
                "user_prompt": prompt_item.get("user_prompt_template", ""),
                "output_format": prompt_item.get("output_format", ""),
            }

        except Exception as e:
            print(f"⚠️  Failed to load prompt from DynamoDB: {str(e)}")
            return None

    def _get_default_system_prompt(self) -> str:
        """
        Get default system prompt for RFP analysis.

        Used when DynamoDB prompt is not available.

        Returns:
            System prompt string
        """
        return """You are an expert proposal analyst for international development projects.
Analyze the RFP document and extract key information. Respond ONLY with valid JSON.

Use this structure:
{
  "summary": {
    "title": "Project title",
    "donor": "Funding organization",
    "deadline": "Submission deadline",
    "budget_range": "Budget amount/range",
    "key_focus": "Main focus area"
  },
  "extracted_data": {
    "mandatory_requirements": ["requirement 1", "requirement 2"],
    "evaluation_criteria": "Description of how proposals are evaluated",
    "deliverables": ["deliverable 1", "deliverable 2"],
    "target_beneficiaries": "Who will benefit",
    "geographic_scope": ["country/region 1", "country/region 2"]
  }
}"""

    def _get_default_user_template(self) -> str:
        """
        Get default user prompt template for RFP analysis.

        Returns:
            User prompt template
        """
        return "Analyze this RFP document and extract key information:"

    # ==================== RESPONSE PARSING ====================

    def parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse Claude's response into structured JSON.

        Handles multiple response formats:
        1. Valid JSON object
        2. JSON in markdown code block (```json ... ```)
        3. JSON with markdown markers
        4. Falls back to error structure if parsing fails

        Args:
            response: Raw response from Claude

        Returns:
            Parsed JSON dict or error structure
        """
        try:
            response = response.strip()

            # Try to extract JSON from code block
            json_match = re.search(r"```json\s*(\{.*?\})\s*```", response, re.DOTALL)
            if json_match:
                response = json_match.group(1)
            else:
                # Try to find JSON object directly
                json_match = re.search(r"\{.*?\}", response, re.DOTALL)
                if json_match:
                    response = json_match.group(0)
                else:
                    # Remove markdown markers if present
                    response = response.lstrip("```json").lstrip("```").rstrip("```")

            response = response.strip()
            parsed = json.loads(response)
            print("✅ Response parsed successfully")
            return parsed

        except json.JSONDecodeError as e:
            print(f"⚠️  JSON parsing failed: {str(e)}")
            # Return error structure that matches expected format
            return {
                "summary": {"error": "Failed to parse response", "details": str(e)},
                "extracted_data": {"raw_response": response},
            }
