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

# Check if we're in the right directory
if [ ! -f "infrastructure/package.json" ]; then
    echo "❌ ERROR: Must run from project root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "✅ Project directory validated"

# Install dependencies if needed
cd infrastructure
if [ ! -d "node_modules" ]; then
    echo "📦 Installing CDK dependencies..."
    npm install
fi

# Bootstrap CDK if needed
echo "🔧 Bootstrapping CDK..."
npx cdk bootstrap --context environment=production

# Deploy infrastructure
echo "🚀 Deploying to Production environment..."
npx cdk deploy --context environment=production --require-approval never

echo ""
echo "✅ Production deployment completed successfully!"
echo "📋 Next steps:"
echo "   1. Verify deployment in AWS Console"
echo "   2. Run smoke tests on production endpoints"
echo "   3. Monitor CloudWatch metrics and logs"
echo "   4. Update DNS records if using custom domain"
