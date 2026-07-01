# Execution Log: bugfix/step1-semantic-query-required

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/step1-semantic-query-required` |
| Orchestration | JCSPECS Leader → Implementer → Reviewer |
| Branch | `dev` |
| Started | 2026-07-01 |
| Task source | [`tasks.md`](./tasks.md) |

## Task Execution History

### T1: Add consistent-read option to DynamoDB `get_item` — ✅ PASS (attempt 1/3)

- **Date:** 2026-07-01
- **Requirements covered:** REQ-1, NFR-1, NFR-2
- **Implementer attempts:** 1
- **Attempt 1**
  - **Files changed:**
    - `igad-app/backend/app/database/client.py` — `get_item` gains optional `consistent: bool = False`; passes `ConsistentRead=True` only when set; `# @sdd-spec` traceability comment added. Default path unchanged.
    - `igad-app/backend/tests/test_dynamo_client.py` — new unit test module; asserts `ConsistentRead` present when `consistent=True` and absent by default; mocks boto3 via existing `mock_dynamodb_table` fixture (no real AWS).
  - **Verification command + result:** `flake8/black/isort/mypy` clean on `app/database/client.py`; `python3 -m pytest tests/test_dynamo_client.py -q` → **2 passed**. (Full `make test` suite skipped to avoid pre-existing unrelated failures; targeted evidence provided.)
  - **Reviewer verdict:** **PASS** — "Change implements design §Change 1 exactly; default path byte-for-byte equivalent; existing callers unchanged. `mock_dynamodb_table` fixture confirmed in `tests/conftest.py:9-18`; both test branches genuinely exercised. flake8 `extend-ignore` includes E501 so the 97-char docstring is compliant. No scope creep." Re-ran read-only: 2 passed, flake8 exit 0.
- **Decisions:** Default remains eventually-consistent (NFR-2) — only opt-in callers pay for consistency.
- **Issues:** None.
- **Final verification:** PASS on first attempt.
- **Commit:** `[SPEC:bugfix/step1-semantic-query-required] T1 add consistent-read option to get_item`

### T2: Make `analyze-step-2` prerequisite authoritative — ✅ PASS (attempt 1/3)

- **Date:** 2026-07-01
- **Requirements covered:** REQ-1, NFR-1, NFR-3
- **Implementer attempts:** 1
- **Attempt 1**
  - **Files changed:**
    - `igad-app/backend/app/tools/proposal_writer/routes.py` — added `import asyncio`, `Tuple`; module constants `MAX_PREREQ_ATTEMPTS=3`, `PREREQ_RETRY_SECONDS=0.6`; helpers `_extract_semantic_query` (flat+nested) and `_await_step2_prerequisite` (consistent read + bounded ≤3 retry, sleeps only while `analysis_status_rfp=="completed"` and blob not visible; exits fast on genuinely-missing prereq); `analyze_step_2` now calls the helper. All original 404/403/400 checks and error-detail strings preserved. `# @sdd-spec` comment added.
    - `igad-app/backend/tests/app/tools/proposal_writer/test_routes.py` — +3 tests (present-first-read/no-retry; visible-on-retry with 2 reads + 1 sleep; missing-prereq 400 single-read no-sleep). AWS fully mocked.
  - **Verification command + result:** `flake8 app/tools/proposal_writer/routes.py` → exit 0; `pytest tests/app/tools/proposal_writer/test_routes.py -q` → **18 passed** (3 new + 15 existing).
  - **Reviewer verdict:** **PASS** — conforms to design §Change 2 / REQ-1 / NFR-1 / NFR-3; scope confined to `analyze_step_2` + additive helpers; HTTPException re-raise intact; flake8 clean, 18/18 tests. Non-blocking note: an old informational `print("ℹ️ Found semantic_query in nested structure…")` was dropped (not an NFR-3 requirement; retry/failure logs retained).
- **Environmental issue:** `mypy app/tools/proposal_writer/routes.py` hangs 10+ min on this ~3,100-line file; it stalled the first Implementer agent (killed + agent stopped). Leader verified via `flake8` + full `pytest` instead. **mypy on `routes.py` must be skipped** for backend tasks touching this file.
- **Decisions:** Verification substituted flake8 + targeted/full pytest for the hung mypy step. Pre-existing black nonconformance at `routes.py:~189` left untouched (outside task scope).
- **Issues:** None blocking.
- **Final verification:** PASS on first attempt.
- **Commit:** `[SPEC:bugfix/step1-semantic-query-required] T2 authoritative analyze-step-2 prerequisite`

