"""
Newsletter Generator Routes

API endpoints for newsletter CRUD operations.
MVP Implementation - Step 1: Configuration
"""

import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

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


class ScheduleRuleModel(BaseModel):
    """Model for a single schedule rule."""

    intervalType: str = Field(..., pattern="^(days|weeks|months)$")
    intervalAmount: int = Field(..., ge=1, le=365)
    weekdays: Optional[List[int]] = Field(None, min_length=0, max_length=7)
    dayOfMonth: Optional[int] = Field(None, ge=1, le=31)
    hour: int = Field(..., ge=0, le=23)
    minute: int = Field(..., ge=0, le=59)


class PublishingScheduleModel(BaseModel):
    """Model for publishing schedule configuration."""

    conceptualFrequency: str = Field(
        ..., pattern="^(daily|weekly|monthly|quarterly|custom)$"
    )
    scheduleRules: List[ScheduleRuleModel] = Field(..., min_length=1, max_length=5)


class NewsletterConfigUpdate(BaseModel):
    """Request model for updating newsletter configuration (Step 1)."""

    target_audience: Optional[List[str]] = None
    tone_professional: Optional[int] = Field(None, ge=0, le=100)  # Legacy
    tone_technical: Optional[int] = Field(None, ge=0, le=100)  # Legacy
    tone_preset: Optional[str] = None  # New semantic preset
    format_type: Optional[str] = None
    length_preference: Optional[str] = None
    frequency: Optional[str] = None
    schedule: Optional[PublishingScheduleModel] = None  # Publishing schedule
    geographic_focus: Optional[str] = None
    current_step: Optional[int] = None


class TopicsUpdate(BaseModel):
    """Request model for updating selected topics (Step 2)."""

    selected_types: List[str]


# ==================== CONSTANTS ====================

VALID_FORMAT_TYPES = ["email", "pdf", "web", "html"]
VALID_LENGTH_PREFERENCES = [
    "quick_read",
    "standard",
    "deep_dive",
    "short",
    "mixed",
    "long",
]  # New + legacy
VALID_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly", "custom"]
VALID_TONE_PRESETS = ["expert_analysis", "industry_insight", "friendly_summary"]
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


def validate_schedule_rule(rule: ScheduleRuleModel) -> List[str]:
    """Validate a schedule rule and return list of errors."""
    errors = []

    # Validate interval amount based on type
    if rule.intervalType == "days" and rule.intervalAmount > 365:
        errors.append("Days interval must be between 1 and 365")
    elif rule.intervalType == "weeks" and rule.intervalAmount > 52:
        errors.append("Weeks interval must be between 1 and 52")
    elif rule.intervalType == "months" and rule.intervalAmount > 12:
        errors.append("Months interval must be between 1 and 12")

    # Validate weekdays for daily/weekly
    if rule.intervalType in ("days", "weeks"):
        if rule.weekdays:
            for day in rule.weekdays:
                if day < 0 or day > 6:
                    errors.append(
                        "Weekdays must be between 0 (Sunday) and 6 (Saturday)"
                    )
                    break

    # Validate minute is one of the allowed values
    if rule.minute not in (0, 15, 30, 45):
        errors.append("Minute must be 0, 15, 30, or 45")

    return errors


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

    if update.tone_preset and update.tone_preset not in VALID_TONE_PRESETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tone_preset. Must be one of: {VALID_TONE_PRESETS}",
        )

    # Validate schedule rules
    if update.schedule:
        all_errors = []
        for i, rule in enumerate(update.schedule.scheduleRules):
            rule_errors = validate_schedule_rule(rule)
            if rule_errors:
                all_errors.extend([f"Rule {i + 1}: {e}" for e in rule_errors])

        if all_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid schedule: {'; '.join(all_errors)}",
            )


