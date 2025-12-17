"""Admin Router - User Management."""

import os
from typing import Dict, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.middleware.auth_middleware import AuthMiddleware
from app.tools.auth.service import CognitoUserManagementService
from app.utils.aws_session import get_aws_session

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()
auth_middleware = AuthMiddleware()

# Initialize Cognito service
cognito_user_service = CognitoUserManagementService(
    user_pool_id=os.getenv("COGNITO_USER_POOL_ID"),
    client_id=os.getenv("COGNITO_CLIENT_ID"),
    region=os.getenv("AWS_REGION", "us-east-1"),
)


def verify_admin_access(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify that the user has admin access"""
    user_data = auth_middleware.verify_token(credentials)
    if user_data:
        if not user_data.get("is_admin", False):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user_data
    raise HTTPException(status_code=401, detail="Invalid token")


class UserCreate(BaseModel):
    username: str
    email: str
    temporary_password: str
    send_email: Optional[bool] = True


class UserUpdate(BaseModel):
    email: Optional[str] = None
    attributes: Optional[Dict[str, str]] = None


@router.get("/users")
async def list_users(admin_user=Depends(verify_admin_access)):
    """List all users in the user pool"""
    try:
        result = cognito_user_service.list_users()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")


@router.post("/users")
async def create_user(user_data: UserCreate, admin_user=Depends(verify_admin_access)):
    """Create a new user"""
    try:
        # Normalize email to lowercase for consistency
        normalized_email = user_data.email.lower().strip()

        # Create user without sending Cognito email
        session = get_aws_session()
        cognito_client = session.client("cognito-idp", region_name="us-east-1")

        # First check if user exists
        try:
            cognito_client.admin_get_user(
                UserPoolId=os.getenv("COGNITO_USER_POOL_ID"), Username=normalized_email
            )
            return {
                "success": False,
                "error": "UserExistsException",
                "message": "User already exists",
            }
        except cognito_client.exceptions.UserNotFoundException:
            pass  # User doesn't exist, continue

        # Create user - let Cognito handle email sending
        if user_data.send_email:
            # Let Cognito send the email with our custom templates
            cognito_client.admin_create_user(
                UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
                Username=normalized_email,
                UserAttributes=[
                    {"Name": "email", "Value": normalized_email},
                    {"Name": "email_verified", "Value": "true"},
                ],
                TemporaryPassword=user_data.temporary_password,
                # MessageAction not specified - let Cognito send email with custom templates
            )
        else:
            # Create user without sending email
            cognito_client.admin_create_user(
                UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
                Username=normalized_email,
                UserAttributes=[
                    {"Name": "email", "Value": normalized_email},
                    {"Name": "email_verified", "Value": "true"},
                ],
                TemporaryPassword=user_data.temporary_password,
                MessageAction="SUPPRESS",  # Don't send email
            )

        return {
            "success": True,
            "message": "User created successfully",
            "user": {
                "username": user_data.email,
                "email": user_data.email,
                "status": "FORCE_CHANGE_PASSWORD",
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")


@router.get("/users/{username}")
async def get_user(username: str, admin_user=Depends(verify_admin_access)):
    """Get user details"""
    try:
        result = cognito_user_service.get_user(username)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get user: {str(e)}")


@router.put("/users/{username}")
async def update_user(
    username: str, user_data: UserUpdate, admin_user=Depends(verify_admin_access)
):
    """Update user attributes"""
    try:
        result = cognito_user_service.update_user(
            username=username, attributes=user_data.attributes or {}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")


@router.delete("/users/{username}")
async def delete_user(username: str, admin_user=Depends(verify_admin_access)):
    """Delete a user"""
    try:
        result = cognito_user_service.delete_user(username)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")


@router.post("/users/{username}/enable")
async def enable_user(username: str, admin_user=Depends(verify_admin_access)):
    """Enable a user account"""
    try:
        result = cognito_user_service.enable_user(username)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to enable user: {str(e)}")


@router.post("/users/{username}/disable")
async def disable_user(username: str, admin_user=Depends(verify_admin_access)):
    """Disable a user account"""
    try:
        result = cognito_user_service.disable_user(username)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to disable user: {str(e)}")


@router.post("/users/{username}/reset-password")
async def reset_user_password(username: str, admin_user=Depends(verify_admin_access)):
    """Reset user password"""
    try:
        result = cognito_user_service.admin_reset_password(username)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to reset password: {str(e)}"
        )


@router.get("/groups")
async def list_groups(admin_user=Depends(verify_admin_access)):
    """List all groups"""
    try:
        result = cognito_user_service.list_groups()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list groups: {str(e)}")


@router.post("/users/{username}/groups/{group_name}")
async def add_user_to_group(
    username: str, group_name: str, admin_user=Depends(verify_admin_access)
):
    """Add user to group"""
    try:
        result = cognito_user_service.add_user_to_group(username, group_name)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to add user to group: {str(e)}"
        )


@router.delete("/users/{username}/groups/{group_name}")
async def remove_user_from_group(
    username: str, group_name: str, admin_user=Depends(verify_admin_access)
):
    """Remove user from group"""
    try:
        result = cognito_user_service.remove_user_from_group(username, group_name)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to remove user from group: {str(e)}"
        )
