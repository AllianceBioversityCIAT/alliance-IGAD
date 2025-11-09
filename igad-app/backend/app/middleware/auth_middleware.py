import jwt
import json
import os
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Mock JWT secret for local development
JWT_SECRET = "mock-jwt-secret-for-local-development"
JWT_ALGORITHM = "HS256"

class AuthMiddleware:
    def __init__(self):
        self.security = HTTPBearer()
    
    def create_mock_token(self, user_data: Dict[str, Any]) -> str:
        """Create a mock JWT token for local development"""
        email = user_data.get("email", "user@example.com")
        is_admin = email in ["test@example.com", "admin@igad.int", "user@igad.int"]
        
        payload = {
            "user_id": user_data.get("user_id", "mock-user-123"),
            "email": email,
            "role": user_data.get("role", "user"),
            "is_admin": is_admin,
            "exp": 9999999999  # Far future expiration for development
        }
        
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def verify_token(self, credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
        """Verify JWT token and return user data"""
        try:
            token = credentials.credentials
            
            # Try to decode as Cognito token first (without verification for development)
            try:
                # Decode without verification for development
                payload = jwt.decode(token, options={"verify_signature": False})
                
                # Extract user info from Cognito token
                username = payload.get("username", "")
                email = payload.get("email", "")
                
                # If no email in token, try to get it from Cognito
                if not email and username:
                    try:
                        import boto3
                        cognito_client = boto3.client('cognito-idp', region_name='us-east-1')
                        user_response = cognito_client.admin_get_user(
                            UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
                            Username=username
                        )
                        for attr in user_response.get('UserAttributes', []):
                            if attr['Name'] == 'email':
                                email = attr['Value']
                                break
                    except:
                        pass
                
                # For development, make test@example.com an admin
                is_admin = email in ["test@example.com", "admin@igad.int", "user@igad.int"]
                
                return {
                    "user_id": payload.get("sub", username),
                    "email": email,
                    "username": username,
                    "role": "admin" if is_admin else "user",
                    "is_admin": is_admin
                }
                
            except Exception:
                # Fallback to mock token format
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                
                # For development, make test@example.com an admin
                email = payload.get("email", "")
                is_admin = email in ["test@example.com", "admin@igad.int", "user@igad.int"]
                
                return {
                    "user_id": payload.get("user_id"),
                    "email": email,
                    "role": payload.get("role", "user"),
                    "is_admin": is_admin
                }
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )
    
    def get_mock_user(self) -> Dict[str, Any]:
        """Get mock user for development"""
        return {
            "user_id": "mock-user-123",
            "email": "user@igad.int",
            "role": "user",
            "name": "IGAD User"
        }

# Global auth middleware instance
auth_middleware = AuthMiddleware()
