# 🔍 ROUTES AUDIT INSTRUCTIONS FOR KIRO

**Date:** November 25, 2025  
**Task:** Complete audit of all routes (Backend + Frontend)  
**Priority:** HIGH - Ensure nothing is broken after migration

---

## 🎯 OBJECTIVE

Verify that ALL routes are:
1. ✅ Properly registered in their respective routers
2. ✅ Imported correctly in main files
3. ✅ Accessible in the application
4. ✅ Frontend routes match backend endpoints

---

## 📋 PART 1: BACKEND ROUTES AUDIT

### Step 1: Verify All Router Files Exist

Check these files exist:

```bash
# Core routers
tools/proposal_writer/routes.py
tools/auth/routes.py
tools/admin/settings/routes.py
tools/admin/prompts_manager/routes.py
shared/health/routes.py
shared/documents/routes.py
```

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/backend/app
ls -la tools/proposal_writer/routes.py
ls -la tools/auth/routes.py
ls -la tools/admin/settings/routes.py
ls -la tools/admin/prompts_manager/routes.py
ls -la shared/health/routes.py
ls -la shared/documents/routes.py
```

### Step 2: Extract All Endpoints from Router Files

For each router file, extract all endpoints:

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/backend/app

# Proposal Writer endpoints
grep -E "@router\.(get|post|put|delete|patch)" tools/proposal_writer/routes.py | grep -oE '"[^"]*"'

# Auth endpoints
grep -E "@router\.(get|post|put|delete|patch)" tools/auth/routes.py | grep -oE '"[^"]*"'

# Settings endpoints
grep -E "@router\.(get|post|put|delete|patch)" tools/admin/settings/routes.py | grep -oE '"[^"]*"'

# Prompts endpoints
grep -E "@router\.(get|post|put|delete|patch)" tools/admin/prompts_manager/routes.py | grep -oE '"[^"]*"'

# Health endpoints
grep -E "@router\.(get|post|put|delete|patch)" shared/health/routes.py | grep -oE '"[^"]*"'

# Documents endpoints
grep -E "@router\.(get|post|put|delete|patch)" shared/documents/routes.py | grep -oE '"[^"]*"'
```

### Step 3: Verify main.py Imports

Check that main.py imports all routers:

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/backend/app
grep "from.*routes import" main.py
grep "include_router" main.py
```

**Expected:**
```python
from .tools.admin.settings import routes as admin_routes
from .tools.auth import routes as auth_routes
from .shared.health import routes as health_routes
from .tools.admin.prompts_manager import routes as prompts_routes
from .shared.documents import routes as documents_routes
from .tools.proposal_writer import routes as proposal_writer_routes

app.include_router(health_routes.router)
app.include_router(auth_routes.router)
app.include_router(proposal_writer_routes.router)
app.include_router(documents_routes.router)
app.include_router(admin_routes.router)
app.include_router(prompts_routes.router)
```

### Step 4: Test Python Imports

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/backend
python3 -c "
import sys
sys.path.insert(0, '.')
from app.main import app
print('✅ All imports successful!')
print(f'✅ Total routes: {len(app.routes)}')
for route in app.routes:
    if hasattr(route, 'path') and hasattr(route, 'methods'):
        print(f'  {list(route.methods)[0]:6} {route.path}')
"
```

---

## 📋 PART 2: FRONTEND ROUTES AUDIT

### Step 1: Verify Route Configuration

Check `src/routes/index.tsx`:

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/frontend
grep -A 5 "path:" src/routes/index.tsx
```

**Expected routes:**
```typescript
/                           → Landing page
/login                      → Login page
/dashboard                  → Dashboard
/proposal-writer            → Proposal Writer home
/proposal-writer/:id        → Proposal detail
/proposal-writer/:id/step-1 → RFP Analysis
/proposal-writer/:id/step-2 → Concept Review
/proposal-writer/:id/step-3 → Document Generation
/proposal-writer/:id/step-4 → Final Review
/settings                   → Settings page
```

### Step 2: Verify Page Files Exist

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/frontend/src

# Core pages
ls -la pages/Landing.tsx
ls -la pages/Login.tsx
ls -la pages/Dashboard.tsx
ls -la pages/Settings.tsx

# Proposal Writer pages
ls -la tools/proposal-writer/pages/ProposalWriter.tsx
ls -la tools/proposal-writer/pages/ProposalDetail.tsx
ls -la tools/proposal-writer/pages/Step1.tsx
ls -la tools/proposal-writer/pages/Step2.tsx
ls -la tools/proposal-writer/pages/Step3.tsx
ls -la tools/proposal-writer/pages/Step4.tsx
```

