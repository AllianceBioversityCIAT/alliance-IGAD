"""
Newsletter Generator Routes

API endpoints for newsletter CRUD operations.
MVP Implementation - Step 1: Configuration
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import logging

from app.database.client import db_client
from app.middleware.auth_middleware import AuthMiddleware

logger = logging.getLogger(__name__)

# Auth setup (same pattern as Proposal Writer)
security = HTTPBearer()
auth_middleware = AuthMiddleware()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Get current user from token"""
    return auth_middleware.verify_token(credentials)

router = APIRouter(prefix="/api/newsletters", tags=["newsletters"])


# ==================== PYDANTIC MODELS ====================


class NewsletterCreate(BaseModel):
    """Request model for creating a newsletter."""

    title: str = Field(default="Newsletter Draft", max_length=200)


class NewsletterConfigUpdate(BaseModel):
    """Request model for updating newsletter configuration (Step 1)."""

    target_audience: Optional[List[str]] = None
    tone_professional: Optional[int] = Field(None, ge=0, le=100)
    tone_technical: Optional[int] = Field(None, ge=0, le=100)
    format_type: Optional[str] = None
    length_preference: Optional[str] = None
    frequency: Optional[str] = None
    geographic_focus: Optional[str] = None
    current_step: Optional[int] = None


class TopicsUpdate(BaseModel):
    """Request model for updating selected topics (Step 2)."""

    selected_types: List[str]


# ==================== CONSTANTS ====================

VALID_FORMAT_TYPES = ["email", "pdf", "web"]
VALID_LENGTH_PREFERENCES = ["short", "mixed", "long"]
VALID_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly"]
VALID_AUDIENCE_OPTIONS = [
    "myself",
    "researchers",
    "development_partners",
    "policy_makers",
    "ag_tech_industry",
    "field_staff",
    "farmers",
]


# ==================== HELPERS ====================


def generate_newsletter_code() -> str:
    """Generate unique code: NL-YYYYMMDD-XXXX"""
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    random_suffix = str(uuid.uuid4())[:4].upper()
    return f"NL-{date_str}-{random_suffix}"


def validate_config_update(update: NewsletterConfigUpdate) -> None:
    """Validate configuration update values."""
    if update.format_type and update.format_type not in VALID_FORMAT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid format_type. Must be one of: {VALID_FORMAT_TYPES}",
        )

    if (
        update.length_preference
        and update.length_preference not in VALID_LENGTH_PREFERENCES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid length_preference. Must be one of: {VALID_LENGTH_PREFERENCES}",
        )

    if update.frequency and update.frequency not in VALID_FREQUENCIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid frequency. Must be one of: {VALID_FREQUENCIES}",
        )


