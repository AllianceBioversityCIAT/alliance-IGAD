#!/bin/bash
set -e

echo "🚀 IGAD Innovation Hub - Fullstack Production Deployment"
echo "======================================================="

# Validate AWS profile
export AWS_PROFILE=IBD-DEV
CURRENT_REGION=$(aws configure get region --profile IBD-DEV 2>/dev/null || echo "")

if [ "$CURRENT_REGION" != "us-east-1" ]; then
    echo "❌ ERROR: Must deploy to us-east-1 region"
    echo "Run: aws configure set region us-east-1 --profile IBD-DEV"
    exit 1
fi

echo "✅ AWS profile and region validated"

# Production confirmation
echo ""
echo "⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️"
echo "This will deploy to PRODUCTION environment."
echo "Ensure all testing has been completed."
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Check project structure
if [ ! -f "frontend/package.json" ] || [ ! -f "backend/requirements.txt" ]; then
    echo "❌ ERROR: Must run from igad-app root directory"
    exit 1
fi

echo "✅ Project structure validated"

# Run tests first
echo "🧪 Running tests..."
cd backend
if command -v python3 &> /dev/null; then
    python3 -m pytest tests/ -v --tb=short || {
        echo "❌ Tests failed! Aborting production deployment."
        exit 1
    }
fi
cd ..

# Build Frontend (production mode)
echo "🔨 Building frontend for production..."
cd frontend
npm install
npm run build
cd ..

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

# Deploy using Lambda Web Adapter
echo "🚀 Deploying to production..."
echo "Project: igad-innovation-hub-prod"
echo "Environment: production"
echo ""
echo "Use deploy_webapp tool with production configuration:"
echo "- project_name: igad-innovation-hub-prod"
echo "- environment variables for production"
echo "- higher memory/timeout settings"

echo ""
echo "✅ Production deployment ready!"
echo "📋 Production Resources:"
echo "   - Frontend: CloudFront Distribution"
echo "   - Backend: Lambda + API Gateway"
echo "   - Database: DynamoDB (production table)"
echo "   - Auth: Cognito (production pool)"
echo ""
echo "🔍 Post-deployment checklist:"
echo "   □ Verify all endpoints respond"
echo "   □ Test authentication flow"
echo "   □ Check CloudWatch logs"
echo "   □ Monitor error rates"
echo "   □ Update DNS if using custom domain"
