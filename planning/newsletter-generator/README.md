# Newsletter Generator - Implementation Plan

**Version:** 1.0  
**Last Updated:** 2026-01-26  
**Status:** MVP Development  
**Author:** Claude Opus 4.5 (Implementation) + Antigravity (Testing)

---

## Overview

This folder contains the detailed implementation plan for the Newsletter Generator tool MVP. The plan is designed for AI-assisted development with clear specifications and acceptance criteria.

## MVP Scope

The MVP includes **4 steps** (reduced from the original 6):

| Step | Name | Description |
|------|------|-------------|
| 1 | Configuration | Audience, tone, format, frequency settings |
| 2 | Content Planning | Select information types + RAG from Knowledge Base |
| 3 | Outline Review | AI-generated outline with edit capabilities |
| 4 | Drafting & Export | Generate newsletter + download PDF/DOCX/HTML |

### Out of MVP Scope
- Step 5: Preview (multiple format previews)
- Step 6: Automation (scheduling, distribution lists)
- Document uploads in Step 2 (using RAG only)
- Chatbot in Step 4 (nice to have for future)

---

## Architecture

### RAG Integration
- **Knowledge Base ID:** `NPDZSLKCYX`
- **Knowledge Base Name:** `knowledge-base-igad-web-scraping`
- **Content:** 17 web pages with tagged dates
- **Query Type:** Combined query for selected topics

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite + CSS Modules
- **Backend:** FastAPI (Python) + AWS Lambda
- **Database:** DynamoDB (single-table design)
- **AI:** Amazon Bedrock (Claude Sonnet 4)
- **RAG:** Bedrock Knowledge Base

### Key Patterns (from Proposal Writer)
- Secondary Navbar with status badge
- Sidebar with step progress indicators
- Async Lambda workers for AI generation
- LocalStorage + DynamoDB persistence
- Prompt Manager integration

---

## Folder Structure

```
planning/newsletter-generator/
├── README.md                      # This file
│
├── 00-foundation/                 # Base architecture and setup
│   ├── foundation-overview.md
│   ├── frontend-structure.md
│   ├── backend-structure.md
│   ├── dynamodb-schema.md
│   ├── shared-components.md
│   └── knowledge-base-integration.md
│
├── step-1-configuration/          # Step 1 implementation
│   ├── step1-overview.md
│   ├── step1-frontend.md
│   ├── step1-backend.md
│   └── step1-acceptance-criteria.md
│
├── step-2-content-planning/       # Step 2 implementation + RAG
│   ├── step2-overview.md
│   ├── step2-frontend.md
│   ├── step2-backend.md
│   ├── step2-rag-integration.md
│   └── step2-acceptance-criteria.md
│
├── step-3-outline-review/         # Step 3 implementation + AI
│   ├── step3-overview.md
│   ├── step3-frontend.md
│   ├── step3-backend.md
│   ├── step3-ai-generation.md
│   └── step3-acceptance-criteria.md
│
├── step-4-drafting/               # Step 4 implementation + Export
│   ├── step4-overview.md
│   ├── step4-frontend.md
│   ├── step4-backend.md
│   ├── step4-ai-generation.md
│   ├── step4-export-formats.md
│   └── step4-acceptance-criteria.md
│
└── testing/                       # Test plans
    ├── antigravity-test-plan.md
    └── deployment-checklist.md
```

---

## Implementation Order

### Phase 1: Foundation
1. Create folder structures (frontend + backend)
2. Set up shared components (copy from Proposal Writer)
3. Create Knowledge Base service (with KIRO assistance)
4. Set up DynamoDB schema
5. Add routes to main app

### Phase 2: Step 1 - Configuration
1. Create `Step1Configuration.tsx`
2. Implement form components
3. Create backend CRUD endpoints
4. Test data persistence

### Phase 3: Step 2 - Content Planning
1. Create `Step2ContentPlanning.tsx`
2. Implement RAG integration
3. Create backend endpoints for topics + retrieval
4. Test Knowledge Base queries

### Phase 4: Step 3 - Outline Review
1. Create `Step3OutlineReview.tsx`
2. Implement AI outline generation
3. Create Lambda worker task
4. Test outline editing

### Phase 5: Step 4 - Drafting & Export
1. Create `Step4Drafting.tsx`
2. Implement AI draft generation
3. Create export functionality (PDF, DOCX, HTML)
4. Test download formats

### Phase 6: Testing & Deployment
1. Run Antigravity E2E tests
2. Verify with `deploy-fullstack-testing.sh`
3. Check DynamoDB data integrity
4. Documentation update

---

## Related Documentation

- **Technical Specs (CRAS):** `specs/tools/newsletter-generator/specs-newsletter-generator-seed.md`
- **Design Specs:** `specs/mockups/newsletter-generator/specifications.md`
- **Proposal Writer Reference:** `igad-app/frontend/src/tools/proposal-writer/`

---

## Quick Links

- [Figma Design](https://www.figma.com/design/mUmeInkEfKNUMpWKYcOv11/IGAD?node-id=955-4044&m=dev)
- [Knowledge Base Console](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/knowledge-bases/NPDZSLKCYX)

---

## Change Log

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-26 | 1.0 | Claude | Initial MVP planning documentation |
