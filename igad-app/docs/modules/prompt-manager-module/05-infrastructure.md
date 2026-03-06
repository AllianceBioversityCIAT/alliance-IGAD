# Prompt Manager Module - Infrastructure

> AWS resource configuration for the prompt manager module.

## DynamoDB Table

**Source:** `template.yaml`

### Table Configuration

| Property | Value |
|----------|-------|
| Table Name | `igad-testing-main-table` |
| Partition Key | `PK` (String) |
| Sort Key | `SK` (String) |
| Billing | On-demand (pay-per-request) |

This is a shared table used by all modules. Prompt data is isolated by PK prefix `prompt#`.

### Entity Key Patterns

| Entity | PK | SK |
|--------|-----|-----|
| Prompt Version | `prompt#{uuid}` | `version#{n}` |
| Comment | `prompt#{uuid}` | `comment#{uuid}` |
| Change History | `prompt#{uuid}` | `change#{iso_ts}#{uuid}` |

---

## Lambda DynamoDB Permissions

**Source:** `template.yaml` → `ApiFunction.Policies`

```yaml
- Effect: Allow
  Action:
    - dynamodb:GetItem         # Get specific prompt version
    - dynamodb:PutItem         # Create/update prompts, comments, changes
    - dynamodb:UpdateItem      # Toggle active status
    - dynamodb:DeleteItem      # Delete prompts/versions
    - dynamodb:Query           # Get latest version, list comments, history
    - dynamodb:Scan            # List prompts, active conflict detection
    - dynamodb:BatchGetItem    # Batch operations
    - dynamodb:BatchWriteItem  # Batch operations
  Resource:
    - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/igad-testing-main-table'
    - !Sub 'arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/igad-testing-main-table/index/*'
```

### Action → Feature Mapping

| DynamoDB Action | Used For |
|----------------|----------|
| `GetItem` | Get specific prompt version by PK+SK |
| `PutItem` | Create prompt, add comment, record change |
| `UpdateItem` | Toggle is_active, update comments_count |
| `DeleteItem` | Delete prompt version or all data |
| `Query` | Get latest version (descending), list comments, list history |
| `Scan` | List all prompts (with filtering), find active conflicts |

---

## Bedrock Permissions (Preview Feature)

**Source:** `template.yaml` → `ApiFunction.Policies`

```yaml
- Effect: Allow
  Action:
    - bedrock:InvokeModel
    - bedrock:InvokeModelWithResponseStream
  Resource: '*'
```

The preview feature (`POST /admin/prompts/preview`) uses `BedrockService` to send prompt text to an AI model and return the response. This allows admins to test prompts before activating them.

---

## API Gateway Routes

All prompt manager endpoints flow through the main API Gateway:

```yaml
Events:
  ApiEvent:
    Type: Api
    Properties:
      Path: /api/{proxy+}
      Method: ANY
```

### Route Mapping

| Frontend URL | Backend Route | Lambda Handler |
|-------------|--------------|----------------|
| GET `/admin/prompts/list` | `/admin/prompts/list` | `admin_prompts.list_prompts` |
| GET `/admin/prompts/{id}` | `/admin/prompts/{id}` | `admin_prompts.get_prompt` |
| POST `/admin/prompts/create` | `/admin/prompts/create` | `admin_prompts.create_prompt` |
| PUT `/admin/prompts/{id}/update` | `/admin/prompts/{id}/update` | `admin_prompts.update_prompt` |
| DELETE `/admin/prompts/{id}` | `/admin/prompts/{id}` | `admin_prompts.delete_prompt` |
| POST `/admin/prompts/preview` | `/admin/prompts/preview` | `admin_prompts.preview_prompt` |
| POST `/admin/prompts/{id}/toggle-active` | `/admin/prompts/{id}/toggle-active` | `admin_prompts.toggle_prompt_active` |
| POST `/admin/prompts/{id}/comments` | `/admin/prompts/{id}/comments` | `admin_prompts.add_comment` |
| GET `/admin/prompts/{id}/comments` | `/admin/prompts/{id}/comments` | `admin_prompts.get_comments` |
| GET `/admin/prompts/{id}/history` | `/admin/prompts/{id}/history` | `admin_prompts.get_prompt_history` |
| GET `/prompts/section/{section}` | `/prompts/section/{section}` | `routes.get_runtime_prompt_by_section` |

---

## Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `TABLE_NAME` | PromptService | DynamoDB table name |
| `AWS_REGION` | PromptService | AWS region for DynamoDB |
| `COGNITO_USER_POOL_ID` | auth_middleware | Token verification |
| `COGNITO_CLIENT_ID` | auth_middleware | Token verification |
| `ENVIRONMENT` | auth_middleware | Controls JWT verification mode |

### PromptService Initialization

```python
class PromptService:
    def __init__(self):
        session = get_aws_session("us-east-1")
        self.dynamodb = session.resource("dynamodb")
        self.table_name = "igad-testing-main-table"  # Hardcoded (should use TABLE_NAME env var)
        self.table = self.dynamodb.Table(self.table_name)
```

---

## Lambda Configuration

```yaml
ApiFunction:
  Runtime: python3.11
  MemorySize: 512
  Timeout: 300          # 5 minutes
  Architectures: [arm64]
  Layers:
    - LambdaAdapterLayerArm64:25   # Web Adapter for FastAPI
```

The Lambda Web Adapter layer allows FastAPI to run on Lambda by:
1. Starting FastAPI on port 8080 inside Lambda
2. Proxying API Gateway events to HTTP requests
3. Returning HTTP responses as API Gateway responses

---

## Replication Requirements

To replicate the prompt manager infrastructure:

1. **DynamoDB Table**
   - Create or reuse a single table with PK (String) + SK (String)
   - On-demand billing recommended
   - Consider adding GSI for section-based queries at scale

2. **Lambda Permissions**
   - DynamoDB: Full CRUD + Query + Scan on table and indexes
   - Bedrock: InvokeModel (for preview feature)

3. **Environment Variables**
   - `TABLE_NAME`: DynamoDB table name
   - `AWS_REGION`: AWS region
   - Auth-related variables (COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID)

4. **Dependencies (Python)**
   ```
   boto3
   fastapi
   pydantic>=2.0
   python-jose[cryptography]
   aws-lambda-powertools
   ```

5. **API Gateway**
   - Proxy integration with Lambda
   - Ensure `/admin/prompts/*` and `/prompts/*` routes are handled

6. **Performance Considerations**
   - Current implementation uses `Scan` for listing and conflict detection
   - For production scale, add GSI: `GSI1PK=section`, `GSI1SK=route#sub_section`
   - Consider caching active prompts (TTL-based) for runtime retrieval
