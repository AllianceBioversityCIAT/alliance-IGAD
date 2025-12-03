# KIRO - S3 Vectors Infrastructure Brief

## 🎯 Objective
Set up AWS S3 Vectors infrastructure for IGAD Proposal Writer to enable semantic search on reference proposals and organizational work experience.

---

## 📋 Quick Summary

**What we need:**
- 1 Vector Bucket in us-east-1
- 2 Vector Indexes (reference-proposals, existing-work)
- IAM permissions for Lambda to access vectors + Bedrock
- Update deployment script

**Profile:** IBD-DEV
**Region:** us-east-1
**Environment:** Testing

---

## 🏗️ Infrastructure Requirements

### 1. Create Vector Bucket

```bash
aws s3vectors create-bucket \
  --bucket-name igad-proposals-vectors-testing \
  --region us-east-1 \
  --profile IBD-DEV
```

**Notes:**
- Vector buckets are region-specific
- Can't change configuration after creation
- Different from regular S3 buckets

---

### 2. Create Vector Indexes

#### Index 1: Reference Proposals

```bash
aws s3vectors create-index \
  --bucket-name igad-proposals-vectors-testing \
  --index-name reference-proposals-index \
  --dimension 1024 \
  --distance-metric cosine \
  --region us-east-1 \
  --profile IBD-DEV
```

**Metadata Configuration:**
```json
{
  "filterable_metadata": [
    "proposal_id",
    "donor",
    "sector",
    "year",
    "status"
  ],
  "non_filterable_metadata": [
    "source_text",
    "document_name",
    "upload_date"
  ]
}
```

#### Index 2: Existing Work

```bash
aws s3vectors create-index \
  --bucket-name igad-proposals-vectors-testing \
  --index-name existing-work-index \
  --dimension 1024 \
  --distance-metric cosine \
  --region us-east-1 \
  --profile IBD-DEV
```

**Metadata Configuration:**
```json
{
  "filterable_metadata": [
    "proposal_id",
    "organization",
    "project_type",
    "region"
  ],
  "non_filterable_metadata": [
    "source_text",
    "document_name",
    "upload_date"
  ]
}
```

**Why these settings:**
- **Dimension 1024**: Amazon Bedrock Titan Text Embeddings v2 output size
- **Distance metric cosine**: Best for semantic similarity (vs euclidean)
- **Filterable metadata**: Allows filtering by donor, sector, etc. during queries
- **Non-filterable metadata**: Stored but not searchable (for display only)

---

### 3. IAM Permissions

The Lambda function (`igad-backend-testing`) needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3VectorsAccess",
      "Effect": "Allow",
      "Action": [
        "s3vectors:PutVectors",
        "s3vectors:QueryVectors",
        "s3vectors:GetVectors",
        "s3vectors:DeleteVectors",
        "s3vectors:ListVectors"
      ],
      "Resource": [
        "arn:aws:s3vectors:us-east-1:*:bucket/igad-proposals-vectors-testing",
        "arn:aws:s3vectors:us-east-1:*:bucket/igad-proposals-vectors-testing/*"
      ]
    },
    {
      "Sid": "BedrockEmbeddings",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
      ]
    }
  ]
}
```

**Attach to:** Lambda execution role for `igad-backend-testing`

---

### 4. Update Deployment Script

**File:** `igad-app/scripts/deploy-fullstack-testing.sh`

Add this section after line 51 (after AWS profile validation):

```bash
# ============================================
# S3 Vectors Infrastructure Setup
# ============================================
echo ""
echo "🎯 Checking S3 Vectors Infrastructure..."

# Check if vector bucket exists
if ! aws s3vectors list-buckets --region us-east-1 --profile IBD-DEV 2>/dev/null | grep -q "igad-proposals-vectors-testing"; then
    echo "📦 Creating S3 Vector Bucket..."
    aws s3vectors create-bucket \
        --bucket-name igad-proposals-vectors-testing \
        --region us-east-1 \
        --profile IBD-DEV
    echo "✅ Vector bucket created"
else
    echo "✅ Vector bucket already exists"
fi

# Check if reference-proposals index exists
if ! aws s3vectors list-indexes \
    --bucket-name igad-proposals-vectors-testing \
    --region us-east-1 \
    --profile IBD-DEV 2>/dev/null | grep -q "reference-proposals-index"; then
    echo "📊 Creating reference-proposals index..."
    aws s3vectors create-index \
        --bucket-name igad-proposals-vectors-testing \
        --index-name reference-proposals-index \
        --dimension 1024 \
        --distance-metric cosine \
        --region us-east-1 \
        --profile IBD-DEV
    echo "✅ Reference proposals index created"
else
    echo "✅ Reference proposals index already exists"
fi

# Check if existing-work index exists
if ! aws s3vectors list-indexes \
    --bucket-name igad-proposals-vectors-testing \
    --region us-east-1 \
    --profile IBD-DEV 2>/dev/null | grep -q "existing-work-index"; then
    echo "📊 Creating existing-work index..."
    aws s3vectors create-index \
        --bucket-name igad-proposals-vectors-testing \
        --index-name existing-work-index \
        --dimension 1024 \
        --distance-metric cosine \
        --region us-east-1 \
        --profile IBD-DEV
    echo "✅ Existing work index created"
else
    echo "✅ Existing work index already exists"
fi

