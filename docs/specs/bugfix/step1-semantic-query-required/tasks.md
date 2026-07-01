# Tasks: Fix "Step 1 must be completed with semantic_query" on RFP-only path

> Depth: Standard (lean bugfix). Status markers: `[ ]` not started · `[~]` in progress · `[x]` done (Reviewer PASS).
> Verification base: run from `igad-app/backend/` unless noted. Deploy is testing-only, profile `IBD-DEV`, `us-east-1`.

## Task Graph

- T1 → (none)
- T2 → T1
- T3 → (none)          # regression test scaffolding can start in parallel
- T4 → T2, T3

## Tasks

### [x] T1: Add consistent-read option to DynamoDB `get_item`
- **Requirements:** REQ-1, NFR-1, NFR-2
- **Design:** design.md §"Change 1"
- **Layer:** backend
- **Size:** XS
- **Dependencies:** none
- **Scope:** `igad-app/backend/app/database/client.py` — extend async `get_item` with
  `consistent: bool = False`, passing `ConsistentRead=True` when set. Default preserves all
  existing callers.
- **Tests:** unit test asserting `ConsistentRead=True` is passed when `consistent=True` and
  omitted otherwise (mock/patch the boto3 table). Add to `tests/` (e.g. a
  `test_dynamo_client` module or existing DB test).
- **Verification:** `make check && make test`
- **Done when:** `get_item(consistent=True)` sets `ConsistentRead`; existing callers unchanged; tests pass.
- **Skills:** `fastapi-serverless`, `aws-serverless`

### [x] T2: Make `analyze-step-2` prerequisite authoritative (consistent read + bounded retry)
- **Requirements:** REQ-1, NFR-1, NFR-3
- **Design:** design.md §"Change 2"
- **Layer:** backend
- **Size:** S
- **Dependencies:** T1
- **Scope:** `igad-app/backend/app/tools/proposal_writer/routes.py` (`analyze_step_2`, ~1550–1595):
  - Read the proposal with `consistent=True`.
  - Extract `semantic_query` via a small `_extract_semantic_query` helper (preserve flat +
    nested handling).
  - Wrap the prerequisite in a bounded retry (`MAX_PREREQ_ATTEMPTS≈3`, `≈0.6s` sleep via
    `asyncio.sleep`) that only loops while `analysis_status_rfp == "completed"` but the blob
    isn't visible; exit immediately on genuine missing prerequisite.
  - Preserve ownership/`user_id`/`proposal_code` checks and existing log lines; add retry +
    final-failure logs (NFR-3).
- **Tests:** unit tests in `tests/app/tools/proposal_writer/test_routes.py`:
  1. `semantic_query` present on first consistent read → `200`, Step 2 analyses started.
  2. First read missing blob then present on retry (status `completed`) → `200`.
  3. RFP never completed (`rfp_analysis` absent, status not `completed`) → `400`, no long loop.
- **Verification:** `make check && make test`
- **Done when:** all three tests pass; the read uses `consistent=True`; retry is bounded and
  short-circuits the true-missing case.
- **Skills:** `fastapi-serverless`, `error-handling-patterns`, `systematic-debugging`

### [x] T3: RFP-only end-to-end regression test (Step 2 with empty corpus)
- **Requirements:** REQ-2, REQ-3
- **Design:** design.md §"Why the async workers need no change"
- **Layer:** backend (test)
- **Size:** S
- **Dependencies:** none (can run in parallel with T1/T2; asserts against final gate behavior)
- **Scope:** Add a test covering: a proposal with completed RFP (with `semantic_query`) and
  **no** reference/existing-work documents passes the Step 2 gate and triggers both workers,
  and that the reference/existing-work services return `completed/skipped` for an empty corpus
  (`reference_proposals_analysis/service.py:150`, `existing_work_analysis/service.py:142`).
  Guard REQ-3 by keeping/extending an existing test for the multi-document path.
- **Tests:** `tests/app/tools/proposal_writer/test_routes.py` (+ service-level assertion if
  practical).
- **Verification:** `make check && make test`
- **Done when:** RFP-only Step 2 path is covered and green; multi-document path test still green.
- **Skills:** `fastapi-serverless`, `systematic-debugging`

### [ ] T4: Deploy to testing and validate the reproduction
- **Requirements:** REQ-1, REQ-2, REQ-3, NFR-4
- **Design:** design.md §"Risks, Observability, Rollback"
- **Layer:** deploy / verification
- **Size:** S
- **Dependencies:** T2, T3
- **Scope:** Deploy backend to testing and manually reproduce the original bug scenario.
  - `cd igad-app && AWS_PROFILE=IBD-DEV ./scripts/deploy-fullstack-testing.sh --backend-only`
  - In the app, create a fresh proposal, upload **only** RFP + initial concept, click
    **Analyze & Continue**, and confirm it advances past Step 2 with no `400`.
  - Repeat several fast fresh runs (the race is timing-sensitive).
  - Confirm the multi-document path still works.
  - Inspect CloudWatch logs for the worker/API to confirm retry logs appear only when
    expected and no `semantic_query` failures remain (root-cause confirmation).
- **Verification:** manual — RFP-only proposal reaches Step 3 across ≥3 fresh runs; CloudWatch shows no prerequisite 400s.
- **Done when:** the reported error no longer reproduces on testing; multi-document path
  unaffected; logs confirm the stale-read hypothesis (or surface an alternative to feed back
  into the spec via the Pivot Protocol).
- **Skills:** `aws-serverless`, `verify`

## Notes

- **Do not deploy to production** as part of this spec (NFR-4). Production is a separate
  human-gated step after testing sign-off.
- If T4 shows the failure is *not* a stale read (e.g. RFP analysis emits an empty
  `semantic_query`), stop and escalate (Pivot Protocol) — the fix shape would change.
