# Backend Structure

## Overview

The Newsletter Generator backend follows **Screaming Architecture** - each module clearly represents a business capability.

---

## Target Folder Structure

```
igad-app/backend/app/tools/newsletter_generator/
├── __init__.py                 # Module exports
├── routes.py                   # All API endpoints
│
├── config/                     # Step 1: Configuration handling
│   ├── __init__.py
│   └── service.py              # CRUD operations for newsletter config
│
├── topics/                     # Step 2: Topics and RAG
│   ├── __init__.py
│   └── service.py              # Topic selection + Knowledge Base integration
│
├── outline/                    # Step 3: Outline generation
│   ├── __init__.py
│   ├── config.py               # AI configuration
│   └── service.py              # Outline generation with Claude
│
├── draft/                      # Step 4: Draft generation
│   ├── __init__.py
│   ├── config.py               # AI configuration
│   └── service.py              # Draft generation with Claude
│
├── export/                     # Step 4: Export formats
│   ├── __init__.py
│   └── service.py              # PDF, DOCX, HTML generation
│
└── workflow/                   # Async processing
    ├── __init__.py
    └── worker.py               # Lambda worker for AI tasks
```

---

## API Endpoints

### `routes.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/newsletters", tags=["newsletters"])

# ==================== PYDANTIC MODELS ====================

class NewsletterCreate(BaseModel):
    title: str = "Newsletter Draft"
    description: str = ""

class NewsletterUpdate(BaseModel):
    target_audience: Optional[list[str]] = None
    tone_professional: Optional[int] = None
    tone_technical: Optional[int] = None
    format_type: Optional[str] = None
    length_preference: Optional[str] = None
    frequency: Optional[str] = None
    geographic_focus: Optional[str] = None

class TopicsUpdate(BaseModel):
    selected_types: list[str]

class OutlineUpdate(BaseModel):
    sections: list[dict]

class DraftUpdate(BaseModel):
    content: str

# ==================== CRUD ENDPOINTS ====================

@router.post("")
async def create_newsletter(
    newsletter: NewsletterCreate,
    user = Depends(get_current_user)
):
    """Create a new newsletter - one draft per user allowed"""
    pass

@router.get("")
async def get_newsletters(user = Depends(get_current_user)):
    """Get all newsletters for current user"""
    pass

@router.get("/{newsletter_id}")
async def get_newsletter(
    newsletter_id: str,
    user = Depends(get_current_user)
):
    """Get a specific newsletter by ID"""
    pass

@router.put("/{newsletter_id}")
async def update_newsletter(
    newsletter_id: str,
    update: NewsletterUpdate,
    user = Depends(get_current_user)
):
    """Update newsletter configuration (Step 1)"""
    pass

@router.delete("/{newsletter_id}")
async def delete_newsletter(
    newsletter_id: str,
    user = Depends(get_current_user)
):
    """Delete a newsletter and all associated data"""
    pass

# ==================== STEP 2: TOPICS ====================

@router.put("/{newsletter_id}/topics")
async def save_topics(
    newsletter_id: str,
    topics: TopicsUpdate,
    user = Depends(get_current_user)
):
    """Save selected information types"""
    pass

@router.post("/{newsletter_id}/retrieve-content")
async def retrieve_content(
    newsletter_id: str,
    user = Depends(get_current_user)
):
    """Trigger RAG content retrieval from Knowledge Base"""
    pass

@router.get("/{newsletter_id}/retrieval-status")
async def get_retrieval_status(
    newsletter_id: str,
    user = Depends(get_current_user)
):
    """Poll for content retrieval status"""
    pass

# ==================== STEP 3: OUTLINE ====================

@router.post("/{newsletter_id}/generate-outline")
async def generate_outline(
    newsletter_id: str,
    user = Depends(get_current_user)
):
    """Trigger AI outline generation"""
    pass

@router.get("/{newsletter_id}/outline-status")
async def get_outline_status(
    newsletter_id: str,
    user = Depends(get_current_user)
):
    """Poll for outline generation status"""
    pass

@router.put("/{newsletter_id}/outline")
async def update_outline(
    newsletter_id: str,
    outline: OutlineUpdate,
    user = Depends(get_current_user)
):
    """Save user modifications to outline"""
    pass

# ==================== STEP 4: DRAFT ====================

@router.post("/{newsletter_id}/generate-draft")
async def generate_draft(
    newsletter_id: str,
    user = Depends(get_current_user)
):
    """Trigger AI draft generation"""
    pass

@router.get("/{newsletter_id}/draft-status")
async def get_draft_status(
    newsletter_id: str,
    user = Depends(get_current_user)
):
    """Poll for draft generation status"""
    pass

@router.put("/{newsletter_id}/draft")
async def update_draft(
    newsletter_id: str,
    draft: DraftUpdate,
    user = Depends(get_current_user)
):
    """Save user edits to draft"""
    pass

