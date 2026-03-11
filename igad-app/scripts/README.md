# IGAD Innovation Hub - Deployment Scripts

This directory contains the scripts used to build and deploy the IGAD Innovation Hub application to AWS. The project utilizes AWS Serverless Application Model (SAM) for the backend/infrastructure and S3 + CloudFront for the frontend.

## Prerequisites

Before deploying, ensure you have the following installed and configured:

- [AWS CLI](https://aws.amazon.com/cli/) configured with the `IBD-DEV` profile
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- [Node.js & npm](https://nodejs.org/) (for building the frontend)
- [Python 3.11+ & pip](https://www.python.org/) (for backend packaging)
- Ensure your AWS region is set to `us-east-1`.

### AWS Profile Setup
The deployment scripts hardcode the use of the `IBD-DEV` AWS profile. Ensure it is configured:
```bash
aws configure --profile IBD-DEV
# Default region name [us-east-1]: us-east-1
```

## Deployment Environments

The application supports two environments:
1. **Testing (`igad-testing-*`)**: Used for development and QA.
2. **Production (`igad-prod-*`)**: Live production environment.

---

## 1. Deploying to Testing

Use the `deploy-fullstack-testing.sh` script to deploy to the testing environment. This script builds both the React frontend and the FastAPI backend, deploys the SAM template, and syncs the frontend to S3.

### Usage

**Full Deployment (Frontend + Backend):**
```bash
./deploy-fullstack-testing.sh
```

**Targeted Deployments:**
You can deploy only specific parts of the stack to speed up the process if you only made changes to one side:

Deploy frontend only:
```bash
./deploy-fullstack-testing.sh --frontend-only
```
*Or alternatively:* `./deploy-fullstack-testing.sh --skip-backend`

Deploy backend only:
```bash
./deploy-fullstack-testing.sh --backend-only
```
*Or alternatively:* `./deploy-fullstack-testing.sh --skip-frontend`

### What it does:
1. Validates AWS credentials.
2. Initializes the AWS S3 Vector storage resources.
3. Builds the React frontend via Vite.
4. Packages the Python FastAPI backend into a `dist` folder.
5. Deploys the backend via AWS SAM (`sam build` + `sam deploy --stack-name igad-backend-testing`).
6. Automatically discovers the correct Testing S3 bucket and CloudFront distribution.
7. Syncs the frontend build to S3 and invalidates the CloudFront cache.

---

## 2. Deploying to Production

Use the `deploy-fullstack-production.sh` script to deploy to the production environment. 

⚠️ **Warning:** This script requires interactive confirmation before running.

### Usage

**Full Production Deployment:**
```bash
./deploy-fullstack-production.sh
```

### What it does:
1. Validates AWS credentials.
2. **Prompts for confirmation** to prevent accidental production deployments.
3. **Runs Backend Unit Tests** via `pytest`. The deployment will fail automatically if tests do not pass.
4. Builds the React frontend.
5. Packages the Python backend (including running `pip install` into the dist folder).
6. Deploys the backend via AWS SAM (`sam build --use-container` + `sam deploy --config-env production`).
7. Automatically discovers the correct Production S3 bucket and CloudFront distribution.
8. Syncs the frontend build to S3 and invalidates the CloudFront cache.

---

## Troubleshooting

- **`ERROR: Must deploy to us-east-1 region`**: You must explicitly set your region for the `IBD-DEV` profile. Run: `aws configure set region us-east-1 --profile IBD-DEV`
- **`ERROR: Could not find S3 bucket...`**: The script uses `grep` to find the S3 bucket created by the SAM template. Ensure the SAM backend deployment succeeded first before the script attempts to upload the frontend.
- **Backend deployment skipped**: SAM will skip deployment if no changes are detected in the CloudFormation template or backend code.
