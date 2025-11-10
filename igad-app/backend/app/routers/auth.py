"""
Authentication Router
"""

import os
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from ..middleware.auth_middleware import AuthMiddleware
from ..utils.aws_session import get_aws_session

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer()

# Initialize auth middleware
auth_middleware = AuthMiddleware()


class LoginRequest(BaseModel):
    username: str  # Frontend sends username, but we'll treat it as email
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    user: Dict[str, Any]
    expires_in: int
    requires_password_change: Optional[bool] = None
    session: Optional[str] = None
    username: Optional[str] = None
    message: Optional[str] = None


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    """Real Cognito login endpoint"""
    email = credentials.username  # Frontend sends username but it's actually email
    password = credentials.password

    try:
        import boto3
        from botocore.exceptions import ClientError

        session = get_aws_session()
        cognito_client = session.client("cognito-idp", region_name="us-east-1")

        # Attempt to authenticate with Cognito
        response = cognito_client.admin_initiate_auth(
            UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
            ClientId=os.getenv("COGNITO_CLIENT_ID"),
            AuthFlow="ADMIN_USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
        )

        # Check if password change is required
        if response.get("ChallengeName") == "NEW_PASSWORD_REQUIRED":
            return {
                "access_token": "",
                "token_type": "bearer",
                "user": {
                    "user_id": "",
                    "email": email,
                    "role": "user",
                    "name": "IGAD User",
                    "is_admin": False,
                },
                "expires_in": 0,
                "requires_password_change": True,
                "session": response["Session"],
                "username": email,
                "message": "Password change required",
            }

        # Successful login
        access_token = response["AuthenticationResult"]["AccessToken"]
        id_token = response["AuthenticationResult"]["IdToken"]

        # Decode ID token to get user info
        from jose import jwt

        user_info = jwt.decode(id_token, "", options={"verify_signature": False, "verify_aud": False})

        # Check if user is admin
        is_admin = email in [
            "test@example.com",
            "admin@igad.int",
            "user@igad.int",
            "j.cadavid@cgiar.org",
        ]

        user_data = {
            "user_id": user_info.get("sub", ""),
            "email": user_info.get("email", email),
            "role": "admin" if is_admin else "user",
            "name": user_info.get("name", "IGAD User"),
            "is_admin": is_admin,
        }

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_data,
            expires_in=3600,
        )

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "NotAuthorizedException":
            raise HTTPException(status_code=401, detail="Invalid credentials")
        elif error_code == "UserNotFoundException":
            raise HTTPException(status_code=401, detail="User not found")
        else:
            raise HTTPException(
                status_code=500, detail=f"Authentication error: {error_code}"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/refresh-token")
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        import boto3
        from botocore.exceptions import ClientError

        session = get_aws_session()
        cognito_client = session.client("cognito-idp", region_name="us-east-1")

        # Use refresh token to get new access token
        response = cognito_client.admin_initiate_auth(
            UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
            ClientId=os.getenv("COGNITO_CLIENT_ID"),
            AuthFlow="REFRESH_TOKEN_AUTH",
            AuthParameters={
                "REFRESH_TOKEN": request.refresh_token
            },
        )

        # Get new tokens
        access_token = response["AuthenticationResult"]["AccessToken"]
        id_token = response["AuthenticationResult"]["IdToken"]
        new_refresh_token = response["AuthenticationResult"].get("RefreshToken")

        # Decode ID token to get user info
        from jose import jwt
        user_info = jwt.decode(id_token, "", options={"verify_signature": False, "verify_aud": False})

        # Check if user is admin
        email = user_info.get("email", "")
        is_admin = email in [
            "test@example.com",
            "admin@igad.int", 
            "user@igad.int",
            "j.cadavid@cgiar.org",
        ]

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": 86400,  # 24 hours
            "user": {
                "user_id": user_info.get("sub", ""),
                "email": email,
                "role": "admin" if is_admin else "user",
                "name": user_info.get("name", "IGAD User"),
                "is_admin": is_admin,
            }
        }

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "NotAuthorizedException":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        else:
            raise HTTPException(status_code=500, detail=f"Token refresh error: {error_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Token refresh failed: {str(e)}")


@router.post("/logout")
async def logout():
    """Mock logout endpoint"""
    return {"message": "Logged out successfully"}


class ForgotPasswordRequest(BaseModel):
    username: str


