# Step 2: Content Planning - Backend Specification

## Overview

This document specifies the backend implementation for Step 2 of the Newsletter Generator. This includes the Knowledge Base service for RAG retrieval and new API endpoints.

---

## New Service: KnowledgeBaseService

### Location
`backend/app/shared/ai/knowledge_base_service.py`

### Configuration

```python
KNOWLEDGE_BASE_ID = "NPDZSLKCYX"
KNOWLEDGE_BASE_NAME = "knowledge-base-igad-web-scraping"
DEFAULT_MAX_RESULTS = 25
DEFAULT_SCORE_THRESHOLD = 0.5
```

### Class Definition

```python
from typing import List, Dict, Any, Optional
import boto3
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class RetrievedChunk:
    """Represents a retrieved content chunk from Knowledge Base."""
    chunk_id: str
    topic_id: str
    content: str
    score: float
    source_url: Optional[str] = None
    source_metadata: Optional[Dict[str, Any]] = None


class KnowledgeBaseService:
    """Service for retrieving content from Bedrock Knowledge Base."""

    KNOWLEDGE_BASE_ID = "NPDZSLKCYX"
    DEFAULT_MAX_RESULTS = 25
    DEFAULT_SCORE_THRESHOLD = 0.5

    def __init__(self):
        """Initialize Bedrock Agent Runtime client."""
        self.client = boto3.client('bedrock-agent-runtime')

    async def retrieve_content(
        self,
        query: str,
        max_results: int = DEFAULT_MAX_RESULTS,
        score_threshold: float = DEFAULT_SCORE_THRESHOLD,
    ) -> List[RetrievedChunk]:
        """
        Retrieve relevant content from Knowledge Base.

        Args:
            query: Search query string
            max_results: Maximum number of results to return
            score_threshold: Minimum relevance score (0-1)

        Returns:
            List of RetrievedChunk objects
        """
        try:
            response = self.client.retrieve(
                knowledgeBaseId=self.KNOWLEDGE_BASE_ID,
                retrievalQuery={'text': query},
                retrievalConfiguration={
                    'vectorSearchConfiguration': {
                        'numberOfResults': max_results,
                    }
                }
            )

            chunks = []
            for i, result in enumerate(response.get('retrievalResults', [])):
                score = result.get('score', 0)

                # Filter by score threshold
                if score < score_threshold:
                    continue

                content = result.get('content', {}).get('text', '')
                location = result.get('location', {})

                chunk = RetrievedChunk(
                    chunk_id=f"chunk-{i:03d}",
                    topic_id="",  # Set by caller based on query context
                    content=content,
                    score=score,
                    source_url=location.get('s3Location', {}).get('uri'),
                    source_metadata={
                        'type': location.get('type'),
                        's3_uri': location.get('s3Location', {}).get('uri'),
                    }
                )
                chunks.append(chunk)

            logger.info(f"Retrieved {len(chunks)} chunks for query (filtered from {len(response.get('retrievalResults', []))})")
            return chunks

        except Exception as e:
            logger.error(f"Knowledge Base retrieval failed: {e}")
            raise

    def build_query_from_topics(
        self,
        topics: List[str],
        config: Dict[str, Any]
    ) -> str:
        """
        Build optimized query from selected topics and configuration.

        Args:
            topics: List of topic IDs
            config: Step 1 configuration including audience, tone, etc.

        Returns:
            Optimized query string
        """
        from .knowledge_base_topics import INFORMATION_TYPES

        # Get topic names
        topic_names = []
        for topic_id in topics:
            topic = next((t for t in INFORMATION_TYPES if t['id'] == topic_id), None)
            if topic:
                topic_names.append(topic['name'])

        # Build query components
        query_parts = []

        # Topic names
        if topic_names:
            query_parts.append(' '.join(topic_names))

        # Audience context
        audiences = config.get('target_audience', [])
        if audiences:
            query_parts.append(' '.join(audiences))

        # Geographic focus
        geo_focus = config.get('geographic_focus', 'IGAD region')
        if geo_focus:
            query_parts.append(geo_focus)

        # Tone-based context
        tone = config.get('tone_preset', 'industry_insight')
        tone_context = {
            'expert_analysis': 'research data scientific studies technical analysis',
            'industry_insight': 'analysis trends insights market developments',
            'friendly_summary': 'practical applications success stories updates'
        }
        query_parts.append(tone_context.get(tone, ''))

        return ' '.join(query_parts)

    def calculate_retrieval_params(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate retrieval parameters based on Step 1 configuration.

        Args:
            config: Step 1 configuration

        Returns:
            Dict with max_chunks, days_back, etc.
        """
        # Base chunks by frequency
        frequency_params = {
            'daily': {'days_back': 2, 'base_chunks': 15},
            'weekly': {'days_back': 14, 'base_chunks': 25},
            'monthly': {'days_back': 45, 'base_chunks': 40},
            'quarterly': {'days_back': 120, 'base_chunks': 50},
        }

        # Length multipliers
        length_multipliers = {
            'quick_read': 0.6,
            'standard': 1.0,
            'deep_dive': 1.5,
        }

        frequency = config.get('frequency', 'weekly')
        length = config.get('length_preference', 'standard')

        base = frequency_params.get(frequency, frequency_params['weekly'])
        multiplier = length_multipliers.get(length, 1.0)

        return {
            'days_back': base['days_back'],
            'max_chunks': int(base['base_chunks'] * multiplier),
        }
```

