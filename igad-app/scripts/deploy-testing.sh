#!/bin/bash
set -e

# Validate AWS profile
if [ "$(aws configure get profile)" != "IBD-DEV" ]; then
    echo "❌ ERROR: Must use IBD-DEV profile"
    echo "Run: aws configure set profile IBD-DEV"
    exit 1
fi

# Validate AWS region
if [ "$(aws configure get region)" != "us-east-1" ]; then
    echo "❌ ERROR: Must deploy to us-east-1 region"
    echo "Run: aws configure set region us-east-1"
    exit 1
fi

echo "✅ AWS profile and region validated"

# Copy source to dist
echo "📦 Copying source files to dist..."
cd backend && cp -r app/* dist/

# Build and deploy backend
echo "🔨 Building SAM application..."
cd ..
sam build --use-container

echo "🚀 Deploying backend to testing environment..."
sam deploy

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

echo "📤 CloudFront Distribution ID: $DISTRIBUTION_ID"

# Build and deploy frontend
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build

# Get S3 bucket name dynamically (find bucket with igad-testing pattern)
echo "🔍 Finding S3 bucket for testing environment..."
BUCKET_NAME=$(aws s3 ls --profile IBD-DEV --region us-east-1 | grep "igad.*testing.*websitebucket" | awk '{print $3}' | head -1)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ ERROR: Could not find S3 bucket for testing environment"
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
echo "🎉 Testing deployment completed successfully!"
echo ""
# Get frontend URL dynamically
FRONTEND_URL=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --profile IBD-DEV --region us-east-1 --query "Distribution.DomainName" --output text)

echo "📋 Deployment Summary:"
echo "   Frontend: https://$FRONTEND_URL"
echo "   API: $(aws cloudformation describe-stacks --stack-name igad-testing-stack --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)"

echo "✅ Deployment completed successfully!"
