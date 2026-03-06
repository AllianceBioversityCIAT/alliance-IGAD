# Shared Architecture Patterns

> Reference documentation for replicating the IGAD Innovation Hub shared infrastructure in a new application.

## Table of Contents

1. [API Client (Frontend)](#api-client)
2. [Token Manager (Frontend)](#token-manager)
3. [Auth Service (Frontend)](#auth-service)
4. [useAuth Hook (Frontend)](#useauth-hook)
5. [Auth Middleware (Backend)](#auth-middleware)
6. [DynamoDB Client (Backend)](#dynamodb-client)
7. [FastAPI App Initialization (Backend)](#fastapi-app-initialization)
8. [React Router & Route Guards (Frontend)](#react-router--route-guards)
9. [SAM Template (Infrastructure)](#sam-template)

---

## API Client

**Source:** `frontend/src/shared/services/apiClient.ts`

Axios-based HTTP client singleton with automatic token injection and 401 refresh.

### Implementation

```typescript
import axios from 'axios'
import { tokenManager } from './tokenManager'
import { globalToast, parseApiError } from './globalToast'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Track URLs that should suppress global error toasts
const suppressedErrorUrls = new Set<string>()
```

### Request Interceptor

Injects Bearer token from `tokenManager` into every request:

```typescript
apiClient.interceptors.request.use(config => {
  const token = tokenManager.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### Response Interceptor (401 Auto-Refresh)

On 401 response:
1. Sets `_retry` flag to prevent infinite loops
2. Calls `tokenManager.handleTokenRefreshOnDemand()`
3. If refresh succeeds, retries original request with new token
4. If refresh fails, clears tokens and redirects to `/login`

```typescript
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const newToken = await tokenManager.handleTokenRefreshOnDemand()
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return apiClient(originalRequest)
      } else {
        tokenManager.clearTokens()
        window.location.href = '/login'
      }
    }
    // Show toast for non-401 errors (unless suppressed)
    if (!originalRequest?._suppressErrorToast && error.response?.status !== 401) {
      const { title, message } = parseApiError(error)
      globalToast.showError(title, message)
    }
    return Promise.reject(error)
  }
)
```

### Error Toast Suppression

Custom Axios config extension to suppress per-request error toasts:

```typescript
declare module 'axios' {
  export interface AxiosRequestConfig {
    _suppressErrorToast?: boolean
  }
}

export function suppressErrorToastFor(url: string) {
  suppressedErrorUrls.add(url)
  setTimeout(() => suppressedErrorUrls.delete(url), 30000)
}
```

---

## Token Manager

**Source:** `frontend/src/shared/services/tokenManager.ts`

Singleton class managing JWT token lifecycle with auto-refresh and cross-tab sync.

### Key Interface

```typescript
interface TokenData {
  access_token: string
  refresh_token?: string
  expires_in: number
}
```

### Storage Strategy

| Feature | localStorage | sessionStorage |
|---------|-------------|----------------|
| Remember Me ON | access_token, refresh_token | - |
| Remember Me OFF | remember_me flag only | access_token, refresh_token |
| Cross-tab sync | Yes (via StorageEvent) | No (per-tab) |

**Note:** `setTokens()` always uses `localStorage` for cross-tab auth. The `rememberMe` flag controls whether the email is remembered for next login.

### Token Reading Priority

```typescript
getAccessToken(): string | null {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
}
```

### Auto-Refresh Timer

- Refresh interval: **23 hours** (tokens last 24 hours)
- On init, checks if token expires within 1 hour
- Uses `setInterval` with deduplication (`isRefreshing` flag + shared promise)

### Refresh Endpoint

```
POST /api/auth/refresh-token
Body: { refresh_token: string }
Response: { access_token, refresh_token?, expires_in }
```

### Token Expiry Check

```typescript
isTokenExpiringSoon(token: string): boolean {
  const payload = JSON.parse(atob(token.split('.')[1]))
  const timeUntilExpiry = payload.exp * 1000 - Date.now()
  return timeUntilExpiry < 60 * 60 * 1000 // < 1 hour
}

isAuthenticated(): boolean {
  const token = this.getAccessToken()
  if (!token) return false
  const payload = JSON.parse(atob(token.split('.')[1]))
  return Date.now() < payload.exp * 1000
}
```

### Refresh Failure

On refresh failure: clears all tokens from both storages, redirects to `/login`.

---

## Auth Service

**Source:** `frontend/src/shared/services/authService.ts`

Singleton class wrapping all auth-related API calls with user caching.

### TypeScript Interfaces

```typescript
export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in: number
  requires_password_change?: boolean
  session?: string
  username?: string
  message?: string
}

export interface UserInfo {
  user_id: string
  email: string
  username: string
  role: string
  is_admin: boolean
}
```

### Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `login(credentials)` | `POST /api/auth/login` | Authenticate user |
| `setToken(token, refreshToken?, rememberMe?)` | - | Store tokens, dispatch `auth-change` event |
| `removeToken()` | - | Clear tokens, dispatch logout event |
| `getCurrentUser()` | `GET /api/auth/me` | Get user info (cached 30s) |
| `completePasswordChange(username, session, newPassword)` | `POST /api/auth/complete-password-change` | Force password change flow |
| `forgotPassword(username)` | `POST /api/auth/forgot-password` | Request reset code |
| `resetPassword(username, code, newPassword)` | `POST /api/auth/reset-password` | Confirm password reset |
| `logout()` | - | Clear tokens, redirect to `/login` |

### User Cache

- TTL: 30 seconds
- Prevents concurrent requests via shared promise
- Cleared on logout
- On 401 during `getCurrentUser`: attempts token refresh first

### Custom Events

```typescript
// Login event (same tab)
window.dispatchEvent(new CustomEvent('auth-change', { detail: { type: 'login' } }))

// Logout event (same tab)
window.dispatchEvent(new CustomEvent('auth-change', { detail: { type: 'logout' } }))
```

---

## useAuth Hook

**Source:** `frontend/src/shared/hooks/useAuth.ts`

React hook providing auth state with cross-tab synchronization.

### Implementation

```typescript
export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const loadUser = async () => { /* ... */ }

    // Cross-tab sync via StorageEvent
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        if (e.newValue) loadUser()          // Login in another tab
        else {
          setUser(null)
          setIsAuthenticated(false)
          if (window.location.pathname !== '/login') {
            window.location.href = '/login' // Logout in another tab
          }
        }
      }
    }

    // Same-tab sync via CustomEvent
    const handleAuthEvent = ((e: CustomEvent) => {
      if (e.detail.type === 'login') loadUser()
      else if (e.detail.type === 'logout') {
        setUser(null)
        setIsAuthenticated(false)
      }
    }) as EventListener

    loadUser()
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-change', handleAuthEvent)
    return () => { /* cleanup listeners */ }
  }, [])

  return { user, loading, isAuthenticated, logout: authService.logout.bind(authService) }
}
```

### Return Value

| Field | Type | Description |
|-------|------|-------------|
| `user` | `UserInfo \| null` | Current user data |
| `loading` | `boolean` | Initial auth check in progress |
| `isAuthenticated` | `boolean` | Whether user has valid token |
| `logout` | `() => void` | Logout function |

---

## Auth Middleware

**Source:** `backend/app/middleware/auth_middleware.py`

JWT verification middleware supporting both Cognito tokens and mock development tokens.

### Configuration

```python
JWT_SECRET = os.getenv("JWT_SECRET", "mock-jwt-secret-for-local-development")
JWT_ALGORITHM = "HS256"

