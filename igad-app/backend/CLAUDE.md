# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Python FastAPI backend for the IGAD Innovation Hub, deployed as AWS Lambda functions. Main feature is the **Proposal Writer** API - handles document processing, AI analysis, and proposal generation.

## Commands

```bash
# Install dependencies
pip install -r requirements.txt

# Code quality (via Makefile)
make format              # Black + isort formatting
make lint                # Flake8 linting
make type-check          # Mypy type checking
make lint-fix            # Format then lint
make check               # All checks without fixing

# Testing
make test                # Run all tests
make test-user           # User management tests only
make test-prompt         # Prompt management tests only
make test-cov            # Tests with coverage report
make all-checks          # Format, lint, docs, type-check, test
```

## Tech Stack

- **Framework:** FastAPI 0.104
- **Validation:** Pydantic v2
- **Database:** DynamoDB (single-table design) via boto3
- **Auth:** AWS Cognito + python-jose
- **Lambda Adapter:** Mangum
- **Observability:** AWS Lambda Powertools
- **Document Processing:** PyPDF2, pdfplumber, python-docx

## Architecture

```
/app
  /routers               # FastAPI route handlers
  /handlers              # Lambda entry points
  /database              # DynamoDB client and operations
  /middleware            # Auth and error handling
  /tools                 # Feature modules
    /proposal_writer     # Main feature
    /newsletter_generator
    /admin
    /auth
  /shared                # Shared utilities
  /utils                 # Helper functions
```

## Proposal Writer

Located in `/app/tools/proposal_writer/`:

```
/rfp_analysis                    # RFP document analysis
/concept_evaluation              # Concept note evaluation
/reference_proposals_analysis    # Reference docs analysis
/structure_workplan              # Structure and workplan generation
/concept_document_generation     # Concept document generation
/proposal_template_generation    # AI proposal template
/proposal_draft_feedback         # Draft feedback analysis
/existing_work_analysis          # Existing work processing
/workflow                        # Orchestration logic
routes.py                        # API endpoints
```

### Key Endpoints Pattern
- `POST /api/proposals/{id}/analyze-*` - Trigger analysis (returns immediately)
- `GET /api/proposals/{id}/*-status` - Poll for completion
- Long-running operations use async processing with status polling

## Code Style

- **Formatter:** Black (line length 88)
- **Import sorting:** isort
- **Linting:** Flake8
- **Type checking:** Mypy
- **Docstrings:** Google style (pydocstyle)

## Prompt Placeholder Formats

When writing code that handles prompt variables/placeholders, **always handle both formats**:

| Format | Example | Pattern |
|--------|---------|---------|
| Double curly braces | `{{VARIABLE_NAME}}` | `{{KEY}}` |
| Curly + square brackets | `{[VARIABLE_NAME]}` | `{[KEY]}` |

**Implementation pattern:**
```python
for key, value in context.items():
    # Format 1: {{KEY}}
    template = template.replace("{{" + key + "}}", str(value))
    # Format 2: {[KEY]}
    template = template.replace("{[" + key + "]}", str(value))
```

**Why:** Prompts come from different sources (DynamoDB, files) with inconsistent formats. Missing replacement causes AI to see raw placeholders instead of actual data.

## Environment Variables

Required in `.env`:
- AWS credentials and region
- Cognito configuration
- DynamoDB table names
- S3 bucket names

## Lambda Deployment

- Entry point: `bootstrap` script
- Handler adapter: Mangum wraps FastAPI app
- SAM template: `template.yaml` in project root
