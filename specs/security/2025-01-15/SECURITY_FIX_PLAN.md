# Security Vulnerability Fix Plan

**Generated:** 2025-01-19  
**Based on:** SNYK_ANALYSIS_REPORT.md  
**Status:** 🟡 In Progress

## Overview

This document outlines the step-by-step plan to fix all 6 security vulnerabilities identified by Snyk across the Backend, Frontend, and Infrastructure components.

---

## Priority Matrix

| Priority | Component | Severity | Count | Estimated Effort |
|----------|-----------|----------|-------|------------------|
| 🔴 **P0** | Backend | Critical | 1 | 30 min |
| 🔴 **P1** | Infrastructure | High | 3 | 1-2 hours |
| 🟡 **P2** | Frontend | Medium | 1 | 2-3 hours |
| 🟢 **P3** | Infrastructure | Low | 1 | Auto-fixed |

---

## 1. 🔴 CRITICAL: Backend - h11 Vulnerability (P0)

### Current State
- **Package:** `uvicorn==0.24.0`
- **Vulnerable Dependency:** `h11@0.14.0` (transitive)
- **Issue:** HTTP Request Smuggling (Critical)
- **File:** `igad-app/backend/requirements.txt`

### Fix Plan

#### Step 1: Check Latest uvicorn Version
```bash
cd igad-app/backend
pip index versions uvicorn
```

#### Step 2: Update uvicorn
- Update `requirements.txt` to use latest stable uvicorn version (likely 0.30.0+)
- Latest uvicorn versions include `h11>=0.16.0`

#### Step 3: Update Dependencies
```bash
# Create/activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Update requirements
pip install --upgrade pip
pip install -r requirements.txt --upgrade

# Verify h11 version
pip show h11
# Should show version >= 0.16.0
```

#### Step 4: Testing
- [ ] Run backend tests: `pytest`
- [ ] Start development server: `python start_server.py`
- [ ] Test API endpoints manually
- [ ] Verify no breaking changes in FastAPI/uvicorn behavior

#### Step 5: Verification
```bash
# Run Snyk test again
snyk test --file=requirements.txt
```

### Expected Outcome
- ✅ `h11` upgraded to `>=0.16.0`
- ✅ Critical vulnerability resolved
- ✅ No breaking changes to application

### Rollback Plan
- Revert `requirements.txt` to previous version
- Reinstall: `pip install -r requirements.txt`

---

## 2. 🔴 HIGH: Infrastructure - AWS CDK Vulnerabilities (P1)

### Current State
- **Package:** `aws-cdk-lib@2.100.0`
- **Vulnerabilities:** 
  - High: Insertion of Sensitive Information into Log File
  - Medium: Incorrect Default Permissions
  - Low: Improper Verification of Cryptographic Signature
- **File:** `igad-app/infrastructure/package.json`

### Fix Plan

#### Step 1: Review CDK Changelog
- Check AWS CDK changelog between 2.100.0 and 2.187.0
- Identify breaking changes: https://github.com/aws/aws-cdk/releases
- Review migration guide if available

#### Step 2: Update package.json
```json
{
  "dependencies": {
    "aws-cdk-lib": "2.187.0",
    "constructs": "^10.0.0"
  }
}
```

#### Step 3: Update Dependencies
```bash
cd igad-app/infrastructure
npm install
```

#### Step 4: Verify CDK Compatibility
```bash
# Check CDK version
npx cdk --version

# Synthesize CloudFormation templates
npm run synth

# Review for deprecation warnings
npm run synth 2>&1 | grep -i "deprecat\|warn\|error"
```

#### Step 5: Test Infrastructure Code
- [ ] Run TypeScript compilation: `npm run build`
- [ ] Run tests: `npm test`
- [ ] Review synthesized templates for changes
- [ ] Check for any API changes in constructs used

#### Step 6: Testing in Non-Production
- [ ] Deploy to testing environment: `npm run deploy:testing`
- [ ] Verify all resources created correctly
- [ ] Test application functionality
- [ ] Monitor CloudWatch logs for issues

#### Step 7: Verification
```bash
# Run Snyk test again
cd igad-app/infrastructure
snyk test
```

### Expected Outcome
- ✅ `aws-cdk-lib` upgraded to `2.187.0`
- ✅ 3 vulnerabilities resolved (High, Medium, Low)
- ✅ `brace-expansion` vulnerability may also be resolved
- ✅ No breaking changes to infrastructure

### Breaking Changes to Watch For
- API changes in CDK constructs
- Changes in default behaviors
- Deprecated APIs removed
- TypeScript type changes

### Rollback Plan
- Revert `package.json` to previous version
- Run `npm install`
- Redeploy previous infrastructure version

---

## 3. 🟡 MEDIUM: Frontend - inflight Vulnerability (P2)

### Current State
- **Package:** `react-query@3.39.3`
- **Vulnerable Dependency:** `inflight@1.0.6` (deep transitive)
- **Issue:** Missing Release of Resource after Effective Lifetime (Medium)
- **File:** `igad-app/frontend/package.json`
- **Note:** No direct fix available for `inflight@1.0.6`

### Fix Plan

#### Step 1: Research Migration Path
- Review `@tanstack/react-query` v5 migration guide
- Check compatibility with React 18.2.0
- Review breaking changes between v3 and v5

#### Step 2: Check Current Usage
- Search for all `react-query` imports in codebase
- Identify all hooks and APIs used:
  - `useQuery`
  - `useMutation`
  - `QueryClient`
  - `QueryClientProvider`
  - Others

