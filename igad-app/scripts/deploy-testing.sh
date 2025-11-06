#!/bin/bash
set -e

echo "🚀 IGAD Innovation Hub - Testing Environment Deployment"
echo "======================================================"

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

# Check if we're in the right directory (igad-app root)
if [ ! -f "infrastructure/package.json" ]; then
    echo "❌ ERROR: Must run from igad-app root directory"
    echo "Current directory: $(pwd)"
    echo "Expected: /path/to/igad-app/"
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
npx cdk bootstrap --context environment=testing

# Deploy infrastructure
echo "🚀 Deploying to Testing environment..."
npx cdk deploy --context environment=testing --require-approval never

echo ""
echo "✅ Testing deployment completed successfully!"
echo "📋 Next steps:"
echo "   1. Verify deployment in AWS Console"
echo "   2. Test Cognito User Pool functionality"
echo "   3. Validate API Gateway endpoints"
echo "   4. Check CloudWatch logs"
