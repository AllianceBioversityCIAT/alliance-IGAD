"""Unit tests for Prompt Router endpoints."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.prompts import router
from app.shared.schemas.prompt_model import Prompt, ProposalSection


@pytest.fixture
def app():
    """Create FastAPI app for testing."""
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_auth_middleware():
    """Mock authentication middleware."""
    with patch("app.routers.prompts.AuthMiddleware") as mock:
        mock_instance = Mock()
        mock_instance.verify_token.return_value = {
            "email": "user@test.com",
            "is_admin": False,
        }
        mock.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_prompt_service():
    """Mock Prompt service."""
    with patch("app.handlers.admin_prompts.PromptService") as mock:
        mock_instance = AsyncMock()
        mock.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def sample_prompt():
    """Sample prompt for testing."""
    return Prompt(
        id="test-prompt-id",
        title="Test Prompt",
        content="Test content for prompt",
        section=ProposalSection.EXECUTIVE_SUMMARY,
        route="/executive-summary",
        is_active=True,
        version=1,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
        created_by="user@test.com",
    )


class TestPromptRouter:
    """Test cases for prompt router endpoints."""

    def test_get_prompt_by_section_success(
        self, client, mock_auth_middleware, mock_prompt_service, sample_prompt
    ):
        """Test successful prompt retrieval by section."""
        mock_prompt_service.get_prompt_by_section.return_value = sample_prompt

        response = client.get(
            "/prompts/sections/executive_summary",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "test-prompt-id"
        assert data["title"] == "Test Prompt"
        assert data["section"] == "executive_summary"

    def test_get_prompt_by_section_not_found(
        self, client, mock_auth_middleware, mock_prompt_service
    ):
        """Test prompt by section not found."""
        mock_prompt_service.get_prompt_by_section.side_effect = Exception(
            "Prompt not found"
        )

        response = client.get(
            "/prompts/sections/nonexistent_section",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 404

    def test_get_prompt_by_section_unauthorized(self, client):
        """Test prompt retrieval without authorization."""
        response = client.get("/prompts/sections/executive_summary")

        assert response.status_code == 403

    def test_get_prompt_by_section_invalid_section(self, client, mock_auth_middleware):
        """Test prompt retrieval with invalid section."""
        response = client.get(
            "/prompts/sections/invalid_section_name",
            headers={"Authorization": "Bearer test-token"},
        )

        # Should return 422 for invalid enum value
        assert response.status_code == 422

    @pytest.mark.parametrize(
        "section",
        [
            "executive_summary",
            "project_description",
            "objectives",
            "methodology",
            "budget",
            "timeline",
            "team",
            "impact",
            "sustainability",
            "risk_management",
        ],
    )
    def test_valid_sections(
        self, client, mock_auth_middleware, mock_prompt_service, sample_prompt, section
    ):
        """Test all valid proposal sections."""
        mock_prompt_service.get_prompt_by_section.return_value = sample_prompt

        response = client.get(
            f"/prompts/sections/{section}",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200

    def test_get_prompt_by_section_server_error(
        self, client, mock_auth_middleware, mock_prompt_service
    ):
        """Test server error handling."""
        mock_prompt_service.get_prompt_by_section.side_effect = Exception(
            "Database connection error"
        )

        response = client.get(
            "/prompts/sections/executive_summary",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 500
