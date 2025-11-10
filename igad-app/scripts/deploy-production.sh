#!/bin/bash
set -e

echo "🚀 IGAD Innovation Hub - Production Environment Deployment"
echo "========================================================="

# Validate AWS profile
CURRENT_PROFILE=$(aws configure get profile 2>/dev/null || echo "default")
if [ "$CURRENT_PROFILE" != "IBD-DEV" ]; then
    echo "❌ ERROR: Must use IBD-DEV profile"
    echo "Run: aws configure set profile IBD-DEV"
    exit 1
fi

# Validate AWS region
CURRENT_REGION=$(aws configure get region 2>/dev/null || echo "")
if [ "$CURRENT_REGION" != "us-east-1" ]; then
    echo "❌ ERROR: Must deploy to us-east-1 region"
    echo "Run: aws configure set region us-east-1"
    exit 1
fi

echo "✅ AWS profile and region validated"
echo "   Profile: $CURRENT_PROFILE"
echo "   Region: $CURRENT_REGION"

# Production deployment confirmation
echo ""
echo "⚠️  PRODUCTION DEPLOYMENT WARNING ⚠️"
echo "This will deploy to the PRODUCTION environment."
echo "Ensure all testing has been completed."
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "✅ Production deployment confirmed"

# Copy source to dist
echo "📦 Copying source files to dist..."
cd backend && cp -r app/* dist/ && cd ..

# Build and deploy
echo "🔨 Building SAM application..."
sam build --use-container

echo "🚀 Deploying to production environment..."
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

echo "📤 CloudFront Distribution ID: $DISTRIBUTION_ID"

# Build and deploy frontend
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build

# Get S3 bucket name from stack outputs
echo "🔍 Getting S3 bucket name..."
cd ..
BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name igad-backend-production \
  --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucket`].OutputValue' \
  --output text)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ ERROR: Could not get S3 bucket name"
    exit 1
fi

echo "📤 S3 Bucket: $BUCKET_NAME"

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
echo "📋 Deployment Summary:"
echo "   Frontend: https://$(aws cloudformation describe-stacks --stack-name igad-backend-production --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' --output text | sed 's|https://||')"
echo "   API: $(aws cloudformation describe-stacks --stack-name igad-backend-production --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)"

echo ""
echo "✅ Production deployment completed successfully!"
echo "📋 Next steps:"
echo "   1. Verify deployment in AWS Console"
echo "   2. Run smoke tests on production endpoints"
echo "   3. Monitor CloudWatch metrics and logs"
echo "   4. Update DNS records if using custom domain"
