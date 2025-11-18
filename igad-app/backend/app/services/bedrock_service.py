import json
import logging
import re
import time
from typing import Dict

from app.models.prompt_model import PromptPreviewRequest, PromptPreviewResponse
from app.utils.aws_session import get_aws_session

logger = logging.getLogger(__name__)


class BedrockService:
    def __init__(self):
        session = get_aws_session()
        self.bedrock = session.client("bedrock-runtime", region_name="us-east-1")
        # Use cross-region inference profile for Claude 3.7 Sonnet (Claude Sonnet 4)
        # This supports on-demand throughput
        self.model_id = "us.anthropic.claude-3-7-sonnet-20250219-v1:0"
        self.max_tokens = 4000
        self.temperature = 0.7

    def _substitute_variables(self, template: str, variables: Dict[str, str]) -> str:
        """Substitute variables in template using {{variable}} format"""
        if not variables:
            return template

        result = template
        for key, value in variables.items():
            # Replace {{key}} with value
            pattern = r"\{\{\s*" + re.escape(key) + r"\s*\}\}"
            result = re.sub(pattern, str(value), result)

        return result

    def _build_messages(self, system_prompt: str, user_prompt: str) -> list:
        """Build messages array for Claude API"""
        return [{"role": "user", "content": user_prompt}]

    async def preview_prompt(
        self, request: PromptPreviewRequest
    ) -> PromptPreviewResponse:
        """Generate preview using Bedrock Claude model"""
        start_time = time.time()

        try:
            # Substitute variables in user prompt template
            user_prompt = self._substitute_variables(
                request.user_prompt_template, request.variables or {}
            )

            # Build request body
            messages = self._build_messages(request.system_prompt, user_prompt)

            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "system": request.system_prompt,
                "messages": messages,
            }

            # Add context constraints if provided
            if request.context:
                if request.context.constraints:
                    body["system"] += f"\n\nConstraints: {request.context.constraints}"
                if request.context.guardrails:
                    body["system"] += f"\n\nGuardrails: {request.context.guardrails}"

            logger.info(f"Calling Bedrock with model {self.model_id}")

            # Call Bedrock
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )

            # Parse response
            response_body = json.loads(response["body"].read())

            # Extract content
            if "content" in response_body and response_body["content"]:
                output = response_body["content"][0]["text"]
            else:
                output = "No response generated"

            # Calculate metrics
            processing_time = time.time() - start_time
            tokens_used = response_body.get("usage", {}).get("output_tokens", 0)

            logger.info(
                f"Bedrock preview completed in {processing_time:.2f}s, {tokens_used} tokens"
            )

            return PromptPreviewResponse(
                output=output, tokens_used=tokens_used, processing_time=processing_time
            )

        except Exception as e:
            logger.error(f"Error in Bedrock preview: {e}")
            processing_time = time.time() - start_time

            # Return error response
            return PromptPreviewResponse(
                output=f"Error generating preview: {str(e)}",
                tokens_used=0,
                processing_time=processing_time,
            )

    def _sanitize_output(self, output: str) -> str:
        """Sanitize output for security"""
        # Remove any potential sensitive information
        # This is a basic implementation - enhance based on requirements

        # Remove potential API keys or tokens
        output = re.sub(r"[A-Za-z0-9]{20,}", "[REDACTED]", output)

        # Remove email addresses
        output = re.sub(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL]", output
        )

        return output
    
    def invoke_claude(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 4000,
        temperature: float = 0.7
    ) -> str:
        """
        Simple Claude invocation for analysis tasks
        Returns the raw text response
        """
        try:
            messages = [{"role": "user", "content": user_prompt}]
            
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": system_prompt,
                "messages": messages,
            }
            
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )
            
            response_body = json.loads(response["body"].read())
            
            if "content" in response_body and response_body["content"]:
                return response_body["content"][0]["text"]
            else:
                return ""
                
        except Exception as e:
            logger.error(f"Error invoking Claude: {e}")
            raise
