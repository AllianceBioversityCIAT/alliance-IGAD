# AGENTS.md - Backend Tools

Guidelines for AI agents working in the `app/tools/` directory - feature modules for the IGAD platform.

> **Parent doc:** [`../../AGENTS.md`](../../AGENTS.md)

## Directory Structure

```
app/tools/
├── proposal_writer/      # Main feature - AI proposal generation (active)
│   ├── routes.py         # All API endpoints
│   ├── rfp_analysis/
│   ├── concept_evaluation/
│   ├── concept_document_generation/
│   ├── existing_work_analysis/
│   ├── reference_proposals_analysis/
│   ├── structure_workplan/
│   ├── proposal_template_generation/
│   ├── proposal_draft_feedback/
│   └── workflow/         # Lambda worker
├── admin/
│   ├── prompts_manager/  # CRUD for AI prompts
│   └── settings/         # System settings
├── auth/                 # Cognito authentication
├── newsletter_generator/ # (placeholder)
├── policy_analyzer/      # (placeholder)
├── agribusiness_hub/     # (placeholder)
└── report_generator/     # (placeholder)
```

Each feature module follows: `routes.py` + submodules with `service.py` + `config.py`

---

## Module Pattern

### Standard Structure
```
feature_name/
├── __init__.py           # Empty or exports
├── routes.py             # FastAPI router with endpoints
├── subfeature/
│   ├── __init__.py
│   ├── service.py        # Business logic class
│   └── config.py         # AI/processing settings
└── workflow/
    ├── __init__.py
    └── worker.py         # Lambda worker (if async)
```

---

## Routes Pattern (`routes.py`)

### Router Setup
```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

router = APIRouter(prefix="/api/proposals", tags=["proposals"])
security = HTTPBearer()
auth_middleware = AuthMiddleware()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    """Dependency for protected endpoints."""
    return auth_middleware.verify_token(credentials)
```

### Pydantic Models
```python
from pydantic import BaseModel
from typing import Optional, Dict, Any

class ProposalCreate(BaseModel):
    title: str
    description: str = ""
    template_id: Optional[str] = None

class ProposalUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
```

### Endpoint Pattern
```python
@router.post("", response_model=None)
async def create_proposal(
    body: ProposalCreate,
    user: dict = Depends(get_current_user),
):
    try:
        # Business logic
        proposal = await create_proposal_logic(body, user)
        
        # Filter DynamoDB keys from response
        response = {k: v for k, v in proposal.items() 
                   if k not in ["PK", "SK", "GSI1PK", "GSI1SK"]}
        return {"proposal": response}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
```

### CRUD Endpoints Naming
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/{feature}` | Create |
| GET | `/api/{feature}` | List all |
| GET | `/api/{feature}/{id}` | Get one |
| PUT | `/api/{feature}/{id}` | Update |
| DELETE | `/api/{feature}/{id}` | Delete |

---

## Service Class Pattern (`service.py`)

```python
"""
Service description with workflow explanation.
"""
import os
from typing import Any, Dict, Optional
import boto3

from app.shared.ai.bedrock_service import BedrockService
from app.utils.aws_session import get_aws_session
from .config import FEATURE_SETTINGS


class FeatureService:
    """
    Docstring with:
    - Purpose
    - Workflow steps
    - Return format
    """
    
    def __init__(self):
        """Initialize AWS clients and configuration."""
        self.s3 = boto3.client("s3")
        self.bucket = os.environ.get("PROPOSALS_BUCKET")
        self.bedrock = BedrockService()
        self.dynamodb = boto3.resource("dynamodb")
        self.table_name = os.environ.get("TABLE_NAME", "igad-testing-main-table")
    
    def process(self, proposal_id: str) -> Dict[str, Any]:
        """
        Public method with clear docstring.
        
        Args:
            proposal_id: Unique proposal identifier
            
        Returns:
            Dict with result data and status
        """
        print(f"Step 1: Loading data for {proposal_id}")
        # Step-by-step implementation
        
        print(f"Step 2: Processing...")
        # More steps
        
        print(f"Completed successfully")
        return {"status": "completed", "data": result}
    
    def _private_helper(self, data: str) -> str:
        """Private helper method with underscore prefix."""
        pass
