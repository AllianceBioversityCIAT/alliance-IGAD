# Step 3: Outline Review - Backend Specification

## Overview

This document specifies the backend implementation for Step 3 of the Newsletter Generator. This includes the AI outline generation service, new API endpoints, and DynamoDB schema updates.

---

## AI Service: OutlineGenerationService

### Location
`backend/app/tools/newsletter_generator/outline_service.py`

### Configuration

```python
# AI Model Configuration
MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"
MAX_TOKENS = 8000
TEMPERATURE = 0.3
GENERATION_TIMEOUT = 120  # seconds

# Prompt Configuration
PROMPT_SECTION = "newsletter_generator"
PROMPT_SUB_SECTION = "step-3"
```

### Class Definition

```python
from typing import List, Dict, Any, Optional
import boto3
import json
import logging
from datetime import datetime
from dataclasses import dataclass
from uuid import uuid4

logger = logging.getLogger(__name__)


@dataclass
class OutlineItem:
    """Represents a single outline item."""
    id: str
    section_id: str
    title: str
    description: str
    content_sources: List[str]
    order: int
    is_custom: bool = False
    is_editable: bool = True
    user_notes: Optional[str] = None


@dataclass
class OutlineSection:
    """Represents a section in the newsletter outline."""
    id: str
    name: str
    order: int
    items: List[OutlineItem]


class OutlineGenerationService:
    """Service for generating newsletter outlines using Bedrock Claude."""

    MODEL_ID = "us.anthropic.claude-sonnet-4-20250514-v1:0"
    MAX_TOKENS = 8000
    TEMPERATURE = 0.3

    # Item counts by length preference
    ITEM_COUNTS = {
        'quick_read': {
            'intro': 1,
            'main': 2,
            'updates': 1,
            'conclusion': 1
        },
        'standard': {
            'intro': 1,
            'main': 4,
            'updates': 2,
            'conclusion': 1
        },
        'deep_dive': {
            'intro': 1,
            'main': 6,
            'updates': 3,
            'conclusion': 1
        }
    }

    # Section mapping from topic categories
    TOPIC_SECTION_MAPPING = {
        'news': 'section-updates',           # breaking_news, policy_updates, food_security
        'insights': 'section-main',          # research_findings, technology_innovation, etc.
        'opportunities': 'section-opportunities',
        'resources': 'section-resources'
    }

    def __init__(self, prompt_service):
        """
        Initialize with Bedrock client and prompt service.

        Args:
            prompt_service: Service for loading prompts from DynamoDB
        """
        self.bedrock_client = boto3.client('bedrock-runtime')
        self.prompt_service = prompt_service

    async def generate_outline(
        self,
        newsletter_config: Dict[str, Any],
        retrieved_content: List[Dict[str, Any]],
        selected_topics: List[str]
    ) -> List[OutlineSection]:
        """
        Generate newsletter outline using AI.

        Args:
            newsletter_config: Step 1 configuration (tone, length, audience)
            retrieved_content: Content chunks from Step 2
            selected_topics: Selected topic IDs from Step 2

        Returns:
            List of OutlineSection objects
        """
        # Load prompt template
        prompt_template = await self.prompt_service.get_prompt(
            section="newsletter_generator",
            sub_section="step-3"
        )

        # Calculate item counts
        length = newsletter_config.get('length_preference', 'standard')
        item_counts = self.ITEM_COUNTS.get(length, self.ITEM_COUNTS['standard'])

        # Build context for prompt
        context = self._build_prompt_context(
            newsletter_config,
            retrieved_content,
            selected_topics,
            item_counts
        )

        # Format prompt with context
        prompt = prompt_template.format(**context)

        # Call Bedrock Claude
        response = await self._invoke_model(prompt)

        # Parse response into sections
        sections = self._parse_ai_response(response, retrieved_content)

        return sections

    def _build_prompt_context(
        self,
        config: Dict[str, Any],
        content: List[Dict[str, Any]],
        topics: List[str],
        item_counts: Dict[str, int]
    ) -> Dict[str, Any]:
        """Build context dictionary for prompt template."""

        # Format content chunks by topic
        content_by_topic = {}
        for chunk in content:
            topic = chunk.get('topic_id', 'general')
            if topic not in content_by_topic:
                content_by_topic[topic] = []
            content_by_topic[topic].append({
                'chunk_id': chunk['chunk_id'],
                'content': chunk['content'][:500],  # Truncate for prompt
                'score': chunk.get('score', 0)
            })

        # Tone descriptions
        tone_descriptions = {
            'expert_analysis': 'formal, technical, data-driven language suitable for researchers and experts',
            'industry_insight': 'professional but accessible language balancing depth and clarity',
            'friendly_summary': 'conversational, approachable language for general audiences'
        }

        return {
            'tone_preset': config.get('tone_preset', 'industry_insight'),
            'tone_description': tone_descriptions.get(
                config.get('tone_preset'),
                tone_descriptions['industry_insight']
            ),
            'target_audience': ', '.join(config.get('target_audience', [])),
            'length_preference': config.get('length_preference', 'standard'),
            'selected_topics': ', '.join(topics),
            'content_chunks': json.dumps(content_by_topic, indent=2),
            'main_content_count': item_counts['main'],
            'updates_count': item_counts['updates'],
            'total_items': sum(item_counts.values())
        }

    async def _invoke_model(self, prompt: str) -> str:
        """Invoke Bedrock Claude model."""
        try:
            response = self.bedrock_client.invoke_model(
                modelId=self.MODEL_ID,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": self.MAX_TOKENS,
                    "temperature": self.TEMPERATURE,
                    "messages": [
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ]
                }),
                contentType="application/json",
                accept="application/json"
            )

            response_body = json.loads(response['body'].read())
            return response_body['content'][0]['text']

        except Exception as e:
            logger.error(f"Bedrock invocation failed: {e}")
            raise

    def _parse_ai_response(
        self,
        response: str,
        content: List[Dict[str, Any]]
    ) -> List[OutlineSection]:
        """Parse AI response into structured outline sections."""

        try:
            # Extract JSON from response
            json_match = response
            if '```json' in response:
                json_match = response.split('```json')[1].split('```')[0]
            elif '```' in response:
                json_match = response.split('```')[1].split('```')[0]

            outline_data = json.loads(json_match)

            # Build chunk_id lookup
            chunk_lookup = {c['chunk_id']: c for c in content}

            sections = []
            for section_data in outline_data.get('sections', []):
                items = []
                for item_data in section_data.get('items', []):
                    # Validate content sources
                    valid_sources = [
                        src for src in item_data.get('content_sources', [])
                        if src in chunk_lookup
                    ]

                    item = OutlineItem(
                        id=f"item-{uuid4().hex[:8]}",
                        section_id=section_data['id'],
                        title=item_data['title'],
                        description=item_data['description'],
                        content_sources=valid_sources,
                        order=item_data.get('order', len(items) + 1),
                        is_custom=False,
                        is_editable=True,
                        user_notes=None
                    )
                    items.append(item)

                section = OutlineSection(
                    id=section_data['id'],
                    name=section_data['name'],
                    order=section_data.get('order', len(sections) + 1),
                    items=items
                )
                sections.append(section)

            return sections

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            logger.error(f"Response: {response[:500]}")
            raise ValueError("AI response was not valid JSON")

    def get_default_sections(self) -> List[OutlineSection]:
        """Return default section structure."""
        return [
            OutlineSection(id='section-intro', name='Introduction', order=1, items=[]),
            OutlineSection(id='section-main', name='Main Content', order=2, items=[]),
            OutlineSection(id='section-updates', name='Updates & News', order=3, items=[]),
            OutlineSection(id='section-opportunities', name='Opportunities', order=4, items=[]),
            OutlineSection(id='section-resources', name='Resources', order=5, items=[]),
            OutlineSection(id='section-conclusion', name='Conclusion', order=6, items=[]),
        ]
