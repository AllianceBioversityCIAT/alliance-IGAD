# IGAD Innovation Hub - Deployment Guide

## Prerequisites

### AWS Account Setup
- AWS account with appropriate permissions
- AWS CLI installed and configured
- Profile `IBD-DEV` configured for us-east-1 region

### Required Tools
- Node.js 18+ 
- AWS CDK CLI: `npm install -g aws-cdk`
- Git

## Environment Configuration

### AWS Profile Setup
```bash
aws configure set profile IBD-DEV
aws configure set region us-east-1 --profile IBD-DEV
aws configure set aws_access_key_id YOUR_ACCESS_KEY --profile IBD-DEV
aws configure set aws_secret_access_key YOUR_SECRET_KEY --profile IBD-DEV
```

### Verify Configuration
```bash
aws sts get-caller-identity --profile IBD-DEV
```

## Deployment Process

### Testing Environment
```bash
# From project root
./scripts/deploy-testing.sh
```

### Production Environment
```bash
# From project root
./scripts/deploy-production.sh
```

## Manual Deployment

### Install Dependencies
```bash
cd infrastructure
npm install
```

### Deploy Infrastructure
```bash
# Testing
npx cdk deploy --profile IBD-DEV --context environment=testing

# Production  
npx cdk deploy --profile IBD-DEV --context environment=production
```

## Post-Deployment Verification

### Check Stack Outputs
```bash
aws cloudformation describe-stacks --stack-name igad-testing-stack --profile IBD-DEV --region us-east-1
```

### Test Cognito User Pool
1. Navigate to Cognito Console
2. Find user pool: `igad-testing-user-pool`
3. Test hosted UI functionality

### Test API Gateway
```bash
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/
```

### Verify S3 Buckets
- Frontend hosting: `igad-testing-frontend-hosting`
- Document storage: `igad-testing-documents`

## Troubleshooting

### Common Issues

**Profile Not Found**
```bash
aws configure list-profiles
aws configure set profile IBD-DEV
```

**Region Mismatch**
```bash
aws configure set region us-east-1 --profile IBD-DEV
```

**CDK Bootstrap Required**
```bash
npx cdk bootstrap --profile IBD-DEV
```

**Permission Denied**
- Verify IAM permissions for CDK deployment
- Check AWS credentials are valid

### Rollback Procedure
```bash
npx cdk destroy --profile IBD-DEV --context environment=testing
```

## Environment Differences

| Resource | Testing | Production |
|----------|---------|------------|
| Lambda Memory | 128 MB | 256 MB |
| Log Retention | 7 days | 30 days |
| DynamoDB PITR | Disabled | Enabled |
| S3 Versioning | Disabled | Enabled |
| MFA | Disabled | Optional |

## Security Considerations

- All resources use least privilege IAM policies
- S3 buckets have public access blocked (except frontend)
- DynamoDB encryption at rest enabled
- CloudWatch logs encrypted
- Cognito password policies enforced

## Cost Optimization

### Testing Environment (~$30/month)
- On-demand DynamoDB billing
- Minimal Lambda memory allocation
- Short log retention periods

### Production Environment (~$110/month)
- Optimized for performance and reliability
- Point-in-time recovery enabled
- Extended monitoring and logging
