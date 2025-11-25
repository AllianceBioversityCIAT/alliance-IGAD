# Backend Lint Issues - Manual Review Required
**Date:** November 24, 2025 - 20:58 EST

---

## 🔴 CRITICAL (Breaks Code)

### File: `app/shared/documents/routes.py`

**Issue:** Undefined variables (18 occurrences)

#### Variables Not Defined:
1. `file_size` - Used in lines 533, 535, 538, 593, 613, 615, 616, 619, 647
2. `file_bytes` - Used in lines 542, 543, 546, 601
3. `file` - Used in lines 588, 628, 645
4. `DocumentService` - Used in lines 709, 860

#### Root Cause:
These variables appear to be from code that was commented out or removed during the DocumentService migration. The code references variables that no longer exist in scope.

#### Recommended Fix:
**MANUAL REVIEW REQUIRED** - These are logic errors, not style issues.

Options:
1. Remove the debug print statements that reference undefined variables
2. Restore the missing variable definitions
3. Refactor the code to use correct variable names

#### Lines Affected:
```python
# Line 533-538: file_size checks
print(f"File size read: {file_size} bytes")  # file_size undefined
if file_size == 0:
if file_size > 10 * 1024 * 1024:

# Line 542-546: file_bytes checks  
if not file_bytes.startswith(b'%PDF'):  # file_bytes undefined

# Line 588: file.filename
s3_key = f"{proposal_code}/documents/{file.filename}"  # file undefined

# Line 709, 860: DocumentService
doc_service = DocumentService()  # DocumentService undefined (was commented out)
```

---

## 🟡 WARNINGS (Should Fix)

None found in initial scan.

---

## 🟢 INFO (Style/Formatting)

Will be auto-fixed by Black formatter in Phase 2.

---

## 📊 Summary

| Severity | Count | Auto-Fixable |
|----------|-------|--------------|
| Critical | 18    | ❌ No        |
| Warning  | 0     | -            |
| Info     | TBD   | ✅ Yes       |

---

## 🚨 RECOMMENDATION

**DO NOT proceed with automatic fixes until critical issues are resolved.**

These undefined variables will cause runtime errors. They need to be fixed manually before running formatters.

### Next Steps:
1. Review `app/shared/documents/routes.py` lines 533-860
2. Either remove debug statements or restore missing variables
3. Test the endpoints to ensure they work
4. Then proceed with Phase 2 (automatic formatting)

---

**Status:** ⚠️ BLOCKED - Manual fixes required first
