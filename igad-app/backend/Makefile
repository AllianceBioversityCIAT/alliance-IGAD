.PHONY: lint format type-check lint-fix all-checks

# Format code with black and isort
format:
	python3 -m black app/ scripts/ tests/
	python3 -m isort app/ scripts/ tests/

# Check code style with flake8
lint:
	python3 -m flake8 app/ scripts/ tests/

# Type checking with mypy
type-check:
	python3 -m mypy app/

# Fix formatting and check linting
lint-fix: format lint

# Run all checks
all-checks: format lint type-check

# Check without fixing
check:
	python3 -m black --check app/ scripts/ tests/
	python3 -m isort --check-only app/ scripts/ tests/
	python3 -m flake8 app/ scripts/ tests/
	python3 -m mypy app/