### Step 3: Check API Calls Match Backend

Extract all API calls from frontend:

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/frontend/src

# Find all API calls
grep -r "apiClient\.\(get\|post\|put\|delete\)" tools/proposal-writer/ | grep -oE '`[^`]*`|"[^"]*"|'"'"'[^'"'"']*'"'"

# Find fetch calls
grep -r "fetch(" tools/proposal-writer/ | grep -oE '`[^`]*`|"[^"]*"|'"'"'[^'"'"']*'"'"
```

---

## 📋 PART 3: CROSS-REFERENCE CHECK

### Step 1: Create Endpoint Mapping

Create a table matching frontend calls to backend endpoints:

| Frontend Call | Backend Endpoint | Status |
|--------------|------------------|--------|
| GET `/api/proposals` | `@router.get("/api/proposals")` | ✅/❌ |
| POST `/api/proposals` | `@router.post("/api/proposals")` | ✅/❌ |
| ... | ... | ... |

### Step 2: Identify Missing Routes

Check for:
- Frontend calls with no backend endpoint
- Backend endpoints not used by frontend
- Mismatched paths (e.g., `/proposals` vs `/api/proposals`)

---

## 📋 PART 4: BUILD VERIFICATION

### Step 1: Backend Build

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app
sam build --use-container
```

**Expected:** ✅ Build Succeeded

### Step 2: Frontend Build

**Command:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app/frontend
npm run build
```

**Expected:** ✅ Build completed without errors

---

## 📊 DELIVERABLE

Create a markdown file: `ROUTES_AUDIT_REPORT.md` with:

### 1. Backend Routes Summary
```markdown
## Backend Routes

### Proposal Writer
- GET /api/proposals
- POST /api/proposals
- GET /api/proposals/{id}
- ...

### Auth
- POST /api/auth/login
- POST /api/auth/logout
- ...

### Settings
- GET /api/settings
- PUT /api/settings
- ...

### Health
- GET /health
- ...

### Documents
- GET /api/documents/{id}
- ...

### Prompts
- GET /api/prompts
- POST /api/prompts
- ...

**Total:** XX endpoints
```

### 2. Frontend Routes Summary
```markdown
## Frontend Routes

### Public Routes
- / → Landing
- /login → Login

### Protected Routes
- /dashboard → Dashboard
- /proposal-writer → Proposal Writer
- /proposal-writer/:id/step-1 → Step 1
- ...
- /settings → Settings

**Total:** XX routes
```

### 3. API Calls Inventory
```markdown
## Frontend → Backend API Calls

### Proposal Writer
- GET /api/proposals → tools/proposal-writer/pages/Dashboard.tsx
- POST /api/proposals → tools/proposal-writer/components/CreateProposal.tsx
- ...

### Auth
- POST /api/auth/login → pages/Login.tsx
- ...

**Total:** XX API calls
```

### 4. Issues Found
```markdown
## ⚠️ Issues

1. Missing backend endpoint for `/api/xyz`
   - Used in: `Component.tsx:123`
   - Fix: Add endpoint to `routes.py`

2. Unused backend endpoint `/api/abc`
   - Defined in: `routes.py:45`
   - Action: Remove or document

...
```

### 5. Verification Results
```markdown
## ✅ Verification

- [x] All backend routers exist
- [x] All routers imported in main.py
- [x] All frontend pages exist
- [x] All routes defined in index.tsx
- [x] Backend builds successfully
- [x] Frontend builds successfully
- [ ] All API calls match backend endpoints
- [ ] No orphaned endpoints
```

---

## 🚀 EXECUTION

Run this audit and create the report file. If you find issues, list them clearly so we can fix them.

**Start the audit now!**
