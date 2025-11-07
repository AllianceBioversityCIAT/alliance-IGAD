#!/bin/bash

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Run the FastAPI server
echo "Starting IGAD Proposal Writer API server..."
python main.py
