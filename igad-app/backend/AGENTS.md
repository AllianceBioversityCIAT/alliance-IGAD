# AGENTS.md - Backend

Guidelines for AI agents working in the Python FastAPI backend.

> **See also:** Detailed guidelines in [`app/tools/AGENTS.md`](./app/tools/AGENTS.md) for feature modules

---

## FastAPI Skills Reference

> **Primary Skill**: Use `fastapi-serverless` for Lambda + DynamoDB + Cognito patterns specific to this project.
> 
> **Secondary Skill**: Use `fastapi` for general FastAPI patterns, Pydantic v2, and known issues.

### Compatibility Notes

This backend uses **AWS serverless architecture**:

| Skill Pattern | This Backend | Adaptation |
|---------------|--------------|------------|
| SQLAlchemy async | DynamoDB (boto3) | Use `get_dynamodb_client()` |
| `uv` package manager | pip + requirements.txt | Lambda deployment requires pip |
| Lifespan events | Not used | Lambda manages lifecycle |
| Uvicorn deployment | Lambda + Mangum | SAM template handles deployment |
| `async_sessionmaker` | boto3 sync | DynamoDB SDK is sync |

### What Applies from the Skill

- **Pydantic v2 patterns**: Schemas, `Field()` validation, `ConfigDict`
- **Router organization**: `APIRouter` with prefix/tags
- **JWT authentication**: python-jose + passlib patterns
- **CORS configuration**: Environment-based origins (not `*`)
- **Error handling**: `HTTPException` patterns
- **Type hints**: All functions must be typed

### Known Issues to Avoid

From the FastAPI skill, these issues are relevant:

**Issue #6: Pydantic v2 Union Type Breaking Change**
```python
# AVOID: Union with str in path parameters
@router.get("/items/{item_id}")
async def get_item(item_id: int | str):  # Always parses as str!
    ...

# USE: Specific types
@router.get("/items/{item_id}")
async def get_item(item_id: str):  # Explicit
    ...
```

**Issue #7: ValueError Returns 500 Instead of 422**
```python
# AVOID: ValueError in validators
@field_validator('value')
def validate(cls, v):
    if v < 0:
        raise ValueError("Must be positive")  # Returns 500!

# USE: Pydantic Field constraints
value: int = Field(..., gt=0)  # Returns 422 correctly
```

**Async Blocking Prevention**
```python
# AVOID: Blocking calls in async routes
@router.get("/data")
async def get_data():
    time.sleep(1)  # Blocks event loop!
    
# USE: Async alternatives or sync def
@router.get("/data")
def get_data():  # FastAPI runs in thread pool
    time.sleep(1)  # OK in sync function
```

## Quick Reference

```bash
# Setup
pip install -r requirements.txt

# Format & Lint
make format          # Black + isort
make lint            # Flake8
make type-check      # Mypy
make check           # All checks (no fix)

# Test
make test                                    # All tests
pytest tests/test_file.py                    # Single file
pytest tests/test_file.py::test_function     # Single test
pytest tests/ -k "pattern"                   # Match pattern
make test-cov                                # With coverage
```

## Architecture

```
app/
  database/           # DynamoDB client (client.py)
  handlers/           # Lambda entry points
  middleware/         # Auth (auth_middleware.py)
  shared/
    ai/               # BedrockService for Claude API
    database/         # History service, decorators
    documents/        # Document routes
    health/           # Health check routes
    schemas/          # Pydantic models (prompt_model.py)
    vectors/          # Vector store service
  tools/              # Feature modules -> see app/tools/AGENTS.md
    admin/            # Prompts manager, settings
    auth/             # Authentication routes/service
    proposal_writer/  # Main feature
  utils/              # AWS session, bedrock client, doc extraction
  main.py             # FastAPI app entry point
```

### Proposal Writer (`app/tools/proposal_writer/`)

```
rfp_analysis/                 # RFP document analysis
concept_document_generation/  # Concept doc generation
existing_work_analysis/       # Existing work processing
reference_proposals_analysis/ # Reference docs analysis
structure_workplan/           # Structure generation
proposal_template_generation/ # AI template generation
workflow/                     # Worker orchestration
routes.py                     # All API endpoints
```

Each module follows: `__init__.py`, `config.py`, `service.py`

---

## Code Style

### Formatting Rules
- **Black:** line-length 88, target Python 3.11
- **isort:** black profile, 88 char lines
- **Flake8:** max-line 88, ignore E203/W503/E501, max-complexity 21
- **Mypy:** Python 3.11, ignore_missing_imports=true
- **Docstrings:** Google convention (pydocstyle)

### Import Order
```python
# 1. Standard library
import json
import logging
import os
from typing import Any, Dict, List, Optional

# 2. Third-party
import boto3
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

# 3. Local imports
from app.database.client import get_dynamodb_client
from app.shared.ai.bedrock_service import BedrockService
from app.tools.proposal_writer.rfp_analysis.service import RFPAnalyzer
```

