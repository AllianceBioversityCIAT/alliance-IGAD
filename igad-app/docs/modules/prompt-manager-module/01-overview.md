# Prompt Manager Module - Architecture Overview

> AI prompt lifecycle management for the IGAD Innovation Hub. Allows admins to create, version, preview, and manage prompts used by the Proposal Writer and Newsletter Generator.

## Purpose

Centralized management of AI prompts with:
- Version tracking (create/update prompt versions)
- Active/inactive toggle with conflict detection
- Comments and discussion threads
- Change history audit trail
- Category variable injection (e.g., `{{category_1}}`, `{{categories}}`)
- AI preview via AWS Bedrock
- Runtime retrieval for Proposal Writer and Newsletter Generator

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TanStack React Query, React Router v6 |
| Backend | FastAPI, Pydantic v2, boto3 (DynamoDB) |
| Database | DynamoDB (single-table design) |
| AI Preview | AWS Bedrock |
| Styling | CSS Modules |

## Architecture Diagram

```
Frontend (React)                          Backend (FastAPI)
┌─────────────────────┐                  ┌──────────────────────┐
│ PromptManagerPage    │──listPrompts────▶│ GET /admin/prompts/  │
│ PromptEditorPage     │──createPrompt───▶│ POST /admin/prompts/ │
│                      │──updatePrompt───▶│ PUT  /admin/prompts/ │
│ usePrompts hook      │──deletePrompt───▶│ DELETE /admin/prompts│
│ promptService        │──toggleActive───▶│ POST  .../toggle     │
│                      │──preview────────▶│ POST  .../preview    │
│                      │──comments───────▶│ GET/POST .../comments│
│                      │──history────────▶│ GET  .../history     │
└─────────────────────┘                  └──────────┬───────────┘
                                                     │
                                         ┌───────────▼───────────┐
                                         │    PromptService      │
                                         │    (DynamoDB CRUD)    │
                                         └───────────┬───────────┘
                                                     │
                                         ┌───────────▼───────────┐
                                         │  DynamoDB Single Table │
                                         │  PK: prompt#{id}      │
                                         │  SK: version#/comment#│
                                         │      /change#         │
                                         └───────────────────────┘

Runtime Access (non-admin):
┌────────────────────┐    ┌──────────────────────────┐
│ Proposal Writer    │───▶│ GET /prompts/section/{s}  │
│ Newsletter Gen.    │    │ (no auth required)        │
└────────────────────┘    └──────────────────────────┘
```

## Features

| Feature | Description |
|---------|-------------|
| **CRUD** | Create, read, update, delete prompts |
| **Versioning** | Each prompt tracks version number |
| **Active/Inactive** | Toggle with conflict detection (unique per section+route+subsection+categories) |
| **Comments** | Threaded comments with replies |
| **Change History** | Audit trail of all modifications |
| **Category Variables** | `{{category_1}}`, `{{categories}}` injection |
| **AI Preview** | Test prompts via Bedrock before publishing |
| **Filtering** | By section, tag, route, search text, active status |
| **Pagination** | Server-side with limit/offset |

## File Tree

```
backend/
  app/
    handlers/
      admin_prompts.py              # 13 admin endpoints + auth
    tools/admin/prompts_manager/
      service.py                    # PromptService (DynamoDB CRUD)
      routes.py                     # 2 runtime endpoints
    shared/schemas/
      prompt_model.py               # All Pydantic models

frontend/
  src/
    tools/admin/
      pages/
        PromptManagerPage.tsx       # List view
        PromptEditorPage.tsx        # Create/edit form
        components/
          PromptCard.tsx            # Prompt card in list
          PromptFilters.tsx         # Filter controls
          PromptPreview.tsx         # AI preview panel
          CommentSection.tsx        # Comments UI
          ChangeHistory.tsx         # History timeline
          CategorySelector.tsx      # Category picker
          ... (more components)
      hooks/
        usePrompts.ts              # React Query hooks
        useAdmin.ts                # Admin verification
      services/
        promptService.ts           # API service
    types/
      prompt.ts                    # TypeScript interfaces
```

## Integration Points

- **Proposal Writer:** Retrieves prompts via `GET /prompts/section/proposal_writer`
- **Newsletter Generator:** Retrieves prompts via `GET /prompts/section/newsletter_generator`
- **Category injection:** Runtime replaces `{{category_1}}` with actual category values
- **Admin access:** All admin endpoints require admin auth via `get_current_admin_user`
