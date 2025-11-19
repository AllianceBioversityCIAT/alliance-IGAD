"""
Simple RFP Analyzer - Uses default prompts for speed
"""

import json
import os
from typing import Any, Dict, Optional
import boto3
from boto3.dynamodb.conditions import Attr
from PyPDF2 import PdfReader
from io import BytesIO

from ..database.client import db_client
from .bedrock_service import BedrockService


class SimpleRFPAnalyzer:
    def __init__(self):
        self.s3 = boto3.client('s3')
        # Use same bucket as document upload
        self.bucket = os.environ.get('PROPOSALS_BUCKET')
        if not self.bucket:
            raise Exception("PROPOSALS_BUCKET environment variable not set")
        self.bedrock = BedrockService()
        
        # Initialize DynamoDB resource for prompt queries
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = os.environ.get('TABLE_NAME', 'igad-testing-main-table')
    
    async def analyze_rfp(self, proposal_code: str, proposal_id: str) -> Dict[str, Any]:
        """Analyze RFP document"""
        try:
            # 1. Get PDF from S3
            print(f"Getting PDF for proposal: {proposal_code}")
            pdf_key = f"{proposal_code}/documents/"
            
            response = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=pdf_key)
            
            if 'Contents' not in response or len(response['Contents']) == 0:
                raise Exception("No RFP document found. Please upload a PDF first.")
            
            # Find PDF file
            pdf_file = None
            for obj in response['Contents']:
                if obj['Key'].lower().endswith('.pdf'):
                    pdf_file = obj['Key']
                    break
            
            if not pdf_file:
                raise Exception("No PDF document found in the proposal folder.")
            
            # Download PDF
            print(f"Downloading PDF: {pdf_file}")
            pdf_obj = self.s3.get_object(Bucket=self.bucket, Key=pdf_file)
            pdf_bytes = pdf_obj['Body'].read()
            
            # 2. Extract text
            print("Extracting text from PDF...")
            rfp_text = self.extract_text_from_pdf(pdf_bytes)
            
            if not rfp_text or len(rfp_text) < 100:
                raise Exception("Could not extract sufficient text from PDF. The file might be image-based.")
            
            print(f"Extracted {len(rfp_text)} characters from PDF")
            
            # 3. Get prompt from DynamoDB
            print("📝 Loading prompt from DynamoDB...")
            prompt_parts = await self.get_prompt_from_dynamodb()
            
            if prompt_parts:
                print("✅ Using DynamoDB prompt")
                # Inject RFP text into the prompt
                max_chars = 10000
                truncated_text = rfp_text[:max_chars]
                if len(rfp_text) > max_chars:
                    print(f"⚠️ RFP text truncated from {len(rfp_text)} to {max_chars} chars")
                    truncated_text += "\n\n[... Document truncated for analysis ...]"
                
                # Replace {rfp_text} placeholder in user prompt
                user_prompt_with_text = prompt_parts['user_prompt'].replace("{rfp_text}", truncated_text)
                
                # Combine user instructions + output format
                final_user_prompt = f"""
{user_prompt_with_text}

{prompt_parts['output_format']}
""".strip()
                
                # 4. Call Bedrock with separated prompts
                print("📡 Sending to Bedrock for analysis...")
                import time
                start_time = time.time()
                
                ai_response = self.bedrock.invoke_claude(
                    system_prompt=prompt_parts['system_prompt'],
                    user_prompt=final_user_prompt,
                    max_tokens=4000,
                    temperature=0.5
                )
                
            else:
                # Fallback to default prompts
                print("⚠️ Falling back to default prompts")
                system_prompt = self.get_default_system_prompt()
                user_template = self.get_default_user_template()
                
                # 4. Inject RFP text (limit to 10k chars for speed)
                max_chars = 10000
                truncated_text = rfp_text[:max_chars]
                if len(rfp_text) > max_chars:
                    print(f"⚠️ RFP text truncated from {len(rfp_text)} to {max_chars} chars")
                    truncated_text += "\n\n[... Document truncated for analysis ...]"
                
                user_prompt = user_template.replace('[RFP TEXT]', truncated_text)
                
                # 5. Call Bedrock
                print("📡 Sending to Bedrock for analysis...")
                import time
                start_time = time.time()
                
                ai_response = self.bedrock.invoke_claude(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    max_tokens=4000,
                    temperature=0.5
                )
            
            elapsed = time.time() - start_time
            print(f"⏱️ Bedrock response time: {elapsed:.2f} seconds")
            
            # 6. Parse response
            print("Parsing AI response...")
            result = self.parse_response(ai_response)
            
            print("✅ Analysis completed successfully")
            
            return {
                "rfp_analysis": result,
                "status": "completed"
            }
            
        except Exception as e:
            print(f"❌ Analysis error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"RFP analysis failed: {str(e)}")
    
    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes"""
        try:
            pdf_file = BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"PDF text extraction failed: {str(e)}")
    
    async def get_prompt_from_dynamodb(self) -> Optional[Dict[str, str]]:
        """Get prompt from DynamoDB with specific filters
        
        Returns:
            Dict with 'system_prompt', 'user_prompt', 'output_format' or None if not found
        """
        try:
            print("🔍 Querying DynamoDB for prompt...")
            table = self.dynamodb.Table(self.table_name)
            
            # Scan with filters
            response = table.scan(
                FilterExpression=
                    Attr("is_active").eq(True) &
                    Attr("section").eq("proposal_writer") &
                    Attr("sub_section").eq("step-1") &
                    Attr("categories").contains("RFP / Call for Proposals")
            )
            
            items = response.get("Items", [])
            
            if not items:
                print("⚠️ No active prompts found for the section/sub_section/category")
                return None
            
            prompt_item = items[0]
            print(f"✅ Found prompt: {prompt_item.get('name', 'Unnamed')}")
            
            # Return the 3 fields separately
            system_prompt = prompt_item.get("system_prompt", "")
            user_prompt = prompt_item.get("user_prompt_template", "")
            output_format = prompt_item.get("output_format", "")
            
            print(f"📝 Prompt parts loaded:")
            print(f"   - system_prompt: {len(system_prompt)} chars")
            print(f"   - user_prompt_template: {len(user_prompt)} chars")
            print(f"   - output_format: {len(output_format)} chars")
            
            return {
                'system_prompt': system_prompt,
                'user_prompt': user_prompt,
                'output_format': output_format
            }
            
        except Exception as e:
            print(f"❌ Error loading prompt from DynamoDB: {str(e)}")
            return None
    
    def get_default_system_prompt(self) -> str:
        """Default system prompt that works"""
        return """You are an expert proposal analyst for international development projects.
Analyze the RFP document and provide a structured JSON response with:

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
    "evaluation_criteria": "Description of how proposals will be evaluated",
    "deliverables": ["deliverable 1", "deliverable 2"],
    "target_beneficiaries": "Who will benefit",
    "geographic_scope": ["country/region 1", "country/region 2"]
  }
}

Respond ONLY with valid JSON."""
    
    def get_default_user_template(self) -> str:
        """Default user template"""
        return """Analyze the following RFP document and extract the key information:

[RFP TEXT]

Provide your analysis as a JSON object following the structure specified above."""
    
    def parse_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        try:
            # Clean markdown code blocks
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            response = response.strip()
            
            # Parse JSON
            parsed = json.loads(response)
            print("✅ Response parsed successfully")
            return parsed
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {str(e)}")
            return {
                "summary": {"raw_response": response, "parse_error": str(e)},
                "extracted_data": {}
            }
