import json
from unittest.mock import Mock, patch

import pytest

from app.services.bedrock_service import BedrockService
from app.shared.schemas.prompt_model import PromptContext, PromptPreviewRequest


class TestBedrockService:
    @pytest.fixture
    def bedrock_service(self, mock_bedrock_client):
        """Create BedrockService with mocked Bedrock client"""
        with patch(
            "app.services.bedrock_service.boto3.client",
            return_value=mock_bedrock_client,
        ):
            return BedrockService()

    @pytest.mark.unit
    def test_substitute_variables_simple(self, bedrock_service):
        """Test simple variable substitution"""
        template = "Hello {{name}}, welcome to {{place}}!"
        variables = {"name": "John", "place": "IGAD"}

        result = bedrock_service._substitute_variables(template, variables)

        assert result == "Hello John, welcome to IGAD!"

    @pytest.mark.unit
    def test_substitute_variables_with_spaces(self, bedrock_service):
        """Test variable substitution with spaces in template"""
        template = "Topic: {{ topic }}, Region: {{region}}"
        variables = {"topic": "Food Security", "region": "East Africa"}

        result = bedrock_service._substitute_variables(template, variables)

        assert result == "Topic: Food Security, Region: East Africa"

    @pytest.mark.unit
    def test_substitute_variables_no_variables(self, bedrock_service):
        """Test template without variables"""
        template = "This is a static template"
        variables = {"unused": "value"}

        result = bedrock_service._substitute_variables(template, variables)

        assert result == "This is a static template"

    @pytest.mark.unit
    def test_substitute_variables_empty_dict(self, bedrock_service):
        """Test with empty variables dict"""
        template = "Hello {{name}}"
        variables = {}

        result = bedrock_service._substitute_variables(template, variables)

        assert result == "Hello {{name}}"  # Unchanged

    @pytest.mark.unit
    def test_build_messages(self, bedrock_service):
        """Test building messages for Claude API"""
        system_prompt = "You are a helpful assistant"
        user_prompt = "Help me with this task"

        messages = bedrock_service._build_messages(system_prompt, user_prompt)

        assert len(messages) == 1
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == user_prompt

    @pytest.mark.unit
    async def test_preview_prompt_success(self, bedrock_service, mock_bedrock_client):
        """Test successful prompt preview"""
        # Mock Bedrock response
        mock_response_body = {
            "content": [{"text": "This is a generated response"}],
            "usage": {"output_tokens": 25},
        }
        mock_response = {"body": Mock()}
        mock_response["body"].read.return_value = json.dumps(
            mock_response_body
        ).encode()
        mock_bedrock_client.invoke_model.return_value = mock_response

        request = PromptPreviewRequest(
            system_prompt="You are a helpful assistant",
            user_prompt_template="Help me with {{topic}}",
            variables={"topic": "testing"},
        )

        result = await bedrock_service.preview_prompt(request)

        assert result.output == "This is a generated response"
        assert result.tokens_used == 25
        assert result.processing_time > 0
        mock_bedrock_client.invoke_model.assert_called_once()

    @pytest.mark.unit
    async def test_preview_prompt_with_context(
        self, bedrock_service, mock_bedrock_client
    ):
        """Test prompt preview with context constraints"""
        mock_response_body = {
            "content": [{"text": "Response with constraints"}],
            "usage": {"output_tokens": 15},
        }
        mock_response = {"body": Mock()}
        mock_response["body"].read.return_value = json.dumps(
            mock_response_body
        ).encode()
        mock_bedrock_client.invoke_model.return_value = mock_response

        context = PromptContext(
            constraints="Keep it under 100 words", guardrails="No speculation"
        )

        request = PromptPreviewRequest(
            system_prompt="You are a helpful assistant",
            user_prompt_template="Explain {{concept}}",
            variables={"concept": "AI"},
            context=context,
        )

        result = await bedrock_service.preview_prompt(request)

        assert result.output == "Response with constraints"

        # Verify that constraints were added to system prompt
        call_args = mock_bedrock_client.invoke_model.call_args
        body_str = call_args[1]["body"]
        body_dict = json.loads(body_str)

        assert "Constraints: Keep it under 100 words" in body_dict["system"]
        assert "Guardrails: No speculation" in body_dict["system"]

    @pytest.mark.unit
    async def test_preview_prompt_bedrock_error(
        self, bedrock_service, mock_bedrock_client
    ):
        """Test handling Bedrock API errors"""
        mock_bedrock_client.invoke_model.side_effect = Exception("Bedrock API Error")

        request = PromptPreviewRequest(
            system_prompt="You are a helpful assistant",
            user_prompt_template="Help me with testing",
        )

        result = await bedrock_service.preview_prompt(request)

        assert "Error generating preview" in result.output
        assert result.tokens_used == 0
        assert result.processing_time > 0

    @pytest.mark.unit
    async def test_preview_prompt_empty_response(
        self, bedrock_service, mock_bedrock_client
    ):
        """Test handling empty Bedrock response"""
        mock_response_body = {"content": []}
        mock_response = {"body": Mock()}
        mock_response["body"].read.return_value = json.dumps(
            mock_response_body
        ).encode()
        mock_bedrock_client.invoke_model.return_value = mock_response

        request = PromptPreviewRequest(
            system_prompt="You are a helpful assistant",
            user_prompt_template="Generate something",
        )

        result = await bedrock_service.preview_prompt(request)

        assert result.output == "No response generated"
        assert result.tokens_used == 0

    @pytest.mark.unit
    def test_sanitize_output_api_keys(self, bedrock_service):
        """Test sanitizing API keys from output"""
        output = "Your API key is sk-1234567890abcdef1234567890abcdef and token xyz123456789012345678901234567890"

        result = bedrock_service._sanitize_output(output)

        assert "sk-1234567890abcdef1234567890abcdef" not in result
        assert "xyz123456789012345678901234567890" not in result
        assert "[REDACTED]" in result

    @pytest.mark.unit
    def test_sanitize_output_emails(self, bedrock_service):
        """Test sanitizing email addresses from output"""
        output = "Contact us at admin@example.com or support@igad.org for help"

        result = bedrock_service._sanitize_output(output)

        assert "admin@example.com" not in result
        assert "support@igad.org" not in result
        assert "[EMAIL]" in result

    @pytest.mark.unit
    async def test_preview_prompt_variable_substitution(
        self, bedrock_service, mock_bedrock_client
    ):
        """Test that variables are properly substituted before sending to Bedrock"""
        mock_response_body = {
            "content": [{"text": "Response about climate change"}],
            "usage": {"output_tokens": 20},
        }
        mock_response = {"body": Mock()}
        mock_response["body"].read.return_value = json.dumps(
            mock_response_body
        ).encode()
        mock_bedrock_client.invoke_model.return_value = mock_response

        request = PromptPreviewRequest(
            system_prompt="You are an expert on {{domain}}",
            user_prompt_template="Explain {{topic}} in {{region}}",
            variables={
                "domain": "environmental science",
                "topic": "climate change",
                "region": "East Africa",
            },
        )

        await bedrock_service.preview_prompt(request)

        # Verify the substituted content was sent to Bedrock
        call_args = mock_bedrock_client.invoke_model.call_args
        body_str = call_args[1]["body"]
        body_dict = json.loads(body_str)

        # Check system prompt substitution
        assert "environmental science" in body_dict["system"]

        # Check user message substitution
        user_message = body_dict["messages"][0]["content"]
        assert "climate change" in user_message
        assert "East Africa" in user_message
        assert "{{" not in user_message  # No unsubstituted variables
