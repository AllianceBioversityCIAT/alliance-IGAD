# 📋 Plan: Update Concept Document Response Mapping

**Date:** 2025-11-27  
**Issue:** AI response structure changed - need to update mapping for Step 3 display and download

---

## 🎯 PROBLEM

The AI is now returning a **new JSON structure** (see `JSON.json`):

```json
{
  "status": "completed",
  "concept_document": {
    "generated_concept_document": "# Full markdown text with all sections...",
    "sections": {
      "Theory of Change": "section content...",
      "Gender and Social Inclusion Strategy": "section content...",
      "Sustainability and Exit Strategy": "section content...",
      "Partnership Framework": "section content..."
    }
  }
}
```

**What needs to work:**
1. ✅ **Display** the concept document in Step 3 UI
2. ✅ **Download** as Word document (.doc)
3. ✅ Handle both old and new response formats (backwards compatibility)

---

## 📁 FILES TO UPDATE

### **Backend:**
1. `app/tools/proposal_writer/document_generation/service.py` - Response parsing
2. `app/tools/proposal_writer/workflow/worker.py` - Storage logic (if needed)

### **Frontend:**
1. `src/tools/proposal-writer/pages/Step3ConceptDocument.tsx` - Display & download logic

---

## 🔧 IMPLEMENTATION PLAN

### **PHASE 1: Update Backend Response Parsing** ⭐ CRITICAL

**File:** `igad-app/backend/app/tools/proposal_writer/document_generation/service.py`

**Current method:** `_parse_response(self, response: str)` (lines 240-264)

**Current behavior:**
```python
def _parse_response(self, response: str) -> Dict[str, Any]:
    # Tries to parse JSON
    # Falls back to extracting sections from markdown
    return {
        'generated_concept_document': response,
        'sections': self._extract_sections_from_text(response)
    }
```

**NEW behavior needed:**

```python
def _parse_response(self, response: str) -> Dict[str, Any]:
    """
    Parse AI response into structured document
    Handles BOTH old and new response formats
    """
    import re
    
    try:
        # 1. Try to parse as JSON
        json_match = re.search(r'```json\s*(\{.*\})\s*```', response, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(1))
        else:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
            else:
                parsed = None
        
        # 2. Handle NEW format: { concept_document: { ... } }
        if parsed and 'concept_document' in parsed:
            concept_doc = parsed['concept_document']
            return {
                'generated_concept_document': concept_doc.get('generated_concept_document', ''),
                'sections': concept_doc.get('sections', {})
            }
        
        # 3. Handle OLD format: direct fields
        if parsed and 'generated_concept_document' in parsed:
            return {
                'generated_concept_document': parsed.get('generated_concept_document', ''),
                'sections': parsed.get('sections', {})
            }
        
    except json.JSONDecodeError:
        logger.warning("Could not parse JSON, falling back to text extraction")
    
    # 4. Fallback: Extract from plain text/markdown
    logger.info("Using text extraction fallback")
    return {
        'generated_concept_document': response,
        'sections': self._extract_sections_from_text(response)
    }
```

**Testing:**
- ✅ Test with NEW format (JSON.json)
- ✅ Test with old format (if exists)
- ✅ Test with plain text fallback

---

### **PHASE 2: Verify Storage (Worker Lambda)**

**File:** `app/tools/proposal_writer/workflow/worker.py`

**Check:** Does worker store the concept_document correctly in DynamoDB?

**Expected storage format:**
```python
{
    'concept_document': {
        'generated_concept_document': 'full markdown...',
        'sections': { ... }
    },
    'concept_document_status': 'completed',
    'concept_document_completed_at': '2025-11-27T...'
}
```

**Action:** 
- Review worker.py lines where concept_document is saved
- Ensure it stores the complete object (not just text)

---

### **PHASE 3: Update Frontend Display**

**File:** `igad-app/frontend/src/tools/proposal-writer/pages/Step3ConceptDocument.tsx`

**Current display logic** (~line 370-450):
```typescript
const renderConceptDocument = () => {
  let content = ''
  
  if (typeof conceptDocument === 'string') {
    content = conceptDocument
  } else if (conceptDocument?.generated_concept_document) {
    content = conceptDocument.generated_concept_document
  } else if (conceptDocument?.content) {
    content = conceptDocument.content
  }
  // ... more fallbacks
}
```

**✅ ALREADY HANDLES NEW FORMAT!**
- Line 246: `conceptDocument?.generated_concept_document` ✅
- This will work with both old and new formats

**No changes needed for display** - current code already supports it!

---

### **PHASE 4: Update Download Logic**

**File:** `Step3ConceptDocument.tsx`

**Current download logic** (lines 228-320):
```typescript
const handleDownloadDocument = useCallback(async () => {
  // Line 246: Already checks conceptDocument?.generated_concept_document ✅
  // Line 268: Also checks conceptDocument?.sections ✅
  
  // Current logic ALREADY handles the new format!
})
```

