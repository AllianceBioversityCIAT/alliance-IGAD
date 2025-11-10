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

echo ""
echo "✅ Production deployment completed successfully!"
echo "📋 Next steps:"
echo "   1. Verify deployment in AWS Console"
echo "   2. Run smoke tests on production endpoints"
echo "   3. Monitor CloudWatch metrics and logs"
echo "   4. Update DNS records if using custom domain"