```

---

## Prompt Template

### Location
DynamoDB: `prompts` table, section=`newsletter_generator`, sub_section=`step-3`

### Template Content

```text
You are an expert newsletter editor for agricultural development communications.

Your task is to create a structured outline for a newsletter based on the following configuration and content.

## Newsletter Configuration

- **Tone**: {tone_preset} - {tone_description}
- **Target Audience**: {target_audience}
- **Length**: {length_preference}
- **Selected Topics**: {selected_topics}

## Retrieved Content

The following content chunks have been retrieved from the knowledge base:

{content_chunks}

## Requirements

Generate a newsletter outline with the following structure:
- **Introduction** (1 item): A welcoming overview that sets context for this newsletter edition
- **Main Content** ({main_content_count} items): In-depth coverage of key topics
- **Updates & News** ({updates_count} items): Brief updates and news items
- **Conclusion** (1 item): Summary and call-to-action

Total items: {total_items}

## Instructions

1. Create compelling titles that capture reader attention
2. Write descriptions that summarize what each section will cover (2-3 sentences)
3. Map content chunks to relevant outline items using chunk_ids
4. Ensure the tone matches "{tone_preset}"
5. Order items by importance and relevance to the audience

## Output Format

Respond with a JSON object in this exact structure:

```json
{{
  "sections": [
    {{
      "id": "section-intro",
      "name": "Introduction",
      "order": 1,
      "items": [
        {{
          "title": "Item title here",
          "description": "2-3 sentence description of what this section covers",
          "content_sources": ["chunk-001", "chunk-002"],
          "order": 1
        }}
      ]
    }},
    {{
      "id": "section-main",
      "name": "Main Content",
      "order": 2,
      "items": [...]
    }},
    {{
      "id": "section-updates",
      "name": "Updates & News",
      "order": 3,
      "items": [...]
    }},
    {{
      "id": "section-conclusion",
      "name": "Conclusion",
      "order": 4,
      "items": [...]
    }}
  ]
}}
```

