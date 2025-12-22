#!/bin/bash
set -e

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Resolve commands to absolute paths
AWS="$(command -v aws)"
SAM="$(command -v sam)"
PIP3="$(command -v pip3)"

echo "🚀 IGAD Innovation Hub - Backend Only Deployment"
echo "===================================================="

# Set AWS profile
export AWS_PROFILE=IBD-DEV

# Validate AWS profile
CURRENT_REGION=$("$AWS" configure get region --profile IBD-DEV 2>/dev/null || echo "")

if [ "$CURRENT_REGION" != "us-east-1" ]; then
    echo "❌ ERROR: Must deploy to us-east-1 region"
    echo "Run: aws configure set region us-east-1 --profile IBD-DEV"
    exit 1
fi

echo "✅ AWS profile and region validated"

# Check project structure
if [ ! -f "$PROJECT_ROOT/backend/requirements.txt" ]; then
    echo "❌ ERROR: Must run from igad-app root directory"
    exit 1
fi

echo "✅ Project structure validated"

# Build Backend
echo "🔨 Building backend..."
rm -rf "$PROJECT_ROOT/backend/dist"
mkdir -p "$PROJECT_ROOT/backend/dist"
cp -r "$PROJECT_ROOT/backend/app" "$PROJECT_ROOT/backend/dist/"
cp "$PROJECT_ROOT/backend/requirements.txt" "$PROJECT_ROOT/backend/dist/"
cp "$PROJECT_ROOT/backend/bootstrap" "$PROJECT_ROOT/backend/dist/"
cp "$PROJECT_ROOT/backend/.env" "$PROJECT_ROOT/backend/dist/"
"$PIP3" install -r "$PROJECT_ROOT/backend/requirements.txt" -t "$PROJECT_ROOT/backend/dist/"

# Deploy using SAM
echo "🚀 Deploying backend..."
"$SAM" build --use-container
"$SAM" deploy --stack-name igad-backend-testing --profile IBD-DEV --region us-east-1

echo ""
echo "✅ Backend deployment completed!"
echo "📋 You can now test the proposals API"
