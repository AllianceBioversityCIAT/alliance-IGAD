# IGAD Innovation Hub - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the IGAD Innovation Hub platform, including backend services, frontend application, and email configuration setup.

## Architecture Components

### 1. Backend (AWS SAM + Lambda)
- **Framework**: FastAPI with Lambda Web Adapter
- **Runtime**: Python 3.11
- **Infrastructure**: AWS SAM (Serverless Application Model)
- **Services**: Lambda, API Gateway, DynamoDB, Cognito, SES

### 2. Frontend (React + CloudFront)
- **Framework**: React with TypeScript
- **Hosting**: S3 + CloudFront distribution
- **Build Tool**: Vite
- **Styling**: Tailwind CSS

### 3. Authentication
- **Service**: AWS Cognito User Pool
- **Features**: JWT tokens, email verification, password reset
- **Email Templates**: Custom HTML templates with IGAD branding

## Prerequisites

### AWS Configuration
```bash
# Set AWS profile and region
aws configure set profile IBD-DEV
aws configure set region us-east-1

# Verify configuration
aws sts get-caller-identity
```

### Required Tools
- AWS CLI v2
- AWS SAM CLI
- Node.js 18+
- Python 3.11
- Docker (for SAM builds)

## Project Structure

```
igad-app/
├── backend/                 # FastAPI backend application
│   ├── app/                # Source code
│   └── dist/               # Distribution files for deployment
├── frontend/               # React frontend application
├── infrastructure/         # CDK infrastructure (legacy)
├── scripts/               # Deployment scripts
├── docs/                  # Documentation
├── template.yaml          # SAM template
└── samconfig.toml        # SAM configuration
```

## Configuration Files

### 1. SAM Configuration (`samconfig.toml`)
```toml
version = 0.1
[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "igad-backend-testing"
resolve_s3 = true
confirm_changeset = false
capabilities = "CAPABILITY_IAM"
region = "us-east-1"
```

**Purpose**: Defines default parameters for SAM deployments
- `stack_name`: CloudFormation stack name
- `resolve_s3`: Auto-create S3 bucket for artifacts
- `confirm_changeset`: Skip manual confirmation
- `capabilities`: Required IAM permissions

### 2. SAM Template (`template.yaml`)
**Key Components**:
- **Lambda Function**: FastAPI application with Web Adapter
- **API Gateway**: REST API with CORS configuration
- **DynamoDB**: NoSQL database for application data
- **IAM Roles**: Permissions for Cognito, DynamoDB, SES, Bedrock
- **CloudFront**: CDN for frontend distribution
- **S3 Bucket**: Static website hosting

### 3. Environment Configuration
**Backend Environment Variables**:
```yaml
Environment:
  Variables:
    PORT: 8080
    AWS_LAMBDA_EXEC_WRAPPER: /opt/bootstrap
    COGNITO_CLIENT_ID: ${CognitoClientId}
    COGNITO_USER_POOL_ID: ${CognitoUserPoolId}
    TABLE_NAME: igad-testing-main-table
```

## Deployment Process

### 1. Quick Deployment
```bash
# Deploy to testing environment
./scripts/deploy.sh testing

# Deploy to production environment
./scripts/deploy.sh production
```

### 2. Manual Deployment Steps

#### Backend Deployment
```bash
# 1. Copy source to distribution
cd backend && cp -r app/* dist/

# 2. Build SAM application
sam build --use-container

# 3. Deploy to AWS
sam deploy
```

#### Frontend Deployment
```bash
# 1. Install dependencies
cd frontend && npm install

# 2. Build for production
npm run build

# 3. Deploy to S3 (manual)
aws s3 sync dist/ s3://your-bucket-name --delete

# 4. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

## Cognito Email Templates Setup

### 1. User Pool Configuration
The SAM template automatically creates:
- Cognito User Pool with email as username
- User Pool Client with required auth flows
- Email verification and password reset capabilities

### 2. Email Templates Configuration

#### Welcome Email Template
```bash
aws cognito-idp update-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX \
  --admin-create-user-config '{
    "AllowAdminCreateUserOnly": false,
    "InviteMessageAction": "EMAIL",
    "MessageAction": "EMAIL"
  }'
```

#### Custom HTML Templates
Located in `backend/scripts/maintenance/`:
- `configure_email_templates.py` - Sets up HTML email templates
- `fix_email_templates.py` - Updates existing templates

**Template Features**:
- Professional IGAD branding
- Responsive HTML design
- Inline CSS for email client compatibility
- Security-focused messaging
- Call-to-action buttons

#### Email Template Types
1. **Welcome Email**: New user account creation
2. **Email Verification**: Email address confirmation
3. **Password Reset**: Forgot password functionality

### 3. SES Configuration
```bash
# Verify email identity for sending
aws ses verify-email-identity \
  --email-address j.cadavid@cgiar.org

# Check verification status
aws ses get-identity-verification-attributes \
  --identities j.cadavid@cgiar.org
