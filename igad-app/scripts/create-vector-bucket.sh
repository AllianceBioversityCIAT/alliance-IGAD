#!/bin/bash

# Create S3 Express One Zone bucket for vector storage
# Note: S3 Express One Zone is currently in preview and may not be available in all regions

REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile IBD-DEV)

# For now, we'll use a standard S3 bucket and implement custom vectorization
# When S3 Express One Zone with vector metadata becomes GA, we can migrate

BUCKET_NAME="igad-proposal-vectors-${ACCOUNT_ID}"

echo "Creating S3 bucket for proposal vectors..."

aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $REGION \
    --profile IBD-DEV

echo "✅ Vector storage bucket created: $BUCKET_NAME"

# Enable versioning
aws s3api put-bucket-versioning \
    --bucket $BUCKET_NAME \
    --versioning-configuration Status=Enabled \
    --profile IBD-DEV

echo "✅ Versioning enabled"

# Add CORS configuration
cat > /tmp/cors-config.json << 'CORSJSON'
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"]
        }
    ]
}
CORSJSON

aws s3api put-bucket-cors \
    --bucket $BUCKET_NAME \
    --cors-configuration file:///tmp/cors-config.json \
    --profile IBD-DEV

echo "✅ CORS configured"
echo ""
echo "Bucket created: $BUCKET_NAME"
echo "Add this to your environment variables:"
echo "VECTOR_BUCKET=$BUCKET_NAME"
