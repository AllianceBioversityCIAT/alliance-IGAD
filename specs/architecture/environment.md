# IGAD Innovation Hub - Environment & Dependencies

## AWS Services Requirements

### Core Infrastructure Services
```yaml
# AWS Services Configuration
aws_services:
  compute:
    - service: AWS Lambda
      runtime: python3.11
      memory_range: 512MB - 3008MB
      timeout: 30s - 900s
      concurrency: 1000 (reserved)
      
    - service: AWS Lambda Layers
      max_size: 250MB
      runtimes: [python3.11, nodejs18.x]
      
  storage:
    - service: Amazon DynamoDB
      billing_mode: ON_DEMAND
      encryption: AWS_KMS
      backup: POINT_IN_TIME_RECOVERY
      
    - service: Amazon S3
      storage_classes: [STANDARD, INTELLIGENT_TIERING]
      encryption: SSE-KMS
      versioning: ENABLED
      
  networking:
    - service: Amazon API Gateway
      type: REST_API
      throttling: 10000 requests/second
      caching: ENABLED
      
    - service: Amazon CloudFront
      price_class: PriceClass_100
      compression: ENABLED
      http_version: http2
      
  security:
    - service: AWS Cognito
      user_pool: ENABLED
      identity_pool: ENABLED
      mfa: OPTIONAL
      
    - service: AWS IAM
      roles: LEAST_PRIVILEGE
      policies: RESOURCE_BASED
      
    - service: AWS KMS
      key_rotation: ENABLED
      key_policy: CUSTOM
      
  ai_ml:
    - service: Amazon Bedrock
      models: [claude-3-sonnet, claude-3-haiku]
      guardrails: ENABLED
      
  monitoring:
    - service: Amazon CloudWatch
      logs_retention: 30_DAYS
      metrics_retention: 15_MONTHS
      
    - service: AWS X-Ray
      tracing: ENABLED
      sampling_rate: 0.1
      
    - service: AWS CloudTrail
      multi_region: ENABLED
      log_file_validation: ENABLED
```

### Regional Deployment Strategy
```yaml
# Multi-Region Configuration
regions:
  primary:
    region: us-east-1
    services: ALL
    data_residency: PRIMARY
    
  secondary:
    region: eu-west-1
    services: [CloudFront, Route53, S3_REPLICATION]
    data_residency: BACKUP
    
  future_expansion:
    - region: af-south-1  # Cape Town (when available)
      purpose: REGIONAL_COMPLIANCE
      timeline: 2025_Q2
```

## Development Environment Setup

### Prerequisites
```bash
# Required Software Versions
aws_cli: ">=2.15.0"
python: "3.11.x"
nodejs: "18.x LTS"
docker: ">=24.0.0"
git: ">=2.40.0"

# Development Tools
aws_cdk: ">=2.100.0"
aws_sam_cli: ">=1.100.0"
terraform: ">=1.6.0"  # Optional alternative to CDK
```

### Local Development Setup
```bash
#!/bin/bash
# setup-dev-environment.sh

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install AWS CDK
npm install -g aws-cdk@latest

# Install AWS SAM CLI
pip install aws-sam-cli

# Install Python dependencies
pip install -r requirements-dev.txt

# Install Node.js dependencies
npm install

# Configure AWS credentials
aws configure sso

# Bootstrap CDK (one-time setup)
cdk bootstrap aws://ACCOUNT-NUMBER/us-east-1

# Verify setup
aws sts get-caller-identity
cdk --version
sam --version
```

### Environment Variables Configuration
```bash
# .env.development
AWS_REGION=us-east-1
AWS_PROFILE=igad-dev
STAGE=development

# Application Configuration
IGAD_API_BASE_URL=https://api-dev.igad-innovation-hub.org
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_APP_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
DYNAMODB_TABLE_NAME=igad-innovation-hub-data-dev

# AI/ML Configuration
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# External API Keys (stored in AWS Secrets Manager)
ICPAC_API_KEY_SECRET=igad/api-keys/icpac-dev
CEWARN_API_KEY_SECRET=igad/api-keys/cewarn-dev
IDDRSI_API_KEY_SECRET=igad/api-keys/iddrsi-dev

# Monitoring and Logging
LOG_LEVEL=DEBUG
ENABLE_XRAY_TRACING=true
CLOUDWATCH_LOG_GROUP=/aws/lambda/igad-innovation-hub-dev
```

## Python Backend Dependencies