```

## Infrastructure Components

### 1. AWS Services Used
- **Lambda**: Serverless compute for backend API
- **API Gateway**: HTTP API endpoint management
- **DynamoDB**: NoSQL database for application data
- **Cognito**: User authentication and management
- **SES**: Email delivery service
- **S3**: Static website hosting
- **CloudFront**: Content delivery network
- **IAM**: Identity and access management

### 2. Security Configuration
**IAM Policies Include**:
- Cognito user management permissions
- DynamoDB read/write access
- SES email sending capabilities
- Bedrock AI model access
- CloudWatch logging permissions

### 3. Networking
- **CORS**: Configured for cross-origin requests
- **HTTPS**: Enforced for all API communications
- **Custom Domain**: Optional Route 53 integration

## Environment Management

### Testing Environment
- **Stack Name**: `igad-backend-testing`
- **Purpose**: Development and testing
- **Database**: `igad-testing-main-table`
- **Cognito Pool**: Testing user pool

### Production Environment
- **Stack Name**: `igad-backend-production`
- **Purpose**: Live production system
- **Database**: `igad-production-main-table`
- **Cognito Pool**: Production user pool

## Deployment Scripts

### 1. `scripts/deploy-testing.sh`
- Validates AWS profile and region
- Copies source files to distribution
- Builds and deploys to testing environment
- No confirmation required

### 2. `scripts/deploy-production.sh`
- Same validation as testing
- Requires explicit confirmation
- Deploys to production environment
- Includes safety warnings

### 3. `scripts/deploy.sh`
- Helper script for environment selection
- Routes to appropriate deployment script
- Provides usage instructions

## Monitoring and Troubleshooting

### 1. CloudWatch Logs
```bash
# View Lambda logs
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/lambda/igad-backend"

# Get recent log events
aws logs get-log-events \
  --log-group-name "/aws/lambda/igad-backend-testing-ApiFunction" \
  --log-stream-name "LATEST"
```

### 2. Health Checks
```bash
# Test API health
curl https://your-api-gateway-url/health

# Test authentication
curl -X POST https://your-api-gateway-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test@example.com", "password": "password"}'
```

### 3. Common Issues

#### Build Failures
- **Network timeouts**: Retry with `sam build --use-container`
- **Permission errors**: Verify AWS credentials and IAM roles
- **Docker issues**: Ensure Docker is running for container builds

#### Deployment Failures
- **Stack exists**: Use `sam deploy --force-upload` to override
- **IAM permissions**: Check CloudFormation stack events
- **Resource conflicts**: Verify unique resource names

#### Runtime Errors
- **Environment variables**: Check Lambda configuration
- **Database access**: Verify DynamoDB permissions
- **Email delivery**: Check SES identity verification

## Rollback Procedures

### 1. Quick Rollback
```bash
# Rollback to previous version
aws cloudformation cancel-update-stack \
  --stack-name igad-backend-testing

# Deploy previous version
git checkout previous-commit
./scripts/deploy.sh testing
```

### 2. Database Rollback
- DynamoDB point-in-time recovery available
- Manual data export/import if needed
- Backup strategies documented separately

## Security Considerations

### 1. Secrets Management
- No hardcoded credentials in code
- Environment variables for configuration
- AWS Secrets Manager for sensitive data
- Regular credential rotation

### 2. Access Control
- Least privilege IAM policies
- Cognito user pool security settings
- API Gateway throttling and rate limiting
- CloudFront security headers

### 3. Data Protection
- Encryption at rest (DynamoDB)
- Encryption in transit (HTTPS/TLS)
- Input validation and sanitization
- Output encoding for XSS prevention

## Maintenance Tasks

### Regular Tasks
- Monitor CloudWatch metrics and alarms
- Review and rotate AWS credentials
- Update dependencies and security patches
- Backup critical data and configurations

### Monthly Tasks
- Review AWS costs and optimize resources
- Update email templates if needed
- Test disaster recovery procedures
- Review and update documentation

## Support and Troubleshooting

### Documentation References
- `docs/backend-architecture.md` - Backend technical details
- `docs/frontend-architecture.md` - Frontend technical details
- `docs/EMAIL_CONFIGURATION.md` - Email setup details
- `docs/cognito-testing.md` - Authentication testing

### Contact Information
- **Technical Lead**: Development Team
- **AWS Account**: IBD-DEV profile
- **Support Email**: j.cadavid@cgiar.org

## Appendix

### Useful Commands
```bash
# Check deployment status
aws cloudformation describe-stacks \
  --stack-name igad-backend-testing

# List Lambda functions
aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `igad`)]'

# Check Cognito user pool
aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_XXXXXXXXX

# Monitor API Gateway
aws apigateway get-rest-apis \
  --query 'items[?name==`igad-backend-testing`]'
```

### Environment Variables Reference
| Variable | Purpose | Example |
|----------|---------|---------|
| `COGNITO_CLIENT_ID` | Cognito app client ID | `4l2sdk3cuq1pnm30q0nbcs7v3r` |
| `COGNITO_USER_POOL_ID` | Cognito user pool ID | `us-east-1_lLtVSWM9T` |
| `TABLE_NAME` | DynamoDB table name | `igad-testing-main-table` |
| `PORT` | Lambda web server port | `8080` |

This deployment guide ensures consistent, secure, and maintainable deployments of the IGAD Innovation Hub platform across all environments.