echo "✅ S3 Vectors infrastructure ready"
echo ""
```

---

## 🔧 Alternative: CloudFormation/SAM Template

If you prefer Infrastructure as Code, here's a SAM template snippet:

```yaml
# Add to template.yaml
Resources:
  # Note: S3 Vectors doesn't have native CloudFormation support yet
  # Need to use Custom Resource with Lambda

  VectorBucketSetup:
    Type: Custom::S3VectorsSetup
    Properties:
      ServiceToken: !GetAtt VectorSetupFunction.Arn
      BucketName: igad-proposals-vectors-testing
      Indexes:
        - Name: reference-proposals-index
          Dimension: 1024
          DistanceMetric: cosine
        - Name: existing-work-index
          Dimension: 1024
          DistanceMetric: cosine

  VectorSetupFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: python3.11
      Handler: index.handler
      Code:
        ZipFile: |
          import boto3
          import cfnresponse

          def handler(event, context):
              # Create vector bucket and indexes via boto3
              # ... implementation
              cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
```

---

## 🧪 Verification Steps

After setup, verify everything works:

### 1. Check Vector Bucket

```bash
aws s3vectors list-buckets \
  --region us-east-1 \
  --profile IBD-DEV
```

**Expected output:**
```json
{
  "buckets": [
    {
      "name": "igad-proposals-vectors-testing",
      "region": "us-east-1"
    }
  ]
}
```

### 2. Check Indexes

```bash
aws s3vectors list-indexes \
  --bucket-name igad-proposals-vectors-testing \
  --region us-east-1 \
  --profile IBD-DEV
```

**Expected output:**
```json
{
  "indexes": [
    {
      "name": "reference-proposals-index",
      "dimension": 1024,
      "distanceMetric": "cosine"
    },
    {
      "name": "existing-work-index",
      "dimension": 1024,
      "distanceMetric": "cosine"
    }
  ]
}
```

### 3. Test Vector Insert (Optional)

```python
import boto3
import json

# Initialize clients
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
s3vectors = boto3.client("s3vectors", region_name="us-east-1")

# Generate test embedding
response = bedrock.invoke_model(
    modelId="amazon.titan-embed-text-v2:0",
    body=json.dumps({"inputText": "test document"})
)
embedding = json.loads(response["body"].read())["embedding"]

# Insert test vector
s3vectors.put_vectors(
    vectorBucketName="igad-proposals-vectors-testing",
    indexName="reference-proposals-index",
    vectors=[{
        "key": "test-vector-1",
        "data": {"float32": embedding},
        "metadata": {
            "proposal_id": "TEST-001",
            "donor": "TEST",
            "sector": "TEST",
            "year": "2025",
            "status": "test"
        }
    }]
)

print("✅ Test vector inserted successfully")
```

### 4. Test Query (Optional)

```python
# Query test vector
results = s3vectors.query_vectors(
    vectorBucketName="igad-proposals-vectors-testing",
    indexName="reference-proposals-index",
    queryVector={"float32": embedding},
    topK=1,
    returnDistance=True,
    returnMetadata=True
)

print("✅ Query successful")
print(f"Found {len(results.get('matches', []))} matches")
```

---

## 📊 Monitoring & Costs

### CloudWatch Metrics
Monitor these S3 Vectors metrics:
- `VectorCount` - Number of vectors stored
- `QueryLatency` - Query response time
- `PutVectorErrors` - Failed inserts
- `QueryErrors` - Failed queries

### Cost Tracking
Tag the vector bucket:
```bash
aws s3vectors tag-bucket \
  --bucket-name igad-proposals-vectors-testing \
  --tags Key=Project,Value=IGAD Key=Environment,Value=Testing \
  --region us-east-1 \
  --profile IBD-DEV
```

---

## ❓ Questions & Considerations

### 1. **Backup Strategy?**
- Vector buckets support versioning?
- Need Point-in-Time Recovery?
- Backup/restore process?

### 2. **Security?**
- Encryption at rest enabled by default?
- VPC endpoints needed?
- Cross-account access requirements?

### 3. **Scaling?**
- Expected vector count: ~1000-5000 initially
- Query load: ~100-500/day
- Any rate limiting concerns?

### 4. **Multi-Environment?**
- Create separate buckets for prod/dev?
- Naming convention: `igad-proposals-vectors-{env}`
- Index replication strategy?

### 5. **Disaster Recovery?**
- Can vectors be exported/imported?
- What's the recovery process?
- RTO/RPO requirements?

---

## 🚀 Deployment Checklist

- [ ] Create vector bucket `igad-proposals-vectors-testing`
- [ ] Create index `reference-proposals-index` (dim=1024, metric=cosine)
- [ ] Create index `existing-work-index` (dim=1024, metric=cosine)
- [ ] Update Lambda IAM role with s3vectors + bedrock permissions
- [ ] Update `deploy-fullstack-testing.sh` with vector setup
- [ ] Test vector bucket access from Lambda
- [ ] Test Bedrock Titan model access
- [ ] Verify vector insert/query works
- [ ] Set up CloudWatch alarms (optional)
- [ ] Configure cost tracking tags

---

## 📞 Contact Points

**Backend Team:** Implementing VectorEmbeddingsService
**Frontend Team:** Already updated upload handlers
**Testing:** Will need sample documents for validation

**Timeline:** Infrastructure needed by end of week for backend development to begin.

---

## 📚 Resources

- [AWS S3 Vectors Getting Started](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-getting-started.html)
- [S3 Vectors API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations_Amazon_S3_Vectors.html)
- [Bedrock Titan Embeddings](https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html)
- [S3 Vectors Pricing](https://aws.amazon.com/s3/pricing/)

---

## ⚠️ Important Notes

1. **Can't modify after creation:** Dimension, distance metric, and index name are immutable
2. **Region locked:** Vector buckets can't be moved between regions
3. **No native CFN support yet:** Need to use AWS CLI or Custom Resources
4. **Metadata limits:** Max 10 filterable metadata fields per index
5. **Vector size:** Max 4096 dimensions (we're using 1024)

---

Let me know if you need any clarification or have specific infrastructure requirements!