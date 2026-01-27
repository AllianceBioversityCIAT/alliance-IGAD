---
name: fastapi-serverless
description: |
  Build Python APIs with FastAPI on AWS Lambda using Mangum, DynamoDB, Cognito, and S3. Covers serverless patterns, single-table design, async Lambda invocation, and Pydantic v2 validation.

  Use when: building serverless FastAPI apps, working with DynamoDB single-table design, implementing Cognito auth, or deploying with SAM/Lambda.
user-invocable: true
---

# FastAPI Serverless Skill

Production patterns for FastAPI on AWS Lambda with DynamoDB, Cognito, and S3.

**Stack Versions** (this project):
- FastAPI: 0.104.1
- Pydantic: 2.5.0
- Mangum: 0.17.0
- boto3: 1.42.0+
- Python: 3.11

---

## Quick Start

### Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app + Mangum handler
│   ├── database/
│   │   └── client.py           # DynamoDB client
│   ├── middleware/
│   │   ├── auth_middleware.py  # Cognito JWT validation
│   │   └── error_middleware.py
│   ├── shared/
│   │   ├── ai/                 # Bedrock/Claude service
│   │   ├── schemas/            # Shared Pydantic models
│   │   └── utils/
│   └── tools/
│       ├── auth/               # Auth routes/service
│       └── proposal_writer/    # Feature module
├── bootstrap                   # Lambda entry script
├── requirements.txt
└── template.yaml               # SAM template
```

### Minimal Lambda Setup

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

app = FastAPI(title="My API")

# CORS - Never use "*" in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "healthy"}

# Lambda handler
handler = Mangum(app, lifespan="off")
```

```bash
# bootstrap (Lambda entry point)
#!/bin/bash
exec python -m awslambdaric app.main.handler
```

---

## DynamoDB Patterns

### Single-Table Design

```python
# Primary key structure
item = {
    "PK": f"PROPOSAL#{proposal_code}",
    "SK": "METADATA",
    "GSI1PK": f"USER#{user_id}",
    "GSI1SK": f"PROPOSAL#{created_at}",
    # Entity attributes
    "proposal_code": proposal_code,
    "title": title,
    "status": "draft",
    "created_at": datetime.utcnow().isoformat(),
}
```

### DynamoDB Client

```python
# app/database/client.py
import boto3
import os

_dynamodb_client = None
_table = None

def get_dynamodb_client():
    global _dynamodb_client
    if _dynamodb_client is None:
        _dynamodb_client = boto3.resource(
            "dynamodb",
            region_name=os.getenv("AWS_REGION", "us-east-1")
        )
    return _dynamodb_client

def get_table():
    global _table
    if _table is None:
        client = get_dynamodb_client()
        _table = client.Table(os.getenv("DYNAMODB_TABLE_NAME"))
    return _table
```

### Query Patterns

```python
from boto3.dynamodb.conditions import Key, Attr

# Get single item
def get_proposal(proposal_code: str) -> dict | None:
    table = get_table()
    response = table.get_item(
        Key={
            "PK": f"PROPOSAL#{proposal_code}",
            "SK": "METADATA"
        }
    )
    return response.get("Item")

# Query by partition key
def get_user_proposals(user_id: str) -> list[dict]:
    table = get_table()
    response = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("GSI1PK").eq(f"USER#{user_id}")
    )
    return response.get("Items", [])

# Query with begins_with
def get_proposal_documents(proposal_code: str) -> list[dict]:
    table = get_table()
    response = table.query(
        KeyConditionExpression=(
            Key("PK").eq(f"PROPOSAL#{proposal_code}") &
            Key("SK").begins_with("DOC#")
        )
    )
    return response.get("Items", [])

# Conditional update
def update_status(proposal_code: str, new_status: str, expected_status: str):
    table = get_table()
    try:
        table.update_item(
            Key={"PK": f"PROPOSAL#{proposal_code}", "SK": "METADATA"},
            UpdateExpression="SET #status = :new_status",
            ConditionExpression="#status = :expected",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":new_status": new_status,
                ":expected": expected_status
            }
        )
        return True
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        return False
```

---

## Cognito Authentication