class ResetPasswordRequest(BaseModel):
    username: str
    code: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset code with custom HTML email"""
    try:
        import boto3
        from botocore.exceptions import ClientError

        session = get_aws_session()
        cognito_client = session.client("cognito-idp", region_name="us-east-1")

        # Look up the actual username by email since Cognito uses UUID as username
        username = request.username
        if "@" in username:  # If it's an email, find the actual username
            try:
                users_response = cognito_client.list_users(
                    UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
                    Filter=f'email = "{username}"'
                )
                if users_response["Users"]:
                    username = users_response["Users"][0]["Username"]
                else:
                    raise HTTPException(status_code=404, detail="User not found")
            except ClientError:
                raise HTTPException(status_code=404, detail="User not found")

        # Trigger Cognito forgot password to generate the code
        cognito_response = cognito_client.forgot_password(
            ClientId=os.getenv("COGNITO_CLIENT_ID"), Username=username
        )

        # Since we can't get the actual code from Cognito, we'll send our own email
        # instructing the user to check for the Cognito email and use our reset form

        reset_html = """
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Password Reset - IGAD Innovation Hub</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset Request</h1>
                <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">IGAD Innovation Hub</p>
            </div>

            <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
                <h2 style="color: #1e40af; margin-top: 0;">Reset Your Password</h2>

                <p style="margin: 20px 0;">You have requested to reset your password for your IGAD Innovation Hub account.</p>

                <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold;">Next Steps:</p>
                    <ol style="margin: 10px 0; padding-left: 20px;">
                        <li>Check your email for a verification code (it may arrive separately)</li>
                        <li>Return to the password reset form</li>
                        <li>Enter the 6-digit code you received</li>
                        <li>Set your new password</li>
                    </ol>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/forgot-password" style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Continue Password Reset</a>
                </div>

                <p style="margin: 20px 0; font-size: 14px; color: #64748b;">The verification code will expire in 15 minutes. If you didn't request this password reset, please ignore this email.</p>

                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

                <p style="font-size: 14px; color: #64748b; text-align: center; margin: 0;">
                    IGAD Innovation Hub - Driving Innovation in East Africa<br>
                    If you have questions, contact us at <a href="mailto:j.cadavid@cgiar.org" style="color: #3b82f6;">j.cadavid@cgiar.org</a>
                </p>
            </div>
        </body>
        </html>
        """

        # Use Cognito's built-in password reset (no custom email needed)
        # Cognito will send the reset code using the configured email templates
        # Updated: 2025-01-10 - Removed SES dependency
        print("Password reset initiated via Cognito - using built-in email templates")

        return {
            "success": True,
            "message": "Reset instructions sent to email. Please check your inbox for the verification code.",
            "delivery": cognito_response.get("CodeDeliveryDetails", {}),
        }

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "UserNotFoundException":
            raise HTTPException(status_code=404, detail="User not found")
        elif error_code == "InvalidParameterException":
            raise HTTPException(status_code=400, detail="Invalid username format")
        elif error_code == "LimitExceededException":
            raise HTTPException(
                status_code=429, detail="Too many requests. Please try again later"
            )
        else:
            raise HTTPException(
                status_code=500, detail=f"Reset password error: {error_code}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to send reset code: {str(e)}"
        )


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with code"""
    try:
        import boto3
        from botocore.exceptions import ClientError

        session = get_aws_session()
        cognito_client = session.client("cognito-idp", region_name="us-east-1")

        # Confirm forgot password with code
        cognito_client.confirm_forgot_password(
            ClientId=os.getenv("COGNITO_CLIENT_ID"),
            Username=request.username,
            ConfirmationCode=request.code,
            Password=request.new_password,
        )

        return {"success": True, "message": "Password reset successfully"}

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "CodeMismatchException":
            raise HTTPException(status_code=400, detail="Invalid verification code")
        elif error_code == "ExpiredCodeException":
            raise HTTPException(status_code=400, detail="Verification code has expired")
        elif error_code == "InvalidPasswordException":
            raise HTTPException(
                status_code=400, detail="Password does not meet requirements"
            )
        elif error_code == "UserNotFoundException":
            raise HTTPException(status_code=404, detail="User not found")
        else:
            raise HTTPException(
                status_code=500, detail=f"Reset password error: {error_code}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to reset password: {str(e)}"
        )


class CompletePasswordChangeRequest(BaseModel):
    username: str
    session: str
    new_password: str


@router.post("/complete-password-change")
async def complete_password_change(request: CompletePasswordChangeRequest):
    """Complete password change for users in FORCE_CHANGE_PASSWORD state"""
    try:
        import boto3
        from botocore.exceptions import ClientError

        session = get_aws_session()
        cognito_client = session.client("cognito-idp", region_name="us-east-1")

        # Complete the password change challenge
        response = cognito_client.admin_respond_to_auth_challenge(
            UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
            ClientId=os.getenv("COGNITO_CLIENT_ID"),
            ChallengeName="NEW_PASSWORD_REQUIRED",
            Session=request.session,
            ChallengeResponses={
                "USERNAME": request.username,
                "NEW_PASSWORD": request.new_password,
            },
        )

        # Get tokens from successful response
        access_token = response["AuthenticationResult"]["AccessToken"]
        id_token = response["AuthenticationResult"]["IdToken"]

        # Decode ID token to get user info
        from jose import jwt

        user_info = jwt.decode(id_token, "", options={"verify_signature": False, "verify_aud": False})

        # Check if user is admin
        is_admin = request.username in [
            "test@example.com",
            "admin@igad.int",
            "user@igad.int",
            "j.cadavid@cgiar.org",
        ]

        user_data = {
            "user_id": user_info.get("sub", ""),
            "email": user_info.get("email", request.username),
            "role": "admin" if is_admin else "user",
            "name": user_info.get("name", "IGAD User"),
            "is_admin": is_admin,
        }

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user_data,
            "expires_in": 3600,
            "message": "Password changed successfully",
        }

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "InvalidPasswordException":
            raise HTTPException(
                status_code=400, detail="Password does not meet requirements"
            )
        elif error_code == "NotAuthorizedException":
            raise HTTPException(
                status_code=401, detail="Invalid session or credentials"
            )
        else:
            raise HTTPException(
                status_code=500, detail=f"Password change error: {error_code}"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Password change failed: {str(e)}")


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Change user password."""
    auth_middleware.verify_token(credentials)

    # Mock implementation - in production, use Cognito
    return {"message": "Password changed successfully"}


@router.get("/me")
async def get_current_user_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get current user information"""
    user = auth_middleware.verify_token(credentials)
    return user
