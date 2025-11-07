from datetime import datetime
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class ProposalStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProposalSection(BaseModel):
    id: str
    title: str
    content: str = ""
    ai_generated: bool = False
    order: int
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProposalTemplate(BaseModel):
    id: str
    name: str
    description: str
    category: str
    sections: List[ProposalSection]
    created_at: datetime
    updated_at: datetime
    version: str = "1.0"
    is_active: bool = True


class Proposal(BaseModel):
    id: str
    user_id: str
    title: str
    description: str = ""
    template_id: Optional[str] = None
    status: ProposalStatus = ProposalStatus.DRAFT
    sections: List[ProposalSection] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    uploaded_files: Dict[str, List[str]] = Field(default_factory=dict)
    text_inputs: Dict[str, str] = Field(default_factory=dict)
    ai_context: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    version: int = 1

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AIGenerationRequest(BaseModel):
    proposal_id: str
    section_id: str
    prompt_template: str
    context_data: Dict[str, Any] = Field(default_factory=dict)
    max_tokens: int = 2000
    temperature: float = 0.7


class AIGenerationResponse(BaseModel):
    content: str
    tokens_used: int
    confidence_score: float
    sources: List[str] = Field(default_factory=list)
    generation_time: float
