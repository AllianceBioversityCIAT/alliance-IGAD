# Product Requirements Document — IGAD Innovation Hub

> **Status:** Living document · **Owner:** Product · **Last reviewed:** 2026-07-01
> **Constitutional baseline** — this is one of four foundation documents. See also
> [`system-design/design.md`](./system-design/design.md),
> [`detailed-design/detailed-design.md`](./detailed-design/detailed-design.md),
> and the spec templates under [`specs/general-setup/`](./specs/general-setup/).

---

## 1. Overview & Purpose

The **IGAD Innovation Hub** is a regional, AI-powered digital platform that helps
governments, NGOs, and research institutions across the Horn of Africa produce
higher-quality grant proposals and stay informed through curated knowledge. The
platform surfaces IGAD-related knowledge (ICPAC, CEWARN, IDDRSI, and other IGAD
sources) and applies AWS Bedrock LLMs to reduce the time and expertise required to
write competitive, well-structured funding proposals.

The immediate product surface (MVP) is the **Proposal Writer** tool, supported by
document management, an admin prompt manager, and Cognito-backed authentication.
The **Newsletter Generator** is envisioned but currently disabled/under construction.

## 2. Problem Statement

Writing competitive grant proposals in the IGAD region is slow, expertise-bound,
and inconsistent. Applicants must digest dense RFPs, structure a compliant response,
reuse prior work, and self-assess quality — usually without specialist support. This
leads to missed deadlines, weak submissions, and under-utilized regional funding.

The Hub addresses this by turning an RFP plus reference material into a guided,
AI-assisted drafting workflow with feedback loops, transparency, and prompt
augmentation that guides non-expert users.

## 3. Target Personas

| Persona | Role | Primary Need |
|---|---|---|
| **Government officer** | Ministry/agency staff writing funding proposals | Compliant, well-structured drafts under deadline pressure |
| **NGO program lead** | Proposal author at a regional NGO | Reuse prior proposals; accelerate first drafts |
| **Research institution staff** | Grant writer at a research body | Evidence-backed structure and workplan generation |
| **IGAD staff / admin** | Platform operator | Manage and audit AI prompts; oversee quality and access |

Roles are modeled in the system as `Government | NGO | Research | IGAD_Staff`.

## 4. Goals & Success Metrics

**Goals**
- Reduce time-to-first-draft for a grant proposal.
- Improve structural completeness and RFP compliance of submissions.
- Give non-experts transparent, guided AI assistance with human-in-the-loop control.
- Let admins manage AI behavior (prompts) without code changes.

**Success Metrics (targets to validate — see Open Questions)**
- **Time-to-first-draft:** measurable reduction vs. manual baseline.
- **Workflow completion rate:** % of started proposals that reach Step 4 (draft feedback).
- **AI operation reliability:** async analysis success rate ≥ 95%; p95 completion within the 5-minute polling window.
- **Draft feedback adoption:** % of proposals where users apply AI feedback before download.
- **Admin autonomy:** prompt edits shipped via the admin UI with zero code deploys.

## 5. Scope

### In Scope
- **Proposal Writer** 4-step workflow: (1) Information Consolidation, (2) Concept Review,
  (3) Structure & Workplan, (4) Proposal Review.
- **Document Management:** upload/delete RFPs, concept files, reference proposals, and
  supporting documents, with async vectorization (PDF/DOCX).
- **Admin Prompt Manager:** create, edit, publish, and audit AI prompts.
- **Authentication:** Cognito login, password reset, session refresh, protected/admin routes.
- **Dashboard:** list, sort, paginate, and resume proposals.

### Out of Scope (current)
- **Newsletter Generator** (disabled / under construction).
- Additional IGAD terminals: Report Generator, Policy Analyzer, Agribusiness.
- Real-time multi-user collaboration on a single proposal.
- Non-PDF/DOCX document vectorization.
- Multi-region deployment / disaster-recovery failover (single region `us-east-1`).

## 6. User Stories

- As a **proposal author**, I upload an RFP and reference proposals so the platform
  can analyze requirements and reuse prior work.
- As a **proposal author**, I review the AI's RFP analysis and edit the generated
  concept document so it reflects my intent before proceeding.
- As a **proposal author**, I generate a structured proposal template and select the
  sections I need so I start from a compliant outline.
- As a **proposal author**, I upload my draft and receive AI feedback so I can improve
  quality before submission, then download the result.
- As a **returning user**, I see my proposals on a dashboard and resume an in-progress
  one, including any long-running AI operation still processing.
- As an **admin**, I edit and publish the prompts that drive each AI step so I can tune
  behavior without a code deploy.
- As any **user**, I sign in securely and reset my password when needed.

## 7. Acceptance Criteria

- A proposal author can complete Steps 1→4 end to end for a valid RFP.
- Long-running AI operations run asynchronously and report status via polling
  (3s interval, 5-minute timeout) without blocking the UI.
- Changing an upstream input **invalidates downstream analyses** per the cascade:
  RFP change clears all analyses; concept change clears concept analysis, structure,
  template, and draft feedback; template regeneration clears draft feedback.
- Only PDF and DOCX documents are accepted for vectorization; other types are rejected
  with a clear message.
- Admin-only routes are inaccessible to non-admin roles.
- Prompt edits published in the admin UI take effect for subsequent AI operations
  without redeployment.

## 8. Assumptions, Dependencies, & Constraints

**Assumptions**
- Users bring their own RFP and reference material; the Hub does not source RFPs.
- Prompts may arrive in mixed placeholder formats (`{{KEY}}` and `{[KEY]}`) and both
  must be substituted.

**Dependencies**
- **AWS Bedrock** for LLM inference (cross-region inference profile model IDs,
  e.g. `us.anthropic.*`). Legacy Claude model IDs are revoked after ~30 days of
  inactivity — keep `app/tools/**/config.py` current.
- **AWS Cognito** for identity; **DynamoDB** (single-table) for data; **S3** for
  documents and **S3 Vectors** for embeddings.
- **IGAD Knowledge Network (IGAD-KN)** as the envisioned upstream knowledge source.

**Constraints**
- Serverless-only, single region `us-east-1`, AWS profile `IBD-DEV`.
- Two environments: `igad-testing-*` and `igad-prod-*`; deploy to testing first.
- Backend runs under Lambda (Mangum adapter); long tasks must be async + polled.

## 9. Open Questions

- What are the committed numeric targets for time-to-first-draft and completion rate?
- Which IGAD-KN sources are live vs. planned, and what is the ingestion contract?
- Is the Newsletter Generator on the near-term roadmap or indefinitely deferred?
- Are the aspirational infra items in `specs/architecture/` (ElastiCache, EventBridge,
  multi-region) planned, or should they be pruned from the design of record?
- What data-retention / privacy policy governs uploaded proposals and RFPs?

---

*Downstream feature specs live under [`specs/`](./specs/) and must trace their
requirements back to the goals and user stories above.*
