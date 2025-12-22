#!/bin/bash
set -e

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Resolve commands to absolute paths
AWS="$(command -v aws)"
SAM="$(command -v sam)"
NPM="$(command -v npm)"

echo "🚀 IGAD Innovation Hub - Production Environment Deployment"
echo "========================================================="

# Validate AWS profile
CURRENT_PROFILE=$("$AWS" configure get profile 2>/dev/null || echo "default")
if [ "$CURRENT_PROFILE" != "IBD-DEV" ]; then
    echo "❌ ERROR: Must use IBD-DEV profile"
    echo "Run: aws configure set profile IBD-DEV"
    exit 1
fi

# Validate AWS region
CURRENT_REGION=$("$AWS" configure get region 2>/dev/null || echo "")
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
cp -r "$PROJECT_ROOT/backend/app/"* "$PROJECT_ROOT/backend/dist/"

# Build and deploy
echo "🔨 Building SAM application..."
"$SAM" build --use-container

echo "🚀 Deploying to production environment..."
"$SAM" deploy --config-env production

# Get CloudFront distribution ID from stack outputs
echo "🔍 Getting CloudFront distribution ID..."
DISTRIBUTION_ID=$("$AWS" cloudformation describe-stacks \
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
"$NPM" --prefix "$PROJECT_ROOT/frontend" install
"$NPM" --prefix "$PROJECT_ROOT/frontend" run build

# Get S3 bucket name from stack outputs
echo "🔍 Getting S3 bucket name..."
BUCKET_NAME=$("$AWS" cloudformation describe-stacks \
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
"$AWS" s3 sync "$PROJECT_ROOT/frontend/dist/" "s3://$BUCKET_NAME" --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$("$AWS" cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ CloudFront invalidation created: $INVALIDATION_ID"
echo "🎉 Production deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   Frontend: https://$("$AWS" cloudformation describe-stacks --stack-name igad-backend-production --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontURL`].OutputValue' --output text | sed 's|https://||')"
echo "   API: $("$AWS" cloudformation describe-stacks --stack-name igad-backend-production --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)"

echo ""
echo "✅ Production deployment completed successfully!"
echo "📋 Next steps:"
echo "   1. Verify deployment in AWS Console"
echo "   2. Run smoke tests on production endpoints"
echo "   3. Monitor CloudWatch metrics and logs"
echo "   4. Update DNS records if using custom domain"
