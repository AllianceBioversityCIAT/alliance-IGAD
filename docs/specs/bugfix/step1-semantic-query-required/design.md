# Design: Fix "Step 1 must be completed with semantic_query" on RFP-only path

## Document Control

| Field | Value |
|---|---|
| Spec path | `bugfix/step1-semantic-query-required` |
| Depth | Standard (lean bugfix) |
| Status | Draft |
| Author | JuanCode (with Claude) |
| Date | 2026-07-01 |
| Implements | [`requirements.md`](./requirements.md) REQ-1..REQ-3, NFR-1..NFR-4 |

## Executive Summary

Make the `analyze-step-2` prerequisite gate read **committed** proposal state. Add a
`ConsistentRead` capability to the DynamoDB access layer and use it (with a small bounded
retry) in `analyze-step-2` before deciding whether `semantic_query` is available. No change
to RFP analysis, reference/existing-work services, or the frontend flow is required for the
fix; a frontend safety-net retry is considered and **rejected** as unnecessary.

## Architecture Overview

Current failing sequence (RFP-only):

```
Frontend (ProposalWriterPage.tsx:1462-1472)
  analyzeStep1 ──► POST /analyze-step-1 ──► async worker: RFP analysis
  pollStep1Status ──► GET /step-1-status  (resolves when analysis_status_rfp == "completed")
  analyzeStep2 ──► POST /analyze-step-2
                     └─ get_item(PK, METADATA)   ← EVENTUALLY CONSISTENT (client.py:68)
                        gate: needs rfp_analysis.semantic_query (routes.py:1562-1592)
                        └─ stale replica: flag "completed" seen, rfp_analysis blob not yet → 400
```

The worker writes `analysis_status_rfp="completed"` **and** the `rfp_analysis` blob in a
single `update_item_sync` (`worker.py:191-206`), so the data is committed atomically — but a
**default (eventually-consistent) read** on another replica can reflect the write partially
from the reader's perspective. A **consistent read** on the primary reflects the committed
item, eliminating the race.

Target sequence: the `analyze-step-2` gate performs a consistent read; if `semantic_query`
is still not present, it retries the consistent read a few times over ≤ ~2s before failing.

## Extended Directory Structure

No new files. Changes are confined to:

```
igad-app/backend/app/
├── database/client.py                         # add ConsistentRead support to get_item
└── tools/proposal_writer/routes.py            # analyze-step-2 gate uses consistent read + bounded retry
igad-app/backend/tests/app/tools/proposal_writer/
└── test_routes.py                             # add/extend regression tests for the gate
```

## Data Model

No schema changes. Relevant existing item (single table, `PK=PROPOSAL#<code>`, `SK=METADATA`):

| Attribute | Written by | Read by gate |
|---|---|---|
| `analysis_status_rfp` | worker (`worker.py:196`), routes (`analyze-step-1`) | `step-1-status` (`routes.py:1750`) |
| `rfp_analysis` | worker (`worker.py:195`) — shape `{"rfp_analysis": {…, "semantic_query"}, "status": "completed"}` | `analyze-step-2` gate (`routes.py:1563-1592`) |
| `uploaded_files` | upload endpoints (`routes.py:103-109`) | (informational; not required by this fix) |

The gate already tolerates both flat (`rfp_analysis.semantic_query`) and nested
(`rfp_analysis.rfp_analysis.semantic_query`) shapes — that logic is preserved.

## API Design

No changes to routes, request/response shapes, or status codes on the happy path.
`POST /api/proposals/{proposal_id}/analyze-step-2`:

- **Before:** single eventually-consistent `get_item`; hard `400` if `semantic_query` absent.
- **After:** consistent `get_item`; if `semantic_query` absent, re-read consistently up to
  `MAX_PREREQ_ATTEMPTS` (≈3) with a short sleep (≈0.5–0.7s) between attempts; only then `400`.
- Error body unchanged for the genuine-missing case (REQ-1 scenario 2).

## Backend Module Design

### Change 1 — `app/database/client.py`: consistent-read option

Extend the async `get_item` to accept an optional `consistent: bool = False` and pass
`ConsistentRead=True` to `table.get_item` when set. Default `False` preserves all existing
callers' behavior (NFR-2).

```python
async def get_item(self, pk: str, sk: str, consistent: bool = False) -> Optional[Dict[str, Any]]:
    """Get single item by primary key. Set consistent=True for a strongly consistent read."""
    try:
        kwargs = {"Key": {"PK": pk, "SK": sk}}
        if consistent:
            kwargs["ConsistentRead"] = True
        response = self.table.get_item(**kwargs)
        return response.get("Item")
    except ClientError as e:
        logger.error(f"Error getting item: {e}")
        raise
```

