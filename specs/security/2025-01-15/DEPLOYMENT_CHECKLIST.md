# Security Fixes - Deployment Checklist

**Date:** 2025-01-14  
**Status:** Ready for Deployment

## Summary of Changes

This deployment includes security vulnerability fixes across all components:

### ✅ Backend (Python)
- **Critical Fix:** Updated `uvicorn` from `0.24.0` to `>=0.30.0`
  - Resolves: h11 HTTP Request Smuggling vulnerability (Critical)
  - File: `igad-app/backend/requirements.txt`
- **Python Version:** Updated to Python 3.11
  - Resolves: Boto3 deprecation warning
  - Files: `igad-app/template.yaml`, `igad-app/backend/pyproject.toml`

### ✅ Infrastructure (AWS CDK)
- **High Priority Fix:** Updated `aws-cdk-lib` from `2.100.0` to `2.187.0`
  - Resolves: 3 vulnerabilities (High, Medium, Low severity)
  - File: `igad-app/infrastructure/package.json`

### ✅ Frontend (React)
- **Medium Priority Fix:** Migrated from `react-query@3.39.3` to `@tanstack/react-query@^5.0.0`
  - Resolves: inflight vulnerability (Medium)
  - Files: 
    - `igad-app/frontend/package.json`
    - `igad-app/frontend/src/App.tsx`
    - `igad-app/frontend/src/tools/proposal-writer/hooks/useProposal.ts`
    - `igad-app/frontend/src/tools/admin/hooks/usePrompts.ts`

---

## Pre-Deployment Checklist

### Backend
- [x] `requirements.txt` updated with uvicorn >=0.30.0
- [x] `template.yaml` updated to Python 3.11 runtime
- [x] `pyproject.toml` updated to Python 3.11
- [ ] Dependencies installed and tested locally
- [ ] Backend tests pass: `pytest`
- [ ] Server starts without errors
- [ ] No Boto3 deprecation warnings

### Infrastructure
- [x] `package.json` updated with aws-cdk-lib@2.187.0
- [ ] Dependencies installed: `npm install`
- [ ] TypeScript compiles: `npm run build`
- [ ] CDK synthesis works: `npm run synth`
- [ ] Review for breaking changes in CDK 2.187.0

### Frontend
- [x] `package.json` updated with @tanstack/react-query@^5.0.0
- [x] All imports updated
- [x] Dependencies installed: `npm install`
- [ ] Type checking passes: `npm run type-check`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors
- [ ] Application runs without errors

---

## Deployment Steps

### 1. Build Backend

```bash
cd igad-app/backend

# Ensure Python 3.11 is used
python3.11 --version  # Should show 3.11.x

# Install dependencies
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Run tests
pytest

# Build for Lambda (if using SAM)
sam build
```

### 2. Build Infrastructure

```bash
cd igad-app/infrastructure

# Install dependencies
npm install

# Verify CDK version
npm list aws-cdk-lib  # Should show 2.187.0

# Build TypeScript
npm run build

# Synthesize CloudFormation
npm run synth
```

### 3. Build Frontend

```bash
cd igad-app/frontend

# Install dependencies
npm install

# Verify @tanstack/react-query is installed
npm list @tanstack/react-query  # Should show ^5.0.0

# Type check
npm run type-check

# Build
npm run build
```

### 4. Deploy

Use your existing deployment scripts:

```bash
# Testing environment
./igad-app/scripts/deploy-fullstack-testing.sh

# Or production
./igad-app/scripts/deploy-fullstack-production.sh
```

---

## Post-Deployment Verification

### 1. Check Application Functionality
- [ ] Frontend loads correctly
- [ ] API endpoints respond
- [ ] Authentication works
- [ ] Proposal writer functions correctly
- [ ] Admin features work

### 2. Verify Security Fixes

Run Snyk scans after deployment:

```bash
# Backend
cd igad-app/backend
snyk test --file=requirements.txt

# Frontend
cd igad-app/frontend
snyk test

# Infrastructure
cd igad-app/infrastructure
snyk test
```

**Expected Results:**
- ✅ No critical vulnerabilities
- ✅ No high vulnerabilities
- ✅ No medium vulnerabilities (or documented acceptable ones)

### 3. Monitor Logs

Check CloudWatch logs for:
- [ ] No Python deprecation warnings
- [ ] No import errors
- [ ] No runtime errors
- [ ] Application starts successfully

---

## Rollback Plan

If issues occur after deployment:

### Backend Rollback
1. Revert `requirements.txt` to previous version
2. Revert `template.yaml` to `python3.9`
3. Redeploy

### Infrastructure Rollback
1. Revert `package.json` to `aws-cdk-lib@2.100.0`
2. Run `npm install`
3. Redeploy infrastructure

### Frontend Rollback
1. Revert `package.json` to `react-query@3.39.3`
2. Revert import changes in affected files
3. Run `npm install`
4. Rebuild and redeploy

---

## Breaking Changes to Watch For

### AWS CDK 2.100.0 → 2.187.0
- Review CDK changelog for breaking changes
- Check for deprecated APIs
- Verify all constructs still work

### TanStack Query v3 → v5
- Query keys format (already using arrays, should be fine)
- `keepPreviousData` → `placeholderData` (already updated)
- `isLoading` → `isPending` (still works as alias)

### Python 3.9 → 3.11
- Should be backward compatible
- Some type hints may need updates
- Performance improvements expected

---

## Success Criteria

- ✅ All builds succeed
- ✅ All tests pass
- ✅ Application deploys successfully
- ✅ No errors in CloudWatch logs
- ✅ Snyk scans show vulnerabilities resolved
- ✅ Application functionality verified
- ✅ No user-facing issues

---

## Notes

- **Testing Environment First:** Always deploy to testing environment first
- **Monitor Closely:** Watch logs and metrics after deployment
- **User Communication:** If any breaking changes affect users, communicate in advance
- **Documentation:** Update deployment docs if any issues are encountered

---

## Support

If issues occur:
1. Check CloudWatch logs
2. Review this checklist
3. Check detailed fix plans:
   - `specs/security/SECURITY_FIX_PLAN.md`
   - `specs/security/INSTALLATION_INSTRUCTIONS.md`
   - `specs/security/PYTHON_VERSION_UPGRADE.md`

---

**Good luck with the deployment! 🚀**