**✅ ALREADY WORKS!**
- Lines 246-274 check all possible formats including the new one
- Downloads as HTML wrapped in Word format (.doc)

**No changes needed for download** - current code already supports it!

---

## ✅ SUMMARY: WHAT ACTUALLY NEEDS TO CHANGE

### **Backend Changes (REQUIRED):**

1. **`service.py` - `_parse_response` method** ⭐
   - Update to handle `{ concept_document: { ... } }` wrapper
   - Keep backwards compatibility with old formats
   - Return normalized structure: `{ generated_concept_document, sections }`

### **Frontend Changes:**

✅ **NO CHANGES NEEDED!** 

The frontend already handles:
- `conceptDocument.generated_concept_document` ✅
- `conceptDocument.sections` ✅
- Multiple fallback formats ✅

---

## 🚀 IMPLEMENTATION STEPS

### **Step 1: Update Backend Parser** (15 min)

```bash
# Edit file
nano igad-app/backend/app/tools/proposal_writer/document_generation/service.py

# Update _parse_response method (lines 240-264)
# Add new format detection
# Test with JSON.json sample
```

### **Step 2: Test End-to-End** (10 min)

1. Generate a concept document in Step 2
2. Navigate to Step 3
3. Verify content displays correctly
4. Click "Download Document"
5. Open downloaded .doc file
6. Verify all sections are present

### **Step 3: Verify Worker Storage** (5 min)

```bash
# Check DynamoDB after generation
# Verify concept_document structure is correct
```

---

## 📊 TESTING CHECKLIST

- [ ] Backend parser handles new format `{ concept_document: {...} }`
- [ ] Backend parser handles old format (backwards compatibility)
- [ ] Backend parser falls back to text extraction
- [ ] Frontend displays generated_concept_document correctly
- [ ] Frontend download includes all sections
- [ ] Downloaded .doc file opens correctly in Word
- [ ] DynamoDB stores complete concept_document object

---

## 🎯 CODE ORGANIZATION PRINCIPLES

### **Keep it Simple:**

1. **Single Responsibility**
   - Parser does ONE thing: normalize AI response
   - Display does ONE thing: render markdown
   - Download does ONE thing: convert to Word format

2. **Backwards Compatibility**
   - Always check for new format first
   - Fall back to old formats
   - Final fallback: text extraction

3. **Clear Error Handling**
   - Log when using fallbacks
   - Don't fail silently
   - Return sensible defaults

4. **Testable**
   - Parser is pure function
   - Easy to test with different inputs
   - Clear success/failure paths

---

## 📝 NEW RESPONSE FORMAT DOCUMENTATION

**From JSON.json:**

```json
{
  "status": "completed",                    // Top level status
  "started_at": "2025-11-27T20:31:51...",  // Timestamp
  "completed_at": "2025-11-27T20:32:28...", // Timestamp
  "concept_document": {                     // ⭐ NEW WRAPPER
    "generated_concept_document": "...",    // Full markdown text
    "sections": {                           // Individual sections
      "Theory of Change": "...",
      "Gender and Social Inclusion Strategy": "...",
      "Sustainability and Exit Strategy": "...",
      "Partnership Framework": "..."
    }
  }
}
```

**Key changes:**
- Added `concept_document` wrapper object
- `generated_concept_document` now inside wrapper
- `sections` now inside wrapper
- Added `status`, `started_at`, `completed_at` at top level

---

## 🔍 VERIFICATION STEPS

After implementation:

1. **Backend Test:**
   ```python
   # Test the parser directly
   from app.tools.proposal_writer.document_generation.service import ConceptDocumentGenerator
   
   # Load JSON.json
   with open('JSON.json') as f:
       test_data = json.load(f)
   
   # Test parsing
   generator = ConceptDocumentGenerator()
   result = generator._parse_response(json.dumps(test_data))
   
   # Verify structure
   assert 'generated_concept_document' in result
   assert 'sections' in result
   assert isinstance(result['sections'], dict)
   ```

2. **Frontend Test:**
   - Open browser DevTools
   - Go to Step 3
   - Check console for `conceptDocument` structure
   - Verify markdown renders correctly
   - Test download button

3. **Integration Test:**
   - Complete full flow: Step 1 → Step 2 → Step 3
   - Generate concept document
   - Verify display and download

---

## 🎨 FINAL CODE STRUCTURE

```
Backend:
├── service.py
│   ├── generate_document()        # Main entry point
│   ├── _parse_response()          # ⭐ UPDATE THIS
│   │   ├── Try parse JSON
│   │   ├── Check for new format (concept_document wrapper)
│   │   ├── Check for old format (direct fields)
│   │   └── Fallback to text extraction
│   └── _extract_sections_from_text()  # Keep as fallback

Frontend:
├── Step3ConceptDocument.tsx
│   ├── renderConceptDocument()    # ✅ Already works
│   │   └── Checks conceptDocument.generated_concept_document
│   └── handleDownloadDocument()   # ✅ Already works
│       └── Checks conceptDocument.sections
```

---

**END OF PLAN**
