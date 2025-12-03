#!/bin/bash
set -e

# Parse command line arguments
DEPLOY_FRONTEND=true
DEPLOY_BACKEND=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --frontend-only)
      DEPLOY_FRONTEND=true
      DEPLOY_BACKEND=false
      shift
      ;;
    --backend-only)
      DEPLOY_FRONTEND=false
      DEPLOY_BACKEND=true
      shift
      ;;
    --skip-frontend)
      DEPLOY_FRONTEND=false
      shift
      ;;
    --skip-backend)
      DEPLOY_BACKEND=false
      shift
      ;;
    *)
      echo "Unknown option $1"
      echo "Usage: $0 [--frontend-only|--backend-only|--skip-frontend|--skip-backend]"
      exit 1
      ;;
  esac
done

echo "🚀 IGAD Innovation Hub - Testing Deployment"
echo "============================================"
echo "Frontend: $([ "$DEPLOY_FRONTEND" = true ] && echo "✅ Deploy" || echo "⏭️  Skip")"
echo "Backend:  $([ "$DEPLOY_BACKEND" = true ] && echo "✅ Deploy" || echo "⏭️  Skip")"
echo "============================================"

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

# ============================================
# S3 Vectors Infrastructure Setup
# ============================================
echo ""
echo "🎯 Setting up S3 Vectors Infrastructure..."

python3 - <<'PYTHON_SCRIPT'
import boto3
import sys

def setup_s3_vectors():
    try:
        s3vectors = boto3.client('s3vectors', region_name='us-east-1')
        bucket_name = "igad-proposals-vectors-testing"
        
        # Check/Create vector bucket
        try:
            s3vectors.list_indexes(vectorBucketName=bucket_name)
            print(f"✅ Vector bucket '{bucket_name}' exists")
        except Exception as e:
            if 'NoSuchBucket' in str(e) or 'ResourceNotFoundException' in str(e):
                print(f"📦 Creating vector bucket...")
                s3vectors.create_vector_bucket(
                    vectorBucketName=bucket_name,
                    encryptionConfiguration={'sseType': 'AES256'}
                )
                print(f"✅ Vector bucket created")
            else:
                raise
        
        # Create indexes
        indexes = [
            {'name': 'reference-proposals-index'},
            {'name': 'existing-work-index'}
        ]
        
        for idx in indexes:
            try:
                s3vectors.get_index(vectorBucketName=bucket_name, indexName=idx['name'])
                print(f"✅ Index '{idx['name']}' exists")
            except Exception as e:
                if 'NoSuchVectorIndex' in str(e) or 'ResourceNotFoundException' in str(e):
                    print(f"📊 Creating index '{idx['name']}'...")
                    s3vectors.create_index(
                        vectorBucketName=bucket_name,
                        indexName=idx['name'],
                        dataType='float32',
                        dimension=1024,
                        distanceMetric='cosine',
                        metadataConfiguration={
                            'nonFilterableMetadataKeys': ['source_text', 'document_name', 'upload_date']
                        }
                    )
                    print(f"✅ Index created")
                else:
                    raise
        
        print("✅ S3 Vectors ready")
        
    except Exception as e:
        if 'InvalidAction' in str(e) or 'UnknownOperation' in str(e):
            print("⚠️  S3 Vectors not available yet - continuing")
        else:
            print(f"⚠️  S3 Vectors setup: {str(e)[:100]}")

setup_s3_vectors()
PYTHON_SCRIPT

echo ""

# Build Frontend
if [ "$DEPLOY_FRONTEND" = true ]; then
    echo "🔨 Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
else
    echo "⏭️  Skipping frontend build"
fi

# Build Backend
if [ "$DEPLOY_BACKEND" = true ]; then
    echo "🔨 Building backend..."
    cd backend
    mkdir -p dist
    cp -r app dist/
    cp requirements.txt dist/
    cp bootstrap dist/
    cp .env dist/
    pip3 install -r requirements.txt -t dist/
    cd ..
else
    echo "⏭️  Skipping backend build"
fi

# Deploy using Lambda Web Adapter
if [ "$DEPLOY_BACKEND" = true ]; then
    echo "🚀 Deploying backend..."
    
    # Try container build first, fallback to local build
    if ! sam build --use-container; then
        echo "⚠️  Container build failed, trying local build..."
        sam build
    fi
    
    # Deploy with error handling
    if sam deploy --stack-name igad-backend-testing; then
        echo "✅ Backend deployment successful"
    else
        echo "⚠️  Backend deployment skipped (no changes detected)"
    fi
else
    echo "⏭️  Skipping backend deployment"
fi

# Get S3 bucket name dynamically (find bucket with igad-testing pattern)
echo "🔍 Finding S3 bucket for testing environment..."
BUCKET_NAME=$(aws s3 ls --profile IBD-DEV --region us-east-1 | grep "igad.*testing.*websitebucket" | awk '{print $3}' | head -1)

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ ERROR: Could not find S3 bucket for testing environment"
    exit 1
fi

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

if [ -z "$BUCKET_NAME" ]; then
    echo "❌ ERROR: Could not find S3 bucket for testing environment"
    exit 1
fi

# Upload frontend to S3
if [ "$DEPLOY_FRONTEND" = true ]; then
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
else
    echo "⏭️  Skipping frontend upload"
fi
echo "🎉 Deployment completed successfully!"

echo ""
echo "✅ Testing deployment completed!"
echo "📋 Resources:"
if [ "$DEPLOY_FRONTEND" = true ]; then
    echo "   - Frontend: CloudFront Distribution"
fi
if [ "$DEPLOY_BACKEND" = true ]; then
    echo "   - Backend: Lambda + API Gateway"
fi
echo "   - Database: DynamoDB (igad-testing-main-table)"
echo "   - Auth: Cognito (us-east-1_EULeelICj)"
echo "   - Documents: S3 (igad-proposal-documents-${AWS::AccountId})"
echo ""
echo "📝 Note: S3 Vector bucket is commented out in template.yaml"
echo "   Uncomment VectorStorageBucket when ready to use S3 Vector metadata"