### Change 2 — `app/tools/proposal_writer/routes.py`: authoritative gate with bounded retry

In `analyze-step-2`, read the proposal with `consistent=True` (the read at `routes.py:1550`).
Factor the existing flat/nested `semantic_query` extraction (`routes.py:1570-1592`) into a
small local helper and wrap the prerequisite in a bounded retry:

```python
MAX_PREREQ_ATTEMPTS = 3
PREREQ_RETRY_SECONDS = 0.6

def _extract_semantic_query(rfp_analysis: dict) -> Optional[str]:
    sq = rfp_analysis.get("semantic_query")
    if not sq and "rfp_analysis" in rfp_analysis:
        sq = rfp_analysis.get("rfp_analysis", {}).get("semantic_query")
    return sq

# inside analyze_step_2, replacing the single get_item + gate:
semantic_query = None
for attempt in range(1, MAX_PREREQ_ATTEMPTS + 1):
    proposal = await db_client.get_item(pk=pk, sk="METADATA", consistent=True)
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
    # ownership/code checks (unchanged) ...
    rfp_analysis = proposal.get("rfp_analysis")
    if rfp_analysis:
        semantic_query = _extract_semantic_query(rfp_analysis)
        if semantic_query:
            break
    # Only worth retrying if RFP is (or is becoming) completed
    if proposal.get("analysis_status_rfp") != "completed":
        break
    if attempt < MAX_PREREQ_ATTEMPTS:
        print(f"↻ semantic_query not visible yet for {proposal_code}, retry {attempt}/{MAX_PREREQ_ATTEMPTS}")
        await asyncio.sleep(PREREQ_RETRY_SECONDS)

if not rfp_analysis:
    raise HTTPException(status_code=400, detail="Step 1 (RFP analysis) must be completed before Step 2.")
if not semantic_query:
    print(f"❌ No semantic_query after {MAX_PREREQ_ATTEMPTS} consistent reads for {proposal_code}")
    print(f"   Available keys in rfp_analysis: {list(rfp_analysis.keys())}")
    raise HTTPException(status_code=400, detail="Step 1 (RFP analysis) must be completed with semantic_query before Step 2.")
```

Notes:
- `asyncio` is already available in the FastAPI/Lambda runtime; import if not already.
- The retry is intentionally tiny (≤ ~1.8s worst case) and only loops while
  `analysis_status_rfp == "completed"` but the blob isn't yet visible — the true
  missing-prerequisite case exits immediately (REQ-1 scenario 2, NFR-2).
- Ownership/`proposal_code`/`user_id` checks currently between the read and the gate
  (`routes.py:1550-1560`) move inside/after the loop unchanged.

### Why the async workers need no change

`analyze-step-2` unconditionally invokes the reference-proposals and existing-work workers,
but both already return `{"status": "completed", ... "skipped" ...}` when no documents exist
(`reference_proposals_analysis/service.py:150-165`, `existing_work_analysis/service.py:142-153`).
So once the synchronous gate passes, the RFP-only Step 2 completes cleanly (REQ-2), and
`pollStep2Status` resolves. This is why only the gate read must change.

## Frontend / UX Component Architecture

No changes required. The existing hand-off (`ProposalWriterPage.tsx:1462-1472`,
`pollStep1Status:1612-1652`) is correct once the backend gate is authoritative.

## Shared Contracts or Package Extensions

The new `consistent` parameter on `get_item` is additive and backward-compatible; no other
caller is affected.

## Design Decisions

### DD-1: Fix at the backend gate via consistent read (chosen)
- **Context:** The 400 originates from a stale eventually-consistent read in `analyze-step-2`.
- **Decision:** Add `ConsistentRead` to `get_item` and use it (+ bounded retry) in the gate.
- **Consequences:** Deterministic prerequisite (NFR-1); negligible cost (NFR-2); minimal blast radius.

### DD-2: Bounded retry in addition to consistent read
- **Context:** A single consistent read on the primary should already reflect the committed
  write; the retry is belt-and-suspenders for any Lambda/adapter edge and for the brief
  window where the worker may not have finished its atomic write when the frontend reacts to
  a `completed` status it cached.
- **Decision:** Retry the consistent read ≤3× over ≤ ~1.8s, only while status is `completed`.
- **Consequences:** Robust without risking long hangs; exits fast on true failures.

### DD-3: Do NOT relax the `semantic_query` requirement (rejected Option B)
- **Context:** The proposal floated requiring `semantic_query` only when reference/existing
  work exists.
- **Decision:** Rejected. `semantic_query` is produced by RFP analysis regardless of
  reference docs and is genuinely needed by the Step 2 workers' search path; the real defect
  is the read, not the requirement. Keeping the requirement avoids masking future RFP-analysis
  regressions.

