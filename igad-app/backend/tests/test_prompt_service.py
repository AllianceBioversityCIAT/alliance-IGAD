from unittest.mock import Mock, patch

import pytest

from app.services.prompt_service import PromptService
from app.shared.schemas.prompt_model import Prompt, PromptUpdate, ProposalSection


class TestPromptService:
    @pytest.fixture
    def prompt_service(self, mock_dynamodb_table):
        """Create PromptService with mocked DynamoDB table"""
        with patch("app.services.prompt_service.boto3.resource") as mock_resource:
            mock_dynamodb = Mock()
            mock_dynamodb.Table.return_value = mock_dynamodb_table
            mock_resource.return_value = mock_dynamodb

            service = PromptService()
            service.table = mock_dynamodb_table
            return service

    @pytest.mark.unit
    def test_generate_prompt_id(self, prompt_service):
        """Test prompt ID generation"""
        prompt_id = prompt_service._generate_prompt_id()
        assert isinstance(prompt_id, str)
        assert len(prompt_id) > 0

    @pytest.mark.unit
    def test_get_current_timestamp(self, prompt_service):
        """Test timestamp generation"""
        timestamp = prompt_service._get_current_timestamp()
        assert isinstance(timestamp, str)
        assert timestamp.endswith("Z")

    @pytest.mark.unit
    def test_prompt_to_item_conversion(self, prompt_service, sample_prompt):
        """Test converting Prompt model to DynamoDB item"""
        item = prompt_service._prompt_to_item(sample_prompt)

        assert item["PK"] == f"prompt#{sample_prompt.id}"
        assert item["SK"] == f"version#{sample_prompt.version}"
        assert item["name"] == sample_prompt.name
        assert item["section"] == sample_prompt.section.value
        assert item["status"] == sample_prompt.status.value
        assert item["tags"] == sample_prompt.tags

    @pytest.mark.unit
    def test_item_to_prompt_conversion(self, prompt_service, sample_dynamodb_item):
        """Test converting DynamoDB item to Prompt model"""
        prompt = prompt_service._item_to_prompt(sample_dynamodb_item)

        assert prompt.id == sample_dynamodb_item["id"]
        assert prompt.name == sample_dynamodb_item["name"]
        assert prompt.section == ProposalSection(sample_dynamodb_item["section"])
        assert prompt.is_active == sample_dynamodb_item.get("is_active", True)
        assert prompt.version == sample_dynamodb_item["version"]

    @pytest.mark.unit
    async def test_create_prompt_success(
        self, prompt_service, sample_prompt_create, mock_dynamodb_table
    ):
        """Test successful prompt creation"""
        mock_dynamodb_table.put_item.return_value = {}

        result = await prompt_service.create_prompt(sample_prompt_create, "test-user")

        assert isinstance(result, Prompt)
        assert result.name == sample_prompt_create.name
        assert result.section == sample_prompt_create.section
        assert result.version == 1
        assert result.is_active is True
        assert result.created_by == "test-user"
        mock_dynamodb_table.put_item.assert_called_once()

    @pytest.mark.unit
    async def test_get_prompt_by_id_and_version(
        self, prompt_service, sample_dynamodb_item, mock_dynamodb_table
    ):
        """Test getting prompt by ID and version"""
        mock_dynamodb_table.get_item.return_value = {"Item": sample_dynamodb_item}

        result = await prompt_service.get_prompt("test-prompt-123", 1)

        assert isinstance(result, Prompt)
        assert result.id == "test-prompt-123"
        assert result.version == 1
        mock_dynamodb_table.get_item.assert_called_once_with(
            Key={"PK": "prompt#test-prompt-123", "SK": "version#1"}
        )

    @pytest.mark.unit
    async def test_get_prompt_latest_version(
        self, prompt_service, sample_dynamodb_item, mock_dynamodb_table
    ):
        """Test getting latest version of prompt"""
        mock_dynamodb_table.query.return_value = {"Items": [sample_dynamodb_item]}

        result = await prompt_service.get_prompt("test-prompt-123")

        assert isinstance(result, Prompt)
        assert result.id == "test-prompt-123"
        mock_dynamodb_table.query.assert_called_once()

    @pytest.mark.unit
    async def test_get_prompt_not_found(self, prompt_service, mock_dynamodb_table):
        """Test getting non-existent prompt"""
        mock_dynamodb_table.get_item.return_value = {}

        result = await prompt_service.get_prompt("non-existent", 1)

        assert result is None

    @pytest.mark.unit
    async def test_delete_prompt_specific_version(
        self, prompt_service, mock_dynamodb_table
    ):
        """Test deleting specific prompt version"""
        mock_dynamodb_table.delete_item.return_value = {}

        result = await prompt_service.delete_prompt("test-prompt-123", 1)

        assert result is True
        mock_dynamodb_table.delete_item.assert_called_once_with(
            Key={"PK": "prompt#test-prompt-123", "SK": "version#1"}
        )

    @pytest.mark.unit
    async def test_delete_prompt_all_versions(
        self, prompt_service, sample_dynamodb_item, mock_dynamodb_table
    ):
        """Test deleting all versions of a prompt"""
        mock_dynamodb_table.query.return_value = {"Items": [sample_dynamodb_item]}
        mock_dynamodb_table.delete_item.return_value = {}

        result = await prompt_service.delete_prompt("test-prompt-123")

        assert result is True
        mock_dynamodb_table.query.assert_called_once()
        mock_dynamodb_table.delete_item.assert_called_once()

    @pytest.mark.unit
    async def test_list_prompts_no_filters(
        self, prompt_service, sample_dynamodb_item, mock_dynamodb_table
    ):
        """Test listing prompts without filters"""
        mock_dynamodb_table.scan.return_value = {"Items": [sample_dynamodb_item]}

        result = await prompt_service.list_prompts()

        assert result.total == 1
        assert len(result.prompts) == 1
        assert result.prompts[0].id == "test-prompt-123"
        assert result.has_more is False

    @pytest.mark.unit
    async def test_list_prompts_with_filters(
        self, prompt_service, sample_dynamodb_item, mock_dynamodb_table
    ):
        """Test listing prompts with filters"""
        mock_dynamodb_table.scan.return_value = {"Items": [sample_dynamodb_item]}

        result = await prompt_service.list_prompts(
            section=ProposalSection.PROBLEM_STATEMENT,
            is_active=True,
            tag="test",
            search="Test",
        )

        assert result.total == 1
        assert len(result.prompts) == 1

    @pytest.mark.unit
    async def test_get_prompt_by_section_success(
        self, prompt_service, sample_dynamodb_item, mock_dynamodb_table
    ):
        """Test getting prompt by section"""
        sample_dynamodb_item["status"] = "published"
        mock_dynamodb_table.scan.return_value = {"Items": [sample_dynamodb_item]}

        result = await prompt_service.get_prompt_by_section(
            ProposalSection.PROBLEM_STATEMENT
        )

        assert isinstance(result, Prompt)
        assert result.section == ProposalSection.PROBLEM_STATEMENT

    @pytest.mark.unit
    async def test_get_prompt_by_section_not_found(
        self, prompt_service, mock_dynamodb_table
    ):
        """Test getting prompt by section when none exists"""
        mock_dynamodb_table.scan.return_value = {"Items": []}

        result = await prompt_service.get_prompt_by_section(ProposalSection.OBJECTIVES)

        assert result is None

    @pytest.mark.unit
    async def test_update_prompt_draft_version(
        self, prompt_service, sample_prompt, mock_dynamodb_table
    ):
        """Test updating a draft prompt (edits in place)"""
        update_data = PromptUpdate(name="Updated Test Prompt")

        with patch.object(prompt_service, "get_prompt", return_value=sample_prompt):
            mock_dynamodb_table.delete_item.return_value = {}
            mock_dynamodb_table.put_item.return_value = {}

            result = await prompt_service.update_prompt(
                "test-prompt-123", update_data, "test-user"
            )

            assert result.name == "Updated Test Prompt"
            assert result.version == 1  # Same version for draft
            mock_dynamodb_table.delete_item.assert_called_once()  # Delete old draft
            mock_dynamodb_table.put_item.assert_called_once()  # Create updated draft

    @pytest.mark.unit
    async def test_update_prompt_success(
        self, prompt_service, sample_prompt, mock_dynamodb_table
    ):
        """Test updating a prompt"""
        update_data = PromptUpdate(name="Updated Test Prompt")

        with patch.object(prompt_service, "get_prompt", return_value=sample_prompt):
            mock_dynamodb_table.put_item.return_value = {}

            result = await prompt_service.update_prompt(
                "test-prompt-123", update_data, "test-user"
            )

            assert result.name == "Updated Test Prompt"
            assert result.version == 1  # Same version
            mock_dynamodb_table.put_item.assert_called_once()

    @pytest.mark.unit
    async def test_update_prompt_not_found(self, prompt_service, mock_dynamodb_table):
        """Test updating non-existent prompt"""
        update_data = PromptUpdate(name="Updated Test Prompt")

        with patch.object(prompt_service, "get_prompt", return_value=None):
            with pytest.raises(ValueError, match="not found"):
                await prompt_service.update_prompt(
                    "non-existent", update_data, "test-user"
                )