# Production safety check
if os.getenv("ENVIRONMENT") == "production":
    if JWT_SECRET == "mock-jwt-secret-for-local-development":
        raise ValueError("SECURITY ERROR: JWT_SECRET must be set in production!")
```

### Token Verification Flow

```
verify_token(credentials)
├── Try decode as Cognito token (development: skip signature verification)
│   ├── Extract user_id from 'sub' claim (CRITICAL: immutable identifier)
│   ├── Get email from token or fallback to Cognito admin_get_user
│   ├── Check admin status via admin_list_groups_for_user
│   └── Return { user_id, email, username, role, is_admin }
│
└── Fallback: decode as mock JWT (HS256 with JWT_SECRET)
    ├── Extract user_id, email from payload
    ├── Check is_admin from JWT or fallback list
    └── Return { user_id, email, username, role, is_admin }
```

### Admin Detection

Admin status determined by checking if user belongs to "admin" group in Cognito:

```python
groups_response = cognito_client.admin_list_groups_for_user(
    UserPoolId=os.getenv("COGNITO_USER_POOL_ID"), Username=username
)
user_groups = [group["GroupName"] for group in groups_response.get("Groups", [])]
is_admin = "admin" in user_groups
```

### Return Schema

```python
{
    "user_id": str,     # Cognito 'sub' claim
    "email": str,
    "username": str,
    "role": "admin" | "user",
    "is_admin": bool
}
```

---

## DynamoDB Client

**Source:** `backend/app/database/client.py`

Single-table design client wrapper with both sync and async methods.

### Initialization

```python
class DynamoDBClient:
    def __init__(self):
        self.table_name = os.getenv("TABLE_NAME", "igad-testing-main-table")
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self.dynamodb = boto3.resource("dynamodb", region_name=self.region)
        self.table = self.dynamodb.Table(self.table_name)