@router.get("/{newsletter_id}/export/{format}")
async def export_newsletter(
    newsletter_id: str,
    format: str,  # "pdf" | "docx" | "html"
    user = Depends(get_current_user)
):
    """Export newsletter in specified format"""
    pass
```

---

## Service Modules

### `config/service.py`

```python
"""
Newsletter Configuration Service

Handles CRUD operations for newsletter configuration.
Similar to Proposal Writer's proposal management.
"""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional

from app.database.client import db_client

def generate_newsletter_code() -> str:
    """Generate unique code: NL-YYYYMMDD-XXXX"""
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    random_suffix = str(uuid.uuid4())[:4].upper()
    return f"NL-{date_str}-{random_suffix}"

class NewsletterConfigService:
    """Service for newsletter configuration management."""
    
    def __init__(self):
        self.table_name = "igad-testing-main-table"
    
    async def create(self, user_id: str, user_email: str, data: Dict) -> Dict:
        """Create a new newsletter."""
        newsletter_id = str(uuid.uuid4())
        newsletter_code = generate_newsletter_code()
        now = datetime.utcnow().isoformat()
        
        item = {
            "PK": f"NEWSLETTER#{newsletter_code}",
            "SK": "METADATA",
            "GSI1PK": f"USER#{user_id}",
            "GSI1SK": f"NEWSLETTER#{now}",
            "id": newsletter_id,
            "newsletterCode": newsletter_code,
            "title": data.get("title", "Newsletter Draft"),
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
        }
        
        await db_client.put_item(item)
        return item
    
    async def get(self, newsletter_code: str) -> Optional[Dict]:
        """Get newsletter by code."""
        pk = f"NEWSLETTER#{newsletter_code}"
        return await db_client.get_item(pk=pk, sk="METADATA")
    
    async def update(self, newsletter_code: str, data: Dict) -> Dict:
        """Update newsletter configuration."""
        # Build update expression dynamically
        pass
    
    async def delete(self, newsletter_code: str) -> None:
        """Delete newsletter and all related items."""
        pk = f"NEWSLETTER#{newsletter_code}"
        # Delete METADATA, TOPICS, OUTLINE, DRAFT
        await db_client.delete_item(pk=pk, sk="METADATA")
        await db_client.delete_item(pk=pk, sk="TOPICS")
        await db_client.delete_item(pk=pk, sk="OUTLINE")
        await db_client.delete_item(pk=pk, sk="DRAFT")
```

### `topics/service.py`

```python
"""
Topics Service

Handles topic selection and RAG content retrieval.
Uses Knowledge Base for content.
"""

from typing import Dict, List, Any
from app.shared.ai.knowledge_base_service import KnowledgeBaseService
from app.database.client import db_client

class TopicsService:
    """Service for topics and RAG operations."""
    
    def __init__(self):
        self.kb_service = KnowledgeBaseService()
    
    async def save_topics(
        self, 
        newsletter_code: str, 
        selected_types: List[str]
    ) -> Dict:
        """Save selected information types."""
        pk = f"NEWSLETTER#{newsletter_code}"
        
        item = {
            "PK": pk,
            "SK": "TOPICS",
            "selected_types": selected_types,
            "retrieval_status": "pending",
            "updated_at": datetime.utcnow().isoformat(),
        }
        
        await db_client.put_item(item)
        return item
    
    async def retrieve_content(
        self, 
        newsletter_code: str, 
        selected_types: List[str]
    ) -> Dict:
        """
        Retrieve content from Knowledge Base.
        Combined query for all selected topics.
        """
        # Build combined query
        query = self._build_query(selected_types)
        
        # Query Knowledge Base
        results = self.kb_service.retrieve_by_topics(selected_types)
        
        # Save to DynamoDB
        pk = f"NEWSLETTER#{newsletter_code}"
        await db_client.update_item(
            pk=pk,
            sk="TOPICS",
            update_expression="SET retrieved_content = :content, retrieval_status = :status",
            expression_attribute_values={
                ":content": results["retrieved_content"],
                ":status": "completed",
            }
        )
        
        return results
    
    def _build_query(self, topics: List[str]) -> str:
        """Build combined query string for Knowledge Base."""
        topic_descriptions = {
            "Breaking News & Updates": "recent news updates agricultural research IGAD",
            "Policy Updates": "policy changes regulations agricultural development",
            "Research Findings": "research results scientific findings agriculture",
            "Technology & Innovation": "technology innovation agricultural technology",
            "Climate-Smart Agriculture": "climate change adaptation sustainable agriculture",
            "Market Access & Trade": "market access trade agricultural products",
            "Funding Opportunities": "grants funding opportunities agricultural projects",
            "Events & Conferences": "events conferences workshops agriculture",
            "Project Updates": "project progress updates success stories",
            "Publications & Resources": "publications reports resources agriculture",
            "Food Security": "food security nutrition food systems",
            "Livestock & Animal Health": "livestock animal health veterinary",
        }
        
        queries = [topic_descriptions.get(t, t) for t in topics]
        return " ".join(queries)
