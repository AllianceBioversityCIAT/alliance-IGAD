"""Admin Router - User Management."""

import os
from typing import Dict, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from ..utils.aws_session import get_aws_session

from ..middleware.auth_middleware import AuthMiddleware
from ..services.cognito_service import CognitoUserManagementService
from ..services.simple_cognito import SimpleCognitoService

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/admin", tags=["admin"])
security = HTTPBearer()
auth_middleware = AuthMiddleware()

# Initialize Cognito services
cognito_service = SimpleCognitoService(
    user_pool_id=os.getenv("COGNITO_USER_POOL_ID"),
    client_id=os.getenv("COGNITO_CLIENT_ID"),
    region=os.getenv("AWS_REGION", "us-east-1"),
)

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
    user_attributes: Optional[Dict[str, str]] = None


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
        # Create user without sending Cognito email
        import boto3

        session = get_aws_session()
        cognito_client = session.client("cognito-idp", region_name="us-east-1")
        ses_client = session.client("ses", region_name="us-east-1")

        # First check if user exists
        try:
            cognito_client.admin_get_user(
                UserPoolId=os.getenv("COGNITO_USER_POOL_ID"), Username=user_data.email
            )
            return {
                "success": False,
                "error": "UserExistsException",
                "message": "User already exists",
            }
        except cognito_client.exceptions.UserNotFoundException:
            pass  # User doesn't exist, continue

        # Create user with suppressed email
        cognito_client.admin_create_user(
            UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
            Username=user_data.email,
            UserAttributes=[
                {"Name": "email", "Value": user_data.email},
                {"Name": "email_verified", "Value": "true"},
            ],
            TemporaryPassword=user_data.temporary_password,
            MessageAction="SUPPRESS",  # Don't send Cognito email
        )

        # Send custom HTML email via SES if requested
        if user_data.send_email:
            welcome_html = f"""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Welcome to IGAD Innovation Hub</title></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to IGAD Innovation Hub</h1>
                    <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your account has been created successfully</p>
                </div>

                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
                    <h2 style="color: #1e40af; margin-top: 0;">Your Login Credentials</h2>

                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Username:</strong> {user_data.email}</p>
                        <p style="margin: 10px 0 0 0;"><strong>Temporary Password:</strong> <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">{user_data.temporary_password}</code></p>
                    </div>

                    <p style="margin: 20px 0;">Please log in and change your password on first access.</p>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="http://localhost:3000/login" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Access Platform</a>
                    </div>

                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

                    <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0;">
                        IGAD Innovation Hub - Driving Innovation in East Africa<br>
                        If you have questions, contact us at <a href="mailto:j.cadavid@cgiar.org" style="color: #3b82f6;">j.cadavid@cgiar.org</a>
                    </p>
                </div>
            </body>
            </html>
            """

            # Send via SES
            ses_client.send_email(
                Source="IGAD Innovation Hub <j.cadavid@cgiar.org>",
                Destination={"ToAddresses": [user_data.email]},
                Message={
                    "Subject": {
                        "Data": "Welcome to IGAD Innovation Hub - Your Account Details"
                    },
                    "Body": {"Html": {"Data": welcome_html}},
                },
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
            username=username, user_attributes=user_data.user_attributes or {}
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
