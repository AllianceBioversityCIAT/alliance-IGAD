#!/bin/bash

# Script to start the server with Python 3.11 environment
# This ensures no Boto3 deprecation warnings

cd "$(dirname "$0")"

# Activate virtual environment with Python 3.11
source venv/bin/activate

# Verify Python version
echo "Using Python: $(python --version)"
echo "Starting server..."

# Start uvicorn server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
