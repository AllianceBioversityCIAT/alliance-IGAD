# IGAD Innovation Hub - Deployment Guide

## Overview

This guide covers the complete deployment process for the IGAD Innovation Hub, including infrastructure setup, application deployment, and troubleshooting based on real deployment experience.

## Prerequisites

### AWS Configuration
```bash
# Required AWS profile and region
aws configure set profile IBD-DEV
aws configure set region us-east-1

# Verify configuration
aws sts get-caller-identity --profile IBD-DEV
```

### Required Tools
- **AWS CLI** (configured with IBD-DEV profile)
- **AWS CDK** (`npm install -g aws-cdk`)
- **AWS SAM CLI** (`brew install aws-sam-cli`)
- **Node.js** (v20.5.1 or higher)
- **Python** (3.9 or higher)
- **Docker** (for SAM builds)

## Architecture Overview

The IGAD Innovation Hub uses a **hybrid deployment approach**:

1. **CDK** - Infrastructure (Cognito, DynamoDB, API Gateway base)
2. **SAM** - Lambda functions and application logic
3. **S3 + CloudFront** - Frontend hosting

## Deployment Process

### 1. Infrastructure Deployment (CDK)

Deploy the base infrastructure first:

```bash
cd infrastructure
npm install
npm run deploy:testing    # For testing environment
npm run deploy:production # For production environment
```

**What this creates:**
- Cognito User Pool with IGAD green email templates
- DynamoDB table
- API Gateway base configuration
- S3 bucket for frontend
- CloudFront distribution

### 2. Application Deployment (SAM)

Deploy the Lambda functions and application logic:

```bash
# Build the application
sam build

# Deploy to testing
sam deploy --stack-name igad-backend-testing --profile IBD-DEV --region us-east-1 --resolve-s3 --no-confirm-changeset --capabilities CAPABILITY_IAM

# Deploy to production
sam deploy --stack-name igad-backend-production --profile IBD-DEV --region us-east-1 --resolve-s3 --no-confirm-changeset --capabilities CAPABILITY_IAM
```

### 3. Frontend Deployment

Frontend is automatically deployed via the fullstack scripts, but can be done manually:

```bash
cd frontend
npm install
npm run build

# Upload to S3 and invalidate CloudFront
aws s3 sync dist/ s3://your-bucket-name --profile IBD-DEV --region us-east-1
aws cloudfront create-invalidation --distribution-id YOUR-DISTRIBUTION-ID --paths "/*" --profile IBD-DEV --region us-east-1
```

### 4. Fullstack Deployment (Recommended)

Use the automated fullstack deployment scripts:

```bash
# Testing environment
./scripts/deploy-fullstack-testing.sh

# Production environment
./scripts/deploy-fullstack-production.sh
```

## Environment Configuration

### Testing Environment
- **Stack Name**: `igad-testing-stack` (CDK), `igad-backend-testing` (SAM)
- **User Pool**: `igad-testing-user-pool`
- **Table**: `igad-testing-main-table`

### Production Environment
- **Stack Name**: `igad-production-stack` (CDK), `igad-backend-production` (SAM)
- **User Pool**: `igad-production-user-pool`
- **Table**: `igad-production-main-table`

## Resource Configuration

### Cognito User Pool Settings

