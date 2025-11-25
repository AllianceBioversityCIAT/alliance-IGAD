# 🔍 KIRO - Linter Execution & Fix Instructions

## 📋 Overview

Execute linters for both backend and frontend, identify issues, and apply safe automatic fixes without breaking functionality.

---

## ⚠️ CRITICAL SAFETY RULES

1. **ALWAYS create backup before making changes**
2. **NEVER remove working code** - only fix formatting/style
3. **DO NOT change logic** - only fix lint errors
4. **Test after each major fix batch**
5. **Document all changes made**

---

## 🐍 BACKEND LINTING (Python)

### Phase 1: Initial Assessment

**Step 1.1: Check if linters are installed**
```bash
cd igad-app/backend

# Check for existing linter config
ls -la | grep -E "(flake8|pylint|black|mypy)"

# Check if tools are installed
python -m pip list | grep -E "(flake8|pylint|black|mypy|ruff)"
```

**Step 1.2: Install linters if needed**
```bash
# Only if not installed
pip install flake8 black pylint mypy ruff
```

**Step 1.3: Run initial scan (READ-ONLY)**
```bash
# Flake8 - Check PEP8 compliance
flake8 app/ --count --select=E9,F63,F7,F82 --show-source --statistics

# Black - Check formatting (dry-run)
black app/ --check --diff

# Pylint - Check code quality (quick scan)
pylint app/ --errors-only

# Save report
flake8 app/ --count --statistics > ../lint_report_backend_initial.txt
```

### Phase 2: Safe Automatic Fixes

**Step 2.1: Format with Black (safest)**
```bash
# Black only fixes formatting, doesn't change logic
black app/ --verbose

# Verify no syntax errors
python -m py_compile app/**/*.py
```

**Step 2.2: Fix import ordering**
```bash
# Install isort if needed
pip install isort

# Fix imports
isort app/ --profile black --verbose
```

**Step 2.3: Fix trailing whitespace and line endings**
```bash
# Remove trailing whitespace
find app/ -name "*.py" -exec sed -i '' 's/[[:space:]]*$//' {} \;
```

### Phase 3: Manual Review Required

**Step 3.1: Identify issues requiring manual fix**
```bash
# Run flake8 again for remaining issues
flake8 app/ --exclude=__pycache__,*.pyc --max-line-length=100 \
  --output-file=../lint_report_backend_manual.txt

# Check for unused imports
flake8 app/ --select=F401 --output-file=../unused_imports.txt

# Check for undefined names
flake8 app/ --select=F821 --output-file=../undefined_names.txt
```

**Step 3.2: Document issues**
Create a file: `BACKEND_LINT_ISSUES.md` with:
- List of all remaining issues
- Categorize by severity (critical/warning/info)
- Flag any that need human review

### Phase 4: Verification

**Step 4.1: Run all tests**
```bash
# If pytest exists
pytest tests/ -v

# If no tests, at least verify imports
python -c "from app.main import app; print('✅ Main app loads successfully')"
```

**Step 4.2: Check SAM build**
```bash
cd ..
sam build --use-container
```

---

## ⚛️ FRONTEND LINTING (React/TypeScript)

### Phase 1: Initial Assessment

**Step 1.1: Check linter configuration**
```bash
cd igad-app/frontend

# Check for config files
ls -la | grep -E "(eslint|prettier|tsconfig)"

# Check package.json scripts
cat package.json | grep -A 10 "scripts"
```

**Step 1.2: Run initial scan (READ-ONLY)**
```bash
# ESLint
npm run lint 2>&1 | tee ../lint_report_frontend_initial.txt

# TypeScript check
npx tsc --noEmit 2>&1 | tee ../typescript_errors_initial.txt

# Prettier check
npx prettier --check "src/**/*.{ts,tsx}" 2>&1 | tee ../prettier_errors_initial.txt
```

### Phase 2: Safe Automatic Fixes

**Step 2.1: Fix Prettier formatting**
```bash
# Prettier is safe - only fixes formatting
npx prettier --write "src/**/*.{ts,tsx,css,json}"
```

**Step 2.2: Fix auto-fixable ESLint issues**
```bash
# Only fix safe issues
npm run lint -- --fix

# Or if lint script doesn't exist
npx eslint src/ --fix --ext .ts,.tsx
```

