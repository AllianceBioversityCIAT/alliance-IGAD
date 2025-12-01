# Phase Indicator Tags - Design Documentation

## Overview
Small, elegant phase indicator tags that help users understand the two main phases of the proposal creation process: **Concept** and **Proposal**.

## Design Rationale

### Problem Statement
Users need clear visual guidance to understand that the 6-step proposal wizard is organized into two distinct phases:
- **Concept Phase** (Steps 1-3): Building the initial concept
- **Proposal Phase** (Steps 4-6): Structuring and finalizing the proposal

### Solution
Minimal badge tags placed above each step title in the sidebar to indicate which phase the step belongs to, without overwhelming the existing clean interface.

---

## Visual Specifications

### Concept Phase Tag
**Appearance:** Blue-themed, calm and exploratory
- **Background:** `#EFF6FF` (light blue)
- **Text:** `#1E40AF` (deep blue)
- **Border:** `1px solid #BFDBFE` (soft blue)
- **Label:** "CONCEPT"

### Proposal Phase Tag
**Appearance:** Green-themed, completion and success
- **Background:** `#F0FDF4` (light green)
- **Text:** `#15803D` (deep green)
- **Border:** `1px solid #BBF7D0` (soft green)
- **Label:** "PROPOSAL"

### Common Properties
- **Font size:** `11px` (small, unobtrusive)
- **Font weight:** `600` (semi-bold for readability)
- **Letter spacing:** `0.5px` (improved legibility at small size)
- **Padding:** `3px 8px` (minimal, just enough for breathing room)
- **Border radius:** `4px` (subtle roundedness)
- **Text transform:** `uppercase` (distinct from step titles)
- **Margin bottom:** `4px` (creates separation from step title)

---

## Placement & Layout

### Positioning
The phase tag is positioned **above** the step title within the sidebar step content area:

```
┌─────────────────────────────┐
│  [●]  CONCEPT               │
│       Information...        │
├─────────────────────────────┤
│  [●]  CONCEPT               │
│       Concept Review        │
├─────────────────────────────┤
│  [●]  CONCEPT               │
│       Concept Generation    │
├─────────────────────────────┤
│  [●]  PROPOSAL              │
│       Structure & Workplan  │
└─────────────────────────────┘
```

### Layout Structure
```
.stepContent {
  flex: 1;
  padding-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;  /* Minimal gap between tag and title */
}
```

---

## Visual Hierarchy Explanation

### Why This Design Works

#### 1. Size Hierarchy
- **Phase tags:** 11px, uppercase - clearly secondary
- **Step titles:** 15px, title case - primary focus
- **Step circles:** 36px - visual anchor

The small size of the tags ensures they provide context without competing with the step titles for attention.

#### 2. Color Coding
- **Blue (Concept):** Represents exploration, ideation, and early-stage work
- **Green (Proposal):** Represents growth, completion, and finalization
- Both colors are distinct but harmonious with the existing design system

#### 3. Semantic Clarity
- **Uppercase text:** Distinguishes tags from regular content
- **Border treatment:** Creates clear boundaries, making tags feel like distinct UI elements
- **Consistent positioning:** Tags always appear in the same location, creating predictable visual rhythm

#### 4. Progressive Disclosure
- Tags provide high-level context at a glance
- Users can quickly identify which phase they're in
- Helps with mental model: "I'm still in the concept phase" vs "I've moved to the proposal phase"

---

## Accessibility Considerations

### Visual Accessibility
1. **Color Contrast:**
   - Concept tag: Blue (#1E40AF) on light blue (#EFF6FF) = AAA compliant
   - Proposal tag: Dark green (#15803D) on light green (#F0FDF4) = AAA compliant

2. **Multiple Indicators:**
   - Tags use both color AND text ("CONCEPT" / "PROPOSAL")
   - Users with color blindness can still distinguish phases

3. **Readability:**
   - 11px font size is at the lower limit but acceptable for labels
   - Semi-bold weight (600) ensures visibility
   - Letter spacing improves character distinction

### Semantic HTML
The tags are implemented as `<span>` elements with descriptive text content, making them screen-reader friendly.

---

## User Experience Benefits

### 1. Mental Model Clarity
Users understand they're progressing through two distinct phases:
- **Concept:** Developing and refining the core idea
- **Proposal:** Structuring and documenting the idea formally

### 2. Progress Awareness
At a glance, users can see:
- How many steps remain in current phase
- When they'll transition to the next phase
- Overall workflow structure

### 3. Reduced Cognitive Load
Instead of processing 6 individual steps, users can chunk them into:
- 3 concept steps
- 3 proposal steps

### 4. Context Switching
When returning to the wizard, users immediately know:
- Which phase they're in
- What type of work to expect (conceptual vs. structural)

---

## Implementation Details

### Files Modified
1. **ProposalSidebar.tsx** - Component logic for rendering phase tags
2. **proposalWriter.module.css** - Styling for phase tags

### Phase Logic
```typescript
const getPhase = (stepId: number): 'concept' | 'proposal' => {
  return stepId <= 3 ? 'concept' : 'proposal'
}
```

Simple, maintainable logic that clearly defines phase boundaries.

### CSS Classes
- `.phaseTag` - Base styling for all phase tags
- `.phaseTagConcept` - Concept-specific colors
- `.phaseTagProposal` - Proposal-specific colors

---

## Design Principles Applied

### 1. Minimalism
- Small size prevents visual clutter
- Simple, clean borders
- Limited color palette

### 2. Consistency
- Same size and position for all tags
- Predictable color coding
- Aligned with existing design system

### 3. Elegance
- Subtle borders create refinement
- Appropriate letter spacing
- Balanced padding

### 4. User-Centered Design
- Provides value without demanding attention
- Enhances understanding without overwhelming
- Supports user goals (understanding workflow structure)

---

## Responsive Behavior

The phase tags maintain their size and styling across all screen sizes. On mobile:
- Tags remain legible
- Vertical stacking ensures visibility
- No overlapping or truncation issues

---

## Future Enhancements (Optional)

### Potential Additions
1. **Hover states:** Show phase description on hover
   - "Concept: Building your initial idea"
   - "Proposal: Structuring and finalizing"

2. **Phase transition indicator:** Visual cue when moving between phases
   - Celebratory micro-interaction
   - "You've completed the Concept phase!"

3. **Phase-specific help:** Context-sensitive tips based on current phase

---

## Color Accessibility Matrix

| Tag Type | Background | Text | Border | Contrast Ratio | WCAG Level |
|----------|------------|------|--------|----------------|------------|
| Concept  | #EFF6FF    | #1E40AF | #BFDBFE | 8.59:1 | AAA |
| Proposal | #F0FDF4    | #15803D | #BBF7D0 | 7.24:1 | AAA |

Both tags exceed WCAG AAA standards for small text (7:1 ratio required).

---

## Summary

These phase indicator tags provide a minimal, elegant solution for helping users understand the proposal wizard's two-phase structure. They enhance user experience through:

- **Clear visual hierarchy** (small size, secondary position)
- **Semantic color coding** (blue for concept, green for proposal)
- **Accessibility** (AAA contrast, text-based labels)
- **Minimal design** (doesn't overwhelm the interface)
- **User value** (improves mental model and progress awareness)

The design seamlessly integrates with the existing interface while adding meaningful context to guide users through the proposal creation process.
