.PHONY: lint format type-check lint-fix all-checks docs-check test test-user test-prompt test-cov

# Format code with black and isort
format:
	python3 -m black app/ scripts/ tests/
	python3 -m isort app/ scripts/ tests/

# Check code style with flake8
lint:
	python3 -m flake8 app/ scripts/ tests/

# Check documentation style
docs-check:
	python3 -m pydocstyle app/ scripts/

# Type checking with mypy
type-check:
	python3 -m mypy app/

# Run all tests
test:
	python3 -m pytest tests/

# Run user management tests only
test-user:
	python3 -m pytest tests/test_user_management.py tests/test_admin_router.py -m user_management

# Run prompt management tests only
test-prompt:
	python3 -m pytest tests/test_prompt_manager.py tests/test_prompt_router.py -m prompt_management

# Run tests with coverage report
test-cov:
	python3 -m pytest tests/ --cov=app --cov-report=html --cov-report=term

# Fix formatting and check linting
lint-fix: format lint

# Run all checks including documentation
all-checks: format lint docs-check type-check test

# Check without fixing
check:
	python3 -m black --check app/ scripts/ tests/
	python3 -m isort --check-only app/ scripts/ tests/
	python3 -m flake8 app/ scripts/ tests/
	python3 -m pydocstyle app/ scripts/
	python3 -m mypy app/
