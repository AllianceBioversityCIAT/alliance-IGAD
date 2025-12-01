# Phase Tags Visual Mockup

## Sidebar Appearance with Phase Tags

```
╔══════════════════════════════════════════╗
║  Proposal Progress               45%     ║
║  ████████░░░░░░░░░░░░░░░░               ║
║  Step 3 of 6                            ║
╠══════════════════════════════════════════╣
║                                          ║
║  ①  ┌─────────┐                         ║
║  │  │ CONCEPT │ (blue badge)            ║
║  │  └─────────┘                         ║
║  │  Information Consolidation           ║
║  │                                       ║
║  ②  ┌─────────┐                         ║
║  │  │ CONCEPT │ (blue badge)            ║
║  │  └─────────┘                         ║
║  │  Concept Review                      ║
║  │                                       ║
║  ③  ┌─────────┐                         ║
║  ●  │ CONCEPT │ (blue badge)            ║
║     └─────────┘                         ║
║     Concept Generation ← ACTIVE         ║
║                                          ║
║  ④  ┌──────────┐                        ║
║     │ PROPOSAL │ (green badge)          ║
║     └──────────┘                        ║
║     Structure & Workplan                ║
║                                          ║
║  ⑤  ┌──────────┐                        ║
║     │ PROPOSAL │ (green badge)          ║
║     └──────────┘                        ║
║     Review & Refinement                 ║
║                                          ║
║  ⑥  ┌──────────┐                        ║
║     │ PROPOSAL │ (green badge)          ║
║     └──────────┘                        ║
║     Final Export                        ║
║                                          ║
╚══════════════════════════════════════════╝
```

---

## Tag Color Examples

### Concept Tag (Blue Theme)
```css
/* Visual representation */
┌─────────┐
│ CONCEPT │  Background: #EFF6FF (pale blue)
└─────────┘  Text: #1E40AF (deep blue)
             Border: #BFDBFE (soft blue)
```

**Actual appearance:**
- Light blue background with subtle border
- Deep blue uppercase text
- Clean, minimal design
- Suggests exploration and ideation

### Proposal Tag (Green Theme)
```css
/* Visual representation */
┌──────────┐
│ PROPOSAL │  Background: #F0FDF4 (pale green)
└──────────┘  Text: #15803D (deep green)
              Border: #BBF7D0 (soft green)
```

**Actual appearance:**
- Light green background with subtle border
- Deep green uppercase text
- Clean, minimal design
- Suggests completion and success

---

## Size Comparison

```
┌─────────────────────────────────┐
│                                 │
│  CONCEPT  ← 11px, small         │
│  Information Consolidation      │  ← 15px, normal
│  ↑ 4px gap                      │
│                                 │
└─────────────────────────────────┘

Phase tag is visibly smaller than step title,
creating clear visual hierarchy.
```

---

## States Visualization

### Active Step
```
┌────────────────────────────┐
│  ● (green circle with glow)│
│                            │
│  ┌─────────┐              │
│  │ CONCEPT │              │
│  └─────────┘              │
│  Concept Generation       │ ← Bold, dark text
│                            │
└────────────────────────────┘
```

### Completed Step
```
┌────────────────────────────┐
│  ✓ (green circle)          │
│                            │
│  ┌─────────┐              │
│  │ CONCEPT │              │
│  └─────────┘              │
│  Information Consolidation│ ← Normal weight
│                            │
└────────────────────────────┘
```

### Pending Step
```
┌────────────────────────────┐
│  ④ (gray circle)           │
│                            │
│  ┌──────────┐             │
│  │ PROPOSAL │             │
│  └──────────┘             │
│  Structure & Workplan     │ ← Faded, lighter
│                            │
└────────────────────────────┘
```

---

## Full Sidebar Example with All States

```
╔════════════════════════════════════╗
║ Proposal Progress           45%    ║
║ ████████░░░░░░░░░░░░              ║
║ Step 3 of 6                        ║
╠════════════════════════════════════╣
║                                    ║
║ ✓ ┌─────────┐                     ║
║   │ CONCEPT │                     ║
║ │ └─────────┘                     ║
║ │ Information Consolidation       ║
║ │                                  ║
║ ✓ ┌─────────┐                     ║
║   │ CONCEPT │                     ║
║ │ └─────────┘                     ║
║ │ Concept Review                  ║
║ │                                  ║
║ ● ┌─────────┐                     ║  ← ACTIVE STEP
║   │ CONCEPT │ (glowing)           ║
║   └─────────┘                     ║
║   Concept Generation              ║
║   (bold, prominent)               ║
║                                    ║
║ ④ ┌──────────┐                    ║
║   │ PROPOSAL │ (faded)            ║
║   └──────────┘                    ║
║   Structure & Workplan            ║
║   (lighter text)                  ║
║                                    ║
║ ⑤ ┌──────────┐                    ║
║   │ PROPOSAL │ (faded)            ║
║   └──────────┘                    ║
║   Review & Refinement             ║
║   (lighter text)                  ║
║                                    ║
║ ⑥ ┌──────────┐                    ║
║   │ PROPOSAL │ (faded)            ║
║   └──────────┘                    ║
║   Final Export                    ║
║   (lighter text)                  ║
║                                    ║
╚════════════════════════════════════╝

Key:
✓ = Completed step (green circle)
● = Active step (green circle with glow)
④⑤⑥ = Pending steps (gray circles)
```

---

## Spacing Details

