# Foundation Overview

## Purpose

This document describes the foundational architecture and technical decisions for the Newsletter Generator MVP.

---

## MVP Scope Definition

### Included (4 Steps)

| Step | Purpose | AI Integration |
|------|---------|----------------|
| Step 1: Configuration | Set up audience, tone, format, frequency | None |
| Step 2: Content Planning | Select topics, retrieve content via RAG | Knowledge Base RAG |
| Step 3: Outline Review | Generate and edit newsletter outline | Claude AI |
| Step 4: Drafting & Export | Generate draft, download in multiple formats | Claude AI |

### Excluded from MVP

| Feature | Reason | Future Phase |
|---------|--------|--------------|
| Step 5: Preview | Multiple format previews add complexity | Phase 2 |
| Step 6: Automation | Scheduling requires additional infrastructure | Phase 2 |
| Document uploads in Step 2 | RAG from Knowledge Base is sufficient | Phase 2 |
| Chatbot in Step 4 | Nice-to-have, not core functionality | Phase 2 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Step 1    │  │   Step 2    │  │   Step 3    │  │ Step 4  │ │
│  │   Config    │──│   Topics    │──│   Outline   │──│  Draft  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│         │               │                │               │       │
└─────────┼───────────────┼────────────────┼───────────────┼───────┘
          │               │                │               │
          ▼               ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    /api/newsletters                          ││
│  │  POST /           GET /{id}        PUT /{id}    DELETE /{id} ││
│  │  PUT /{id}/topics POST /{id}/retrieve-content                ││
│  │  POST /{id}/generate-outline  GET /{id}/outline-status       ││
│  │  POST /{id}/generate-draft    GET /{id}/draft-status         ││
│  │  GET /{id}/export/{format}                                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
          │               │                │               │
          ▼               ▼                ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AWS SERVICES                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  DynamoDB   │  │  Knowledge  │  │   Bedrock   │  │   S3    │ │
│  │  (storage)  │  │    Base     │  │  (Claude)   │  │ (files) │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### 1. Reuse Proposal Writer Patterns

| Pattern | Source | Adaptation |
|---------|--------|------------|
| Layout + Sidebar | `ProposalLayout.tsx` | Rename to `NewsletterLayout.tsx`, update step count |
| Secondary Navbar | `ProposalSecondaryNavbar.tsx` | Change breadcrumb text |
| Step Configuration | `stepConfig.ts` | Define 4 steps with new icons |
| Service Layer | `proposalService.ts` | New endpoints for newsletters |
| AI Generation | `concept_document_generation/service.py` | Template for outline/draft generation |

### 2. DynamoDB Single-Table Design

- **Same table** as proposals: `igad-testing-main-table`
- **Different PK prefix**: `NEWSLETTER#` instead of `PROPOSAL#`
- **No impact** on existing proposal data

### 3. RAG with Knowledge Base

- **Query type**: Combined query (all selected topics in one request)
- **Service location**: `app/shared/ai/knowledge_base_service.py`
- **AWS Client**: `bedrock-agent-runtime` (not `bedrock-runtime`)

### 4. AI Generation with Lambda Workers

- **Pattern**: Same as Proposal Writer
- **Async invocation**: Frontend polls for status
- **Timeout**: 15 minutes for long-running generation

### 5. Export Formats

| Format | Library | Styling |
|--------|---------|---------|
| PDF | `reportlab` or `weasyprint` | Professional newsletter layout |
| DOCX | `python-docx` | Styled headings, sections |
| HTML | Template rendering | Responsive, email-compatible |

---

## File Structure (Target)

### Frontend
```
igad-app/frontend/src/tools/newsletter-generator/
├── components/
│   ├── NewsletterLayout.tsx
│   ├── NewsletterSecondaryNavbar.tsx
│   ├── NewsletterSidebar.tsx
│   ├── AudienceCheckboxGroup.tsx
│   ├── ToneSlider.tsx
│   ├── InformationTypeToggle.tsx
│   └── OutlineSection.tsx
├── pages/
│   ├── NewsletterGeneratorPage.tsx
│   ├── Step1Configuration.tsx
│   ├── Step2ContentPlanning.tsx
│   ├── Step3OutlineReview.tsx
│   ├── Step4Drafting.tsx
│   └── newsletterStepConfig.ts
├── hooks/
│   ├── useNewsletter.ts
│   └── useNewsletterDraft.ts
├── services/
│   └── newsletterService.ts
├── types/
│   └── newsletter.ts
└── index.tsx
```

### Backend
```
igad-app/backend/app/tools/newsletter_generator/
├── __init__.py
├── routes.py
├── config/
│   ├── __init__.py
│   └── service.py
├── topics/
│   ├── __init__.py
│   └── service.py
├── outline/
│   ├── __init__.py
│   ├── config.py
│   └── service.py
├── draft/
│   ├── __init__.py
│   ├── config.py
│   └── service.py
├── export/
│   ├── __init__.py
│   └── service.py
└── workflow/
    ├── __init__.py
    └── worker.py
```

---

## Timeline Estimate

| Phase | Duration | Focus |
|-------|----------|-------|
| Foundation | 2 days | Setup, shared components, KB service |
| Step 1 | 2 days | Configuration form, CRUD |
| Step 2 | 3 days | Topics + RAG integration |
| Step 3 | 3 days | Outline generation + editing |
| Step 4 | 3 days | Draft generation + exports |
| Testing | 2 days | E2E tests, deployment verification |
| **Total** | **~15 days** | |

---

## Dependencies

### External
- AWS Bedrock Knowledge Base (already configured)
- AWS Bedrock Claude (already configured)
- DynamoDB table (already exists)

### Internal
- Proposal Writer patterns (copy/adapt)
- BedrockService (already exists)
- Prompt Manager (for AI prompts)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Knowledge Base query latency | Cache results in DynamoDB |
| AI generation timeout | Use Lambda workers with retry logic |
| Export format complexity | Start with simple styling, iterate |
| Data corruption | Separate PK prefix for newsletters |