### Core Dependencies (requirements.txt)
```txt
# AWS SDK and Tools
boto3==1.34.0
botocore==1.34.0
aws-lambda-powertools[all]==2.25.0

# Web Framework and API
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-multipart==0.0.6

# Authentication and Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
cryptography==41.0.8

# AI and ML
anthropic==0.7.8
openai==1.3.8  # Fallback option
langchain==0.0.350
langchain-community==0.0.10

# Data Processing
pandas==2.1.4
numpy==1.25.2
python-dateutil==2.8.2
pytz==2023.3

# Document Processing
pypdf2==3.0.1
python-docx==1.1.0
markdown==3.5.1
beautifulsoup4==4.12.2

# HTTP and API Clients
httpx==0.25.2
aiohttp==3.9.1
requests==2.31.0

# Caching and Performance
redis==5.0.1
aiocache==0.12.2

# Validation and Serialization
marshmallow==3.20.1
jsonschema==4.20.0

# Testing (dev dependencies)
pytest==7.4.3
pytest-asyncio==0.21.1
pytest-cov==4.1.0
moto[all]==4.2.14  # AWS mocking
httpx==0.25.2  # For testing HTTP clients

# Development Tools
black==23.11.0
flake8==6.1.0
mypy==1.7.1
pre-commit==3.6.0
```

### Lambda Layer Dependencies
```txt
# lambda-layers/common-utils/requirements.txt
boto3==1.34.0
aws-lambda-powertools[all]==2.25.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0

# lambda-layers/ai-tools/requirements.txt
anthropic==0.7.8
langchain==0.0.350
numpy==1.25.2
```

## Frontend Dependencies

### React Application (package.json)
```json
{
  "name": "igad-innovation-hub-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "react-query": "^3.39.3",
    
    "aws-amplify": "^6.0.0",
    "@aws-amplify/ui-react": "^6.0.0",
    "aws-sdk": "^2.1500.0",
    
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@mui/x-date-pickers": "^6.18.0",
    
    "axios": "^1.6.2",
    "date-fns": "^2.30.0",
    "formik": "^2.4.5",
    "yup": "^1.3.3",
    
    "react-pdf": "^7.5.1",
    "html2canvas": "^1.4.1",
    "jspdf": "^2.5.1",
    
    "recharts": "^2.8.0",
    "react-markdown": "^9.0.1",
    "react-syntax-highlighter": "^15.5.0",
    
    "lodash": "^4.17.21",
    "uuid": "^9.0.1",
    "classnames": "^2.3.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "@types/node": "^20.10.0",
    "@types/lodash": "^4.14.202",
    "@types/uuid": "^9.0.7",
    
    "typescript": "^5.3.2",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    
    "prettier": "^3.1.0",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.1"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx,css,md}",
    "type-check": "tsc --noEmit"
  }
}
```

## Infrastructure as Code (CDK)

### CDK Dependencies (package.json)
```json
{
  "name": "igad-innovation-hub-infrastructure",
  "version": "1.0.0",
  "dependencies": {
    "aws-cdk-lib": "^2.110.0",
    "constructs": "^10.3.0",
    
    "@aws-cdk/aws-apigatewayv2-alpha": "^2.110.0-alpha.0",
    "@aws-cdk/aws-apigatewayv2-integrations-alpha": "^2.110.0-alpha.0",
    
    "cdk-nag": "^2.27.0",
    "@aws-solutions-constructs/aws-lambda-dynamodb": "^2.48.0",
    "@aws-solutions-constructs/aws-apigateway-lambda": "^2.48.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.2",
    "ts-node": "^10.9.1",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8"
  }
}
```

### CDK Configuration (cdk.json)
```json
{
  "app": "npx ts-node --prefer-ts-exts bin/igad-innovation-hub.ts",
  "watch": {
    "include": [
      "**"
    ],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "tsconfig.json",
      "package*.json",
      "yarn.lock",
      "node_modules",
      "test"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws", "aws-cn"],
    "@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver": true,
    "@aws-cdk/aws-ec2:uniqueImdsv2TemplateName": true,
    "@aws-cdk/aws-ecs:arnFormatIncludesClusterName": true,
    "@aws-cdk/aws-iam:minimizePolicies": true,
    "@aws-cdk/core:validateSnapshotRemovalPolicy": true,
    "@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName": true,
    "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
    "@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption": true,
    "@aws-cdk/aws-apigateway:disableCloudWatchRole": false,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "@aws-cdk/aws-events:eventsTargetQueueSameAccount": true,
    "@aws-cdk/aws-iam:standardizedServicePrincipals": true,
    "@aws-cdk/aws-ecs:disableExplicitDeploymentControllerForCircuitBreaker": true,
    "@aws-cdk/aws-iam:importedRoleStackSafeDefaultPolicyName": true,
    "@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy": true,
    "@aws-cdk/aws-route53-patters:useCertificate": true,
    "@aws-cdk/customresources:installLatestAwsSdkDefault": false,
    "@aws-cdk/aws-rds:databaseProxyUniqueResourceName": true,
    "@aws-cdk/aws-codedeploy:removeAlarmsFromDeploymentGroup": true,
    "@aws-cdk/aws-apigateway:authorizerChangeDeploymentLogicalId": true,
    "@aws-cdk/aws-ec2:launchTemplateDefaultUserData": true,
    "@aws-cdk/aws-secretsmanager:useAttachedSecretResourcePolicyForSecretTargetAttachments": true,
    "@aws-cdk/aws-redshift:columnId": true,
    "@aws-cdk/aws-stepfunctions-tasks:enableLoggingForLambdaInvoke": true,
    "@aws-cdk/aws-ec2:restrictDefaultSecurityGroup": true,
    "@aws-cdk/aws-apigateway:requestValidatorUniqueId": true,
    "@aws-cdk/aws-kms:aliasNameRef": true,
    "@aws-cdk/aws-autoscaling:generateLaunchTemplateInsteadOfLaunchConfig": true,
    "@aws-cdk/core:includePrefixInUniqueNameGeneration": true,
    "@aws-cdk/aws-efs:denyAnonymousAccess": true,
    "@aws-cdk/aws-opensearchservice:enableLogging": true,
    "@aws-cdk/aws-s3:autoDeleteObjectsPolicy": true,
    "@aws-cdk/aws-ec2:vpnConnectionLogging": true,
    "@aws-cdk/aws-lambda:codeguruProfiler": true,
    "@aws-cdk/aws-opensearchservice:applyRemovalPolicy": true,
    "@aws-cdk/aws-rds:preventRenderingDeprecatedCredentials": true,
    "@aws-cdk/aws-codepipeline-actions:useNewDefaultBranchForSourceAction": true
  }
}
```

