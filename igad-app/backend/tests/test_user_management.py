"""Unit tests for User Management functionality."""

from unittest.mock import Mock, patch

import pytest
from botocore.exceptions import ClientError

from app.services.cognito_service import CognitoUserManagementService


@pytest.mark.user_management
class TestCognitoUserManagementService:
    """Test cases for CognitoUserManagementService."""

    @pytest.fixture
    def cognito_service(self):
        """Create a CognitoUserManagementService instance for testing."""
        with patch("boto3.Session"):
            service = CognitoUserManagementService(
                user_pool_id="test-pool-id", client_id="test-client-id"
            )
            service.cognito_client = Mock()
            return service

    def test_list_users_success(self, cognito_service):
        """Test successful user listing."""
        # Mock response
        mock_response = {
            "Users": [
                {
                    "Username": "user1@example.com",
                    "Attributes": [
                        {"Name": "email", "Value": "user1@example.com"},
                        {"Name": "email_verified", "Value": "true"},
                    ],
                    "UserStatus": "CONFIRMED",
                    "Enabled": True,
                }
            ]
        }
        cognito_service.cognito_client.list_users.return_value = mock_response

        result = cognito_service.list_users()

        assert result["success"] is True
        assert len(result["users"]) == 1
        assert result["users"][0]["email"] == "user1@example.com"
        cognito_service.cognito_client.list_users.assert_called_once()

    def test_list_users_failure(self, cognito_service):
        """Test user listing failure."""
        cognito_service.cognito_client.list_users.side_effect = ClientError(
            {"Error": {"Code": "InvalidParameterException"}}, "ListUsers"
        )

        result = cognito_service.list_users()

        assert result["success"] is False
        assert "error" in result

    def test_get_user_success(self, cognito_service):
        """Test successful user retrieval."""
        mock_response = {
            "Username": "user1@example.com",
            "UserAttributes": [
                {"Name": "email", "Value": "user1@example.com"},
                {"Name": "email_verified", "Value": "true"},
            ],
            "UserStatus": "CONFIRMED",
            "Enabled": True,
        }
        cognito_service.cognito_client.admin_get_user.return_value = mock_response

        result = cognito_service.get_user("user1@example.com")

        assert result["success"] is True
        assert result["user"]["email"] == "user1@example.com"

    def test_get_user_not_found(self, cognito_service):
        """Test user not found scenario."""
        cognito_service.cognito_client.admin_get_user.side_effect = ClientError(
            {"Error": {"Code": "UserNotFoundException"}}, "AdminGetUser"
        )

        result = cognito_service.get_user("nonexistent@example.com")

        assert result["success"] is False
        assert result["error"] == "UserNotFoundException"

    @patch("app.services.cognito_service.boto3.client")
    def test_create_user_success(self, mock_boto_client, cognito_service):
        """Test successful user creation."""
        # Mock SES client
        mock_ses = Mock()
        mock_boto_client.return_value = mock_ses
        mock_ses.send_email.return_value = {"MessageId": "test-message-id"}

        # Mock Cognito response
        cognito_service.cognito_client.admin_create_user.return_value = {
            "User": {"Username": "newuser@example.com"}
        }

        result = cognito_service.create_user(
            email="newuser@example.com",
            temporary_password="TempPass123!",
            groups=["users"],
        )

        assert result["success"] is True
        cognito_service.cognito_client.admin_create_user.assert_called_once()

    def test_create_user_already_exists(self, cognito_service):
        """Test user creation when user already exists."""
        cognito_service.cognito_client.admin_create_user.side_effect = ClientError(
            {"Error": {"Code": "UsernameExistsException"}}, "AdminCreateUser"
        )

        result = cognito_service.create_user(
            email="existing@example.com", temporary_password="TempPass123!"
        )

        assert result["success"] is False
        assert result["error"] == "UsernameExistsException"

    def test_delete_user_success(self, cognito_service):
        """Test successful user deletion."""
        cognito_service.cognito_client.admin_delete_user.return_value = {}

        result = cognito_service.delete_user("user@example.com")

        assert result["success"] is True
        cognito_service.cognito_client.admin_delete_user.assert_called_once_with(
            UserPoolId="test-pool-id", Username="user@example.com"
        )

    def test_delete_user_not_found(self, cognito_service):
        """Test user deletion when user not found."""
        cognito_service.cognito_client.admin_delete_user.side_effect = ClientError(
            {"Error": {"Code": "UserNotFoundException"}}, "AdminDeleteUser"
        )

        result = cognito_service.delete_user("nonexistent@example.com")

        assert result["success"] is False
        assert result["error"] == "UserNotFoundException"

    def test_enable_user_success(self, cognito_service):
        """Test successful user enabling."""
        cognito_service.cognito_client.admin_enable_user.return_value = {}

        result = cognito_service.enable_user("user@example.com")

        assert result["success"] is True
        cognito_service.cognito_client.admin_enable_user.assert_called_once()

    def test_disable_user_success(self, cognito_service):
        """Test successful user disabling."""
        cognito_service.cognito_client.admin_disable_user.return_value = {}

        result = cognito_service.disable_user("user@example.com")

        assert result["success"] is True
        cognito_service.cognito_client.admin_disable_user.assert_called_once()

    def test_add_user_to_group_success(self, cognito_service):
        """Test successful user group assignment."""
        cognito_service.cognito_client.admin_add_user_to_group.return_value = {}

        result = cognito_service.add_user_to_group("user@example.com", "admin")

        assert result["success"] is True
        cognito_service.cognito_client.admin_add_user_to_group.assert_called_once()

    def test_remove_user_from_group_success(self, cognito_service):
        """Test successful user group removal."""
        cognito_service.cognito_client.admin_remove_user_from_group.return_value = {}

        result = cognito_service.remove_user_from_group("user@example.com", "admin")

        assert result["success"] is True
        cognito_service.cognito_client.admin_remove_user_from_group.assert_called_once()

    def test_list_groups_success(self, cognito_service):
        """Test successful group listing."""
        mock_response = {
            "Groups": [
                {"GroupName": "admin", "Description": "Admin users"},
                {"GroupName": "users", "Description": "Regular users"},
            ]
        }
        cognito_service.cognito_client.list_groups.return_value = mock_response

        result = cognito_service.list_groups()

        assert result["success"] is True
        assert len(result["groups"]) == 2
        assert result["groups"][0]["name"] == "admin"

    def test_reset_user_password_success(self, cognito_service):
        """Test successful password reset."""
        cognito_service.cognito_client.admin_set_user_password.return_value = {}

        result = cognito_service.reset_user_password(
            "user@example.com", "NewPassword123!"
        )

        assert result["success"] is True
        cognito_service.cognito_client.admin_set_user_password.assert_called_once()

    def test_format_user_data(self, cognito_service):
        """Test user data formatting."""
        user_data = {
            "Username": "user@example.com",
            "UserAttributes": [
                {"Name": "email", "Value": "user@example.com"},
                {"Name": "email_verified", "Value": "true"},
            ],
            "UserStatus": "CONFIRMED",
            "Enabled": True,
        }

        formatted = cognito_service._format_user_data(user_data)

        assert formatted["username"] == "user@example.com"
        assert formatted["email"] == "user@example.com"
        assert formatted["status"] == "CONFIRMED"
        assert formatted["enabled"] is True
