# Debugging Plan: AI Proposal Draft Generating Extra Sections

## Bug Summary

**Problem:** The AI draft generation (Step 3 of Proposal Writer) produces more sections than the user selected. The UI indicates "Generating content for 16 sections" but the output document contains sections not in the user's selection.

**Example Output:** `specs/tools/proposal-writer/bugs/ai_proposal_draft_64332cbe-1b49-4d80-b8c8-54b501946aa1_2026-01-16.docx`

**Key File:** `igad-app/backend/app/tools/proposal_writer/proposal_template_generation/service.py`

---

## Data Flow Analysis

```
API Request (routes.py)
    ↓
    selected_sections: List[str]  (e.g., ["Executive Summary", "Budget", ...])
    ↓
Worker Lambda (workflow/worker.py)
    ↓
    _handle_proposal_template_generation()
    ↓
Service (proposal_template_generation/service.py)
    ↓
    generate_template()
        ↓
        _prepare_proposal_structure()  ← FILTERING HAPPENS HERE
            ↓
            filtered_mandatory + filtered_outline
        ↓
        _prepare_context()
            ↓
            context["PROPOSAL STRUCTURE"] = JSON of filtered sections
        ↓
        _inject_context()
            ↓
            Prompt with {[PROPOSAL STRUCTURE]} replaced
        ↓
    Bedrock API Call (Claude Sonnet 4)
        ↓
    AI Response → Document with extra sections
```

---

## Root Cause Hypotheses

### Hypothesis 1: AI Model Not Following Instructions (HIGHEST PROBABILITY)
**Location:** Prompt template + AI behavior
**Description:** Despite clear instructions in the prompt to "Generate ONLY the sections included in the proposal structure input" (prompt.txt lines 37-43), the AI is generating standard proposal sections instead of strictly following the filtered structure.

**Evidence:**
- The generated document has 11 standard sections (Executive Summary, Problem Statement, Project Objectives, etc.)
- These sections appear to be "typical" proposal sections, not necessarily matching user selection
- The prompt instructions exist but may not be emphatic enough

### Hypothesis 2: Section Title Mismatch in Filtering
**Location:** `service.py:274-279`
**Description:** The filtering uses exact string matching:
```python
selected_set = set(selected_sections)
filtered_mandatory = [
    s for s in mandatory_sections if s.get("section_title") in selected_set
]
```
If section titles don't match exactly (case, whitespace, special characters), filtering fails.

### Hypothesis 3: Empty Filtered Structure
**Location:** `service.py:294-297`
**Description:** If the filtering results in empty lists, the function returns:
```python
return {
    "proposal_mandatory": filtered_mandatory,
    "proposal_outline": filtered_outline,
}
```
An empty structure might cause the AI to "improvise" with standard sections.

### Hypothesis 4: Reference Proposals Influencing Section Generation
**Location:** Prompt template, `context["REFERENCE PROPOSALS ANALYSIS"]`
**Description:** The reference proposals analysis might contain section structures that the AI prioritizes over the explicit `PROPOSAL STRUCTURE` input.

### Hypothesis 5: Prompt Placeholder Not Being Replaced
**Location:** `service.py:402-421`
**Description:** The `_inject_context` method uses `{[KEY]}` format. If the placeholder is malformed or the key doesn't match, the filtered structure won't be injected.

---

## Code Rule: Handle Multiple Placeholder Formats

**IMPORTANT:** When writing or modifying code that handles prompt variables/placeholders, always consider that placeholders can have **two different structures**:

| Format | Example | Regex Pattern |
|--------|---------|---------------|
| Double curly braces | `{{VARIABLE_NAME}}` | `\{\{([A-Z_]+)\}\}` |
| Curly + square brackets | `{[VARIABLE_NAME]}` | `\{\[([A-Z_]+)\]\}` |

### Implementation Guideline

When implementing placeholder replacement logic, the code MUST handle both formats:

