"""Unit tests for Admin Router endpoints."""

from unittest.mock import Mock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.admin import router


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
    with patch("app.routers.admin.AuthMiddleware") as mock:
        mock_instance = Mock()
        mock_instance.verify_token.return_value = {
            "email": "admin@test.com",
            "is_admin": True,
        }
        mock.return_value = mock_instance
        yield mock_instance


@pytest.fixture
def mock_cognito_service():
    """Mock Cognito service."""
    with patch("app.routers.admin.CognitoUserManagementService") as mock:
        mock_instance = Mock()
        mock.return_value = mock_instance
        yield mock_instance


class TestAdminRouter:
    """Test cases for admin router endpoints."""

    def test_list_users_success(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test successful user listing."""
        # Mock service response
        mock_cognito_service.list_users.return_value = {
            "success": True,
            "users": [
                {
                    "username": "user1@test.com",
                    "email": "user1@test.com",
                    "status": "CONFIRMED",
                    "enabled": True,
                }
            ],
        }

        response = client.get(
            "/admin/users", headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["users"]) == 1

    def test_list_users_unauthorized(self, client):
        """Test user listing without authorization."""
        response = client.get("/admin/users")

        assert response.status_code == 403

    def test_create_user_success(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test successful user creation."""
        mock_cognito_service.create_user.return_value = {
            "success": True,
            "message": "User created successfully",
        }

        user_data = {
            "email": "newuser@test.com",
            "temporary_password": "TempPass123!",
            "groups": ["users"],
        }

        response = client.post(
            "/admin/users",
            json=user_data,
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_create_user_invalid_data(self, client, mock_auth_middleware):
        """Test user creation with invalid data."""
        invalid_data = {
            "email": "invalid-email",  # Invalid email format
            "temporary_password": "123",  # Too short
        }

        response = client.post(
            "/admin/users",
            json=invalid_data,
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 422  # Validation error

    def test_delete_user_success(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test successful user deletion."""
        mock_cognito_service.delete_user.return_value = {
            "success": True,
            "message": "User deleted successfully",
        }

        response = client.delete(
            "/admin/users/user@test.com", headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_delete_user_not_found(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test user deletion when user not found."""
        mock_cognito_service.delete_user.return_value = {
            "success": False,
            "error": "UserNotFoundException",
        }

        response = client.delete(
            "/admin/users/nonexistent@test.com",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False

    def test_toggle_user_enable(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test user enable/disable toggle."""
        mock_cognito_service.enable_user.return_value = {
            "success": True,
            "message": "User enabled successfully",
        }

        response = client.put(
            "/admin/users/user@test.com/toggle",
            json={"enabled": True},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_list_groups_success(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test successful group listing."""
        mock_cognito_service.list_groups.return_value = {
            "success": True,
            "groups": [
                {"name": "admin", "description": "Admin users"},
                {"name": "users", "description": "Regular users"},
            ],
        }

        response = client.get(
            "/admin/groups", headers={"Authorization": "Bearer test-token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["groups"]) == 2

    def test_add_user_to_group_success(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test successful user group assignment."""
        mock_cognito_service.add_user_to_group.return_value = {
            "success": True,
            "message": "User added to group successfully",
        }

        response = client.post(
            "/admin/users/user@test.com/groups/admin",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_remove_user_from_group_success(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test successful user group removal."""
        mock_cognito_service.remove_user_from_group.return_value = {
            "success": True,
            "message": "User removed from group successfully",
        }

        response = client.delete(
            "/admin/users/user@test.com/groups/admin",
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_reset_user_password_success(
        self, client, mock_auth_middleware, mock_cognito_service
    ):
        """Test successful password reset."""
        mock_cognito_service.reset_user_password.return_value = {
            "success": True,
            "message": "Password reset successfully",
        }

        response = client.post(
            "/admin/users/user@test.com/reset-password",
            json={"new_password": "NewPass123!"},
            headers={"Authorization": "Bearer test-token"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_admin_access_required(self, client):
        """Test that admin access is required for all endpoints."""
        with patch("app.routers.admin.AuthMiddleware") as mock_auth:
            mock_instance = Mock()
            mock_instance.verify_token.return_value = {
                "email": "user@test.com",
                "is_admin": False,  # Not admin
            }
            mock_auth.return_value = mock_instance

            response = client.get(
                "/admin/users", headers={"Authorization": "Bearer test-token"}
            )

            assert response.status_code == 403
