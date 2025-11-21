"""
Concept Document Generator Service
Generates updated concept document based on RFP analysis and user selections
"""

import json
import logging
from typing import Dict, Any
import boto3
from boto3.dynamodb.conditions import Attr

from .bedrock_service import BedrockService

logger = logging.getLogger(__name__)


class ConceptDocumentGenerator:
    """Generate updated concept document using Bedrock AI"""
    
    def __init__(self):
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = 'igad-testing-main-table'
    
    def generate_document(
        self,
        proposal_code: str,
        rfp_analysis: Dict[str, Any],
        concept_evaluation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate concept document using Bedrock AI
        
        Args:
            proposal_code: Proposal code for logging
            rfp_analysis: Complete RFP analysis from Step 1
            concept_evaluation: User selections + comments from Step 2
        
        Returns:
            Dict with generated document sections
        """
        try:
            logger.info(f"Generating concept document for proposal: {proposal_code}")
            
            # 1. Get prompt from DynamoDB
            prompt_parts = self._get_prompt_template()
            
            if not prompt_parts:
                raise ValueError("Prompt not found in DynamoDB")
            
            # 2. Prepare context for AI
            context = self._prepare_context(rfp_analysis, concept_evaluation)
            
            # 3. Inject context into prompt
            user_prompt = self._inject_context(prompt_parts['user_prompt'], context)
            final_prompt = f"{user_prompt}\n\n{prompt_parts['output_format']}"
            
            # 4. Call Bedrock AI
            logger.info("Calling Bedrock AI for concept generation...")
            response = self.bedrock.invoke_claude(
                system_prompt=prompt_parts['system_prompt'],
                user_prompt=final_prompt,
                max_tokens=8000,
                temperature=0.7
            )
            
            # 5. Parse response
            document = self._parse_response(response)
            
            logger.info(f"Concept document generated successfully for {proposal_code}")
            return document
            
        except Exception as e:
            logger.error(f"Error generating concept document: {str(e)}")
            raise
    
    def _get_prompt_template(self) -> Dict[str, str]:
        """Get prompt from DynamoDB"""
        try:
            logger.info("Fetching prompt from DynamoDB...")
            table = self.dynamodb.Table(self.table_name)
            
            response = table.scan(
                FilterExpression=
                    Attr("is_active").eq(True) &
                    Attr("section").eq("proposal_writer") &
                    Attr("sub_section").eq("step-2") &
                    Attr("categories").contains("Concept Review")
            )
            
            items = response.get("Items", [])
            
            if not items:
                logger.warning("No prompt found, using fallback")
                return None
            
            prompt_item = items[0]
            logger.info(f"Found prompt: {prompt_item.get('name', 'Unnamed')}")
            
            return {
                'system_prompt': prompt_item.get("system_prompt", ""),
                'user_prompt': prompt_item.get("user_prompt_template", ""),
                'output_format': prompt_item.get("output_format", "")
            }
            
        except Exception as e:
            logger.error(f"Error fetching prompt: {str(e)}")
            return None
    
    def _prepare_context(
        self,
        rfp_analysis: Dict[str, Any],
        concept_evaluation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Prepare context dictionary for prompt injection"""
        
        # Send complete objects as JSON for the prompt
        return {
            'rfp_analysis': json.dumps(rfp_analysis, indent=2),
            'concept_evaluation': json.dumps(concept_evaluation, indent=2)
        }
    
    def _inject_context(self, template: str, context: Dict[str, Any]) -> str:
        """Inject context into prompt template"""
        prompt = template
        
        for key, value in context.items():
            placeholder = f"{{{key}}}"
            prompt = prompt.replace(placeholder, str(value))
        
        return prompt
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response into structured document"""
        import re
        
        try:
            # Try to parse as JSON first
            json_match = re.search(r'```json\s*(\{.*\})\s*```', response, re.DOTALL)
            if json_match:
                document = json.loads(json_match.group(1))
                return document
            
            # Try direct JSON parse
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                document = json.loads(json_match.group(0))
                return document
                
        except json.JSONDecodeError:
            pass
        
        # If not JSON, extract sections from markdown
        return {
            'generated_concept_document': response,
            'sections': self._extract_sections_from_text(response)
        }
    
    def _extract_sections_from_text(self, text: str) -> Dict[str, str]:
        """Extract sections from plain text response"""
        sections = {}
        current_section = None
        current_content = []
        
        for line in text.split('\n'):
            if line.startswith('## '):
                if current_section:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = line[3:].strip()
                current_content = []
            elif current_section:
                current_content.append(line)
        
        if current_section:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections


# Singleton instance
concept_generator = ConceptDocumentGenerator()
