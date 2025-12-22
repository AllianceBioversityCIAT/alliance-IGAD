#!/bin/bash
set -e

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve commands to absolute paths
PIP="$(command -v pip)"
PYTHON="$(command -v python)"

# Install dependencies
echo "Installing Python dependencies..."
"$PIP" install -r "$SCRIPT_DIR/requirements.txt"

# Run the FastAPI server
echo "Starting IGAD Proposal Writer API server..."
"$PYTHON" "$SCRIPT_DIR/main.py"
