# 🔍 Structure Workplan Analysis & Fixes

## 📊 Executive Summary

**Status**: ❌ **CRITICAL ERRORS FOUND**
**Issue**: Structure Workplan analysis times out after 100 attempts (5 minutes)
**Root Cause**: Multiple syntax errors and code duplication in `worker.py`

---

## 🐛 Problems Found

### 1. **CRITICAL: Syntax Errors in `worker.py`**

**Location**: `igad-app/backend/app/tools/proposal_writer/workflow/worker.py`

**Problem**: Multiple `elif analysis_type == "structure_workplan"` blocks scattered throughout the file causing syntax errors.

**Found at lines**:
- Line 68: Inside `_set_processing_status()` - calls `_handle_structure_workplan_analysis()` but MISSING return statement
- Line 101: Duplicate block in `_set_processing_status()` - incomplete `db_client.update_item_sync()` missing closing parenthesis
- Line 110: Another duplicate block - starts but never completes
- Line 127: Inside `_set_failed_status()` - incomplete block
- Line 214: Inside `_set_completed_status()` - calls `_handle_structure_workplan_analysis()` instead of saving data
- Line 318: Inside `_set_failed_status()` - duplicate block
- Line 353: Inside `_set_failed_status()` - yet another duplicate

**Code excerpt showing the problem**:

```python
# Line 68-70 in _set_processing_status():
elif analysis_type == "structure_workplan":
    _handle_structure_workplan_analysis(proposal_id)  # ❌ WRONG! This is NOT status update

# Line 101-109 in _set_processing_status():
elif analysis_type == "structure_workplan":
    db_client.update_item_sync(
        pk=f"PROPOSAL#{proposal_id}",
        sk="METADATA",
        update_expression="SET analysis_status_structure_workplan = :status, structure_workplan_started_at = :started",
        expression_attribute_values={
            ":status": "processing",
            ":started": datetime.utcnow().isoformat(),
        },
    # ❌ Missing closing parenthesis! Next elif starts immediately

# Line 110-126:
elif analysis_type == "structure_workplan":  # ❌ DUPLICATE!
    db_client.update_item_sync(
        pk=f"PROPOSAL#{proposal_id}",
        sk="METADATA",
        update_expression="""
            SET analysis_status_structure_workplan = :status,
                structure_workplan_error = :error,
                structure_workplan_failed_at = :failed,
                updated_at = :updated
        """,
        expression_attribute_values={
            ":status": "failed",  # ❌ This is setting FAILED status in _set_processing_status()!
            ":error": error_msg,  # ❌ error_msg is not defined here!
            ":failed": datetime.utcnow().isoformat(),
            ":updated": datetime.utcnow().isoformat(),
        },
    )
```

**Impact**: Python cannot parse the file, causing the Lambda function to fail silently.

---

### 2. **Missing Proper Handler Implementation**

**Location**: `worker.py:841-851`

**Current Code**:
```python
def _handle_structure_workplan_analysis(proposal_id: str) -> Dict[str, Any]:
    """Handle structure and workplan analysis"""
    logger.info(f"🏗️ Starting structure workplan analysis for {proposal_id}")
    _set_processing_status(proposal_id, "structure_workplan")  # ❌ ALREADY DONE BY ROUTES.PY!

    service = StructureWorkplanService()
    result = service.analyze_structure_workplan(proposal_id)

    _set_completed_status(proposal_id, "structure_workplan", result)
    logger.info(f"✅ Structure workplan analysis completed for {proposal_id}")
    return result
```

**Problem**: Calls `_set_processing_status()` which calls `_handle_structure_workplan_analysis()` again → infinite recursion risk!

**Comparison with working pattern** (`_handle_concept_analysis`):
```python
def _handle_concept_analysis(proposal_id: str) -> Dict[str, Any]:
    logger.info(f"📋 Processing concept analysis for: {proposal_id}")

    # 1. Retrieve proposal and validate prerequisites
    proposal = db_client.get_item_sync(...)
    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    # 2. Get dependencies (RFP, reference proposals, etc.)
    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    # 3. Update status to processing
    _set_processing_status(proposal_id, "concept")

    # 4. Execute analysis
    analyzer = SimpleConceptAnalyzer()
    result = analyzer.analyze_concept(...)

    # 5. Save result
    _set_completed_status(proposal_id, "concept", result)
    return result
```

