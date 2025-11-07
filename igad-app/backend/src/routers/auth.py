"""
Authentication Router with AWS Cognito
"""

import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from aws_lambda_powertools import Logger

from ..services.cognito_service import CognitoService

logger = Logger()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str

# Initialize Cognito service
cognito_service = CognitoService(
    user_pool_id=os.getenv("COGNITO_USER_POOL_ID"),
    client_id=os.getenv("COGNITO_CLIENT_ID"),
    region=os.getenv("AWS_REGION", "us-east-1")
)

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user with Cognito"""
    result = await cognito_service.authenticate_user(
        username=request.username,
        password=request.password
    )
    
    if not result['success']:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {result.get('message', 'Invalid credentials')}"
        )
    
    return LoginResponse(
        access_token=result['access_token'],
        expires_in=result['expires_in']
    )

@router.post("/verify")
async def verify_token(token: str):
    """Verify JWT token"""
    user_info = await cognito_service.verify_token(token)
    
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return {
        "valid": True,
        "user": user_info
    }

@router.post("/create-user")
async def create_user(request: CreateUserRequest):
    """Create new user (admin only)"""
    result = await cognito_service.create_user(
        username=request.username,
        email=request.email,
        password=request.password,
        temporary_password=False
    )
    
    if not result['success']:
        raise HTTPException(
            status_code=400,
            detail=f"User creation failed: {result.get('message', 'Unknown error')}"
        )
    
    return {
        "message": "User created successfully",
        "username": result['username']
    }
