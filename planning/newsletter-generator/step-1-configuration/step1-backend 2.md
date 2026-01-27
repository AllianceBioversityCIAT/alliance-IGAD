# Step 1: Configuration - Backend Implementation

## API Endpoints

### POST /api/newsletters

Create a new newsletter.

**Request:**
```json
{
  "title": "Newsletter Draft"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "newsletterCode": "NL-20260126-A1B2",
  "title": "Newsletter Draft",
  "status": "draft",
  "target_audience": [],
  "tone_professional": 50,
  "tone_technical": 50,
  "format_type": "email",
  "length_preference": "mixed",
  "frequency": "weekly",
  "geographic_focus": "",
  "current_step": 1,
  "created_at": "2026-01-26T10:30:00Z",
  "updated_at": "2026-01-26T10:30:00Z"
}
```

---

### GET /api/newsletters/{newsletter_code}

Get newsletter by code.

**Response:**
```json
{
  "id": "uuid-string",
  "newsletterCode": "NL-20260126-A1B2",
  "title": "Newsletter Draft",
  "status": "draft",
  "target_audience": ["researchers", "policy_makers"],
  "tone_professional": 70,
  "tone_technical": 40,
  "format_type": "email",
  "length_preference": "mixed",
  "frequency": "weekly",
  "geographic_focus": "East Africa",
  "current_step": 1,
  "created_at": "2026-01-26T10:30:00Z",
  "updated_at": "2026-01-26T10:35:00Z"
}
```

---

### PUT /api/newsletters/{newsletter_code}

Update newsletter configuration.

**Request:**
```json
{
  "target_audience": ["researchers", "policy_makers"],
  "tone_professional": 70,
  "tone_technical": 40,
  "format_type": "email",
  "length_preference": "mixed",
  "frequency": "weekly",
  "geographic_focus": "East Africa"
}
```

**Response:**
```json
{
  "success": true,
  "updated_at": "2026-01-26T10:35:00Z"
}
```

---

### GET /api/newsletters

List all newsletters for current user.

**Response:**
```json
{
  "newsletters": [
    {
      "newsletterCode": "NL-20260126-A1B2",
      "title": "Newsletter Draft",
      "status": "draft",
      "current_step": 1,
      "created_at": "2026-01-26T10:30:00Z",
      "updated_at": "2026-01-26T10:35:00Z"
    }
  ],
  "total": 1
}
```

---

### DELETE /api/newsletters/{newsletter_code}

Delete newsletter and all associated data.

**Response:**
```json
{
  "success": true,
  "deleted": "NL-20260126-A1B2"
}
```

---

## Implementation

### routes.py