Generate the outline now:
```

---

## API Endpoints

### Location
`backend/app/tools/newsletter_generator/routes.py`

### 1. POST /api/newsletters/{newsletter_code}/generate-outline

**Purpose:** Trigger AI outline generation.

**Request:** No body required (uses existing newsletter data)

**Response (Success):**
```json
{
  "success": true,
  "outline_status": "completed",
  "sections": [...],
  "generated_at": "2026-01-27T10:15:00Z"
}
```

**Response (Processing):**
```json
{
  "success": true,
  "outline_status": "processing",
  "message": "Outline generation started"
}
```

**Response (Error):**
```json
{
  "success": false,
  "outline_status": "failed",
  "outline_error": "Error message here"
}
```

**Implementation:**

```python
@router.post("/{newsletter_code}/generate-outline")
async def generate_outline(
    newsletter_code: str,
    user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Trigger AI outline generation.

    1. Validates newsletter ownership
    2. Verifies Step 2 is complete
    3. Gets configuration and content
    4. Calls AI outline service
    5. Stores result in OUTLINE item
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

    # Get and verify newsletter
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    if metadata.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Verify Step 2 is complete
    topics = await db_client.get_item(pk=pk, sk="TOPICS")
    if not topics or topics.get("retrieval_status") != "completed":
        raise HTTPException(
            status_code=400,
            detail="Content planning (Step 2) must be completed first"
        )

    if not topics.get("retrieved_content"):
        raise HTTPException(
            status_code=400,
            detail="No content available for outline generation"
        )

    now = datetime.utcnow().isoformat()

    # Set status to processing
    await db_client.put_item({
        "PK": pk,
        "SK": "OUTLINE",
        "outline_status": "processing",
        "sections": [],
        "generated_at": None,
        "generation_config": {
            "tone_preset": metadata.get("tone_preset"),
            "length_preference": metadata.get("length_preference"),
            "target_audience": metadata.get("target_audience", [])
        },
        "user_modifications": {
            "items_added": 0,
            "items_removed": 0,
            "items_edited": 0
        },
        "updated_at": now
    })

    try:
        # Initialize service
        outline_service = OutlineGenerationService(prompt_service)

        # Build config dict
        config = {
            "tone_preset": metadata.get("tone_preset", "industry_insight"),
            "length_preference": metadata.get("length_preference", "standard"),
            "target_audience": metadata.get("target_audience", [])
        }

        # Generate outline
        sections = await outline_service.generate_outline(
            newsletter_config=config,
            retrieved_content=topics.get("retrieved_content", []),
            selected_topics=topics.get("selected_types", [])
        )

        completed_at = datetime.utcnow().isoformat()

        # Convert sections to dicts
        sections_data = [
            {
                "id": s.id,
                "name": s.name,
                "order": s.order,
                "items": [
                    {
                        "id": item.id,
                        "section_id": item.section_id,
                        "title": item.title,
                        "description": item.description,
                        "content_sources": item.content_sources,
                        "order": item.order,
                        "is_custom": item.is_custom,
                        "is_editable": item.is_editable,
                        "user_notes": item.user_notes
                    }
                    for item in s.items
                ]
            }
            for s in sections
        ]

        # Store completed outline
        await db_client.put_item({
            "PK": pk,
            "SK": "OUTLINE",
            "outline_status": "completed",
            "outline_error": None,
            "sections": sections_data,
            "generated_at": completed_at,
            "generation_config": config,
            "user_modifications": {
                "items_added": 0,
                "items_removed": 0,
                "items_edited": 0
            },
            "updated_at": completed_at
        })

        return {
            "success": True,
            "outline_status": "completed",
            "sections": sections_data,
            "generated_at": completed_at
        }

    except Exception as e:
        logger.error(f"Outline generation failed: {e}")

        # Store failure
        await db_client.update_item(
            pk=pk,
            sk="OUTLINE",
            updates={
                "outline_status": "failed",
                "outline_error": str(e),
                "updated_at": datetime.utcnow().isoformat()
            }
        )

        return {
            "success": False,
            "outline_status": "failed",
            "outline_error": str(e)
        }
```

---

### 2. GET /api/newsletters/{newsletter_code}/outline-status

**Purpose:** Get current outline status (for polling).

**Response:**
```json
{
  "outline_status": "completed",
  "sections": [...],
  "generated_at": "2026-01-27T10:15:00Z",
  "generation_config": {
    "tone_preset": "industry_insight",
    "length_preference": "standard",
    "target_audience": ["researchers", "policy_makers"]
  },
  "user_modifications": {
    "items_added": 1,
    "items_removed": 0,
    "items_edited": 2
  },
  "outline_error": null,
  "updated_at": "2026-01-27T10:20:00Z"
}
```

**Implementation:**

```python
@router.get("/{newsletter_code}/outline-status")
async def get_outline_status(
    newsletter_code: str,
    user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get outline status for polling."""
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

    # Verify ownership
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    if metadata.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get OUTLINE item
    outline = await db_client.get_item(pk=pk, sk="OUTLINE")

    if not outline:
        return {
            "outline_status": "pending",
            "sections": [],
            "generated_at": None,
            "generation_config": None,
            "user_modifications": {
                "items_added": 0,
                "items_removed": 0,
                "items_edited": 0
            },
            "outline_error": None,
            "updated_at": None
        }

    return {
        "outline_status": outline.get("outline_status", "pending"),
        "sections": outline.get("sections", []),
        "generated_at": outline.get("generated_at"),
        "generation_config": outline.get("generation_config"),
        "user_modifications": outline.get("user_modifications", {
            "items_added": 0,
            "items_removed": 0,
            "items_edited": 0
        }),
        "outline_error": outline.get("outline_error"),
        "updated_at": outline.get("updated_at")
    }
```

---

### 3. PUT /api/newsletters/{newsletter_code}/outline

**Purpose:** Save outline modifications (item edits).

**Request:**
```json
{
  "sections": [
    {
      "id": "section-main",
      "name": "Main Content",
      "order": 2,
      "items": [
        {
          "id": "item-001",
          "section_id": "section-main",
          "title": "Updated title",
          "description": "Updated description",
          "content_sources": ["chunk-001"],
          "order": 1,
          "is_custom": false,
          "is_editable": true,
          "user_notes": "Focus on policy implications"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "updated_at": "2026-01-27T10:25:00Z"
}
```

**Implementation:**

```python
class OutlineUpdateRequest(BaseModel):
    """Request model for outline update."""
    sections: List[Dict[str, Any]]


@router.put("/{newsletter_code}/outline")
async def update_outline(
    newsletter_code: str,
    request: OutlineUpdateRequest,
    user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """Save outline modifications."""
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

    # Verify ownership
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    if metadata.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate sections
    for section in request.sections:
        if not section.get("items"):
            raise HTTPException(
                status_code=400,
                detail=f"Section '{section.get('name')}' must have at least one item"
            )
        for item in section.get("items", []):
            if not item.get("title") or len(item["title"].strip()) < 5:
                raise HTTPException(
                    status_code=400,
                    detail="Item title must be at least 5 characters"
                )
            if not item.get("description") or len(item["description"].strip()) < 10:
                raise HTTPException(
                    status_code=400,
                    detail="Item description must be at least 10 characters"
                )

    now = datetime.utcnow().isoformat()

    # Get existing outline to preserve metadata
    existing = await db_client.get_item(pk=pk, sk="OUTLINE")

    # Update outline
    await db_client.put_item({
        "PK": pk,
        "SK": "OUTLINE",
        "outline_status": existing.get("outline_status", "completed") if existing else "completed",
        "outline_error": None,
        "sections": request.sections,
        "generated_at": existing.get("generated_at") if existing else now,
        "generation_config": existing.get("generation_config") if existing else {},
        "user_modifications": existing.get("user_modifications", {
            "items_added": 0,
            "items_removed": 0,
            "items_edited": 0
        }) if existing else {
            "items_added": 0,
            "items_removed": 0,
            "items_edited": 0
        },
        "updated_at": now
    })

    return {
        "success": True,
        "updated_at": now
    }
```

---

### 4. POST /api/newsletters/{newsletter_code}/outline-item

**Purpose:** Add a custom item to a section.

**Request:**
```json
{
  "section_id": "section-main",
  "title": "Custom article about soil health",
  "description": "An additional article focusing on soil health practices in the region.",
  "user_notes": "Include recent ICRAF data"
}
```

**Response:**
```json
{
  "success": true,
  "item": {
    "id": "item-abc123",
    "section_id": "section-main",
    "title": "Custom article about soil health",
    "description": "An additional article focusing on soil health practices in the region.",
    "content_sources": [],
    "order": 5,
    "is_custom": true,
    "is_editable": true,
    "user_notes": "Include recent ICRAF data"
  }
}
```

**Implementation:**

```python
class AddOutlineItemRequest(BaseModel):
    """Request model for adding outline item."""
    section_id: str
    title: str = Field(..., min_length=5, max_length=150)
    description: str = Field(..., min_length=10, max_length=500)
    user_notes: Optional[str] = None


@router.post("/{newsletter_code}/outline-item")
async def add_outline_item(
    newsletter_code: str,
    request: AddOutlineItemRequest,
    user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """Add custom item to outline section."""
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

    # Verify ownership
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    if metadata.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get existing outline
    outline = await db_client.get_item(pk=pk, sk="OUTLINE")
    if not outline:
        raise HTTPException(status_code=404, detail="Outline not found")

    # Find section
    sections = outline.get("sections", [])
    section_index = next(
        (i for i, s in enumerate(sections) if s["id"] == request.section_id),
        None
    )
    if section_index is None:
        raise HTTPException(status_code=404, detail=f"Section '{request.section_id}' not found")

    # Create new item
    new_item = {
        "id": f"item-{uuid4().hex[:8]}",
        "section_id": request.section_id,
        "title": request.title,
        "description": request.description,
        "content_sources": [],
        "order": len(sections[section_index].get("items", [])) + 1,
        "is_custom": True,
        "is_editable": True,
        "user_notes": request.user_notes
    }

    # Add to section
    sections[section_index]["items"].append(new_item)

    # Update modifications count
    modifications = outline.get("user_modifications", {
        "items_added": 0,
        "items_removed": 0,
        "items_edited": 0
    })
    modifications["items_added"] = modifications.get("items_added", 0) + 1

    now = datetime.utcnow().isoformat()

    # Save updated outline
    await db_client.put_item({
        **outline,
        "sections": sections,
        "user_modifications": modifications,
        "updated_at": now
    })

    return {
        "success": True,
        "item": new_item
    }
```

---

### 5. DELETE /api/newsletters/{newsletter_code}/outline-item/{item_id}

**Purpose:** Remove an item from the outline.

**Response:**
```json
{
  "success": true,
  "message": "Item removed"
}
```

**Implementation:**

```python
@router.delete("/{newsletter_code}/outline-item/{item_id}")
async def remove_outline_item(
    newsletter_code: str,
    item_id: str,
    user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """Remove item from outline."""
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

    # Verify ownership
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    if metadata.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get existing outline
    outline = await db_client.get_item(pk=pk, sk="OUTLINE")
    if not outline:
        raise HTTPException(status_code=404, detail="Outline not found")

    # Find and remove item
    sections = outline.get("sections", [])
    item_found = False

    for section in sections:
        items = section.get("items", [])

        # Check if item exists in this section
        item_index = next(
            (i for i, item in enumerate(items) if item["id"] == item_id),
            None
        )

        if item_index is not None:
            # Prevent removing last item
            if len(items) <= 1:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot remove the last item in a section"
                )

            items.pop(item_index)
            item_found = True

            # Reorder remaining items
            for i, item in enumerate(items):
                item["order"] = i + 1

            break

    if not item_found:
        raise HTTPException(status_code=404, detail=f"Item '{item_id}' not found")

    # Update modifications count
    modifications = outline.get("user_modifications", {
        "items_added": 0,
        "items_removed": 0,
        "items_edited": 0
    })
    modifications["items_removed"] = modifications.get("items_removed", 0) + 1

    now = datetime.utcnow().isoformat()

    # Save updated outline
    await db_client.put_item({
        **outline,
        "sections": sections,
        "user_modifications": modifications,
        "updated_at": now
    })

    return {
        "success": True,
        "message": "Item removed"
    }
```

---

## DynamoDB Schema

### OUTLINE Item Structure

```json
{
  "PK": "NEWSLETTER#NL-20260127-ABCD",
  "SK": "OUTLINE",

  "outline_status": "completed",
  "outline_error": null,

  "sections": [
    {
      "id": "section-intro",
      "name": "Introduction",
      "order": 1,
      "items": [
        {
          "id": "item-001",
          "section_id": "section-intro",
          "title": "Welcome to the IGAD Agriculture Newsletter",
          "description": "This week's newsletter covers recent developments...",
          "content_sources": [],
          "order": 1,
          "is_custom": false,
          "is_editable": true,
          "user_notes": null
        }
      ]
    },
    {
      "id": "section-main",
      "name": "Main Content",
      "order": 2,
      "items": [...]
    },
    {
      "id": "section-updates",
      "name": "Updates & News",
      "order": 3,
      "items": [...]
    },
    {
      "id": "section-conclusion",
      "name": "Conclusion",
      "order": 4,
      "items": [...]
    }
  ],

  "generated_at": "2026-01-27T10:15:00Z",

  "generation_config": {
    "tone_preset": "industry_insight",
    "length_preference": "standard",
    "target_audience": ["researchers", "policy_makers"]
  },

  "user_modifications": {
    "items_added": 1,
    "items_removed": 0,
    "items_edited": 2
  },

  "updated_at": "2026-01-27T10:20:00Z"
}
```

---

## Error Handling

| Error | HTTP Status | Response |
|-------|-------------|----------|
| Newsletter not found | 404 | `{"detail": "Newsletter not found"}` |
| Not authorized | 403 | `{"detail": "Not authorized"}` |
| Step 2 incomplete | 400 | `{"detail": "Content planning (Step 2) must be completed first"}` |
| No content available | 400 | `{"detail": "No content available for outline generation"}` |
| Section not found | 404 | `{"detail": "Section 'section-id' not found"}` |
| Item not found | 404 | `{"detail": "Item 'item-id' not found"}` |
| Cannot remove last item | 400 | `{"detail": "Cannot remove the last item in a section"}` |
| Invalid title length | 400 | `{"detail": "Item title must be at least 5 characters"}` |
| Invalid description length | 400 | `{"detail": "Item description must be at least 10 characters"}` |
| AI generation failed | 500 | `{"success": false, "outline_error": "..."}` |

---

## Performance Considerations

1. **Synchronous vs Async:** Generation takes 10-30 seconds, so synchronous is acceptable for MVP
2. **Timeout:** Set 120-second timeout for AI generation
3. **Prompt Size:** Limit content chunks to ~500 chars each to stay within context limits
4. **Polling:** Frontend polls every 2 seconds with 5-minute timeout
5. **Future Enhancement:** Consider Lambda + SQS for async processing at scale

---

## Testing

### Manual Testing

```bash
# Test generate outline
curl -X POST "http://localhost:8000/api/newsletters/NL-xxx/generate-outline" \
  -H "Authorization: Bearer $TOKEN"

# Test get outline status
curl "http://localhost:8000/api/newsletters/NL-xxx/outline-status" \
  -H "Authorization: Bearer $TOKEN"

# Test update outline
curl -X PUT "http://localhost:8000/api/newsletters/NL-xxx/outline" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sections": [...]}'

# Test add item
curl -X POST "http://localhost:8000/api/newsletters/NL-xxx/outline-item" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"section_id": "section-main", "title": "New item", "description": "Description here"}'

# Test remove item
curl -X DELETE "http://localhost:8000/api/newsletters/NL-xxx/outline-item/item-001" \
  -H "Authorization: Bearer $TOKEN"
```

### Unit Tests

- Test `OutlineGenerationService._build_prompt_context()`
- Test `OutlineGenerationService._parse_ai_response()`
- Test endpoint validation (Step 2 incomplete, invalid items)
- Mock Bedrock client for generation tests
- Test item validation (min/max lengths)
