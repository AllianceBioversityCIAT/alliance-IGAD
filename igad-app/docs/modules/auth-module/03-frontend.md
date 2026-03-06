# Auth Module - Frontend

> React pages and services for authentication flows.

## Pages

### LoginPage

**Source:** `frontend/src/tools/auth/pages/LoginPage.tsx`

#### TypeScript Interface

```typescript
interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}
```

#### Component State

```typescript
const [isLoading, setIsLoading] = useState(false)
const [showPassword, setShowPassword] = useState(false)
const [error, setError] = useState<string | null>(null)
const [successMessage, setSuccessMessage] = useState<string | null>(null)
const [isCheckingAuth, setIsCheckingAuth] = useState(true)
```

#### Features

- **Auth check on mount:** If already authenticated, redirects to previous page or `/`
- **Remember me:** Pre-fills email from `localStorage` or `location.state.email`
- **Password visibility toggle:** Eye/EyeOff icons from Lucide
- **Success message:** Shows message from password change redirect via `location.state.message`
- **Email normalization:** `toLowerCase().trim()` on submit
- **Force password change:** Detects `requires_password_change` and navigates to `/change-password` with `{ username, session }`

#### Form Validation (React Hook Form)

```typescript
register('email', {
  required: 'Email is required',
  pattern: {
    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    message: 'Invalid email address',
  },
  setValueAs: value => value.toLowerCase().trim(),
})

register('password', {
  required: 'Password is required',
  minLength: { value: 8, message: 'Password must be at least 8 characters' },
})
```

#### Submit Flow

```typescript
const onSubmit = async (data: LoginForm) => {
  const response = await authService.login({
    username: normalizedEmail,
    password: data.password,
  })
  if (response.requires_password_change) {
    navigate('/change-password', { state: { username, session } })
    return
  }
  authService.setToken(response.access_token, response.refresh_token, data.rememberMe)
  authService.setUserEmail(normalizedEmail, data.rememberMe)
  navigate('/')
}
```

#### Layout

Two-column layout:
- Left: Form with logo, fields, submit button, support text
- Right: Background image with overlay

Uses `LoginPage.module.css` shared across all auth pages.

---

### ForgotPasswordPage

**Source:** `frontend/src/tools/auth/pages/ForgotPasswordPage.tsx`

#### TypeScript Interfaces

```typescript
interface ForgotPasswordForm {
  email: string
}

interface ResetPasswordForm {
  code: string
  newPassword: string
  confirmPassword: string
}
```

#### Two-Step Flow

**Step 1 - Email:**
1. User enters email
2. `authService.forgotPassword(normalizedEmail)`
3. Success: show "Reset code sent" message, switch to step 2

**Step 2 - Reset:**
1. User enters code, new password, confirm password
2. Validate passwords match (client-side)
3. `authService.resetPassword(email, code, newPassword)`
4. Navigate to `/login` with `{ message: 'Password reset successfully...', email }`

#### Form Validation

- Email: same pattern as LoginPage
- Code: required only
- New password: required, min 8 characters
- Confirm password: required only (match validation in onSubmit)

#### UI Elements

- Two password fields with independent show/hide toggles
- Back to Login link in both steps
- Uses same `LoginPage.module.css` styling

---

### ChangePasswordPage

**Source:** `frontend/src/tools/auth/pages/ChangePasswordPage.tsx`

#### TypeScript Interfaces

```typescript
interface ChangePasswordForm {
  newPassword: string
  confirmPassword: string
}

interface LocationState {
  username: string
  session: string
}
```

#### Guard

Requires `location.state.username` and `location.state.session`. Redirects to `/login` if missing.

#### Password Validation

```typescript
register('newPassword', {
  required: 'Password is required',
  minLength: { value: 8, message: 'Password must be at least 8 characters' },
  pattern: {
    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Must contain uppercase, lowercase and number',
  },
})

register('confirmPassword', {
  required: 'Please confirm your password',
  validate: value => value === newPassword || 'Passwords do not match',
})
```

#### Submit Flow

```typescript
const response = await authService.completePasswordChange(
  state.username,
  state.session,
  data.newPassword
)
authService.setToken(response.access_token, response.refresh_token, false)
authService.setUserEmail(state.username, false)
navigate('/', { state: { message: 'Password changed successfully...' } })
```

---

## Auth Service (Frontend)

**Source:** `frontend/src/shared/services/authService.ts`

See [Shared Architecture - Auth Service](../../shared/shared-architecture.md#auth-service) for complete documentation.

Key methods used by auth pages:

| Method | Used By |
|--------|---------|
| `login(credentials)` | LoginPage |
| `setToken(token, refresh?, remember?)` | LoginPage, ChangePasswordPage |
| `setUserEmail(email, remember?)` | LoginPage, ChangePasswordPage |
| `forgotPassword(username)` | ForgotPasswordPage |
| `resetPassword(username, code, password)` | ForgotPasswordPage |
| `completePasswordChange(username, session, password)` | ChangePasswordPage |

---

## Token Manager (Frontend)

**Source:** `frontend/src/shared/services/tokenManager.ts`

See [Shared Architecture - Token Manager](../../shared/shared-architecture.md#token-manager) for complete documentation.

---

## useAuth Hook

**Source:** `frontend/src/shared/hooks/useAuth.ts`

See [Shared Architecture - useAuth Hook](../../shared/shared-architecture.md#useauth-hook) for complete documentation.

---

## CSS Modules

**Source:** `frontend/src/tools/auth/pages/LoginPage.module.css`

All three auth pages share the same CSS module. Key classes:

| Class | Purpose |
|-------|---------|
| `.container` | Full-height two-column layout |
| `.leftColumn` | Form column |
| `.rightColumn` | Background image column |
| `.formContainer` | Centered form wrapper |
| `.formContent` | Form fields area |
| `.formHeader` | Title + subtitle |
| `.fieldGroup` | Label + input group |
| `.input` | Text input styling |
| `.passwordField` | Input + toggle button wrapper |
| `.passwordInput` | Password input with padding for toggle |
| `.passwordToggle` | Eye icon button |
| `.submitButton` | Primary action button |
| `.errorMessage` | Red error banner |
| `.errorText` | Field-level error text |
| `.formOptions` | Remember me + forgot password row |
| `.checkboxGroup` | Checkbox + label |
| `.supportText` | Help text below form |
| `.logo` | IGAD logo image |
| `.backgroundImage` | Right column background |
| `.overlay` | Dark overlay on background |

---

## Dependencies

```json
{
  "react-hook-form": "^7.x",
  "react-router-dom": "^6.x",
  "lucide-react": "^0.x"
}
```