**What's missing**:
- ✅ Validation of prerequisites (RFP and concept_evaluation)
- ✅ Proper error handling
- ✅ Loading proposal data before calling service
- ❌ `_set_processing_status()` is being called AFTER routes.py already called it

---

### 3. **Service.py Pattern is Correct**

**Location**: `igad-app/backend/app/tools/proposal_writer/structure_workplan/service.py`

**Status**: ✅ **CORRECT** - Follows the same pattern as `concept_evaluation/service.py`

**Verification**:
```python
# Lines 18-144 follow correct pattern:
def analyze_structure_workplan(self, proposal_id: str) -> Dict[str, Any]:
    # 1. Load proposal ✅
    proposal = db_client.get_item_sync(pk=pk, sk="METADATA")

    # 2. Get dependencies ✅
    rfp_analysis = proposal.get('rfp_analysis', {})
    concept_evaluation = proposal.get('concept_evaluation')

    # 3. Validate ✅
    if not rfp_analysis:
        raise Exception("RFP analysis not found...")

    # 4. Get prompt from DynamoDB ✅
    table.scan(FilterExpression=...)

    # 5. Inject context into prompt ✅
    user_prompt = user_prompt_template.replace(...)

    # 6. Call Bedrock ✅
    response = self.bedrock.invoke_claude(...)

    # 7. Parse response ✅
    analysis_json = json.loads(...)

    # 8. Save to DynamoDB ✅
    db_client.update_item_sync(...)

    return result
```

---

### 4. **Routes.py Pattern is Correct**

**Location**: `igad-app/backend/app/tools/proposal_writer/routes.py:1637-1762`

**Status**: ✅ **MOSTLY CORRECT** - Follows the async pattern

**Verification**:
```python
@router.post("/{proposal_id}/analyze-step-3")
async def analyze_step_3(proposal_id: str, user=Depends(get_current_user)):
    # 1. Verify proposal ownership ✅
    # 2. Check prerequisites ✅
    # 3. Check if already completed ✅
    # 4. Check if already processing ✅
    # 5. Update status to processing BEFORE invoking worker ✅
    await db_client.update_item(
        update_expression="SET analysis_status_structure_workplan = :status, structure_workplan_started_at = :started",
    )

    # 6. Invoke Worker Lambda asynchronously ✅
    lambda_client.invoke(
        FunctionName=worker_function_arn,
        InvocationType='Event',
        Payload=json.dumps({
            "proposal_id": proposal_code,
            "analysis_type": "structure_workplan"
        })
    )

    # 7. Return immediately ✅
    return {"status": "processing", ...}
```

---

### 5. **Frontend Pattern is Correct**

**Location**: `igad-app/frontend/src/tools/proposal-writer/pages/ProposalWriterPage.tsx:836-895`

**Status**: ✅ **CORRECT** - Follows the polling pattern

**Verification**:
```typescript
// Step 2: Execute Step 3 analysis (Structure and Workplan) before proceeding
if (currentStep === 2) {
  // 1. Check if already exists ✅
  if (structureWorkplanAnalysis) {
    proceedToNextStep()
    return
  }

  // 2. Set loading state ✅
  setIsAnalyzingRFP(true)
  setAnalysisProgress({ step: 1, total: 1, message: 'Generating...' })

  // 3. Call backend API ✅
  const result = await proposalService.analyzeStep3(proposalId!)

  // 4. Poll for completion ✅
  if (result.status === 'processing') {
    await pollAnalysisStatus(
      () => proposalService.getStructureWorkplanStatus(proposalId!),
      statusResult => {
        if (statusResult.data) {
          setStructureWorkplanAnalysis(statusResult.data)
        }
        return statusResult.data
      },
      'Structure Workplan'
    )
  }

  // 5. Proceed to next step ✅
  proceedToNextStep()
}
```

---

## 🔧 Required Fixes

### Fix 1: Clean up `worker.py` - Remove ALL duplicate `structure_workplan` blocks

