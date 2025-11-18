"""
Simple RFP Analyzer - Direct approach without vectorization
Extracts text from PDF and sends directly to Bedrock
"""

import json
import boto3
import os
from typing import Dict, Any
from datetime import datetime
import PyPDF2
from io import BytesIO

from .bedrock_service import BedrockService
from ..database.client import db_client


class SimpleRFPAnalyzer:
    def __init__(self):
        self.bedrock = BedrockService()
        self.s3 = boto3.client('s3', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
        self.bucket = os.environ.get('PROPOSALS_BUCKET')
    
    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract all text from PDF"""
        try:
            pdf_file = BytesIO(pdf_bytes)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_parts = []
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            
            full_text = "\n\n".join(text_parts)
            return full_text
            
        except Exception as e:
            print(f"Error extracting PDF text: {str(e)}")
            raise Exception(f"Failed to extract text from PDF: {str(e)}")
    
    async def analyze_rfp(self, proposal_code: str, proposal_id: str) -> Dict[str, Any]:
        """
        Simple RFP Analysis:
        1. Get PDF from S3
        2. Extract text
        3. Send to Bedrock with prompt
        4. Return structured response
        """
        try:
            # 1. Get PDF from S3
            print(f"Getting PDF for proposal: {proposal_code}")
            pdf_key = f"{proposal_code}/documents/"
            
            # List files in the documents folder
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=pdf_key
            )
            
            if 'Contents' not in response or len(response['Contents']) == 0:
                raise Exception("No RFP document found. Please upload a PDF first.")
            
            # Get the first PDF file
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
            
            # 3. Get analysis prompt from DynamoDB
            prompt_data = await self.get_analysis_prompt()
            
            if prompt_data:
                system_prompt = prompt_data.get('system_prompt', self.get_default_system_prompt())
                user_template = prompt_data.get('user_prompt_template', self.get_default_user_prompt())
            else:
                system_prompt = self.get_default_system_prompt()
                user_template = self.get_default_user_prompt()
            
            # Inject RFP text into prompt
            user_prompt = user_template.replace('{rfp_text}', rfp_text[:15000])  # Limit to 15k chars
            
            # 4. Call Bedrock
            print("Sending to Bedrock for analysis...")
            ai_response = self.bedrock.invoke_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=4000,
                temperature=0.5
            )
            
            # 5. Parse response
            print("Parsing AI response...")
            analysis_result = self.parse_response(ai_response)
            
            # 6. Save to DynamoDB
            await self.save_analysis(proposal_code, proposal_id, analysis_result)
            
            return {
                "success": True,
                "rfp_analysis": analysis_result,
                "analyzed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error analyzing RFP: {str(e)}")
            raise Exception(f"RFP analysis failed: {str(e)}")
    
    def parse_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        try:
            # Try to extract JSON from response
            # AI might wrap JSON in markdown code blocks
            response = response.strip()
            
            # Remove markdown code blocks if present
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            
            response = response.strip()
            
            # Parse JSON
            parsed = json.loads(response)
            return parsed
            
        except json.JSONDecodeError:
            # Fallback: return as plain text
            return {
                "summary": {
                    "raw_response": response
                },
                "extracted_data": {},
                "ai_insights": {}
            }
    
    async def get_analysis_prompt(self) -> Dict[str, Any]:
        """Get RFP analysis prompt from DynamoDB"""
        try:
            # Query for active prompt
            response = await db_client.scan_table()
            
            for item in response:
                if (item.get('PK', '').startswith('PROMPT#') and
                    item.get('section') == 'Proposal writer' and
                    item.get('sub_section') == 'step-1' and
                    item.get('category') == 'RFP / Call for Proposals' and
                    item.get('status') == 'active'):
                    return item
            
            return None
            
        except Exception as e:
            print(f"Error getting prompt: {str(e)}")
            return None
    
    async def save_analysis(self, proposal_code: str, proposal_id: str, analysis: Dict[str, Any]):
        """Save analysis to proposal"""
        try:
            pk = f"PROPOSAL#{proposal_code}"
            
            update_expr = "SET rfp_analysis = :analysis, updated_at = :updated"
            expr_values = {
                ":analysis": analysis,
                ":updated": datetime.utcnow().isoformat()
            }
            
            await db_client.update_item(
                pk=pk,
                sk="METADATA",
                update_expression=update_expr,
                expression_attribute_values=expr_values
            )
            
            print(f"Saved analysis for {proposal_code}")
            
        except Exception as e:
            print(f"Error saving analysis: {str(e)}")
            raise
    
    def get_default_system_prompt(self) -> str:
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
    
    def get_default_user_prompt(self) -> str:
        return """Analyze this RFP document and extract key information:

{rfp_text}

Provide your analysis as a JSON object with summary and extracted_data fields."""
