"""
Proposals Router
"""

import json
import os
import uuid
import boto3
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.middleware.auth_middleware import AuthMiddleware
from app.shared.ai.bedrock_service import BedrockService
from app.tools.admin.prompts_manager.service import PromptService
from app.tools.proposal_writer.rfp_analysis.service import SimpleRFPAnalyzer
from app.tools.proposal_writer.document_generation.service import concept_generator
from app.database.client import db_client

router = APIRouter(prefix="/api/proposals", tags=["proposals"])
security = HTTPBearer()
auth_middleware = AuthMiddleware()

# Initialize Lambda client
lambda_client = boto3.client('lambda')


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


class ConceptEvaluationUpdate(BaseModel):
    selected_sections: List[Dict[str, Any]]
    user_comments: Optional[Dict[str, str]] = None


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
        
        # TODO: Implement S3 folder deletion
        # Delete S3 folder with all documents and vectors
        # try:
        #     doc_service = DocumentService()
        #     doc_service.delete_proposal_folder(proposal_code)
        #     print(f"Deleted S3 folder for proposal: {proposal_code}")
        # except Exception as e:
        #     print(f"Warning: Failed to delete S3 folder for {proposal_code}: {str(e)}")
        #     # Continue with deletion even if S3 cleanup fails
        
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


