# DynamoDB Schema - Newsletter Generator

## Overview

The Newsletter Generator uses the **same DynamoDB table** as Proposal Writer (`igad-testing-main-table`) following single-table design patterns. Newsletter items use a `NEWSLETTER#` prefix to avoid conflicts with existing `PROPOSAL#` items.

---

## Table Configuration

| Property | Value |
|----------|-------|
| **Table Name** | `igad-testing-main-table` |
| **Environment Variable** | `TABLE_NAME` |
| **Design Pattern** | Single-Table Design |
| **Region** | `us-east-1` |

---

## Key Structure

### Primary Key Pattern

```
PK = NEWSLETTER#{newsletter_code}
SK = METADATA | TOPICS | OUTLINE | DRAFT
```

**Newsletter Code Format:** `NL-YYYYMMDD-XXXX` (e.g., `NL-20260126-A1B2`)

### GSI1 (User Query Index)

| Key | Pattern | Purpose |
|-----|---------|---------|
| **GSI1PK** | `USER#{user_id}` | Query by user |
| **GSI1SK** | `NEWSLETTER#{created_at_iso}` | Sort by date |

---

## Item Types

### 1. METADATA Item (Newsletter Configuration - Step 1)

```json
{
  "PK": "NEWSLETTER#NL-20260126-A1B2",
  "SK": "METADATA",
  "GSI1PK": "USER#user123",
  "GSI1SK": "NEWSLETTER#2026-01-26T10:30:00Z",
  
  "id": "uuid-string",
  "newsletterCode": "NL-20260126-A1B2",
  "title": "Weekly Research Digest",
  "description": "Newsletter for IGAD researchers",
  "status": "draft",
  
  "user_id": "user123",
  "user_email": "user@example.com",
  "user_name": "User Name",
  
  "created_at": "2026-01-26T10:30:00Z",
  "updated_at": "2026-01-26T10:35:30Z",
  
  "target_audience": ["researchers", "policy_makers", "development_partners"],
  "tone_professional": 70,
  "tone_technical": 50,
  "format_type": "email",
  "length_preference": "mixed",
  "frequency": "weekly",
  "geographic_focus": "East Africa - IGAD Region",
  
  "current_step": 1
}
```

### 2. TOPICS Item (Content Planning - Step 2)

```json
{
  "PK": "NEWSLETTER#NL-20260126-A1B2",
  "SK": "TOPICS",
  
  "selected_types": [
    "Breaking News & Updates",
    "Research Findings",
    "Climate-Smart Agriculture",
    "Funding Opportunities"
  ],
  
  "retrieval_status": "completed",
  "retrieval_started_at": "2026-01-26T10:40:00Z",
  "retrieval_completed_at": "2026-01-26T10:41:30Z",
  "retrieval_error": null,
  
  "retrieved_content": [
    {
      "topic": "Research Findings",
      "source": "knowledge-base-igad-web-scraping",
      "score": 0.89,
      "content": "Recent study shows improved drought-resistant varieties...",
      "metadata": {
        "url": "https://igad.int/research/study-2026",
        "date": "2026-01-15"
      }
    }
  ],
  
  "total_chunks_retrieved": 25,
  "updated_at": "2026-01-26T10:41:30Z"
}
```

### 3. OUTLINE Item (Outline Review - Step 3)

```json
{
  "PK": "NEWSLETTER#NL-20260126-A1B2",
  "SK": "OUTLINE",
  
  "outline_status": "completed",
  "outline_started_at": "2026-01-26T10:50:00Z",
  "outline_completed_at": "2026-01-26T10:51:45Z",
  "outline_error": null,
  
  "sections": [
    {
      "id": "section-1",
      "name": "Introduction",
      "order": 1,
      "items": [
        {
          "id": "item-1-1",
          "title": "Welcome & Overview",
          "description": "Brief introduction to this week's newsletter",
          "editable": true,
          "source": "ai_generated"
        }
      ]
    },
    {
      "id": "section-2",
      "name": "Research Findings",
      "order": 2,
      "items": [
        {
          "id": "item-2-1",
          "title": "Drought-Resistant Crop Varieties Study",
          "description": "Summary of recent IGAD research findings",
          "editable": true,
          "source": "rag_content",
          "rag_reference_id": "chunk-123"
        }
      ]
    },
    {
      "id": "section-3",
      "name": "Conclusion",
      "order": 3,
      "items": [
        {
          "id": "item-3-1",
          "title": "Closing Remarks",
          "description": "Summary and call to action",
          "editable": true,
          "source": "ai_generated"
        }
      ]
    }
  ],
  
  "user_modifications": {
    "items_added": ["custom-item-1"],
    "items_removed": [],
    "items_edited": ["item-2-1"]
  },
  
  "generated_at": "2026-01-26T10:51:45Z",
  "updated_at": "2026-01-26T11:00:00Z"
}
```

### 4. DRAFT Item (Draft & Export - Step 4)