## CI/CD Pipeline Configuration

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy IGAD Innovation Hub

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  NODE_VERSION: 18
  PYTHON_VERSION: 3.11

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: Install Python dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
          
      - name: Install Node.js dependencies
        run: |
          npm ci
          cd frontend && npm ci
          
      - name: Run Python tests
        run: |
          pytest --cov=src --cov-report=xml
          
      - name: Run Frontend tests
        run: |
          cd frontend && npm test -- --coverage
          
      - name: Run CDK tests
        run: |
          cd infrastructure && npm test
          
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Bandit security scan
        run: |
          pip install bandit
          bandit -r src/ -f json -o bandit-report.json
          
      - name: Run npm audit
        run: |
          npm audit --audit-level moderate
          cd frontend && npm audit --audit-level moderate

  deploy-dev:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: development
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          
      - name: Install CDK
        run: npm install -g aws-cdk
        
      - name: Deploy infrastructure
        run: |
          cd infrastructure
          npm ci
          cdk deploy --all --require-approval never
          
      - name: Deploy Lambda functions
        run: |
          cd backend
          sam build
          sam deploy --no-confirm-changeset --no-fail-on-empty-changeset
          
      - name: Deploy frontend
        run: |
          cd frontend
          npm ci
          npm run build
          aws s3 sync dist/ s3://igad-innovation-hub-frontend-dev --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"

  deploy-prod:
    needs: [test, security-scan]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
      # Similar to deploy-dev but with production environment variables
      - uses: actions/checkout@v4
      # ... (production deployment steps)
```

### Environment-Specific Configuration
```bash
# scripts/deploy-environment.sh
#!/bin/bash

ENVIRONMENT=$1
AWS_REGION=${2:-us-east-1}

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <environment> [region]"
    echo "Environments: development, staging, production"
    exit 1
fi

# Set environment-specific variables
case $ENVIRONMENT in
    development)
        STACK_NAME="igad-innovation-hub-dev"
        DOMAIN_NAME="dev.igad-innovation-hub.org"
        ;;
    staging)
        STACK_NAME="igad-innovation-hub-staging"
        DOMAIN_NAME="staging.igad-innovation-hub.org"
        ;;
    production)
        STACK_NAME="igad-innovation-hub-prod"
        DOMAIN_NAME="igad-innovation-hub.org"
        ;;
    *)
        echo "Unknown environment: $ENVIRONMENT"
        exit 1
        ;;
esac

echo "Deploying to $ENVIRONMENT environment..."
echo "Stack: $STACK_NAME"
echo "Domain: $DOMAIN_NAME"
echo "Region: $AWS_REGION"

# Deploy infrastructure
cd infrastructure
cdk deploy $STACK_NAME \
    --context environment=$ENVIRONMENT \
    --context domainName=$DOMAIN_NAME \
    --require-approval never

# Deploy backend
cd ../backend
sam build
sam deploy \
    --stack-name "${STACK_NAME}-backend" \
    --parameter-overrides Environment=$ENVIRONMENT \
    --no-confirm-changeset \
    --no-fail-on-empty-changeset

# Deploy frontend
cd ../frontend
npm run build:$ENVIRONMENT
aws s3 sync dist/ s3://${STACK_NAME}-frontend --delete
aws cloudfront create-invalidation \
    --distribution-id $(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text) \
    --paths "/*"

echo "Deployment completed successfully!"
```

This comprehensive environment specification ensures consistent, secure, and scalable deployment of the IGAD Innovation Hub across all environments.