```python
import re

def replace_placeholders(template: str, context: Dict[str, str]) -> str:
    """
    Replace placeholders in template with context values.
    Handles both {{KEY}} and {[KEY]} formats.
    """
    result = template

    for key, value in context.items():
        # Format 1: {{KEY}} - double curly braces
        double_curly_pattern = "{{" + key + "}}"
        result = result.replace(double_curly_pattern, str(value))

        # Format 2: {[KEY]} - curly + square brackets
        curly_square_pattern = "{[" + key + "]}"
        result = result.replace(curly_square_pattern, str(value))

    return result
```

### Validation Check

Add validation to detect unreplaced placeholders of both formats:

```python
def validate_no_unreplaced_placeholders(text: str) -> List[str]:
    """
    Check for any unreplaced placeholders in the text.
    Returns list of unreplaced placeholder names.
    """
    unreplaced = []

    # Pattern for {{KEY}}
    double_curly = re.findall(r'\{\{([A-Z_]+)\}\}', text)
    unreplaced.extend([f"{{{{{k}}}}}" for k in double_curly])

    # Pattern for {[KEY]}
    curly_square = re.findall(r'\{\[([A-Z_]+)\]\}', text)
    unreplaced.extend([f"{{[{k}]}}" for k in curly_square])

    return unreplaced
```

### Why This Matters

- Prompts may come from different sources (DynamoDB, files, hardcoded) with inconsistent formats
- Template authors may use either format without realizing the code expects a specific one
- Missing placeholder replacement can cause AI to see raw `{[PROPOSAL STRUCTURE]}` instead of actual data

---

## Debugging Steps

### Step 1: Add Detailed Logging to Filtering

**File:** `igad-app/backend/app/tools/proposal_writer/proposal_template_generation/service.py`

**Action:** Add logging in `_prepare_proposal_structure` to verify filtering works correctly.

```python
def _prepare_proposal_structure(
    self,
    structure_workplan_analysis: Dict[str, Any],
    selected_sections: List[str],
    user_comments: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    try:
        # ADD: Log incoming selected sections
        logger.info(f"🔍 DEBUG: Received selected_sections: {selected_sections}")

        analysis = structure_workplan_analysis.get(
            "structure_workplan_analysis", structure_workplan_analysis
        )

        mandatory_sections = analysis.get("proposal_mandatory", [])
        outline_sections = analysis.get("proposal_outline", [])

        # ADD: Log all available section titles
        mandatory_titles = [s.get("section_title") for s in mandatory_sections]
        outline_titles = [s.get("section_title") for s in outline_sections]
        logger.info(f"🔍 DEBUG: Available mandatory titles: {mandatory_titles}")
        logger.info(f"🔍 DEBUG: Available outline titles: {outline_titles}")

        selected_set = set(selected_sections)
        logger.info(f"🔍 DEBUG: Selected set: {selected_set}")

        # ADD: Check for exact matches
        for selected in selected_sections:
            if selected in mandatory_titles:
                logger.info(f"   ✓ '{selected}' found in mandatory")
            elif selected in outline_titles:
                logger.info(f"   ✓ '{selected}' found in outline")
            else:
                logger.warning(f"   ✗ '{selected}' NOT FOUND in any section list")

        # ... rest of filtering logic
```

### Step 2: Verify Prompt Injection

**File:** `igad-app/backend/app/tools/proposal_writer/proposal_template_generation/service.py`

**Action:** Add logging after `_inject_context` to verify the structure is injected.

```python
# In generate_template(), after line 137-138:
user_prompt = self._inject_context(prompt_parts["user_prompt"], context)

# ADD: Log first 2000 chars of the injected PROPOSAL STRUCTURE section
structure_start = user_prompt.find("<PROPOSAL_STRUCTURE>")
structure_end = user_prompt.find("</PROPOSAL_STRUCTURE>")
if structure_start != -1 and structure_end != -1:
    structure_content = user_prompt[structure_start:structure_end+22][:2000]
    logger.info(f"🔍 DEBUG: Injected PROPOSAL_STRUCTURE (first 2000 chars):\n{structure_content}")
else:
    logger.error("❌ DEBUG: PROPOSAL_STRUCTURE tags not found in injected prompt!")
```

