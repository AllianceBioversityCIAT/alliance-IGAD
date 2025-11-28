"""
Concept Document Generator Service
Generates updated concept document based on RFP analysis and user selections
"""

import json
import logging
from typing import Dict, Any
from datetime import datetime
import boto3
from boto3.dynamodb.conditions import Attr

from app.shared.ai.bedrock_service import BedrockService

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
        concept_evaluation: Dict[str, Any],
        proposal_outline: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generate concept document using Bedrock AI
        
        Args:
            proposal_code: Proposal code for logging
            rfp_analysis: Complete RFP analysis from Step 1
            concept_evaluation: User selections + comments from Step 2
            proposal_outline: Proposal outline from Step 2 (optional, will be loaded if not provided)
        
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
            logger.info(f"📦 proposal_outline provided: {proposal_outline is not None}")
            logger.info("=" * 80)
            
            logger.info(f"Generating concept document for proposal: {proposal_code}")
            
            # 1. Get prompt from DynamoDB
            logger.info("🔍 Step 1: Getting prompt template from DynamoDB...")
            prompt_parts = self._get_prompt_template()
            
            if not prompt_parts:
                raise ValueError("Prompt not found in DynamoDB")
            
            logger.info("✅ Prompt template retrieved successfully")
            
            # 2. Load proposal outline if not provided
            if not proposal_outline:
                logger.info("🔍 Step 2: Loading proposal outline from DynamoDB...")
                proposal_outline = self._load_proposal_outline(proposal_code)
                if proposal_outline:
                    logger.info(f"✅ Loaded proposal outline with {len(proposal_outline.get('proposal_outline', []))} sections")
                else:
                    logger.warning("⚠️ No proposal outline found - will proceed without it")
            
            # 3. Prepare context for AI (with outline enrichment)
            logger.info("🔍 Step 3: Preparing context (enriching sections with outline data)...")
            context = self._prepare_context(rfp_analysis, concept_evaluation, proposal_outline)
            
            # 4. Inject context into prompt
            user_prompt = self._inject_context(prompt_parts['user_prompt'], context)
            
            # 5. Build final prompt (context is already filtered and enriched)
            final_prompt = f"{user_prompt}\n\n{prompt_parts['output_format']}"
            
            # Log the complete prompt for debugging
            logger.info("=" * 80)
            logger.info("📝 SYSTEM PROMPT:")
            logger.info(prompt_parts['system_prompt'])
            logger.info("=" * 80)
            logger.info("📝 USER PROMPT (with context):")
            logger.info(final_prompt)
            logger.info("=" * 80)
            
            # 6. Call Bedrock AI with progress logging
            logger.info("=" * 80)
            logger.info("📡 Step 2/3: Calling Bedrock AI (Claude 3.7 Sonnet)...")
            logger.info(f"📏 Prompt size: ~{len(final_prompt)} characters")
            logger.info(f"📏 System prompt size: ~{len(prompt_parts['system_prompt'])} characters")
            logger.info(f"📊 Total context: ~{len(final_prompt) + len(prompt_parts['system_prompt'])} characters")
            logger.info("⏳ This may take 3-5 minutes for 4 sections, up to 10 minutes for large requests...")
            logger.info("=" * 80)
            
            bedrock_start = datetime.utcnow()
            
            response = self.bedrock.invoke_claude(
                system_prompt=prompt_parts['system_prompt'],
                user_prompt=final_prompt,
                max_tokens=8000,
                temperature=0.7
            )
            
            bedrock_end = datetime.utcnow()
            bedrock_time = (bedrock_end - bedrock_start).total_seconds()
            
            logger.info("=" * 80)
            logger.info(f"✅ Bedrock response received in {bedrock_time:.1f} seconds ({bedrock_time/60:.1f} minutes)")
            logger.info(f"📏 Response size: ~{len(response)} characters")
            logger.info("=" * 80)
            
            # 7. Parse response
            logger.info("📊 Step 3/3: Parsing and validating response...")
            document = self._parse_response(response)
            
            logger.info(f"✅ Concept document generated successfully for {proposal_code}")
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
    
    def _load_proposal_outline(self, proposal_code: str) -> Dict[str, Any]:
        """Load proposal outline from DynamoDB for the given proposal"""
        try:
            table = self.dynamodb.Table(self.table_name)
            
            # Query for the proposal using proposal code
            response = table.scan(
                FilterExpression=Attr('proposalCode').eq(proposal_code)
            )
            
            items = response.get('Items', [])
            
            if not items:
                logger.warning(f"No proposal found with code: {proposal_code}")
                return None
            
            proposal = items[0]
            
            # Check for proposal_outline in the proposal
            proposal_outline = proposal.get('proposal_outline')
            
            if not proposal_outline:
                logger.warning(f"No proposal_outline found in proposal: {proposal_code}")
                return None
            
            logger.info(f"✅ Loaded proposal outline from DynamoDB for: {proposal_code}")
            return proposal_outline
            
        except Exception as e:
            logger.error(f"Error loading proposal outline: {str(e)}")
            return None
    
    def _prepare_context(
        self,
        rfp_analysis: Dict[str, Any],
        concept_evaluation: Dict[str, Any],
        proposal_outline: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Prepare context dictionary for prompt injection
        Enriches selected sections with proposal outline data
        """
        
        logger.info("=" * 80)
        logger.info("📦 RECEIVED concept_evaluation payload:")
        logger.info(json.dumps(concept_evaluation, indent=2))
        logger.info("=" * 80)
        
        # Filter concept_evaluation to only include selected sections
        filtered_evaluation = self._filter_selected_sections(concept_evaluation)
        
        # Enrich sections with proposal outline data
        if proposal_outline:
            logger.info("🔄 Enriching selected sections with proposal outline data...")
            enriched_evaluation = self._enrich_with_outline(filtered_evaluation, proposal_outline)
        else:
            logger.warning("⚠️ No proposal outline available - proceeding without enrichment")
            enriched_evaluation = filtered_evaluation
        
        logger.info("=" * 80)
        logger.info("✅ ENRICHED concept_evaluation:")
        logger.info(json.dumps(enriched_evaluation, indent=2))
        logger.info("=" * 80)
        
        # Send complete objects as JSON for the prompt
        return {
            'rfp_analysis': json.dumps(rfp_analysis, indent=2),
            'concept_evaluation': json.dumps(enriched_evaluation, indent=2)
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
    
    def _enrich_with_outline(
        self,
        filtered_evaluation: Dict[str, Any],
        proposal_outline: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Enrich selected sections with data from proposal outline
        Adds: recommended_word_count, purpose, content_guidance, guiding_questions
        OPTIMIZED: Only processes sections that are selected
        """
        try:
            # Get outline sections
            outline_sections = proposal_outline.get('proposal_outline', [])
            
            if not outline_sections:
                logger.warning("⚠️ No sections found in proposal_outline")
                return filtered_evaluation
            
            # Get selected sections from filtered evaluation
            concept_analysis = filtered_evaluation.get('concept_analysis', {})
            selected_sections = concept_analysis.get('sections_needing_elaboration', [])
            
            if not selected_sections:
                logger.warning("⚠️ No selected sections to enrich")
                return filtered_evaluation
            
            # Get titles of selected sections
            selected_titles = [s.get('section', s.get('title', '')) for s in selected_sections]
            logger.info(f"📊 Selected sections to enrich: {selected_titles}")
            
            # Create lookup dict ONLY for selected sections (optimization)
            outline_lookup = {}
            for outline_section in outline_sections:
                section_title = outline_section.get('section_title', '')
                # Only add to lookup if it's a selected section
                if section_title in selected_titles:
                    outline_lookup[section_title] = outline_section
            
            logger.info(f"📊 Created outline lookup with {len(outline_lookup)} sections (from {len(outline_sections)} total)")
            logger.info(f"📋 Matched outline sections: {list(outline_lookup.keys())}")
            
            # Enrich each selected section with outline data
            enriched_sections = []
            for section in selected_sections:
                section_title = section.get('section', section.get('title', ''))
                
                # Try to find matching outline section
                outline_data = outline_lookup.get(section_title)
                
                if outline_data:
                    logger.info(f"✅ Enriching: {section_title}")
                    
                    # Optimize content_guidance: summarize if too long
                    content_guidance = outline_data.get('content_guidance', '')
                    if len(content_guidance) > 1000:
                        logger.info(f"⚠️ content_guidance for '{section_title}' is {len(content_guidance)} chars - using summary")
                        # Keep first 500 chars as summary (or extract key points)
                        content_guidance = self._summarize_guidance(content_guidance)
                    
                    # Merge section with outline data
                    enriched_section = {
                        **section,  # Keep original data (issue, priority, suggestions, selected, user_comment)
                        'recommended_word_count': outline_data.get('recommended_word_count', ''),
                        'purpose': outline_data.get('purpose', ''),
                        'content_guidance': content_guidance,  # Optimized
                        'guiding_questions': outline_data.get('guiding_questions', [])
                    }
                    enriched_sections.append(enriched_section)
                else:
                    logger.warning(f"⚠️ No outline data found for: {section_title}")
                    # Keep original section without enrichment
                    enriched_sections.append(section)
            
            logger.info(f"✅ Enriched {len(enriched_sections)} sections with outline data")
            
            # Calculate total size reduction
            original_outline_size = len(str(outline_sections))
            filtered_outline_size = len(str(list(outline_lookup.values())))
            reduction_pct = ((original_outline_size - filtered_outline_size) / original_outline_size * 100) if original_outline_size > 0 else 0
            logger.info(f"📉 Outline size reduced by {reduction_pct:.1f}% ({original_outline_size} → {filtered_outline_size} chars)")
            
            # Update the filtered evaluation with enriched sections
            enriched_analysis = {
                **concept_analysis,
                'sections_needing_elaboration': enriched_sections
            }
            
            return {
                'concept_analysis': enriched_analysis,
                'status': filtered_evaluation.get('status', 'completed')
            }
            
        except Exception as e:
            logger.error(f"Error enriching sections with outline: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            # Return original if enrichment fails
            return filtered_evaluation
    
    def _summarize_guidance(self, content_guidance: str) -> str:
        """
        Summarize long content_guidance to reduce prompt size
        Extracts key points and bullet points
        """
        try:
            # If content has bullet points, extract them
            if '•' in content_guidance or '-' in content_guidance or '*' in content_guidance:
                lines = content_guidance.split('\n')
                bullet_points = [line.strip() for line in lines if line.strip().startswith(('•', '-', '*'))]
                if bullet_points:
                    summary = '\n'.join(bullet_points[:8])  # Keep first 8 bullet points
                    logger.info(f"   Extracted {len(bullet_points[:8])} bullet points from guidance")
                    return summary
            
            # Otherwise, keep first 500 characters
            summary = content_guidance[:500] + '...' if len(content_guidance) > 500 else content_guidance
            logger.info(f"   Truncated guidance to 500 chars")
            return summary
            
        except Exception as e:
            logger.error(f"Error summarizing guidance: {e}")
            # Fallback: return first 300 chars
            return content_guidance[:300]
    
    def _inject_context(self, template: str, context: Dict[str, Any]) -> str:
        """Inject context into prompt template"""
        prompt = template
        
        for key, value in context.items():
            placeholder = f"{{{key}}}"
            prompt = prompt.replace(placeholder, str(value))
        
        return prompt
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse AI response into structured document
        Handles multiple response formats:
        1. NEW format: { concept_document: { generated_concept_document, sections } }
        2. OLD format: { generated_concept_document, sections }
        3. Fallback: Plain text/markdown extraction
        """
        import re
        
        parsed = None
        
        try:
            # Try to parse as JSON first (with ```json wrapper)
            json_match = re.search(r'```json\s*(\{.*\})\s*```', response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(1))
                logger.info("✅ Parsed JSON from ```json``` wrapper")
            else:
                # Try direct JSON parse (without wrapper)
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    logger.info("✅ Parsed JSON directly")
                    
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parsing failed: {str(e)}")
            parsed = None
        
        # Handle parsed JSON responses
        if parsed:
            # Format 1: NEW format with concept_document wrapper
            # { "concept_document": { "generated_concept_document": "...", "sections": {...} } }
            if 'concept_document' in parsed:
                logger.info("📦 Detected NEW format with concept_document wrapper")
                concept_doc = parsed['concept_document']
                
                return {
                    'generated_concept_document': concept_doc.get('generated_concept_document', ''),
                    'sections': concept_doc.get('sections', {})
                }
            
            # Format 2: OLD format with direct fields
            # { "generated_concept_document": "...", "sections": {...} }
            elif 'generated_concept_document' in parsed:
                logger.info("📦 Detected OLD format with direct fields")
                return {
                    'generated_concept_document': parsed.get('generated_concept_document', ''),
                    'sections': parsed.get('sections', {})
                }
            
            # Format 3: Unknown JSON structure - try to extract what we can
            else:
                logger.warning("⚠️ Unknown JSON structure, attempting extraction")
                # If it's a valid JSON but unknown structure, convert to string and extract
                response = json.dumps(parsed, indent=2)
        
        # Format 4: Fallback - extract sections from plain text/markdown
        logger.info("📝 Using text extraction fallback")
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