db_client = DynamoDBClient()  # Global singleton
```

### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `get_item` | `async (pk, sk) -> Optional[Dict]` | Get single item |
| `get_item_sync` | `(pk, sk) -> Optional[Dict]` | Sync version for Lambda workers |
| `put_item` | `async (item) -> bool` | Put single item |
| `update_item` | `async (pk, sk, expr, values, names?) -> Dict` | Update with expression |
| `delete_item` | `async (pk, sk) -> bool` | Delete single item |
| `query_items` | `async (pk, sk_condition?, index?, limit?, forward?, pk_name?, sk_begins_with?) -> List[Dict]` | Query with pagination |
| `batch_get_items` | `async (keys) -> List[Dict]` | Batch get |
| `batch_write_items` | `async (items) -> bool` | Batch write |
| `scan_table` | `async (filter?, limit?) -> List[Dict]` | Full table scan |
| `scan_items` | `async (filter_expr, attr_values, attr_names?, limit?) -> List[Dict]` | Filtered scan |

### Query Helper (GSI Support)

```python
async def query_items(self, pk, ..., index_name=None, pk_name=None, sk_begins_with=None):
    # Auto-detect key names based on index
    if pk_name:
        partition_key_name = pk_name
    elif index_name == "GSI1":
        partition_key_name = "GSI1PK"  # sort_key_name = "GSI1SK"
    else:
        partition_key_name = "PK"      # sort_key_name = "SK"
```

---

## FastAPI App Initialization

**Source:** `backend/app/main.py`

### App Setup

```python
app = FastAPI(
    title="IGAD Innovation Hub API",
    description="API for IGAD Innovation Hub platform",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if ENVIRONMENT != "production" else None,
)
```

### CORS Configuration

```python
# Production/Testing: specific origins from env var
if ENVIRONMENT in ["production", "testing"]:
    allowed_origins_str = os.getenv("CORS_ALLOWED_ORIGINS", default_origins)
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
    if ENVIRONMENT == "testing":
        allowed_origins.extend(["http://localhost:3000", "http://localhost:5173", ...])
# Development: localhost only
else:
    allowed_origins = ["http://localhost:3000", "http://localhost:5173", ...]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
    max_age=3600,
)
```

### Explicit OPTIONS Handler

Required for CORS preflight to work correctly with Lambda:

```python
@app.options("/{full_path:path}")
async def options_handler(full_path: str, request: Request):
    origin = request.headers.get("origin")
    if origin and origin in allowed_origins:
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS,PATCH"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,X-Request-ID"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response
    return Response(status_code=403)
```

### Router Registration

```python
app.include_router(health_routes.router)          # /api/health
app.include_router(auth_routes.router)             # /api/auth/*
app.include_router(proposal_writer_routes.router)  # /api/proposals/*
app.include_router(newsletter_generator_routes.router)
app.include_router(documents_routes.router)        # /api/documents/*
app.include_router(admin_routes.router)            # /admin/*
app.include_router(prompts_routes.router)          # /prompts/*
app.include_router(admin_prompts_router)           # /admin/prompts/*
app.include_router(vectors_router.router)          # /api/vectors/*
app.include_router(history.router)                 # /api/history/*
```

---

## React Router & Route Guards

**Source:** `frontend/src/App.tsx`

### Providers

```tsx
<QueryClientProvider client={queryClient}>   {/* React Query */}
  <ToastProvider>                            {/* Global toast notifications */}
    <Router>                                 {/* React Router v6 */}
      <Routes>...</Routes>
    </Router>
  </ToastProvider>
</QueryClientProvider>
```

### QueryClient Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

### Route Guard Components

| Component | Purpose | Behavior |
|-----------|---------|----------|
| `PublicRoute` | Login, forgot-password | Redirects to `/` if authenticated |
| `ProtectedRoute` | All app pages | Redirects to `/login` if not authenticated |
| `AdminRoute` | Admin pages | Extends ProtectedRoute, checks `is_admin` |

### Route Structure

```
/login                          → PublicRoute → LoginPage
/forgot-password                → PublicRoute → ForgotPasswordPage
/change-password                → ChangePasswordPage (no guard - needs session state)
/guide                          → GuidePage (public)
/                               → ProtectedRoute → Layout
  /                             → HomePage
  /dashboard                    → DashboardPage
  /proposal-writer              → ProposalWriterPage
  /proposal-writer/:stepId      → ProposalWriterPage
  /newsletter-generator         → NewsletterGeneratorPage
    /:newsletterCode/step-1..4  → Step1..4 pages
  /admin/prompt-manager         → AdminRoute → PromptManagerPage
  /admin/prompt-manager/create  → AdminRoute → PromptEditorPage
  /admin/prompt-manager/edit/:id → AdminRoute → PromptEditorPage
  /admin/settings               → AdminRoute → SettingsPage