# ==================== ENDPOINTS ====================


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_newsletter(
    newsletter: NewsletterCreate, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Create a new newsletter.

    - Limits to 1 draft newsletter per user
    - Generates unique newsletter code
    - Sets default configuration values
    - Returns full newsletter object
    """
    # Get user info (user is a dict from auth middleware)
    user_id = user.get("user_id") if user else "anonymous"
    user_email = user.get("email", "") if user else ""

    # Check if user already has a draft newsletter
    existing_newsletters = await db_client.query_items(
        pk=f"USER#{user_id}",
        index_name="GSI1",
        sk_begins_with="NEWSLETTER#",
    )

    # Filter for draft newsletters
    draft_newsletters = [
        nl for nl in existing_newsletters if nl.get("status") == "draft"
    ]

    if draft_newsletters:
        # Return the existing draft instead of creating a new one
        existing = draft_newsletters[0]
        logger.info(
            f"User {user_id} already has draft newsletter {existing.get('newsletterCode')}"
        )
        # Default schedule for existing newsletters without schedule
        existing_schedule = existing.get("schedule") or {
            "conceptualFrequency": existing.get("frequency", "weekly"),
            "scheduleRules": [
                {
                    "intervalType": "weeks",
                    "intervalAmount": 1,
                    "weekdays": [1],
                    "hour": 9,
                    "minute": 0,
                }
            ],
        }
        return {
            "id": existing.get("id"),
            "newsletterCode": existing.get("newsletterCode"),
            "title": existing.get("title", "Newsletter Draft"),
            "status": existing.get("status", "draft"),
            "target_audience": existing.get("target_audience", []),
            "tone_professional": existing.get("tone_professional", 50),
            "tone_technical": existing.get("tone_technical", 50),
            "tone_preset": existing.get("tone_preset", "industry_insight"),
            "format_type": existing.get("format_type", "email"),
            "length_preference": existing.get("length_preference", "standard"),
            "frequency": existing.get("frequency", "weekly"),
            "schedule": existing_schedule,
            "geographic_focus": existing.get("geographic_focus", ""),
            "current_step": existing.get("current_step", 1),
            "created_at": existing.get("created_at"),
            "updated_at": existing.get("updated_at"),
            "existing": True,  # Flag to indicate this is an existing newsletter
        }

    newsletter_id = str(uuid.uuid4())
    newsletter_code = generate_newsletter_code()
    now = datetime.utcnow().isoformat()

    # Default schedule (weekly on Monday at 9:00 AM)
    default_schedule = {
        "conceptualFrequency": "weekly",
        "scheduleRules": [
            {
                "intervalType": "weeks",
                "intervalAmount": 1,
                "weekdays": [1],  # Monday
                "hour": 9,
                "minute": 0,
            }
        ],
    }

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
        "tone_professional": 50,  # Legacy
        "tone_technical": 50,  # Legacy
        "tone_preset": "industry_insight",  # New semantic preset
        "format_type": "email",
        "length_preference": "standard",  # Updated default
        "frequency": "weekly",
        "schedule": default_schedule,  # Publishing schedule
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
        "tone_preset": "industry_insight",
        "format_type": "email",
        "length_preference": "standard",
        "frequency": "weekly",
        "schedule": default_schedule,
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

    # Get user info (user is a dict from auth middleware)
    user_id = user.get("user_id") if user else "anonymous"

    # Verify ownership
    if item.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this newsletter",
        )

    # Default schedule for items without schedule
    item_schedule = item.get("schedule") or {
        "conceptualFrequency": item.get("frequency", "weekly"),
        "scheduleRules": [
            {
                "intervalType": "weeks",
                "intervalAmount": 1,
                "weekdays": [1],
                "hour": 9,
                "minute": 0,
            }
        ],
    }

    return {
        "id": item.get("id"),
        "newsletterCode": item.get("newsletterCode"),
        "title": item.get("title", "Newsletter Draft"),
        "status": item.get("status", "draft"),
        "target_audience": item.get("target_audience", []),
        "tone_professional": item.get("tone_professional", 50),
        "tone_technical": item.get("tone_technical", 50),
        "tone_preset": item.get("tone_preset", "industry_insight"),
        "format_type": item.get("format_type", "email"),
        "length_preference": item.get("length_preference", "standard"),
        "frequency": item.get("frequency", "weekly"),
        "schedule": item_schedule,
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

    # Get user info (user is a dict from auth middleware)
    user_id = user.get("user_id") if user else "anonymous"

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
    # Get user info (user is a dict from auth middleware)
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get user info (user is a dict from auth middleware)
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get user info (user is a dict from auth middleware)
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get user info (user is a dict from auth middleware)
    user_id = user.get("user_id") if user else "anonymous"

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


class RetrieveContentRequest(BaseModel):
    """Request model for content retrieval."""

    selected_types: List[str] = Field(..., min_length=1)


# Valid topic IDs from Knowledge Base service
VALID_TOPIC_IDS = [
    "breaking_news",
    "policy_updates",
    "food_security",
    "research_findings",
    "technology_innovation",
    "climate_smart",
    "market_access",
    "project_updates",
    "livestock",
    "funding",
    "events",
    "publications",
]


@router.post("/{newsletter_code}/retrieve-content")
async def retrieve_content(
    newsletter_code: str,
    request: RetrieveContentRequest,
    user: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Trigger content retrieval from Knowledge Base.

    - Validates newsletter ownership and selected topics
    - Gets Step 1 configuration for query building
    - Calls Knowledge Base service to retrieve content
    - Stores results in TOPICS item

    Note: This is a synchronous implementation since KB retrieval is fast.
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

    # Verify newsletter exists and user owns it
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

    # Validate topics
    invalid_topics = [t for t in request.selected_types if t not in VALID_TOPIC_IDS]
    if invalid_topics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid topic IDs: {invalid_topics}",
        )

    now = datetime.utcnow().isoformat()

    # Build config from metadata
    config = {
        "tone_preset": metadata.get("tone_preset", "industry_insight"),
        "frequency": metadata.get("frequency", "weekly"),
        "length_preference": metadata.get("length_preference", "standard"),
        "target_audience": metadata.get("target_audience", []),
        "geographic_focus": metadata.get("geographic_focus", "IGAD region"),
    }

    try:
        # Initialize Knowledge Base service
        from app.shared.ai.knowledge_base_service import KnowledgeBaseService

        kb_service = KnowledgeBaseService()

        # Calculate retrieval parameters
        retrieval_params = kb_service.calculate_retrieval_params(config)

        # Build query and retrieve content
        query = kb_service.build_query_from_topics(request.selected_types, config)

        chunks = kb_service.retrieve_content(
            query=query,
            max_results=retrieval_params["max_chunks"],
        )

        # Assign topic IDs to chunks
        # Distribute evenly across selected topics for now
        for i, chunk in enumerate(chunks):
            chunk.topic_id = request.selected_types[i % len(request.selected_types)]

        # Convert chunks to dicts (score must be Decimal for DynamoDB)
        retrieved_content = [
            {
                "chunk_id": c.chunk_id,
                "topic_id": c.topic_id,
                "content": c.content,
                "score": Decimal(str(c.score)),
                "source_url": c.source_url,
                "source_metadata": c.source_metadata,
            }
            for c in chunks
        ]

        completed_at = datetime.utcnow().isoformat()

        # Store in TOPICS item
        topics_item = {
            "PK": pk,
            "SK": "TOPICS",
            "selected_types": request.selected_types,
            "retrieval_config": {
                **config,
                "max_chunks": retrieval_params["max_chunks"],
                "days_back": retrieval_params["days_back"],
            },
            "retrieval_status": "completed",
            "retrieval_started_at": now,
            "retrieval_completed_at": completed_at,
            "retrieval_error": None,
            "retrieved_content": retrieved_content,
            "total_chunks_retrieved": len(retrieved_content),
            "updated_at": completed_at,
        }

        await db_client.put_item(topics_item)

        logger.info(
            f"Retrieved {len(retrieved_content)} chunks for newsletter "
            f"{newsletter_code}"
        )

        return {
            "success": True,
            "retrieval_status": "completed",
            "total_chunks_retrieved": len(retrieved_content),
            "retrieval_started_at": now,
            "retrieval_completed_at": completed_at,
        }

    except Exception as e:
        logger.error(f"Content retrieval failed for {newsletter_code}: {e}")

        # Store failure in TOPICS item
        topics_item = {
            "PK": pk,
            "SK": "TOPICS",
            "selected_types": request.selected_types,
            "retrieval_config": config,
            "retrieval_status": "failed",
            "retrieval_started_at": now,
            "retrieval_completed_at": None,
            "retrieval_error": str(e),
            "retrieved_content": [],
            "total_chunks_retrieved": 0,
            "updated_at": now,
        }

        await db_client.put_item(topics_item)

        return {
            "success": False,
            "retrieval_status": "failed",
            "retrieval_error": str(e),
        }


@router.get("/{newsletter_code}/retrieval-status")
async def get_retrieval_status(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get retrieval status for polling.

    Returns current status of content retrieval including:
    - retrieval_status: pending | processing | completed | failed
    - retrieval_config: configuration used for retrieval
    - retrieved_content: array of content chunks
    - timestamps and error information
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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
            "retrieval_status": "pending",
            "selected_types": [],
            "retrieval_config": None,
            "retrieved_content": [],
            "total_chunks_retrieved": 0,
            "retrieval_started_at": None,
            "retrieval_completed_at": None,
            "retrieval_error": None,
        }

    return {
        "retrieval_status": topics_item.get("retrieval_status", "pending"),
        "selected_types": topics_item.get("selected_types", []),
        "retrieval_config": topics_item.get("retrieval_config"),
        "retrieved_content": topics_item.get("retrieved_content", []),
        "total_chunks_retrieved": topics_item.get("total_chunks_retrieved", 0),
        "retrieval_started_at": topics_item.get("retrieval_started_at"),
        "retrieval_completed_at": topics_item.get("retrieval_completed_at"),
        "retrieval_error": topics_item.get("retrieval_error"),
    }


# ==================== STEP 3: OUTLINE ====================


class OutlineItemCreate(BaseModel):
    """Request model for creating a custom outline item."""

    section_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)
    user_notes: Optional[str] = Field(None, max_length=1000)


class OutlineSectionModel(BaseModel):
    """Model for an outline section."""

    id: str
    name: str
    order: int
    items: List[Dict[str, Any]]


class OutlineSaveRequest(BaseModel):
    """Request model for saving outline modifications."""

    sections: List[OutlineSectionModel]


@router.get("/{newsletter_code}/outline")
async def get_outline(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get outline data for a newsletter.

    Returns current outline state including:
    - sections: array of outline sections with items
    - outline_status: pending | processing | completed | failed
    - generation_config: configuration used for generation
    - user_modifications: tracking of user edits
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get OUTLINE item
    outline_item = await db_client.get_item(pk=pk, sk="OUTLINE")

    if not outline_item:
        return {
            "sections": [],
            "outline_status": "pending",
            "outline_error": None,
            "generated_at": None,
            "generation_config": None,
            "user_modifications": {
                "items_added": 0,
                "items_removed": 0,
                "items_edited": 0,
            },
            "updated_at": None,
        }

    return {
        "sections": outline_item.get("sections", []),
        "outline_status": outline_item.get("outline_status", "pending"),
        "outline_error": outline_item.get("outline_error"),
        "generated_at": outline_item.get("generated_at"),
        "generation_config": outline_item.get("generation_config"),
        "user_modifications": outline_item.get(
            "user_modifications",
            {"items_added": 0, "items_removed": 0, "items_edited": 0},
        ),
        "updated_at": outline_item.get("updated_at"),
    }


@router.post("/{newsletter_code}/generate-outline")
async def generate_outline(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Trigger AI outline generation.

    Uses Step 2 retrieved content to generate a structured newsletter outline.
    This is a synchronous operation that:
    - Validates Step 2 is complete
    - Generates outline using Bedrock Claude
    - Saves result to OUTLINE item
    - Preserves custom items during regeneration
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Check Step 2 is complete
    topics_item = await db_client.get_item(pk=pk, sk="TOPICS")
    if not topics_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Step 2 not started. Please complete content planning first.",
        )

    retrieval_status = topics_item.get("retrieval_status", "pending")
    if retrieval_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Step 2 content retrieval not complete. Status: {retrieval_status}",
        )

    retrieved_content = topics_item.get("retrieved_content", [])
    if not retrieved_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No content retrieved in Step 2. Please retrieve content first.",
        )

    # Set status to processing
    now = datetime.utcnow().isoformat()
    await db_client.update_item(
        pk=pk,
        sk="OUTLINE",
        update_expression="SET outline_status = :status, updated_at = :now",
        expression_attribute_values={
            ":status": "processing",
            ":now": now,
        },
    )

    try:
        # Import and run outline generation service
        from app.tools.newsletter_generator.outline_generation.service import (
            OutlineGenerationService,
        )

        service = OutlineGenerationService()
        result = service.generate_outline(
            newsletter_code=newsletter_code,
            preserve_custom_items=True,
        )

        logger.info(f"Outline generation completed for {newsletter_code}")

        return result

    except Exception as e:
        logger.error(f"Outline generation failed for {newsletter_code}: {e}")

        # Update status to failed
        error_time = datetime.utcnow().isoformat()
        await db_client.update_item(
            pk=pk,
            sk="OUTLINE",
            update_expression=(
                "SET outline_status = :status, "
                "outline_error = :error, updated_at = :now"
            ),
            expression_attribute_values={
                ":status": "failed",
                ":error": str(e),
                ":now": error_time,
            },
        )

        return {
            "success": False,
            "outline_status": "failed",
            "outline_error": str(e),
        }


@router.get("/{newsletter_code}/outline-status")
async def get_outline_status(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get outline generation status for polling.

    Returns current status of outline generation including:
    - outline_status: pending | processing | completed | failed
    - sections: array of outline sections (when completed)
    - outline_error: error message (when failed)
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get OUTLINE item
    outline_item = await db_client.get_item(pk=pk, sk="OUTLINE")

    if not outline_item:
        return {
            "outline_status": "pending",
            "sections": [],
            "outline_error": None,
            "generated_at": None,
            "updated_at": None,
        }

    return {
        "outline_status": outline_item.get("outline_status", "pending"),
        "sections": outline_item.get("sections", []),
        "outline_error": outline_item.get("outline_error"),
        "generated_at": outline_item.get("generated_at"),
        "generation_config": outline_item.get("generation_config"),
        "user_modifications": outline_item.get("user_modifications"),
        "updated_at": outline_item.get("updated_at"),
    }


@router.put("/{newsletter_code}/outline")
async def save_outline(
    newsletter_code: str,
    request: OutlineSaveRequest,
    user: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Save outline modifications.

    Updates the outline sections with user edits (titles, descriptions).
    Tracks modification counts for analytics.
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Convert sections to dict format
    sections_data = [s.model_dump() for s in request.sections]

    # Get existing outline to track modifications
    existing = await db_client.get_item(pk=pk, sk="OUTLINE")
    existing_mods = existing.get("user_modifications", {}) if existing else {}

    # Count edits (increment items_edited)
    items_edited = existing_mods.get("items_edited", 0) + 1

    # Update outline
    await db_client.update_item(
        pk=pk,
        sk="OUTLINE",
        update_expression=(
            "SET sections = :sections, "
            "user_modifications.items_edited = :edited, "
            "updated_at = :now"
        ),
        expression_attribute_values={
            ":sections": sections_data,
            ":edited": items_edited,
            ":now": now,
        },
    )

    # Update current step in METADATA
    await db_client.update_item(
        pk=pk,
        sk="METADATA",
        update_expression="SET current_step = :step, updated_at = :now",
        expression_attribute_values={
            ":step": 3,
            ":now": now,
        },
    )

    logger.info(f"Saved outline for newsletter {newsletter_code}")

    return {"success": True, "updated_at": now}


@router.post("/{newsletter_code}/outline-item")
async def add_outline_item(
    newsletter_code: str,
    request: OutlineItemCreate,
    user: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Add a custom item to an outline section.

    Creates a new user-defined item with:
    - is_custom: true (survives regeneration)
    - is_editable: true
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get existing outline
    outline_item = await db_client.get_item(pk=pk, sk="OUTLINE")
    if not outline_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Outline not found. Please generate outline first.",
        )

    sections = outline_item.get("sections", [])

    # Find target section
    target_section = None
    target_index = -1
    for i, section in enumerate(sections):
        if section.get("id") == request.section_id:
            target_section = section
            target_index = i
            break

    if target_section is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Section {request.section_id} not found",
        )

    # Create new item
    now = datetime.utcnow().isoformat()
    new_item = {
        "id": f"item-{uuid.uuid4().hex[:8]}",
        "section_id": request.section_id,
        "title": request.title,
        "description": request.description,
        "content_sources": [],
        "order": len(target_section.get("items", [])) + 1,
        "is_custom": True,
        "is_editable": True,
        "user_notes": request.user_notes,
        "created_at": now,
    }

    # Add item to section
    if "items" not in sections[target_index]:
        sections[target_index]["items"] = []
    sections[target_index]["items"].append(new_item)

    # Update modification counts
    user_mods = outline_item.get("user_modifications", {})
    items_added = user_mods.get("items_added", 0) + 1

    # Save updated outline
    await db_client.update_item(
        pk=pk,
        sk="OUTLINE",
        update_expression=(
            "SET sections = :sections, "
            "user_modifications.items_added = :added, "
            "updated_at = :now"
        ),
        expression_attribute_values={
            ":sections": sections,
            ":added": items_added,
            ":now": now,
        },
    )

    logger.info(f"Added custom item to {newsletter_code} section {request.section_id}")

    return {"success": True, "item": new_item}


@router.delete("/{newsletter_code}/outline-item/{item_id}")
async def remove_outline_item(
    newsletter_code: str,
    item_id: str,
    user: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Remove an item from the outline.

    Removes the specified item from its section and updates modification counts.
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get existing outline
    outline_item = await db_client.get_item(pk=pk, sk="OUTLINE")
    if not outline_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Outline not found",
        )

    sections = outline_item.get("sections", [])

    # Find and remove item
    item_found = False
    for section in sections:
        items = section.get("items", [])
        for i, item in enumerate(items):
            if item.get("id") == item_id:
                items.pop(i)
                item_found = True
                break
        if item_found:
            break

    if not item_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item {item_id} not found",
        )

    # Update modification counts
    now = datetime.utcnow().isoformat()
    user_mods = outline_item.get("user_modifications", {})
    items_removed = user_mods.get("items_removed", 0) + 1

    # Save updated outline
    await db_client.update_item(
        pk=pk,
        sk="OUTLINE",
        update_expression=(
            "SET sections = :sections, "
            "user_modifications.items_removed = :removed, "
            "updated_at = :now"
        ),
        expression_attribute_values={
            ":sections": sections,
            ":removed": items_removed,
            ":now": now,
        },
    )

    logger.info(f"Removed item {item_id} from {newsletter_code}")

    return {"success": True, "message": f"Item {item_id} removed"}


# ==================== STEP 4: DRAFT ====================


class DraftSectionModel(BaseModel):
    """Model for a draft section."""

    id: str
    sectionId: str
    title: str
    content: str
    items: List[Dict[str, Any]] = Field(default_factory=list)
    order: int
    isEdited: bool = False


class DraftSaveRequest(BaseModel):
    """Request model for saving draft modifications."""

    title: Optional[str] = None
    subtitle: Optional[str] = None
    sections: List[DraftSectionModel]


class DraftSectionUpdateRequest(BaseModel):
    """Request model for updating a single draft section."""

    content: str
    title: Optional[str] = None


class AICompleteRequest(BaseModel):
    """Request model for AI autocomplete."""

    prompt: str = Field(..., min_length=1, max_length=2000)
    context: Optional[str] = Field(None, max_length=5000)


class ExportRequest(BaseModel):
    """Request model for exporting the newsletter."""

    format: str = Field(..., pattern="^(html|markdown|text)$")


@router.get("/{newsletter_code}/draft")
async def get_draft(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get draft data for a newsletter.

    Returns current draft state including:
    - title, subtitle: Newsletter header info
    - sections: array of draft sections with content
    - draft_status: pending | processing | completed | failed
    - metadata: word count, reading time
    - user_edits: tracking of user modifications
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get DRAFT item
    draft_item = await db_client.get_item(pk=pk, sk="DRAFT")

    if not draft_item:
        return {
            "title": metadata.get("title", "Newsletter Draft"),
            "subtitle": "",
            "sections": [],
            "draft_status": "pending",
            "draft_error": None,
            "generated_at": None,
            "generation_config": None,
            "metadata": {
                "wordCount": 0,
                "readingTime": "0 min",
            },
            "user_edits": {
                "sectionsEdited": 0,
                "lastEditedAt": None,
            },
            "updated_at": None,
        }

    return {
        "title": draft_item.get("title", "Newsletter Draft"),
        "subtitle": draft_item.get("subtitle", ""),
        "sections": draft_item.get("sections", []),
        "draft_status": draft_item.get("draft_status", "pending"),
        "draft_error": draft_item.get("draft_error"),
        "generated_at": draft_item.get("generated_at"),
        "generation_config": draft_item.get("generation_config"),
        "metadata": draft_item.get(
            "metadata", {"wordCount": 0, "readingTime": "0 min"}
        ),
        "user_edits": draft_item.get(
            "user_edits", {"sectionsEdited": 0, "lastEditedAt": None}
        ),
        "updated_at": draft_item.get("updated_at"),
    }


@router.post("/{newsletter_code}/generate-draft")
async def generate_draft(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Trigger AI draft generation.

    Uses Step 3 outline to generate full newsletter content.
    This is a synchronous operation that:
    - Validates Step 3 is complete
    - Generates draft using Bedrock Claude
    - Saves result to DRAFT item
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Check Step 3 is complete
    outline_item = await db_client.get_item(pk=pk, sk="OUTLINE")
    if not outline_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Step 3 not completed. Please complete outline review first.",
        )

    outline_status = outline_item.get("outline_status", "pending")
    if outline_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Step 3 outline not complete. Status: {outline_status}",
        )

    outline_sections = outline_item.get("sections", [])
    sections_with_items = [s for s in outline_sections if s.get("items")]
    if not sections_with_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No outline items found. Please add items in Step 3.",
        )

    # Set status to processing
    now = datetime.utcnow().isoformat()
    await db_client.update_item(
        pk=pk,
        sk="DRAFT",
        update_expression="SET draft_status = :status, updated_at = :now",
        expression_attribute_values={
            ":status": "processing",
            ":now": now,
        },
    )

    try:
        # Import and run draft generation service
        from app.tools.newsletter_generator.draft_generation.service import (
            DraftGenerationService,
        )

        service = DraftGenerationService()
        result = service.generate_draft(newsletter_code=newsletter_code)

        logger.info(f"Draft generation completed for {newsletter_code}")

        return result

    except Exception as e:
        logger.error(f"Draft generation failed for {newsletter_code}: {e}")

        # Update status to failed
        error_time = datetime.utcnow().isoformat()
        await db_client.update_item(
            pk=pk,
            sk="DRAFT",
            update_expression=(
                "SET draft_status = :status, " "draft_error = :error, updated_at = :now"
            ),
            expression_attribute_values={
                ":status": "failed",
                ":error": str(e),
                ":now": error_time,
            },
        )

        return {
            "success": False,
            "draft_status": "failed",
            "draft_error": str(e),
        }


@router.get("/{newsletter_code}/draft-status")
async def get_draft_status(
    newsletter_code: str, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get draft generation status for polling.

    Returns current status of draft generation including:
    - draft_status: pending | processing | completed | failed
    - sections: array of draft sections (when completed)
    - draft_error: error message (when failed)
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get DRAFT item
    draft_item = await db_client.get_item(pk=pk, sk="DRAFT")

    if not draft_item:
        return {
            "draft_status": "pending",
            "title": metadata.get("title", "Newsletter Draft"),
            "sections": [],
            "draft_error": None,
            "generated_at": None,
            "metadata": None,
            "updated_at": None,
        }

    return {
        "draft_status": draft_item.get("draft_status", "pending"),
        "title": draft_item.get("title", ""),
        "subtitle": draft_item.get("subtitle", ""),
        "sections": draft_item.get("sections", []),
        "draft_error": draft_item.get("draft_error"),
        "generated_at": draft_item.get("generated_at"),
        "generation_config": draft_item.get("generation_config"),
        "metadata": draft_item.get("metadata"),
        "user_edits": draft_item.get("user_edits"),
        "updated_at": draft_item.get("updated_at"),
    }


@router.put("/{newsletter_code}/draft")
async def save_draft(
    newsletter_code: str,
    request: DraftSaveRequest,
    user: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Save draft modifications.

    Updates the draft sections with user edits.
    Tracks modification counts for analytics.
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Convert sections to dict format
    sections_data = [s.model_dump() for s in request.sections]

    # Calculate word count
    total_words = sum(len(s.get("content", "").split()) for s in sections_data)

    # Get existing draft to track modifications
    existing = await db_client.get_item(pk=pk, sk="DRAFT")
    existing_edits = existing.get("user_edits", {}) if existing else {}
    sections_edited = existing_edits.get("sectionsEdited", 0) + 1

    # Build update expression
    update_parts = [
        "#sections = :sections",
        "metadata.wordCount = :wordCount",
        "user_edits.sectionsEdited = :edited",
        "user_edits.lastEditedAt = :now",
        "updated_at = :now",
    ]
    expression_values = {
        ":sections": sections_data,
        ":wordCount": total_words,
        ":edited": sections_edited,
        ":now": now,
    }
    expression_names = {"#sections": "sections"}

    if request.title is not None:
        update_parts.append("title = :title")
        expression_values[":title"] = request.title

    if request.subtitle is not None:
        update_parts.append("subtitle = :subtitle")
        expression_values[":subtitle"] = request.subtitle

    # Update draft
    await db_client.update_item(
        pk=pk,
        sk="DRAFT",
        update_expression="SET " + ", ".join(update_parts),
        expression_attribute_values=expression_values,
        expression_attribute_names=expression_names,
    )

    # Update current step in METADATA
    await db_client.update_item(
        pk=pk,
        sk="METADATA",
        update_expression="SET current_step = :step, updated_at = :now",
        expression_attribute_values={
            ":step": 4,
            ":now": now,
        },
    )

    logger.info(f"Saved draft for newsletter {newsletter_code}")

    return {"success": True, "updated_at": now, "wordCount": total_words}


@router.put("/{newsletter_code}/draft/section/{section_id}")
async def save_draft_section(
    newsletter_code: str,
    section_id: str,
    request: DraftSectionUpdateRequest,
    user: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Save a single draft section.

    Updates only the specified section's content.
    More efficient than saving the entire draft.
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get existing draft
    draft_item = await db_client.get_item(pk=pk, sk="DRAFT")
    if not draft_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draft not found. Please generate draft first.",
        )

    sections = draft_item.get("sections", [])

    # Find and update the target section
    section_found = False
    for i, section in enumerate(sections):
        if section.get("id") == section_id:
            sections[i]["content"] = request.content
            sections[i]["isEdited"] = True
            if request.title is not None:
                sections[i]["title"] = request.title
            section_found = True
            break

    if not section_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Section {section_id} not found",
        )

    now = datetime.utcnow().isoformat()

    # Calculate new word count
    total_words = sum(len(s.get("content", "").split()) for s in sections)

    # Update modification tracking
    existing_edits = draft_item.get("user_edits", {})
    sections_edited = existing_edits.get("sectionsEdited", 0) + 1

    # Save updated draft
    await db_client.update_item(
        pk=pk,
        sk="DRAFT",
        update_expression=(
            "SET #sections = :sections, "
            "metadata.wordCount = :wordCount, "
            "user_edits.sectionsEdited = :edited, "
            "user_edits.lastEditedAt = :now, "
            "updated_at = :now"
        ),
        expression_attribute_values={
            ":sections": sections,
            ":wordCount": total_words,
            ":edited": sections_edited,
            ":now": now,
        },
        expression_attribute_names={"#sections": "sections"},
    )

    logger.info(f"Saved section {section_id} for {newsletter_code}")

    return {"success": True, "updated_at": now, "wordCount": total_words}


@router.post("/{newsletter_code}/export")
async def export_draft(
    newsletter_code: str,
    request: ExportRequest,
    user: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Export the newsletter draft in the specified format.

    Supported formats:
    - html: Full HTML email with styling
    - markdown: Plain markdown
    - text: Plain text
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

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

    # Get draft
    draft_item = await db_client.get_item(pk=pk, sk="DRAFT")
    if not draft_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Draft not found. Please generate draft first.",
        )

    draft_status = draft_item.get("draft_status", "pending")
    if draft_status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Draft not completed. Status: {draft_status}",
        )

    title = draft_item.get("title", "Newsletter")
    subtitle = draft_item.get("subtitle", "")
    sections = draft_item.get("sections", [])

    # Generate export content based on format
    if request.format == "html":
        content = _generate_html_export(title, subtitle, sections)
        filename = f"{newsletter_code}.html"
        mime_type = "text/html"
    elif request.format == "markdown":
        content = _generate_markdown_export(title, subtitle, sections)
        filename = f"{newsletter_code}.md"
        mime_type = "text/markdown"
    else:  # text
        content = _generate_text_export(title, subtitle, sections)
        filename = f"{newsletter_code}.txt"
        mime_type = "text/plain"

    logger.info(f"Exported {newsletter_code} as {request.format}")

    return {
        "success": True,
        "format": request.format,
        "filename": filename,
        "mime_type": mime_type,
        "content": content,
    }


def _generate_html_export(
    title: str, subtitle: str, sections: List[Dict[str, Any]]
) -> str:
    """Generate HTML export with email-friendly styling."""
    sections_html = ""
    for section in sections:
        section_title = section.get("title", "")
        content = section.get("content", "")
        # Convert markdown to basic HTML
        content_html = _markdown_to_html(content)
        sections_html += f"""
        <div style="margin-bottom: 32px;">
            <h2 style="color: #166534; font-size: 20px; margin-bottom: 12px;">{section_title}</h2>
            <div style="color: #374151; line-height: 1.6;">{content_html}</div>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <header style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #e5e7eb;">
            <h1 style="color: #111827; font-size: 28px; margin: 0 0 8px 0;">{title}</h1>
            {f'<p style="color: #6b7280; font-size: 16px; margin: 0;">{subtitle}</p>' if subtitle else ''}
        </header>
        <main>
            {sections_html}
        </main>
        <footer style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
            <p>Generated with IGAD Innovation Hub Newsletter Generator</p>
        </footer>
    </div>
</body>
</html>"""


def _generate_markdown_export(
    title: str, subtitle: str, sections: List[Dict[str, Any]]
) -> str:
    """Generate markdown export."""
    lines = [f"# {title}"]
    if subtitle:
        lines.append(f"\n*{subtitle}*")
    lines.append("\n---\n")

    for section in sections:
        content = section.get("content", "")
        lines.append(content)
        lines.append("\n")

    lines.append("---\n")
    lines.append("*Generated with IGAD Innovation Hub Newsletter Generator*")

    return "\n".join(lines)


def _generate_text_export(
    title: str, subtitle: str, sections: List[Dict[str, Any]]
) -> str:
    """Generate plain text export."""
    lines = [title.upper(), "=" * len(title)]
    if subtitle:
        lines.append(subtitle)
    lines.append("")

    for section in sections:
        section_title = section.get("title", "")
        content = section.get("content", "")
        # Strip markdown formatting
        plain_content = _strip_markdown(content)
        lines.append(section_title.upper())
        lines.append("-" * len(section_title))
        lines.append(plain_content)
        lines.append("")

    lines.append("-" * 40)
    lines.append("Generated with IGAD Innovation Hub Newsletter Generator")

    return "\n".join(lines)


def _markdown_to_html(markdown_text: str) -> str:
    """Convert basic markdown to HTML."""
    import re

    html = markdown_text

    # Headers
    html = re.sub(r"^### (.+)$", r"<h4>\1</h4>", html, flags=re.MULTILINE)
    html = re.sub(r"^## (.+)$", r"<h3>\1</h3>", html, flags=re.MULTILINE)
    html = re.sub(r"^# (.+)$", r"<h2>\1</h2>", html, flags=re.MULTILINE)

    # Bold and italic
    html = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", html)
    html = re.sub(r"\*(.+?)\*", r"<em>\1</em>", html)

    # Links
    html = re.sub(r"\[(.+?)\]\((.+?)\)", r'<a href="\2">\1</a>', html)

    # Paragraphs
    html = re.sub(r"\n\n", r"</p><p>", html)
    html = f"<p>{html}</p>"

    return html


def _strip_markdown(markdown_text: str) -> str:
    """Strip markdown formatting to plain text."""
    import re

    text = markdown_text

    # Remove headers
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.MULTILINE)

    # Remove bold/italic
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)

    # Convert links to text
    text = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", text)

    return text


@router.post("/ai-complete")
async def ai_complete(
    request: AICompleteRequest, user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    AI autocomplete for inline editing.

    Receives context and partial text, returns AI-generated completion.
    Used by the Novel editor for AI-assisted writing.
    """
    try:
        from app.tools.newsletter_generator.draft_generation.service import (
            DraftGenerationService,
        )

        service = DraftGenerationService()
        completion = service.ai_complete(
            prompt=request.prompt,
            context=request.context,
        )

        return {"completion": completion}

    except Exception as e:
        logger.error(f"AI autocomplete failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI completion failed. Please try again.",
        )
