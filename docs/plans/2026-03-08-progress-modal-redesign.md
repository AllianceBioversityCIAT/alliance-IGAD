# AI Progress Communication Redesign

## Problem

The current progress modals have generic time estimates ("3-5 minutes" everywhere), a progress bar that jumps between steps instead of filling smoothly, misleading "Almost done..." messages, no context about what the AI is doing, and the same design for 30-second and 5-minute tasks. Users lose trust and feel the system is stuck.

## Approach

Uniform modal across all operations with hybrid progress: real step transitions from the backend + timed contextual messages within steps. Engaging and educational tone that builds trust. No backend changes required.

## Modal Structure

```
+---------------------------------------------------+
|                                                   |
|         [Animated Phase Icon with pulse]          |
|                                                   |
|          Analyzing Your Proposal                  |
|    Step 2 of 3 . ~1-2 minutes remaining           |
|                                                   |
|  +-----------------------------------------------+|
|  | xxxxxxxxxxxxxxxxxx..................  65%      ||
|  +-----------------------------------------------+|
|                                                   |
|  +-----------------------------------------------+|
|  | .. Currently: Extracting key requirements     ||
|  |    from your RFP's evaluation criteria...     ||
|  +-----------------------------------------------+|
|                                                   |
|  [check] Step 1: RFP Analysis           12s       |
|  [spin]  Step 2: Reference Proposals    ...       |
|  [ ]     Step 3: Initial Concept                  |
|                                                   |
|  [bulb] Tip: Reference proposals help the AI      |
|  identify winning patterns from past successes    |
|                                                   |
|  ---                                              |
|  Your analysis is running securely on our servers |
+---------------------------------------------------+
```

### Key Elements

- **Percentage-based progress bar**: smooth fill using elapsed time vs estimated total, weighted by phase
- **Dynamic time estimate**: recalculated as phases complete, never shows negative time
- **"Currently" activity box**: timed contextual messages rotating every 6-8s with fade transition
- **Completed step durations**: shows actual time taken (e.g., "14s"), building confidence
- **Educational tips**: rotate at bottom, explaining why each step matters
- **Phase-appropriate animated icon**: transitions with fade when phase changes

## Contextual Messages Per Operation

### Step 1: Information Consolidation Analysis

**Phase 1 -- RFP Analysis (Haiku 3.5, ~15-30s):**
- "Extracting key requirements and evaluation criteria..."
- "Identifying budget constraints and timeline expectations..."
- "Mapping donor priorities and strategic objectives..."

**Phase 2 -- Reference Proposals & Existing Work (Haiku 3.5, ~20-45s):**
- "Reading through your reference proposals..."
- "Extracting winning patterns and successful approaches..."
- "Identifying reusable methodologies from past work..."

**Phase 3 -- Initial Concept (Haiku 3.5, ~15-30s):**
- "Evaluating concept alignment with RFP requirements..."
- "Assessing target population and geographic fit..."
- "Generating strategic recommendations..."

### Step 2: Concept Document Generation (Sonnet 4.5, ~2-4 min)

- "Analyzing selected sections for improvement..."
- "Incorporating your feedback and comments..."
- "Generating detailed narrative with donor-aligned language..."
- "Building evidence-based arguments for each section..."
- "Ensuring consistency across all sections..."

### Step 3: Template Generation (Sonnet 4.5, ~3-5 min)

- "Mapping RFP requirements to proposal sections..."
- "Incorporating insights from reference proposals..."
- "Drafting executive summary and project rationale..."
- "Building workplan with realistic timelines..."
- "Generating budget narrative and resource allocation..."
- "Finalizing cross-references between sections..."

### Step 4: Draft Feedback (Kimi K2.5, ~1-2 min)

- "Extracting content from your draft document..."
- "Comparing each section against RFP criteria..."
- "Identifying gaps and improvement opportunities..."
- "Generating actionable feedback per section..."

### Educational Tips (shared, rotate at bottom)

- "Reference proposals help the AI identify winning patterns from past successes"
- "The AI cross-references your concept with RFP evaluation criteria"
- "Detailed concept sections lead to stronger proposal templates"
- "AI feedback focuses on donor alignment and competitive positioning"
- "Your existing work documents help the AI build on proven approaches"

## Progress Calculation

### Weighted Phases

```
Step 1 Analysis (3 phases):
  RFP Analysis:        25%  (fast, Haiku)
  Reference/Existing:  45%  (medium, Haiku + more data)
  Concept Analysis:    30%  (medium, Haiku)

Step 2/3/4 (single phase):
  Single AI generation: 100% (fills smoothly over estimated duration)
```

### Smooth Fill Logic

- When a phase starts, progress bar animates toward that phase's weight limit over the estimated duration
- Slows at 85% of phase allocation (never reaches end until backend confirms)
- On backend completion, snaps to full phase weight and starts next phase
- Creates smooth, honest-feeling bar

### Time Remaining

- Based on model tier: Haiku ~30s, Kimi ~90s, Sonnet ~180s per phase
- Recalculates downward when phases complete faster than estimated (positive surprise)
- Switches to "Finishing up..." if estimate is exceeded (never shows negative/zero time)

## Visual Design

### Phase Icons (Lucide)

- RFP Analysis: FileSearch
- Reference/Existing Work: Library
- Concept Analysis: Lightbulb
- Document Generation: PenTool
- Template Generation: LayoutTemplate
- Draft Feedback: MessageSquare

### Colors

- Progress bar: green (#00a63e)
- Completed steps: green check + muted text
- Active step: green text + subtle background pulse
- Pending steps: gray text, gray circle

### Activity Box

- Light gray background (#f9fafb), rounded corners
- Animated pulse dot before text
- Fade in/out on message rotation (6-8s interval)
- Fixed height to prevent layout jumps

### Modal

- Max-width: 520px, no scroll
- Backdrop: blur overlay (existing)
- Footer: "Your analysis is running securely on our servers"

## Error & Edge Cases

### Timeout

- At 80% of max polling time: "This is taking longer than usual. Still working..."
- At timeout: in-modal error with two buttons:
  - "Keep Waiting" -- extends polling by 3 minutes
  - "Retry Analysis" -- cancels and restarts
- No more jarring modal-close + toast pattern

### Phase Failure

- Progress bar turns amber at failure point
- Shows which step failed and error reason
- "Retry This Step" resumes from failed phase, not from scratch
- Completed phases keep green checkmarks

### Page Refresh

- useProcessingResumption shows modal immediately: "Reconnecting to your analysis..."
- Fills progress bar to last known completed step weight
- Resumes normal polling

### Network Errors

- Transient poll failures: silent (already implemented)
- 3+ consecutive failures: "Connection interrupted. Retrying..." in activity box
- Never breaks the modal

## Files to Modify

- `AnalysisProgressModal.tsx` + `.module.css` -- full component rewrite
- `ProposalWriterPage.tsx` -- update modal config format for all operations
- `Step3StructureWorkplan.tsx` -- update template generation progress
- `Step4ProposalReview.tsx` -- update draft feedback progress
- `useProcessingResumption.ts` -- enhance resumption to restore weighted progress

## No Backend Changes Required

All enhancements are frontend-only using existing polling data.
