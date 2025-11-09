"""
Prompts Router - Runtime prompts access
"""

from fastapi import APIRouter, HTTPException

from ..models.prompt_model import ProposalSection
from ..services.prompt_service import PromptService

router = APIRouter(prefix="/prompts", tags=["prompts"])


@router.get("/section/{section}")
async def get_runtime_prompt_by_section(section: str):
    """Get the latest published prompt for a section (runtime endpoint)"""
    try:
        # Validate section
        try:
            section_enum = ProposalSection(section)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid section: {section}")

        prompt_service = PromptService()
        prompt = await prompt_service.get_prompt_by_section(section_enum)

        if not prompt:
            raise HTTPException(
                status_code=404, detail=f"No prompt found for section: {section}"
            )

        return {
            "section": section,
            "prompt": prompt.get("prompt_text", ""),
            "version": prompt.get("version", 1),
            "updated_at": prompt.get("updated_at"),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving prompt: {str(e)}"
        )