```json
{
  "PK": "NEWSLETTER#NL-20260126-A1B2",
  "SK": "DRAFT",
  
  "draft_status": "completed",
  "draft_started_at": "2026-01-26T11:05:00Z",
  "draft_completed_at": "2026-01-26T11:08:30Z",
  "draft_error": null,
  
  "generated_content": "# Weekly Research Digest\n\n## Introduction\n\nWelcome to this week's...",
  
  "sections": {
    "introduction": "Welcome to this week's edition of the IGAD Research Digest...",
    "research_findings": "## Research Findings\n\nRecent studies have shown...",
    "conclusion": "## Conclusion\n\nThank you for reading..."
  },
  
  "user_edits": "# Weekly Research Digest (Edited)\n\n...",
  "has_user_edits": true,
  
  "word_count": 1250,
  "estimated_read_time": "5 minutes",
  
  "generated_at": "2026-01-26T11:08:30Z",
  "updated_at": "2026-01-26T11:15:00Z",
  
  "exports": {
    "pdf": {
      "s3_key": "newsletters/NL-20260126-A1B2/export.pdf",
      "generated_at": "2026-01-26T11:20:00Z",
      "file_size": 245000
    },
    "docx": {
      "s3_key": "newsletters/NL-20260126-A1B2/export.docx",
      "generated_at": "2026-01-26T11:20:15Z",
      "file_size": 125000
    },
    "html": {
      "s3_key": "newsletters/NL-20260126-A1B2/export.html",
      "generated_at": "2026-01-26T11:20:20Z",
      "file_size": 45000
    }
  }
}
```

---

## Access Patterns

### 1. Get Newsletter by Code

```python
# Get METADATA
item = await db_client.get_item(
    pk=f"NEWSLETTER#{newsletter_code}",
    sk="METADATA"
)

# Get all items for a newsletter
items = await db_client.query_items(
    pk=f"NEWSLETTER#{newsletter_code}"
)
```

### 2. List User's Newsletters

```python
# Query GSI1 for all user newsletters (most recent first)
items = await db_client.query_items(
    pk=f"USER#{user_id}",
    index_name="GSI1",
    sk_begins_with="NEWSLETTER#",
    scan_index_forward=False
)
```

### 3. Update Newsletter Step Data

```python
# Update specific fields
await db_client.update_item(
    pk=f"NEWSLETTER#{newsletter_code}",
    sk="METADATA",
    update_expression="SET target_audience = :audience, updated_at = :now",
    expression_attribute_values={
        ":audience": ["researchers", "policy_makers"],
        ":now": datetime.utcnow().isoformat()
    }
)
```

### 4. Delete Newsletter (All Items)

```python
# Delete all items for a newsletter
for sk in ["METADATA", "TOPICS", "OUTLINE", "DRAFT"]:
    await db_client.delete_item(
        pk=f"NEWSLETTER#{newsletter_code}",
        sk=sk
    )
```

---

## Status Values

### Newsletter Status (METADATA)

| Status | Description |
|--------|-------------|
| `draft` | Newsletter in progress |
| `completed` | Newsletter generation finished |
| `exported` | Newsletter exported successfully |

### Step Status (TOPICS, OUTLINE, DRAFT)

| Status | Description |
|--------|-------------|
| `pending` | Not started |
| `processing` | AI generation in progress |
| `completed` | Generation successful |
| `failed` | Generation failed (check `*_error` field) |

---

## Database Client Usage

**File:** `igad-app/backend/app/database/client.py`

### Async Operations (API Routes)

```python
from app.database.client import db_client

# Create item
await db_client.put_item(item={
    "PK": f"NEWSLETTER#{code}",
    "SK": "METADATA",
    ...
})

# Get item
item = await db_client.get_item(pk="NEWSLETTER#...", sk="METADATA")

# Update item
await db_client.update_item(pk, sk, update_expression, expression_attribute_values)

# Delete item
await db_client.delete_item(pk, sk)

# Query items
items = await db_client.query_items(pk, index_name="GSI1", sk_begins_with="...")
```

### Sync Operations (Lambda Workers)

```python
from app.database.client import db_client

# For Lambda worker context (synchronous)
item = db_client.get_item_sync(pk="NEWSLETTER#...", sk="TOPICS")

db_client.update_item_sync(
    pk="NEWSLETTER#...",
    sk="TOPICS",
    update_expression="SET retrieval_status = :status",
    expression_attribute_values={":status": "completed"}
)
```

---

## Comparison with Proposal Writer

| Aspect | Proposal Writer | Newsletter Generator |
|--------|-----------------|----------------------|
| PK Prefix | `PROPOSAL#` | `NEWSLETTER#` |
| Code Format | `PROP-YYYYMMDD-XXXX` | `NL-YYYYMMDD-XXXX` |
| SK Values | `METADATA` only | `METADATA`, `TOPICS`, `OUTLINE`, `DRAFT` |
| Storage | Single item (all data) | Multiple items (per step) |
| GSI1SK | `PROPOSAL#timestamp` | `NEWSLETTER#timestamp` |

### Why Multiple SK Values?

Newsletter Generator uses separate items per step to:
1. **Reduce item size** - RAG content can be large
2. **Enable partial updates** - Update only relevant step data
3. **Support streaming** - Load steps independently
4. **Better error isolation** - Step failures don't affect other data

---

## Migration Notes

No migration required. Newsletter items use a different PK prefix (`NEWSLETTER#` vs `PROPOSAL#`), so there is no data interference with existing Proposal Writer data.

---

## Implementation Checklist

- [ ] Create newsletter code generator function: `generate_newsletter_code()`
- [ ] Implement `create_newsletter()` - Creates METADATA item
- [ ] Implement `save_topics()` - Creates/updates TOPICS item
- [ ] Implement `save_outline()` - Creates/updates OUTLINE item  
- [ ] Implement `save_draft()` - Creates/updates DRAFT item
- [ ] Implement `get_newsletter_full()` - Queries all items for newsletter
- [ ] Implement `delete_newsletter()` - Deletes all items
- [ ] Add GSI1 query for user newsletter listing