### Auth Middleware

```python
# app/middleware/auth_middleware.py
import os
import jwt
import requests
from functools import lru_cache
from fastapi import HTTPException, Request

class AuthMiddleware:
    def __init__(self):
        self.user_pool_id = os.getenv("COGNITO_USER_POOL_ID")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.jwks_url = f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
    
    @lru_cache(maxsize=1)
    def get_jwks(self):
        response = requests.get(self.jwks_url)
        return response.json()["keys"]
    
    def verify_token(self, token: str) -> dict:
        try:
            # Get the key id from token header
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header["kid"]
            
            # Find matching key
            keys = self.get_jwks()
            key = next((k for k in keys if k["kid"] == kid), None)
            if not key:
                raise HTTPException(401, "Invalid token")
            
            # Verify token
            payload = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=os.getenv("COGNITO_CLIENT_ID")
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(401, "Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(401, "Invalid token")
```

### Auth Dependency

```python
# app/tools/auth/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()
auth_middleware = AuthMiddleware()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    token = credentials.credentials
    payload = auth_middleware.verify_token(token)
    return {
        "user_id": payload["sub"],
        "email": payload.get("email"),
        "groups": payload.get("cognito:groups", [])
    }

async def require_admin(
    current_user: dict = Depends(get_current_user)
) -> dict:
    if "admin" not in current_user.get("groups", []):
        raise HTTPException(403, "Admin access required")
    return current_user
```

### Protected Routes

```python
from app.tools.auth.dependencies import get_current_user, require_admin

@router.get("/proposals")
async def list_proposals(current_user: dict = Depends(get_current_user)):
    return get_user_proposals(current_user["user_id"])

@router.delete("/proposals/{id}")
async def delete_proposal(
    id: str,
    current_user: dict = Depends(require_admin)
):
    # Admin only
    ...
```

---

## Async Lambda Invocation

For long-running operations (AI processing, document analysis):

### Trigger Pattern

```python
# routes.py
import json
import boto3

lambda_client = boto3.client("lambda")

@router.post("/proposals/{id}/analyze")
async def trigger_analysis(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    # Update status to processing
    update_status(id, "processing", "pending")
    
    # Invoke worker Lambda asynchronously
    lambda_client.invoke(
        FunctionName=os.getenv("WORKER_FUNCTION_NAME"),
        InvocationType="Event",  # Async - returns immediately
        Payload=json.dumps({
            "proposal_id": id,
            "user_id": current_user["user_id"],
            "action": "analyze_rfp"
        })
    )
    
    return {"status": "processing", "message": "Analysis started"}
```

### Worker Lambda

```python
# app/handlers/worker.py
import json
from app.tools.proposal_writer.services import analyze_rfp

def handler(event, context):
    proposal_id = event["proposal_id"]
    action = event["action"]
    
    try:
        if action == "analyze_rfp":
            result = analyze_rfp(proposal_id)
            update_proposal(proposal_id, {
                "rfp_analysis": result,
                "rfp_analysis_status": "completed"
            })
    except Exception as e:
        update_proposal(proposal_id, {
            "rfp_analysis_status": "failed",
            "rfp_analysis_error": str(e)
        })
        raise
```

### Polling Endpoint

```python
@router.get("/proposals/{id}/analysis-status")
async def get_analysis_status(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    proposal = get_proposal(id)
    if not proposal:
        raise HTTPException(404, "Proposal not found")
    
    return {
        "status": proposal.get("rfp_analysis_status", "pending"),
        "error": proposal.get("rfp_analysis_error")
    }
```

---

## Pydantic v2 Patterns

### Schema Design

```python
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from enum import Enum

class ProposalStatus(str, Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ProposalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    budget: float = Field(..., gt=0)

class ProposalUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    status: ProposalStatus | None = None

class ProposalResponse(BaseModel):
    proposal_code: str
    title: str
    status: ProposalStatus
    created_at: str
    
    model_config = ConfigDict(from_attributes=True)
```

### Validation Rules

