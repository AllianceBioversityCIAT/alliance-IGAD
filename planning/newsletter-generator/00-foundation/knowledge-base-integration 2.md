# Knowledge Base Integration - Newsletter Generator

**Document Purpose:** This document is written for **KIRO** (AWS Expert Agent) to assist with implementing the Bedrock Knowledge Base integration for RAG content retrieval.

---

## Overview

The Newsletter Generator needs to retrieve relevant content from an existing AWS Bedrock Knowledge Base to populate newsletter topics. This document specifies the integration requirements.

---

## Existing Knowledge Base Details

| Property | Value |
|----------|-------|
| **Knowledge Base ID** | `NPDZSLKCYX` |
| **Knowledge Base Name** | `knowledge-base-igad-web-scraping` |
| **Region** | `us-east-1` |
| **Content Type** | Web-scraped pages from IGAD websites |
| **Document Count** | 17 pages |
| **Date Tagging** | Pages have date metadata |

**AWS Console Link:**
```
https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/knowledge-bases/NPDZSLKCYX
```

---

## Required Implementation

### 1. New Service File

**Target Location:** `igad-app/backend/app/shared/ai/knowledge_base_service.py`

This service should be created as a new shared module that can be used by Newsletter Generator and potentially other tools in the future.

### 2. AWS SDK Requirements

The service needs to use `bedrock-agent-runtime` client (NOT `bedrock-runtime`):

```python
import boto3

# Correct client for Knowledge Base queries
bedrock_agent = boto3.client(
    'bedrock-agent-runtime',
    region_name='us-east-1'
)

# Use the retrieve API
response = bedrock_agent.retrieve(
    knowledgeBaseId='NPDZSLKCYX',
    retrievalQuery={
        'text': 'query string here'
    },
    retrievalConfiguration={
        'vectorSearchConfiguration': {
            'numberOfResults': 10  # Adjust as needed
        }
    }
)
```

---

## Service Interface Specification

### KnowledgeBaseService Class

```python
"""
Knowledge Base Service

Provides RAG content retrieval from AWS Bedrock Knowledge Base.
Used by Newsletter Generator for topic-based content retrieval.
"""

import boto3
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class RetrievedChunk:
    """Represents a single retrieved content chunk."""
    content: str
    score: float
    source_url: Optional[str]
    source_metadata: Dict[str, Any]

@dataclass
class RetrievalResult:
    """Result from a Knowledge Base retrieval operation."""
    chunks: List[RetrievedChunk]
    total_results: int
    query_used: str

class KnowledgeBaseService:
    """Service for querying AWS Bedrock Knowledge Base."""
    
    KNOWLEDGE_BASE_ID = "NPDZSLKCYX"
    DEFAULT_MAX_RESULTS = 10
    
    def __init__(self, region: str = "us-east-1"):
        """Initialize the Knowledge Base service."""
        self.client = boto3.client(
            'bedrock-agent-runtime',
            region_name=region
        )
        self.knowledge_base_id = self.KNOWLEDGE_BASE_ID
    
    def retrieve(
        self,
        query: str,
        max_results: int = DEFAULT_MAX_RESULTS,
        score_threshold: float = 0.0
    ) -> RetrievalResult:
        """
        Retrieve content from Knowledge Base based on query.
        
        Args:
            query: The search query string
            max_results: Maximum number of results to return
            score_threshold: Minimum relevance score (0.0 to 1.0)
            
        Returns:
            RetrievalResult with chunks and metadata
        """
        pass  # Implementation needed
    
    def retrieve_by_topics(
        self,
        topics: List[str],
        max_results_per_topic: int = 5
    ) -> RetrievalResult:
        """
        Retrieve content for multiple topics using a combined query.
        
        This method builds a combined query from all topics
        rather than making individual queries per topic.
        
        Args:
            topics: List of topic names/descriptions
            max_results_per_topic: Results per topic (total = topics * this)
            
        Returns:
            RetrievalResult with all retrieved chunks
        """
        pass  # Implementation needed
    
    def _build_combined_query(self, topics: List[str]) -> str:
        """
        Build a combined query string from multiple topics.
        
        Maps user-friendly topic names to search-optimized queries.
        """
        pass  # Implementation needed
    
    def _parse_response(self, response: Dict) -> List[RetrievedChunk]:
        """Parse AWS API response into RetrievedChunk objects."""
        pass  # Implementation needed
```

