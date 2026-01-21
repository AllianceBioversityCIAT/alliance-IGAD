# IGAD Innovation Hub

AI-powered platform for proposal writing and newsletter generation, built with AWS serverless architecture.

## Project Structure

```
igad-app/
├── frontend/              # React + TypeScript frontend
├── backend/               # Python Lambda API
├── infrastructure/        # AWS CDK infrastructure
├── specs/                 # Design specifications and mockups
├── planning/              # Sprint planning and documentation
├── config/                # Environment configurations
├── scripts/               # Deployment and utility scripts
├── docs/                  # Project documentation
├── .github/               # CI/CD workflows
└── .amazonq/              # Development standards and rules
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- AWS CLI configured with IBD-DEV profile
- AWS CDK CLI

### Infrastructure Deployment

```bash
cd infrastructure
npm install
npm run deploy:testing
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

### Backend Development

```bash
cd backend
pip install -r requirements.txt
# Local development with FastAPI
```

## Documentation

- [Deployment Guide](docs/deployment.md)
- [Sprint Planning](planning/setup/README.md)
- [Design System](specs/mockups/README.md)

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Python FastAPI + AWS Lambda
- **Database**: DynamoDB single-table design
- **Authentication**: AWS Cognito
- **Infrastructure**: AWS CDK + GitHub Actions CI/CD

## Environments

- **Testing**: `igad-testing-*` resources
- **Production**: `igad-prod-*` resources
