"""
Proposals Router
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from ..middleware.auth_middleware import AuthMiddleware
from ..services.bedrock_service import BedrockService
from ..services.prompt_service import PromptService

router = APIRouter(prefix="/api/proposals", tags=["proposals"])
security = HTTPBearer()
auth_middleware = AuthMiddleware()


# Pydantic models
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


# Mock data storage
proposals_db = {}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get current user from token"""
    return auth_middleware.verify_token(credentials)


@router.post("")
async def create_proposal(proposal: ProposalCreate, user=Depends(get_current_user)):
    """Create a new proposal"""
    proposal_id = str(uuid.uuid4())

    new_proposal = {
        "id": proposal_id,
        "title": proposal.title,
        "description": proposal.description,
        "template_id": proposal.template_id,
        "status": "draft",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "user_id": user.get("user_id"),
        "uploaded_files": {},
        "text_inputs": {},
        "metadata": {},
    }

    proposals_db[proposal_id] = new_proposal
    return {"proposal": new_proposal}


@router.get("")
async def get_proposals(user=Depends(get_current_user)):
    """Get all proposals for the current user"""
    user_proposals = [
        proposal
        for proposal in proposals_db.values()
        if proposal.get("user_id") == user.get("user_id")
    ]
    return {"proposals": user_proposals}


@router.get("/{proposal_id}")
async def get_proposal(proposal_id: str, user=Depends(get_current_user)):
    """Get a specific proposal"""
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = proposals_db[proposal_id]
    if proposal.get("user_id") != user.get("user_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    return proposal


@router.put("/{proposal_id}")
async def update_proposal(
    proposal_id: str, proposal_update: ProposalUpdate, user=Depends(get_current_user)
):
    """Update a proposal"""
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = proposals_db[proposal_id]
    if proposal.get("user_id") != user.get("user_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    # Update fields
    update_data = proposal_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        proposal[field] = value

    proposal["updated_at"] = datetime.utcnow().isoformat()
    proposals_db[proposal_id] = proposal

    return proposal


@router.delete("/{proposal_id}")
async def delete_proposal(proposal_id: str, user=Depends(get_current_user)):
    """Delete a proposal"""
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = proposals_db[proposal_id]
    if proposal.get("user_id") != user.get("user_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    del proposals_db[proposal_id]
    return {"message": "Proposal deleted successfully"}


@router.post("/{proposal_id}/generate")
async def generate_ai_content(
    proposal_id: str, request: AIGenerateRequest, user=Depends(get_current_user)
):
    """Generate AI content for a proposal section"""
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = proposals_db[proposal_id]
    if proposal.get("user_id") != user.get("user_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        # Initialize Bedrock service
        bedrock_service = BedrockService()

        # Generate content using AI
        generated_content = await bedrock_service.generate_content(
            section_id=request.section_id, context_data=request.context_data or {}
        )

        return {"generated_content": generated_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("/{proposal_id}/improve")
async def improve_ai_content(
    proposal_id: str, request: AIImproveRequest, user=Depends(get_current_user)
):
    """Improve existing content using AI"""
    if proposal_id not in proposals_db:
        raise HTTPException(status_code=404, detail="Proposal not found")

    proposal = proposals_db[proposal_id]
    if proposal.get("user_id") != user.get("user_id"):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        # Initialize Bedrock service
        bedrock_service = BedrockService()

        # Improve content using AI
        improved_content = await bedrock_service.improve_content(
            section_id=request.section_id, improvement_type=request.improvement_type
        )

        return {"improved_content": improved_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI improvement failed: {str(e)}")