### Step 3: Log Actual AI Request

**File:** `igad-app/backend/app/tools/proposal_writer/proposal_template_generation/service.py`

**Action:** Log the complete prompt being sent to AI (truncated for practical logging).

```python
# Before Bedrock call:
logger.info(f"🔍 DEBUG: System prompt length: {len(prompt_parts['system_prompt'])} chars")
logger.info(f"🔍 DEBUG: Final prompt length: {len(final_prompt)} chars")

# Count section titles in the prompt
import re
section_count = len(re.findall(r'"section_title":\s*"([^"]+)"', final_prompt))
logger.info(f"🔍 DEBUG: Number of section_title entries in prompt: {section_count}")
```

### Step 4: Strengthen Prompt Instructions

**File:** DynamoDB Prompt (Prompt 4.5 - Draft Proposal)

**Action:** Add more emphatic instructions at multiple points in the prompt:

1. **At the start of the user instructions:**
```
CRITICAL CONSTRAINT: You MUST generate EXACTLY and ONLY the sections listed in
<PROPOSAL_STRUCTURE>. Count the sections in the input and ensure your output
has exactly that many sections. Do NOT add, invent, or generate any section
not explicitly listed in <PROPOSAL_STRUCTURE>.
```

2. **Before the output format:**
```
VERIFICATION REQUIREMENT: Before generating output, count the sections in
<PROPOSAL_STRUCTURE>. Your output MUST contain exactly this number of sections,
no more, no less.
```

3. **In the output format section:**
```
OUTPUT VALIDATION:
- List ONLY sections from <PROPOSAL_STRUCTURE>
- Section count in output MUST equal section count in input
- ANY extra section constitutes a generation failure
```

### Step 5: Add Section Validation Post-Processing

**File:** `igad-app/backend/app/tools/proposal_writer/proposal_template_generation/service.py`

**Action:** Add validation to detect when AI generates extra sections.

```python
def _parse_response(self, response: str, expected_sections: List[str]) -> Dict[str, Any]:
    """
    Parse AI response and validate section count.
    """
    try:
        sections = self._extract_sections_from_text(response)

        # ADD: Validation
        generated_titles = set(sections.keys())
        expected_titles = set(expected_sections)

        extra_sections = generated_titles - expected_titles
        missing_sections = expected_titles - generated_titles

        if extra_sections:
            logger.warning(f"⚠️ AI generated {len(extra_sections)} EXTRA sections: {extra_sections}")
        if missing_sections:
            logger.warning(f"⚠️ AI missing {len(missing_sections)} sections: {missing_sections}")

        return {
            "generated_proposal": response,
            "sections": sections,
            "validation": {
                "expected_count": len(expected_sections),
                "generated_count": len(sections),
                "extra_sections": list(extra_sections),
                "missing_sections": list(missing_sections),
            }
        }

    except Exception as e:
        # ... error handling
```

### Step 6: Test with Minimal Selection

**Action:** Create a test case that selects only 2-3 sections and verify:
1. The filtering produces exactly 2-3 sections
2. The prompt contains exactly 2-3 sections
3. The AI output contains exactly 2-3 sections

```python
# Test script: tests/test_proposal_template_filtering.py
def test_minimal_section_selection():
    selected = ["Executive Summary", "Budget Justification"]

    # Mock structure_workplan_analysis with many sections
    structure = {
        "proposal_mandatory": [
            {"section_title": "Executive Summary", "purpose": "..."},
            {"section_title": "Problem Statement", "purpose": "..."},
            # ... more sections
        ],
        "proposal_outline": [
            {"section_title": "Budget Justification", "purpose": "..."},
            {"section_title": "Sustainability", "purpose": "..."},
            # ... more sections
        ]
    }

    service = ProposalTemplateGenerator()
    filtered = service._prepare_proposal_structure(structure, selected)

    # Assert exactly 2 sections
    total = len(filtered["proposal_mandatory"]) + len(filtered["proposal_outline"])
    assert total == 2, f"Expected 2 sections, got {total}"
```