@router.put("/{proposal_id}/concept-evaluation")
async def update_concept_evaluation(
    proposal_id: str,
    update: ConceptEvaluationUpdate,
    user=Depends(get_current_user)
):
    """Update concept evaluation with user's section selections and comments"""
    try:
        # Verify proposal exists and user has access
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
        
        # Get existing proposal with concept_analysis
        proposal = await db_client.get_item(pk=pk, sk="METADATA")
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        if proposal.get("user_id") != user.get("user_id"):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get concept_analysis from proposal
        concept_analysis = proposal.get("concept_analysis")
        if not concept_analysis:
            raise HTTPException(status_code=404, detail="Concept analysis not found. Complete Step 1 first.")
        
        print("=" * 80)
        print("🔍 UPDATE CONCEPT EVALUATION - Starting")
        print(f"📊 concept_analysis keys: {list(concept_analysis.keys())}")
        print(f"📝 Received {len(update.selected_sections)} sections from frontend")
        print("=" * 80)
        
        # Update the sections with user selections and comments
        # Handle both nested and non-nested concept_analysis structures
        if "concept_analysis" in concept_analysis:
            # Nested structure (from DynamoDB)
            inner_analysis = concept_analysis["concept_analysis"]
        else:
            inner_analysis = concept_analysis
        
        # Get sections_needing_elaboration (the correct field name)
        sections = inner_analysis.get("sections_needing_elaboration", [])
        
        if sections:
            # Create a map of section titles to user selections
            user_selections = {s["title"]: s for s in update.selected_sections}
            
            # Update each section with user's selection and comments
            for section in sections:
                # Section title can be in "section" or "title" field
                title = section.get("section", section.get("title", ""))
                if title in user_selections:
                    user_section = user_selections[title]
                    section["selected"] = user_section.get("selected", True)
                    
                    # Add user comments if provided
                    if update.user_comments and title in update.user_comments:
                        section["user_comment"] = update.user_comments[title]
                else:
                    # If section not in user_selections, mark as NOT selected
                    section["selected"] = False
            
            print(f"✅ Updated {len(sections)} sections with user selections")
            for section in sections:
                title = section.get("section", section.get("title", "Unknown"))
                selected = section.get("selected", False)
                print(f"   • {title}: selected={selected}")
            print("=" * 80)
        
        # Update concept_analysis back in the proposal METADATA record
        updated_proposal = await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression="SET concept_analysis = :analysis, updated_at = :updated",
            expression_attribute_values={
                ":analysis": concept_analysis,
                ":updated": datetime.utcnow().isoformat()
            }
        )
        
        return {
            "status": "success",
            "message": "Concept evaluation updated successfully",
            "concept_evaluation": concept_analysis
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update concept evaluation: {str(e)}")


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
        analysis_status = proposal.get("analysis_status_rfp")
        if analysis_status == "processing":
            return {
                "status": "processing",
                "message": "Analysis already in progress",
                "started_at": proposal.get("rfp_analysis_started_at")
            }
        
        # Update status to processing
        await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression="SET analysis_status_rfp = :status, rfp_analysis_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat()
            }
        )
        
        # Get proposal code for Worker
        proposal_code = proposal.get("proposalCode")
        if not proposal_code:
            raise HTTPException(status_code=400, detail="Proposal code not found")
        
        # Invoke Worker Lambda asynchronously
        print(f"🚀 Invoking AnalysisWorkerFunction for proposal {proposal_code}")
        
        # Get worker function ARN from environment variable
        worker_function_arn = os.environ.get("WORKER_FUNCTION_ARN")
        if not worker_function_arn:
            raise Exception("WORKER_FUNCTION_ARN environment variable not set")
        
        print(f"📝 Worker function ARN: {worker_function_arn}")
        
        # Invoke async
        lambda_client.invoke(
            FunctionName=worker_function_arn,
            InvocationType='Event',  # Async invocation
            Payload=json.dumps({
                "proposal_id": proposal_code,  # Send proposal_code, not UUID
                "analysis_type": "rfp"
            })
        )
        
        print(f"✅ Worker Lambda invoked successfully")
        
        return {
            "status": "processing",
            "message": "RFP analysis started. Poll /analysis-status for completion.",
            "started_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ ERROR in analyze_rfp endpoint:")
        print(error_details)
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
        
        status = proposal.get("analysis_status_rfp", "not_started")
        
        if status == "completed":
            return {
                "status": "completed",
                "rfp_analysis": proposal.get("rfp_analysis"),
                "completed_at": proposal.get("rfp_analysis_completed_at")
            }
        elif status == "failed":
            return {
                "status": "failed",
                "error": proposal.get("rfp_analysis_error", "Unknown error")
            }
        elif status == "processing":
            return {
                "status": "processing",
                "started_at": proposal.get("rfp_analysis_started_at")
            }
        else:
            return {
                "status": "not_started"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check status: {str(e)}")


@router.post("/{proposal_id}/analyze-concept")
async def analyze_concept(proposal_id: str, user=Depends(get_current_user)):
    """
    Start Concept analysis (async - returns immediately with status)
    Requires RFP analysis to be completed first
    """
    try:
        # Get proposal
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
        
        # Check if RFP analysis exists
        if not proposal.get("rfp_analysis"):
            raise HTTPException(status_code=400, detail="RFP analysis must be completed first")
        
        # Check if concept analysis already exists
        if proposal.get("concept_analysis"):
            return {
                "status": "completed",
                "concept_analysis": proposal.get("concept_analysis"),
                "message": "Concept already analyzed",
                "cached": True
            }
        
        # Check if analysis is already in progress
        analysis_status = proposal.get("analysis_status_concept")
        if analysis_status == "processing":
            return {
                "status": "processing",
                "message": "Concept analysis already in progress",
                "started_at": proposal.get("concept_analysis_started_at")
            }
        
        # Update status to processing
        await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression="SET analysis_status_concept = :status, concept_analysis_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat()
            }
        )
        
        # Invoke Worker Lambda asynchronously
        print(f"🚀 Invoking AnalysisWorkerFunction for concept analysis: {proposal_code}")
        
        worker_function_arn = os.environ.get("WORKER_FUNCTION_ARN")
        if not worker_function_arn:
            raise Exception("WORKER_FUNCTION_ARN environment variable not set")
        
        lambda_client.invoke(
            FunctionName=worker_function_arn,
            InvocationType='Event',
            Payload=json.dumps({
                "proposal_id": proposal_code,
                "analysis_type": "concept"
            })
        )
        
        print(f"✅ Concept analysis worker invoked successfully")
        
        return {
            "status": "processing",
            "message": "Concept analysis started. Poll /concept-status for completion.",
            "started_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ ERROR in analyze_concept endpoint:")
        print(error_details)
        raise HTTPException(
            status_code=500,
            detail=f"Concept analysis failed: {str(e)}"
        )