The CDK automatically configures:
- **Email templates** with IGAD green branding (#2D5016, #4a7c59)
- **Password policy** (8+ chars, uppercase, lowercase, numbers)
- **Email verification** enabled
- **Username attributes** set to email

### Lambda Configuration

```yaml
Runtime: python3.9
MemorySize: 512
Timeout: 30
Architecture: x86_64
Environment:
  PORT: 8080
  AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
  COGNITO_CLIENT_ID: [from CDK output]
  COGNITO_USER_POOL_ID: [from CDK output]
  TABLE_NAME: [from CDK output]
```

## Troubleshooting

### Common Issues

#### 1. Stack in DELETE_FAILED State
```bash
# Empty S3 bucket first
aws s3 rm s3://bucket-name --recursive --profile IBD-DEV --region us-east-1

# Delete the failed stack
aws cloudformation delete-stack --stack-name stack-name --profile IBD-DEV --region us-east-1
```

#### 2. Python Version Mismatch
If you get Python version errors:
```bash
# Check available Python versions
python3 --version
python3.9 --version

# Update template.yaml to match your Python version
Runtime: python3.9  # Use your available version
```

#### 3. Duplicate User Pools
If you have multiple user pools:
```bash
# List all user pools
aws cognito-idp list-user-pools --max-results 20 --profile IBD-DEV --region us-east-1

# Delete unused pools
aws cognito-idp delete-user-pool --user-pool-id us-east-1_XXXXXXX --profile IBD-DEV --region us-east-1
```

#### 4. CORS Issues
CORS is configured in the API Gateway. If you have issues:
- Check API Gateway CORS settings
- Verify Lambda function is returning proper headers
- Check CloudFront cache invalidation

#### 5. Email Template Issues
Email templates are configured in CDK. To update:
1. Modify the CDK template
2. Redeploy CDK infrastructure
3. Templates are automatically applied

### Deployment Validation

After deployment, verify:

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name igad-testing-stack --profile IBD-DEV --region us-east-1

# Test API endpoint
curl https://your-api-endpoint.execute-api.us-east-1.amazonaws.com/prod/health

# Check frontend
curl https://your-cloudfront-distribution.cloudfront.net
```

## Security Considerations

### IAM Permissions
- Lambda functions use least-privilege IAM roles
- Cognito permissions scoped to specific operations
- DynamoDB access limited to required tables

### Secrets Management
- No hardcoded credentials in code
- Environment variables for configuration
- AWS Secrets Manager for sensitive data

### Network Security
- API Gateway with CORS properly configured
- CloudFront with security headers
- Lambda functions in VPC if needed

## Monitoring and Logging

### CloudWatch Logs
- Lambda function logs: `/aws/lambda/function-name`
- API Gateway logs: Enabled in deployment
- CloudFront logs: Optional, can be enabled

### Metrics
- Lambda invocations, errors, duration
- API Gateway requests, latency, errors
- CloudFront cache hit ratio

## Rollback Procedures

### Quick Rollback
```bash
# Rollback to previous Lambda version
aws lambda update-function-code --function-name function-name --s3-bucket bucket --s3-key previous-version.zip --profile IBD-DEV --region us-east-1

# Rollback frontend
aws s3 sync previous-build/ s3://bucket-name --profile IBD-DEV --region us-east-1
aws cloudfront create-invalidation --distribution-id DISTRIBUTION-ID --paths "/*" --profile IBD-DEV --region us-east-1
```

### Full Stack Rollback
```bash
# Rollback CDK stack
cd infrastructure
git checkout previous-commit
npm run deploy:testing

# Rollback SAM stack
git checkout previous-commit
sam deploy --stack-name igad-backend-testing --profile IBD-DEV --region us-east-1 --resolve-s3 --no-confirm-changeset --capabilities CAPABILITY_IAM
```

## Production Deployment Checklist

- [ ] AWS credentials configured (IBD-DEV profile)
- [ ] All dependencies installed
- [ ] Code tested in testing environment
- [ ] Database migrations completed (if any)
- [ ] Environment variables updated
- [ ] Security review completed
- [ ] Backup of current production taken
- [ ] Monitoring alerts configured
- [ ] Rollback plan prepared

## URLs and Endpoints

### Testing Environment
- **Frontend**: https://d1s9phi3b0di4q.cloudfront.net
- **API**: https://c37x0xp38k.execute-api.us-east-1.amazonaws.com/prod/

### Production Environment
- **Frontend**: [To be configured]
- **API**: [To be configured]

## Support and Maintenance

### Regular Tasks
- Monitor CloudWatch logs and metrics
- Update dependencies monthly
- Review and rotate secrets quarterly
- Performance optimization based on usage patterns

### Emergency Contacts
- AWS Support: [Configure based on support plan]
- Development Team: [Add contact information]
- Infrastructure Team: [Add contact information]

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [IGAD Development Standards](../.amazonq/rules/development-standards.md)
- [IGAD Deployment Rules](../.amazonq/rules/deployment-rules.md)

---

**Last Updated**: November 10, 2025  
**Version**: 1.0  
**Maintainer**: IGAD Innovation Hub Team