```python
"""
Newsletter Generator Routes

API endpoints for newsletter CRUD operations.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

from app.auth.dependencies import get_current_user
from app.database.client import db_client

router = APIRouter(prefix="/api/newsletters", tags=["newsletters"])


# ==================== PYDANTIC MODELS ====================

class NewsletterCreate(BaseModel):
    """Request model for creating a newsletter."""
    title: str = Field(default="Newsletter Draft", max_length=200)


class NewsletterUpdate(BaseModel):
    """Request model for updating newsletter configuration."""
    target_audience: Optional[List[str]] = None
    tone_professional: Optional[int] = Field(None, ge=0, le=100)
    tone_technical: Optional[int] = Field(None, ge=0, le=100)
    format_type: Optional[str] = None
    length_preference: Optional[str] = None
    frequency: Optional[str] = None
    geographic_focus: Optional[str] = None


class NewsletterResponse(BaseModel):
    """Response model for newsletter data."""
    id: str
    newsletterCode: str
    title: str
    status: str
    target_audience: List[str]
    tone_professional: int
    tone_technical: int
    format_type: str
    length_preference: str
    frequency: str
    geographic_focus: str
    current_step: int
    created_at: str
    updated_at: str


# ==================== HELPERS ====================

def generate_newsletter_code() -> str:
    """Generate unique code: NL-YYYYMMDD-XXXX

    Consistent with Proposal Writer format (PROP-YYYYMMDD-XXXX).
    """
    now = datetime.utcnow()
    date_str = now.strftime("%Y%m%d")
    random_suffix = str(uuid.uuid4())[:4].upper()
    return f"NL-{date_str}-{random_suffix}"


# ==================== ENDPOINTS ====================

@router.post("", response_model=NewsletterResponse, status_code=status.HTTP_201_CREATED)
async def create_newsletter(
    newsletter: NewsletterCreate,
    user = Depends(get_current_user)
):
    """
    Create a new newsletter.
    
    - Generates unique newsletter code
    - Sets default configuration values
    - Returns full newsletter object
    """
    newsletter_id = str(uuid.uuid4())
    newsletter_code = generate_newsletter_code()
    now = datetime.utcnow().isoformat()
    
    item = {
        "PK": f"NEWSLETTER#{newsletter_code}",
        "SK": "METADATA",
        "GSI1PK": f"USER#{user.id}",
        "GSI1SK": f"NEWSLETTER#{now}",
        
        "id": newsletter_id,
        "newsletterCode": newsletter_code,
        "title": newsletter.title,
        "status": "draft",
        "user_id": user.id,
        "user_email": user.email,
        
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
        
        "current_step": 1,
    }
    
    await db_client.put_item(item)
    
    return NewsletterResponse(
        id=newsletter_id,
        newsletterCode=newsletter_code,
        title=newsletter.title,
        status="draft",
        target_audience=[],
        tone_professional=50,
        tone_technical=50,
        format_type="email",
        length_preference="mixed",
        frequency="weekly",
        geographic_focus="",
        current_step=1,
        created_at=now,
        updated_at=now,
    )


@router.get("/{newsletter_code}", response_model=NewsletterResponse)
async def get_newsletter(
    newsletter_code: str,
    user = Depends(get_current_user)
):
    """
    Get newsletter by code.
    
    - Verifies user owns the newsletter
    - Returns full newsletter object
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    item = await db_client.get_item(pk=pk, sk="METADATA")
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Newsletter not found"
        )
    
    # Verify ownership
    if item.get("user_id") != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this newsletter"
        )
    
    return NewsletterResponse(
        id=item["id"],
        newsletterCode=item["newsletterCode"],
        title=item.get("title", "Newsletter Draft"),
        status=item.get("status", "draft"),
        target_audience=item.get("target_audience", []),
        tone_professional=item.get("tone_professional", 50),
        tone_technical=item.get("tone_technical", 50),
        format_type=item.get("format_type", "email"),
        length_preference=item.get("length_preference", "mixed"),
        frequency=item.get("frequency", "weekly"),
        geographic_focus=item.get("geographic_focus", ""),
        current_step=item.get("current_step", 1),
        created_at=item["created_at"],
        updated_at=item["updated_at"],
    )


@router.put("/{newsletter_code}")
async def update_newsletter(
    newsletter_code: str,
    update: NewsletterUpdate,
    user = Depends(get_current_user)
):
    """
    Update newsletter configuration.
    
    - Only updates provided fields
    - Validates field values
    - Updates timestamp
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    
    # Verify newsletter exists and user owns it
    existing = await db_client.get_item(pk=pk, sk="METADATA")
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Newsletter not found"
        )
    
    if existing.get("user_id") != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this newsletter"
        )
    
    # Build update expression
    update_parts = []
    expression_values = {}
    
    update_data = update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        if value is not None:
            update_parts.append(f"{key} = :{key}")
            expression_values[f":{key}"] = value
    
    # Always update timestamp
    now = datetime.utcnow().isoformat()
    update_parts.append("updated_at = :updated_at")
    expression_values[":updated_at"] = now
    
    if update_parts:
        update_expression = "SET " + ", ".join(update_parts)
        
        await db_client.update_item(
            pk=pk,
            sk="METADATA",
            update_expression=update_expression,
            expression_attribute_values=expression_values
        )
    
    return {"success": True, "updated_at": now}


@router.get("")
async def list_newsletters(
    user = Depends(get_current_user)
):
    """
    List all newsletters for current user.
    
    - Queries by user ID using GSI1
    - Returns summary data only
    - Sorted by creation date (newest first)
    """
    items = await db_client.query_items(
        pk=f"USER#{user.id}",
        index_name="GSI1",
        sk_begins_with="NEWSLETTER#",
        scan_index_forward=False  # Newest first
    )
    
    newsletters = []
    for item in items:
        newsletters.append({
            "newsletterCode": item.get("newsletterCode"),
            "title": item.get("title", "Newsletter Draft"),
            "status": item.get("status", "draft"),
            "current_step": item.get("current_step", 1),
            "created_at": item.get("created_at"),
            "updated_at": item.get("updated_at"),
        })
    
    return {
        "newsletters": newsletters,
        "total": len(newsletters)
    }


@router.delete("/{newsletter_code}")
async def delete_newsletter(
    newsletter_code: str,
    user = Depends(get_current_user)
):
    """
    Delete newsletter and all associated data.
    
    - Verifies ownership
    - Deletes all SK items (METADATA, TOPICS, OUTLINE, DRAFT)
    """
    pk = f"NEWSLETTER#{newsletter_code}"
    
    # Verify ownership
    existing = await db_client.get_item(pk=pk, sk="METADATA")
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Newsletter not found"
        )
    
    if existing.get("user_id") != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this newsletter"
        )
    
    # Delete all items
    for sk in ["METADATA", "TOPICS", "OUTLINE", "DRAFT"]:
        try:
            await db_client.delete_item(pk=pk, sk=sk)
        except Exception:
            pass  # Ignore if item doesn't exist
    
    return {"success": True, "deleted": newsletter_code}
```

