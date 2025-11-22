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
logger.setLevel(logging.INFO)  # Asegurar que INFO logs se muestren


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
            logger.info("=" * 80)
            logger.info("🚀 GENERATE_DOCUMENT CALLED")
            logger.info(f"📋 Proposal: {proposal_code}")
            logger.info(f"📦 concept_evaluation type: {type(concept_evaluation)}")
            logger.info(f"📦 concept_evaluation is None: {concept_evaluation is None}")
            if concept_evaluation:
                logger.info(f"📦 concept_evaluation keys: {list(concept_evaluation.keys()) if isinstance(concept_evaluation, dict) else 'NOT A DICT'}")
            logger.info("=" * 80)
            
            logger.info(f"Generating concept document for proposal: {proposal_code}")
            
            # 1. Get prompt from DynamoDB
            logger.info("🔍 Step 1: Getting prompt template from DynamoDB...")
            prompt_parts = self._get_prompt_template()
            
            if not prompt_parts:
                raise ValueError("Prompt not found in DynamoDB")
            
            logger.info("✅ Prompt template retrieved successfully")
            
            # 2. Prepare context for AI
            logger.info("🔍 Step 2: Preparing context (filtering sections)...")
            context = self._prepare_context(rfp_analysis, concept_evaluation)
            
            # 3. Inject context into prompt
            user_prompt = self._inject_context(prompt_parts['user_prompt'], context)
            
            # 4. Add critical instruction about selected sections
            filtered_eval = self._filter_selected_sections(concept_evaluation)
            selected_sections = filtered_eval.get('concept_analysis', {}).get('sections_needing_elaboration', [])
            section_titles = [s.get('section', s.get('title', 'Unknown')) for s in selected_sections]
            
            critical_instruction = f"""
            
🚨 **CRITICAL INSTRUCTION - READ CAREFULLY:**

The user has selected ONLY the following {len(section_titles)} section(s) to be generated:

{chr(10).join(f"  • {title}" for title in section_titles)}

**YOU MUST:**
1. Generate ONLY these {len(section_titles)} section(s) - NO MORE, NO LESS
2. Do NOT generate any sections beyond this list
3. Each section should include the user's comments and suggestions from the Concept Evaluation

**IGNORE any default section lists** - use ONLY the sections listed above.
"""
            
            final_prompt = f"{user_prompt}\n\n{critical_instruction}\n\n{prompt_parts['output_format']}"
            
            # Log the complete prompt for debugging
            logger.info("=" * 80)
            logger.info("📝 SYSTEM PROMPT:")
            logger.info(prompt_parts['system_prompt'])
            logger.info("=" * 80)
            logger.info("📝 USER PROMPT:")
            logger.info(final_prompt)
            logger.info("=" * 80)
            
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
        
        logger.info("=" * 80)
        logger.info("📦 RECEIVED concept_evaluation payload:")
        logger.info(json.dumps(concept_evaluation, indent=2))
        logger.info("=" * 80)
        
        # Filter concept_evaluation to only include selected sections
        filtered_evaluation = self._filter_selected_sections(concept_evaluation)
        
        logger.info("=" * 80)
        logger.info("✅ FILTERED concept_evaluation:")
        logger.info(json.dumps(filtered_evaluation, indent=2))
        logger.info("=" * 80)
        
        # Send complete objects as JSON for the prompt
        return {
            'rfp_analysis': json.dumps(rfp_analysis, indent=2),
            'concept_evaluation': json.dumps(filtered_evaluation, indent=2)
        }
    
    def _filter_selected_sections(self, concept_evaluation: Dict[str, Any]) -> Dict[str, Any]:
        """Filter concept evaluation to only include selected sections with user comments"""
        try:
            # Get the concept_analysis object (handle nested structure)
            concept_analysis = concept_evaluation.get('concept_analysis', {})
            # Check if there's a nested concept_analysis (common in DynamoDB structure)
            if 'concept_analysis' in concept_analysis:
                concept_analysis = concept_analysis['concept_analysis']
            sections_needing_elaboration = concept_analysis.get('sections_needing_elaboration', [])
            
            logger.info(f"📊 Total sections received: {len(sections_needing_elaboration)}")
            
            # Log each section's selected status
            for i, section in enumerate(sections_needing_elaboration):
                section_title = section.get('section', section.get('title', 'Unknown'))
                is_selected = section.get('selected', False)
                logger.info(f"   Section {i+1}: '{section_title}' - selected={is_selected}")
            
            # Filter to only selected sections
            selected_sections = [
                section for section in sections_needing_elaboration
                if section.get('selected', False)
            ]
            
            logger.info(f"✅ Filtered {len(selected_sections)} selected sections from {len(sections_needing_elaboration)} total")
            
            # Log selected section titles
            for section in selected_sections:
                section_title = section.get('section', section.get('title', 'Unknown'))
                logger.info(f"   ✓ Selected: '{section_title}'")
            
            # Rebuild the structure with only selected sections
            filtered_analysis = {
                **concept_analysis,
                'sections_needing_elaboration': selected_sections
            }
            
            return {
                'concept_analysis': filtered_analysis,
                'status': concept_evaluation.get('status', 'completed')
            }
            
        except Exception as e:
            logger.error(f"Error filtering sections: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            # Return original if filtering fails
            return concept_evaluation
    
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
