"""
RFP Analysis Service
Analyzes uploaded RFP documents using vector search and AI
"""

import json
from typing import Dict, Any, Optional
from datetime import datetime

from .document_service import DocumentService
from .bedrock_service import BedrockService
from ..database.client import db_client


class RFPAnalysisService:
    def __init__(self):
        self.doc_service = DocumentService()
        self.bedrock_service = BedrockService()
    
    async def get_analysis_prompt(self) -> Optional[Dict[str, Any]]:
        """
        Retrieve RFP analysis prompt from DynamoDB
        Filters by: section=proposal_writer, sub_section=step-1, 
                   category=RFP / Call for Proposals, status=active
        """
        try:
            # Query prompts table for active RFP analysis prompt
            # Note: Adjust table structure based on your actual prompts table
            response = await db_client.query_items(
                pk="PROMPT#proposal_writer",
                index_name="GSI1"  # Assuming you have a GSI for querying
            )
            
            # Filter for specific prompt
            for item in response:
                if (item.get("sub_section") == "step-1" and 
                    item.get("category") == "RFP / Call for Proposals" and
                    item.get("status") == "active"):
                    return item
            
            # If not found with exact match, try scanning
            # This is a fallback - adjust based on your table structure
            return None
            
        except Exception as e:
            print(f"Error retrieving analysis prompt: {str(e)}")
            raise
    
    async def analyze_rfp(
        self,
        proposal_code: str,
        proposal_id: str
    ) -> Dict[str, Any]:
        """
        Analyze RFP document:
        1. Check if vectors exist, if not create them from PDF
        2. Get full RFP text from vectors
        3. Retrieve analysis prompt
        4. Inject RFP text into prompt
        5. Send to Bedrock
        6. Parse response
        7. Save to DynamoDB
        """
        try:
            # 1. Check if vectors exist, if not process the PDF
            import boto3
            import os
            
            s3 = boto3.client('s3', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
            bucket_name = os.environ.get('PROPOSALS_BUCKET')
            
            if not bucket_name:
                raise Exception("S3 bucket not configured")
            
            # Check for vectors
            vector_prefix = f"{proposal_code}/documents/vectors/"
            try:
                response = s3.list_objects_v2(
                    Bucket=bucket_name,
                    Prefix=vector_prefix,
                    MaxKeys=1
                )
                
                has_vectors = 'Contents' in response and len(response['Contents']) > 0
                
                if not has_vectors:
                    print(f"No vectors found for {proposal_code}, processing PDF...")
                    
                    # Get the PDF from S3
                    doc_prefix = f"{proposal_code}/documents/"
                    doc_response = s3.list_objects_v2(
                        Bucket=bucket_name,
                        Prefix=doc_prefix
                    )
                    
                    if not ('Contents' in doc_response and len(doc_response['Contents']) > 0):
                        raise Exception("No RFP document found. Please upload an RFP first.")
                    
                    # Get the first PDF
                    pdf_key = doc_response['Contents'][0]['Key']
                    pdf_obj = s3.get_object(Bucket=bucket_name, Key=pdf_key)
                    pdf_content = pdf_obj['Body'].read()
                    filename = pdf_key.split('/')[-1]
                    
                    # Get user_id from proposal
                    from ..database.client import db_client
                    pk = f"PROPOSAL#{proposal_code}"
                    proposal = await db_client.get_item(pk=pk, sk="METADATA")
                    user_id = proposal.get("user_id", "unknown")
                    
                    # Process the PDF to create vectors
                    result = self.doc_service.process_document_sync(
                        proposal_code=proposal_code,
                        file_content=pdf_content,
                        filename=filename,
                        user_id=user_id
                    )
                    
                    print(f"Created {result['total_chunks']} vector chunks from PDF")
                    
            except Exception as e:
                print(f"Error checking/creating vectors: {str(e)}")
                raise Exception(f"Failed to prepare RFP for analysis: {str(e)}")
            
            # 2. Get RFP context from vectors
            rfp_context = await self.doc_service.get_document_context(
                proposal_code=proposal_code,
                query="Provide complete RFP overview including requirements, criteria, deliverables, and timeline",
                max_chunks=10  # Get more chunks for comprehensive analysis
            )
            
            if not rfp_context:
                raise Exception("No RFP document found for analysis")
            
            # 3. Retrieve analysis prompt from DynamoDB
            prompt_template = await self.get_analysis_prompt()
            
            if not prompt_template:
                # Fallback to default prompt if not found in DB
                prompt_template = {
                    "system_prompt": self._get_default_system_prompt(),
                    "user_prompt_template": self._get_default_user_prompt()
                }
            
            # 4. Inject RFP text into prompt
            system_prompt = prompt_template.get("system_prompt", "")
            user_prompt = prompt_template.get("user_prompt_template", "").replace(
                "{rfp_text}", 
                rfp_context
            )
            
            # 4. Send to Bedrock for analysis
            print(f"Analyzing RFP for proposal: {proposal_code}")
            
            response = self.bedrock_service.invoke_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt
            )
            
            # 5. Parse response into structured format
            analysis_result = self._parse_analysis_response(response)
            
            # 6. Save to DynamoDB
            await self._save_analysis_to_db(
                proposal_code=proposal_code,
                proposal_id=proposal_id,
                analysis=analysis_result
            )
            
            return {
                "success": True,
                "rfp_analysis": analysis_result,
                "analyzed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"Error analyzing RFP: {str(e)}")
            raise
    
    def _parse_analysis_response(self, response: str) -> Dict[str, Any]:
        """
        Parse AI response into structured format
        Expects JSON response with summary and extracted_data
        """
        try:
            # Try to parse as JSON first
            parsed = json.loads(response)
            return parsed
        except json.JSONDecodeError:
            # If not JSON, try to extract structured data from text
            # This is a fallback parser
            return {
                "summary": {
                    "title": self._extract_field(response, "Title", "Project Title"),
                    "donor": self._extract_field(response, "Donor", "Funding Organization"),
                    "deadline": self._extract_field(response, "Deadline", "Submission Deadline"),
                    "budget_range": self._extract_field(response, "Budget", "Budget Range"),
                    "key_focus": self._extract_field(response, "Focus", "Key Focus Area")
                },
                "extracted_data": {
                    "mandatory_requirements": self._extract_list(response, "Requirements", "Mandatory Requirements"),
                    "evaluation_criteria": self._extract_criteria(response),
                    "deliverables": self._extract_list(response, "Deliverables", "Expected Deliverables"),
                    "target_beneficiaries": self._extract_field(response, "Beneficiaries", "Target Group"),
                    "geographic_scope": self._extract_list(response, "Geographic", "Countries")
                },
                "ai_insights": {
                    "complexity_level": self._extract_field(response, "Complexity", "Difficulty"),
                    "estimated_effort": self._extract_field(response, "Effort", "Time Required"),
                    "key_challenges": self._extract_list(response, "Challenges", "Risks"),
                    "strengths_needed": self._extract_list(response, "Strengths", "Capabilities Required")
                }
            }
    
    def _extract_field(self, text: str, *markers: str) -> str:
        """Extract a field from unstructured text using markers"""
        for marker in markers:
            if marker in text:
                # Simple extraction - can be improved
                lines = text.split('\n')
                for i, line in enumerate(lines):
                    if marker in line and i + 1 < len(lines):
                        return lines[i + 1].strip()
        return ""
    
    def _extract_list(self, text: str, *markers: str) -> list:
        """Extract a list from unstructured text"""
        # Simplified list extraction
        return []
    
    def _extract_criteria(self, text: str) -> Dict[str, int]:
        """Extract evaluation criteria percentages"""
        return {
            "technical": 40,
            "organizational": 30,
            "budget": 30
        }
    
    async def _save_analysis_to_db(
        self,
        proposal_code: str,
        proposal_id: str,
        analysis: Dict[str, Any]
    ):
        """Save analysis results to proposal record in DynamoDB"""
        try:
            pk = f"PROPOSAL#{proposal_code}"
            
            # Update proposal with analysis results
            update_expression = "SET rfp_analysis = :analysis, updated_at = :updated, step1_part1_completed = :completed"
            expression_attribute_values = {
                ":analysis": analysis,
                ":updated": datetime.utcnow().isoformat(),
                ":completed": True
            }
            
            await db_client.update_item(
                pk=pk,
                sk="METADATA",
                update_expression=update_expression,
                expression_attribute_values=expression_attribute_values
            )
            
            print(f"Saved RFP analysis for {proposal_code}")
            
        except Exception as e:
            print(f"Error saving analysis to DB: {str(e)}")
            raise
    
    def _get_default_system_prompt(self) -> str:
        """Default system prompt for RFP analysis"""
        return """You are an expert proposal analyst specializing in international development and agricultural projects for the IGAD region.

Your task is to analyze Request for Proposals (RFPs) and extract key information in a structured format.

Provide your analysis as a valid JSON object with the following structure:
{
  "summary": {
    "title": "Project title",
    "donor": "Funding organization",
    "deadline": "Submission deadline",
    "budget_range": "Budget range",
    "key_focus": "Main focus area"
  },
  "extracted_data": {
    "mandatory_requirements": ["List of mandatory requirements"],
    "evaluation_criteria": {
      "technical": percentage,
      "organizational": percentage,
      "budget": percentage
    },
    "deliverables": ["Expected deliverables"],
    "target_beneficiaries": "Target beneficiary description",
    "geographic_scope": ["List of countries/regions"]
  },
  "ai_insights": {
    "complexity_level": "low/medium/high",
    "estimated_effort": "Estimated hours/days",
    "key_challenges": ["List of challenges"],
    "strengths_needed": ["Required organizational strengths"]
  }
}

Be thorough and extract all relevant information from the RFP document."""
    
    def _get_default_user_prompt(self) -> str:
        """Default user prompt template for RFP analysis"""
        return """Analyze the following RFP document and extract key information:

{rfp_text}

Provide a comprehensive analysis in JSON format covering:
1. Summary information (title, donor, deadline, budget, focus)
2. Extracted data (requirements, criteria, deliverables, beneficiaries, scope)
3. AI insights (complexity, effort, challenges, strengths needed)

Focus on actionable information that will help proposal writers understand if this RFP matches their organization's capabilities."""
