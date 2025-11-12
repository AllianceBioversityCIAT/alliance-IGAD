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
sam build --use-container
sam deploy --stack-name igad-backend-testing

# Get CloudFront distribution ID dynamically (find distribution serving the S3 bucket)
echo "🔍 Finding CloudFront distribution for S3 bucket..."
DISTRIBUTION_ID=""
for dist_id in $(aws cloudfront list-distributions --profile IBD-DEV --region us-east-1 --query "DistributionList.Items[].Id" --output text); do
  origin=$(aws cloudfront get-distribution --id $dist_id --profile IBD-DEV --region us-east-1 --query "Distribution.DistributionConfig.Origins.Items[0].DomainName" --output text 2>/dev/null)
  if [[ $origin == *"$BUCKET_NAME"* ]]; then
    DISTRIBUTION_ID=$dist_id
    break
  fi
done

if [ -z "$DISTRIBUTION_ID" ]; then
    echo "❌ ERROR: Could not find CloudFront distribution for bucket $BUCKET_NAME"
    exit 1
fi

# Get S3 bucket name dynamically (find bucket with igad-testing pattern)
echo "🔍 Finding S3 bucket for testing environment..."
BUCKET_NAME=$(aws s3 ls --profile IBD-DEV --region us-east-1 | grep "igad.*testing.*websitebucket" | awk '{print $3}' | head -1)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ ERROR: Could not find S3 bucket for testing environment"
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
echo "🎉 Fullstack testing deployment completed successfully!"

echo ""
echo "✅ Testing deployment completed!"
echo "📋 Resources:"
echo "   - Frontend: CloudFront Distribution"
echo "   - Backend: Lambda + API Gateway"
echo "   - Database: DynamoDB (igad-testing-main-table)"
echo "   - Auth: Cognito (us-east-1_EULeelICj)"