@router.get("/{proposal_id}/concept-status")
async def get_concept_status(proposal_id: str, user=Depends(get_current_user)):
    """Poll for Concept analysis completion status"""
    try:
        # Get proposal
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
        
        status = proposal.get("analysis_status_concept", "not_started")
        
        if status == "completed":
            return {
                "status": "completed",
                "concept_analysis": proposal.get("concept_analysis"),
                "completed_at": proposal.get("concept_analysis_completed_at")
            }
        elif status == "failed":
            return {
                "status": "failed",
                "error": proposal.get("concept_analysis_error", "Unknown error")
            }
        elif status == "processing":
            return {
                "status": "processing",
                "started_at": proposal.get("concept_analysis_started_at")
            }
        else:
            return {
                "status": "not_started"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check concept status: {str(e)}")


@router.post("/{proposal_id}/generate-concept-document")
async def generate_concept_document(
    proposal_id: str,
    concept_evaluation: dict,
    user=Depends(get_current_user)
):
    """
    Generate updated concept document based on RFP analysis and user's concept evaluation
    
    This endpoint:
    1. Validates proposal exists
    2. Sets status to "processing"
    3. Invokes Worker Lambda asynchronously
    4. Returns immediately with status
    
    Frontend should poll /concept-document-status for completion
    """
    try:
        user_id = user.get('user_id')
        print(f"🟢 Generate concept document request for proposal: {proposal_id}")
        
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user_id}",
            index_name="GSI1"
        )
        
        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        # Validate required data exists
        rfp_analysis = proposal.get('rfp_analysis')
        if not rfp_analysis:
            raise HTTPException(
                status_code=400,
                detail="RFP analysis not found. Complete Step 1 first."
            )
        
        concept_analysis = proposal.get('concept_analysis')
        if not concept_analysis:
            raise HTTPException(
                status_code=400,
                detail="Concept analysis not found. Complete Step 1 first."
            )
        
        # 🔥 CRITICAL FIX: Build concept_evaluation from DynamoDB data (which has selected sections)
        # The concept_evaluation param from frontend is just a trigger, not the source of truth
        print("=" * 80)
        print("🔍 Building concept_evaluation from DynamoDB...")
        print(f"📊 concept_analysis keys: {list(concept_analysis.keys()) if isinstance(concept_analysis, dict) else 'NOT A DICT'}")
        
        # Use the concept_analysis from DynamoDB (which has user selections)
        final_concept_evaluation = {
            'concept_analysis': concept_analysis,
            'status': 'completed'
        }
        
        print(f"✅ Final concept_evaluation has {len(concept_analysis.get('sections_needing_elaboration', []))} sections")
        print("=" * 80)
        
        # Update status to processing
        await db_client.update_item(
            pk=proposal['PK'],
            sk=proposal['SK'],
            update_expression="SET concept_document_status = :status, concept_document_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat()
            }
        )
        
        # Invoke Worker Lambda asynchronously
        worker_function = os.getenv('WORKER_FUNCTION_ARN')
        
        # Get proposal code for Worker (same as Step 1)
        proposal_code = proposal.get('proposalCode')
        if not proposal_code:
            raise HTTPException(status_code=400, detail="Proposal code not found")
        
        payload = {
            'analysis_type': 'concept_document',
            'proposal_id': proposal_code,  # Send proposal_code, not UUID
            'user_id': user_id,
            'concept_evaluation': final_concept_evaluation  # 🔥 Use DynamoDB data, not request param
        }
        
        print(f"📡 Invoking worker lambda for concept document generation: {proposal_id}")
        
        lambda_client.invoke(
            FunctionName=worker_function,
            InvocationType='Event',  # Asynchronous
            Payload=json.dumps(payload)
        )
        
        print(f"✅ Worker lambda invoked successfully for {proposal_id}")
        
        # Return immediately
        return {
            'status': 'processing',
            'message': 'Concept document generation started. Poll /concept-document-status for updates.'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error starting concept document generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{proposal_id}/concept-document-status")
async def get_concept_document_status(
    proposal_id: str,
    user=Depends(get_current_user)
):
    """Get concept document generation status"""
    try:
        all_proposals = await db_client.query_items(
            pk=f"USER#{user.get('user_id')}",
            index_name="GSI1"
        )
        
        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        status = proposal.get('concept_document_status', 'not_started')
        
        response = {
            'status': status,
            'started_at': proposal.get('concept_document_started_at'),
            'completed_at': proposal.get('concept_document_completed_at')
        }
        
        if status == 'completed':
            response['concept_document'] = proposal.get('concept_document_v2')
        elif status == 'failed':
            response['error'] = proposal.get('concept_document_error')
        
        return response
        
    except Exception as e:
        print(f"❌ Error getting concept document status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{proposal_id}/concept-evaluation")
async def get_concept_evaluation(
    proposal_id: str,
    user=Depends(get_current_user)
):
    """
    Get the saved concept_evaluation from DynamoDB
    """
    try:
        user_id = user.get('user_id')
        print(f"📥 Getting concept evaluation for proposal: {proposal_id}")
        
        # Get proposal
        all_proposals = await db_client.query_items(
            pk=f"USER#{user_id}",
            index_name="GSI1"
        )
        
        proposal = None
        for p in all_proposals:
            if p.get("id") == proposal_id:
                proposal = p
                break
        
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        concept_evaluation = proposal.get('concept_evaluation')
        
        if not concept_evaluation:
            # Fallback to concept_analysis if concept_evaluation doesn't exist yet
            concept_evaluation = proposal.get('concept_analysis')
        
        if not concept_evaluation:
            raise HTTPException(status_code=404, detail="No concept evaluation found")
        
        print(f"✅ Concept evaluation retrieved for {proposal_id}")
        
        return {
            'concept_evaluation': concept_evaluation
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting concept evaluation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{proposal_id}/analyze-step-1")
async def analyze_step_1(proposal_id: str, user=Depends(get_current_user)):
    """
    Start Step 1 analysis: RFP + Reference Proposals in parallel

    This endpoint:
    1. Triggers RFP analysis
    2. Triggers Reference Proposals analysis
    3. Both run in parallel via separate Lambda invocations
    4. Returns immediately with status

    Frontend should poll /step-1-status for completion
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

        # Get proposal code for Worker
        proposal_code = proposal.get("proposalCode")
        if not proposal_code:
            raise HTTPException(status_code=400, detail="Proposal code not found")

        # Get worker function ARN from environment variable
        worker_function_arn = os.environ.get("WORKER_FUNCTION_ARN")
        if not worker_function_arn:
            raise Exception("WORKER_FUNCTION_ARN environment variable not set")

        # Track which analyses to start
        analyses_started = []

        # ========== RFP ANALYSIS ==========
        # Check if RFP analysis already exists (no re-analysis)
        if proposal.get("rfp_analysis"):
            print(f"✓ RFP analysis already completed for {proposal_code}")
            analyses_started.append({
                "type": "rfp",
                "status": "completed",
                "cached": True
            })
        else:
            # Check if RFP analysis is already in progress
            rfp_status = proposal.get("analysis_status_rfp")
            if rfp_status == "processing":
                print(f"⏳ RFP analysis already in progress for {proposal_code}")
                analyses_started.append({
                    "type": "rfp",
                    "status": "processing",
                    "already_running": True
                })
            else:
                # Start RFP analysis
                await db_client.update_item(
                    pk=pk,
                    sk="METADATA",
                    update_expression="SET analysis_status_rfp = :status, rfp_analysis_started_at = :started",
                    expression_attribute_values={
                        ":status": "processing",
                        ":started": datetime.utcnow().isoformat()
                    }
                )

                print(f"🚀 Invoking RFP analysis for {proposal_code}")
                lambda_client.invoke(
                    FunctionName=worker_function_arn,
                    InvocationType='Event',  # Async invocation
                    Payload=json.dumps({
                        "proposal_id": proposal_code,
                        "analysis_type": "rfp"
                    })
                )

                analyses_started.append({
                    "type": "rfp",
                    "status": "processing",
                    "started": True
                })

        # ========== REFERENCE PROPOSALS ANALYSIS ==========
        # Check if Reference Proposals analysis already exists
        if proposal.get("reference_proposal_analysis"):
            print(f"✓ Reference Proposals analysis already completed for {proposal_code}")
            analyses_started.append({
                "type": "reference_proposals",
                "status": "completed",
                "cached": True
            })
        else:
            # Check if Reference Proposals analysis is already in progress
            ref_status = proposal.get("analysis_status_reference_proposals")
            if ref_status == "processing":
                print(f"⏳ Reference Proposals analysis already in progress for {proposal_code}")
                analyses_started.append({
                    "type": "reference_proposals",
                    "status": "processing",
                    "already_running": True
                })
            else:
                # Start Reference Proposals analysis
                await db_client.update_item(
                    pk=pk,
                    sk="METADATA",
                    update_expression="SET analysis_status_reference_proposals = :status, reference_proposals_started_at = :started",
                    expression_attribute_values={
                        ":status": "processing",
                        ":started": datetime.utcnow().isoformat()
                    }
                )

                print(f"🚀 Invoking Reference Proposals analysis for {proposal_code}")
                lambda_client.invoke(
                    FunctionName=worker_function_arn,
                    InvocationType='Event',  # Async invocation
                    Payload=json.dumps({
                        "proposal_id": proposal_code,
                        "analysis_type": "reference_proposals"
                    })
                )

                analyses_started.append({
                    "type": "reference_proposals",
                    "status": "processing",
                    "started": True
                })

        print(f"✅ Step 1 analysis triggered successfully for {proposal_code}")

        return {
            "status": "processing",
            "message": "Step 1 analyses started. Poll /step-1-status for completion.",
            "analyses": analyses_started,
            "started_at": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ ERROR in analyze_step_1 endpoint:")
        print(error_details)
        raise HTTPException(
            status_code=500,
            detail=f"Step 1 analysis failed: {str(e)}"
        )


@router.get("/{proposal_id}/step-1-status")
async def get_step_1_status(proposal_id: str, user=Depends(get_current_user)):
    """
    Poll for Step 1 analysis completion status
    Returns combined status of RFP and Reference Proposals analyses
    """
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

        # Get status of both analyses
        rfp_status = proposal.get("analysis_status_rfp", "not_started")
        ref_status = proposal.get("analysis_status_reference_proposals", "not_started")

        # Build response
        response = {
            "rfp_analysis": {
                "status": rfp_status
            },
            "reference_proposals_analysis": {
                "status": ref_status
            }
        }

        # Add RFP details
        if rfp_status == "completed":
            response["rfp_analysis"]["data"] = proposal.get("rfp_analysis")
            response["rfp_analysis"]["completed_at"] = proposal.get("rfp_analysis_completed_at")
        elif rfp_status == "failed":
            response["rfp_analysis"]["error"] = proposal.get("rfp_analysis_error", "Unknown error")
        elif rfp_status == "processing":
            response["rfp_analysis"]["started_at"] = proposal.get("rfp_analysis_started_at")

        # Add Reference Proposals details
        if ref_status == "completed":
            response["reference_proposals_analysis"]["data"] = proposal.get("reference_proposal_analysis")
            response["reference_proposals_analysis"]["completed_at"] = proposal.get("reference_proposals_completed_at")
        elif ref_status == "failed":
            response["reference_proposals_analysis"]["error"] = proposal.get("reference_proposals_error", "Unknown error")
        elif ref_status == "processing":
            response["reference_proposals_analysis"]["started_at"] = proposal.get("reference_proposals_started_at")

        # Determine overall status
        if rfp_status == "completed" and ref_status == "completed":
            response["overall_status"] = "completed"
        elif rfp_status == "failed" or ref_status == "failed":
            response["overall_status"] = "failed"
        elif rfp_status == "processing" or ref_status == "processing":
            response["overall_status"] = "processing"
        else:
            response["overall_status"] = "not_started"

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check Step 1 status: {str(e)}")


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
