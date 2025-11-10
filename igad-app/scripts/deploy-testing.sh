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

# Build and deploy
echo "🔨 Building SAM application..."
sam build --use-container

echo "🚀 Deploying to testing environment..."
sam deploy

echo "✅ Deployment completed successfully!"