```

### `outline/service.py`

```python
"""
Outline Generation Service

Generates newsletter outline using Claude AI.
Based on Proposal Writer's concept_document_generation.
"""

import json
import logging
from typing import Dict, Any
from datetime import datetime

from app.shared.ai.bedrock_service import BedrockService
from app.database.client import db_client

logger = logging.getLogger(__name__)

class OutlineGenerationService:
    """Service for AI-powered outline generation."""
    
    def __init__(self):
        self.bedrock = BedrockService()
    
    async def generate(
        self,
        newsletter_code: str,
        config: Dict,
        topics: Dict,
        retrieved_content: List[Dict]
    ) -> Dict:
        """Generate newsletter outline using Claude."""
        logger.info(f"Generating outline for {newsletter_code}")
        
        # Load prompt from Prompt Manager
        prompt_parts = await self._get_prompt_template()
        
        # Prepare context
        context = self._prepare_context(config, topics, retrieved_content)
        
        # Build final prompt
        user_prompt = self._inject_context(
            prompt_parts["user_prompt"],
            context
        )
        
        # Call Claude
        response = self.bedrock.invoke_claude(
            system_prompt=prompt_parts["system_prompt"],
            user_prompt=user_prompt,
            max_tokens=4000,
            temperature=0.3,
        )
        
        # Parse response
        outline = self._parse_response(response)
        
        # Save to DynamoDB
        pk = f"NEWSLETTER#{newsletter_code}"
        await db_client.put_item({
            "PK": pk,
            "SK": "OUTLINE",
            "sections": outline["sections"],
            "outline_status": "completed",
            "generated_at": datetime.utcnow().isoformat(),
        })
        
        return outline
```

### `draft/service.py`

```python
"""
Draft Generation Service

Generates full newsletter draft using Claude AI.
Based on Proposal Writer's concept_document_generation.
"""

# Similar structure to outline/service.py
# Uses different prompts and longer output
```

### `export/service.py`

```python
"""
Export Service

Generates PDF, DOCX, and HTML exports of newsletter.
"""

from io import BytesIO
from typing import Dict
from docx import Document
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

class ExportService:
    """Service for newsletter export generation."""
    
    def generate_pdf(self, draft: Dict) -> BytesIO:
        """Generate PDF export."""
        buffer = BytesIO()
        # Use reportlab or weasyprint
        return buffer
    
    def generate_docx(self, draft: Dict) -> BytesIO:
        """Generate DOCX export."""
        doc = Document()
        # Build document with proper styling
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        return buffer
    
    def generate_html(self, draft: Dict) -> str:
        """Generate HTML export."""
        # Render newsletter as responsive HTML
        return html_content
```

---

## Lambda Worker

### `workflow/worker.py`

```python
"""
Newsletter Generator Lambda Worker

Handles async AI tasks:
- Content retrieval from Knowledge Base
- Outline generation
- Draft generation
"""

import json
import logging
from app.tools.newsletter_generator.topics.service import TopicsService
from app.tools.newsletter_generator.outline.service import OutlineGenerationService
from app.tools.newsletter_generator.draft.service import DraftGenerationService

logger = logging.getLogger(__name__)

def lambda_handler(event, context):
    """Main Lambda handler."""
    task_type = event.get("task_type")
    newsletter_code = event.get("newsletter_code")
    
    logger.info(f"Processing {task_type} for {newsletter_code}")
    
    if task_type == "retrieve_content":
        return handle_content_retrieval(event)
    elif task_type == "generate_outline":
        return handle_outline_generation(event)
    elif task_type == "generate_draft":
        return handle_draft_generation(event)
    else:
        raise ValueError(f"Unknown task type: {task_type}")

def handle_content_retrieval(event):
    """Handle RAG content retrieval."""
    service = TopicsService()
    return service.retrieve_content(
        event["newsletter_code"],
        event["selected_types"]
    )

def handle_outline_generation(event):
    """Handle AI outline generation."""
    service = OutlineGenerationService()
    return service.generate(
        event["newsletter_code"],
        event["config"],
        event["topics"],
        event["retrieved_content"]
    )

def handle_draft_generation(event):
    """Handle AI draft generation."""
    service = DraftGenerationService()
    return service.generate(
        event["newsletter_code"],
        event["config"],
        event["outline"]
    )
```

---

## Main App Integration

Add to `app/main.py`:

```python
from app.tools.newsletter_generator.routes import router as newsletter_router

app.include_router(newsletter_router)
```