---

## Main App Integration

Add to `app/main.py`:

```python
from app.tools.newsletter_generator.routes import router as newsletter_router

# Include newsletter router
app.include_router(newsletter_router)
```

---

## Validation Rules

### Format Type

```python
VALID_FORMAT_TYPES = ["email", "pdf", "web"]

# In update endpoint
if update.format_type and update.format_type not in VALID_FORMAT_TYPES:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid format_type. Must be one of: {VALID_FORMAT_TYPES}"
    )
```

### Length Preference

```python
VALID_LENGTH_PREFERENCES = ["short", "mixed", "long"]
```

### Frequency

```python
VALID_FREQUENCIES = ["daily", "weekly", "monthly", "quarterly"]
```

### Tone Values

Validated by Pydantic: `ge=0, le=100`

---

## Error Handling

| Status Code | Condition | Message |
|-------------|-----------|---------|
| 201 | Newsletter created | Return newsletter object |
| 200 | Success | Return requested data |
| 400 | Invalid input | "Invalid {field}. Must be one of: ..." |
| 401 | Not authenticated | "Not authenticated" |
| 403 | Not owner | "Not authorized to {action} this newsletter" |
| 404 | Not found | "Newsletter not found" |
| 500 | Server error | "Internal server error" |

---

## Testing

### Unit Tests

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_newsletter():
    """Test newsletter creation."""
    response = client.post(
        "/api/newsletters",
        json={"title": "Test Newsletter"},
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["newsletterCode"].startswith("NL-")
    assert data["status"] == "draft"
    assert data["tone_professional"] == 50

def test_update_newsletter():
    """Test newsletter update."""
    # First create
    create_response = client.post(
        "/api/newsletters",
        json={"title": "Test"},
        headers={"Authorization": f"Bearer {test_token}"}
    )
    code = create_response.json()["newsletterCode"]
    
    # Then update
    response = client.put(
        f"/api/newsletters/{code}",
        json={
            "target_audience": ["researchers"],
            "tone_professional": 70
        },
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["success"] == True

def test_get_nonexistent_newsletter():
    """Test 404 for nonexistent newsletter."""
    response = client.get(
        "/api/newsletters/NL-00000000-XXXX",
        headers={"Authorization": f"Bearer {test_token}"}
    )
    
    assert response.status_code == 404
```

---

## Implementation Checklist

- [ ] Create `igad-app/backend/app/tools/newsletter_generator/__init__.py`
- [ ] Create `igad-app/backend/app/tools/newsletter_generator/routes.py`
- [ ] Add router to `app/main.py`
- [ ] Add input validation for enum fields
- [ ] Write unit tests
- [ ] Test with Postman/curl
- [ ] Verify DynamoDB data structure
