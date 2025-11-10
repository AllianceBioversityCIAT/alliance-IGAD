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
sam build --use-container
sam deploy --config-env production

# Get CloudFront distribution ID from stack outputs
echo "🔍 Getting CloudFront distribution ID..."
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name igad-backend-production \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

if [ -z "$DISTRIBUTION_ID" ]; then
    echo "❌ ERROR: Could not get CloudFront distribution ID"
    exit 1
fi

# Get S3 bucket name from stack outputs
echo "🔍 Getting S3 bucket name..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name igad-backend-production \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucket`].OutputValue' \
  --output text)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ ERROR: Could not get S3 bucket name"
    exit 1
fi

# Upload frontend to S3
echo "📤 Uploading frontend to S3..."
aws s3 sync frontend/dist/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ CloudFront invalidation created: $INVALIDATION_ID"
echo "🎉 Production deployment completed successfully!"

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
