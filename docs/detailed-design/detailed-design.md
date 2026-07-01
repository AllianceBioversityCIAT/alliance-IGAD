# Detailed Design — Technical Blueprint · IGAD Innovation Hub

> **Constitutional baseline.** The technical system of record: modules, data model,
> API surface, workflows, security, and testing. Paired with
> [`../system-design/design.md`](../system-design/design.md) (UX) and
> [`../prd.md`](../prd.md) (product). Grounded in the current `igad-app/` code, not the
> aspirational infra in `specs/architecture/` (differences are flagged as gaps).

---

## 1. System Overview

A serverless AWS application in a single region (`us-east-1`).

```
React SPA (S3 + CloudFront)
      │  HTTPS / JWT
      ▼
API Gateway ──► ApiFunction (FastAPI via Mangum, Lambda, 512MB/300s)
                    │  async invoke
                    ├──► AnalysisWorkerFunction (Lambda, 1024MB/900s) ──► Bedrock
                    ├──► DynamoDB (single table, PK/SK + GSI1)
                    ├──► S3 (proposal documents) + S3 Vectors (embeddings)
                    └──► Cognito (identity)
```

- **Frontend:** React 18 + TypeScript + Vite SPA, served from S3 behind CloudFront
  (SPA routing via a CloudFront Function).
- **Backend:** one FastAPI app (`app/main.py`) wrapped by Mangum (`bootstrap` handler),
  plus a dedicated async **worker** Lambda for long AI operations.
- **Deploy path of record:** root `template.yaml` (**AWS SAM**). A parallel **CDK**
  stack (`infrastructure/`) fully provisions the table + Cognito; SAM references
  pre-existing `igad-testing-*` resources. See §11 gap.

## 2. Domain Modules & Responsibilities

Backend uses "screaming architecture": features live under `app/tools/`, each analysis
sub-feature is a folder pairing `service.py` (logic + Bedrock calls) with `config.py`
(a `*_SETTINGS` dict: model id, max_tokens, temperature).

| Module | Path | Responsibility |
|---|---|---|
| Proposal Writer | `app/tools/proposal_writer/` | Core feature; `routes.py` (~35 endpoints) + sub-features below |
| ↳ RFP analysis | `.../rfp_analysis/` | Extract RFP requirements |
| ↳ Concept evaluation | `.../concept_evaluation/` | Evaluate concept note |
| ↳ Reference proposals | `.../reference_proposals_analysis/` | Analyze prior proposals |
| ↳ Existing work | `.../existing_work_analysis/` | Process supporting work |
| ↳ Concept doc gen | `.../concept_document_generation/` | Generate concept document |
| ↳ Structure/workplan | `.../structure_workplan/` | Generate structure + workplan |
| ↳ Template gen | `.../proposal_template_generation/` | Generate proposal template |
| ↳ Document gen | `.../proposal_document_generation/` | Generate proposal document (DOCX) |
| ↳ Draft feedback | `.../proposal_draft_feedback/` | Evaluate uploaded draft |
| ↳ Worker | `.../workflow/worker.py` | Async Lambda orchestrator (SAM handler `...worker.handler`) |
| Newsletter | `app/tools/newsletter_generator/` | Outline + draft generation (disabled in UI) |
| Admin | `app/tools/admin/` | `settings/`, `prompts_manager/` (CRUD + audit) |
| Auth | `app/tools/auth/` | `CognitoUserManagementService`, routes |
| Documents | `app/shared/documents/` | Upload/delete, extraction |
| Vectors | `app/shared/vectors/` | `VectorEmbeddingsService` (embeddings/storage) |
| AI | `app/shared/ai/` | `BedrockService`, `knowledge_base_service` |
| Database | `app/database/client.py` | `DynamoDBClient` singleton `db_client` |
| History | `app/shared/database/` | `history_service` + `history_decorator` (audit) |

Scaffolded-only (init-only) terminals: `agribusiness_hub/`, `policy_analyzer/`,
`report_generator/`.

## 3. Data Model & Entities

**Single-table design.** Table `TABLE_NAME` (default `igad-testing-main-table`),
`PAY_PER_REQUEST`. Keys `PK`/`SK`; **one** GSI named **`GSI1`** (`GSI1PK`/`GSI1SK`).
`DynamoDBClient.query_items` switches key names when `index_name == "GSI1"`.

