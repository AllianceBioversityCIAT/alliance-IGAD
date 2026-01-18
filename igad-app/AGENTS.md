# AGENTS.md

Guidelines for AI coding agents working in the IGAD Innovation Hub repository.

> **See also:** Detailed guidelines in [`backend/AGENTS.md`](./backend/AGENTS.md) and [`frontend/AGENTS.md`](./frontend/AGENTS.md)

## Project Overview

AI-powered platform for proposal writing and newsletter generation. Built with AWS serverless (Lambda, DynamoDB, Cognito) with a React/TypeScript frontend and Python/FastAPI backend.

## Repository Structure

```
igad-app/
  frontend/       # React 18 + TypeScript + Vite SPA    -> see frontend/AGENTS.md
  backend/        # Python 3.11 + FastAPI + Lambda      -> see backend/AGENTS.md
  infrastructure/ # AWS CDK
  scripts/        # Deployment scripts
  config/         # Environment configs (testing.json, production.json)
  docs/           # Project documentation
```

---

## Build, Lint, and Test Commands

### Backend (Python) - Run from `igad-app/backend/`

```bash
# Install dependencies
pip install -r requirements.txt

# Formatting
make format              # Black + isort

# Linting
make lint                # Flake8
make check               # All checks without fixing

# Type checking
make type-check          # Mypy

# Testing
make test                # Run all tests
pytest tests/            # Alternative
pytest tests/test_file.py                    # Single file
pytest tests/test_file.py::test_function     # Single test
pytest tests/test_file.py -k "test_name"     # Tests matching pattern
make test-cov            # Tests with coverage

# Combined
make all-checks          # Format, lint, docs, type-check, test
```

### Frontend (TypeScript/React) - Run from `igad-app/frontend/`

```bash
# Install dependencies
npm install

# Development
npm run dev              # Dev server (port 3000)
npm run build            # Production build

# Linting & Formatting
npm run lint             # ESLint (strict, max-warnings 0)
npm run lint:fix         # Auto-fix
npm run format           # Prettier
npm run type-check       # TypeScript

# Testing
npm run test             # Vitest
npm run test -- path/to/file.test.ts         # Single file
npm run test -- -t "test name"               # Tests matching pattern
npm run test:coverage    # Coverage report
```

### Infrastructure (CDK) - Run from `igad-app/infrastructure/`

```bash
npm install
npm run build            # Compile TypeScript
npm run test             # Jest tests
npm run deploy:testing   # Deploy to testing env
npm run deploy:production
```

---

## Code Style Guidelines

### Python Backend

**Formatter:** Black (line-length 88) | **Imports:** isort (black profile) | **Linting:** Flake8 | **Types:** Mypy | **Docstrings:** Google style

**Import Order:**
1. Standard library (`import os, json, logging`)
2. Third-party (`import boto3, from fastapi import ...`)
3. Local (`from app.database import ...`)

**Naming Conventions:**
| Element | Convention | Example |
|---------|------------|---------|
| Files/modules | `snake_case` | `bedrock_service.py` |
| Classes | `PascalCase` | `BedrockService` |
| Functions | `snake_case` | `analyze_rfp()` |
| Private | `_leading_underscore` | `_build_query()` |
| Constants | `SCREAMING_SNAKE` | `MAX_FILE_SIZE` |
| Pydantic models | `PascalCase` | `ProposalCreate` |

**Error Handling:**
```python
try:
    # business logic
except HTTPException:
    raise  # Re-raise HTTP exceptions unchanged
except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
```

**Prompt Placeholder Replacement** - Always handle both formats:
```python
for key, value in context.items():
    template = template.replace("{{" + key + "}}", str(value))
    template = template.replace("{[" + key + "]}", str(value))
```

### TypeScript/React Frontend

**Style:** No semicolons, single quotes, 2-space indent, 100 char width
**Path alias:** `@/*` maps to `./src/*`

**Import Order:**
1. React (`import { useState } from 'react'`)
2. Third-party (`import { FileText } from 'lucide-react'`)
3. Shared (`import { useToast } from '@/shared/hooks/useToast'`)
4. Feature-specific (`import { useProposal } from '@/tools/...'`)
5. CSS modules (`import styles from './Component.module.css'`)

**Naming Conventions:**
| Element | Convention | Example |
|---------|------------|---------|
| Component files | `PascalCase.tsx` | `Button.tsx` |
| Utility files | `camelCase.ts` | `apiClient.ts` |
| Directories | `kebab-case` | `proposal-writer/` |
| Components | `PascalCase` | `Step1InformationConsolidation` |
| Hooks | `useCamelCase` | `useProposal` |
| Interfaces | `PascalCase` | `ButtonProps` |
| Constants | `SCREAMING_SNAKE` | `MAX_FILE_SIZE` |

**Error Handling:**
```typescript
catch (error: unknown) {
    const err = error as { response?: { data?: { detail?: unknown } }; message?: string }
    showError('Title', err.message || 'Operation failed')
}
```

**Component Structure:**
```typescript
// ============================================================================
// IMPORTS / CONSTANTS / TYPES
// ============================================================================

export function Component({ ... }: Props) {
  // STATE - Hooks
  // EFFECTS - Data Loading
  // HANDLERS
  // RENDER
}
```

---

## Key Patterns

### Backend Patterns
- **Service-based architecture:** `routes.py` (endpoints) + `service.py` (logic) + `config.py`
- **DynamoDB single-table:** Use `PK`/`SK` composite keys with `GSI1PK`/`GSI1SK`
- **Async operations:** Long tasks use Lambda invocation + status polling

### Frontend Patterns
- **React Query** for server state (`useQuery`, `useMutation`)
- **Zustand** for client state
- **CSS Modules** for scoped styling (`*.module.css`)
- **Toast notifications** via `useToast()` hook
- **Polling pattern** for AI operations (3s intervals, 5min timeout)

---

## AWS & Deployment

- **Profile:** `IBD-DEV`
- **Region:** `us-east-1` only
- **Environments:** `igad-testing-*` and `igad-prod-*`
- **Deploy testing first**, validate, then production

**Deployment scripts (run from `igad-app/`):**
```bash
# Testing environment (fullstack)
./scripts/deploy-fullstack-testing.sh
./scripts/deploy-fullstack-testing.sh --frontend-only
./scripts/deploy-fullstack-testing.sh --backend-only

# Production environment (requires confirmation)
./scripts/deploy-fullstack-production.sh
```

---

## Pre-commit Hooks

Backend uses pre-commit with Black, isort, Flake8, and Mypy. Frontend uses Husky with lint-staged (ESLint --fix).

## Testing Notes

- Backend tests use pytest with markers (`-m user_management`, `-m prompt_management`)
- Frontend tests use Vitest with React Testing Library
- Always run tests before committing: `make test` (backend), `npm run test` (frontend)
