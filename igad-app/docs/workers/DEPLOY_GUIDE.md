# 🚀 Deploy Guide - Async Architecture

## Pre-Deploy Checklist

```bash
# 1. Test imports locally
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD
./test_async_implementation.sh
```

Expected output:
```
✅ Worker imports OK
✅ Analyzer imports OK
✅ db_client has get_item_sync: True
✅ Proposals router OK, lambda_client imported
✅ All tests passed! Ready for deploy.
```

---

## Deploy Commands

### Full Stack Deploy (Testing)
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app
./scripts/deploy-fullstack-testing.sh
```

This will:
1. Build backend (copy code to dist/)
2. SAM build (package both Lambdas)
3. SAM deploy (create/update stack)
4. Build frontend
5. Upload to S3
6. Invalidate CloudFront cache

**Duration:** ~5-10 minutes

---

## Post-Deploy Verification

### 1. Check Lambda Functions
```bash
aws lambda list-functions --query "Functions[?contains(FunctionName, 'igad-backend-testing')].FunctionName"
```

Expected:
```
[
  "igad-backend-testing-ApiFunction-XXXXX",
  "igad-backend-testing-AnalysisWorkerFunction-XXXXX"
]
```

### 2. Check CloudWatch Logs
```bash
# ApiFunction logs
aws logs tail /aws/lambda/igad-backend-testing-ApiFunction-XXXXX --follow

# AnalysisWorkerFunction logs
aws logs tail /aws/lambda/igad-backend-testing-AnalysisWorkerFunction-XXXXX --follow
```

### 3. Test the Flow

#### A. Upload RFP Document
```bash
# Via UI or API
POST https://YOUR-API-URL/api/proposals/{id}/upload-document
```

#### B. Start Analysis
```bash
POST https://YOUR-API-URL/api/proposals/{id}/analyze-rfp

# Expected response (immediate):
{
  "status": "processing",
  "message": "RFP analysis started. Poll /analysis-status for completion.",
  "started_at": "2025-11-19T12:00:00Z"
}
```

#### C. Poll Status
```bash
GET https://YOUR-API-URL/api/proposals/{id}/analysis-status

# While processing:
{
  "status": "processing",
  "started_at": "2025-11-19T12:00:00Z"
}

# When completed:
{
  "status": "completed",
  "rfp_analysis": {
    "rfp_overview": {...},
    "eligibility": {...},
    ...
  },
  "completed_at": "2025-11-19T12:10:00Z"
}
```

---

## Troubleshooting

### Issue: Worker function not found
**Error:** `Analysis worker function not found`

**Solution:**
```bash
# Check function name pattern
aws lambda list-functions | grep Analysis

# Update proposals.py line ~XXX with correct name pattern
```

### Issue: Timeout still occurs
**Error:** `504 Gateway Timeout`

**Check:**
1. ApiFunction timeout is 300s (should be enough)
2. Worker is being invoked async (`InvocationType='Event'`)
3. Check CloudWatch logs for actual error

### Issue: Analysis never completes
**Error:** Status stuck on "processing"

**Check:**
1. AnalysisWorkerFunction CloudWatch logs for errors
2. DynamoDB permissions for Worker Lambda
3. S3 bucket access for Worker Lambda
4. Bedrock permissions

---

## Rollback

If deployment fails:

```bash
# Rollback stack to previous version
aws cloudformation rollback-stack --stack-name igad-backend-testing

# Or delete and redeploy
aws cloudformation delete-stack --stack-name igad-backend-testing
./scripts/deploy-fullstack-testing.sh
```

---

## Environment Variables to Verify

### ApiFunction:
- `TABLE_NAME`: igad-testing-main-table
- `PROPOSALS_BUCKET`: igad-proposal-documents-XXXXX
- `COGNITO_CLIENT_ID`: 7p11hp6gcklhctcr9qffne71vl
- `COGNITO_USER_POOL_ID`: us-east-1_IMi3kSuB8

### AnalysisWorkerFunction:
- `TABLE_NAME`: igad-testing-main-table
- `PROPOSALS_BUCKET`: igad-proposal-documents-XXXXX

---

## Success Criteria

✅ Both Lambda functions deployed
✅ ApiFunction can invoke AnalysisWorkerFunction
✅ Analysis completes within 15 minutes
✅ Results saved to DynamoDB
✅ Frontend displays results
✅ No CORS errors
✅ No timeout errors

---

## Next Steps After Successful Deploy

1. Test with real RFP PDF
2. Verify prompt from DynamoDB is used
3. Check AI response format matches expected structure
4. Adjust prompts in DynamoDB if needed
5. Monitor CloudWatch costs/duration

---

**Ready to deploy? Run:**
```bash
cd /Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/igad-app
./scripts/deploy-fullstack-testing.sh
```
