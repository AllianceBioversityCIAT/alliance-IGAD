# Installation Instructions - Security Fixes

**Date:** 2025-01-19  
**Status:** Ready for Installation

## Overview

All security vulnerability fixes have been applied to the codebase. This document provides instructions to install the updated dependencies and verify the fixes.

---

## Changes Applied

### ✅ 1. Backend (Critical Fix)
- **File:** `igad-app/backend/requirements.txt`
- **Change:** `uvicorn==0.24.0` → `uvicorn>=0.30.0`
- **Fixes:** Critical h11 vulnerability (HTTP Request Smuggling)

### ✅ 2. Infrastructure (High Priority Fix)
- **File:** `igad-app/infrastructure/package.json`
- **Change:** `aws-cdk-lib@2.100.0` → `aws-cdk-lib@2.187.0`
- **Fixes:** 3 vulnerabilities (High, Medium, Low severity)

### ✅ 3. Frontend (Medium Priority Fix)
- **File:** `igad-app/frontend/package.json`
- **Change:** `react-query@3.39.3` → `@tanstack/react-query@^5.0.0`
- **Files Updated:**
  - `src/App.tsx`
  - `src/tools/proposal-writer/hooks/useProposal.ts`
  - `src/tools/admin/hooks/usePrompts.ts`
- **Fixes:** Medium inflight vulnerability

---

## Installation Steps

### Option 1: Automated Script

Run the installation script:

```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD
chmod +x specs/security/INSTALL_DEPENDENCIES.sh
./specs/security/INSTALL_DEPENDENCIES.sh
```

### Option 2: Manual Installation

#### Step 1: Backend Dependencies

```bash
cd igad-app/backend

# Create/activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip

# Install updated requirements
pip install -r requirements.txt --upgrade

# Verify h11 version (should be >= 0.16.0)
pip show h11

# Verify uvicorn version
pip show uvicorn
```

**Expected Output:**
- `h11` version should be `>= 0.16.0`
- `uvicorn` version should be `>= 0.30.0`

#### Step 2: Infrastructure Dependencies

```bash
cd igad-app/infrastructure

# Install dependencies
npm install

# Verify aws-cdk-lib version (should be 2.187.0)
npm list aws-cdk-lib

# Build TypeScript (optional, may need AWS credentials)
npm run build
```

**Expected Output:**
- `aws-cdk-lib@2.187.0` should be installed

#### Step 3: Frontend Dependencies

```bash
cd igad-app/frontend

# Install dependencies
npm install

# Verify @tanstack/react-query version (should be ^5.0.0)
npm list @tanstack/react-query

# Verify react-query is removed
npm list react-query  # Should show "empty" or error

# Build frontend (optional)
npm run build
```

**Expected Output:**
- `@tanstack/react-query@^5.0.0` should be installed
- `react-query` should NOT be in dependencies

---

## Testing

### Backend Tests

```bash
cd igad-app/backend
source venv/bin/activate
pytest
```

### Frontend Tests

```bash
cd igad-app/frontend
npm test
```

### Infrastructure Tests

```bash
cd igad-app/infrastructure
npm test
```

### Type Checking

```bash
# Frontend
cd igad-app/frontend
npm run type-check

# Infrastructure
cd igad-app/infrastructure
npm run build
```

---

## Verification with Snyk

After installation, verify that vulnerabilities are resolved:

### Backend

```bash
cd igad-app/backend
snyk test --file=requirements.txt
```

**Expected:** No critical vulnerabilities found

### Infrastructure

```bash
cd igad-app/infrastructure
snyk test
```

**Expected:** No high/medium vulnerabilities found (aws-cdk-lib issues resolved)

### Frontend

```bash
cd igad-app/frontend
snyk test
```

**Expected:** No medium vulnerabilities found (inflight issue resolved)

### Full Project Scan

```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD
snyk test --all-projects
```

---

## Troubleshooting

### Backend Issues

**Problem:** `h11` version still < 0.16.0
- **Solution:** Ensure uvicorn >= 0.30.0 is installed
- **Check:** `pip show uvicorn` and `pip show h11`

**Problem:** Import errors after update
- **Solution:** Verify FastAPI compatibility with uvicorn 0.30.0+
- **Check:** FastAPI 0.104.1 should be compatible

### Infrastructure Issues

**Problem:** TypeScript compilation errors
- **Solution:** Review CDK changelog for breaking changes
- **Check:** `npm run build` for specific errors

**Problem:** CDK synthesis fails
- **Solution:** May need AWS credentials or check for deprecated APIs
- **Check:** `npm run synth` for specific errors

### Frontend Issues

**Problem:** `@tanstack/react-query` not found
- **Solution:** Run `npm install` again
- **Check:** `npm list @tanstack/react-query`

**Problem:** TypeScript errors after migration
- **Solution:** Check for breaking changes in TanStack Query v5
- **Common issues:**
  - `keepPreviousData` → `placeholderData`
  - Query key format (already using arrays, should be fine)
  - `isLoading` → `isPending` (still works as alias)

**Problem:** Build fails with "circle-dollar-sign" error
- **Solution:** This is a separate lucide-react issue, not related to react-query
- **Check:** May need to reinstall node_modules: `rm -rf node_modules && npm install`

---

## Rollback Instructions

If issues occur, you can rollback:

### Backend

```bash
cd igad-app/backend
# Edit requirements.txt and change back to:
# uvicorn==0.24.0
pip install -r requirements.txt
```

### Infrastructure

```bash
cd igad-app/infrastructure
# Edit package.json and change back to:
# "aws-cdk-lib": "2.100.0"
npm install
```

### Frontend

```bash
cd igad-app/frontend
# Edit package.json and change back to:
# "react-query": "^3.39.3"
# Revert imports in:
# - src/App.tsx
# - src/tools/proposal-writer/hooks/useProposal.ts
# - src/tools/admin/hooks/usePrompts.ts
npm install
```

---

## Success Criteria

✅ All dependencies installed without errors  
✅ Backend: h11 >= 0.16.0  
✅ Infrastructure: aws-cdk-lib == 2.187.0  
✅ Frontend: @tanstack/react-query ^5.0.0 installed, react-query removed  
✅ All tests pass  
✅ Snyk scan shows vulnerabilities resolved  
✅ Application runs without errors  

---

## Next Steps After Installation

1. ✅ Run all tests
2. ✅ Verify with Snyk
3. ✅ Test application functionality
4. ✅ Deploy to testing environment
5. ✅ Monitor for any issues
6. ✅ Deploy to production (after testing verification)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the detailed fix plan: `specs/security/SECURITY_FIX_PLAN.md`
3. Check Snyk documentation for specific vulnerability details
4. Review package changelogs for breaking changes
