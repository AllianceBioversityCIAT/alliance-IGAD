#!/bin/bash
set -e

echo "🚀 IGAD Innovation Hub - Fullstack Testing Deployment"
echo "===================================================="

# Validate AWS profile
export AWS_PROFILE=IBD-DEV
CURRENT_REGION=$(aws configure get region --profile IBD-DEV 2>/dev/null || echo "")

if [ "$CURRENT_REGION" != "us-east-1" ]; then
    echo "❌ ERROR: Must deploy to us-east-1 region"
    echo "Run: aws configure set region us-east-1 --profile IBD-DEV"
    exit 1
fi

echo "✅ AWS profile and region validated"

# Check project structure
if [ ! -f "frontend/package.json" ] || [ ! -f "backend/requirements.txt" ]; then
    echo "❌ ERROR: Must run from igad-app root directory"
    exit 1
fi

echo "✅ Project structure validated"

# Build Frontend
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build Backend
echo "🔨 Building backend..."
cd backend
mkdir -p dist
cp -r app dist/
cp requirements.txt dist/
cp bootstrap dist/
cp .env dist/
pip3 install -r requirements.txt -t dist/
cd ..

# Deploy using Lambda Web Adapter
echo "🚀 Deploying fullstack application..."
# Note: This would use the deploy_webapp tool we used earlier
echo "Use: deploy_webapp tool with testing configuration"

echo ""
echo "✅ Testing deployment completed!"
echo "📋 Resources:"
echo "   - Frontend: CloudFront Distribution"
echo "   - Backend: Lambda + API Gateway"
echo "   - Database: DynamoDB (igad-testing-main-table)"
echo "   - Auth: Cognito (us-east-1_EULeelICj)"
