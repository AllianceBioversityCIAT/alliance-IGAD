# Prompt Manager Module - Data Model

> DynamoDB single-table design for prompt storage, versioning, comments, and change history.

## Table Configuration

| Property | Value |
|----------|-------|
| Table Name | `igad-testing-main-table` |
| Partition Key | `PK` (String) |
| Sort Key | `SK` (String) |
| Billing Mode | On-demand |
| Region | us-east-1 |

This is a shared single-table used by all modules (proposals, newsletters, prompts, etc.).

---

## Entity Types

### 1. Prompt Versions

| Field | Key | Pattern |
|-------|-----|---------|
| PK | Partition | `prompt#{prompt_id}` |
| SK | Sort | `version#{version_number}` |

**Example:**
```
PK: "prompt#a1b2c3d4-e5f6-7890-abcd-ef1234567890"
SK: "version#1"
```

**Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | String | UUID |
| `name` | String | Display name |
| `section` | String | ProposalSection enum value |
| `sub_section` | String? | e.g., "step-1" |
| `route` | String? | e.g., "/proposal-writer/step-1" |
| `categories` | List[String] | Usage categories |
| `tags` | List[String] | Free-text tags |
| `version` | Number | Version number |
| `is_active` | Boolean | Active status |
| `system_prompt` | String | System instruction text |
| `user_prompt_template` | String | User prompt with variables |
| `tone` | String? | Tone description |
| `output_format` | String? | Expected output format |
| `few_shot` | List[Map]? | `[{input, output}]` |
| `context` | Map? | `{persona, sources, constraints, guardrails}` |
| `created_by` | String | Creator email |
| `updated_by` | String | Last updater email |
| `created_at` | String | ISO timestamp |
| `updated_at` | String | ISO timestamp |
| `comments_count` | Number | Denormalized comment count |

### 2. Comments

| Field | Key | Pattern |
|-------|-----|---------|
| PK | Partition | `prompt#{prompt_id}` |
| SK | Sort | `comment#{comment_id}` |

**Example:**
```
PK: "prompt#a1b2c3d4-e5f6-7890-abcd-ef1234567890"
SK: "comment#f1e2d3c4-b5a6-7890-1234-567890abcdef"
```

**Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | String | UUID |
| `prompt_id` | String | Parent prompt ID |
| `parent_id` | String? | Parent comment ID (for replies) |
| `content` | String | Comment text (max 1000 chars) |
| `author` | String | Author email |
| `author_name` | String | Author display name |
| `created_at` | String | ISO timestamp |
| `type` | String | Always "comment" |

### 3. Change History

| Field | Key | Pattern |
|-------|-----|---------|
| PK | Partition | `prompt#{prompt_id}` |
| SK | Sort | `change#{iso_timestamp}#{change_id}` |

**Example:**
```
PK: "prompt#a1b2c3d4-e5f6-7890-abcd-ef1234567890"
SK: "change#2024-01-15T10:30:00#f1e2d3c4-b5a6-7890"
```

**Attributes:**

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | String | UUID |
| `prompt_id` | String | Parent prompt ID |
| `version` | Number | Version at time of change |
| `change_type` | String | "create", "update", "activate", "deactivate" |
| `changes` | Map | `{field: {old: value, new: value}}` |
| `comment` | String? | User-provided change description |
| `author` | String | Author email |
| `author_name` | String | Author display name |
| `created_at` | String | ISO timestamp |
| `type` | String | Always "change" |

---

## Access Patterns

### 1. Get Latest Prompt Version

```python
response = self.table.query(
    KeyConditionExpression=Key("PK").eq(f"prompt#{prompt_id}"),
    ScanIndexForward=False,   # Descending order (latest first)
    Limit=1,
)
# Returns: version with highest SK (latest version number)
```

### 2. Get Specific Prompt Version

```python
response = self.table.get_item(
    Key={"PK": f"prompt#{prompt_id}", "SK": f"version#{version}"}
)
```

### 3. Get All Comments for a Prompt

```python
response = self.table.query(
    KeyConditionExpression=(
        Key("PK").eq(f"prompt#{prompt_id}")
        & Key("SK").begins_with("comment#")
    )
)
```

### 4. Get Change History (Most Recent First)

```python
response = self.table.query(
    KeyConditionExpression=(
        Key("PK").eq(f"prompt#{prompt_id}")
        & Key("SK").begins_with("change#")
    ),
    ScanIndexForward=False,  # Most recent first (timestamp in SK)
)
```

### 5. List All Prompts (with Filtering)

