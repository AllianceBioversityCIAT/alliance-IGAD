# Prompt Manager Module - Backend

> FastAPI handlers and PromptService for AI prompt management.

## Admin Prompts Handler

**Source:** `backend/app/handlers/admin_prompts.py`
**Prefix:** `/admin/prompts`

### Authentication

```python
def get_current_admin_user(credentials = Depends(security)) -> dict:
    user_data = auth_middleware.verify_token(credentials)
    return {
        "user_id": user_data.get("user_id"),
        "email": user_data.get("email"),
        "role": user_data.get("role"),
        "is_admin": user_data.get("is_admin"),
    }
```

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | Get prompts (simple) |
| GET | `/debug` | None | Debug endpoint (no auth) |
| GET | `/list` | Admin | List prompts with filters |
| GET | `/{prompt_id}` | Admin | Get specific prompt (version optional) |
| POST | `/create` | Admin | Create new prompt |
| PUT | `/{prompt_id}/update` | Admin | Update prompt |
| DELETE | `/{prompt_id}` | Admin | Delete prompt (version optional) |
| POST | `/preview` | Admin | Preview prompt via Bedrock |
| GET | `/section/{section}` | None | Runtime: get by section |
| POST | `/{prompt_id}/toggle-active` | Admin | Toggle active status |
| POST | `/{prompt_id}/comments` | Admin | Add comment |
| GET | `/{prompt_id}/comments` | Admin | Get comments |
| GET | `/{prompt_id}/history` | Admin | Get change history |

### List Prompts Parameters

```python
@router.get("/list", response_model=PromptListResponse)
async def list_prompts(
    section: Optional[ProposalSection] = Query(None),
    sub_section: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    route: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
)
```

### Get Prompt with Version

```python
@router.get("/{prompt_id}", response_model=Prompt)
async def get_prompt(
    prompt_id: str,
    version: Optional[str] = Query(None),  # number or 'latest'
)
```

### Preview Prompt

```python
@router.post("/preview", response_model=PromptPreviewResponse)
async def preview_prompt(preview_data: PromptPreviewRequest):
    return await bedrock_service.preview_prompt(preview_data)
```

---

## Runtime Prompts Router

**Source:** `backend/app/tools/admin/prompts_manager/routes.py`
**Prefix:** `/prompts`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/section/{section}` | None | Get published prompt for section |
| GET | `/test-injection/{prompt_id}` | None | Test category variable injection |

---

## Pydantic Models

**Source:** `backend/app/shared/schemas/prompt_model.py`

### ProposalSection Enum

```python
class ProposalSection(str, Enum):
    PROPOSAL_WRITER = "proposal_writer"
    NEWSLETTER_GENERATOR = "newsletter_generator"
    # Legacy sections
    PROBLEM_STATEMENT = "problem_statement"
    OBJECTIVES = "objectives"
    METHODOLOGY = "methodology"
    BUDGET = "budget"
    THEORY_OF_CHANGE = "theory_of_change"
    LITERATURE_REVIEW = "literature_review"
    TIMELINE = "timeline"
    RISK_ASSESSMENT = "risk_assessment"
    SUSTAINABILITY = "sustainability"
    MONITORING_EVALUATION = "monitoring_evaluation"
    EXECUTIVE_SUMMARY = "executive_summary"
    APPENDICES = "appendices"
```

### Core Models

```python
class FewShotExample(BaseModel):
    input: str
    output: str

class PromptContext(BaseModel):
    persona: Optional[str] = None
    sources: Optional[List[str]] = None
    constraints: Optional[str] = None
    guardrails: Optional[str] = None

class PromptBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    section: ProposalSection
    sub_section: Optional[str] = Field(None, max_length=100)
    route: Optional[str] = None
    categories: Optional[List[str]] = Field(default=None)
    tags: List[str] = Field(default_factory=list)
    system_prompt: str = Field(..., min_length=1)
    user_prompt_template: str = Field(..., min_length=1)
    output_format: Optional[str] = Field(default="Clear and structured response", max_length=5000)
    tone: Optional[str] = Field(default="Professional and informative", max_length=500)
    few_shot: Optional[List[FewShotExample]] = None
    context: Optional[PromptContext] = None

class PromptCreate(PromptBase):
    pass

class PromptUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    section: Optional[ProposalSection] = None
    sub_section: Optional[str] = Field(None, max_length=100)
    route: Optional[str] = None
    categories: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    system_prompt: Optional[str] = Field(None, min_length=1)
    user_prompt_template: Optional[str] = Field(None, min_length=1)
    output_format: Optional[str] = Field(None, max_length=5000)
    tone: Optional[str] = Field(None, max_length=500)
    few_shot: Optional[List[FewShotExample]] = None
    context: Optional[PromptContext] = None
    change_comment: Optional[str] = Field(None, max_length=500)

class Prompt(PromptBase):
    id: str
    version: int
    is_active: bool = Field(default=True)
    created_by: str
    updated_by: str
    created_at: datetime
    updated_at: datetime
    comments_count: Optional[int] = Field(default=0)
```

### Response Models

```python
class PromptListResponse(BaseModel):
    prompts: List[Prompt]
    total: int
    has_more: bool

