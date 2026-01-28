"""Unit tests for Prompt Manager functionality."""

from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from app.services.prompt_service import PromptService
from app.shared.schemas.prompt_model import (
    Comment,
    CommentCreate,
    PromptCreate,
    PromptUpdate,
    ProposalSection,
)


@pytest.mark.prompt_management
class TestPromptService:
    """Test cases for PromptService."""

    @pytest.fixture
    def prompt_service(self):
        """Create a PromptService instance for testing."""
        with patch("boto3.resource"):
            service = PromptService()
            service.table = Mock()
            return service

    @pytest.fixture
    def sample_prompt_data(self):
        """Sample prompt data for testing."""
        return {
            "PK": "prompt#test-id",
            "SK": "v1",
            "title": "Test Prompt",
            "content": "Test content",
            "section": "executive_summary",
            "route": "/test",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "version": 1,
        }

    def test_generate_prompt_id(self, prompt_service):
        """Test prompt ID generation."""
        prompt_id = prompt_service._generate_prompt_id()

        assert isinstance(prompt_id, str)
        assert len(prompt_id) > 0

    def test_get_current_timestamp(self, prompt_service):
        """Test timestamp generation."""
        timestamp = prompt_service._get_current_timestamp()

        assert isinstance(timestamp, str)
        # Should be in ISO format
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

    def test_prompt_to_item_conversion(self, prompt_service):
        """Test prompt to DynamoDB item conversion."""
        prompt_create = PromptCreate(
            title="Test Prompt",
            content="Test content",
            section=ProposalSection.EXECUTIVE_SUMMARY,
            route="/test",
        )

        item = prompt_service._prompt_to_item(prompt_create, "test-id", 1)

        assert item["PK"] == "prompt#test-id"
        assert item["SK"] == "v1"
        assert item["title"] == "Test Prompt"
        assert item["section"] == "executive_summary"

    def test_item_to_prompt_conversion(self, prompt_service, sample_prompt_data):
        """Test DynamoDB item to prompt conversion."""
        prompt = prompt_service._item_to_prompt(sample_prompt_data)

        assert prompt.id == "test-id"
        assert prompt.title == "Test Prompt"
        assert prompt.section == ProposalSection.EXECUTIVE_SUMMARY
        assert prompt.version == 1

    @pytest.mark.asyncio
    async def test_create_prompt_success(self, prompt_service):
        """Test successful prompt creation."""
        prompt_create = PromptCreate(
            title="New Prompt",
            content="New content",
            section=ProposalSection.EXECUTIVE_SUMMARY,
            route="/new",
        )

        # Mock table operations
        prompt_service.table.put_item.return_value = {}

        with patch.object(prompt_service, "_generate_prompt_id", return_value="new-id"):
            result = await prompt_service.create_prompt(prompt_create, "user123")

        assert result.id == "new-id"
        assert result.title == "New Prompt"
        prompt_service.table.put_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_prompt_success(self, prompt_service, sample_prompt_data):
        """Test successful prompt retrieval."""
        prompt_service.table.get_item.return_value = {"Item": sample_prompt_data}

        result = await prompt_service.get_prompt("test-id", 1)

        assert result.id == "test-id"
        assert result.title == "Test Prompt"
        prompt_service.table.get_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_prompt_not_found(self, prompt_service):
        """Test prompt not found scenario."""
        prompt_service.table.get_item.return_value = {}

        with pytest.raises(Exception) as exc_info:
            await prompt_service.get_prompt("nonexistent", 1)

        assert "not found" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_update_prompt_success(self, prompt_service, sample_prompt_data):
        """Test successful prompt update."""
        prompt_update = PromptUpdate(title="Updated Prompt", content="Updated content")

        # Mock existing prompt
        prompt_service.table.get_item.return_value = {"Item": sample_prompt_data}
        prompt_service.table.put_item.return_value = {}

        result = await prompt_service.update_prompt("test-id", prompt_update, "user123")

        assert result.title == "Updated Prompt"
        prompt_service.table.put_item.assert_called()

    @pytest.mark.asyncio
    async def test_delete_prompt_success(self, prompt_service, sample_prompt_data):
        """Test successful prompt deletion."""
        prompt_service.table.get_item.return_value = {"Item": sample_prompt_data}
        prompt_service.table.delete_item.return_value = {}

        result = await prompt_service.delete_prompt("test-id", 1)

        assert result["success"] is True
        prompt_service.table.delete_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_prompts_success(self, prompt_service, sample_prompt_data):
        """Test successful prompt listing."""
        mock_response = {"Items": [sample_prompt_data], "Count": 1}
        prompt_service.table.scan.return_value = mock_response

        result = await prompt_service.list_prompts()

        assert len(result.prompts) == 1
        assert result.prompts[0].id == "test-id"
        assert result.total == 1

    @pytest.mark.asyncio
    async def test_list_prompts_with_filters(self, prompt_service, sample_prompt_data):
        """Test prompt listing with filters."""
        mock_response = {"Items": [sample_prompt_data], "Count": 1}
        prompt_service.table.scan.return_value = mock_response

        result = await prompt_service.list_prompts(
            section=ProposalSection.EXECUTIVE_SUMMARY, is_active=True
        )

        assert len(result.prompts) == 1
        prompt_service.table.scan.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_prompt_by_section_success(
        self, prompt_service, sample_prompt_data
    ):
        """Test successful prompt retrieval by section."""
        mock_response = {"Items": [sample_prompt_data]}
        prompt_service.table.scan.return_value = mock_response

        result = await prompt_service.get_prompt_by_section(
            ProposalSection.EXECUTIVE_SUMMARY
        )

        assert result.id == "test-id"
        assert result.section == ProposalSection.EXECUTIVE_SUMMARY

    @pytest.mark.asyncio
    async def test_get_prompt_by_section_not_found(self, prompt_service):
        """Test prompt by section not found."""
        prompt_service.table.scan.return_value = {"Items": []}

        with pytest.raises(Exception) as exc_info:
            await prompt_service.get_prompt_by_section(
                ProposalSection.EXECUTIVE_SUMMARY
            )

        assert "not found" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_toggle_active_success(self, prompt_service, sample_prompt_data):
        """Test successful prompt activation toggle."""
        prompt_service.table.get_item.return_value = {"Item": sample_prompt_data}
        prompt_service.table.update_item.return_value = {}

        result = await prompt_service.toggle_active("test-id")

        assert result["success"] is True
        prompt_service.table.update_item.assert_called()

    @pytest.mark.asyncio
    async def test_add_comment_success(self, prompt_service, sample_prompt_data):
        """Test successful comment addition."""
        comment_data = CommentCreate(content="Test comment", section="general")

        prompt_service.table.get_item.return_value = {"Item": sample_prompt_data}
        prompt_service.table.put_item.return_value = {}

        with patch("uuid.uuid4", return_value=Mock(hex="comment-id")):
            result = await prompt_service.add_comment(
                "test-id", comment_data, "user123", "Test User"
            )

        assert isinstance(result, Comment)
        assert result.content == "Test comment"
        prompt_service.table.put_item.assert_called()

    @pytest.mark.asyncio
    async def test_get_comments_success(self, prompt_service):
        """Test successful comment retrieval."""
        mock_comment = {
            "PK": "prompt#test-id",
            "SK": "comment#comment-id",
            "content": "Test comment",
            "user_id": "user123",
            "user_name": "Test User",
            "created_at": "2024-01-01T00:00:00Z",
        }

        mock_response = {"Items": [mock_comment]}
        prompt_service.table.query.return_value = mock_response

        result = await prompt_service.get_comments("test-id")

        assert len(result) == 1
        assert result[0].content == "Test comment"

    @pytest.mark.asyncio
    async def test_record_change_success(self, prompt_service):
        """Test successful change recording."""
        prompt_service.table.put_item.return_value = {}

        with patch("uuid.uuid4", return_value=Mock(hex="change-id")):
            await prompt_service.record_change(
                "test-id", "user123", "UPDATE", {"title": "Updated"}
            )

        prompt_service.table.put_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_prompt_history_success(self, prompt_service):
        """Test successful prompt history retrieval."""
        mock_change = {
            "PK": "prompt#test-id",
            "SK": "change#change-id",
            "user_id": "user123",
            "action": "UPDATE",
            "changes": {"title": "Updated"},
            "timestamp": "2024-01-01T00:00:00Z",
        }

        mock_response = {"Items": [mock_change]}
        prompt_service.table.query.return_value = mock_response

        result = await prompt_service.get_prompt_history("test-id")

        assert len(result.changes) == 1
        assert result.changes[0].action == "UPDATE"

    @pytest.mark.asyncio
    async def test_update_comments_count_success(
        self, prompt_service, sample_prompt_data
    ):
        """Test successful comments count update."""
        prompt_service.table.get_item.return_value = {"Item": sample_prompt_data}
        prompt_service.table.update_item.return_value = {}

        await prompt_service.update_comments_count("test-id", 5)

        prompt_service.table.update_item.assert_called_once()

    def test_find_active_prompt_by_section_route(self, prompt_service):
        """Test finding active prompt by section and route."""
        items = [
            {
                "section": "executive_summary",
                "route": "/test",
                "is_active": True,
                "title": "Active Prompt",
            },
            {
                "section": "executive_summary",
                "route": "/test",
                "is_active": False,
                "title": "Inactive Prompt",
            },
        ]

        result = prompt_service._find_active_prompt_by_section_route(
            items, "executive_summary", "/test"
        )

        assert result["title"] == "Active Prompt"
        assert result["is_active"] is True
