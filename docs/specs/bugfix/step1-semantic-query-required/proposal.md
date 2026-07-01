# Proposal: Fix "Step 1 must be completed with semantic_query" error on RFP-only path

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/step1-semantic-query-required` |
| Status | Draft (proposal) |
| Author | JuanCode (with Claude) |
| Date | 2026-07-01 |
| Type | Bugfix |
| Related baseline | `docs/detailed-design/detailed-design.md` (§4–5 async AI worker), `docs/prd.md` (Proposal Writer acceptance criteria) |

## 2. Intent

Let a user complete **Step 1 → Step 2** when they upload only an **RFP + initial concept**
(no reference proposals), instead of hitting a hard `400 Bad Request`. Reference proposals
must remain **optional** inputs, as the UI already advertises.

## 3. Problem / Current Behavior

When a proposal is started in Step 1 with **RFP + initial concept only** and the user clicks
**Analyze & Continue**, the flow fails with:

```json
{ "detail": "Step 1 (RFP analysis) must be completed with semantic_query before Step 2." }
```

- Frontend surface: `POST /api/proposals/{id}/analyze-step-2` returns **400**
  (`proposalService.ts:258`), shown as "Invalid Request" + "Analysis failed (400)".
- The same flow **works** when RFP **+ reference proposals + concept** are all uploaded.

**Sequence (`ProposalWriterPage.tsx` ~1461–1472):**
1. `analyzeStep1()` → triggers async RFP analysis on the worker Lambda.
2. `pollStep1Status()` resolves when `step-1-status.overall_status === "completed"`,
   which is just `analysis_status_rfp` (`routes.py:1750,1771`).
3. `analyzeStep2()` is called **immediately**. Its prerequisite gate
   (`routes.py:1562–1592`) re-reads the proposal via `db_client.get_item` and requires
   `rfp_analysis.semantic_query` (flat or nested).

**Leading root cause (to confirm in specify):** the worker writes
`analysis_status_rfp="completed"` **and** the `rfp_analysis` blob (which contains
`semantic_query`) in one `update_item_sync` (`worker.py:191–206`), but `get_item` uses
**eventual consistency** (no `ConsistentRead`, `database/client.py:68`). Right after Step 1
flips to "completed", the Step 2 gate can read a **stale item** missing `rfp_analysis`/
`semantic_query` and fail hard. The RFP-only path is fast, so it hits this window; the
reference-proposals path persists RFP analysis earlier (extra upload/vectorization time),
so the read is fresh and it "works." `semantic_query` is produced by RFP analysis alone
(`rfp_analysis/service.py:126`) and does **not** depend on reference proposals — confirming
this is a read-timing/validation defect, not missing data.

## 4. Proposed Outcome

- Completing Step 1 with only RFP + concept advances to Step 2 reliably (no spurious 400).
- The Step 2 prerequisite gate reflects **committed** state, not a stale replica.
- Reference proposals and existing work stay optional; when absent, Step 2 semantic search
  is simply skipped without error.

## 5. Scope

- Backend `analyze-step-2` prerequisite check in
  `igad-app/backend/app/tools/proposal_writer/routes.py` (~1562–1592).
- The proposal read it relies on (`db_client.get_item` / a consistent-read variant in
  `app/database/client.py`).
- Possibly the `analyzeStep1 → analyzeStep2` handoff in
  `frontend/src/tools/proposal-writer/pages/ProposalWriterPage.tsx`.
- Deploy to testing via `igad-app/scripts/deploy-fullstack-testing.sh` (AWS profile `IBD-DEV`, `us-east-1`).

## 6. Non-Goals

- No change to how `semantic_query` is generated during RFP analysis.
- No change to reference-proposals / existing-work analysis logic itself.
- No broader refactor of the Step 1–4 polling architecture.
- Not making reference proposals required.

## 7. Affected Users, Systems, And Specs

- **Users:** all proposal authors starting with the minimal (RFP + concept) input set.
- **Systems:** Proposal Writer API (`ApiFunction`), worker Lambda, DynamoDB single table.
- **Specs:** new `docs/specs/bugfix/step1-semantic-query-required/`; aligns with
  `docs/prd.md` acceptance criteria and `docs/detailed-design/detailed-design.md` §4–5.

## 8. Requirement Delta Preview

### ADDED Requirements
- WHEN Step 1 RFP analysis has completed, THE SYSTEM SHALL evaluate the Step 2
  prerequisite against **committed** proposal state (consistent read and/or bounded retry),
  not an eventually-consistent replica.
- WHEN no reference proposals and no existing work are present, THE SYSTEM SHALL allow
  Step 2 to proceed (skipping semantic search) without a `400`.

### MODIFIED Requirements
- The `analyze-step-2` prerequisite check changes from "fail immediately if
  `semantic_query` not visible" to "confirm RFP completion authoritatively, then proceed."

### REMOVED Requirements
- None.

## 9. Approach Options

**Option A — Consistent read on the Step 2 gate (smallest).**
In `analyze-step-2`, fetch the proposal with a `ConsistentRead` (add a `get_item(..., consistent=True)` path in `client.py`). Optionally add a short bounded retry (e.g. 2–3× / ~1s) before failing.
- ✅ Directly fixes the read-timing race; minimal surface; no behavior change when data is present.
- ⚠️ Slightly higher read cost/latency on one endpoint (negligible).

**Option B — Relax the gate when there's nothing to semantically search.**
Require only that RFP analysis is `completed`; treat `semantic_query` as needed **only** when reference proposals or existing work exist. Combine with Option A's consistent read.
- ✅ Also covers legitimately-empty inputs; matches "references are optional."
- ⚠️ Must ensure downstream steps that consume `semantic_query` still behave when it is absent.

**Option C — Frontend resilience only.**
On a Step 2 `400`, re-poll `step-1-status` and retry `analyze-step-2`.
- ✅ No backend change.
- ⚠️ Masks the defect, adds UI complexity, still races; not a real fix.

## 10. Recommended Approach

**Option A + B (consistent read on the gate, and require `semantic_query` only when there is
something to search).** This fixes the actual eventual-consistency race at the source and
makes the RFP-only path first-class, while keeping reference proposals optional. It is the
smallest change that is also correct for the empty-inputs case. Confirm the eventual-
consistency root cause first (reproduce on testing, inspect worker logs), since the fix
shape depends on it.

## 11. Risks, Dependencies, And Open Questions

- **Root cause confirmation:** verify via reproduction + worker/API logs that the 400 is a
  stale read (vs. a structural mismatch or an RFP analysis that silently produced an empty
  `semantic_query`). This gates the final approach.
- **Downstream `semantic_query` consumers:** `reference_proposals_analysis/service.py` and
  `existing_work_analysis/service.py` also require `semantic_query` — confirm they are only
  invoked when their inputs exist, so relaxing the gate does not push the error downstream.
- **Consistent-read cost:** trivial at current scale; acceptable.
- **Deploy constraint:** testing deploy only, `IBD-DEV` profile, `us-east-1`; do not deploy to production as part of the fix.

## 12. Success Criteria

- A new proposal with **RFP + concept only** completes Step 1 and reaches Step 2 with no
  `400` across repeated fresh runs (including fast click-through).
- The **RFP + references + concept** path continues to work unchanged.
- A regression test reproduces the stale-read / empty-inputs condition and passes after the fix.
- No new errors surface in downstream steps when `semantic_query` is legitimately absent.

## 13. Next Step

```text
/sdd-specify bugfix/step1-semantic-query-required
```