---

## Topic Definitions

### Location
`backend/app/shared/ai/knowledge_base_topics.py`

```python
"""Information types for newsletter content retrieval."""

INFORMATION_TYPES = [
    # NEWS (Blue badges)
    {
        'id': 'breaking_news',
        'name': 'Breaking News & Updates',
        'category': 'news',
        'description': 'Recent news and updates from IGAD region',
        'audienceRelevance': {
            'researchers': 0.6,
            'policy_makers': 0.9,
            'development_partners': 0.8,
            'ag_tech_industry': 0.7,
            'field_staff': 0.5,
            'farmers': 0.4,
        }
    },
    {
        'id': 'policy_updates',
        'name': 'Policy Updates',
        'category': 'news',
        'description': 'Policy changes and regulations',
        'audienceRelevance': {
            'researchers': 0.7,
            'policy_makers': 1.0,
            'development_partners': 0.9,
            'ag_tech_industry': 0.6,
            'field_staff': 0.4,
            'farmers': 0.3,
        }
    },
    {
        'id': 'food_security',
        'name': 'Food Security Updates',
        'category': 'news',
        'description': 'Food security and nutrition information',
        'audienceRelevance': {
            'researchers': 0.8,
            'policy_makers': 0.9,
            'development_partners': 0.9,
            'ag_tech_industry': 0.5,
            'field_staff': 0.7,
            'farmers': 0.8,
        }
    },

    # INSIGHTS (Purple badges)
    {
        'id': 'research_findings',
        'name': 'Research Findings',
        'category': 'insights',
        'description': 'Scientific research results and studies',
        'audienceRelevance': {
            'researchers': 1.0,
            'policy_makers': 0.7,
            'development_partners': 0.6,
            'ag_tech_industry': 0.8,
            'field_staff': 0.3,
            'farmers': 0.2,
        }
    },
    {
        'id': 'technology_innovation',
        'name': 'Technology & Innovation Spotlight',
        'category': 'insights',
        'description': 'Agricultural technology and digital farming',
        'audienceRelevance': {
            'researchers': 0.8,
            'policy_makers': 0.5,
            'development_partners': 0.6,
            'ag_tech_industry': 1.0,
            'field_staff': 0.6,
            'farmers': 0.7,
        }
    },
    {
        'id': 'climate_smart',
        'name': 'Climate-Smart Agriculture',
        'category': 'insights',
        'description': 'Climate adaptation and sustainable practices',
        'audienceRelevance': {
            'researchers': 0.9,
            'policy_makers': 0.8,
            'development_partners': 0.8,
            'ag_tech_industry': 0.7,
            'field_staff': 0.8,
            'farmers': 0.9,
        }
    },
    {
        'id': 'market_access',
        'name': 'Market Access & Trade',
        'category': 'insights',
        'description': 'Trade and market information',
        'audienceRelevance': {
            'researchers': 0.5,
            'policy_makers': 0.8,
            'development_partners': 0.7,
            'ag_tech_industry': 0.9,
            'field_staff': 0.6,
            'farmers': 0.8,
        }
    },
    {
        'id': 'project_updates',
        'name': 'Project Updates & Success Stories',
        'category': 'insights',
        'description': 'Project progress and impact stories',
        'audienceRelevance': {
            'researchers': 0.5,
            'policy_makers': 0.6,
            'development_partners': 1.0,
            'ag_tech_industry': 0.5,
            'field_staff': 0.7,
            'farmers': 0.6,
        }
    },
    {
        'id': 'livestock',
        'name': 'Livestock & Animal Health',
        'category': 'insights',
        'description': 'Livestock and veterinary information',
        'audienceRelevance': {
            'researchers': 0.7,
            'policy_makers': 0.5,
            'development_partners': 0.5,
            'ag_tech_industry': 0.4,
            'field_staff': 0.9,
            'farmers': 1.0,
        }
    },

    # OPPORTUNITIES (Yellow badges)
    {
        'id': 'funding',
        'name': 'Funding Opportunities',
        'category': 'opportunities',
        'description': 'Grants and funding for projects',
        'audienceRelevance': {
            'researchers': 0.9,
            'policy_makers': 0.5,
            'development_partners': 1.0,
            'ag_tech_industry': 0.7,
            'field_staff': 0.4,
            'farmers': 0.3,
        }
    },
    {
        'id': 'events',
        'name': 'Events & Conferences',
        'category': 'opportunities',
        'description': 'Workshops, conferences, and meetings',
        'audienceRelevance': {
            'researchers': 0.8,
            'policy_makers': 0.7,
            'development_partners': 0.8,
            'ag_tech_industry': 0.6,
            'field_staff': 0.5,
            'farmers': 0.3,
        }
    },

    # RESOURCES (Green badges)
    {
        'id': 'publications',
        'name': 'Publications & Resources',
        'category': 'resources',
        'description': 'Reports, documents, and guides',
        'audienceRelevance': {
            'researchers': 1.0,
            'policy_makers': 0.8,
            'development_partners': 0.7,
            'ag_tech_industry': 0.5,
            'field_staff': 0.4,
            'farmers': 0.2,
        }
    },
]

VALID_TOPIC_IDS = [t['id'] for t in INFORMATION_TYPES]
```

