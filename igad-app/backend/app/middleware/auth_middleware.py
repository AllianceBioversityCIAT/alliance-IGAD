import jwt
import json
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
        payload = {
            "user_id": user_data.get("user_id", "mock-user-123"),
            "email": user_data.get("email", "user@example.com"),
            "role": user_data.get("role", "user"),
            "exp": 9999999999  # Far future expiration for development
        }
        
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def verify_token(self, credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
        """Verify JWT token and return user data"""
        try:
            token = credentials.credentials
            
            # Decode and verify token
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            
            return {
                "user_id": payload.get("user_id"),
                "email": payload.get("email"),
                "role": payload.get("role", "user")
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
