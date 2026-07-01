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

### [x] T4: Deploy to testing and validate the reproduction
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

---

## Pivot Tasks (2026-07-01) — real root cause: RFP response parser

> T4 disproved the stale-read hypothesis (see `execution.md` Pivot Record). T1/T2 kept as
> hardening. The following tasks implement the real fix (REQ-4, REQ-5).

### Task Graph (pivot)
- T5 → (none)
- T6 → (none)   # independent of T5; both in rfp_analysis/service.py
- T7 → T5, T6

### [x] T5: Robust `parse_response` (tolerate fences, trailing data, nested JSON)
- **Requirements:** REQ-4
- **Design:** design.md §"Change 3"
- **Layer:** backend
- **Size:** S
- **Dependencies:** none
- **Scope:** `igad-app/backend/app/tools/proposal_writer/rfp_analysis/service.py` `parse_response`
  (lines 373-420). Replace the non-greedy `\{.*?\}` + strict `json.loads` with fence-stripping +
  `json.JSONDecoder().raw_decode()` from the first `{`; keep the error-fallback only when no JSON
  object can be decoded. Add `# @sdd-spec` comment.
- **Tests:** unit tests for `parse_response`: (a) JSON + trailing "Extra data" → parses first
  object; (b) ```json fenced object (with surrounding prose) → parses; (c) nested-object JSON →
  full object, not a fragment; (d) genuinely non-JSON → error-fallback dict. Add e.g.
  `tests/app/tools/proposal_writer/test_rfp_parse_response.py`.
- **Verification (backend, venv):** `flake8 <changed files>`; `pytest <new test module> -q`.
  Do NOT run mypy on routes.py (unrelated); mypy on this service file is fine but optional.
- **Done when:** all four parse tests pass; flake8 clean.
- **Skills:** `fastapi-serverless`, `systematic-debugging`, `error-handling-patterns`

### [x] T6: Fail loudly instead of completing with empty semantic_query
- **Requirements:** REQ-5
- **Design:** design.md §"Change 4"
- **Layer:** backend
- **Size:** XS
- **Dependencies:** none (logically pairs with T5)
- **Scope:** `rfp_analysis/service.py` `analyze_rfp` (~122-132). If `_build_semantic_query`
  returns empty, raise so the worker marks `analysis_status_rfp = "failed"` (worker RFP failure
  path) instead of returning `status: "completed"` with `semantic_query == ""`.
- **Tests:** unit test(s): given a response that yields an empty semantic_query (e.g. the error
  fallback), `analyze_rfp` raises; given a good parse, it returns `status "completed"` with a
  non-empty `semantic_query`. Mock S3/PDF extraction + Bedrock so no AWS.
- **Verification (backend, venv):** `flake8`; `pytest <test module> -q`.
- **Done when:** empty-query path raises; happy path returns completed with non-empty query; tests pass.
- **Skills:** `fastapi-serverless`, `error-handling-patterns`

### [x] T7: Redeploy to testing and re-validate the RFP-only flow
- **Requirements:** REQ-2, REQ-3, REQ-4, REQ-5, NFR-4
- **Design:** design.md §"Note on already-cached broken proposals"
- **Layer:** deploy / verification
- **Size:** S
- **Dependencies:** T5, T6
- **Scope:** Redeploy backend to testing (Docker must be running):
  `cd igad-app && AWS_PROFILE=IBD-DEV ./scripts/deploy-fullstack-testing.sh --backend-only`.
  Re-validate with a **fresh** proposal, RFP + concept only, Analyze & Continue → advances past
  Step 2 with no 400; confirm `semantic_query` is now populated (DynamoDB or CloudWatch); confirm
  a deliberately-broken/unparseable RFP now fails at Step 1 (not a Step-2 400); multi-document
  path still works.
- **Verification:** manual — fresh RFP-only proposal reaches Step 3; DynamoDB item shows
  non-empty `semantic_query`; multi-doc path unaffected.
- **Done when:** the reported error no longer reproduces on a fresh proposal and `semantic_query`
  is populated.
- **Skills:** `aws-serverless`, `verify`

## Notes

- **Do not deploy to production** as part of this spec (NFR-4). Production is a separate
  human-gated step after testing sign-off.
- If T4 shows the failure is *not* a stale read (e.g. RFP analysis emits an empty
  `semantic_query`), stop and escalate (Pivot Protocol) — the fix shape would change.
