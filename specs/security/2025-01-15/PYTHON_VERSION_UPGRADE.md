# Python Version Upgrade - Boto3 Deprecation Warning

**Date:** 2025-01-14  
**Status:** ✅ Resolved

## Issue

Boto3 is deprecating support for Python 3.9. Starting April 29, 2026, Boto3 will no longer support Python 3.9. The application was showing the following warning:

```
PythonDeprecationWarning: Boto3 will no longer support Python 3.9 starting April 29, 2026. 
To continue receiving service updates, bug fixes, and security updates please upgrade to Python 3.10 or later.
```

## Solution Applied

The project has been updated to use **Python 3.11** (which is already used in the CDK infrastructure) to ensure compatibility and remove the deprecation warning.

### Changes Made

1. **AWS SAM Template** (`igad-app/template.yaml`)
   - Updated `Runtime: python3.9` → `Runtime: python3.11` (2 instances)
   - Functions affected:
     - `ApiFunction`
     - `AnalysisWorkerFunction`

2. **Python Project Configuration** (`igad-app/backend/pyproject.toml`)
   - Updated `target-version = ['py39']` → `target-version = ['py311']`
   - Updated `python_version = "3.9"` → `python_version = "3.11"`

### Why Python 3.11?

- Already used in CDK infrastructure (`igad-app/infrastructure/lib/igad-hub-stack.ts`)
- Better performance than Python 3.10
- Full compatibility with all dependencies
- Long-term support until 2027
- Recommended by AWS for Lambda functions

## Impact

### ✅ Benefits

- **No more deprecation warnings** from Boto3
- **Consistency** across all deployment configurations (SAM and CDK)
- **Future-proof** - Python 3.11 will be supported by Boto3 beyond 2026
- **Better performance** - Python 3.11 is faster than 3.9

### ⚠️ Action Required

**For Local Development:**

1. **Update your Python version** to 3.11:
   ```bash
   # Check current version
   python3 --version
   
   # Install Python 3.11 (if not already installed)
   # macOS with Homebrew:
   brew install python@3.11
   
   # Or use pyenv:
   pyenv install 3.11.0
   pyenv local 3.11.0
   ```

2. **Recreate virtual environment**:
   ```bash
   cd igad-app/backend
   rm -rf venv
   python3.11 -m venv venv
   source venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Verify the warning is gone**:
   ```bash
   python start_server.py
   # Should not show PythonDeprecationWarning about Boto3
   ```

**For AWS Lambda Deployment:**

- No action needed - the `template.yaml` has been updated
- Next deployment will use Python 3.11 runtime
- Ensure your build environment uses Python 3.11 when packaging

## Verification

After updating to Python 3.11, verify:

1. **No deprecation warnings** when starting the server
2. **All tests pass**:
   ```bash
   pytest
   ```
3. **Type checking works**:
   ```bash
   mypy app/
   ```
4. **Code formatting**:
   ```bash
   black app/ scripts/ tests/
   ```

## Timeline

- **Warning appeared:** January 2025
- **Fix applied:** January 14, 2025
- **Boto3 deprecation date:** April 29, 2026
- **Status:** ✅ Proactive fix applied (15 months before deprecation)

## References

- [AWS Python SDK Support Policy](https://aws.amazon.com/blogs/developer/python-support-policy-updates-for-aws-sdks-and-tools/)
- [Python 3.11 Release Notes](https://www.python.org/downloads/release/python-3110/)
- [AWS Lambda Python Runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)

## Notes

- This is a **proactive fix** - the application will continue to work with Python 3.9 until April 2026
- However, upgrading now ensures:
  - No warnings in logs
  - Consistency across environments
  - Better performance
  - Future compatibility

---

**Status:** ✅ Configuration updated. Local development environment needs Python 3.11 installation.
