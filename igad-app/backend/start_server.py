#!/usr/bin/env python3
import uvicorn
import sys
import os

# Add paths
sys.path.append('.')
sys.path.append('../src')

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