---

## New API Endpoints

### Location
`backend/app/tools/newsletter_generator/routes.py`

### 1. POST /api/newsletters/{newsletter_code}/retrieve-content

**Purpose:** Trigger content retrieval from Knowledge Base.

**Request:**
```json
{
  "selected_types": ["research_findings", "climate_smart", "funding"]
}
```

**Response (Success):**
```json
{
  "success": true,
  "retrieval_status": "completed",
  "total_chunks_retrieved": 25,
  "retrieval_started_at": "2026-01-27T10:00:00Z",
  "retrieval_completed_at": "2026-01-27T10:00:05Z"
}
```

**Response (Error):**
```json
{
  "success": false,
  "retrieval_status": "failed",
  "retrieval_error": "Knowledge Base unavailable"
}
```

**Implementation:**

```python
class RetrieveContentRequest(BaseModel):
    """Request model for content retrieval."""
    selected_types: List[str] = Field(..., min_length=1)


@router.post("/{newsletter_code}/retrieve-content")
async def retrieve_content(
    newsletter_code: str,
    request: RetrieveContentRequest,
    user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Trigger content retrieval from Knowledge Base.

    1. Validates newsletter ownership
    2. Gets Step 1 configuration
    3. Validates selected topics
    4. Calls Knowledge Base service
    5. Stores results in TOPICS item
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

    # Get and verify newsletter
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    if metadata.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Validate topics
    from app.shared.ai.knowledge_base_topics import VALID_TOPIC_IDS
    invalid_topics = [t for t in request.selected_types if t not in VALID_TOPIC_IDS]
    if invalid_topics:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid topic IDs: {invalid_topics}"
        )

    now = datetime.utcnow().isoformat()

    # Build config from metadata
    config = {
        'tone_preset': metadata.get('tone_preset', 'industry_insight'),
        'frequency': metadata.get('frequency', 'weekly'),
        'length_preference': metadata.get('length_preference', 'standard'),
        'target_audience': metadata.get('target_audience', []),
        'geographic_focus': metadata.get('geographic_focus', 'IGAD region'),
    }

    # Initialize Knowledge Base service
    from app.shared.ai.knowledge_base_service import KnowledgeBaseService
    kb_service = KnowledgeBaseService()

    # Calculate retrieval parameters
    retrieval_params = kb_service.calculate_retrieval_params(config)

    # Build query and retrieve content
    query = kb_service.build_query_from_topics(request.selected_types, config)

    try:
        chunks = await kb_service.retrieve_content(
            query=query,
            max_results=retrieval_params['max_chunks'],
        )

        # Assign topic IDs to chunks based on content matching
        # (simplified: distribute evenly for now)
        for i, chunk in enumerate(chunks):
            chunk.topic_id = request.selected_types[i % len(request.selected_types)]

        # Convert chunks to dicts
        retrieved_content = [
            {
                'chunk_id': c.chunk_id,
                'topic_id': c.topic_id,
                'content': c.content,
                'score': c.score,
                'source_url': c.source_url,
                'source_metadata': c.source_metadata,
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
                'max_chunks': retrieval_params['max_chunks'],
                'days_back': retrieval_params['days_back'],
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

        return {
            "success": True,
            "retrieval_status": "completed",
            "total_chunks_retrieved": len(retrieved_content),
            "retrieval_started_at": now,
            "retrieval_completed_at": completed_at,
        }

    except Exception as e:
        logger.error(f"Content retrieval failed: {e}")

        # Store failure
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
```