### Naming Conventions
| Element | Style | Example |
|---------|-------|---------|
| Files/modules | `snake_case` | `bedrock_service.py` |
| Classes | `PascalCase` | `BedrockService`, `RFPAnalyzer` |
| Functions | `snake_case` | `analyze_rfp()`, `get_proposal()` |
| Private | `_leading` | `_build_query()`, `_sanitize()` |
| Constants | `SCREAMING` | `MAX_FILE_SIZE`, `ENVIRONMENT` |
| Pydantic | `PascalCase` | `ProposalCreate`, `AnalysisResponse` |

### Type Hints
Always use type hints:
```python
def analyze_rfp(
    self,
    proposal_id: str,
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Analyze RFP document."""
    ...
```

### Pydantic v2 Patterns

```python
from pydantic import BaseModel, Field, ConfigDict

# Schema with validation
class ProposalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    budget: float = Field(..., gt=0, description="Budget must be positive")

# Schema for database responses
class ProposalResponse(BaseModel):
    proposal_id: str
    title: str
    status: str
    created_at: str

    model_config = ConfigDict(from_attributes=True)

# Update schema (all optional)
class ProposalUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    status: str | None = None
```

**Key Rules:**
- Use `str | None` (Python 3.10+) instead of `Optional[str]`
- Always add `= None` for truly optional fields
- Use `Field()` for validation constraints
- Separate Create/Update/Response schemas

---

## Error Handling

### Route Handler Pattern
```python
@router.post("/proposals/{proposal_id}/analyze")
async def analyze_proposal(
    proposal_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = service.analyze(proposal_id)
        return {"status": "success", "data": result}
    except HTTPException:
        raise  # Re-raise HTTP exceptions unchanged
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
```

### Service Layer Pattern
```python
def analyze(self, proposal_id: str) -> Dict[str, Any]:
    proposal = self._get_proposal(proposal_id)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    # ... business logic
```

### Validation Error Handler (Recommended)

Add to `main.py` for better 422 error responses:

```python
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "body": exc.body,
            "message": "Validation failed"
        }
    )
```

---

## DynamoDB Patterns

### Single-Table Design
```python
item = {
    "PK": f"PROPOSAL#{proposal_code}",
    "SK": "METADATA",
    "GSI1PK": f"USER#{user_id}",
    "GSI1SK": f"PROPOSAL#{created_at}",
    "proposal_code": proposal_code,
    "title": title,
    "status": "draft",
}
```

### Query Pattern
```python
response = table.query(
    KeyConditionExpression="PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues={
        ":pk": f"USER#{user_id}",
        ":sk": "PROPOSAL#",
    },
)
```

---

## Prompt Placeholder Replacement

**CRITICAL:** Always handle both placeholder formats:

```python
def replace_placeholders(template: str, context: Dict[str, Any]) -> str:
    """Replace placeholders in prompt template."""
    for key, value in context.items():
        # Format 1: {{KEY}}
        template = template.replace("{{" + key + "}}", str(value))
        # Format 2: {[KEY]}
        template = template.replace("{[" + key + "]}", str(value))
    return template
```

**Why:** Prompts from DynamoDB and files use inconsistent formats.

---

## Async Operations Pattern

Long-running AI operations use Lambda invocation + polling:

```python
# Trigger (returns immediately)
@router.post("/proposals/{id}/analyze-rfp")
async def trigger_analysis(id: str):
    lambda_client.invoke(
        FunctionName="AnalysisWorkerFunction",
        InvocationType="Event",  # Async
        Payload=json.dumps({"proposal_id": id}),
    )
    return {"status": "processing"}

# Poll for status
@router.get("/proposals/{id}/rfp-analysis-status")
async def get_status(id: str):
    proposal = get_proposal(id)
    return {"status": proposal.get("rfp_analysis_status", "pending")}
```

---

## Testing

```bash
# Run specific test categories
make test-user           # -m user_management
make test-prompt         # -m prompt_management

# Pytest directly
pytest tests/test_routes.py -v
pytest tests/ -k "test_create" --tb=short
```

### Test Structure
```python
import pytest
from fastapi.testclient import TestClient

@pytest.mark.user_management
def test_create_proposal(client: TestClient, auth_headers: dict):
    response = client.post(
        "/api/proposals",
        json={"title": "Test Proposal"},
        headers=auth_headers,
    )
    assert response.status_code == 201
```

---

## Environment Variables

Required in `.env`:
```
AWS_REGION=us-east-1
AWS_PROFILE=IBD-DEV
COGNITO_USER_POOL_ID=...
COGNITO_CLIENT_ID=...
DYNAMODB_TABLE_NAME=igad-testing-proposals
S3_BUCKET_NAME=igad-testing-documents
```

## Lambda Deployment

- Entry: `bootstrap` script
- Adapter: Mangum wraps FastAPI
- SAM: `../template.yaml`