# ==================== ENDPOINTS ====================


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_newsletter(
    newsletter: NewsletterCreate, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new newsletter.

    - Generates unique newsletter code
    - Sets default configuration values
    - Returns full newsletter object
    """
    newsletter_id = str(uuid.uuid4())
    newsletter_code = generate_newsletter_code()
    now = datetime.utcnow().isoformat()

    # Get user info
    user_id = getattr(user, "id", str(user)) if user else "anonymous"
    user_email = getattr(user, "email", "") if user else ""

    item = {
        "PK": f"NEWSLETTER#{newsletter_code}",
        "SK": "METADATA",
        "GSI1PK": f"USER#{user_id}",
        "GSI1SK": f"NEWSLETTER#{now}",
        "id": newsletter_id,
        "newsletterCode": newsletter_code,
        "title": newsletter.title,
        "status": "draft",
        "user_id": user_id,
        "user_email": user_email,
        "created_at": now,
        "updated_at": now,
        # Step 1 defaults
        "target_audience": [],
        "tone_professional": 50,
        "tone_technical": 50,
        "format_type": "email",
        "length_preference": "mixed",
        "frequency": "weekly",
        "geographic_focus": "",
        "current_step": 1,
    }

    await db_client.put_item(item)

    logger.info(f"Created newsletter {newsletter_code} for user {user_id}")

    return {
        "id": newsletter_id,
        "newsletterCode": newsletter_code,
        "title": newsletter.title,
        "status": "draft",
        "target_audience": [],
        "tone_professional": 50,
        "tone_technical": 50,
        "format_type": "email",
        "length_preference": "mixed",
        "frequency": "weekly",
        "geographic_focus": "",
        "current_step": 1,
        "created_at": now,
        "updated_at": now,
    }


@router.get("/{newsletter_code}")
async def get_newsletter(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get newsletter by code.

    - Verifies user owns the newsletter
    - Returns full newsletter object including all step data
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    item = await db_client.get_item(pk=pk, sk="METADATA")

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Newsletter not found"
        )

    # Get user info
    user_id = getattr(user, "id", str(user)) if user else "anonymous"

    # Verify ownership
    if item.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this newsletter",
        )

    return {
        "id": item.get("id"),
        "newsletterCode": item.get("newsletterCode"),
        "title": item.get("title", "Newsletter Draft"),
        "status": item.get("status", "draft"),
        "target_audience": item.get("target_audience", []),
        "tone_professional": item.get("tone_professional", 50),
        "tone_technical": item.get("tone_technical", 50),
        "format_type": item.get("format_type", "email"),
        "length_preference": item.get("length_preference", "mixed"),
        "frequency": item.get("frequency", "weekly"),
        "geographic_focus": item.get("geographic_focus", ""),
        "current_step": item.get("current_step", 1),
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
    }


@router.put("/{newsletter_code}")
async def update_newsletter(
    newsletter_code: str,
    update: NewsletterConfigUpdate,
    user: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Update newsletter configuration.

    - Only updates provided fields
    - Validates field values
    - Updates timestamp
    """
    pk = f"NEWSLETTER#{newsletter_code}"

    # Get user info
    user_id = getattr(user, "id", str(user)) if user else "anonymous"

    # Verify newsletter exists and user owns it
    existing = await db_client.get_item(pk=pk, sk="METADATA")
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Newsletter not found"
        )

    if existing.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this newsletter",
        )

    # Validate update values
    validate_config_update(update)

    # Build update expression
    update_parts = []
    expression_values = {}
    expression_names = {}

    update_data = update.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if value is not None:
            # Use expression attribute names for reserved words
            attr_name = f"#{key}"
            attr_value = f":{key}"
            update_parts.append(f"{attr_name} = {attr_value}")
            expression_values[attr_value] = value
            expression_names[attr_name] = key

    # Always update timestamp
    now = datetime.utcnow().isoformat()
    update_parts.append("#updated_at = :updated_at")
    expression_values[":updated_at"] = now
    expression_names["#updated_at"] = "updated_at"

    if update_parts:
        update_expression = "SET " + ", ".join(update_parts)

        await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression=update_expression,
            expression_attribute_values=expression_values,
            expression_attribute_names=expression_names,
        )

    logger.info(f"Updated newsletter {newsletter_code}")

    return {"success": True, "updated_at": now}


@router.get("")
async def list_newsletters(user: Any = Depends(get_current_user)) -> Dict[str, Any]:
    """
    List all newsletters for current user.

    - Queries by user ID using GSI1
    - Returns summary data only
    - Sorted by creation date (newest first)
    """
    # Get user info
    user_id = getattr(user, "id", str(user)) if user else "anonymous"

    items = await db_client.query_items(
        pk=f"USER#{user_id}",
        index_name="GSI1",
        sk_begins_with="NEWSLETTER#",
        scan_index_forward=False,  # Newest first
    )

    newsletters = []
    for item in items:
        newsletters.append(
            {
                "newsletterCode": item.get("newsletterCode"),
                "title": item.get("title", "Newsletter Draft"),
                "status": item.get("status", "draft"),
                "current_step": item.get("current_step", 1),
                "created_at": item.get("created_at"),
                "updated_at": item.get("updated_at"),
            }
        )

    return {"newsletters": newsletters, "total": len(newsletters)}