```

### Logging Convention
```python
print(f"Step 1: Loading...")        # Step markers
print(f"   Detail: {value}")        # Indented details
print(f"Completed for {id}")        # Success with emoji
print(f"ERROR: {str(e)}")           # Error with emoji
```

---

## Config Pattern (`config.py`)

```python
"""
Configuration for Feature Name.

Purpose:
- What this feature does

Settings:
- model: AI model to use
- max_tokens: Maximum response length
- temperature: Creativity (0.0=deterministic, 1.0=creative)

Usage:
    from .config import FEATURE_SETTINGS
    max_tokens = FEATURE_SETTINGS["max_tokens"]
"""

FEATURE_SETTINGS = {
    # ==================== AI Model Configuration ====================
    "model": "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "max_tokens": 12000,
    "temperature": 0.2,
    "top_p": 0.9,
    "top_k": 250,
    
    # ==================== Processing Settings ====================
    "timeout": 300,
    "max_pages": 100,
    
    # ==================== DynamoDB Prompt Lookup ====================
    "section": "proposal_writer",
    "sub_section": "step-1",
    "category": "RFP Analysis",
}
```

---

## AI/Bedrock Integration

### Using BedrockService
```python
from app.shared.ai.bedrock_service import BedrockService
from .config import FEATURE_SETTINGS

class MyService:
    def __init__(self):
        self.bedrock = BedrockService()
    
    def analyze(self, data: str) -> str:
        response = self.bedrock.invoke_claude(
            system_prompt=prompt_parts["system_prompt"],
            user_prompt=prompt_parts["user_prompt"],
            max_tokens=FEATURE_SETTINGS.get("max_tokens", 12000),
            temperature=FEATURE_SETTINGS.get("temperature", 0.2),
            model_id=FEATURE_SETTINGS["model"],
        )
        return response
```

### Loading Prompts from DynamoDB
```python
from boto3.dynamodb.conditions import Attr

def get_prompt_from_dynamodb(self) -> Optional[Dict[str, str]]:
    """Load active prompt matching feature criteria."""
    table = self.dynamodb.Table(self.table_name)
    
    filter_expr = (
        Attr("is_active").eq(True)
        & Attr("section").eq("proposal_writer")
        & Attr("sub_section").eq("step-1")
        & Attr("categories").contains("RFP Analysis")
    )
    
    response = table.scan(FilterExpression=filter_expr)
    items = response.get("Items", [])
    
    if not items:
        return None
    
    prompt = items[0]
    return {
        "system_prompt": prompt.get("system_prompt", ""),
        "user_prompt": prompt.get("user_prompt_template", ""),
    }
```

### Prompt Placeholder Formats

**CRITICAL:** When writing code that handles prompt variables/placeholders, **always handle both formats**:

| Format | Example | Pattern |
|--------|---------|---------|
| Double curly braces | `{{VARIABLE_NAME}}` | `{{KEY}}` |
| Curly + square brackets | `{[VARIABLE_NAME]}` | `{[KEY]}` |

**Implementation pattern:**
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

**Why:** Prompts come from different sources (DynamoDB, files) with inconsistent formats. Missing replacement causes AI to see raw placeholders instead of actual data.

---

## DynamoDB Access Patterns

### Key Structure
```python
# Proposals
PK = f"PROPOSAL#{proposal_code}"
SK = "METADATA"                      # Main record
SK = "RFP_ANALYSIS"                  # Analysis result
SK = "CONCEPT_ANALYSIS"              # Concept evaluation
SK = "OUTLINE"                       # Proposal outline
SK = "CONCEPT_DOCUMENT_V2"           # Generated document

GSI1PK = f"USER#{user_id}"           # Query by user
GSI1SK = f"PROPOSAL#{timestamp}"     # Sort by date

# Prompts
PK = f"prompt#{prompt_id}"
SK = f"version#{version}"
```

### Using db_client
```python
from app.database.client import db_client