*                               → NotFoundPage
```

---

## SAM Template

**Source:** `template.yaml`

### Key Resources

| Resource | Type | Purpose |
|----------|------|---------|
| `ApiGateway` | `AWS::Serverless::Api` | API Gateway (stage: prod) |
| `ApiFunction` | `AWS::Serverless::Function` | Main Lambda (FastAPI via Web Adapter) |
| `AnalysisWorkerFunction` | `AWS::Serverless::Function` | Background analysis worker |
| `ProposalDocumentsBucket` | S3 Bucket | Document storage |
| CloudFront Distribution | CDN | Frontend SPA hosting |

### Lambda Configuration

```yaml
ApiFunction:
  Runtime: python3.11
  MemorySize: 512
  Timeout: 300
  Architectures: [arm64]
  Layers:
    - "arn:aws:lambda:${AWS::Region}:753240598075:layer:LambdaAdapterLayerArm64:25"
  Environment:
    Variables:
      PORT: 8080
      AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
      COGNITO_CLIENT_ID: <client-id>
      COGNITO_USER_POOL_ID: <pool-id>
      TABLE_NAME: igad-testing-main-table
      PROPOSALS_BUCKET: !Ref ProposalDocumentsBucket
      ENVIRONMENT: testing
      CORS_ALLOWED_ORIGINS: <comma-separated-origins>
```

### IAM Policies Summary

| Service | Actions |
|---------|---------|
| **Cognito** | AdminInitiateAuth, AdminRespondToAuthChallenge, AdminGetUser, AdminCreateUser, AdminSetUserPassword, AdminDeleteUser, AdminEnableUser, AdminDisableUser, AdminUpdateUserAttributes, AdminAddUserToGroup, AdminRemoveUserFromGroup, AdminListGroupsForUser, ListUsers, ListGroups, ForgotPassword, ConfirmForgotPassword |
| **DynamoDB** | GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan, BatchGetItem, BatchWriteItem (on main table + indexes) |
| **Bedrock** | InvokeModel, InvokeModelWithResponseStream, Retrieve, RetrieveAndGenerate |
| **S3** | PutObject, GetObject, DeleteObject, ListBucket |
| **SES** | SendEmail, SendRawEmail |
| **Lambda** | InvokeFunction (worker) |

### API Gateway Routes

```yaml
Events:
  ApiEvent:     { Path: /api/{proxy+}, Method: ANY }
  RootApiEvent: { Path: /api, Method: ANY }
  DocsEvent:    { Path: /docs, Method: GET }
  RedocEvent:   { Path: /redoc, Method: GET }
  OpenApiEvent: { Path: /openapi.json, Method: GET }
  RootCatchAll: { Path: /{proxy+}, Method: ANY }
```

### Binary Media Types

```yaml
BinaryMediaTypes:
  - 'multipart/form-data'
  - 'application/pdf'
  - 'application/octet-stream'
```

---

## Replication Checklist

To replicate this shared architecture in a new project:

1. **Frontend Setup**
   - Install: `axios`, `react-router-dom`, `@tanstack/react-query`
   - Create `apiClient.ts` with interceptors
   - Create `tokenManager.ts` singleton
   - Create `authService.ts` wrapping auth endpoints
   - Create `useAuth.ts` hook with cross-tab sync
   - Set up `App.tsx` with route guards (PublicRoute, ProtectedRoute, AdminRoute)

2. **Backend Setup**
   - Install: `fastapi`, `python-jose`, `boto3`, `pydantic`, `mangum`
   - Create `auth_middleware.py` with JWT verification
   - Create `client.py` DynamoDB wrapper
   - Configure `main.py` with CORS, routers, middleware
   - Set up environment-based CORS origins

3. **Infrastructure**
   - SAM template with API Gateway + Lambda Web Adapter
   - Cognito User Pool with admin group
   - DynamoDB single table
   - IAM policies for Cognito, DynamoDB, Bedrock, S3
   - CloudFront for SPA hosting