@router.delete("/{newsletter_code}")
async def delete_newsletter(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Delete newsletter and all associated data.

    - Verifies ownership
    - Deletes all SK items (METADATA, TOPICS, OUTLINE, DRAFT)
    """
    pk = f"NEWSLETTER#{newsletter_code}"

    # Get user info
    user_id = getattr(user, "id", str(user)) if user else "anonymous"

    # Verify ownership
    existing = await db_client.get_item(pk=pk, sk="METADATA")
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Newsletter not found"
        )

    if existing.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this newsletter",
        )

    # Delete all items
    for sk in ["METADATA", "TOPICS", "OUTLINE", "DRAFT"]:
        try:
            await db_client.delete_item(pk=pk, sk=sk)
        except Exception as e:
            logger.warning(f"Failed to delete {sk} for {newsletter_code}: {e}")
            pass  # Ignore if item doesn't exist

    logger.info(f"Deleted newsletter {newsletter_code}")

    return {"success": True, "deleted": newsletter_code}


# ==================== STEP 2: TOPICS (Placeholder for RAG) ====================


@router.put("/{newsletter_code}/topics")
async def save_topics(
    newsletter_code: str, topics: TopicsUpdate, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Save selected information types (Step 2).

    - Saves topic selection
    - Resets retrieval status
    """
    pk = f"NEWSLETTER#{newsletter_code}"

    # Get user info
    user_id = getattr(user, "id", str(user)) if user else "anonymous"

    # Verify ownership
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Newsletter not found"
        )

    if metadata.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this newsletter",
        )

    now = datetime.utcnow().isoformat()

    # Create or update TOPICS item
    topics_item = {
        "PK": pk,
        "SK": "TOPICS",
        "selected_types": topics.selected_types,
        "retrieval_status": "pending",
        "retrieved_content": [],
        "total_chunks_retrieved": 0,
        "updated_at": now,
    }

    await db_client.put_item(topics_item)

    # Update current step in METADATA
    await db_client.update_item(
        pk=pk,
        sk="METADATA",
        update_expression="SET current_step = :step, updated_at = :now",
        expression_attribute_values={
            ":step": 2,
            ":now": now,
        },
    )

    logger.info(
        f"Saved topics for newsletter {newsletter_code}: {topics.selected_types}"
    )

    return {
        "success": True,
        "selected_types": topics.selected_types,
        "retrieval_status": "pending",
        "updated_at": now,
    }


@router.get("/{newsletter_code}/topics")
async def get_topics(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get topics and retrieved content for a newsletter.
    """
    pk = f"NEWSLETTER#{newsletter_code}"

    # Get user info
    user_id = getattr(user, "id", str(user)) if user else "anonymous"

    # Verify ownership
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Newsletter not found"
        )

    if metadata.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this newsletter",
        )

    # Get TOPICS item
    topics_item = await db_client.get_item(pk=pk, sk="TOPICS")

    if not topics_item:
        return {
            "selected_types": [],
            "retrieval_status": "pending",
            "retrieved_content": [],
            "total_chunks_retrieved": 0,
        }

    return {
        "selected_types": topics_item.get("selected_types", []),
        "retrieval_status": topics_item.get("retrieval_status", "pending"),
        "retrieved_content": topics_item.get("retrieved_content", []),
        "total_chunks_retrieved": topics_item.get("total_chunks_retrieved", 0),
        "retrieval_started_at": topics_item.get("retrieval_started_at"),
        "retrieval_completed_at": topics_item.get("retrieval_completed_at"),
        "retrieval_error": topics_item.get("retrieval_error"),
    }


# Note: POST /retrieve-content endpoint will be added when KIRO implements
# the Knowledge Base service. For now, Step 2 will just save topic selections.
