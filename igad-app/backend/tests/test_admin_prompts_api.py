from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.handlers.admin_prompts import router
from app.shared.schemas.prompt_model import ProposalSection

# Create test app
app = FastAPI()
app.include_router(router)


class TestAdminPromptsAPI:
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)

    @pytest.fixture
    def mock_auth_header(self):
        """Mock authorization header"""
        return {"Authorization": "Bearer test-token"}

    @pytest.mark.unit
    def test_list_prompts_no_filters(self, client, mock_auth_header):
        """Test listing prompts without filters"""
        mock_response = {
            "prompts": [
                {
                    "id": "test-123",
                    "name": "Test Prompt",
                    "section": "problem_statement",
                    "version": 1,
                    "status": "published",
                    "tags": ["test"],
                    "system_prompt": "Test system prompt",
                    "user_prompt_template": "Test template",
                    "created_by": "test-user",
                    "updated_by": "test-user",
                    "created_at": "2025-01-01T12:00:00Z",
                    "updated_at": "2025-01-01T12:00:00Z",
                }
            ],
            "total": 1,
            "has_more": False,
        }

        with patch(
            "app.handlers.admin_prompts.prompt_service.list_prompts",
            new_callable=AsyncMock,
        ) as mock_list:
            mock_list.return_value = type("MockResponse", (), mock_response)()

            response = client.get("/admin/prompts/list", headers=mock_auth_header)

            assert response.status_code == 200
            data = response.json()
            assert data["total"] == 1
            assert len(data["prompts"]) == 1
            assert data["prompts"][0]["name"] == "Test Prompt"

    @pytest.mark.unit
    def test_list_prompts_with_filters(self, client, mock_auth_header):
        """Test listing prompts with filters"""
        with patch(
            "app.handlers.admin_prompts.prompt_service.list_prompts",
            new_callable=AsyncMock,
        ) as mock_list:
            mock_list.return_value = type(
                "MockResponse", (), {"prompts": [], "total": 0, "has_more": False}
            )()

            response = client.get(
                "/admin/prompts/list?section=problem_statement&status=published&tag=test&search=query",
                headers=mock_auth_header,
            )

            assert response.status_code == 200
            mock_list.assert_called_once()
            call_args = mock_list.call_args[1]
            assert call_args["section"] == ProposalSection.PROBLEM_STATEMENT
            assert call_args["is_active"] is True
            assert call_args["tag"] == "test"
            assert call_args["search"] == "query"

    @pytest.mark.unit
    def test_get_prompt_by_id(self, client, mock_auth_header, sample_prompt):
        """Test getting prompt by ID"""
        with patch(
            "app.handlers.admin_prompts.prompt_service.get_prompt",
            new_callable=AsyncMock,
        ) as mock_get:
            mock_get.return_value = sample_prompt

            response = client.get("/admin/prompts/test-123", headers=mock_auth_header)

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "test-prompt-123"
            assert data["name"] == "Test Prompt"

    @pytest.mark.unit
    def test_get_prompt_not_found(self, client, mock_auth_header):
        """Test getting non-existent prompt"""
        with patch(
            "app.handlers.admin_prompts.prompt_service.get_prompt",
            new_callable=AsyncMock,
        ) as mock_get:
            mock_get.return_value = None

            response = client.get(
                "/admin/prompts/non-existent", headers=mock_auth_header
            )

            assert response.status_code == 404
            assert "not found" in response.json()["detail"]

    @pytest.mark.unit
    def test_create_prompt_success(self, client, mock_auth_header, sample_prompt):
        """Test successful prompt creation"""
        create_data = {
            "name": "New Test Prompt",
            "section": "problem_statement",
            "system_prompt": "You are a test assistant",
            "user_prompt_template": "Help with {{topic}}",
        }

        with patch(
            "app.handlers.admin_prompts.prompt_service.create_prompt",
            new_callable=AsyncMock,
        ) as mock_create:
            mock_create.return_value = sample_prompt

            response = client.post(
                "/admin/prompts/create", json=create_data, headers=mock_auth_header
            )

            assert response.status_code == 201
            data = response.json()
            assert data["name"] == "Test Prompt"
            mock_create.assert_called_once()

    @pytest.mark.unit
    def test_create_prompt_validation_error(self, client, mock_auth_header):
        """Test prompt creation with validation errors"""
        invalid_data = {
            "name": "",  # Empty name should fail validation
            "section": "invalid_section",
            "system_prompt": "",
            "user_prompt_template": "",
        }

        response = client.post(
            "/admin/prompts/create", json=invalid_data, headers=mock_auth_header
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.unit
    def test_update_prompt_success(self, client, mock_auth_header, sample_prompt):
        """Test successful prompt update"""
        update_data = {"name": "Updated Test Prompt"}

        with patch(
            "app.handlers.admin_prompts.prompt_service.update_prompt",
            new_callable=AsyncMock,
        ) as mock_update:
            updated_prompt = sample_prompt.copy()
            updated_prompt.name = "Updated Test Prompt"
            mock_update.return_value = updated_prompt

            response = client.put(
                "/admin/prompts/test-123/update",
                json=update_data,
                headers=mock_auth_header,
            )

            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "Updated Test Prompt"

    @pytest.mark.unit
    @pytest.mark.unit
    def test_delete_prompt_success(self, client, mock_auth_header):
        """Test successful prompt deletion"""
        with patch(
            "app.handlers.admin_prompts.prompt_service.delete_prompt",
            new_callable=AsyncMock,
        ) as mock_delete:
            mock_delete.return_value = True

            response = client.delete(
                "/admin/prompts/test-123", headers=mock_auth_header
            )

            assert response.status_code == 200
            data = response.json()
            assert "deleted successfully" in data["message"]

    @pytest.mark.unit
    def test_preview_prompt_success(self, client, mock_auth_header):
        """Test successful prompt preview"""
        preview_data = {
            "system_prompt": "You are a helpful assistant",
            "user_prompt_template": "Help with {{topic}}",
            "variables": {"topic": "testing"},
        }

        mock_preview_response = type(
            "MockPreviewResponse",
            (),
            {
                "output": "This is a test response",
                "tokens_used": 25,
                "processing_time": 1.5,
            },
        )()

        with patch(
            "app.handlers.admin_prompts.bedrock_service.preview_prompt",
            new_callable=AsyncMock,
        ) as mock_preview:
            mock_preview.return_value = mock_preview_response

            response = client.post(
                "/admin/prompts/preview", json=preview_data, headers=mock_auth_header
            )

            assert response.status_code == 200
            data = response.json()
            assert data["output"] == "This is a test response"
            assert data["tokens_used"] == 25

    @pytest.mark.unit
    def test_get_prompt_by_section_success(self, client, sample_prompt):
        """Test getting prompt by section (runtime endpoint)"""
        published_prompt = sample_prompt.copy()
        published_prompt.is_active = True

        with patch(
            "app.handlers.admin_prompts.prompt_service.get_prompt_by_section",
            new_callable=AsyncMock,
        ) as mock_get:
            mock_get.return_value = published_prompt

            response = client.get("/admin/prompts/section/problem_statement")

            assert response.status_code == 200
            data = response.json()
            assert data["section"] == "problem_statement"

    @pytest.mark.unit
    def test_get_prompt_by_section_not_found(self, client):
        """Test getting prompt by section when none exists"""
        with patch(
            "app.handlers.admin_prompts.prompt_service.get_prompt_by_section",
            new_callable=AsyncMock,
        ) as mock_get:
            mock_get.return_value = None

            response = client.get("/admin/prompts/section/objectives")

            assert response.status_code == 404
            assert "No published prompt found" in response.json()["detail"]

    @pytest.mark.unit
    def test_unauthorized_request(self, client):
        """Test request without authorization header"""
        response = client.get("/admin/prompts/list")

        assert response.status_code == 403  # Forbidden without auth

    @pytest.mark.unit
    def test_internal_server_error_handling(self, client, mock_auth_header):
        """Test handling of internal server errors"""
        with patch(
            "app.handlers.admin_prompts.prompt_service.list_prompts",
            new_callable=AsyncMock,
        ) as mock_list:
            mock_list.side_effect = Exception("Database connection error")

            response = client.get("/admin/prompts/list", headers=mock_auth_header)

            assert response.status_code == 500
            assert "Failed to list prompts" in response.json()["detail"]
