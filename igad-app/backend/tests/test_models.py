from datetime import datetime

import pytest
from pydantic import ValidationError

from app.shared.schemas.prompt_model import (
    FewShotExample,
    Prompt,
    PromptContext,
    PromptCreate,
    PromptPreviewRequest,
    PromptUpdate,
    ProposalSection,
)


class TestPromptModels:
    @pytest.mark.unit
    def test_proposal_section_enum_values(self):
        """Test ProposalSection enum values"""
        assert ProposalSection.PROBLEM_STATEMENT == "problem_statement"
        assert ProposalSection.OBJECTIVES == "objectives"
        assert ProposalSection.METHODOLOGY == "methodology"
        assert len(ProposalSection) == 12  # Total number of sections

    @pytest.mark.unit
    def test_few_shot_example_model(self):
        """Test FewShotExample model validation"""
        example = FewShotExample(
            input="What is climate change?",
            output="Climate change refers to long-term shifts in global temperatures...",
        )

        assert example.input == "What is climate change?"
        assert "Climate change refers" in example.output

    @pytest.mark.unit
    def test_prompt_context_model(self):
        """Test PromptContext model with optional fields"""
        # Test with all fields
        context = PromptContext(
            persona="Expert analyst",
            tone="professional",
            sources=["WHO", "UNICEF"],
            constraints="Max 500 words",
            guardrails="No speculation",
        )

        assert context.persona == "Expert analyst"
        assert context.tone == "professional"
        assert len(context.sources) == 2

        # Test with minimal fields
        minimal_context = PromptContext()
        assert minimal_context.persona is None
        assert minimal_context.sources is None

    @pytest.mark.unit
    def test_prompt_create_validation_success(self):
        """Test successful PromptCreate validation"""
        prompt_data = PromptCreate(
            name="Test Prompt",
            section=ProposalSection.PROBLEM_STATEMENT,
            route="/test/route",
            tags=["test", "validation"],
            system_prompt="You are a helpful assistant.",
            user_prompt_template="Help me with {{topic}}",
            few_shot=[FewShotExample(input="Test input", output="Test output")],
            context=PromptContext(persona="Test persona"),
        )

        assert prompt_data.name == "Test Prompt"
        assert prompt_data.section == ProposalSection.PROBLEM_STATEMENT
        assert len(prompt_data.tags) == 2
        assert prompt_data.few_shot[0].input == "Test input"

    @pytest.mark.unit
    def test_prompt_create_validation_errors(self):
        """Test PromptCreate validation errors"""
        # Test empty name
        with pytest.raises(ValidationError) as exc_info:
            PromptCreate(
                name="",  # Empty name should fail
                section=ProposalSection.PROBLEM_STATEMENT,
                system_prompt="Test",
                user_prompt_template="Test",
            )

        assert "String should have at least 1 character" in str(exc_info.value)

        # Test missing required fields
        with pytest.raises(ValidationError) as exc_info:
            PromptCreate(
                name="Test Prompt"
                # Missing required fields
            )

        assert "Field required" in str(exc_info.value)

    @pytest.mark.unit
    def test_prompt_create_name_length_validation(self):
        """Test name length validation"""
        # Test maximum length (200 characters)
        long_name = "A" * 200
        prompt_data = PromptCreate(
            name=long_name,
            section=ProposalSection.PROBLEM_STATEMENT,
            system_prompt="Test",
            user_prompt_template="Test",
        )
        assert len(prompt_data.name) == 200

        # Test exceeding maximum length
        with pytest.raises(ValidationError) as exc_info:
            PromptCreate(
                name="A" * 201,  # Exceeds max length
                section=ProposalSection.PROBLEM_STATEMENT,
                system_prompt="Test",
                user_prompt_template="Test",
            )

        assert "String should have at most 200 characters" in str(exc_info.value)

    @pytest.mark.unit
    def test_prompt_update_optional_fields(self):
        """Test PromptUpdate with optional fields"""
        # Test with some fields
        update_data = PromptUpdate(name="Updated Name", tags=["updated", "test"])

        assert update_data.name == "Updated Name"
        assert update_data.section is None  # Not provided
        assert len(update_data.tags) == 2

        # Test with no fields (all optional)
        empty_update = PromptUpdate()
        assert empty_update.name is None
        assert empty_update.section is None

    @pytest.mark.unit
    def test_prompt_model_complete(self):
        """Test complete Prompt model"""
        now = datetime.now()

        prompt = Prompt(
            id="test-123",
            name="Complete Test Prompt",
            section=ProposalSection.OBJECTIVES,
            route="/test/objectives",
            tags=["complete", "test"],
            version=2,
            is_active=True,
            system_prompt="You are an expert in objectives.",
            user_prompt_template="Create objectives for {{project_type}} in {{region}}",
            few_shot=[
                FewShotExample(
                    input="Healthcare project in Kenya",
                    output="1. Improve maternal health outcomes...",
                )
            ],
            context=PromptContext(
                persona="Development expert",
                tone="professional",
                constraints="3-5 objectives maximum",
            ),
            created_by="admin@igad.org",
            updated_by="editor@igad.org",
            created_at=now,
            updated_at=now,
        )

        assert prompt.id == "test-123"
        assert prompt.version == 2
        assert prompt.is_active is True
        assert prompt.created_by == "admin@igad.org"
        assert prompt.updated_by == "editor@igad.org"
        assert len(prompt.few_shot) == 1

    @pytest.mark.unit
    def test_prompt_preview_request_validation(self):
        """Test PromptPreviewRequest validation"""
        # Test minimal valid request
        request = PromptPreviewRequest(
            system_prompt="You are helpful", user_prompt_template="Help with {{task}}"
        )

        assert request.variables is None
        assert request.context is None

        # Test complete request
        complete_request = PromptPreviewRequest(
            system_prompt="You are an expert",
            user_prompt_template="Analyze {{data}} for {{purpose}}",
            variables={"data": "survey results", "purpose": "insights"},
            context=PromptContext(tone="analytical"),
        )

        assert len(complete_request.variables) == 2
        assert complete_request.context.tone == "analytical"

    @pytest.mark.unit
    def test_prompt_preview_request_empty_prompts(self):
        """Test PromptPreviewRequest with empty prompts"""
        with pytest.raises(ValidationError) as exc_info:
            PromptPreviewRequest(
                system_prompt="", user_prompt_template="Test"  # Empty should fail
            )

        assert "String should have at least 1 character" in str(exc_info.value)

    @pytest.mark.unit
    def test_model_serialization(self):
        """Test model serialization to dict"""
        context = PromptContext(persona="Test persona", tone="professional")

        context_dict = context.dict(exclude_none=True)

        # Should only include non-None fields
        assert "persona" in context_dict
        assert "tone" in context_dict
        assert "sources" not in context_dict  # None field excluded
        assert "constraints" not in context_dict  # None field excluded

    @pytest.mark.unit
    def test_invalid_enum_values(self):
        """Test validation with invalid enum values"""
        with pytest.raises(ValidationError) as exc_info:
            PromptCreate(
                name="Test",
                section="invalid_section",  # Invalid enum value
                system_prompt="Test",
                user_prompt_template="Test",
            )

        assert "Input should be" in str(exc_info.value)
