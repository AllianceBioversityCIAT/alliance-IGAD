# Requirements: Fix "Step 1 must be completed with semantic_query" on RFP-only path

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/step1-semantic-query-required` |
| Depth | Standard (lean bugfix) |
| Status | Draft |
| Author | JuanCode (with Claude) |
| Date | 2026-07-01 |
| Source intent | [`proposal.md`](./proposal.md) |
| Baseline refs | `docs/prd.md` (Proposal Writer acceptance criteria), `docs/detailed-design/detailed-design.md` §4–5 |

## Executive Summary

Starting a proposal with **only an RFP + initial concept** (no reference proposals) and
clicking **Analyze & Continue** intermittently fails with `400 Bad Request`:
`"Step 1 (RFP analysis) must be completed with semantic_query before Step 2."` The same flow
succeeds when reference proposals are also uploaded. Root cause: the `POST
/analyze-step-2` prerequisite gate re-reads the proposal with an **eventually-consistent**
DynamoDB read immediately after Step 1 flips to `completed`, so it can observe the
`analysis_status_rfp = "completed"` flag before the `rfp_analysis` blob (which contains
`semantic_query`) is visible on the replica it reads. This spec makes that prerequisite read
**authoritative** so the RFP-only path is reliable, while keeping reference proposals optional.

## Glossary

| Term | Meaning |
|---|---|
| `semantic_query` | Vector-search query string generated during RFP analysis (`rfp_analysis/service.py:126`) and stored inside the persisted `rfp_analysis` object. |
| Step 1 | RFP analysis only (`POST /analyze-step-1` → poll `GET /step-1-status`). |
| Step 2 | Reference-proposals + existing-work analysis (`POST /analyze-step-2`). |
| Prerequisite gate | The block in `analyze-step-2` (`routes.py:1562–1592`) that requires a `semantic_query` before proceeding. |
| Eventually-consistent read | DynamoDB `get_item` without `ConsistentRead=True` (`database/client.py:68`), which may return a slightly stale replica. |
| RFP-only path | A proposal whose only uploaded inputs are the RFP document and an initial concept (no reference proposals, no existing work). |

## System Context & Scope

**In scope**
- The `analyze-step-2` prerequisite check and the proposal read it depends on
  (`igad-app/backend/app/tools/proposal_writer/routes.py`, `app/database/client.py`).
- End-to-end verification of the RFP-only Step 1 → Step 2 → Step 3 hand-off.

**Out of scope**
- How `semantic_query` is generated during RFP analysis.
- Reference-proposals / existing-work analysis logic (already degrade gracefully to
  `completed/skipped` when no documents exist — `reference_proposals_analysis/service.py:150`,
  `existing_work_analysis/service.py:142`).
- The broader Step 1–4 polling architecture.
- Making reference proposals a required input.

## Stakeholders / Personas

| Persona | Interest |
|---|---|
| Proposal author (Government / NGO / Research) | Must be able to start a proposal with the minimal input set and proceed without errors. |
| IGAD staff / admin | Fewer support incidents from a confusing, non-deterministic 400. |

## Functional Requirements

### REQ-1: Authoritative Step 2 prerequisite read

The system SHALL evaluate the `analyze-step-2` prerequisite (RFP completion and
`semantic_query` availability) against **committed** proposal state, not an
eventually-consistent replica, so that a Step 1 completion reported by `step-1-status` is
immediately honored by `analyze-step-2`.

The system SHALL, if the `rfp_analysis`/`semantic_query` is not yet visible on a first read,
re-read the committed item a small bounded number of times (a few attempts over ≤ ~2s)
before returning an error, to absorb any residual replication window.

#### Scenario: Fast click-through on RFP-only proposal
- GIVEN a proposal with only an RFP document and an initial concept
- AND Step 1 RFP analysis has just completed (`analysis_status_rfp = "completed"`)
- WHEN the frontend calls `POST /analyze-step-2` immediately after `step-1-status` reports completion
- THEN the endpoint SHALL read the committed proposal and find `semantic_query`
- AND SHALL return `200` with Step 2 analyses started (not `400`)

#### Scenario: Genuinely missing RFP analysis
- GIVEN a proposal for which RFP analysis has never completed (`rfp_analysis` absent and status not `completed`)
- WHEN `POST /analyze-step-2` is called
- THEN the endpoint SHALL return `400` with a clear prerequisite message
- AND SHALL NOT enter an unbounded retry loop

### REQ-2: RFP-only path completes Step 1 → Step 2 → Step 3

The system SHALL allow a proposal with no reference proposals and no existing-work
documents to complete Step 2 successfully, with the reference-proposals and existing-work
analyses reported as `completed` (skipped, empty corpus) rather than failing.

#### Scenario: Step 2 with empty corpus
- GIVEN an RFP-only proposal that has passed the Step 2 prerequisite
- WHEN Step 2 analyses run
- THEN reference-proposals and existing-work analyses SHALL each resolve to `completed`
- AND the frontend Step 2 polling SHALL resolve without error
- AND the user SHALL advance to Step 3 (concept analysis)

### REQ-3: No regression for the multi-document path

The system SHALL preserve current behavior for proposals that include reference proposals
and/or existing work.

#### Scenario: Full input set
- GIVEN a proposal with RFP + reference proposals + initial concept
- WHEN the user clicks Analyze & Continue
- THEN Step 1 → Step 2 → Step 3 SHALL complete as they do today, with reference-proposals
  analysis producing real results

## Non-Functional Requirements

- **NFR-1 (Correctness):** The prerequisite decision MUST be deterministic given committed
  state — no dependency on replica timing.
- **NFR-2 (Latency/Cost):** The authoritative read MUST NOT add meaningful latency; a
  consistent read plus at most a few short retries is acceptable (single-digit extra reads,
  ≤ ~2s worst case, only on the rare stale-read path).
- **NFR-3 (Observability):** When the gate must retry or ultimately fails, the system SHALL
  log enough context (proposal code, available `rfp_analysis` keys, attempt count) to
  distinguish a stale-read retry from a true missing-prerequisite.
- **NFR-4 (Deployment safety):** Changes MUST be deployable to testing only via
  `igad-app/scripts/deploy-fullstack-testing.sh` (AWS profile `IBD-DEV`, `us-east-1`);
  production deployment is a separate human-gated step.

## Requirement ID Index

| ID | Title | Covered by tasks |
|---|---|---|
| REQ-1 | Authoritative Step 2 prerequisite read | T1, T2, T4 |
| REQ-2 | RFP-only path completes end-to-end | T3, T4 |
| REQ-3 | No regression for multi-document path | T3, T4 |
| NFR-1 | Deterministic correctness | T1, T2 |
| NFR-2 | Latency/cost | T1 |
| NFR-3 | Observability | T2 |
| NFR-4 | Deployment safety | T4 |
