import logging
import os
from typing import Any, Dict

from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt
from jose.exceptions import ExpiredSignatureError, JWTError

from ..utils.aws_session import get_aws_session

logger = logging.getLogger(__name__)

# JWT configuration - SECURITY: Must use environment variable in production
JWT_SECRET = os.getenv("JWT_SECRET", "mock-jwt-secret-for-local-development")
JWT_ALGORITHM = "HS256"

# Security check: Prevent using development secret in production
if os.getenv("ENVIRONMENT") == "production":
    if JWT_SECRET == "mock-jwt-secret-for-local-development":
        raise ValueError(
            "SECURITY ERROR: JWT_SECRET must be set to a secure value in production environment!"
        )


class AuthMiddleware:
    def __init__(self):
        self.security = HTTPBearer()

    def create_mock_token(self, user_data: Dict[str, Any]) -> str:
        """Create a mock JWT token for local development"""
        email = user_data.get("email", "user@example.com")

        # Check Cognito groups for admin status
        is_admin = False
        try:
            session = get_aws_session()
            cognito_client = session.client("cognito-idp", region_name="us-east-1")

            # Try to find user by email
            users_response = cognito_client.list_users(
                UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
                Filter=f'email = "{email}"',
            )

            if users_response.get("Users"):
                username = users_response["Users"][0]["Username"]
                groups_response = cognito_client.admin_list_groups_for_user(
                    UserPoolId=os.getenv("COGNITO_USER_POOL_ID"), Username=username
                )
                user_groups = [
                    group["GroupName"] for group in groups_response.get("Groups", [])
                ]
                is_admin = "admin" in user_groups
        except Exception:
            # Fallback for development
            is_admin = email in ["test@example.com", "admin@igad.int", "user@igad.int"]

        payload = {
            "user_id": user_data.get("user_id", "mock-user-123"),
            "email": email,
            "role": user_data.get("role", "user"),
            "is_admin": is_admin,
            "exp": 9999999999,  # Far future expiration for development
        }

        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    def verify_token(self, credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
        """Verify JWT token and return user data"""
        try:
            token = credentials.credentials

            # Try to decode as Cognito token first
            # SECURITY: Only skip verification in development/testing
            try:
                environment = os.getenv("ENVIRONMENT", "development")
                if environment in ["development", "testing"]:
                    # Decode without verification for development/testing
                    # In production, we should verify Cognito tokens properly
                    payload = jwt.decode(
                        token, "", options={"verify_signature": False, "verify_aud": False}
                    )
                else:
                    # In production, we should verify Cognito tokens properly
                    # For now, fall through to JWT verification
                    raise Exception("Production requires proper token verification")

                # Extract user info from Cognito token
                username = payload.get("username", "")
                email = payload.get("email", "")

                # If no email in token, try to get it from Cognito
                if not email and username:
                    try:
                        session = get_aws_session()
                        cognito_client = session.client(
                            "cognito-idp", region_name="us-east-1"
                        )
                        user_response = cognito_client.admin_get_user(
                            UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
                            Username=username,
                        )
                        for attr in user_response.get("UserAttributes", []):
                            if attr["Name"] == "email":
                                email = attr["Value"]
                                break
                    except Exception:
                        pass

                # Check if user is admin by verifying Cognito groups
                is_admin = False
                try:
                    session = get_aws_session()
                    cognito_client = session.client(
                        "cognito-idp", region_name="us-east-1"
                    )

                    groups_response = cognito_client.admin_list_groups_for_user(
                        UserPoolId=os.getenv("COGNITO_USER_POOL_ID"), Username=username
                    )

                    user_groups = [
                        group["GroupName"]
                        for group in groups_response.get("Groups", [])
                    ]
                    is_admin = "admin" in user_groups
                    print(f"User {email} groups: {user_groups}, is_admin: {is_admin}")

                except Exception as group_error:
                    print(f"Error checking user groups: {group_error}")
                    # Fallback for development
                    is_admin = email in [
                        "test@example.com",
                        "admin@igad.int",
                        "user@igad.int",
                        "j.cadavid@cgiar.org",
                    ]

                return {
                    "user_id": payload.get("sub", username),
                    "email": email,
                    "username": username,
                    "role": "admin" if is_admin else "user",
                    "is_admin": is_admin,
                }

            except Exception:
                # Fallback to mock token format
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

                # Check admin status from JWT or fallback to hardcoded list
                email = payload.get("email", "")
                is_admin = payload.get("is_admin", False)

                # If not in JWT, fallback to hardcoded list for development
                if not is_admin:
                    is_admin = email in [
                        "test@example.com",
                        "admin@igad.int",
                        "user@igad.int",
                        "j.cadavid@cgiar.org",
                    ]

                return {
                    "user_id": payload.get("user_id"),
                    "email": email,
                    "username": payload.get("username", email),
                    "role": "admin" if is_admin else "user",
                    "is_admin": is_admin,
                }

        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired"
            )
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed"
            )

    def get_mock_user(self) -> Dict[str, Any]:
        """Get mock user for development"""
        return {
            "user_id": "mock-user-123",
            "email": "user@igad.int",
            "role": "user",
            "name": "IGAD User",
        }


# Global auth middleware instance
auth_middleware = AuthMiddleware()
