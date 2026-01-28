## 2026-01-28 - Backend Linter Configuration
**Learning:** `make lint` failed because `flake8` was missing from `requirements-test.txt`. The codebase also had formatting issues (`black`) and a specific `flake8` E202 error.
**Action:** When working on backend, verify `flake8` is installed. Ran `make format` to fix style and manually fixed E202. Confirmed tests are missing from the repo.
