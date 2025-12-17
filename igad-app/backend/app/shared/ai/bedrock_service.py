"""
Bedrock AI Service

Provides Claude AI integration via AWS Bedrock for:
- Prompt preview and testing with variable substitution
- Synchronous Claude invocation for analysis tasks
- Dynamic configuration per tool or use case

Features:
- Configurable model selection (defaults to Claude Sonnet 4)
- Per-request parameter overrides (max_tokens, temperature)
- Long-running operation timeouts (10 minutes for complex analysis)
- Response sanitization and error handling
- Support for system prompts and message templates
"""

import json
import logging
import re
import time
import traceback
from typing import Any, Dict, List, Optional

from app.shared.schemas.prompt_model import PromptPreviewRequest, PromptPreviewResponse
from app.utils.aws_session import get_aws_session

logger = logging.getLogger(__name__)


class BedrockService:
    """
    AWS Bedrock client for Claude AI interactions.

    Manages Bedrock API calls with configurable timeouts and retry logic.
    Supports both prompt preview (async) and direct Claude invocation (sync).
    """

    def __init__(self) -> None:
        """
        Initialize Bedrock service with AWS session and configuration.

        Sets up:
        - 10-minute read timeout for long-running operations
        - 1-minute connection timeout
        - Automatic retry (3 attempts)
        - Claude Sonnet 4 as default model
        - Default parameters: 4000 max_tokens, 0.7 temperature

        Raises:
            Exception: If AWS session cannot be established
        """
        from botocore.config import Config

        session = get_aws_session()

        # Configure timeout for long-running AI operations
        # Increased from default 60s to 600s (10 minutes) for concept document generation
        config = Config(
            read_timeout=600,  # 10 minutes for reading response
            connect_timeout=60,  # 1 minute for initial connection
            retries={"max_attempts": 3},  # Retry up to 3 times
        )

        self.bedrock = session.client(
            "bedrock-runtime",
            region_name="us-east-1",
            config=config,
        )

        # Use cross-region inference profile for Claude Sonnet 4
        # This supports on-demand throughput
        self.model_id = "us.anthropic.claude-sonnet-4-20250514-v1:0"
        self.max_tokens = 4000
        self.temperature = 0.7

        logger.info(
            f"✅ BedrockService initialized with {config.read_timeout}s read timeout"
        )

    # ==================== HELPER METHODS ====================

    def _substitute_variables(self, template: str, variables: Dict[str, str]) -> str:
        """
        Substitute variables in template using {{variable}} format.

        Handles variable names with optional whitespace inside brackets.
        Variables not found in the template are safely ignored.

        Args:
            template: Template string with {{variable}} placeholders
            variables: Dict mapping variable names to replacement values

        Returns:
            Template with all variables substituted
        """
        if not variables:
            return template

        result = template
        for key, value in variables.items():
            # Replace {{key}} with value, handling optional whitespace
            pattern = r"\{\{\s*" + re.escape(key) + r"\s*\}\}"
            result = re.sub(pattern, str(value), result)

        return result

    def _build_messages(self, user_prompt: str) -> List[Dict[str, str]]:
        """
        Build messages array for Bedrock Claude API.

        Args:
            user_prompt: User message content

        Returns:
            List with single user message dict for Claude API
        """
        return [{"role": "user", "content": user_prompt}]

    def _build_request_body(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        max_tokens: int,
        temperature: float,
    ) -> Dict[str, Any]:
        """
        Build request body for Bedrock Claude invocation.

        Args:
            system_prompt: System instructions for Claude
            messages: Message array with user/assistant conversation
            max_tokens: Maximum tokens in response
            temperature: Temperature for response randomness (0-1)

        Returns:
            Complete request body dict for Bedrock API
        """
        return {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system_prompt,
            "messages": messages,
        }

    def _sanitize_output(self, output: str) -> str:
        """
        Sanitize output for security.

        Removes potentially sensitive information:
        - Long alphanumeric sequences (potential API keys)
        - Email addresses
        - Other PII if needed

        Args:
            output: Raw output from Claude

        Returns:
            Sanitized output with sensitive info redacted
        """
        # Remove potential API keys or tokens (20+ alphanumeric chars)
        output = re.sub(r"[A-Za-z0-9]{20,}", "[REDACTED]", output)

        # Remove email addresses
        output = re.sub(
            r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
            "[EMAIL]",
            output,
        )

        return output

    def _extract_response_content(
        self, response_body: Dict[str, Any]
    ) -> tuple[str, int]:
        """
        Extract content and token count from Bedrock response.

        Args:
            response_body: Parsed JSON response from Bedrock API

        Returns:
            Tuple of (output_text, tokens_used)
        """
        # Extract content with proper validation
        output = "No response generated"
        if "content" in response_body and response_body["content"]:
            content = response_body["content"]
            # Validate that content is a list with at least one element
            if isinstance(content, list) and len(content) > 0:
                first_item = content[0]
                # Validate that the first item has a "text" key
                if isinstance(first_item, dict) and "text" in first_item:
                    output = first_item["text"]

        # Extract token usage
        tokens_used = response_body.get("usage", {}).get("output_tokens", 0)

        return output, tokens_used

    # ==================== PROMPT PREVIEW ====================

    async def preview_prompt(
        self, request: PromptPreviewRequest
    ) -> PromptPreviewResponse:
        """
        Generate prompt preview using Claude AI.

        Substitutes variables in template, applies context constraints,
        and returns a sample response with metrics.

        Args:
            request: PromptPreviewRequest with template, variables, and context

        Returns:
            PromptPreviewResponse with output, tokens_used, and processing_time

        Note:
            Returns error response on failure (does not raise exceptions)
        """
        start_time = time.time()

        try:
            # Substitute variables in user prompt template
            user_prompt = self._substitute_variables(
                request.user_prompt_template, request.variables or {}
            )

            # Build request body
            messages = self._build_messages(user_prompt)
            system_prompt = request.system_prompt

            # Add context constraints if provided
            if request.context:
                if request.context.constraints:
                    system_prompt += f"\n\nConstraints: {request.context.constraints}"
                if request.context.guardrails:
                    system_prompt += f"\n\nGuardrails: {request.context.guardrails}"

            body = self._build_request_body(
                system_prompt, messages, self.max_tokens, self.temperature
            )

            logger.info(f"📡 Calling Bedrock preview with model {self.model_id}")

            # Call Bedrock
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )

            # Parse response
            response_body = json.loads(response["body"].read())
            output, tokens_used = self._extract_response_content(response_body)

            # Calculate metrics
            processing_time = time.time() - start_time

            logger.info(
                f"✅ Preview completed in {processing_time:.2f}s, {tokens_used} tokens"
            )

            return PromptPreviewResponse(
                output=output,
                tokens_used=tokens_used,
                processing_time=processing_time,
            )

        except Exception as e:
            logger.error(f"❌ Error in Bedrock preview: {e}")
            processing_time = time.time() - start_time

            # Return error response (don't raise)
            return PromptPreviewResponse(
                output=f"Error generating preview: {str(e)}",
                tokens_used=0,
                processing_time=processing_time,
            )

    # ==================== CLAUDE INVOCATION ====================

    def invoke_claude(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        model_id: Optional[str] = None,
    ) -> str:
        """
        Synchronous Claude invocation for analysis tasks.

        Uses dynamic parameter configuration:
        - Per-request parameters override instance defaults
        - Enables tool-specific configurations without recreating service

        Args:
            system_prompt: System instructions for Claude
            user_prompt: User message/prompt
            max_tokens: Max tokens in response (defaults to instance max_tokens)
            temperature: Response temperature/randomness (defaults to instance temperature)
            model_id: Model ID to use (defaults to instance model_id)

        Returns:
            Raw text response from Claude

        Raises:
            Exception: If Bedrock invocation fails
        """
        try:
            # Use provided values or fall back to instance defaults
            actual_max_tokens = (
                max_tokens if max_tokens is not None else self.max_tokens
            )
            actual_temperature = (
                temperature if temperature is not None else self.temperature
            )
            actual_model_id = model_id if model_id is not None else self.model_id

            logger.info(
                f"📡 Invoking Claude: max_tokens={actual_max_tokens}, "
                f"temperature={actual_temperature}, model={actual_model_id}"
            )

            # Build messages and request body
            messages = self._build_messages(user_prompt)
            body = self._build_request_body(
                system_prompt, messages, actual_max_tokens, actual_temperature
            )

            # Call Bedrock
            response = self.bedrock.invoke_model(
                modelId=actual_model_id,
                body=json.dumps(body),
                contentType="application/json",
                accept="application/json",
            )

            # Parse and extract response
            response_body = json.loads(response["body"].read())
            output, tokens_used = self._extract_response_content(response_body)

            logger.info(f"✅ Claude invocation completed, {tokens_used} tokens used")

            return output

        except Exception as e:
            logger.error(f"❌ Error invoking Claude: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