class PromptPreviewRequest(BaseModel):
    system_prompt: str
    user_prompt_template: str
    variables: Optional[Dict[str, str]] = None
    context: Optional[PromptContext] = None

class PromptPreviewResponse(BaseModel):
    output: str
    tokens_used: int
    processing_time: float
```

### Comment Models

```python
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    parent_id: Optional[str] = None   # For replies

class Comment(BaseModel):
    id: str
    prompt_id: str
    parent_id: Optional[str] = None
    content: str
    author: str
    author_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    replies: List["Comment"] = Field(default_factory=list)
```

### Change History Models

```python
class PromptChange(BaseModel):
    id: str
    prompt_id: str
    version: int
    change_type: str     # 'create', 'update', 'activate', 'deactivate'
    changes: Dict[str, Any]   # { field: { old: value, new: value } }
    comment: Optional[str] = None
    author: str
    author_name: str
    created_at: datetime

class PromptHistory(BaseModel):
    prompt_id: str
    changes: List[PromptChange]
    total: int
```

---

## PromptService

**Source:** `backend/app/tools/admin/prompts_manager/service.py`

### Initialization

```python
class PromptService:
    def __init__(self):
        session = get_aws_session("us-east-1")
        self.dynamodb = session.resource("dynamodb")
        self.table_name = "igad-testing-main-table"
        self.table = self.dynamodb.Table(self.table_name)
```

### Methods

| Method | Description |
|--------|-------------|
| `create_prompt(data, user_id)` | Create v1 prompt (active by default, conflict check) |
| `get_prompt(id, version?)` | Get specific version or latest |
| `update_prompt(id, data, user_id)` | Update prompt (conflict check if active) |
| `delete_prompt(id, version?, user_id)` | Delete version or all versions |
| `list_prompts(section?, sub_section?, tag?, search?, route?, is_active?, limit, offset)` | List with filtering |
| `get_prompt_by_section(section)` | Get latest published prompt for section |
| `toggle_active(id, user_id)` | Toggle active with conflict detection |
| `add_comment(id, data, user_id, user_name)` | Add comment to prompt |
| `get_comments(id)` | Get threaded comments |
| `record_change(id, version, type, changes, user_id, user_name, comment?)` | Record change history |
| `get_prompt_history(id)` | Get change history |
| `update_comments_count(id)` | Update prompt's comments_count |
| `inject_category_variables(text, categories)` | Replace `{{category_N}}` and `{{categories}}` |
| `get_prompt_with_categories(id, categories?)` | Get prompt with injected categories |

### Create Prompt Business Rules

```python
async def create_prompt(self, prompt_data, user_id):
    # 1. Generate UUID
    prompt_id = str(uuid.uuid4())

    # 2. Check for active prompt conflict
    existing_active = self._find_active_prompt_by_section_route_subsection_categories(
        section, route, sub_section, categories
    )
    if existing_active:
        raise ValueError("Duplicate active prompt for this section, route, subsection, and categories")

    # 3. Create version 1 (active=True by default)
    prompt = Prompt(id=prompt_id, version=1, is_active=True, ...)

    # 4. Store in DynamoDB
    self.table.put_item(Item=self._prompt_to_item(prompt))

    # 5. Record creation in history
    await self.record_change(prompt_id, version=1, change_type="create", ...)
```

### Update Prompt Business Rules

```python
async def update_prompt(self, prompt_id, data, user_id):
    # 1. Get current prompt
    current = await self.get_prompt(prompt_id)

    # 2. Track changes for history
    changes = {}
    for key, new_value in update_data.items():
        if key == "change_comment": continue
        old_value = prompt_dict.get(key)
        if old_value != new_value:
            changes[key] = {"old": old_value, "new": new_value}

    # 3. Check active conflict if update makes prompt active
    if is_active:
        existing = self._find_active_prompt_by_section_route_subsection_categories(
            section, route, subsection, categories, exclude_id=prompt_id
        )
        if existing: raise ValueError("Duplicate active prompt...")

    # 4. Store updated prompt
    # 5. Record change in history (if changes detected)
```

### Active Prompt Conflict Detection

Unique constraint: only one active prompt per `(section, route, sub_section, categories)` combination.

```python
def _find_active_prompt_by_section_route_subsection_categories(
    self, section, route, sub_section=None, categories=None, exclude_id=None
):
    # Scan all prompts
    # Filter for: section match AND route match AND sub_section match
    #   AND categories set match AND is_active=True
    # Exclude prompt with exclude_id
    # Returns matching Prompt or None
```

### Category Variable Injection

```python
def inject_category_variables(self, prompt_text, categories):
    # Replace {{category_1}}, {{category_2}}, ... with actual values
    for i, category in enumerate(categories, 1):
        result = result.replace(f"{{{{category_{i}}}}}", category)

    # Replace {{categories}} with comma-separated list
    result = result.replace("{{categories}}", ", ".join(categories))
    return result
```

### Delete with History Logging

```python
async def delete_prompt(self, prompt_id, version=None, user_id="system"):
    if version:
        # Delete single version + log to history_service
        history_service.log_operation(
            operation_type="DELETE", resource_type="PROMPT",
            resource_id=f"{prompt_id}_v{version}", ...
        )
    else:
        # Delete ALL items (versions, comments, changes)
        # Log each item to history before deletion
```
