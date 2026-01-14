"""
Prompts Router - Runtime prompts access
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.shared.schemas.prompt_model import ProposalSection
from app.tools.admin.prompts_manager.service import PromptService

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


@router.get("/test-injection/{prompt_id}")
async def test_category_injection(
    prompt_id: str,
    categories: Optional[List[str]] = Query(None, description="Categories to inject"),
):
    """Test endpoint to demonstrate category injection"""
    try:
        prompt_service = PromptService()

        # Get the original prompt
        original_prompt = await prompt_service.get_prompt_by_id(prompt_id)
        if not original_prompt:
            raise HTTPException(status_code=404, detail="Prompt not found")

        # Get prompt with category injection if categories provided
        if categories:
            injected_prompt = await prompt_service.get_prompt_with_categories(
                prompt_id, categories
            )
            return {
                "prompt_id": prompt_id,
                "categories": categories,
                "original": {
                    "system_prompt": original_prompt.system_prompt,
                    "user_prompt_template": original_prompt.user_prompt_template,
                },
                "injected": {
                    "system_prompt": (
                        injected_prompt.system_prompt if injected_prompt else ""
                    ),
                    "user_prompt_template": (
                        injected_prompt.user_prompt_template if injected_prompt else ""
                    ),
                },
            }
        else:
            return {
                "prompt_id": prompt_id,
                "message": "No categories provided. Add ?categories=Category1&categories=Category2 to test injection",
                "original": {
                    "system_prompt": original_prompt.system_prompt,
                    "user_prompt_template": original_prompt.user_prompt_template,
                },
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error testing injection: {str(e)}"
        )