---

## Topic to Query Mapping

The service needs to map user-selected topics to effective search queries:

```python
TOPIC_QUERY_MAPPING = {
    "Breaking News & Updates": "recent news updates agricultural research IGAD region",
    "Policy Updates": "policy changes regulations agricultural development government",
    "Research Findings": "research results scientific findings agriculture studies",
    "Technology & Innovation Spotlight": "technology innovation agricultural technology digital farming",
    "Climate-Smart Agriculture": "climate change adaptation sustainable agriculture resilience",
    "Market Access & Trade": "market access trade agricultural products export import",
    "Funding Opportunities": "grants funding opportunities agricultural projects donors",
    "Events & Conferences": "events conferences workshops agriculture meetings",
    "Project Updates & Success Stories": "project progress updates success stories impact",
    "Publications & Resources": "publications reports resources agriculture documents",
    "Food Security Updates": "food security nutrition food systems hunger",
    "Livestock & Animal Health": "livestock animal health veterinary pastoral",
}

def _build_combined_query(self, topics: List[str]) -> str:
    """Build combined query from selected topics."""
    queries = []
    for topic in topics:
        if topic in TOPIC_QUERY_MAPPING:
            queries.append(TOPIC_QUERY_MAPPING[topic])
        else:
            # Use topic name directly if not in mapping
            queries.append(topic.lower().replace("&", "and"))
    
    # Combine with spaces (not AND/OR - let embedding handle it)
    return " ".join(queries)
```

---

## API Response Format

The AWS `retrieve` API returns responses in this format:

```json
{
    "retrievalResults": [
        {
            "content": {
                "text": "The retrieved text content..."
            },
            "location": {
                "type": "WEB",
                "webLocation": {
                    "url": "https://igad.int/article/..."
                }
            },
            "score": 0.89,
            "metadata": {
                "x-amz-bedrock-kb-source-uri": "https://...",
                "x-amz-bedrock-kb-data-source-id": "...",
                "x-amz-bedrock-kb-chunk-id": "..."
            }
        }
    ],
    "nextToken": "..."  // For pagination if needed
}
```

### Parsing Example

```python
def _parse_response(self, response: Dict) -> List[RetrievedChunk]:
    """Parse AWS API response into RetrievedChunk objects."""
    chunks = []
    
    for result in response.get("retrievalResults", []):
        content_obj = result.get("content", {})
        location_obj = result.get("location", {})
        
        chunk = RetrievedChunk(
            content=content_obj.get("text", ""),
            score=result.get("score", 0.0),
            source_url=location_obj.get("webLocation", {}).get("url"),
            source_metadata=result.get("metadata", {})
        )
        chunks.append(chunk)
    
    return chunks
```

---

## Integration Points

### Where to Use

The Knowledge Base service will be called from:

1. **Backend Route:** `POST /api/newsletters/{id}/retrieve-content`
2. **Lambda Worker:** For async retrieval (if content is large)

### Usage Example

```python
from app.shared.ai.knowledge_base_service import KnowledgeBaseService

kb_service = KnowledgeBaseService()

# Single query retrieval
result = kb_service.retrieve(
    query="climate-smart agriculture drought resistance",
    max_results=10
)

# Multi-topic retrieval (Newsletter Generator use case)
selected_topics = [
    "Research Findings",
    "Climate-Smart Agriculture",
    "Funding Opportunities"
]
result = kb_service.retrieve_by_topics(
    topics=selected_topics,
    max_results_per_topic=5
)

# Access results
for chunk in result.chunks:
    print(f"Score: {chunk.score}")
    print(f"Content: {chunk.content[:200]}...")
    print(f"Source: {chunk.source_url}")
```

