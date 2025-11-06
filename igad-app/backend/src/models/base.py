"""
Base models for IGAD Innovation Hub
Pydantic models for request/response validation
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, EmailStr
from enum import Enum

class TimestampMixin(BaseModel):
    """Mixin for timestamp fields"""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserRole(str, Enum):
    """User roles in the system"""
    ADMIN = "admin"
    EDITOR = "editor" 
    CONSUMER = "consumer"

class User(TimestampMixin):
    """User model"""
    user_id: str = Field(..., description="Unique user identifier")
    email: EmailStr = Field(..., description="User email address")
    given_name: str = Field(..., description="User first name")
    family_name: str = Field(..., description="User last name")
    organization: Optional[str] = Field(None, description="User organization")
    role: UserRole = Field(default=UserRole.CONSUMER, description="User role")
    country: Optional[str] = Field(None, description="User country code")
    is_active: bool = Field(default=True, description="User active status")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")

class ProposalStatus(str, Enum):
    """Proposal status options"""
    DRAFT = "draft"
    IN_PROGRESS = "in-progress"
    REVIEW = "review"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class Proposal(TimestampMixin):
    """Proposal model"""
    proposal_id: str = Field(..., description="Unique proposal identifier")
    user_id: str = Field(..., description="Owner user ID")
    title: str = Field(..., description="Proposal title")
    description: Optional[str] = Field(None, description="Proposal description")
    status: ProposalStatus = Field(default=ProposalStatus.DRAFT, description="Proposal status")
    content: Dict[str, Any] = Field(default_factory=dict, description="Proposal content")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    tags: List[str] = Field(default_factory=list, description="Proposal tags")
    version: int = Field(default=1, description="Proposal version")

class NewsletterStatus(str, Enum):
    """Newsletter status options"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"

class Newsletter(TimestampMixin):
    """Newsletter model"""
    newsletter_id: str = Field(..., description="Unique newsletter identifier")
    user_id: str = Field(..., description="Creator user ID")
    title: str = Field(..., description="Newsletter title")
    subject: str = Field(..., description="Email subject line")
    status: NewsletterStatus = Field(default=NewsletterStatus.DRAFT, description="Newsletter status")
    content: Dict[str, Any] = Field(default_factory=dict, description="Newsletter content")
    recipients: List[str] = Field(default_factory=list, description="Recipient email addresses")
    scheduled_at: Optional[datetime] = Field(None, description="Scheduled send time")
    sent_at: Optional[datetime] = Field(None, description="Actual send time")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Email metrics")

# Request/Response models
class UserCreate(BaseModel):
    """User creation request"""
    email: EmailStr
    given_name: str
    family_name: str
    organization: Optional[str] = None
    country: Optional[str] = None

class UserUpdate(BaseModel):
    """User update request"""
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    organization: Optional[str] = None
    country: Optional[str] = None

class ProposalCreate(BaseModel):
    """Proposal creation request"""
    title: str
    description: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class ProposalUpdate(BaseModel):
    """Proposal update request"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProposalStatus] = None
    content: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

class NewsletterCreate(BaseModel):
    """Newsletter creation request"""
    title: str
    subject: str
    recipients: List[EmailStr]
    scheduled_at: Optional[datetime] = None

class NewsletterUpdate(BaseModel):
    """Newsletter update request"""
    title: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[NewsletterStatus] = None
    content: Optional[Dict[str, Any]] = None
    recipients: Optional[List[EmailStr]] = None
    scheduled_at: Optional[datetime] = None

class APIResponse(BaseModel):
    """Standard API response"""
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Any] = None
    errors: Optional[List[str]] = None

class PaginatedResponse(BaseModel):
    """Paginated response"""
    items: List[Any]
    total: int
    page: int = 1
    per_page: int = 20
    has_next: bool = False
    has_prev: bool = False
