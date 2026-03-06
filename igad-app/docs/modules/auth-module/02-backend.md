# Auth Module - Backend

> FastAPI auth routes and Cognito service for authentication and user management.

## Auth Routes

**Source:** `backend/app/tools/auth/routes.py`
**Prefix:** `/api/auth`

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | None | Authenticate with Cognito |
| POST | `/refresh-token` | None | Refresh access token |
| POST | `/logout` | None | Logout (mock) |
| POST | `/forgot-password` | None | Send password reset code |
| POST | `/reset-password` | None | Reset password with code |
| POST | `/complete-password-change` | None | Complete force password change |
| POST | `/change-password` | Bearer | Change password (authenticated) |
| GET | `/me` | Bearer | Get current user info |

### Pydantic Models

```python
class LoginRequest(BaseModel):
    username: str   # Actually email
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    user: Dict[str, Any]
    expires_in: int
    requires_password_change: Optional[bool] = None
    session: Optional[str] = None
    username: Optional[str] = None
    message: Optional[str] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    username: str

class ResetPasswordRequest(BaseModel):
    username: str
    code: str
    new_password: str

class CompletePasswordChangeRequest(BaseModel):
    username: str
    session: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
```

### Login Flow (`POST /api/auth/login`)

```python
# 1. Normalize email
email = credentials.username.strip()
email = urllib.parse.unquote(email)

# 2. Authenticate with Cognito
response = cognito_client.admin_initiate_auth(
    UserPoolId=os.getenv("COGNITO_USER_POOL_ID"),
    ClientId=os.getenv("COGNITO_CLIENT_ID"),
    AuthFlow="ADMIN_USER_PASSWORD_AUTH",
    AuthParameters={"USERNAME": email, "PASSWORD": password},
)

# 3. Check for force password change
if response.get("ChallengeName") == "NEW_PASSWORD_REQUIRED":
    return {
        "requires_password_change": True,
        "session": response["Session"],
        "username": email,
    }

# 4. Decode ID token for user info
access_token = response["AuthenticationResult"]["AccessToken"]
id_token = response["AuthenticationResult"]["IdToken"]
user_info = jwt.decode(id_token, "", options={"verify_signature": False})

# 5. Return tokens + user data
return LoginResponse(access_token=access_token, user=user_data, ...)
```

### Error Handling

| Cognito Error | HTTP Status | Message |
|---------------|-------------|---------|
| NotAuthorizedException | 401 | Invalid credentials |
| UserNotFoundException | 401/404 | User not found |
| CodeMismatchException | 400 | Invalid verification code |
| ExpiredCodeException | 400 | Verification code expired |
| InvalidPasswordException | 400 | Password doesn't meet requirements |
| LimitExceededException | 429 | Too many requests |
| InvalidParameterException | 400 | Invalid username format |

### Token Refresh (`POST /api/auth/refresh-token`)

```python
response = cognito_client.admin_initiate_auth(
    AuthFlow="REFRESH_TOKEN_AUTH",
    AuthParameters={"REFRESH_TOKEN": request.refresh_token},
)
# Returns new access_token (and optionally new refresh_token)
# expires_in: 86400 (24 hours)
```

### Forgot Password Flow

1. `POST /forgot-password` with email
2. If email contains `@`, lookup actual Cognito username via `list_users(Filter='email = "..."')`
3. Call `cognito_client.forgot_password(ClientId, Username)`
4. Cognito sends reset code via configured email templates
5. `POST /reset-password` with username, code, new_password
6. Call `cognito_client.confirm_forgot_password(...)`

### Complete Password Change (`POST /complete-password-change`)

For users in `FORCE_CHANGE_PASSWORD` state:

```python
response = cognito_client.admin_respond_to_auth_challenge(
    ChallengeName="NEW_PASSWORD_REQUIRED",
    Session=request.session,
    ChallengeResponses={
        "USERNAME": request.username,
        "NEW_PASSWORD": request.new_password,
    },
)
# Returns full AuthenticationResult with new tokens
```

### Get Current User (`GET /api/auth/me`)

```python
@router.get("/me")
async def get_current_user_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    user = auth_middleware.verify_token(credentials)
    return user  # { user_id, email, username, role, is_admin }
```

---

## Cognito User Management Service

**Source:** `backend/app/tools/auth/service.py`

### Class: `CognitoUserManagementService`

```python
class CognitoUserManagementService:
    def __init__(self, user_pool_id: str, client_id: str, region: str = "us-east-1"):
        session = get_aws_session(region)
        self.cognito_client = session.client("cognito-idp")
```

### Methods

| Method | Cognito API | Description |
|--------|-------------|-------------|
| `list_users(limit, pagination_token?)` | `list_users` + `admin_list_groups_for_user` | List all users with groups |
| `get_user(username)` | `admin_get_user` + `admin_list_groups_for_user` | Get user detail |
| `create_user(username, email, temp_password, send_email?)` | `admin_create_user` + `admin_set_user_password` | Create user |
| `update_user(username, attributes)` | `admin_update_user_attributes` | Update user attributes |
| `delete_user(username)` | `admin_delete_user` | Delete user |
| `enable_user(username)` | `admin_enable_user` | Enable account |
| `disable_user(username)` | `admin_disable_user` | Disable account |
| `reset_user_password(username, temp_password)` | `admin_set_user_password(Permanent=False)` | Reset password |
| `list_groups()` | `list_groups` | List all groups |
| `add_user_to_group(username, group_name)` | `admin_add_user_to_group` | Add to group |
| `remove_user_from_group(username, group_name)` | `admin_remove_user_from_group` | Remove from group |
| `create_group(group_name, description?, precedence?)` | `create_group` | Create group |
| `delete_group(group_name)` | `delete_group` | Delete group |

### User Data Format (`_format_user_data`)

```python
{
    "username": str,           # Cognito UUID
    "email": str,
    "email_verified": bool,
    "enabled": bool,
    "user_status": str,        # CONFIRMED, FORCE_CHANGE_PASSWORD, etc.
    "created_date": str,       # ISO format
    "last_modified_date": str,
    "attributes": Dict[str, str],
    "groups": List[str]        # Added separately
}
```

### User Creation Business Rules

1. Email normalized to lowercase
2. Email used as Cognito username (User Pool requires email format)
3. Check if user exists before creation (prevents duplicates)
4. `email_verified` set to `true` automatically
5. If `send_email=True`: Cognito sends welcome email with custom templates
6. If `send_email=False`: `MessageAction="SUPPRESS"`
7. After creation, `admin_set_user_password(Permanent=False)` ensures `FORCE_CHANGE_PASSWORD` status

### Response Format

All methods return:
```python
# Success
{"success": True, "message": str, ...}

# Error
{"success": False, "error": str, "message": str}
```
