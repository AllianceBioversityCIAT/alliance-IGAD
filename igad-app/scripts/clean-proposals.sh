#!/bin/bash
set -e

echo "🧹 Cleaning Proposal Data from DynamoDB"
echo "========================================"

# Set AWS profile
export AWS_PROFILE=IBD-DEV
REGION="us-east-1"
TABLE_NAME="igad-testing-main-table"
PROFILE="$AWS_PROFILE"

echo "📋 Table: $TABLE_NAME"
echo "🌍 Region: $REGION"
echo ""

# Scan for all proposals
echo "🔍 Scanning for proposals..."
PROPOSALS=$(aws dynamodb scan \
  --table-name $TABLE_NAME \
  --filter-expression "begins_with(PK, :pk)" \
  --expression-attribute-values '{":pk":{"S":"PROPOSAL#"}}' \
  --profile $PROFILE \
  --region $REGION \
  --output json)

# Count proposals
COUNT=$(echo $PROPOSALS | jq '.Items | length')

if [ "$COUNT" -eq 0 ]; then
  echo "✅ No proposals found. Table is clean."
  exit 0
fi

echo "📊 Found $COUNT proposal(s) to delete"
echo ""

# Confirm deletion
read -p "⚠️  Are you sure you want to delete ALL proposals? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Deletion cancelled"
  exit 0
fi

echo ""
echo "🗑️  Deleting proposals..."

# Extract and delete each proposal
echo $PROPOSALS | jq -c '.Items[]' | while read item; do
  PK=$(echo $item | jq -r '.PK.S')
  SK=$(echo $item | jq -r '.SK.S')
  PROPOSAL_CODE=$(echo $item | jq -r '.proposalCode.S // "unknown"')
  
  echo "   Deleting: $PROPOSAL_CODE ($PK)"
  
  aws dynamodb delete-item \
    --table-name $TABLE_NAME \
    --key "{\"PK\":{\"S\":\"$PK\"},\"SK\":{\"S\":\"$SK\"}}" \
    --profile $PROFILE \
    --region $REGION
done

echo ""
echo "✅ All proposals deleted successfully!"
echo ""
echo "🔍 Verifying cleanup..."

# Verify
REMAINING=$(aws dynamodb scan \
  --table-name $TABLE_NAME \
  --filter-expression "begins_with(PK, :pk)" \
  --expression-attribute-values '{":pk":{"S":"PROPOSAL#"}}' \
  --profile $PROFILE \
  --region $REGION \
  --query 'Count' \
  --output text)

echo "📊 Remaining proposals: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
  echo "✅ Cleanup complete! No proposals remaining."
else
  echo "⚠️  Warning: $REMAINING proposals still exist"
fi