**File**: `igad-app/backend/app/tools/proposal_writer/workflow/worker.py`

#### A. Fix `_set_processing_status()` (Lines 34-145)

**REMOVE** lines 68-70:
```python
    elif analysis_type == "structure_workplan":
        _handle_structure_workplan_analysis(proposal_id)
```

**KEEP ONLY** lines 101-109 (but ADD missing closing parenthesis):
```python
    elif analysis_type == "structure_workplan":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="SET analysis_status_structure_workplan = :status, structure_workplan_started_at = :started",
            expression_attribute_values={
                ":status": "processing",
                ":started": datetime.utcnow().isoformat(),
            },
        )  # ✅ ADD THIS CLOSING PARENTHESIS
```

**REMOVE** lines 110-145 (entire duplicate failed status block):
```python
    elif analysis_type == "structure_workplan":  # ❌ DELETE THIS ENTIRE BLOCK
        db_client.update_item_sync(
            ...failed status code...
        )
```

#### B. Fix `_set_completed_status()` (Lines 148-283)

**REMOVE** line 214-216:
```python
        elif analysis_type == "structure_workplan":
            _handle_structure_workplan_analysis(proposal_id)
```

**ADD** proper save logic at line 127 (after `existing_work` block):
```python
    elif analysis_type == "structure_workplan":
        analysis_data = result.get("structure_workplan_analysis", {})
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET structure_workplan_analysis = :analysis,
                    analysis_status_structure_workplan = :status,
                    structure_workplan_completed_at = :completed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":analysis": analysis_data,
                ":status": "completed",
                ":completed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
```

#### C. Fix `_set_failed_status()` (Lines 286-406)

**REMOVE** duplicate blocks at lines 318-334 and 353-354.

**KEEP ONLY ONE** block (after `existing_work` block):
```python
    elif analysis_type == "structure_workplan":
        db_client.update_item_sync(
            pk=f"PROPOSAL#{proposal_id}",
            sk="METADATA",
            update_expression="""
                SET analysis_status_structure_workplan = :status,
                    structure_workplan_error = :error,
                    structure_workplan_failed_at = :failed,
                    updated_at = :updated
            """,
            expression_attribute_values={
                ":status": "failed",
                ":error": error_msg,
                ":failed": datetime.utcnow().isoformat(),
                ":updated": datetime.utcnow().isoformat(),
            },
        )
```

#### D. Fix `_handle_structure_workplan_analysis()` (Lines 841-851)

**Replace** entire function:

```python
def _handle_structure_workplan_analysis(proposal_id: str) -> Dict[str, Any]:
    """
    Execute structure and workplan analysis.

    Args:
        proposal_id: Proposal identifier

    Returns:
        Analysis result from StructureWorkplanService

    Raises:
        Exception: If proposal/RFP/concept not found or analysis fails
    """
    logger.info(f"📋 Processing structure workplan analysis for: {proposal_id}")

    # Retrieve proposal and validate dependencies (same as concept analysis)
    proposal = db_client.get_item_sync(
        pk=f"PROPOSAL#{proposal_id}", sk="METADATA"
    )

    if not proposal:
        raise Exception(f"Proposal {proposal_id} not found")

    rfp_analysis = proposal.get("rfp_analysis")
    if not rfp_analysis:
        raise Exception("RFP analysis must be completed first")

    # Check for concept_evaluation or concept_analysis
    concept_eval = proposal.get("concept_evaluation") or proposal.get("concept_analysis")
    if not concept_eval:
        raise Exception("Concept evaluation must be completed first")

    logger.info("✅ Prerequisites validated")

    # Set processing status
    _set_processing_status(proposal_id, "structure_workplan")

    logger.info("🔍 Starting structure workplan analysis...")
    service = StructureWorkplanService()
    result = service.analyze_structure_workplan(proposal_id)

    logger.info("✅ Structure workplan analysis completed successfully")
    logger.info(f"📊 Result keys: {list(result.keys())}")

    _set_completed_status(proposal_id, "structure_workplan", result)
    logger.info("💾 Structure workplan result saved to DynamoDB")

    return result
```

#### E. Verify handler routing (Lines 780-791)

