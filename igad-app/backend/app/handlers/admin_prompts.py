import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.shared.ai.bedrock_service import BedrockService
from app.shared.schemas.prompt_model import (
    Comment,
    CommentCreate,
    Prompt,
    PromptCreate,
    PromptHistory,
    PromptListResponse,
    PromptPreviewRequest,
    PromptPreviewResponse,
    PromptUpdate,
    ProposalSection,
)
from app.tools.admin.prompts_manager.service import PromptService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/prompts", tags=["admin-prompts"])
security = HTTPBearer()

# Initialize services
prompt_service = PromptService()
bedrock_service = BedrockService()


def get_current_admin_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Get current admin user - uses real user from token"""
    from app.middleware.auth_middleware import auth_middleware

    user_data = auth_middleware.verify_token(credentials)

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    # Return real user data from token
    return {
        "user_id": user_data.get("user_id", "unknown"),
        "email": user_data.get("email", "unknown@example.com"),
        "role": user_data.get("role", "user"),
        "is_admin": user_data.get("is_admin", False),
    }


@router.get("/", response_model=PromptListResponse)
async def get_prompts(
    section: Optional[ProposalSection] = Query(None),
    sub_section: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin_user),
):
    """Get prompts - main endpoint for frontend"""
    try:
        return await prompt_service.list_prompts(
            section=section,
            sub_section=sub_section,
            is_active=True,
            limit=100,
            offset=0,
        )
    except Exception as e:
        logger.error(f"Error getting prompts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prompts",
        )


@router.get("/debug", response_model=PromptListResponse)
async def debug_prompts(
    section: Optional[ProposalSection] = Query(None),
    sub_section: Optional[str] = Query(None),
):
    """Debug endpoint - no auth required"""
    try:
        return await prompt_service.list_prompts(
            section=section,
            sub_section=sub_section,
            is_active=True,
            limit=100,
            offset=0,
        )
    except Exception as e:
        logger.error(f"Error getting prompts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get prompts: {str(e)}",
        )


@router.get("/list", response_model=PromptListResponse)
async def list_prompts(
    section: Optional[ProposalSection] = Query(None),
    sub_section: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    route: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_admin_user),
):
    """List prompts with filtering and pagination"""
    try:
        return await prompt_service.list_prompts(
            section=section,
            sub_section=sub_section,
            tag=tag,
            search=search,
            route=route,
            is_active=is_active,
            limit=limit,
            offset=offset,
        )
    except Exception as e:
        logger.error(f"Error listing prompts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list prompts",
        )


@router.get("/{prompt_id}", response_model=Prompt)
async def get_prompt(
    prompt_id: str,
    version: Optional[str] = Query(
        None, description="Specific version number or 'latest'"
    ),
    current_user: dict = Depends(get_current_admin_user),
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
                    detail="Version must be a number or 'latest'",
                )

        prompt = await prompt_service.get_prompt(prompt_id, version_param)
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found"
            )
        return prompt
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prompt",
        )


@router.post("/create", response_model=Prompt, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    prompt_data: PromptCreate, current_user: dict = Depends(get_current_admin_user)
):
    """Create a new prompt"""
    try:
        return await prompt_service.create_prompt(prompt_data, current_user["email"])
    except ValueError as e:
        # Business logic errors (like duplicates)
        logger.error(f"Validation error creating prompt: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create prompt",
        )


@router.put("/{prompt_id}/update", response_model=Prompt)
async def update_prompt(
    prompt_id: str,
    prompt_data: PromptUpdate,
    current_user: dict = Depends(get_current_admin_user),
):
    """Update a prompt (creates new version if published, edits draft if draft)"""
    try:
        return await prompt_service.update_prompt(
            prompt_id, prompt_data, current_user["email"]
        )
    except ValueError as e:
        # Handle both not found and business logic errors
        if "not found" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        else:
            # Business logic errors (like duplicates)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update prompt",
        )


@router.delete("/{prompt_id}")
async def delete_prompt(
    prompt_id: str,
    version: Optional[int] = Query(
        None, description="Specific version or all versions if not provided"
    ),
    current_user: dict = Depends(get_current_admin_user),
):
    """Delete a prompt version or all versions"""
    try:
        success = await prompt_service.delete_prompt(
            prompt_id, version, user_id=current_user["email"]
        )
        if success:
            return {"message": "Prompt deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found"
            )
    except Exception as e:
        logger.error(f"Error deleting prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prompt",
        )


@router.post("/preview", response_model=PromptPreviewResponse)
async def preview_prompt(
    preview_data: PromptPreviewRequest,
    current_user: dict = Depends(get_current_admin_user),
):
    """Preview a prompt using Bedrock (no persistence)"""
    try:
        return await bedrock_service.preview_prompt(preview_data)
    except Exception as e:
        logger.error(f"Error previewing prompt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to preview prompt",
        )


# Runtime endpoint (non-admin)
@router.get("/section/{section}", response_model=Prompt, include_in_schema=False)
async def get_prompt_by_section(
    section: ProposalSection,
    published: bool = Query(True, description="Only return published prompts"),
):
    """Get the latest published prompt for a section (runtime endpoint)"""
    try:
        if not published:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only published prompts are available for runtime",
            )

        prompt = await prompt_service.get_prompt_by_section(section)
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No published prompt found for section {section.value}",
            )

        return prompt
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting prompt by section {section}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prompt",
        )


@router.post("/{prompt_id}/toggle-active", response_model=Prompt)
async def toggle_prompt_active(
    prompt_id: str, current_user: dict = Depends(get_current_admin_user)
):
    """Toggle prompt active status"""
    try:
        prompt = await prompt_service.toggle_active(
            prompt_id, user_id=current_user["email"]
        )
        if not prompt:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Prompt not found"
            )
        return prompt
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error toggling prompt active {prompt_id}: {e}")
        import traceback

        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle prompt active status: {str(e)}",
        )


# Comments endpoints
@router.post("/{prompt_id}/comments", response_model=Comment)
async def add_comment(
    prompt_id: str,
    comment_data: CommentCreate,
    current_user: dict = Depends(get_current_admin_user),
):
    """Add a comment to a prompt"""
    try:
        return await prompt_service.add_comment(
            prompt_id,
            comment_data,
            current_user["email"],
            current_user["email"],  # Use email as both user_id and user_name
        )
    except Exception as e:
        logger.error(f"Error adding comment to prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add comment",
        )


@router.get("/{prompt_id}/comments", response_model=List[Comment])
async def get_comments(
    prompt_id: str, current_user: dict = Depends(get_current_admin_user)
):
    """Get all comments for a prompt"""
    try:
        return await prompt_service.get_comments(prompt_id)
    except Exception as e:
        logger.error(f"Error getting comments for prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get comments",
        )


# History endpoints
@router.get("/{prompt_id}/history", response_model=PromptHistory)
async def get_prompt_history(
    prompt_id: str, current_user: dict = Depends(get_current_admin_user)
):
    """Get change history for a prompt"""
    try:
        return await prompt_service.get_prompt_history(prompt_id)
    except Exception as e:
        logger.error(f"Error getting history for prompt {prompt_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get prompt history",
        )