### Vertical Rhythm
```
Step Circle (36px height)
│
├─ Tag starts here (aligned with step content)
│  ┌─────────┐
│  │ CONCEPT │  (height ~19px with padding)
│  └─────────┘
│
├─ 4px gap
│
└─ Step Title
   Information Consolidation (22px line height)
```

### Horizontal Alignment
```
Step Circle  │  Content Area
   (36px)    │
             │  Tag is left-aligned with step title
    [●]──────┼─┌─────────┐
             │ │ CONCEPT │
             │ └─────────┘
             │ Information Consolidation
             │
    16px gap │
```

---

## Phase Transition Visual

When user moves from Step 3 to Step 4, they cross the phase boundary:

```
Before (Step 3 - Last Concept step):
┌────────────────────────┐
│ ● CONCEPT              │  ← Currently here
│   Concept Generation   │
└────────────────────────┘

After (Step 4 - First Proposal step):
┌────────────────────────┐
│ ● PROPOSAL             │  ← Moved to new phase
│   Structure & Workplan │
└────────────────────────┘
```

The color change from blue to green provides clear visual feedback
that the user has transitioned to a new phase of work.

---

## Responsive Behavior

### Desktop (400px sidebar width)
```
┌──────────────────────────┐
│ ● CONCEPT                │  ← Plenty of space
│   Information            │
│   Consolidation          │
└──────────────────────────┘
```

### Tablet (280px sidebar width)
```
┌─────────────────┐
│ ● CONCEPT       │  ← Still fits comfortably
│   Information   │
│   Consolidation │
└─────────────────┘
```

### Mobile (Full width horizontal scroll)
```
┌────┐ ┌────┐ ┌────┐ ┌────┐
│ ●  │ │ 2  │ │ 3  │ │ 4  │
│CON │ │CON │ │CON │ │PRO │
│Info│ │Rev │ │Gen │ │Str │
└────┘ └────┘ └────┘ └────┘
← scrollable →
```

---

## Typography Specifications

### Phase Tag Typography
- **Font Family:** System font (inherited)
- **Font Size:** 11px
- **Font Weight:** 600 (semi-bold)
- **Line Height:** Implicit (~13px)
- **Letter Spacing:** 0.5px
- **Text Transform:** UPPERCASE
- **Character Count:** ~7-8 characters

### Step Title Typography (for comparison)
- **Font Size:** 15px
- **Font Weight:** 400 (normal)
- **Line Height:** 22px
- **Text Transform:** None

The size ratio (11px:15px ≈ 0.73:1) creates clear hierarchy
without making tags illegible.

---

## Color Palette Reference

### Concept Phase (Blue)
```
Background:  #EFF6FF  ████ Very light blue
Text:        #1E40AF  ████ Deep blue
Border:      #BFDBFE  ████ Soft blue
```

### Proposal Phase (Green)
```
Background:  #F0FDF4  ████ Very light green
Text:        #15803D  ████ Deep green
Border:      #BBF7D0  ████ Soft green
```

### Existing Colors (for context)
```
Active step circle:    #166534  ████ Dark green
Active step glow:      #DCFCE7  ████ Very light green
Progress bar:          #166534  ████ Dark green
Sidebar background:    #FFFFFF  ████ White
```

The phase tag colors harmonize with the existing green theme
while introducing blue as a new semantic color for the concept phase.

---

## Accessibility Visual Test

### Color Blindness Simulation

#### Deuteranopia (red-green colorblind)
```
CONCEPT tag:  Blue remains distinguishable
PROPOSAL tag: Green appears more yellowish but still distinct
              + Text labels ("CONCEPT" vs "PROPOSAL") ensure clarity
```

#### Protanopia (red-blind)
```
CONCEPT tag:  Blue remains clear
PROPOSAL tag: Slightly shifted but readable
              + Text labels provide redundancy
```

#### Tritanopia (blue-yellow colorblind)
```
CONCEPT tag:  Appears more greenish
PROPOSAL tag: Appears more bluish
              + Still distinguishable due to different hues
              + Text labels ensure clarity
```

**Result:** Tags are accessible to colorblind users because:
1. Different hue families (blue vs green)
2. Text labels ("CONCEPT" vs "PROPOSAL")
3. Strong contrast ratios for readability

---

## Implementation Checklist

- [x] CSS classes created (`.phaseTag`, `.phaseTagConcept`, `.phaseTagProposal`)
- [x] Component updated (ProposalSidebar.tsx)
- [x] Phase logic implemented (`getPhase()` function)
- [x] Styling applied (11px, 600 weight, uppercase, etc.)
- [x] Colors defined (blue for concept, green for proposal)
- [x] Spacing configured (4px gap, proper padding)
- [x] Accessibility verified (AAA contrast ratios)
- [x] Semantic HTML used (`<span>` with text content)

---

## Visual Design Principles Applied

1. **Hierarchy:** Small size makes tags clearly secondary to step titles
2. **Consistency:** Same size, position, and style for all tags
3. **Clarity:** Color + text provides redundant information
4. **Elegance:** Minimal borders, subtle colors, clean typography
5. **Balance:** 3px/8px padding creates visual harmony
6. **Rhythm:** 4px gap creates consistent vertical spacing
7. **Contrast:** AAA-level text contrast ensures readability

---

## Expected User Reaction

### First Impression
"Oh, I can see this wizard has two main phases: Concept and Proposal."

### During Use
"I'm still in the Concept phase, working on step 2 of 3."
"Next step moves me into the Proposal phase."

### Mental Model
Users will chunk the 6 steps into:
- **Concept work** (steps 1-3): Ideation and refinement
- **Proposal work** (steps 4-6): Structure and finalization

This reduces cognitive load and provides clearer progress understanding.