---

## Verification Checklist

After implementing fixes, verify:

- [ ] Logging shows correct filtering of sections
- [ ] Prompt contains only selected sections in `<PROPOSAL_STRUCTURE>`
- [ ] AI response validation shows no extra sections
- [ ] Test with 2-3 sections produces exactly 2-3 sections
- [ ] Test with all sections produces all sections
- [ ] Edge case: Test with 1 section produces exactly 1 section

---

## Quick Fix Option (If Root Cause is AI Behavior)

If the issue is purely the AI not following instructions, a quick fix is to:

1. **Post-process the output:** Filter the generated sections to only include those in `selected_sections`
2. **Add this to `generate_template()`:**

```python
# After _parse_response()
document = self._parse_response(ai_response)

# ADD: Filter to only selected sections
if selected_sections:
    selected_set = set(selected_sections)
    filtered_sections = {
        title: content
        for title, content in document["sections"].items()
        if title in selected_set
    }

    # Rebuild generated_proposal with only selected sections
    filtered_content = []
    for title in selected_sections:
        if title in filtered_sections:
            filtered_content.append(f"## {title}\n\n{filtered_sections[title]}")

    document["sections"] = filtered_sections
    document["generated_proposal"] = "\n\n".join(filtered_content)
    logger.info(f"✂️ Filtered output from {len(document['sections'])} to {len(filtered_sections)} sections")
```

---

## Files to Modify

**Backend:**
1. `igad-app/backend/app/tools/proposal_writer/proposal_template_generation/service.py` - Add logging, validation, and optional post-filtering
2. DynamoDB Prompt (Prompt 4.5 - Draft Proposal) - Strengthen instructions
3. `tests/test_proposal_template_filtering.py` - Add unit tests (create if needed)

**Frontend (if Hypothesis 6 confirmed):**
4. `igad-app/frontend/src/pages/proposal-writer/Step3*.tsx` - Fix section selection state management
5. `igad-app/frontend/src/hooks/useProposalTemplate.ts` - Fix API payload serialization (if exists)

---

## Browser-Based Testing with Playwright MCP

If backend logging doesn't reveal the issue, use the `executeautomation-playwright-server` MCP to directly observe and debug the section selection behavior in the browser.

### Step 7: Browser Testing Setup

**MCP Server:** `executeautomation-playwright-server`

**Purpose:** Verify the frontend is sending the correct `selected_sections` to the API and observe the full user flow.

### 7.1 Navigate to Proposal Writer Step 3

```
Tool: mcp__executeautomation-playwright-server__playwright_navigate
Parameters:
  url: "https://[app-url]/proposal-writer/[proposal-id]/step-3"
  headless: false
  width: 1920
  height: 1080
```

### 7.2 Capture Initial State Screenshot

```
Tool: mcp__executeautomation-playwright-server__playwright_screenshot
Parameters:
  name: "step3-initial-state"
  fullPage: true
  savePng: true
  downloadsDir: "/Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/specs/tools/proposal-writer/bugs/screenshots"
```

### 7.3 Get Visible Section Checkboxes

```
Tool: mcp__executeautomation-playwright-server__playwright_get_visible_html
Parameters:
  selector: "[data-testid='section-list']"  # Adjust selector as needed
  cleanHtml: true
  removeScripts: true
```

### 7.4 Intercept API Request (Network Monitoring)

Use JavaScript evaluation to intercept the API call and log the payload:

```
Tool: mcp__executeautomation-playwright-server__playwright_evaluate
Parameters:
  script: |
    // Intercept fetch to capture the request payload
    const originalFetch = window.fetch;
    window.debugPayloads = [];
    window.fetch = async (...args) => {
      const [url, options] = args;
      if (url.includes('generate-ai-proposal-template')) {
        const payload = options?.body ? JSON.parse(options.body) : null;
        window.debugPayloads.push({
          url,
          selected_sections: payload?.selected_sections,
          sections_count: payload?.selected_sections?.length
        });
        console.log('📡 API Request intercepted:', JSON.stringify(payload, null, 2));
      }
      return originalFetch.apply(this, args);
    };
    'Fetch interceptor installed';
```

