from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class ProposalSection(str, Enum):
    # Main sections
    PROPOSAL_WRITER = "proposal_writer"
    NEWSLETTER_GENERATOR = "newsletter_generator"
    # Legacy sections for backward compatibility
    PROBLEM_STATEMENT = "problem_statement"
    OBJECTIVES = "objectives"
    METHODOLOGY = "methodology"
    BUDGET = "budget"
    THEORY_OF_CHANGE = "theory_of_change"
    LITERATURE_REVIEW = "literature_review"
    TIMELINE = "timeline"
    RISK_ASSESSMENT = "risk_assessment"
    SUSTAINABILITY = "sustainability"
    MONITORING_EVALUATION = "monitoring_evaluation"
    EXECUTIVE_SUMMARY = "executive_summary"
    APPENDICES = "appendices"

class FewShotExample(BaseModel):
    input: str
    output: str

class PromptContext(BaseModel):
    persona: Optional[str] = None
    tone: Optional[str] = None
    sources: Optional[List[str]] = None
    constraints: Optional[str] = None
    guardrails: Optional[str] = None

class PromptBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    section: ProposalSection
    route: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    system_prompt: str = Field(..., min_length=1)
    user_prompt_template: str = Field(..., min_length=1)
    few_shot: Optional[List[FewShotExample]] = None
    context: Optional[PromptContext] = None

class PromptCreate(PromptBase):
    pass

class PromptUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    section: Optional[ProposalSection] = None
    route: Optional[str] = None
    tags: Optional[List[str]] = None
    system_prompt: Optional[str] = Field(None, min_length=1)
    user_prompt_template: Optional[str] = Field(None, min_length=1)
    few_shot: Optional[List[FewShotExample]] = None
    context: Optional[PromptContext] = None

class Prompt(PromptBase):
    id: str
    version: int
    is_active: bool = Field(default=True, description="Whether the prompt is active and available for use")
    created_by: str
    updated_by: str
    created_at: datetime
    updated_at: datetime

class PromptListResponse(BaseModel):
    prompts: List[Prompt]
    total: int
    has_more: bool

class PromptPreviewRequest(BaseModel):
    system_prompt: str
    user_prompt_template: str
    variables: Optional[Dict[str, str]] = None
    context: Optional[PromptContext] = None

class PromptPreviewResponse(BaseModel):
    output: str
    tokens_used: int
    processing_time: float