**VERIFY** this code exists and is correct:
```python
        # Route to appropriate analysis handler
        if analysis_type == "rfp":
            _handle_rfp_analysis(proposal_id)
        elif analysis_type == "reference_proposals":
            _handle_reference_proposals_analysis(proposal_id)
        elif analysis_type == "existing_work":
            _handle_existing_work_analysis(proposal_id)
        elif analysis_type == "concept":
            _handle_concept_analysis(proposal_id)
        elif analysis_type == "structure_workplan":
            _handle_structure_workplan_analysis(proposal_id)  # ✅ This should be here
        elif analysis_type == "concept_document":
            _handle_concept_document_generation(proposal_id, event)
        else:
            raise ValueError(f"Invalid analysis_type: {analysis_type}")
```

---

## 📝 Summary of Changes

### Files to Modify: 1
- ✏️ `igad-app/backend/app/tools/proposal_writer/workflow/worker.py`

### Files Already Correct: 3
- ✅ `igad-app/backend/app/tools/proposal_writer/structure_workplan/service.py`
- ✅ `igad-app/backend/app/tools/proposal_writer/routes.py`
- ✅ `igad-app/frontend/src/tools/proposal-writer/pages/ProposalWriterPage.tsx`

### Changes Summary:
1. **Remove** 6 duplicate `elif analysis_type == "structure_workplan"` blocks
2. **Fix** 1 missing closing parenthesis in `_set_processing_status()`
3. **Add** proper completion status save in `_set_completed_status()`
4. **Fix** `_handle_structure_workplan_analysis()` to follow concept analysis pattern
5. **Verify** handler routing in main `handler()` function

---

## 🧪 Testing Checklist

After applying fixes:

1. ✅ **Syntax Check**: `python -m py_compile worker.py`
2. ✅ **Deploy**: Run deployment script
3. ✅ **Test Flow**:
   - Complete Step 1 (RFP + Concept)
   - Complete Step 2 (Concept Review)
   - Click "Continue to Structure & Workplan" button
   - Verify polling succeeds within 2 minutes
   - Verify Step 3 loads with structure data

---

## 🔍 Root Cause Analysis

**How did this happen?**

KIRO likely copy-pasted code blocks for `structure_workplan` and accidentally:
1. Duplicated entire `elif` blocks multiple times
2. Left some blocks incomplete (missing closing parenthesis)
3. Mixed status update logic (processing/failed/completed) in wrong functions
4. Called `_handle_structure_workplan_analysis()` inside status update functions

**Why didn't it fail immediately?**

- Python syntax errors in Lambda functions fail silently
- Lambda logs would show import/syntax errors, but frontend just sees timeout
- Status stays "processing" forever because worker never runs successfully

---

## 📚 Pattern Reference

For future implementations, always follow this pattern:

```python
# 1. Status update functions (NEVER call handlers, ONLY update DB)
def _set_processing_status(proposal_id, analysis_type):
    if analysis_type == "new_analysis":
        db_client.update_item_sync(...)  # Set status = "processing"

def _set_completed_status(proposal_id, analysis_type, result):
    if analysis_type == "new_analysis":
        db_client.update_item_sync(...)  # Set status = "completed", save result

def _set_failed_status(proposal_id, analysis_type, error_msg):
    if analysis_type == "new_analysis":
        db_client.update_item_sync(...)  # Set status = "failed", save error

# 2. Handler function (orchestrates the flow)
def _handle_new_analysis(proposal_id: str) -> Dict[str, Any]:
    logger.info(f"📋 Starting {analysis_type}...")

    # Validate prerequisites
    proposal = db_client.get_item_sync(...)
    if not proposal:
        raise Exception("Not found")

    # Set status
    _set_processing_status(proposal_id, "new_analysis")

    # Execute
    service = NewAnalysisService()
    result = service.analyze(proposal_id)

    # Save result
    _set_completed_status(proposal_id, "new_analysis", result)

    return result

# 3. Main handler (routes to appropriate handler)
def handler(event, context):
    analysis_type = event.get("analysis_type")

    if analysis_type == "new_analysis":
        _handle_new_analysis(proposal_id)
```

---

**Next Steps**: Apply fixes to `worker.py` and test deployment.