### 7.5 Select Specific Sections (Minimal Test)

Deselect all sections, then select only 2-3 specific ones:

```
Tool: mcp__executeautomation-playwright-server__playwright_click
Parameters:
  selector: "[data-testid='deselect-all-btn']"  # Adjust selector
```

Then select specific sections:

```
Tool: mcp__executeautomation-playwright-server__playwright_click
Parameters:
  selector: "[data-testid='section-checkbox-executive-summary']"  # Adjust selector
```

```
Tool: mcp__executeautomation-playwright-server__playwright_click
Parameters:
  selector: "[data-testid='section-checkbox-budget']"  # Adjust selector
```

### 7.6 Trigger Generation and Capture Request

```
Tool: mcp__executeautomation-playwright-server__playwright_click
Parameters:
  selector: "[data-testid='generate-ai-draft-btn']"  # Adjust selector
```

### 7.7 Retrieve Intercepted Payload

```
Tool: mcp__executeautomation-playwright-server__playwright_evaluate
Parameters:
  script: |
    JSON.stringify(window.debugPayloads, null, 2);
```

### 7.8 Monitor Console Logs

```
Tool: mcp__executeautomation-playwright-server__playwright_console_logs
Parameters:
  type: "all"
  limit: 50
```

### 7.9 Expect and Assert API Response

Set up response expectation before clicking generate:

```
Tool: mcp__executeautomation-playwright-server__playwright_expect_response
Parameters:
  id: "ai-template-response"
  url: "generate-ai-proposal-template"
```

Then after generation completes:

```
Tool: mcp__executeautomation-playwright-server__playwright_assert_response
Parameters:
  id: "ai-template-response"
```

### 7.10 Screenshot Final State

```
Tool: mcp__executeautomation-playwright-server__playwright_screenshot
Parameters:
  name: "step3-after-generation"
  fullPage: true
  savePng: true
  downloadsDir: "/Users/jcadavid/Desktop/DEV/Desarrollos/alliance-IGAD/specs/tools/proposal-writer/bugs/screenshots"
```

### Browser Testing Verification Points

| Check | Tool | What to Verify |
|-------|------|----------------|
| UI shows correct sections | `playwright_get_visible_html` | Section list matches structure_workplan |
| Checkboxes work correctly | `playwright_click` + `playwright_screenshot` | Visual confirmation of selection state |
| API receives correct payload | `playwright_evaluate` (fetch intercept) | `selected_sections` array matches UI selection |
| API response structure | `playwright_assert_response` | Response contains expected fields |
| Console errors | `playwright_console_logs` | No JavaScript errors during flow |

### Hypothesis 6: Frontend Sending All Sections (NEW)

**Location:** Frontend React component (Step 3)
**Description:** The frontend might be sending all sections regardless of user selection due to:
- State management bug (selection state not updating)
- Form serialization issue (sending full list instead of filtered)
- Default value override

**Browser Test to Verify:**
1. Select only 2 sections in UI
2. Intercept fetch request
3. Check if `selected_sections` array has 2 items or all items

---

## Execution Order

1. **Phase 1: Diagnostics** (Steps 1-3)
   - Add logging to identify exact failure point
   - Deploy and test with a real proposal
   - Analyze logs to confirm hypothesis

2. **Phase 1.5: Browser Testing** (Step 7) - IF NEEDED
   - Use Playwright MCP to verify frontend behavior
   - Intercept API requests to check payload
   - Confirm if bug is frontend or backend

3. **Phase 2: Fix** (Steps 4-5)
   - If AI behavior: Strengthen prompt + add post-processing filter
   - If filtering bug: Fix section title matching logic
   - If prompt injection bug: Fix placeholder format
   - If frontend bug: Fix React state/form serialization

4. **Phase 3: Validation** (Step 6)
   - Run verification checklist
   - Test edge cases
   - Monitor production logs