---

## Error Handling

The service should handle these scenarios:

```python
from botocore.exceptions import ClientError

class KnowledgeBaseError(Exception):
    """Custom exception for Knowledge Base errors."""
    pass

def retrieve(self, query: str, ...) -> RetrievalResult:
    try:
        response = self.client.retrieve(
            knowledgeBaseId=self.knowledge_base_id,
            retrievalQuery={'text': query},
            ...
        )
        return self._parse_response(response)
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        
        if error_code == 'ResourceNotFoundException':
            logger.error(f"Knowledge Base not found: {self.knowledge_base_id}")
            raise KnowledgeBaseError("Knowledge Base not found")
            
        elif error_code == 'ValidationException':
            logger.error(f"Invalid query: {query}")
            raise KnowledgeBaseError("Invalid query format")
            
        elif error_code == 'ThrottlingException':
            logger.warning("Rate limited by Bedrock")
            raise KnowledgeBaseError("Service rate limited, please retry")
            
        else:
            logger.error(f"Bedrock API error: {e}")
            raise KnowledgeBaseError(f"Knowledge Base error: {error_code}")
            
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise KnowledgeBaseError(f"Unexpected error: {str(e)}")
```

---

## IAM Permissions Required

The Lambda/ECS task role needs these permissions:

```yaml
# Add to template.yaml under the appropriate role
- Effect: Allow
  Action:
    - bedrock:Retrieve
    - bedrock:RetrieveAndGenerate
  Resource:
    - !Sub "arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:knowledge-base/NPDZSLKCYX"
```

**Note:** Check if the current Lambda role already has these permissions. If not, KIRO should add them to `template.yaml`.

---

## Testing the Service

### Unit Test Example

```python
import pytest
from unittest.mock import Mock, patch
from app.shared.ai.knowledge_base_service import KnowledgeBaseService

def test_retrieve_single_query():
    """Test single query retrieval."""
    with patch('boto3.client') as mock_client:
        mock_client.return_value.retrieve.return_value = {
            "retrievalResults": [
                {
                    "content": {"text": "Test content"},
                    "score": 0.95,
                    "location": {"webLocation": {"url": "https://test.com"}}
                }
            ]
        }
        
        service = KnowledgeBaseService()
        result = service.retrieve("test query")
        
        assert len(result.chunks) == 1
        assert result.chunks[0].score == 0.95

def test_retrieve_by_topics():
    """Test multi-topic retrieval."""
    # Similar test setup
    pass
```

### Manual Testing

```bash
# Test with AWS CLI (verify Knowledge Base is accessible)
aws bedrock-agent-runtime retrieve \
    --knowledge-base-id NPDZSLKCYX \
    --retrieval-query '{"text": "climate smart agriculture"}' \
    --region us-east-1
```

---

## Implementation Checklist for KIRO

- [ ] Create `igad-app/backend/app/shared/ai/knowledge_base_service.py`
- [ ] Implement `KnowledgeBaseService` class with all methods
- [ ] Add TOPIC_QUERY_MAPPING configuration
- [ ] Implement error handling with custom exceptions
- [ ] Verify IAM permissions in `template.yaml`
- [ ] Add unit tests in `tests/shared/ai/test_knowledge_base_service.py`
- [ ] Test manually with AWS CLI
- [ ] Document any deviations from this spec

---

## Questions for KIRO

1. **Pagination:** Does the Knowledge Base support pagination for large result sets? Should we implement `nextToken` handling?

2. **Caching:** Should we cache results to avoid redundant queries? If so, what TTL is appropriate?

3. **Metadata Filters:** Can we filter by date range in the retrieval query? The scraped pages have date metadata.

4. **Rate Limits:** What are the rate limits for the `retrieve` API? Should we implement throttling/retry logic?

---

## References

- [AWS Bedrock Knowledge Base Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [Retrieve API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html)
- [boto3 bedrock-agent-runtime](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-agent-runtime.html)
