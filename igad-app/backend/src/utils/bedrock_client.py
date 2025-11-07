import json
import boto3
import time
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger(__name__)


class BedrockClient:
    def __init__(self, region_name: str = "us-east-1"):
        self.client = boto3.client("bedrock-runtime", region_name=region_name)
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        
    def generate_content(
        self,
        prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate content using Claude 3 Sonnet"""
        try:
            start_time = time.time()
            
            # Prepare the request body
            messages = [{"role": "user", "content": prompt}]
            
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages
            }
            
            if system_prompt:
                body["system"] = system_prompt
            
            # Make the API call
            response = self.client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json"
            )
            
            # Parse response
            response_body = json.loads(response["body"].read())
            generation_time = time.time() - start_time
            
            return {
                "content": response_body["content"][0]["text"],
                "tokens_used": response_body["usage"]["output_tokens"],
                "generation_time": generation_time,
                "model_id": self.model_id
            }
            
        except ClientError as e:
            logger.error(f"Bedrock API error: {e}")
            raise Exception(f"AI generation failed: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in content generation: {e}")
            raise Exception(f"Content generation error: {str(e)}")
    
    def generate_proposal_section(
        self,
        section_title: str,
        context_data: Dict[str, Any],
        template_content: str = "",
        max_tokens: int = 1500
    ) -> Dict[str, Any]:
        """Generate content for a specific proposal section"""
        
        system_prompt = """You are an expert proposal writer specializing in agricultural development, 
        climate resilience, and regional cooperation projects in the IGAD region (Horn of Africa). 
        Generate professional, well-structured content that is specific, actionable, and appropriate 
        for funding proposals to international donors."""
        
        # Build context-aware prompt
        prompt_parts = [
            f"Generate content for the '{section_title}' section of a proposal.",
            f"Context information: {json.dumps(context_data, indent=2)}",
        ]
        
        if template_content:
            prompt_parts.append(f"Template guidance: {template_content}")
        
        prompt_parts.extend([
            "Requirements:",
            "- Write in professional, formal tone suitable for international donors",
            "- Include specific details relevant to the IGAD region",
            "- Use clear, concise language with proper structure",
            "- Ensure content is actionable and measurable where appropriate",
            "- Length should be appropriate for the section (typically 200-500 words)",
            "",
            "Generate the content now:"
        ])
        
        prompt = "\n".join(prompt_parts)
        
        return self.generate_content(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=0.7
        )
    
    def improve_content(
        self,
        existing_content: str,
        improvement_type: str = "general",
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Improve existing proposal content"""
        
        system_prompt = """You are an expert editor specializing in proposal writing for 
        international development projects. Improve the provided content while maintaining 
        its core message and structure."""
        
        improvement_prompts = {
            "clarity": "Improve the clarity and readability of this content",
            "professional": "Make this content more professional and formal",
            "specific": "Make this content more specific and detailed",
            "concise": "Make this content more concise while preserving key information",
            "general": "Improve the overall quality of this content"
        }
        
        prompt = f"""
        {improvement_prompts.get(improvement_type, improvement_prompts['general'])}:

        Original content:
        {existing_content}

        Context: {json.dumps(context or {}, indent=2)}

        Provide the improved version:
        """
        
        return self.generate_content(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=2000,
            temperature=0.5
        )
    
    def generate_executive_summary(
        self,
        proposal_sections: Dict[str, str],
        max_tokens: int = 800
    ) -> Dict[str, Any]:
        """Generate executive summary from proposal sections"""
        
        system_prompt = """You are an expert proposal writer. Create a compelling executive 
        summary that captures the key points from all proposal sections in a concise, 
        persuasive manner suitable for busy decision-makers."""
        
        sections_text = "\n\n".join([
            f"**{title}:**\n{content}" 
            for title, content in proposal_sections.items()
        ])
        
        prompt = f"""
        Create an executive summary for this proposal based on the following sections:

        {sections_text}

        Requirements for the executive summary:
        - Maximum 300-400 words
        - Compelling opening that captures attention
        - Clear problem statement and solution
        - Key benefits and expected outcomes
        - Strong call to action
        - Professional tone suitable for international donors

        Generate the executive summary:
        """
        
        return self.generate_content(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=max_tokens,
            temperature=0.6
        )
