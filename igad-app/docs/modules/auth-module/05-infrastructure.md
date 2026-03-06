# Auth Module - Infrastructure

> AWS resources and configuration for the auth module.

## Cognito User Pool

**Source:** `template.yaml` (environment variables)

### Configuration

| Parameter | Value |
|-----------|-------|
| User Pool ID | `us-east-1_IMi3kSuB8` (testing) |
| Client ID | `7p11hp6gcklhctcr9qffne71vl` (testing) |
| Region | `us-east-1` |
| Username | Email-based (pool configured to use email as username) |
| Auth Flow | `ADMIN_USER_PASSWORD_AUTH` |
| Refresh Auth Flow | `REFRESH_TOKEN_AUTH` |

### User Pool Features

- Email as username (required email format)
- `email_verified` auto-set to `true` on admin user creation
- Custom email templates for welcome/reset emails
- Groups for role-based access (e.g., "admin" group)
- `FORCE_CHANGE_PASSWORD` state for new users

### Groups

| Group | Purpose |
|-------|---------|
| `admin` | Full admin access (user management, prompt manager, settings) |

Admin detection in middleware:
```python
groups_response = cognito_client.admin_list_groups_for_user(
    UserPoolId=COGNITO_USER_POOL_ID, Username=username
)
is_admin = "admin" in [g["GroupName"] for g in groups_response["Groups"]]
```

---

## IAM Policies

**Source:** `template.yaml` → `ApiFunction.Policies`

### Cognito Permissions

```yaml
- Effect: Allow
  Action:
    # Authentication
    - cognito-idp:AdminInitiateAuth           # Login, refresh token
    - cognito-idp:AdminRespondToAuthChallenge  # Force password change
    # User Management (Admin)
    - cognito-idp:AdminGetUser                 # Get user details
    - cognito-idp:AdminCreateUser              # Create new user
    - cognito-idp:AdminSetUserPassword         # Reset password
    - cognito-idp:AdminDeleteUser              # Delete user
    - cognito-idp:AdminEnableUser              # Enable account
    - cognito-idp:AdminDisableUser             # Disable account
    - cognito-idp:AdminUpdateUserAttributes    # Update user attrs
    # Group Management
    - cognito-idp:AdminAddUserToGroup
    - cognito-idp:AdminRemoveUserFromGroup
    - cognito-idp:AdminListGroupsForUser       # Check admin status
    # Listing
    - cognito-idp:ListUsers                    # List all users
    - cognito-idp:ListGroups                   # List all groups
    # Password Reset
    - cognito-idp:ForgotPassword
    - cognito-idp:ConfirmForgotPassword
    # Email
    - ses:SendEmail                            # Custom emails
    - ses:SendRawEmail
  Resource: '*'
```

### Mapping: IAM Action → API Endpoint

| IAM Action | Used By Endpoint |
|------------|------------------|
| `AdminInitiateAuth` | POST `/api/auth/login`, POST `/api/auth/refresh-token` |
| `AdminRespondToAuthChallenge` | POST `/api/auth/complete-password-change` |
| `AdminGetUser` | GET `/admin/users/{username}`, middleware token verification |
| `AdminCreateUser` | POST `/admin/users` |
| `AdminSetUserPassword` | POST `/admin/users`, POST `/admin/users/{username}/reset-password` |
| `AdminDeleteUser` | DELETE `/admin/users/{username}` |
| `AdminEnableUser` | POST `/admin/users/{username}/enable` |
| `AdminDisableUser` | POST `/admin/users/{username}/disable` |
| `AdminUpdateUserAttributes` | PUT `/admin/users/{username}` |
| `AdminAddUserToGroup` | POST `/admin/users/{username}/groups/{group_name}` |
| `AdminRemoveUserFromGroup` | DELETE `/admin/users/{username}/groups/{group_name}` |
| `AdminListGroupsForUser` | middleware (admin detection), GET `/admin/users` |
| `ListUsers` | GET `/admin/users`, POST `/api/auth/forgot-password` |
| `ListGroups` | GET `/admin/groups` |
| `ForgotPassword` | POST `/api/auth/forgot-password` |
| `ConfirmForgotPassword` | POST `/api/auth/reset-password` |

---

## Lambda Environment Variables

```yaml
Environment:
  Variables:
    COGNITO_CLIENT_ID: <client-id>
    COGNITO_USER_POOL_ID: <pool-id>
    ENVIRONMENT: testing       # Controls JWT verification mode
    CORS_ALLOWED_ORIGINS: <origins>
```

### JWT Configuration

```python
# backend/app/middleware/auth_middleware.py
JWT_SECRET = os.getenv("JWT_SECRET", "mock-jwt-secret-for-local-development")
JWT_ALGORITHM = "HS256"

# Production safety: raises ValueError if default secret used in production
if os.getenv("ENVIRONMENT") == "production":
    if JWT_SECRET == "mock-jwt-secret-for-local-development":
        raise ValueError("SECURITY ERROR!")
```

### Environment-based Token Verification

| Environment | Behavior |
|-------------|----------|
| `development` | Decode without signature verification |
| `testing` | Decode without signature verification |
| `production` | Full Cognito token verification (TODO: implement JWKS) |

---

## API Gateway Configuration

```yaml
ApiGateway:
  Type: AWS::Serverless::Api
  Properties:
    StageName: prod
    BinaryMediaTypes:
      - 'multipart/form-data'
      - 'application/pdf'
      - 'application/octet-stream'
```

Auth routes are handled by the main `ApiFunction` Lambda via:
```yaml
Events:
  ApiEvent:
    Path: /api/{proxy+}
    Method: ANY
```

---

## Frontend Environment

```env
VITE_API_BASE_URL=https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com/prod
```

---

## Replication Requirements

To replicate the auth infrastructure:

1. **Cognito User Pool**
   - Create with email as username
   - Enable `ADMIN_USER_PASSWORD_AUTH` and `REFRESH_TOKEN_AUTH` flows
   - Create "admin" group
   - Configure custom email templates (optional)

2. **Lambda IAM Policy**
   - All `cognito-idp:Admin*` actions
   - `cognito-idp:ListUsers`, `ListGroups`
   - `cognito-idp:ForgotPassword`, `ConfirmForgotPassword`
   - `ses:SendEmail` if using custom email sending

3. **Environment Variables**
   - `COGNITO_USER_POOL_ID`
   - `COGNITO_CLIENT_ID`
   - `ENVIRONMENT` (controls JWT verification mode)
   - `JWT_SECRET` (for production - must be set securely)

4. **Frontend**
   - `VITE_API_BASE_URL` pointing to API Gateway
