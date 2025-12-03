# S3 Vectors Setup & Usage Guide

## 🎯 Overview

S3 Vectors infrastructure for semantic search on IGAD proposals and organizational work.

**Status:** ⚠️ Preview Feature - May not be available in all AWS accounts

---

## 📋 Infrastructure

### Vector Bucket
- **Name:** `igad-proposals-vectors-testing`
- **Region:** `us-east-1`
- **Encryption:** SSE-S3

### Vector Indexes

#### 1. Reference Proposals Index
- **Name:** `reference-proposals-index`
- **Dimension:** 1024 (Titan Text Embeddings v2)
- **Distance Metric:** Cosine
- **Filterable Metadata:**
  - `proposal_id` - Unique proposal identifier
  - `donor` - Donor organization
  - `sector` - Project sector
  - `year` - Proposal year
  - `status` - Proposal status
- **Non-filterable Metadata:**
  - `source_text` - Original text (first 1000 chars)
  - `document_name` - Document filename
  - `upload_date` - Upload timestamp

#### 2. Existing Work Index
- **Name:** `existing-work-index`
- **Dimension:** 1024
- **Distance Metric:** Cosine
- **Filterable Metadata:**
  - `proposal_id` - Unique proposal identifier
  - `organization` - Organization name
  - `project_type` - Type of project
  - `region` - Geographic region
- **Non-filterable Metadata:**
  - `source_text` - Original text (first 1000 chars)
  - `document_name` - Document filename
  - `upload_date` - Upload timestamp

---

## 🚀 Setup

### Option 1: Automatic (via deployment script)

```bash
cd igad-app
./scripts/deploy-fullstack-testing.sh
```

The script will automatically:
1. Check if vector bucket exists
2. Create bucket if needed
3. Create both indexes if needed
4. Deploy backend with proper IAM permissions

### Option 2: Manual Setup

```bash
cd igad-app
python3 scripts/setup-s3-vectors.py
```

### Option 3: AWS CLI (if available)

```bash
# Create vector bucket
aws s3vectors create-bucket \
  --bucket-name igad-proposals-vectors-testing \
  --region us-east-1 \
  --profile IBD-DEV

# Create reference proposals index
aws s3vectors create-index \
  --bucket-name igad-proposals-vectors-testing \
  --index-name reference-proposals-index \
  --dimension 1024 \
  --distance-metric cosine \
  --region us-east-1 \
  --profile IBD-DEV

# Create existing work index
aws s3vectors create-index \
  --bucket-name igad-proposals-vectors-testing \
  --index-name existing-work-index \
  --dimension 1024 \
  --distance-metric cosine \
  --region us-east-1 \
  --profile IBD-DEV
```

---

## 🧪 Testing

### 1. Health Check

```bash
curl https://your-api-url/api/vectors/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "bucket": "igad-proposals-vectors-testing",
  "indexes": [
    {"name": "reference-proposals-index", "dimension": 1024},
    {"name": "existing-work-index", "dimension": 1024}
  ]
}
```

### 2. Insert Test Vector

```bash
curl -X POST https://your-api-url/api/vectors/test-insert \
  -H "Content-Type: application/json" \
  -d '{
    "proposal_id": "TEST-001",
    "text": "Sample proposal about climate change adaptation in East Africa",
    "index_type": "reference",
    "metadata": {
      "donor": "EU",
      "sector": "Climate",
      "year": "2025",
      "status": "approved"
    }
  }'
```

### 3. Search Test

```bash
curl -X POST https://your-api-url/api/vectors/test-search \
  -H "Content-Type: application/json" \
  -d '{
    "query_text": "climate adaptation projects",
    "index_type": "reference",
    "top_k": 5,
    "filters": {
      "sector": "Climate"
    }
  }'
```

---

## 💻 Usage in Code

### Python (Backend)

