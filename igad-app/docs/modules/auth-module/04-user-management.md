# Auth Module - User Management (Admin Settings)

> Admin UI and API for Cognito user and group management.

## Admin Routes (Backend)

**Source:** `backend/app/tools/admin/settings/routes.py`
**Prefix:** `/admin`

### Admin Access Verification

All admin endpoints use this dependency:

```python
def verify_admin_access(credentials = Depends(security)):
    user_data = auth_middleware.verify_token(credentials)
    if not user_data.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user_data
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users` | List all users |
| POST | `/users` | Create a new user |
| GET | `/users/{username}` | Get user details |
| PUT | `/users/{username}` | Update user attributes |
| DELETE | `/users/{username}` | Delete a user |
| POST | `/users/{username}/enable` | Enable user account |
| POST | `/users/{username}/disable` | Disable user account |
| POST | `/users/{username}/reset-password` | Reset user password |
| GET | `/groups` | List all groups |
| POST | `/users/{username}/groups/{group_name}` | Add user to group |
| DELETE | `/users/{username}/groups/{group_name}` | Remove user from group |

### Pydantic Models

```python
class UserCreate(BaseModel):
    username: str
    email: str
    temporary_password: str
    send_email: Optional[bool] = True

class UserUpdate(BaseModel):
    email: Optional[str] = None
    attributes: Optional[Dict[str, str]] = None
```

### Create User Business Logic

```python
@router.post("/users")
async def create_user(user_data: UserCreate, admin_user=Depends(verify_admin_access)):
    # 1. Normalize email to lowercase
    normalized_email = user_data.email.lower().strip()

    # 2. Check if user already exists
    cognito_client.admin_get_user(UserPoolId=..., Username=normalized_email)
    # Returns error if exists

    # 3. Create user (with or without email notification)
    if user_data.send_email:
        cognito_client.admin_create_user(...)  # Cognito sends email
    else:
        cognito_client.admin_create_user(..., MessageAction="SUPPRESS")

    # 4. Return success with FORCE_CHANGE_PASSWORD status
```

---

## User Service (Frontend)

**Source:** `frontend/src/tools/admin/services/userService.ts`

### TypeScript Interfaces

```typescript
export interface CognitoUser {
  username: string
  email: string
  email_verified: boolean
  enabled: boolean
  user_status: string              // CONFIRMED, FORCE_CHANGE_PASSWORD, etc.
  created_date: string
  last_modified_date: string
  groups?: string[]
  attributes?: Record<string, string>
}

export interface CreateUserRequest {
  username: string
  email: string
  temporary_password: string
  send_email?: boolean
}

export interface UpdateUserRequest {
  attributes: Record<string, string>
}

export interface ResetPasswordRequest {
  temporary_password: string
}

export interface UserListResponse {
  success: boolean
  users: CognitoUser[]
  pagination_token?: string
}

export interface UserResponse {
  success: boolean
  user: CognitoUser
}

export interface CreateGroupRequest {
  name: string
  description?: string
  precedence?: number
}

export interface GroupsResponse {
  success: boolean
  groups: Array<{
    name: string
    description: string
    precedence?: number
    creation_date?: string
    last_modified_date?: string
  }>
}
```

### UserService Methods

```typescript
class UserService {
  async listUsers(limit?: number, paginationToken?: string): Promise<UserListResponse>
  async getUser(username: string): Promise<UserResponse>
  async createUser(userData: CreateUserRequest): Promise<UserResponse>
  async updateUser(username: string, userData: UpdateUserRequest): Promise<{ success, message }>
  async deleteUser(username: string): Promise<{ success, message }>
  async enableUser(username: string): Promise<{ success, message }>
  async disableUser(username: string): Promise<{ success, message }>
  async resetUserPassword(username: string, data: ResetPasswordRequest): Promise<{ success, message }>
  async listGroups(): Promise<GroupsResponse>
  async addUserToGroup(username: string, groupName: string): Promise<{ success, message }>
  async removeUserFromGroup(username: string, groupName: string): Promise<{ success, message }>
  async createGroup(groupData: CreateGroupRequest): Promise<{ success, message, group? }>
  async deleteGroup(groupName: string): Promise<{ success, message }>
}

export const userService = new UserService()
```

---

## Settings Page

**Source:** `frontend/src/tools/admin/pages/SettingsPage.tsx`

Tab-based admin settings page wrapped in `AdminRoute`. Contains:

- **User Management tab** → `UserManagement` component
- **Group Management tab** → `GroupManagement` component

---

## User Management Component

**Source:** `frontend/src/tools/admin/pages/components/UserManagement.tsx`

### Features

- Lists all Cognito users with status, groups, dates
- Create new user (opens `CreateUserModal`)
- Edit user (opens `EditUserModal`)
- Delete user (with confirmation dialog)
- Enable/disable user accounts
- Reset user password
- Filter users by status, search by email

### User Table Columns

| Column | Source Field |
|--------|-------------|
| Email | `user.email` |
| Status | `user.user_status` (badge color-coded) |
| Groups | `user.groups` (comma-separated) |
| Enabled | `user.enabled` (toggle) |
| Created | `user.created_date` |
| Actions | Edit, Delete, Enable/Disable, Reset Password |

### Status Badges

| Status | Color | Meaning |
|--------|-------|---------|
| CONFIRMED | Green | Active user |
| FORCE_CHANGE_PASSWORD | Yellow | Must change temp password |
| DISABLED | Red | Account disabled |

---

## Group Management Component

**Source:** `frontend/src/tools/admin/pages/components/GroupManagement.tsx`

### Features

- List all Cognito groups with description and precedence
- Create new group
- Delete group (with confirmation)
- View group members

---

## Create User Modal

**Source:** `frontend/src/tools/admin/pages/components/CreateUserModal.tsx`

### Form Fields

| Field | Type | Validation |
|-------|------|------------|
| Email | text | Required, email format |
| Temporary Password | password | Required, min 8 chars |
| Send Welcome Email | checkbox | Default: true |

### Submit Flow

```typescript
const handleCreate = async () => {
  await userService.createUser({
    username: email,
    email: email.toLowerCase().trim(),
    temporary_password: password,
    send_email: sendEmail,
  })
  // Refresh user list
  onSuccess()
}
```

---

## Edit User Modal

**Source:** `frontend/src/tools/admin/pages/components/EditUserModal.tsx`

### Features

- View current user attributes
- Edit email (updates Cognito attributes)
- Manage group membership (add/remove)
- Reset password to temporary
- Enable/disable account

---

## Component Hierarchy

```
SettingsPage
├── Tab: User Management
│   └── UserManagement
│       ├── User Table (filterable, sortable)
│       ├── CreateUserModal
│       │   └── Form (email, password, send_email)
│       └── EditUserModal
│           └── Form (attributes, groups, actions)
│
└── Tab: Group Management
    └── GroupManagement
        ├── Group List
        └── Create Group Form
```
