# Alliance IGAD

AI-powered platform for proposal writing and administrative prompt management, built on a serverless AWS stack. The core application lives in `igad-app/`, with planning, prompts, and specs at the repo root.

## Product Modules
- Proposal Writer: multi-step workflow for RFP ingestion, concept review, structure/workplan generation, and draft feedback.
- Document Management: upload/delete RFPs, concept files, reference proposals, and supporting documents with async vectorization.
- Admin Prompt Manager: create, edit, publish, and audit AI prompts used by the proposal workflow.
- Authentication: AWS Cognito-backed login, password reset, and session refresh.
- Newsletter Generator: under construction.

## Architecture Summary
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS.
- Backend: FastAPI API layer, AWS Lambda workers for async processing.
- AI: AWS Bedrock (prompts stored in DynamoDB and managed via admin UI).
- Storage: DynamoDB single-table, S3 documents bucket, S3 Vectors for embeddings.
- Infrastructure: AWS CDK.

## Key API Surface (Proposal Writer)
- `POST /api/proposals` create draft proposals.
- `GET /api/proposals/{proposal_id}` fetch proposal metadata and analysis.
- `POST /api/proposals/{proposal_id}/analyze-rfp` start async RFP analysis.
- `GET /api/proposals/{proposal_id}/analysis-status` poll RFP analysis.
- `POST /api/proposals/{proposal_id}/generate-concept-document` create concept doc.
- `POST /api/proposals/{proposal_id}/generate-proposal-template` generate templates.
- `POST /api/proposals/{proposal_id}/analyze-draft-feedback` evaluate draft quality.
- `POST /api/proposals/{proposal_id}/documents/upload` upload RFP PDFs.
- `POST /api/proposals/{proposal_id}/documents/upload-reference-file` upload references.
- `POST /api/proposals/{proposal_id}/documents/upload-supporting-file` upload supporting docs.

## Repository Structure
```
alliance-IGAD/
├── README.md
├── igad-app/                     # Application source
│   ├── frontend/                 # React + TypeScript + Vite
│   ├── backend/                  # FastAPI + Lambda services
│   ├── infrastructure/           # AWS CDK stacks
│   ├── config/                   # Environment configs
│   ├── scripts/                  # Deployment and ops scripts
│   └── docs/                     # Architecture/deployment docs
├── planning/                     # Planning notes and debug logs
├── prompts/                      # Prompt templates and experiments
└── specs/                        # Designs and mockups
```

## Local Development
### Prerequisites
- Node.js 18+
- Python 3.11+
- AWS credentials with access to required services

### Frontend
```bash
cd igad-app/frontend
npm install
npm run dev
```

### Backend
```bash
cd igad-app/backend
pip install -r requirements.txt
python start_server.py
```

## Deployment
Scripts live in `igad-app/scripts/`:
- `deploy-fullstack-testing.sh`
- `deploy-fullstack-production.sh`
- `deploy-backend-only.sh`
- `deploy-testing.sh` / `deploy-production.sh`

## Configuration
Frontend expects:
- `VITE_API_BASE_URL`

Backend expects (env vars):
- `ENVIRONMENT`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `PROPOSALS_BUCKET`
- `WORKER_FUNCTION_NAME`
- `CORS_ALLOWED_ORIGINS`

## Documentation
- `igad-app/docs/deployment.md`
- `igad-app/docs/backend-architecture.md`
- `igad-app/docs/frontend-architecture.md`