> ⚠️ **Reality vs. spec:** `specs/architecture/data-models.md` describes a richer model
> with **GSI2** and detailed entities (collaborators, exports, analytics). The running
> code implements **only GSI1**. Treat GSI2 and those sub-structures as **aspirational**
> until implemented; new specs must design against GSI1 or justify adding GSI2.

Representative item patterns in use:

| Entity | PK | SK | Notes |
|---|---|---|---|
| Proposal metadata | `PROPOSAL#<id>` | `METADATA` | Status attrs e.g. `analysis_status_rfp` |
| Proposal section | `PROPOSAL#<id>` | `SECTION#<id>` | Order/version fields |
| User profile | `USER#<id>` | `PROFILE` | Role in `Government|NGO|Research|IGAD_Staff` |
| Prompt | prompt-manager keys | | Managed via admin UI |

- Access layer exposes async (`get_item`, `put_item`, `update_item`, `query_items`,
  `batch_*`, `scan_*`) **and** sync (`get_item_sync`, `update_item_sync`) variants — the
  worker Lambda uses the sync ones.
- Audit/history via `history_decorator` on write paths.

## 4. API Surface & Contracts

Routers registered in `app/main.py`: health, auth, proposal_writer, newsletter_generator,
documents, admin settings, admin prompts (+ `handlers/admin_prompts.py`), vectors,
`routers/history.py`. Validation via **Pydantic v2**.

**Async trigger + poll contract** (the core pattern for AI work):

```
POST /api/proposals/{id}/analyze-rfp            → 202-style immediate ack, async invoke
GET  /api/proposals/{id}/analysis-status        → { status: processing|completed|failed }
```

Same shape for: concept generation (`generate-concept-document` + `*-status`), structure,
template (`generate-proposal-template` / `generate-ai-proposal-template`), draft feedback
(`analyze-draft-feedback` + `draft-feedback-status`), plus CRUD and DOCX-download
endpoints. Newsletter mirrors it (`generate-outline`/`outline-status`,
`generate-draft`/`draft-status`, `retrieve-content`/`retrieval-status`, `export`).

**Contract rules for new endpoints:**
- Long/AI operations MUST be async trigger + status endpoint; never block the request.
- Re-raise `HTTPException`; wrap unexpected errors as HTTP 500 with a `detail` message.
- Auth enforced per-router/dependency (see §8).

## 5. Backend Workflows & Business Rules

- **Async orchestration:** `ApiFunction` writes state + status attributes to DynamoDB and
  async-invokes `AnalysisWorkerFunction`. The worker (`workflow/worker.py`, 15-min timeout)
  drives service singletons synchronously and updates status; the SPA polls the status
  endpoint (3s / 5-min).
- **Invalidation cascade** (enforced across API + UI): RFP change → clear all analyses;
  concept change → clear concept analysis, structure, template, draft feedback; template
  regeneration → clear draft feedback.
- **Bedrock usage:** `BedrockService` (`bedrock-runtime`, `us-east-1`, 600s read timeout,
  3 retries) with `{{variable}}` substitution. Per-feature model/params come from each
  `config.py`. **Prompt handling must substitute both `{{KEY}}` and `{[KEY]}` formats.**

### AI model assignment (from `tools/**/config.py`) — keep current

| Model | ID | Used by |
|---|---|---|
| Kimi K2.5 | `moonshotai.kimi-k2.5` | concept_document_generation, concept_evaluation, proposal_draft_feedback, structure_workplan, proposal_template_generation |
| Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | rfp_analysis, reference_proposals_analysis, existing_work_analysis (fast extraction) |
| Claude Sonnet 4.5 | `us.anthropic.claude-sonnet-4-5-20250929-v1:0` | proposal_document_generation, newsletter outline/draft, default `BedrockService` |

> Bedrock revokes legacy Claude model IDs after ~30 days inactivity. Use cross-region
> inference profile IDs (`us.anthropic.*`), never raw `anthropic.*`.

## 6. Frontend Architecture & State Boundaries

- **Structure:** `src/tools/` (features), `src/shared/` (components/services/hooks),
  `src/pages/`, `src/styles/`, `src/types/`. Path alias `@/*` → `src/*`.
- **Routing:** React Router v6 in `App.tsx`; guards `PublicRoute`/`ProtectedRoute`/
  `AdminRoute`; authed routes nest under `<Layout />`; most pages `React.lazy`.