# Async (for routes)
proposal = await db_client.get_item(pk=pk, sk="METADATA")
await db_client.put_item(new_item)
await db_client.update_item(
    pk=pk, sk="METADATA",
    update_expression="SET status = :s, updated_at = :u",
    expression_attribute_values={":s": "completed", ":u": now}
)
proposals = await db_client.query_items(pk=f"USER#{user_id}", index_name="GSI1")

# Sync (for Lambda workers)
proposal = db_client.get_item_sync(pk=pk, sk="METADATA")
db_client.update_item_sync(...)
```

---

## Async Workflow Pattern

For long-running AI operations, use Lambda workers with polling:

### 1. Trigger Endpoint (returns immediately)
```python
@router.post("/{proposal_id}/analyze-rfp")
async def analyze_rfp(proposal_id: str, user=Depends(get_current_user)):
    # Check cache
    if proposal.get("rfp_analysis"):
        return {"status": "completed", "data": proposal["rfp_analysis"], "cached": True}
    
    # Check in progress
    if proposal.get("analysis_status_rfp") == "processing":
        return {"status": "processing"}
    
    # Set status and invoke worker
    await db_client.update_item(pk=pk, sk="METADATA",
        update_expression="SET analysis_status_rfp = :s",
        expression_attribute_values={":s": "processing"})
    
    lambda_client.invoke(
        FunctionName=worker_arn,
        InvocationType="Event",  # Async
        Payload=json.dumps({"proposal_id": proposal_id, "task": "analyze_rfp"})
    )
    
    return {"status": "processing", "message": "Poll status endpoint"}
```

### 2. Status Endpoint (for polling)
```python
@router.get("/{proposal_id}/rfp-analysis-status")
async def get_status(proposal_id: str, user=Depends(get_current_user)):
    status = proposal.get("analysis_status_rfp", "not_started")
    
    if status == "completed":
        return {"status": "completed", "data": proposal.get("rfp_analysis")}
    elif status == "failed":
        return {"status": "failed", "error": proposal.get("rfp_analysis_error")}
    else:
        return {"status": status}
```

### 3. Worker (`workflow/worker.py`)
```python
def lambda_handler(event, context):
    task = event.get("task")
    proposal_id = event.get("proposal_id")
    
    if task == "analyze_rfp":
        _handle_rfp_analysis(proposal_id)
    elif task == "analyze_concept":
        _handle_concept_analysis(proposal_id)
    # ... more tasks

def _handle_rfp_analysis(proposal_id: str):
    try:
        analyzer = SimpleRFPAnalyzer()
        result = analyzer.analyze_rfp(proposal_id)
        
        # Save result and update status
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}", sk="METADATA",
            update_expression="SET analysis_status_rfp = :s, rfp_analysis = :r",
            expression_attribute_values={":s": "completed", ":r": result}
        )
    except Exception as e:
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}", sk="METADATA",
            update_expression="SET analysis_status_rfp = :s, rfp_analysis_error = :e",
            expression_attribute_values={":s": "failed", ":e": str(e)}
        )
```

---

## Standard Imports

```python
# Standard library
import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

# Third-party
import boto3
from boto3.dynamodb.conditions import Attr, Key
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

# Internal - Database
from app.database.client import db_client

# Internal - Auth
from app.middleware.auth_middleware import AuthMiddleware

# Internal - AI
from app.shared.ai.bedrock_service import BedrockService

# Internal - Utils
from app.utils.aws_session import get_aws_session

# Local config
from .config import FEATURE_SETTINGS
```

---

## Creating a New Tool

1. Create directory: `app/tools/my_feature/`
2. Add `__init__.py` (empty)
3. Create `routes.py` with router and endpoints
4. For each subfeature:
   - Create `subfeature/service.py` with service class
   - Create `subfeature/config.py` with settings
5. If async needed, add `workflow/worker.py`
6. Register router in `app/main.py`:
   ```python
   from app.tools.my_feature.routes import router as my_feature_router
   app.include_router(my_feature_router)
   ```

---

## Proposal Writer Deep Dive

See [`proposal_writer/ARCHITECTURE.md`](./proposal_writer/ARCHITECTURE.md) for detailed documentation of:
- 4-step workflow (RFP → Concept → Structure → Template)
- Data models and DynamoDB schema
- AI prompt configuration
- Error handling and retry logic