```python
# Use Field() for constraints - returns 422 correctly
budget: float = Field(..., gt=0, le=10_000_000)

# Avoid ValueError in validators - returns 500!
# Instead use Field constraints or ValidationError

# Optional fields MUST have default
description: str | None = None  # Correct
description: str | None         # Wrong - still required!

# Use str | None not Optional[str] (Python 3.10+)
```

---

## S3 Integration

### Pre-signed URLs

```python
import boto3
from datetime import datetime

s3_client = boto3.client("s3")
BUCKET = os.getenv("S3_BUCKET_NAME")

def generate_upload_url(proposal_id: str, filename: str) -> dict:
    key = f"proposals/{proposal_id}/documents/{datetime.utcnow().isoformat()}_{filename}"
    
    url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": BUCKET,
            "Key": key,
            "ContentType": "application/octet-stream"
        },
        ExpiresIn=3600  # 1 hour
    )
    
    return {"upload_url": url, "key": key}

def generate_download_url(key: str) -> str:
    return s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": key},
        ExpiresIn=3600
    )
```

---

## Error Handling

### Route Pattern

```python
@router.post("/proposals")
async def create_proposal(
    data: ProposalCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        proposal = create_proposal_in_db(data, current_user["user_id"])
        return {"status": "success", "data": proposal}
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.exception(f"Failed to create proposal: {e}")
        raise HTTPException(500, f"Failed to create proposal: {str(e)}")
```

### Validation Error Handler

```python
# app/main.py
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={
            "detail": exc.errors(),
            "message": "Validation failed"
        }
    )
```

---

## CORS Configuration

```python
# Environment-based CORS - NEVER use "*" in production
if ENVIRONMENT == "production":
    allowed_origins = [
        "https://myapp.com",
        "https://www.myapp.com"
    ]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)
```

---

## Prompt Template Pattern

Handle both placeholder formats (templates may use either):

```python
def replace_placeholders(template: str, context: dict) -> str:
    """Replace placeholders in prompt template."""
    for key, value in context.items():
        # Format 1: {{KEY}}
        template = template.replace("{{" + key + "}}", str(value))
        # Format 2: {[KEY]}
        template = template.replace("{[" + key + "]}", str(value))
    return template
```

---

## Testing

### Test Client Setup

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}

@pytest.fixture
def mock_dynamodb():
    with patch("app.database.client.get_table") as mock:
        yield mock
```

### Test Example

```python
def test_create_proposal(client, auth_headers, mock_dynamodb):
    mock_dynamodb.return_value.put_item.return_value = {}
    
    response = client.post(
        "/api/proposals",
        json={"title": "Test", "budget": 10000},
        headers=auth_headers
    )
    
    assert response.status_code == 201
    assert response.json()["data"]["title"] == "Test"
```

---

## SAM Deployment

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Timeout: 30
    Runtime: python3.11
    MemorySize: 512
    Environment:
      Variables:
        DYNAMODB_TABLE_NAME: !Ref ProposalsTable
        S3_BUCKET_NAME: !Ref DocumentsBucket

Resources:
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: backend/
      Handler: app.main.handler
      Events:
        Api:
          Type: HttpApi
          Properties:
            Path: /{proxy+}
            Method: ANY

  WorkerFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: backend/
      Handler: app.handlers.worker.handler
      Timeout: 900  # 15 minutes for long operations
      MemorySize: 1024

  ProposalsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
```

---

## Critical Rules

### Always Do
1. **Use Mangum** for Lambda + FastAPI
2. **Single-table DynamoDB design** with PK/SK pattern
3. **Async Lambda invocation** for long operations (>30s)
4. **Environment-based CORS** - specific origins only
5. **Cognito JWT validation** with JWKS caching
6. **Pydantic Field()** for validation constraints

### Never Do
1. **Never use `*` for CORS origins** in production
2. **Never block Lambda** with sync operations >30s
3. **Never store secrets in code** - use Parameter Store/Secrets Manager
4. **Never skip error handling** - Lambda failures are expensive
5. **Never use SQLAlchemy** - DynamoDB is the database

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Mangum - AWS Lambda Adapter](https://mangum.io/)
- [DynamoDB Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Pydantic v2 Documentation](https://docs.pydantic.dev/)

---

**Last verified**: 2026-01-26 | **Skill version**: 1.0.0
