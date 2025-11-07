"""
Authentication Middleware for Cognito JWT tokens
"""

import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from aws_lambda_powertools import Logger

from ..services.cognito_service import CognitoService

logger = Logger()

class AuthMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.cognito_service = CognitoService(
            user_pool_id=os.getenv("COGNITO_USER_POOL_ID"),
            client_id=os.getenv("COGNITO_CLIENT_ID"),
            region=os.getenv("AWS_REGION", "us-east-1")
        )
        
        # Public endpoints that don't require authentication
        self.public_paths = {
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/health/",
            "/auth/login",
            "/auth/create-user"
        }
    
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints
        if request.url.path in self.public_paths:
            return await call_next(request)
        
        # Skip auth for health checks
        if request.url.path.startswith("/health"):
            return await call_next(request)
        
        # Get token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Verify token with Cognito
        user_info = await self.cognito_service.verify_token(token)
        if not user_info:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        # Add user info to request state
        request.state.user = user_info
        
        return await call_next(request)