- **Server state:** React Query v5 (`QueryClient`: `retry: 1`,
  `refetchOnWindowFocus: false`). Feature hooks e.g. `useProposal`, admin `usePrompts`.
- **Client state:** Zustand.
- **HTTP:** Axios via `shared/services/apiClient.ts`; auth in `authService.ts` +
  `tokenManager.ts` (JWT handling + refresh).
- **Proposal Writer:** single `ProposalWriterPage` orchestrator drives Steps 1–4;
  `proposalService.ts` centralizes all API calls; `useProcessingResumption` re-attaches
  polling after refresh; `StepErrorBoundary` isolates step failures.
- **Libraries:** React Hook Form (forms), `novel` (rich text), `recharts` (charts),
  `dompurify` (sanitize), `docx` (Word export), `lucide-react` (icons).

## 7. Integration Points

- **AWS Bedrock** — LLM inference + Knowledge Base (`knowledge_base_service.py`).
- **S3** — `ProposalDocumentsBucket` for uploads; **S3 Vectors** for embeddings
  (`VectorEmbeddingsService`). Only **PDF/DOCX** are vectorized.
- **Cognito** — identity; admin status derived from Cognito groups.
- **IGAD-KN** — envisioned upstream knowledge source (integration not fully wired; gap).

## 8. Security & Authorization Model

- **AuthMiddleware** (`app/middleware/auth_middleware.py`) verifies JWTs via
  `python-jose`. Local/dev uses an `JWT_SECRET` HS256 mock token; the Cognito path
  decodes the access token and enriches via `cognito-idp` (`admin_get_user`,
  `admin_list_groups_for_user`) to derive **admin** from group membership.
- Env: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`. CORS is env-gated by `ENVIRONMENT`
  (`CORS_ALLOWED_ORIGINS`); API docs are disabled outside dev.
- Frontend enforces access via route guards; backend enforces per-router/dependency.

> ⚠️ **Security gap (tracked):** the middleware currently trusts Cognito tokens **without
> full signature/JWKS verification** (flagged in code comments). Proper JWKS validation
> is required before production hardening — a candidate first SDD spec.

## 9. Error Handling & Observability

- **Backend:** `ErrorMiddleware` + `security_middleware`; canonical pattern —
  `except HTTPException: raise` / `except Exception: raise HTTPException(500, detail=...)`.
  AWS Lambda Powertools available for structured logging/tracing; CloudWatch for logs.
- **Frontend:** typed `catch (error: unknown)` narrowing to
  `err.response?.data?.detail || err.message`; user feedback via `useToast()`; step-level
  `StepErrorBoundary`; async progress via `AnalysisProgressModal`.

## 10. Testing Strategy

- **Backend (pytest, `pytest.ini`):** `testpaths=tests`, coverage on `app`
  `--cov-fail-under=80`, `--strict-markers`, `asyncio_mode=auto`. Markers: `unit`,
  `integration`, `slow`, `user_management`, `prompt_management`. Run via `make test` /
  `make test-user` / `make test-prompt` / `make test-cov` / `make all-checks`.
- **Frontend (Vitest):** `npm run test` / `test:ui` / `test:coverage`; RTL installed.
  ⚠️ **Gap:** no `*.test.tsx` suites exist yet — new frontend specs should add them.
- **Infrastructure:** Jest (`infrastructure/test/igad-hub.test.ts`) via `npm run test`.
- **Verification per layer** (used by tasks/execution): frontend
  `npm run type-check && npm run lint && npm run test`; backend `make check && make test`;
  infra `npm run build && npm run test`.

## 11. Technical Constraints & Assumptions

- **Serverless only**, single region `us-east-1`, AWS profile `IBD-DEV`.
- **Environments:** `igad-testing-*` and `igad-prod-*`; **deploy testing first**, then
  production (human-gated). Deploy scripts in `igad-app/scripts/`.
- **Lambda limits:** API 512MB/300s; worker 1024MB/900s. Anything longer than 15 min
  must be re-architected (chunking/step-through), not run inline.
- **SAM vs CDK divergence (gap):** `template.yaml` (SAM) is the deployed path and assumes
  pre-existing table/Cognito; `infrastructure/` (CDK) provisions them. Pick one as the
  source of truth to avoid drift — an open decision.
- **Aspirational in `specs/architecture/` but not in code:** GSI2, ElastiCache,
  EventBridge, SQS/SNS pipelines, multi-region DR. Do not assume these exist.
