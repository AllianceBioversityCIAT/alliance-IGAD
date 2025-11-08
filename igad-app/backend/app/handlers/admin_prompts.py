from fastapi import APIRouter, HTTPException, Depends, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional, List
from app.models.prompt_model import (
    Prompt, PromptCreate, PromptUpdate, PromptListResponse,
    PromptPreviewRequest, PromptPreviewResponse, PublishPromptRequest,
    ProposalSection, PromptStatus
)
from app.services.prompt_service import PromptService
from app.services.bedrock_service import BedrockService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/prompts", tags=["admin-prompts"])
security = HTTPBearer()

# Initialize services
prompt_service = PromptService()
bedrock_service = BedrockService()

def get_current_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current admin user - simplified for MVP"""
    # TODO: Implement proper admin verification
    return {
        "user_id": "admin-user-123",
        "email": "admin@igad.org",
        "role": "admin"
    }

@router.get("/list", response_model=PromptListResponse)
async def list_prompts(
    section: Optional[ProposalSection] = Query(None),
    status: Optional[PromptStatus] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_admin_user)
):
    """List prompts with filtering and pagination"""
    try:
        return await prompt_service.list_prompts(
            section=section,
            status=status,
            tag=tag,
            search=search,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Error listing prompts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list prompts"
        )

@router.get("/{prompt_id}", response_model=Prompt)
async def get_prompt(
    prompt_id: str,
    version: Optional[str] = Query(None, description="Specific version number or 'latest'"),
    current_user: dict = Depends(get_current_admin_user)
):
    """Get a specific prompt version"""
    try:
        # Convert version parameter
        version_param = None
        if version and version != "latest":
            try:
                version_param = int(version)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Version must be a number or 'latest'"
                )
        
        prompt = await prompt_service.get_prompt(prompt_id, version_param)
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prompt not found"
            )
        return prompt
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prompt"
        )

@router.post("/create", response_model=Prompt, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    prompt_data: PromptCreate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Create a new prompt"""
    try:
        return await prompt_service.create_prompt(prompt_data, current_user["user_id"])
    except Exception as e:
        logger.error(f"Error creating prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create prompt"
        )

@router.put("/{prompt_id}/update", response_model=Prompt)
async def update_prompt(
    prompt_id: str,
    prompt_data: PromptUpdate,
    current_user: dict = Depends(get_current_admin_user)
):
    """Update a prompt (creates new version if published, edits draft if draft)"""
    try:
        return await prompt_service.update_prompt(prompt_id, prompt_data, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update prompt"
        )

@router.post("/{prompt_id}/publish", response_model=Prompt)
async def publish_prompt(
    prompt_id: str,
    publish_data: PublishPromptRequest,
    current_user: dict = Depends(get_current_admin_user)
):
    """Publish a specific version of a prompt"""
    try:
        return await prompt_service.publish_prompt(
            prompt_id, 
            publish_data.version, 
            current_user["user_id"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error publishing prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish prompt"
        )

@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: str,
    version: Optional[int] = Query(None, description="Specific version or all versions if not provided"),
    current_user: dict = Depends(get_current_admin_user)
):
    """Delete a prompt version or all versions"""
    try:
        success = await prompt_service.delete_prompt(prompt_id, version)
        if success:
            return {"message": "Prompt deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Prompt not found"
            )
    except Exception as e:
        logger.error(f"Error deleting prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prompt"
        )

@router.post("/preview", response_model=PromptPreviewResponse)
async def preview_prompt(
    preview_data: PromptPreviewRequest,
    current_user: dict = Depends(get_current_admin_user)
):
    """Preview a prompt using Bedrock (no persistence)"""
    try:
        return await bedrock_service.preview_prompt(preview_data)
    except Exception as e:
        logger.error(f"Error previewing prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to preview prompt"
        )

# Runtime endpoint (non-admin)
@router.get("/section/{section}", response_model=Prompt, include_in_schema=False)
async def get_prompt_by_section(
    section: ProposalSection,
    published: bool = Query(True, description="Only return published prompts")
):
    """Get the latest published prompt for a section (runtime endpoint)"""
    try:
        if not published:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only published prompts are available for runtime"
            )
        
        prompt = await prompt_service.get_prompt_by_section(section)
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No published prompt found for section {section.value}"
            )
        
        return prompt
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prompt by section {section}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prompt"
        )
