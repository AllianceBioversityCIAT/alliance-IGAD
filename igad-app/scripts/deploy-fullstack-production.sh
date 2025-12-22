#!/bin/bash
set -e

# Get absolute paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Resolve commands to absolute paths
AWS="$(command -v aws)"
SAM="$(command -v sam)"
NPM="$(command -v npm)"
PIP3="$(command -v pip3)"
PYTHON3="$(command -v python3)"
PYTEST="$(command -v pytest || echo "")"

echo "🚀 IGAD Innovation Hub - Fullstack Production Deployment"
echo "======================================================="

# Validate AWS profile
export AWS_PROFILE=IBD-DEV
CURRENT_REGION=$("$AWS" configure get region --profile IBD-DEV 2>/dev/null || echo "")

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
if [ ! -f "$PROJECT_ROOT/frontend/package.json" ] || [ ! -f "$PROJECT_ROOT/backend/requirements.txt" ]; then
    echo "❌ ERROR: Must run from igad-app root directory"
    exit 1
fi

echo "✅ Project structure validated"

# Run tests first
echo "🧪 Running tests..."
if [ -n "$PYTEST" ]; then
    "$PYTHON3" -m pytest "$PROJECT_ROOT/backend/tests/" -v --tb=short || {
        echo "❌ Tests failed! Aborting production deployment."
        exit 1
    }
fi

# Build Frontend (production mode)
echo "🔨 Building frontend for production..."
"$NPM" --prefix "$PROJECT_ROOT/frontend" install
"$NPM" --prefix "$PROJECT_ROOT/frontend" run build

# Build Backend
echo "🔨 Building backend..."
rm -rf "$PROJECT_ROOT/backend/dist"
mkdir -p "$PROJECT_ROOT/backend/dist"
cp -r "$PROJECT_ROOT/backend/app" "$PROJECT_ROOT/backend/dist/"
cp "$PROJECT_ROOT/backend/requirements.txt" "$PROJECT_ROOT/backend/dist/"
cp "$PROJECT_ROOT/backend/bootstrap" "$PROJECT_ROOT/backend/dist/"
cp "$PROJECT_ROOT/backend/.env" "$PROJECT_ROOT/backend/dist/"
"$PIP3" install -r "$PROJECT_ROOT/backend/requirements.txt" -t "$PROJECT_ROOT/backend/dist/"

# Deploy using Lambda Web Adapter
echo "🚀 Deploying to production..."
"$SAM" build --use-container
"$SAM" deploy --config-env production

# Get S3 bucket name dynamically (find bucket with igad-production pattern)
echo "🔍 Finding S3 bucket for production environment..."
BUCKET_NAME=$("$AWS" s3 ls --profile IBD-DEV --region us-east-1 | grep "igad.*production.*websitebucket" | awk '{print $3}' | head -1)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ ERROR: Could not find S3 bucket for production environment"
    exit 1
fi

# Get CloudFront distribution ID dynamically (find distribution serving the S3 bucket)
echo "🔍 Finding CloudFront distribution for S3 bucket..."
DISTRIBUTION_ID=""
for dist_id in $("$AWS" cloudfront list-distributions --profile IBD-DEV --region us-east-1 --query "DistributionList.Items[].Id" --output text); do
  origin=$("$AWS" cloudfront get-distribution --id $dist_id --profile IBD-DEV --region us-east-1 --query "Distribution.DistributionConfig.Origins.Items[0].DomainName" --output text 2>/dev/null)
  if [[ $origin == *"$BUCKET_NAME"* ]]; then
    DISTRIBUTION_ID=$dist_id
    break
  fi
done

if [ -z "$DISTRIBUTION_ID" ]; then
    echo "❌ ERROR: Could not find CloudFront distribution for bucket $BUCKET_NAME"
    exit 1
fi

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
