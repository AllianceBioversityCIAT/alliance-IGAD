# Auth Module - Architecture Overview

> Authentication and authorization module for the IGAD Innovation Hub, powered by AWS Cognito.

## Purpose

Provides complete authentication lifecycle: login, token management, password reset, force password change, and admin user/group management via Cognito.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, React Hook Form, React Router v6 |
| Backend | FastAPI, python-jose (JWT), boto3 (Cognito) |
| Auth Provider | AWS Cognito User Pool |
| Token Format | Cognito JWT (access + ID tokens) |
| Styling | CSS Modules |

## Auth Flow

```
User enters email/password
    │
    ▼
POST /api/auth/login
    │
    ├── Success → { access_token, refresh_token, user }
    │   ├── Store tokens (localStorage or sessionStorage)
    │   ├── Dispatch 'auth-change' event
    │   └── Navigate to /
    │
    ├── FORCE_CHANGE_PASSWORD → { session, username }
    │   └── Navigate to /change-password
    │
    └── Error → Show error message

Protected API Calls:
    Request → apiClient interceptor adds Bearer token
    │
    ├── 200 OK → Return data
    └── 401 → tokenManager.handleTokenRefreshOnDemand()
        ├── Refresh success → Retry with new token
        └── Refresh fail → Clear tokens → /login

Cross-tab Sync:
    Tab A logs out → localStorage 'access_token' removed
    Tab B StorageEvent fires → setUser(null) → redirect /login
```

## File Tree

```
backend/
  app/
    tools/auth/
      routes.py              # 7 auth endpoints
      service.py             # CognitoUserManagementService (user/group CRUD)
    tools/admin/settings/
      routes.py              # 13 admin endpoints (users, groups)
    middleware/
      auth_middleware.py      # JWT verification, admin detection

frontend/
  src/
    tools/auth/pages/
      LoginPage.tsx           # Login form with remember me
      LoginPage.module.css    # Login page styles
      ForgotPasswordPage.tsx  # 2-step password reset
      ChangePasswordPage.tsx  # Force password change
    tools/admin/pages/
      SettingsPage.tsx        # Admin settings (tabs)
      components/
        UserManagement.tsx    # User CRUD UI
        GroupManagement.tsx   # Group management UI
        CreateUserModal.tsx   # User creation form
        EditUserModal.tsx     # User edit form
    tools/admin/services/
      userService.ts          # User/group API service
    shared/services/
      authService.ts          # Auth API wrapper
      tokenManager.ts         # Token storage & refresh
    shared/hooks/
      useAuth.ts              # Auth state hook
```

## Integration Points

- **All modules** use `apiClient.ts` which auto-injects auth tokens
- **Admin pages** use `AdminRoute` guard (checks `is_admin`)
- **Protected pages** use `ProtectedRoute` guard (checks `isAuthenticated`)
- **Backend routes** use `Depends(security)` + `auth_middleware.verify_token()`
- **Admin backend** uses `verify_admin_access()` dependency
