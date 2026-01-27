#!/bin/bash

# Security Fixes - Dependency Installation Script
# This script installs updated dependencies after security vulnerability fixes

set -e  # Exit on error

echo "=========================================="
echo "Installing Updated Dependencies"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Backend - Update uvicorn (fixes h11 critical vulnerability)
echo -e "${BLUE}[1/3] Backend - Installing updated dependencies...${NC}"
cd igad-app/backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install/upgrade requirements
echo "Installing requirements..."
pip install -r requirements.txt --upgrade

# Verify h11 version
echo ""
echo "Verifying h11 version (should be >= 0.16.0):"
pip show h11 | grep Version || echo "h11 not found (may be transitive dependency)"

# Verify uvicorn version
echo ""
echo "Verifying uvicorn version:"
pip show uvicorn | grep Version

echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# 2. Infrastructure - Update AWS CDK (fixes 3 vulnerabilities)
echo -e "${BLUE}[2/3] Infrastructure - Installing updated dependencies...${NC}"
cd ../infrastructure

# Install dependencies
npm install

# Verify aws-cdk-lib version
echo ""
echo "Verifying aws-cdk-lib version (should be 2.187.0):"
npm list aws-cdk-lib

# Try to build TypeScript
echo ""
echo "Building TypeScript..."
npm run build || echo -e "${YELLOW}⚠ Build failed (may need AWS credentials)${NC}"

echo -e "${GREEN}✓ Infrastructure dependencies installed${NC}"
echo ""

# 3. Frontend - Migrate to @tanstack/react-query (fixes inflight vulnerability)
echo -e "${BLUE}[3/3] Frontend - Installing updated dependencies...${NC}"
cd ../frontend

# Install dependencies
npm install

# Verify @tanstack/react-query version
echo ""
echo "Verifying @tanstack/react-query version (should be ^5.0.0):"
npm list @tanstack/react-query

# Verify react-query is removed
echo ""
echo "Verifying react-query is removed:"
if npm list react-query 2>&1 | grep -q "react-query@"; then
    echo -e "${YELLOW}⚠ react-query still present (should be removed)${NC}"
else
    echo -e "${GREEN}✓ react-query removed${NC}"
fi

# Try to build
echo ""
echo "Building frontend..."
npm run build || echo -e "${YELLOW}⚠ Build failed (check for TypeScript errors)${NC}"

echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}All dependencies installed successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run tests:"
echo "   - Backend: cd igad-app/backend && pytest"
echo "   - Frontend: cd igad-app/frontend && npm test"
echo "   - Infrastructure: cd igad-app/infrastructure && npm test"
echo ""
echo "2. Verify security fixes with Snyk:"
echo "   - Backend: cd igad-app/backend && snyk test --file=requirements.txt"
echo "   - Frontend: cd igad-app/frontend && snyk test"
echo "   - Infrastructure: cd igad-app/infrastructure && snyk test"
echo ""
