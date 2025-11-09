from typing import Any, Dict, Optional

import boto3
from botocore.exceptions import ClientError


class CognitoUserManagementService:
    def __init__(self, user_pool_id: str, client_id: str, region: str = "us-east-1"):
        self.user_pool_id = user_pool_id
        self.client_id = client_id

        # Initialize boto3 session with explicit profile
        session = boto3.Session(profile_name="IBD-DEV")
        self.cognito_client = session.client("cognito-idp", region_name=region)

        print(
            f"Initialized Cognito client with profile IBD-DEV, region: {region}"
        )  # Debug

    def list_users(
        self, limit: int = 60, pagination_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """List all users in the user pool"""
        try:
            print(f"Listing users with UserPoolId: {self.user_pool_id}")  # Debug

            params = {"UserPoolId": self.user_pool_id, "Limit": limit}

            if pagination_token:
                params["PaginationToken"] = pagination_token

            response = self.cognito_client.list_users(**params)

            users = []
            for user in response.get("Users", []):
                user_data = self._format_user_data(user)
                # Get user groups
                try:
                    groups_response = self.cognito_client.admin_list_groups_for_user(
                        UserPoolId=self.user_pool_id, Username=user_data["username"]
                    )
                    user_data["groups"] = [
                        group["GroupName"]
                        for group in groups_response.get("Groups", [])
                    ]
                except Exception as group_error:
                    print(
                        f"Error getting groups for user {user_data['username']}: {group_error}"
                    )
                    user_data["groups"] = []

                users.append(user_data)

            print(f"Successfully retrieved {len(users)} users")  # Debug
            return {
                "success": True,
                "users": users,
                "pagination_token": response.get("PaginationToken"),
            }

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            error_message = e.response["Error"]["Message"]
            print(f"Cognito ClientError: {error_code} - {error_message}")  # Debug
            return {"success": False, "error": error_code, "message": error_message}
        except Exception as e:
            print(f"Unexpected error in list_users: {e}")  # Debug
            import traceback

            traceback.print_exc()
            return {"success": False, "error": "UnknownError", "message": str(e)}

    def get_user(self, username: str) -> Dict[str, Any]:
        """Get detailed information about a specific user"""
        try:
            response = self.cognito_client.admin_get_user(
                UserPoolId=self.user_pool_id, Username=username
            )

            user_data = self._format_user_data(response)

            # Get user groups
            groups_response = self.cognito_client.admin_list_groups_for_user(
                UserPoolId=self.user_pool_id, Username=username
            )
            user_data["groups"] = [
                group["GroupName"] for group in groups_response.get("Groups", [])
            ]

            return {"success": True, "user": user_data}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def create_user(
        self,
        username: str,
        email: str,
        temporary_password: str,
        send_email: bool = True,
    ) -> Dict[str, Any]:
        """
        Create a new user with friendly email templates.

        Email templates configured:
        - Welcome email: Friendly Spanish message with IGAD branding
        - From: "IGAD Innovation Hub <j.cadavid@cgiar.org>"
        - Uses SES for better deliverability
        """
        try:
            print(f"Creating user with email: {email}")  # Debug
            print(f"Using UserPoolId: {self.user_pool_id}")  # Debug

            # Since User Pool requires email as username, use email directly
            params = {
                "UserPoolId": self.user_pool_id,
                "Username": email,  # Must be email format
                "UserAttributes": [
                    {"Name": "email", "Value": email},
                    {"Name": "email_verified", "Value": "true"},
                ],
                "TemporaryPassword": temporary_password,
            }

            # Only suppress email if send_email is False
            if not send_email:
                params["MessageAction"] = "SUPPRESS"

            print(f"Creating user with email as username: {email}")  # Debug

            # First check if user already exists
            try:
                existing_user = self.cognito_client.admin_get_user(
                    UserPoolId=self.user_pool_id, Username=email
                )
                print(f"User already exists: {existing_user}")
                return {
                    "success": False,
                    "error": "UserExistsException",
                    "message": "User already exists",
                }
            except ClientError as check_error:
                if check_error.response["Error"]["Code"] != "UserNotFoundException":
                    # Some other error occurred
                    raise check_error
                # User doesn't exist, proceed with creation
                print("User doesn't exist, proceeding with creation")

            response = self.cognito_client.admin_create_user(**params)

            print(f"User created successfully: {response}")  # Debug

            # Always set temporary password to force change on first login
            try:
                print("Setting temporary password to force change...")
                # Use the actual username (UUID) returned by Cognito, not the email
                actual_username = response["User"]["Username"]
                self.cognito_client.admin_set_user_password(
                    UserPoolId=self.user_pool_id,
                    Username=actual_username,  # Use UUID, not email
                    Password=temporary_password,
                    Permanent=False,  # This ensures FORCE_CHANGE_PASSWORD status
                )
                print("Temporary password set successfully")
            except ClientError as pwd_error:
                print(f"Failed to set temporary password: {pwd_error}")

            # Email is sent automatically by Cognito when MessageAction='RESEND'

            # Send welcome email if requested
            if send_email:
                try:
                    print("Sending welcome email...")
                    actual_username = response["User"]["Username"]
                    # Use admin_create_user with RESEND to send email to existing user
                    self.cognito_client.admin_create_user(
                        UserPoolId=self.user_pool_id,
                        Username=email,  # Use email for RESEND
                        MessageAction="RESEND",
                    )
                    print("Welcome email sent successfully")
                except ClientError as email_error:
                    print(f"Failed to send welcome email: {email_error}")
                    # Don't fail the whole operation if email fails

            return {
                "success": True,
                "user": self._format_user_data(response["User"]),
                "message": "User created successfully",
            }

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            error_message = e.response["Error"]["Message"]
            print(f"Final Cognito ClientError: {error_code} - {error_message}")  # Debug
            return {"success": False, "error": error_code, "message": error_message}
        except Exception as e:
            print(f"Unexpected error: {e}")  # Debug
            import traceback

            traceback.print_exc()
            return {"success": False, "error": "UnknownError", "message": str(e)}

    def update_user(self, username: str, attributes: Dict[str, str]) -> Dict[str, Any]:
        """Update user attributes"""
        try:
            user_attributes = [
                {"Name": key, "Value": value} for key, value in attributes.items()
            ]

            self.cognito_client.admin_update_user_attributes(
                UserPoolId=self.user_pool_id,
                Username=username,
                UserAttributes=user_attributes,
            )

            return {"success": True, "message": "User updated successfully"}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def delete_user(self, username: str) -> Dict[str, Any]:
        """Delete a user"""
        try:
            self.cognito_client.admin_delete_user(
                UserPoolId=self.user_pool_id, Username=username
            )

            return {"success": True, "message": "User deleted successfully"}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def enable_user(self, username: str) -> Dict[str, Any]:
        """Enable a user account"""
        try:
            self.cognito_client.admin_enable_user(
                UserPoolId=self.user_pool_id, Username=username
            )

            return {"success": True, "message": "User enabled successfully"}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def disable_user(self, username: str) -> Dict[str, Any]:
        """Disable a user account"""
        try:
            self.cognito_client.admin_disable_user(
                UserPoolId=self.user_pool_id, Username=username
            )

            return {"success": True, "message": "User disabled successfully"}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def reset_user_password(
        self, username: str, temporary_password: str
    ) -> Dict[str, Any]:
        """Reset user password (admin action)"""
        try:
            self.cognito_client.admin_set_user_password(
                UserPoolId=self.user_pool_id,
                Username=username,
                Password=temporary_password,
                Permanent=False,
            )

            return {"success": True, "message": "Password reset successfully"}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def list_groups(self) -> Dict[str, Any]:
        """List all groups in the user pool"""
        try:
            response = self.cognito_client.list_groups(UserPoolId=self.user_pool_id)

            groups = []
            for group in response.get("Groups", []):
                groups.append(
                    {
                        "name": group["GroupName"],
                        "description": group.get("Description", ""),
                        "precedence": group.get("Precedence"),
                        "creation_date": (
                            group["CreationDate"].isoformat()
                            if group.get("CreationDate")
                            else None
                        ),
                        "last_modified_date": (
                            group["LastModifiedDate"].isoformat()
                            if group.get("LastModifiedDate")
                            else None
                        ),
                    }
                )

            return {"success": True, "groups": groups}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }
        except Exception as e:
            return {"success": False, "error": "UnknownError", "message": str(e)}

    def add_user_to_group(self, username: str, group_name: str) -> Dict[str, Any]:
        """Add user to a group"""
        try:
            self.cognito_client.admin_add_user_to_group(
                UserPoolId=self.user_pool_id, Username=username, GroupName=group_name
            )

            return {"success": True, "message": f"User added to group {group_name}"}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def remove_user_from_group(self, username: str, group_name: str) -> Dict[str, Any]:
        """Remove user from a group"""
        try:
            self.cognito_client.admin_remove_user_from_group(
                UserPoolId=self.user_pool_id, Username=username, GroupName=group_name
            )

            return {"success": True, "message": f"User removed from group {group_name}"}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def create_group(
        self, group_name: str, description: str = "", precedence: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create a new group"""
        try:
            params = {
                "UserPoolId": self.user_pool_id,
                "GroupName": group_name,
                "Description": description,
            }

            if precedence is not None:
                params["Precedence"] = precedence

            response = self.cognito_client.create_group(**params)

            return {
                "success": True,
                "group": {
                    "name": response["Group"]["GroupName"],
                    "description": response["Group"].get("Description", ""),
                    "precedence": response["Group"].get("Precedence"),
                    "creation_date": (
                        response["Group"]["CreationDate"].isoformat()
                        if response["Group"].get("CreationDate")
                        else None
                    ),
                    "last_modified_date": (
                        response["Group"]["LastModifiedDate"].isoformat()
                        if response["Group"].get("LastModifiedDate")
                        else None
                    ),
                },
                "message": "Group created successfully",
            }

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def delete_group(self, group_name: str) -> Dict[str, Any]:
        """Delete a group"""
        try:
            self.cognito_client.delete_group(
                UserPoolId=self.user_pool_id, GroupName=group_name
            )

            return {"success": True, "message": "Group deleted successfully"}

        except ClientError as e:
            return {
                "success": False,
                "error": e.response["Error"]["Code"],
                "message": e.response["Error"]["Message"],
            }

    def _format_user_data(self, user_data: Dict) -> Dict[str, Any]:
        """Format user data from Cognito response"""
        attributes = {}
        for attr in user_data.get("Attributes", []):
            attributes[attr["Name"]] = attr["Value"]

        return {
            "username": user_data.get("Username"),
            "email": attributes.get("email", ""),
            "email_verified": attributes.get("email_verified") == "true",
            "enabled": user_data.get("Enabled", True),
            "user_status": user_data.get("UserStatus", "UNKNOWN"),
            "created_date": (
                user_data.get("UserCreateDate").isoformat()
                if user_data.get("UserCreateDate")
                else None
            ),
            "last_modified_date": (
                user_data.get("UserLastModifiedDate").isoformat()
                if user_data.get("UserLastModifiedDate")
                else None
            ),
            "attributes": attributes,
        }