### T3: RFP-only end-to-end regression test (Step 2 empty corpus) — ✅ PASS (attempt 1/3)

- **Date:** 2026-07-01
- **Requirements covered:** REQ-2, REQ-3
- **Implementer attempts:** 1
- **Attempt 1**
  - **Files changed (test-only):**
    - `igad-app/backend/tests/app/tools/proposal_writer/test_step2_empty_corpus.py` — new, 5 tests. Empty-corpus reference-proposals & existing-work → `status=="completed"`, `documents_analyzed==0`, `structured_data.status=="skipped"` with exact reason strings, and Bedrock `invoke_claude` NOT called (REQ-2); a semantic_query-gate-ordering test; and two ≥1-document tests taking the real analysis path (`invoke_claude` called once, non-skipped result) (REQ-3). Hermetic — patches `db_client`, `VectorEmbeddingsService`, `BedrockService`, `boto3`, `_load_prompt`; no AWS.
  - **Verification command + result:** `flake8 …/test_step2_empty_corpus.py` → exit 0; `pytest …/test_step2_empty_corpus.py -q` → **5 passed**; `pytest tests/app/tools/proposal_writer/ -q` → **23 passed** (no regression).
  - **Reviewer verdict:** **PASS** — test-only scope confirmed (no production `.py` touched); REQ-2 assertions genuine and matched to the real service contracts (`reference_proposals_analysis/service.py:142-154`, `existing_work_analysis/service.py:142-154`); REQ-3 guard meaningful; fully isolated.
- **Decisions:** No production change needed — the graceful-degradation contract was testable via existing seams (confirms design.md §"Why the async workers need no change").
- **Issues:** None.
- **Final verification:** PASS on first attempt.
- **Commit:** `[SPEC:bugfix/step1-semantic-query-required] T3 RFP-only empty-corpus regression tests`

### T4: Deploy to testing and validate the reproduction — 🔶 IN PROGRESS (awaiting user)

- **Date:** 2026-07-01
- **Status:** `[~]` — handed off to the user. This is a cloud deploy (AWS profile `IBD-DEV`,
  `us-east-1`, outward-facing) plus manual browser + CloudWatch validation; it requires the
  user's environment and cannot be completed by the Leader from CI-less local automation.
- **Deploy command:** `cd igad-app && AWS_PROFILE=IBD-DEV ./scripts/deploy-fullstack-testing.sh --backend-only`
- **Manual validation (REQ-1/REQ-2/REQ-3, NFR-4):** create a fresh proposal, upload **only**
  RFP + initial concept, click **Analyze & Continue**, confirm it advances past Step 2 with no
  `400`; repeat several fast fresh runs; confirm the multi-document path still works; inspect
  CloudWatch for the `↻ semantic_query not visible yet…` retry logs (should appear only under
  contention) and confirm no remaining prerequisite 400s → root-cause confirmation.
- **Pivot watch:** if the 400 still reproduces after deploy, the root cause is NOT the stale
  read (e.g. RFP analysis emitting an empty `semantic_query`) → trigger the Pivot Protocol.
- **2026-07-01 — DEPLOY BLOCKED (environmental, unrelated to this spec):** `AWS_PROFILE=IBD-DEV
  ./scripts/deploy-fullstack-testing.sh --backend-only` failed at `sam build`:
  `PythonPipBuilder:ResolveDependencies - {pillow==12.3.0(wheel)}`. Cause: `pdfplumber==0.10.3`
  in `requirements.txt` leaves **Pillow unpinned**, so pip resolves to Pillow **12.3.0**, whose
  wheel does not build/resolve for the Lambda arm64/py3.11 target in the SAM builder. This is a
  pre-existing dependency/build issue — the T1–T3 change never touched `requirements.txt`.
  (iCloud `.aws-sam/build/* [0-9]` duplicate folders were cleaned before the run and were NOT
  the cause.) T4 remains `[~]` pending resolution of the Pillow pin (a build/prod-affecting
  change requiring separate approval) or an alternative deploy path. The code fix (T1–T3) is
  committed and locally verified and does not depend on this deploy to be correct.