### 2. GET /api/newsletters/{newsletter_code}/retrieval-status

**Purpose:** Get current retrieval status (for polling).

**Response:**
```json
{
  "retrieval_status": "completed",
  "selected_types": ["research_findings", "climate_smart"],
  "retrieval_config": {
    "tone_preset": "industry_insight",
    "frequency": "weekly",
    "length_preference": "standard",
    "target_audience": ["researchers"],
    "geographic_focus": "IGAD region",
    "max_chunks": 25,
    "days_back": 14
  },
  "retrieved_content": [...],
  "total_chunks_retrieved": 25,
  "retrieval_started_at": "2026-01-27T10:00:00Z",
  "retrieval_completed_at": "2026-01-27T10:00:05Z",
  "retrieval_error": null
}
```

**Implementation:**

```python
@router.get("/{newsletter_code}/retrieval-status")
async def get_retrieval_status(
    newsletter_code: str,
    user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get retrieval status for polling.
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    user_id = user.get("user_id") if user else "anonymous"

    # Verify ownership
    metadata = await db_client.get_item(pk=pk, sk="METADATA")
    if not metadata:
        raise HTTPException(status_code=404, detail="Newsletter not found")
    if metadata.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

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
```

---

## DynamoDB Schema Update

### TOPICS Item Structure

```json
{
  "PK": "NEWSLETTER#NL-20260127-ABCD",
  "SK": "TOPICS",

  "selected_types": ["breaking_news", "research_findings", "climate_smart"],

  "retrieval_config": {
    "tone_preset": "industry_insight",
    "frequency": "weekly",
    "length_preference": "standard",
    "target_audience": ["researchers", "policy_makers"],
    "geographic_focus": "IGAD region",
    "max_chunks": 25,
    "days_back": 14
  },

  "retrieval_status": "completed",
  "retrieval_started_at": "2026-01-27T10:00:00Z",
  "retrieval_completed_at": "2026-01-27T10:00:05Z",
  "retrieval_error": null,

  "retrieved_content": [
    {
      "chunk_id": "chunk-001",
      "topic_id": "research_findings",
      "content": "Recent IGAD study on drought-resistant varieties...",
      "score": 0.89,
      "source_url": "s3://bucket/file.pdf",
      "source_metadata": {
        "type": "S3",
        "s3_uri": "s3://bucket/file.pdf"
      }
    }
  ],

  "total_chunks_retrieved": 25,
  "updated_at": "2026-01-27T10:00:05Z"
}
```

---

## Error Handling

| Error | HTTP Status | Response |
|-------|-------------|----------|
| Newsletter not found | 404 | `{"detail": "Newsletter not found"}` |
| Not authorized | 403 | `{"detail": "Not authorized"}` |
| Invalid topic IDs | 400 | `{"detail": "Invalid topic IDs: [...]"}` |
| No topics selected | 400 | `{"detail": "At least one topic required"}` |
| Knowledge Base error | 500 | `{"success": false, "retrieval_error": "..."}` |

---

## Performance Considerations

1. **Synchronous Implementation:** Knowledge Base retrieval is fast (2-5 seconds), so synchronous is acceptable for MVP
2. **Timeout:** Set 30-second timeout for retrieval operations
3. **Caching:** Consider caching results for identical queries (future enhancement)
4. **Batch Processing:** If async needed later, use Lambda + SQS pattern

---

## Testing

### Manual Testing

```bash
# Test retrieve content
curl -X POST "http://localhost:8000/api/newsletters/NL-xxx/retrieve-content" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"selected_types": ["research_findings", "climate_smart"]}'

# Test retrieval status
curl "http://localhost:8000/api/newsletters/NL-xxx/retrieval-status" \
  -H "Authorization: Bearer $TOKEN"
```

### Unit Tests

- Test `KnowledgeBaseService.build_query_from_topics()`
- Test `KnowledgeBaseService.calculate_retrieval_params()`
- Test endpoint validation (invalid topics, missing auth)
- Mock Knowledge Base client for retrieval tests