#### Step 3: Update package.json
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    // Remove: "react-query": "^3.39.3"
  }
}
```

#### Step 4: Update Imports
- Find and replace all imports:
  ```typescript
  // Old
  import { useQuery, useMutation } from 'react-query'
  
  // New
  import { useQuery, useMutation } from '@tanstack/react-query'
  ```

#### Step 5: Update QueryClient Setup
- Review QueryClientProvider setup
- Check if any configuration needs updating
- Update any deprecated options

#### Step 6: Update Dependencies
```bash
cd igad-app/frontend
npm install
```

#### Step 7: Fix Breaking Changes
- [ ] Update any deprecated APIs
- [ ] Fix TypeScript errors
- [ ] Update query keys format if needed (v5 uses array format)
- [ ] Update mutation syntax if changed

#### Step 8: Testing
- [ ] Run type check: `npm run type-check`
- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Start dev server: `npm run dev`
- [ ] Test all features using react-query:
  - [ ] Data fetching
  - [ ] Mutations
  - [ ] Cache invalidation
  - [ ] Error handling
  - [ ] Loading states

#### Step 9: Build Verification
- [ ] Build production bundle: `npm run build`
- [ ] Verify no build errors
- [ ] Check bundle size impact

#### Step 10: Verification
```bash
# Run Snyk test again
cd igad-app/frontend
snyk test
```

### Expected Outcome
- ✅ Migrated to `@tanstack/react-query@5.x`
- ✅ `inflight` vulnerability resolved (new dependency tree)
- ✅ Application functionality maintained
- ✅ No breaking changes to user experience

### Potential Issues
- Breaking changes in react-query v5 API
- TypeScript type mismatches
- Query key format changes
- Cache behavior differences

### Rollback Plan
- Revert `package.json` to previous version
- Revert import changes
- Run `npm install`

---

## 4. 🟢 LOW: Infrastructure - brace-expansion (P3)

### Current State
- **Package:** `brace-expansion@1.1.11` (transitive via aws-cdk-lib)
- **Issue:** Regular Expression Denial of Service (ReDoS) - Low severity
- **Status:** May be auto-fixed by upgrading aws-cdk-lib

### Fix Plan

#### Step 1: Verify After CDK Upgrade
- After upgrading `aws-cdk-lib` to 2.187.0, check if this is resolved
- Run: `npm list brace-expansion`

#### Step 2: If Still Present
- This is a low-severity issue in a transitive dependency
- Monitor for updates
- Consider if direct action is needed (likely not urgent)

### Expected Outcome
- ✅ Resolved automatically with CDK upgrade
- OR
- ✅ Documented as acceptable low-risk issue

---

## Implementation Order

### Phase 1: Critical & High (Day 1)
1. ✅ Fix Backend h11 vulnerability (30 min)
2. ✅ Fix Infrastructure AWS CDK vulnerabilities (1-2 hours)
3. ✅ Test both fixes
4. ✅ Deploy to testing environment

### Phase 2: Medium (Day 2)
1. ✅ Research react-query migration
2. ✅ Update frontend dependencies
3. ✅ Fix breaking changes
4. ✅ Test thoroughly
5. ✅ Deploy to testing environment

### Phase 3: Verification (Day 3)
1. ✅ Run full Snyk scan
2. ✅ Verify all vulnerabilities resolved
3. ✅ Deploy to production (if testing successful)

---

## Testing Checklist

### Backend Testing
- [ ] All API endpoints respond correctly
- [ ] Authentication/authorization works
- [ ] File uploads/downloads work
- [ ] Database operations work
- [ ] Error handling works
- [ ] Performance is acceptable

### Infrastructure Testing
- [ ] CDK synthesis succeeds
- [ ] All resources defined correctly
- [ ] No deprecation warnings
- [ ] Deployment to testing succeeds
- [ ] Application works in testing environment
- [ ] CloudWatch logs show no errors

### Frontend Testing
- [ ] All pages load correctly
- [ ] Data fetching works
- [ ] Mutations work (create/update/delete)
- [ ] Error states display correctly
- [ ] Loading states work
- [ ] Cache invalidation works
- [ ] No console errors
- [ ] Build succeeds
- [ ] Production build works

---

## Verification Commands

### After All Fixes
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

# Full project scan
snyk test --all-projects
```

---

## Success Criteria

- ✅ All Critical vulnerabilities resolved
- ✅ All High vulnerabilities resolved
- ✅ All Medium vulnerabilities resolved
- ✅ Low vulnerabilities resolved or documented as acceptable
- ✅ All tests pass
- ✅ Application works in testing environment
- ✅ No breaking changes to functionality
- ✅ Snyk scan shows 0 vulnerabilities

---

## Risk Assessment

| Risk | Component | Mitigation |
|------|-----------|------------|
| Breaking changes | Infrastructure | Test in testing environment first |
| API changes | Frontend | Review migration guide, update code |
| Performance impact | All | Monitor after deployment |
| Deployment issues | Infrastructure | Have rollback plan ready |

---

## Notes

- All fixes should be tested in testing environment before production
- Keep backups of current dependency versions
- Document any breaking changes encountered
- Update this plan as fixes are implemented
- Consider setting up Snyk monitoring for continuous security scanning

---

## References

- [Snyk Vulnerability Database](https://security.snyk.io/)
- [AWS CDK Changelog](https://github.com/aws/aws-cdk/releases)
- [TanStack Query Migration Guide](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)
- [Uvicorn Releases](https://github.com/encode/uvicorn/releases)