- **2026-07-01 — DEPLOY UNBLOCKED & SUCCEEDED:** Two environmental blockers resolved (both
  unrelated to the spec):
  1. Pinned `Pillow>=11,<12` in `requirements.txt` (separate commit `979cd52`) → `sam build`
     **Build Succeeded**.
  2. `sam deploy` requires a running container runtime; Docker was installed but stopped.
     Started Docker Desktop (server 29.2.0) → deploy proceeded.
  CloudFormation: `ApiFunction` + `AnalysisWorkerFunction` both `UPDATE_COMPLETE`;
  "Successfully created/updated stack - igad-backend-testing". Independent check:
  `ApiFunction` LastModified `2026-07-01T14:14:18Z`, State Active, LastUpdateStatus Successful,
  python3.11/arm64. API: `https://c37x0xp38k.execute-api.us-east-1.amazonaws.com/prod/`.
  **The T2 fix is now live in the testing environment.** T4 remains `[~]` pending the user's
  manual browser + CloudWatch validation (below).
- Note: `scripts/deploy-fullstack-testing.sh` masks a failed `sam deploy` as
  "⚠️ Backend deployment skipped (no changes detected)" (its `else` branch), which produced a
  false "success" on the first Docker-less attempt. Worth hardening separately.

## Pivot Record: T4 — root cause is RFP response parse failure, not a stale read

- **Date:** 2026-07-01
- **Trigger:** T4 manual validation on testing still reproduced the exact 400
  (`analyze-step-2` on proposal `PROP-20260701-2BF9` / id `35b98b59-…`), after ~18
  `step-1-status` polls over ~100s — far beyond any eventual-consistency window.
- **Evidence (live DynamoDB item `PROPOSAL#PROP-20260701-2BF9`):**
  - `analysis_status_rfp = "completed"`, `rfp_analysis_completed_at = 2026-07-01T14:38:35Z`.
  - `rfp_analysis` top-level keys: `summary`, `extracted_data`, `semantic_query`.
  - `rfp_analysis.summary = { "error": "Failed to parse response", "details": "Extra data: line 121 column 4 (char 19546)" }`.
  - `rfp_analysis.semantic_query = ""` (empty string). `extracted_data.raw_response` holds the raw model output.
- **Actual root cause:** `SimpleRFPAnalyzer.parse_response` (`rfp_analysis/service.py:373-420`)
  failed `json.loads` on the Bedrock output (`json.JSONDecodeError: Extra data …`) and returned
  its error-fallback dict. `_build_semantic_query` then ran on that error dict, produced an
  **empty** string, and the pipeline stored `semantic_query=""` while still marking RFP
  `completed` (`service.py:126-132`, worker `worker.py:191-206`). `analyze-step-2` is therefore
  *correctly* rejecting an absent `semantic_query`. The fragile parser uses a non-greedy
  `re.search(r"\{.*?\}")` (line 398) and a strict `json.loads`, neither of which tolerates
  nested braces or trailing "Extra data".
- **Why the earlier "works with references" clue was misleading:** it was coincidental — a
  different RFP/response that happened to parse. The proposal explicitly flagged this exact
  alternative as the risk to confirm in T4; T4 confirmed it.
- **Status of T1/T2/T3 work:** the consistent-read gate (T1/T2) is harmless hardening but does
  **not** fix this bug; T3 tests remain valid. Kept as-is (can be reverted if undesired).
- **Revised direction (pending user approval):**
  1. **Robust RFP response parsing** — replace the fragile regex + `json.loads` with tolerant
     extraction: strip markdown fences, then `json.JSONDecoder().raw_decode()` from the first
     `{` to parse the first complete, balanced JSON object and ignore trailing "Extra data";
     fall back to balanced-brace extraction. Result: `_build_semantic_query` gets real data.
  2. **Fail loudly, don't complete-empty** — if RFP parsing genuinely fails (or the built
     `semantic_query` is empty), do NOT mark `analysis_status_rfp="completed"` with an empty
     `semantic_query`; surface a real failure (status `failed`) and/or derive a fallback
     semantic query from the raw RFP text so Step 2 can proceed. This prevents the confusing
     downstream Step-2 400.
- **Action:** HALT execution; requirements/design/tasks to be revised for the real root cause
  after user approval of this pivot.