```python
# Currently uses table scan + in-memory filtering
response = self.table.scan()
items = [item for item in items if item["SK"].startswith("version#")]
# Apply filters: section, sub_section, tag, route, is_active, search
# Sort by updated_at descending
# Paginate with limit/offset
```

### 6. Get Published Prompt by Section

```python
response = self.table.scan(
    FilterExpression=Attr("section").eq(section.value)
    & Attr("status").eq("published")
)
# Sort by updated_at descending, return first
```

### 7. Find Active Prompt Conflict

```python
# Scan all prompts, filter for matching:
# section AND route AND sub_section AND categories (set equality) AND is_active=True
# Exclude current prompt_id if updating
```

### 8. Delete All Prompt Data

```python
# Query all items with PK = prompt#{id}
response = self.table.query(
    KeyConditionExpression=Key("PK").eq(f"prompt#{prompt_id}")
)
# Deletes: all versions, all comments, all change entries
for item in response["Items"]:
    self.table.delete_item(Key={"PK": item["PK"], "SK": item["SK"]})
```

---

## Data Conversion Functions

### Python → DynamoDB (`_prompt_to_item`)

```python
def _prompt_to_item(self, prompt: Prompt) -> Dict:
    item = {
        "PK": f"prompt#{prompt.id}",
        "SK": f"version#{prompt.version}",
        "id": prompt.id,
        "name": prompt.name,
        "section": prompt.section.value,         # Enum → string
        "tags": prompt.tags,
        "categories": prompt.categories or [],
        "version": prompt.version,
        "is_active": prompt.is_active,
        "system_prompt": prompt.system_prompt,
        "user_prompt_template": prompt.user_prompt_template,
        "created_by": prompt.created_by,
        "updated_by": prompt.updated_by,
        "created_at": prompt.created_at.isoformat() + "Z",
        "updated_at": prompt.updated_at.isoformat() + "Z",
    }
    # Optional fields added only if present:
    # sub_section, route, tone, output_format, few_shot, context
    return item
```

### DynamoDB → Python (`_item_to_prompt`)

```python
def _item_to_prompt(self, item: Dict) -> Prompt:
    return Prompt(
        id=item["id"],
        name=item["name"],
        section=ProposalSection(item["section"]),  # String → enum
        sub_section=item.get("sub_section"),
        route=item.get("route"),
        categories=item.get("categories", []),
        tags=item.get("tags", []),
        version=item["version"],
        is_active=item.get("is_active", True),     # Default True
        system_prompt=item["system_prompt"],
        user_prompt_template=item["user_prompt_template"],
        tone=item.get("tone"),
        output_format=item.get("output_format"),
        few_shot=item.get("few_shot"),
        context=item.get("context"),
        created_by=item["created_by"],
        updated_by=item["updated_by"],
        created_at=datetime.fromisoformat(item["created_at"].replace("Z", "")),
        updated_at=datetime.fromisoformat(item["updated_at"].replace("Z", "")),
        comments_count=item.get("comments_count", 0),
    )
```

---

## Category Variable Injection

Prompts can contain category placeholders that get replaced at runtime:

### Placeholder Formats

| Placeholder | Replaced With |
|-------------|---------------|
| `{{category_1}}` | First category value |
| `{{category_2}}` | Second category value |
| `{{category_N}}` | Nth category value |
| `{{categories}}` | Comma-separated list of all categories |

### Example

**Prompt template:**
```
Analyze the {{category_1}} document and provide insights
focusing on {{categories}} for the proposal.
```

**With categories `["RFP", "Budget", "Timeline"]`:**
```
Analyze the RFP document and provide insights
focusing on RFP, Budget, Timeline for the proposal.
```

### Implementation

```python
def inject_category_variables(self, prompt_text, categories):
    result = prompt_text
    for i, category in enumerate(categories, 1):
        result = result.replace(f"{{{{category_{i}}}}}", category)
    result = result.replace("{{categories}}", ", ".join(categories))
    return result
```

---

## Replication Notes

To replicate this data model:

1. **Use existing DynamoDB table** (single-table design) or create a new one
2. **PK/SK patterns** must be consistent: `prompt#{uuid}` / `version#N`, `comment#uuid`, `change#timestamp#uuid`
3. **Prompt conflict detection** requires scanning - consider GSI for production scale
4. **Comments threading** uses `parent_id` for replies
5. **Change history** embeds timestamp in SK for automatic chronological sorting
6. **Category injection** happens at runtime, not stored in DB
