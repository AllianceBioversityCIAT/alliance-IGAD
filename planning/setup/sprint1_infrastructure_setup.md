# Sprint 1: Infrastructure Setup

## Sprint Goal
Establish the foundational AWS serverless infrastructure and CI/CD pipelines for the IGAD Innovation Hub MVP, enabling automated deployment to Testing and Production environments.

## Key Objectives
- Deploy core AWS infrastructure using CDK
- Set up Cognito User Pool for authentication
- Configure DynamoDB single-table design
- Establish S3 buckets for storage and hosting
- Implement CI/CD pipelines for automated deployment
- Configure monitoring and logging foundations

## User Stories / Tasks

### Infrastructure (CDK)
- **IH-001**: As a DevOps engineer, I need AWS CDK stacks for Testing and Production environments
  - Create CDK project structure with TypeScript
  - Define separate stacks for each environment
  - Configure stack parameters and environment variables

- **IH-002**: As a system architect, I need Cognito User Pool configured for IGAD users
  - Set up Cognito User Pool with custom attributes (organization, role, country)
  - Configure OAuth 2.0 with hosted UI
  - Define user groups (admin, editor, consumer)
  - Set password policies and MFA options

- **IH-003**: As a backend developer, I need DynamoDB table with optimized schema
  - Create single table with composite keys (PK, SK)
  - Configure GSI for alternative access patterns
  - Set up on-demand billing mode
  - Enable point-in-time recovery for Production

### Storage & Hosting
- **IH-004**: As a frontend developer, I need S3 buckets for static hosting and document storage
  - Create S3 bucket for React app hosting
  - Configure S3 bucket for document storage and exports
  - Set up CloudFront distribution for global CDN
  - Configure proper CORS and security policies

### API Gateway
- **IH-005**: As an API developer, I need API Gateway configured for HTTP APIs
  - Set up HTTP API Gateway (cost-optimized)
  - Configure CORS for frontend integration
  - Set up JWT authorizer with Cognito
  - Define base API structure and routing

### Monitoring & Logging
- **IH-006**: As a system administrator, I need observability infrastructure
  - Configure CloudWatch log groups with retention policies
  - Set up X-Ray tracing for distributed systems
  - Create CloudWatch dashboards for key metrics
  - Configure SNS topics for alerts

### CI/CD Pipeline
- **IH-007**: As a development team, I need automated deployment pipelines
  - Set up GitHub Actions workflows
  - Configure AWS credentials and permissions
  - Create deployment scripts for Testing and Production
  - Implement automated testing in pipeline

## Deliverables & Definition of Done (DoD)

### Infrastructure Deliverables
- [ ] CDK project with TypeScript configuration
- [ ] Deployed Cognito User Pool in both environments
- [ ] DynamoDB table created with proper schema
- [ ] S3 buckets configured for hosting and storage
- [ ] API Gateway HTTP API deployed and accessible
- [ ] CloudWatch logging and monitoring active

### CI/CD Deliverables
- [ ] GitHub Actions workflows for automated deployment
- [ ] Successful deployment to Testing environment
- [ ] Successful deployment to Production environment
- [ ] Environment-specific configuration management

### Documentation
- [ ] Infrastructure setup guide
- [ ] Deployment runbook
- [ ] Environment configuration documentation

## Dependencies
- **External**: AWS account setup with appropriate permissions
- **External**: GitHub repository with proper access controls
- **External**: Domain registration for custom domains (optional)

## Tools & AWS Services Used

### AWS Services
- **AWS CDK**: Infrastructure as Code
- **Amazon Cognito**: User authentication and authorization
- **Amazon DynamoDB**: NoSQL database
- **Amazon S3**: Object storage and static hosting
- **Amazon CloudFront**: Content delivery network
- **API Gateway**: HTTP API management
- **AWS Lambda**: Serverless compute (placeholder functions)
- **CloudWatch**: Monitoring and logging
- **AWS X-Ray**: Distributed tracing
- **Amazon SNS**: Notifications

### Development Tools
- **TypeScript**: CDK development language
- **GitHub Actions**: CI/CD automation
- **AWS CLI**: Command-line deployment tools
- **Node.js**: Runtime for CDK

## Acceptance Criteria

### Infrastructure Validation
- [ ] **AC-001**: Cognito User Pool allows user registration and login via hosted UI
- [ ] **AC-002**: DynamoDB table accepts read/write operations with proper access patterns
- [ ] **AC-003**: S3 buckets are accessible with appropriate permissions
- [ ] **AC-004**: API Gateway returns 200 OK for health check endpoint
- [ ] **AC-005**: CloudWatch logs capture all infrastructure events

### Environment Validation
- [ ] **AC-006**: Testing environment is fully functional and isolated
- [ ] **AC-007**: Production environment is deployed with production-ready configurations
- [ ] **AC-008**: Environment variables are properly configured for each environment

### CI/CD Validation
- [ ] **AC-009**: GitHub Actions successfully deploy infrastructure changes
- [ ] **AC-010**: Rollback procedures work correctly in case of deployment failures
- [ ] **AC-011**: Deployment process completes within 15 minutes

### Security Validation
- [ ] **AC-012**: IAM roles follow least-privilege principle
- [ ] **AC-013**: All data is encrypted at rest and in transit
- [ ] **AC-014**: Security groups and NACLs are properly configured

### Cost Validation
- [ ] **AC-015**: Testing environment costs remain under $50/month
- [ ] **AC-016**: Production environment baseline costs under $150/month
- [ ] **AC-017**: Cost monitoring alerts are configured and functional

## Expected Output Location

```
/infra/
├── lib/
│   ├── auth-stack.ts          # Cognito configuration
│   ├── data-stack.ts          # DynamoDB and S3 setup
│   ├── api-stack.ts           # API Gateway configuration
│   └── monitoring-stack.ts    # CloudWatch and X-Ray
├── bin/
│   └── app.ts                 # CDK app entry point
├── cdk.json                   # CDK configuration
└── package.json               # Dependencies

/.github/
└── workflows/
    ├── deploy-infrastructure.yml
    ├── deploy-testing.yml
    └── deploy-production.yml

/docs/
├── infrastructure-setup.md
├── deployment-guide.md
└── environment-config.md
```

## Sprint Success Metrics
- **Infrastructure Deployment**: 100% success rate for both environments
- **Pipeline Reliability**: Zero failed deployments during sprint
- **Cost Efficiency**: Actual costs within 10% of estimates
- **Security Compliance**: All security checks pass
- **Documentation Coverage**: All infrastructure components documented

## Risk Mitigation
- **Risk**: AWS service limits or quotas
  - **Mitigation**: Request limit increases early in sprint
- **Risk**: CDK deployment failures
  - **Mitigation**: Implement comprehensive testing and rollback procedures
- **Risk**: Cost overruns
  - **Mitigation**: Daily cost monitoring and automated alerts

This sprint establishes the solid foundation required for all subsequent development sprints, ensuring a reliable, secure, and cost-effective infrastructure platform.