**Step 2.3: Remove unused imports (CAREFUL)**
```bash
# This is safe if using TypeScript
npx eslint src/ --fix --rule 'no-unused-vars: error'
```

### Phase 3: Manual Review Required

**Step 3.1: Identify issues requiring manual fix**
```bash
# Re-run linters to see remaining issues
npm run lint 2>&1 | tee ../lint_report_frontend_remaining.txt

# TypeScript errors
npx tsc --noEmit 2>&1 | tee ../typescript_errors_remaining.txt
```

**Step 3.2: Categorize issues**
Create a file: `FRONTEND_LINT_ISSUES.md` with:

```markdown
# Frontend Lint Issues - Manual Review Needed

## Critical (Breaks build)
- [ ] TypeScript errors in X file
- [ ] Missing dependencies

## Warnings (Should fix)
- [ ] Unused variables in Y file
- [ ] Missing prop types

## Info (Can ignore)
- [ ] Console.log statements
- [ ] TODO comments
```

### Phase 4: Verification

**Step 4.1: Build check**
```bash
# Full build
npm run build

# Verify build output
ls -lh dist/
```

**Step 4.2: Type check**
```bash
npx tsc --noEmit
```

---

## 📊 REPORTING

### Create Final Report: `LINTING_SUMMARY.md`

```markdown
# Linting Summary - [DATE]

## Backend (Python)

### Issues Found
- Total: X
- Auto-fixed: Y
- Manual review needed: Z

### Changes Made
- Formatted with Black: XX files
- Fixed imports: YY files
- Removed trailing whitespace: ZZ files

### Remaining Issues
[List from lint_report_backend_manual.txt]

## Frontend (React/TypeScript)

### Issues Found
- Total: X
- Auto-fixed: Y
- Manual review needed: Z

### Changes Made
- Prettier formatting: XX files
- ESLint auto-fix: YY files
- Unused imports removed: ZZ files

### Remaining Issues
[List from lint_report_frontend_remaining.txt]

## Build Status
- ✅ Backend: SAM build successful
- ✅ Frontend: npm build successful
- ✅ TypeScript: No errors

## Next Steps
1. Review manual issues in BACKEND_LINT_ISSUES.md
2. Review manual issues in FRONTEND_LINT_ISSUES.md
3. Deploy to testing environment
4. Run integration tests
```

---

## 🔄 EXECUTION ORDER

Execute in this exact order:

1. **Backend Phase 1** - Assessment
2. **Backend Phase 2** - Auto-fixes
3. **Backend Phase 4** - Verification (SAM build)
4. **Frontend Phase 1** - Assessment
5. **Frontend Phase 2** - Auto-fixes
6. **Frontend Phase 4** - Verification (npm build)
7. **Create Reports** - Document everything
8. **Commit Changes** - If all verifications pass

---

## ✅ SUCCESS CRITERIA

Consider successful if:

- ✅ Backend: SAM build completes without errors
- ✅ Frontend: npm build completes without errors
- ✅ TypeScript: No type errors
- ✅ No broken imports
- ✅ Application still loads
- ✅ All critical lint errors fixed
- ✅ Reports generated

---

## 🚨 ROLLBACK PLAN

If anything breaks:

```bash
# Restore from backup
git stash
# or
git reset --hard HEAD

# Restore specific changes
git checkout -- <file>
```

---

## 📝 NOTES

- **DO NOT** fix lint warnings that involve changing business logic
- **DO NOT** remove console.logs in development code if they're for debugging
- **DO NOT** remove TODO comments without checking with team
- **ALWAYS** verify builds pass after changes
- **DOCUMENT** any issues that need human decision

---

## 🎯 DELIVERABLES

After completion, provide:

1. `LINTING_SUMMARY.md` - Complete summary
2. `BACKEND_LINT_ISSUES.md` - Backend manual review items
3. `FRONTEND_LINT_ISSUES.md` - Frontend manual review items
4. `lint_report_*.txt` - All lint reports
5. Git commit with message: "chore: Apply linter fixes and formatting"

---

## ⏱️ ESTIMATED TIME

- Backend: 15-30 minutes
- Frontend: 15-30 minutes
- Total: 30-60 minutes

---

**Ready to execute? Confirm you understand all safety rules before proceeding.**