### DD-4: Do NOT add a frontend 400-retry (rejected Option C)
- **Context:** Could catch the 400 and re-poll/retry from the client.
- **Decision:** Rejected as a primary fix — it masks the backend race, adds UI complexity, and
  is unnecessary once DD-1 lands.

## Pivot Update — Real Root Cause & Fix (2026-07-01)

T4 validation disproved the stale-read hypothesis. The persisted `rfp_analysis` for a failing
proposal had `summary.error = "Failed to parse response"` and `semantic_query = ""`, yet
`analysis_status_rfp = "completed"`. The real defect is in
`igad-app/backend/app/tools/proposal_writer/rfp_analysis/service.py`:

- `parse_response` (lines 373-420) uses `re.search(r"\{.*?\}", ...)` (non-greedy → mangles
  nested JSON) and strict `json.loads` (→ rejects trailing "Extra data"). On failure it returns
  an error-fallback dict.
- `analyze_rfp` (lines ~122-132) then calls `_build_semantic_query` on that error dict → empty
  string, sets `result["semantic_query"] = ""`, and returns `status: "completed"`.

### Change 3 — Robust `parse_response` (REQ-4)

Replace the fragile extraction with fence-stripping + `json.JSONDecoder().raw_decode()` from the
first `{`, which parses the first complete, brace-balanced JSON object and ignores trailing data:

```python
def parse_response(self, response: str) -> Dict[str, Any]:
    """Parse Claude's response into structured JSON.

    Tolerant of markdown code fences, leading prose, trailing 'Extra data' after the
    JSON object, and nested objects. Falls back to an error structure only if no valid
    JSON object can be decoded.
    """
    # @sdd-spec bugfix/step1-semantic-query-required
    try:
        text = response.strip()
        # Prefer JSON inside a ```json ... ``` fence when present.
        fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
        if fence:
            text = fence.group(1).strip()
        start = text.find("{")
        if start == -1:
            raise json.JSONDecodeError("No JSON object found in response", text, 0)
        # raw_decode reads ONE complete JSON value and ignores any trailing content.
        parsed, _end = json.JSONDecoder().raw_decode(text, start)
        print("✅ Response parsed successfully")
        return parsed
    except json.JSONDecodeError as e:
        print(f"⚠️  JSON parsing failed: {str(e)}")
        return {
            "summary": {"error": "Failed to parse response", "details": str(e)},
            "extracted_data": {"raw_response": response},
        }
```

Notes: the fence regex uses a greedy `\{.*\}` inside the fence to capture the whole object;
`raw_decode` handles the general (unfenced, trailing-data, nested) case correctly. `re`/`json`
already imported in this module.

### Change 4 — Fail loudly instead of completing empty (REQ-5)

In `analyze_rfp`, after building the semantic query, treat an empty query (or an error-fallback
parse) as a real failure so the worker marks `analysis_status_rfp = "failed"` (the worker's
existing RFP failure path) rather than storing a `completed` record with `semantic_query == ""`:

```python
result = self.parse_response(ai_response)
semantic_query = self._build_semantic_query(result)
if not semantic_query:
    # Parsing failed or produced no usable query — do not complete-empty.
    parse_err = result.get("summary", {}).get("details", "no semantic_query derived")
    raise Exception(f"RFP analysis produced no semantic_query ({parse_err})")
result["semantic_query"] = semantic_query
return {"rfp_analysis": result, "status": "completed"}
```

The worker (`workflow/worker.py`) already catches analyzer exceptions and marks the RFP analysis
`failed` with `rfp_analysis_error`, so Step 1 surfaces a genuine error instead of a misleading
Step-2 400.

### Interaction with T1/T2

The consistent-read gate stays (harmless hardening). With Change 3, `semantic_query` is
populated for parseable RFPs; with Change 4, an unparseable RFP fails at Step 1 (never reaching
the Step-2 gate with an empty query). Net: the RFP-only path completes for valid RFPs.

### Note on already-cached broken proposals

`analyze-step-1` skips re-analysis when `rfp_analysis` already exists. Proposals that already
persisted an empty-`semantic_query` `rfp_analysis` (e.g. `PROP-20260701-2BF9`) will not
self-heal; re-validate with a **fresh** proposal (or by replacing the RFP document, which
re-triggers analysis).

## Risks, Observability, Rollback

- **Risk:** If, contrary to the hypothesis, the 400 is caused by RFP analysis producing an
  empty `semantic_query`, the consistent read won't help. Mitigation: T2 logging captures
  `rfp_analysis` keys on failure to distinguish the cases; confirm on testing (T4).
- **Observability:** Retry and final-failure logs (NFR-3) make the two failure modes
  distinguishable in CloudWatch.
- **Rollback:** Revert the two-file change; behavior returns to prior state. No data
  migration, no schema change.
