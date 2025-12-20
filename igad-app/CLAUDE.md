# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IGAD Innovation Hub - AI-powered platform for proposal writing and newsletter generation, built with AWS serverless architecture.

## Project Structure

```
igad-app/
├── frontend/          # React + TypeScript SPA
├── backend/           # Python FastAPI + AWS Lambda
├── infrastructure/    # AWS CDK infrastructure
├── scripts/           # Deployment scripts
├── docs/              # Documentation
└── template.yaml      # AWS SAM template
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Backend:** Python 3.11, FastAPI, AWS Lambda, DynamoDB
- **Auth:** AWS Cognito
- **Infrastructure:** AWS CDK, GitHub Actions CI/CD

## Environments

- **Testing:** `igad-testing-*` resources
- **Production:** `igad-prod-*` resources
- **AWS Profile:** `IBD-DEV`

## Main Feature: Proposal Writer

4-step workflow for creating grant proposals with AI assistance:
1. **Information Consolidation** - Upload RFP, reference proposals, concept documents
2. **Concept Review** - Review AI analysis, edit concept document
3. **Structure & Workplan** - Generate AI proposal template, select sections
4. **Proposal Review** - Upload draft, get AI feedback

## Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt

# Infrastructure
cd infrastructure && npm install && npm run deploy:testing
```

See `frontend/CLAUDE.md` and `backend/CLAUDE.md` for component-specific guidance.
