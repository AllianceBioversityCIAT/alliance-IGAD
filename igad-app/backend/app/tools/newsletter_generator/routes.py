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
