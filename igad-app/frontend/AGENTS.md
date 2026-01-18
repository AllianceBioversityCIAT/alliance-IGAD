# AGENTS.md - Frontend

Guidelines for AI agents working in the React/TypeScript frontend.

## Quick Reference

```bash
# Setup
npm install

# Development
npm run dev              # Dev server (port 3000)
npm run build            # Production build

# Quality
npm run lint             # ESLint (max-warnings 0)
npm run lint:fix         # Auto-fix
npm run format           # Prettier
npm run type-check       # TypeScript

# Test
npm run test                         # All tests (Vitest)
npm run test -- path/to/file.test.ts # Single file
npm run test -- -t "test name"       # Match pattern
npm run test:coverage                # With coverage
```

## Architecture

```
src/
  pages/                  # Top-level pages
    HomePage.tsx
    DashboardPage.tsx
    NotFoundPage.tsx
  shared/
    components/
      ui/                 # Reusable UI (Button, Card, Toast, etc.)
      Layout.tsx          # App layout wrapper
      Navigation.tsx      # Main nav
      ProtectedRoute.tsx  # Auth guard
    hooks/
      useAuth.ts          # Authentication
      useToast.ts         # Toast notifications
      useConfirmation.ts  # Confirmation dialogs
    services/
      apiClient.ts        # Axios instance
      authService.ts      # Auth operations
      tokenManager.ts     # JWT handling
  tools/
    proposal-writer/      # Main feature (see below)
  types/
    prompt.ts             # Shared types
  App.tsx                 # Routes & providers
  main.tsx                # Entry point
```

### Proposal Writer (`src/tools/proposal-writer/`)

```
components/
  AnalysisProgressModal.tsx
  ManualRFPInput.tsx
  ProposalSidebar.tsx
  ReuploadModals.tsx
pages/
  ProposalWriterPage.tsx    # Main orchestrator
  Step1InformationConsolidation.tsx
  Step2ConceptReview.tsx
  Step3StructureWorkplan.tsx
  Step4ProposalReview.tsx
services/
  proposalService.ts        # All API calls
```

---

## Code Style

### Prettier Config
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}
```

### ESLint Rules
- `@typescript-eslint/no-explicit-any`: warn
- `no-console`: warn
- `eqeqeq`: error
- `curly`: error
- React hooks rules enforced

### Import Order
```typescript
// 1. React
import { useState, useEffect, useCallback } from 'react'