```python
from app.services.vector_embeddings_service import VectorEmbeddingsService

# Initialize service
service = VectorEmbeddingsService()

# Insert reference proposal
service.insert_reference_proposal(
    proposal_id="PROP-123",
    text="Full proposal text here...",
    metadata={
        "donor": "USAID",
        "sector": "Health",
        "year": "2025",
        "status": "draft"
    }
)

# Search similar proposals
results = service.search_similar_proposals(
    query_text="health systems strengthening",
    top_k=5,
    filters={"donor": "USAID"}
)

# Process results
for result in results:
    print(f"Match: {result['key']}")
    print(f"Distance: {result['distance']}")
    print(f"Metadata: {result['metadata']}")
```

### TypeScript (Frontend)

```typescript
// Insert vector (via backend API)
const insertVector = async (proposalId: string, text: string) => {
  const response = await fetch('/api/vectors/test-insert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      proposal_id: proposalId,
      text: text,
      index_type: 'reference',
      metadata: {
        donor: 'EU',
        sector: 'Education',
        year: '2025',
        status: 'draft'
      }
    })
  });
  return response.json();
};

// Search vectors
const searchVectors = async (query: string) => {
  const response = await fetch('/api/vectors/test-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query_text: query,
      index_type: 'reference',
      top_k: 5
    })
  });
  return response.json();
};
```

---

## 🔒 IAM Permissions

The Lambda function needs these permissions (already in `template.yaml`):

```yaml
- Effect: Allow
  Action:
    - s3vectors:PutVectors
    - s3vectors:QueryVectors
    - s3vectors:GetVectors
    - s3vectors:DeleteVectors
    - s3vectors:ListVectors
    - s3vectors:DescribeVectorIndex
    - s3vectors:ListIndexes
  Resource:
    - arn:aws:s3vectors:us-east-1:569113802249:bucket/igad-proposals-vectors-testing
    - arn:aws:s3vectors:us-east-1:569113802249:bucket/igad-proposals-vectors-testing/*
- Effect: Allow
  Action:
    - bedrock:InvokeModel
  Resource:
    - arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0
```

---

## 📊 Monitoring

### CloudWatch Metrics

Monitor these metrics in CloudWatch:
- `VectorCount` - Number of vectors stored
- `QueryLatency` - Query response time
- `PutVectorErrors` - Failed inserts
- `QueryErrors` - Failed queries

### Cost Tracking

```bash
# Tag the bucket for cost allocation
aws s3vectors tag-bucket \
  --bucket-name igad-proposals-vectors-testing \
  --tags Key=Project,Value=IGAD Key=Environment,Value=Testing \
  --region us-east-1 \
  --profile IBD-DEV
```

---

## ⚠️ Important Notes

### Immutable Configuration
Once created, you **CANNOT** change:
- Vector bucket name
- Index name
- Dimension size
- Distance metric
- Non-filterable metadata keys

### Limitations
- Max dimension: 4096 (we use 1024)
- Max filterable metadata fields: 10 per index
- Region-specific (can't move between regions)

### Preview Feature
S3 Vectors is currently in preview. If you get errors:
1. Contact AWS Support
2. Request S3 Vectors preview access
3. Specify account: `569113802249`
4. Specify region: `us-east-1`

---

## 🐛 Troubleshooting

### Error: "InvalidAction" or "UnknownOperation"
**Cause:** S3 Vectors not enabled in your account  
**Solution:** Request preview access from AWS Support

### Error: "NoSuchBucket"
**Cause:** Vector bucket doesn't exist  
**Solution:** Run `python3 scripts/setup-s3-vectors.py`

### Error: "AccessDenied"
**Cause:** Missing IAM permissions  
**Solution:** Check Lambda execution role has s3vectors:* permissions

### Error: "DimensionMismatch"
**Cause:** Embedding dimension doesn't match index  
**Solution:** Ensure using Titan Text v2 (1024 dimensions)

---

## 📚 Resources

- [AWS S3 Vectors Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-vectors-getting-started.html)
- [Bedrock Titan Embeddings](https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html)
- [S3 Vectors API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations_Amazon_S3_Vectors.html)

---

## 🔄 Next Steps

1. ✅ Infrastructure setup complete
2. ⏳ Integrate with document upload flow
3. ⏳ Add semantic search to proposal writer
4. ⏳ Implement similarity recommendations
5. ⏳ Add vector cleanup on proposal deletion
