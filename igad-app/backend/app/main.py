from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import asyncio
import json
import uuid
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import auth service
from .simple_cognito import SimpleCognitoService
from .middleware.auth_middleware import AuthMiddleware

# Initialize services
auth_middleware = AuthMiddleware()

# Mock data storage (replace with DynamoDB in production)
proposals_db = {}
security = HTTPBearer()

app = FastAPI(
    title="IGAD Proposal Writer API", 
    version="1.0.0",
    description="AI-powered proposal generation platform for IGAD Innovation Hub",
    docs_url="/docs",
    health_url="/health",
    api_prefix="/api"
)

# Initialize Cognito service
cognito_service = SimpleCognitoService(
    user_pool_id=os.getenv("COGNITO_USER_POOL_ID"),
    client_id=os.getenv("COGNITO_CLIENT_ID"),
    region=os.getenv("AWS_REGION", "us-east-1")
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ProposalCreate(BaseModel):
    title: str
    description: str = ""
    template_id: Optional[str] = None

class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    uploaded_files: Optional[Dict[str, List[str]]] = None
    text_inputs: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None

class AIGenerateRequest(BaseModel):
    section_id: str
    context_data: Optional[Dict[str, Any]] = None

class AIImproveRequest(BaseModel):
    section_id: str
    improvement_type: str = "general"

# Routes
@app.get("/")
async def root():
    return {
        "message": "IGAD Proposal Writer API",
        "version": "1.0.0",
        "description": "AI-powered proposal generation platform for IGAD Innovation Hub",
        "docs_url": "/docs",
        "health_url": "/health",
        "api_prefix": "/api"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "igad-proposal-writer"}

@app.post("/api/auth/login")
async def login(credentials: dict):
    """Mock login endpoint"""
    email = credentials.get("email")
    password = credentials.get("password")
    
    # Mock validation
    if email and password:
        user_data = {
            "user_id": "mock-user-123",
            "email": email,
            "role": "user",
            "name": "IGAD User"
        }
        
        token = auth_middleware.create_mock_token(user_data)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_data,
            "expires_in": 3600
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.post("/api/auth/logout")
async def logout():
    """Mock logout endpoint"""
    return {"message": "Logged out successfully"}

@app.get("/api/auth/me")
async def get_current_user_info(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user information"""
    user = auth_middleware.verify_token(credentials)
    return {"user": user}

# Mock auth dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from Cognito token"""
    try:
        token = credentials.credentials
        
        # For now, we'll create a simple user object from the token
        # In production, you would validate the Cognito JWT token properly
        # For this MVP, we'll accept any token and create a mock user
        
        return {
            "user_id": "cognito-user-123",
            "email": "user@example.com",
            "role": "user"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

@app.post("/api/proposals")
async def create_proposal(
    proposal: ProposalCreate,
    current_user: dict = Depends(get_current_user)
):
    proposal_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    new_proposal = {
        "id": proposal_id,
        "user_id": current_user["user_id"],
        "title": proposal.title,
        "description": proposal.description,
        "template_id": proposal.template_id,
        "status": "draft",
        "sections": [],
        "metadata": {},
        "uploaded_files": {},
        "text_inputs": {},
        "ai_context": {},
        "created_at": now,
        "updated_at": now,
        "version": 1
    }
    
    proposals_db[proposal_id] = new_proposal
    
    return {"proposal": new_proposal, "message": "Proposal created successfully"}

@app.get("/api/proposals")
async def list_proposals(current_user: dict = Depends(get_current_user)):
    user_proposals = [
        p for p in proposals_db.values() 
        if p["user_id"] == current_user["user_id"]
    ]
    
    # Sort by updated_at descending
    user_proposals.sort(key=lambda x: x["updated_at"], reverse=True)
    
    return {"proposals": user_proposals, "count": len(user_proposals)}

@app.get("/api/proposals/{proposal_id}")
async def get_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {"proposal": proposal}

@app.put("/api/proposals/{proposal_id}")
async def update_proposal(
    proposal_id: str,
    updates: ProposalUpdate,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    update_data = updates.dict(exclude_unset=True)
    for key, value in update_data.items():
        proposal[key] = value
    
    proposal["updated_at"] = datetime.utcnow().isoformat()
    proposal["version"] += 1
    
    return {"proposal": proposal, "message": "Proposal updated successfully"}

@app.delete("/api/proposals/{proposal_id}")
async def delete_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    del proposals_db[proposal_id]
    
    return {"message": "Proposal deleted successfully"}

@app.post("/api/proposals/{proposal_id}/generate")
async def generate_content(
    proposal_id: str,
    request: AIGenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate content using mock Bedrock
    context_str = json.dumps(request.context_data or {}, indent=2)
    prompt = f"Generate content for section '{request.section_id}' with context: {context_str}"
    
    result = await bedrock_client.generate_content(prompt)
    
    return {
        "result": {
            "content": result["content"],
            "tokens_used": result["tokens_used"],
            "generation_time": result["generation_time"],
            "section_id": request.section_id
        },
        "message": "Content generated successfully"
    }

@app.post("/api/proposals/{proposal_id}/improve")
async def improve_content(
    proposal_id: str,
    request: AIImproveRequest,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Improve content using mock Bedrock
    prompt = f"Improve content for section '{request.section_id}' with improvement type: {request.improvement_type}"
    
    result = await bedrock_client.generate_content(prompt)
    
    return {
        "result": {
            "content": result["content"],
            "tokens_used": result["tokens_used"],
            "generation_time": result["generation_time"],
            "improvement_type": request.improvement_type
        },
        "message": "Content improved successfully"
    }

@app.post("/api/proposals/{proposal_id}/summarize")
async def generate_summary(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate summary using mock Bedrock
    prompt = f"Generate executive summary for proposal: {proposal['title']}"
    
    result = await bedrock_client.generate_content(prompt)
    
    return {
        "result": {
            "content": result["content"],
            "tokens_used": result["tokens_used"],
            "generation_time": result["generation_time"]
        },
        "message": "Executive summary generated successfully"
    }

@app.get("/api/proposals/{proposal_id}/suggestions")
async def get_suggestions(
    proposal_id: str,
    current_user: dict = Depends(get_current_user)
):
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")
    
    proposal = proposals_db[proposal_id]
    
    if proposal["user_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Generate mock suggestions
    suggestions = []
    
    if not proposal.get("text_inputs", {}).get("initial-concept"):
        suggestions.append({
            "type": "missing_content",
            "message": "Consider adding your initial concept to improve AI analysis",
            "action": "add_content"
        })
    
    if not proposal.get("uploaded_files", {}).get("rfp-document"):
        suggestions.append({
            "type": "missing_document",
            "message": "Upload the RFP document for better alignment analysis",
            "action": "upload_file"
        })
    
    suggestions.append({
        "type": "add_summary",
        "message": "Consider adding an executive summary to your proposal",
        "action": "summarize"
    })
    
    return {"suggestions": suggestions, "count": len(suggestions)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Simple test auth endpoint
@app.post("/auth/test")
async def test_auth():
    """Test auth endpoint"""
    return {"message": "Auth endpoint working", "status": "ok"}

# Cognito Authentication Endpoints
@app.post("/auth/login")
async def cognito_login(credentials: dict):
    """Cognito login endpoint"""
    try:
        username = credentials.get("username") or credentials.get("email")
        password = credentials.get("password")
        
        if not username or not password:
            raise HTTPException(status_code=400, detail="Username and password required")
        
        print(f"Attempting login for: {username}")
        result = cognito_service.authenticate_user(username, password)
        print(f"Login result: {result}")
        
        if not result['success']:
            raise HTTPException(status_code=401, detail=result.get('message', 'Authentication failed'))
        
        return {
            "access_token": result['access_token'],
            "token_type": "bearer",
            "expires_in": result['expires_in']
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login exception: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.post("/auth/create-user")
async def create_user(user_data: dict):
    """Create new user in Cognito"""
    username = user_data.get("username")
    email = user_data.get("email")
    password = user_data.get("password")
    
    if not all([username, email, password]):
        raise HTTPException(status_code=400, detail="Username, email, and password required")
    
    result = await cognito_service.create_user(
        username=username,
        email=email,
        password=password,
        temporary_password=False
    )
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result.get('message', 'User creation failed'))
    
    return {"message": "User created successfully", "username": result['username']}
@app.post("/auth/forgot-password")
async def forgot_password(request: dict):
    """Initiate forgot password flow"""
    try:
        username = request.get("username")
        if not username:
            raise HTTPException(status_code=400, detail="Username is required")
        
        result = cognito_service.forgot_password(username)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('message', 'Failed to send reset code'))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forgot password error: {str(e)}")

@app.post("/auth/reset-password")
async def reset_password(request: dict):
    """Reset password with confirmation code"""
    try:
        username = request.get("username")
        code = request.get("code")
        new_password = request.get("new_password")
        
        if not all([username, code, new_password]):
            raise HTTPException(status_code=400, detail="Username, code, and new password are required")
        
        result = cognito_service.confirm_forgot_password(username, code, new_password)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result.get('message', 'Failed to reset password'))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset password error: {str(e)}")