// 2. Third-party
import { FileText, Upload, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'

// 3. Shared (use @/ alias)
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/useToast'
import { apiClient } from '@/shared/services/apiClient'

// 4. Feature-specific
import { proposalService } from '@/tools/proposal-writer/services/proposalService'
import { useProposal } from '../hooks/useProposal'

// 5. Styles (last)
import styles from './Component.module.css'
```

### Naming Conventions
| Element | Style | Example |
|---------|-------|---------|
| Component files | `PascalCase.tsx` | `Button.tsx`, `ProposalWriterPage.tsx` |
| Utility files | `camelCase.ts` | `apiClient.ts`, `tokenManager.ts` |
| Directories | `kebab-case` | `proposal-writer/`, `ui/` |
| Components | `PascalCase` | `Step1InformationConsolidation` |
| Hooks | `useCamelCase` | `useProposal`, `useToast` |
| Interfaces | `PascalCase` | `ButtonProps`, `Proposal` |
| Constants | `SCREAMING_SNAKE` | `MAX_FILE_SIZE`, `POLL_INTERVAL` |
| CSS Modules | `*.module.css` | `Button.module.css` |

---

## Component Patterns

### Functional Component Structure
```typescript
// ============================================================================
// IMPORTS
// ============================================================================
import { useState, useCallback } from 'react'
import { useToast } from '@/shared/hooks/useToast'
import styles from './MyComponent.module.css'

// ============================================================================
// TYPES
// ============================================================================
interface MyComponentProps {
  title: string
  onSubmit: (data: FormData) => void
}

// ============================================================================
// COMPONENT
// ============================================================================
export function MyComponent({ title, onSubmit }: MyComponentProps) {
  // STATE
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useToast()

  // HANDLERS
  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      await onSubmit(data)
      showSuccess('Success', 'Operation completed')
    } catch (error) {
      showError('Error', 'Operation failed')
    } finally {
      setLoading(false)
    }
  }, [onSubmit, showSuccess, showError])

  // RENDER
  return (
    <div className={styles.container}>
      <h1>{title}</h1>
      <Button onClick={handleSubmit} disabled={loading}>
        Submit
      </Button>
    </div>
  )
}
```

### forwardRef Pattern (UI components)
```typescript
import { forwardRef } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', children, ...props }, ref) => {
    return (
      <button ref={ref} className={styles[variant]} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
```

---

## State Management

### React Query (Server State)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['proposal', proposalId],
  queryFn: () => proposalService.getProposal(proposalId),
  enabled: !!proposalId,
  staleTime: 5 * 60 * 1000, // 5 minutes
})

// Mutation
const queryClient = useQueryClient()
const mutation = useMutation({
  mutationFn: proposalService.updateProposal,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['proposal', proposalId] })
    showSuccess('Saved', 'Changes saved successfully')
  },
})
```

### Zustand (Client State)
```typescript
import { create } from 'zustand'

interface StoreState {
  currentStep: number
  setCurrentStep: (step: number) => void
}

export const useStore = create<StoreState>(set => ({
  currentStep: 1,
  setCurrentStep: step => set({ currentStep: step }),
}))
```

---

## Error Handling

### Try/Catch Pattern
```typescript
const handleUpload = async (file: File) => {
  try {
    await proposalService.uploadDocument(file)
    showSuccess('Uploaded', 'Document uploaded successfully')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { detail?: string } }; message?: string }
    const message = err.response?.data?.detail || err.message || 'Upload failed'
    showError('Upload Failed', message)
  }
}
```

### Toast Notifications
```typescript
const { showSuccess, showError, showWarning } = useToast()

showSuccess('Title', 'Success message')
showError('Title', 'Error message', {
  label: 'Retry',
  onClick: () => retryOperation(),
})
```

---

## Polling Pattern (AI Operations)

```typescript
const POLL_INTERVAL = 3000 // 3 seconds
const MAX_POLL_TIME = 5 * 60 * 1000 // 5 minutes

const pollForCompletion = useCallback(async () => {
  const startTime = Date.now()

  const poll = async () => {
    if (Date.now() - startTime > MAX_POLL_TIME) {
      showError('Timeout', 'Operation timed out')
      return
    }

    const status = await proposalService.getAnalysisStatus(proposalId)

    if (status === 'completed') {
      showSuccess('Complete', 'Analysis finished')
      refetch()
    } else if (status === 'failed') {
      showError('Failed', 'Analysis failed')
    } else {
      setTimeout(poll, POLL_INTERVAL)
    }
  }

  poll()
}, [proposalId, refetch, showSuccess, showError])
```

---

## CSS Modules

```typescript
// Import
import styles from './Component.module.css'

// Usage
<div className={styles.container}>
  <span className={styles.highlight}>Text</span>
</div>

// Conditional
<div className={`${styles.base} ${isActive ? styles.active : ''}`}>
```

### Tailwind + CSS Modules
Use Tailwind for utilities, CSS Modules for component-specific styles:
```typescript
<div className={`${styles.card} flex items-center gap-4 p-4`}>
```

---

## Protected Routes

```typescript
// In App.tsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  }
/>

// Admin only
<Route
  path="/admin"
  element={
    <AdminRoute>
      <AdminPage />
    </AdminRoute>
  }
/>
```

---

## Path Alias

Use `@/` for imports from `src/`:
```typescript
// tsconfig.json paths configured
import { Button } from '@/shared/components/ui/Button'  // Good
import { Button } from '../../../shared/components/ui/Button'  // Avoid
```

---

## Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

describe('Button', () => {
  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))

    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

---

## API Client

All requests go through `apiClient.ts`:
```typescript
import { apiClient } from '@/shared/services/apiClient'

// Automatic token refresh and error handling
const response = await apiClient.get('/api/proposals')
const data = await apiClient.post('/api/proposals', payload)
```
