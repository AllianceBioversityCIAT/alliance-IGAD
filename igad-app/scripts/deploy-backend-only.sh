#!/bin/bash
set -e

echo "🚀 IGAD Innovation Hub - Backend Only Deployment"
echo "===================================================="

# Set AWS profile
export AWS_PROFILE=IBD-DEV

# Validate AWS profile
CURRENT_REGION=$(aws configure get region --profile IBD-DEV 2>/dev/null || echo "")

if [ "$CURRENT_REGION" != "us-east-1" ]; then
    echo "❌ ERROR: Must deploy to us-east-1 region"
    echo "Run: aws configure set region us-east-1 --profile IBD-DEV"
    exit 1
fi

echo "✅ AWS profile and region validated"

# Check project structure
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ ERROR: Must run from igad-app root directory"
    exit 1
fi

echo "✅ Project structure validated"

# Build Backend
echo "🔨 Building backend..."
cd backend
rm -rf dist
mkdir -p dist
cp -r app dist/
cp requirements.txt dist/
cp bootstrap dist/
cp .env dist/
pip3 install -r requirements.txt -t dist/
cd ..

# Deploy using SAM
echo "🚀 Deploying backend..."
sam build --use-container
sam deploy --stack-name igad-backend-testing --profile IBD-DEV --region us-east-1

echo ""
echo "✅ Backend deployment completed!"
echo "📋 You can now test the proposals API"
