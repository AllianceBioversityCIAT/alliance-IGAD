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
from ..services.simple_rfp_analyzer import SimpleRFPAnalyzer
from ..services.document_service import DocumentService
from ..database.client import db_client

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


class PromptWithCategoriesRequest(BaseModel):
    prompt_id: str
    categories: List[str]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get current user from token"""
    return auth_middleware.verify_token(credentials)


def generate_proposal_code() -> str:
    """Generate unique proposal code in format PROP-YYYYMMDD-XXXX"""
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    random_suffix = str(uuid.uuid4())[:4].upper()
    return f"PROP-{date_str}-{random_suffix}"


@router.post("")
async def create_proposal(proposal: ProposalCreate, user=Depends(get_current_user)):
    """Create a new proposal - only one draft allowed per user"""
    try:
        # Check if user already has a draft proposal
        existing_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}",
            index_name="GSI1",
            scan_index_forward=False
        )
        
        # Find existing draft
        existing_draft = None
        for prop in existing_proposals:
            if prop.get("status") == "draft":
                existing_draft = prop
                break
        
        # If draft exists, return it instead of creating new one
        if existing_draft:
            response_proposal = {k: v for k, v in existing_draft.items() 
                               if k not in ["PK", "SK", "GSI1PK", "GSI1SK"]}
            return {
                "proposal": response_proposal,
                "message": "Returning existing draft proposal"
            }
        
        # Create new proposal if no draft exists
        proposal_id = str(uuid.uuid4())
        proposal_code = generate_proposal_code()
        
        now = datetime.utcnow().isoformat()
        
        new_proposal = {
            "PK": f"PROPOSAL#{proposal_code}",
            "SK": "METADATA",
            "id": proposal_id,
            "proposalCode": proposal_code,
            "title": proposal.title,
            "description": proposal.description,
            "template_id": proposal.template_id,
            "status": "draft",
            "created_at": now,
            "updated_at": now,
            "user_id": user.get("user_id"),
            "user_email": user.get("email"),
            "user_name": user.get("name"),
            "uploaded_files": {},
            "text_inputs": {},
            "metadata": {},
            "GSI1PK": f"USER#{user.get('user_id')}",
            "GSI1SK": f"PROPOSAL#{now}",
        }

        await db_client.put_item(new_proposal)
        
        # Return proposal without DynamoDB keys
        response_proposal = {k: v for k, v in new_proposal.items() 
                           if k not in ["PK", "SK", "GSI1PK", "GSI1SK"]}
        
        return {"proposal": response_proposal}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create proposal: {str(e)}")


@router.get("")
async def get_proposals(user=Depends(get_current_user)):
    """Get all proposals for the current user"""
    try:
        # Query using GSI1 to get all proposals for this user
        items = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}",
            index_name="GSI1",
            scan_index_forward=False  # Most recent first
        )
        
        # Remove DynamoDB keys from response
        proposals = []
        for item in items:
            proposal = {k: v for k, v in item.items() 
                       if k not in ["PK", "SK", "GSI1PK", "GSI1SK"]}
            proposals.append(proposal)
        
        return {"proposals": proposals}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch proposals: {str(e)}")


@router.get("/{proposal_id}")
async def get_proposal(proposal_id: str, user=Depends(get_current_user)):
    """Get a specific proposal by ID or proposal code"""
    try:
        # Check if it's a proposal code (PROP-YYYYMMDD-XXXX) or UUID
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
        else:
            # Need to query by ID - use GSI to find it
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            # Find the proposal with matching ID
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
        
        # Get the proposal
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Verify ownership
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Remove DynamoDB keys from response
        response_proposal = {k: v for k, v in proposal.items() 
                           if k not in ["PK", "SK", "GSI1PK", "GSI1SK"]}
        
        return response_proposal
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch proposal: {str(e)}")


@router.put("/{proposal_id}")
async def update_proposal(
    proposal_id: str, proposal_update: ProposalUpdate, user=Depends(get_current_user)
):
    """Update a proposal"""
    try:
        # First get the proposal to verify ownership and get PK
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
        else:
            # Query to find proposal by ID
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
        
        # Get existing proposal
        existing_proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not existing_proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if existing_proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Build update expression
        update_data = proposal_update.dict(exclude_unset=True)
        if not update_data:
            return {k: v for k, v in existing_proposal.items() 
                   if k not in ["PK", "SK", "GSI1PK", "GSI1SK"]}
        
        update_expression_parts = []
        expression_attribute_values = {}
        expression_attribute_names = {}
        
        for i, (field, value) in enumerate(update_data.items()):
            attr_name = f"#attr{i}"
            attr_value = f":val{i}"
            update_expression_parts.append(f"{attr_name} = {attr_value}")
            expression_attribute_names[attr_name] = field
            expression_attribute_values[attr_value] = value
        
        # Always update updated_at
        update_expression_parts.append("#updated_at = :updated_at")
        expression_attribute_names["#updated_at"] = "updated_at"
        expression_attribute_values[":updated_at"] = datetime.utcnow().isoformat()
        
        update_expression = "SET " + ", ".join(update_expression_parts)
        
        updated_proposal = await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression=update_expression,
            expression_attribute_values=expression_attribute_values,
            expression_attribute_names=expression_attribute_names
        )
        
        # Remove DynamoDB keys from response
        response_proposal = {k: v for k, v in updated_proposal.items() 
                           if k not in ["PK", "SK", "GSI1PK", "GSI1SK"]}
        
        return response_proposal
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update proposal: {str(e)}")


@router.delete("/{proposal_id}")
async def delete_proposal(proposal_id: str, user=Depends(get_current_user)):
    """Delete a proposal"""
    try:
        # First get the proposal to verify ownership and get PK
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
        else:
            # Query to find proposal by ID
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
        
        # Get and verify ownership
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get proposal code for S3 cleanup
        proposal_code = proposal.get("proposalCode", proposal_id)
        
        # Delete S3 folder with all documents and vectors
        try:
            doc_service = DocumentService()
            doc_service.delete_proposal_folder(proposal_code)
            print(f"Deleted S3 folder for proposal: {proposal_code}")
        except Exception as e:
            print(f"Warning: Failed to delete S3 folder for {proposal_code}: {str(e)}")
            # Continue with deletion even if S3 cleanup fails
        
        # Delete the proposal from DynamoDB
        await db_client.delete_item(pk=pk, sk="METADATA")
        
        return {"message": "Proposal deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete proposal: {str(e)}")


@router.post("/{proposal_id}/generate")
async def generate_ai_content(
    proposal_id: str, request: AIGenerateRequest, user=Depends(get_current_user)
):
    """Generate AI content for a proposal section"""
    try:
        # First verify the proposal exists and user has access
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
        else:
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
        
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")

        # Initialize Bedrock service
        bedrock_service = BedrockService()

        # Generate content using AI
        generated_content = await bedrock_service.generate_content(
            section_id=request.section_id, context_data=request.context_data or {}
        )

        return {"generated_content": generated_content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("/{proposal_id}/improve")
async def improve_ai_content(
    proposal_id: str, request: AIImproveRequest, user=Depends(get_current_user)
):
    """Improve existing content using AI"""
    try:
        # First verify the proposal exists and user has access
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
        else:
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
        
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")

        # Initialize Bedrock service
        bedrock_service = BedrockService()

        # Improve content using AI
        improved_content = await bedrock_service.improve_content(
            section_id=request.section_id, improvement_type=request.improvement_type
        )

        return {"improved_content": improved_content}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI improvement failed: {str(e)}")


@router.post("/{proposal_id}/analyze-rfp")
async def analyze_rfp(proposal_id: str, user=Depends(get_current_user)):
    """
    Start RFP analysis (async - returns immediately with status)
    Frontend should poll GET /{proposal_id}/analysis-status for completion
    """
    try:
        # Verify proposal ownership
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
            proposal_code = proposal_id
        else:
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
            proposal_code = proposal_item.get("proposalCode", proposal_id)
        
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Check if RFP analysis already exists (no re-analysis)
        if proposal.get("rfp_analysis"):
            return {
                "status": "completed",
                "rfp_analysis": proposal.get("rfp_analysis"),
                "message": "RFP already analyzed",
                "cached": True
            }
        
        # Check if analysis is already in progress
        analysis_status = proposal.get("analysis_status")
        if analysis_status == "processing":
            return {
                "status": "processing",
                "message": "Analysis already in progress"
            }
        
        # Start analysis SYNCHRONOUSLY (Lambda doesn't work well with threads)
        # The timeout is 300 seconds, which should be enough
        try:
            analyzer = SimpleRFPAnalyzer()
            result = await analyzer.analyze_rfp(
                proposal_code=proposal_code,
                proposal_id=proposal.get("id")
            )
            
            # Update proposal with results
            await db_client.update_item(
                pk=pk,
                sk="METADATA",
                update_expression="SET rfp_analysis = :analysis, analysis_status = :status, analysis_completed_at = :completed",
                expression_attribute_values={
                    ":analysis": result.get("rfp_analysis"),
                    ":status": "completed",
                    ":completed": datetime.utcnow().isoformat()
                }
            )
            
            return {
                "status": "completed",
                "rfp_analysis": result.get("rfp_analysis"),
                "message": "RFP analysis completed successfully."
            }
            
        except Exception as e:
            print(f"❌ Analysis error: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Update proposal with error
            await db_client.update_item(
                pk=pk,
                sk="METADATA",
                update_expression="SET analysis_status = :status, analysis_error = :error",
                expression_attribute_values={
                    ":status": "failed",
                    ":error": str(e)
                }
            )
            
            raise HTTPException(
                status_code=500,
                detail=f"RFP analysis failed: {str(e)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RFP analysis failed: {str(e)}"
        )


@router.get("/{proposal_id}/analysis-status")
async def get_analysis_status(proposal_id: str, user=Depends(get_current_user)):
    """Poll for RFP analysis completion status"""
    try:
        # Verify proposal ownership
        if proposal_id.startswith("PROP-"):
            pk = f"PROPOSAL#{proposal_id}"
        else:
            items = await db_client.query_items(
                pk=f"USER#{user.get('user_id')}",
                index_name="GSI1"
            )
            
            proposal_item = None
            for item in items:
                if item.get("id") == proposal_id:
                    proposal_item = item
                    break
            
            if not proposal_item:
                raise HTTPException(status_code=404, detail="Proposal not found")
            
            pk = proposal_item["PK"]
        
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        status = proposal.get("analysis_status", "not_started")
        
        if status == "completed":
            return {
                "status": "completed",
                "rfp_analysis": proposal.get("rfp_analysis"),
                "completed_at": proposal.get("analysis_completed_at")
            }
        elif status == "failed":
            return {
                "status": "failed",
                "error": proposal.get("analysis_error", "Unknown error")
            }
        elif status == "processing":
            return {
                "status": "processing",
                "started_at": proposal.get("analysis_started_at")
            }
        else:
            return {
                "status": "not_started"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}")


@router.post("/prompts/with-categories")
async def get_prompt_with_categories(
    request: PromptWithCategoriesRequest, user=Depends(get_current_user)
):
    """Get a prompt with categories injected as variables"""
    try:
        # Initialize prompt service
        prompt_service = PromptService()

        # Get prompt with injected categories
        prompt = await prompt_service.get_prompt_with_categories(
            request.prompt_id, request.categories
        )

        if not prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        return {
            "prompt": prompt,
            "injected_categories": request.categories,
            "available_variables": [
                f"{{{{category_{i}}}}}" for i in range(1, len(request.categories) + 1)
            ] + ["{{categories}}"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get prompt with categories: {str(e)}")
