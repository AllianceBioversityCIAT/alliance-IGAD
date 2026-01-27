# Shared Components - Newsletter Generator

## Overview

The Newsletter Generator will reuse and adapt several components from Proposal Writer. This document details which components to copy, what changes are needed, and new components to create.

---

## Components to Copy and Adapt

### 1. NewsletterLayout.tsx

**Source:** `igad-app/frontend/src/tools/proposal-writer/components/ProposalLayout.tsx`

**Target:** `igad-app/frontend/src/tools/newsletter-generator/components/NewsletterLayout.tsx`

**Changes Required:**

| Aspect | Proposal Writer | Newsletter Generator |
|--------|-----------------|----------------------|
| Import | `ProposalSecondaryNavbar` | `NewsletterSecondaryNavbar` |
| Import | `ProposalSidebar` | `NewsletterSidebar` |
| Import | `proposalService` | `newsletterService` |
| CSS Module | `proposalWriter.module.css` | `newsletterGenerator.module.css` |
| Props interface | `ProposalLayoutProps` | `NewsletterLayoutProps` |
| Prop names | `proposalCode`, `proposalId` | `newsletterCode`, `newsletterId` |
| Navigation path | `/proposal-writer` | `/newsletter-generator` |
| Dashboard redirect | `/dashboard` | `/dashboard` (same) |
| Step indicator | `Step {currentStep} of 4` | `Step {currentStep} of 4` |

**Adapted Code:**

```typescript
interface NewsletterLayoutProps {
  currentStep: number
  completedSteps: number[]
  children: React.ReactNode
  navigationButtons: React.ReactNode
  newsletterCode?: string
  newsletterId?: string
  newsletterStatus?: 'draft' | 'processing' | 'completed' | 'exported'
  isLoadingNewsletter?: boolean
  isLoadingStepData?: boolean
  onNavigateAway?: () => void
  lastModifiedStep?: number | null
}
```

---

### 2. NewsletterSecondaryNavbar.tsx

**Source:** `igad-app/frontend/src/tools/proposal-writer/components/ProposalSecondaryNavbar.tsx`

**Target:** `igad-app/frontend/src/tools/newsletter-generator/components/NewsletterSecondaryNavbar.tsx`

**Changes Required:**

| Aspect | Proposal Writer | Newsletter Generator |
|--------|-----------------|----------------------|
| Breadcrumb text | `Proposal Writer` | `Newsletter Generator` |
| Status type | `ProposalStatus` | `NewsletterStatus` |
| Prop names | `proposalCode`, `proposalStatus` | `newsletterCode`, `newsletterStatus` |
| Prompt Manager section | `proposal_writer` | `newsletter_generator` |

**Status Badge Configuration:**

```typescript
type NewsletterStatus = 'draft' | 'processing' | 'completed' | 'exported'

const STATUS_CONFIG: Record<NewsletterStatus, { label: string; className: string; icon: typeof Icon }> = {
  draft: {
    label: 'Draft',
    className: 'statusBadgeDraft',
    icon: FileEdit,
  },
  processing: {
    label: 'Processing',
    className: 'statusBadgeProcessing',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    className: 'statusBadgeCompleted',
    icon: CheckCircle,
  },
  exported: {
    label: 'Exported',
    className: 'statusBadgeExported',
    icon: Download,
  },
}
```

---

### 3. NewsletterSidebar.tsx

**Source:** `igad-app/frontend/src/tools/proposal-writer/components/ProposalSidebar.tsx`

**Target:** `igad-app/frontend/src/tools/newsletter-generator/components/NewsletterSidebar.tsx`

**Changes Required:**

| Aspect | Proposal Writer | Newsletter Generator |
|--------|-----------------|----------------------|
| Step config import | `stepConfig` from proposal | `newsletterStepConfig` |
| Progress title | `Proposal Progress` | `Newsletter Progress` |
| Total steps | 4 | 4 (same for MVP) |

**Step Configuration:**

```typescript
// newsletterStepConfig.ts
export const newsletterStepConfig = [
  {
    id: 1,
    title: 'Configuration',
    description: 'Set audience, tone, and format preferences',
    icon: Settings,
  },
  {
    id: 2,
    title: 'Content Planning',
    description: 'Select topics and retrieve content',
    icon: FileSearch,
  },
  {
    id: 3,
    title: 'Outline Review',
    description: 'Review and edit AI-generated outline',
    icon: ListOrdered,
  },
  {
    id: 4,
    title: 'Drafting & Export',
    description: 'Generate and export newsletter',
    icon: FileText,
  },
]
```

---

## New Components to Create

### 1. AudienceCheckboxGroup.tsx (Step 1)

**Purpose:** Multi-select checkbox group for target audience selection.

**Props:**
```typescript
interface AudienceCheckboxGroupProps {
  selectedAudiences: string[]
  onChange: (audiences: string[]) => void
  disabled?: boolean
}
```

**Audience Options:**
```typescript
const AUDIENCE_OPTIONS = [
  { id: 'myself', label: 'Myself' },
  { id: 'researchers', label: 'Researchers' },
  { id: 'development_partners', label: 'Development partners' },
  { id: 'policy_makers', label: 'Policy makers' },
  { id: 'ag_tech_industry', label: 'Ag-tech industry' },
  { id: 'field_staff', label: 'Field staff' },
  { id: 'farmers', label: 'Farmers' },
]
```

**Visual Design:**
- Grid layout (2-3 columns)
- Checkbox with label
- Check icon when selected
- Subtle border and background change on selection

---

### 2. DualToneSlider.tsx (Step 1)

**Purpose:** Two-axis tone configuration sliders.

**Props:**
```typescript
interface DualToneSliderProps {
  professionalValue: number  // 0 (Professional) to 100 (Casual)
  technicalValue: number     // 0 (Technical) to 100 (Approachable)
  onProfessionalChange: (value: number) => void
  onTechnicalChange: (value: number) => void
  disabled?: boolean
}
```

**Visual Design:**
- Two horizontal sliders
- Labels on both ends
- Value indicator in center or side
- Visual feedback on drag

---

### 3. InformationTypeToggle.tsx (Step 2)

**Purpose:** Toggle item for content type selection with category badge.

**Props:**
```typescript
interface InformationTypeToggleProps {
  types: InformationType[]
  selectedTypes: string[]
  onToggle: (typeId: string) => void
  disabled?: boolean
}

interface InformationType {
  id: string
  name: string
  category: 'news' | 'insights' | 'opportunities' | 'resources'
  description?: string
}
```

**Information Types:**
```typescript
const INFORMATION_TYPES: InformationType[] = [
  { id: 'breaking_news', name: 'Breaking News & Updates', category: 'news' },
  { id: 'policy_updates', name: 'Policy Updates', category: 'news' },
  { id: 'research_findings', name: 'Research Findings', category: 'insights' },
  { id: 'technology_innovation', name: 'Technology & Innovation Spotlight', category: 'insights' },
  { id: 'climate_smart', name: 'Climate-Smart Agriculture', category: 'insights' },
  { id: 'market_access', name: 'Market Access & Trade', category: 'insights' },
  { id: 'funding', name: 'Funding Opportunities', category: 'opportunities' },
  { id: 'events', name: 'Events & Conferences', category: 'opportunities' },
  { id: 'project_updates', name: 'Project Updates & Success Stories', category: 'insights' },
  { id: 'publications', name: 'Publications & Resources', category: 'resources' },
  { id: 'food_security', name: 'Food Security Updates', category: 'news' },
  { id: 'livestock', name: 'Livestock & Animal Health', category: 'insights' },
]
```

**Category Badge Colors:**
```css
/* news - blue */
.badgeNews { background: #dbeafe; color: #1e40af; }

/* insights - purple */
.badgeInsights { background: #f3e8ff; color: #7c3aed; }

/* opportunities - yellow */
.badgeOpportunities { background: #fef3c7; color: #b45309; }

/* resources - green */
.badgeResources { background: #d1fae5; color: #047857; }
```

---

### 4. OutlineSection.tsx (Step 3)

**Purpose:** Expandable section with editable items for outline review.

**Props:**
```typescript
interface OutlineSectionProps {
  section: OutlineSection
  isExpanded: boolean
  onToggle: () => void
  onItemEdit: (itemId: string, newContent: Partial<OutlineItem>) => void
  onItemDelete: (itemId: string) => void
  onItemAdd: (item: Partial<OutlineItem>) => void
  disabled?: boolean
}

interface OutlineSection {
  id: string
  name: string
  order: number
  items: OutlineItem[]
}

interface OutlineItem {
  id: string
  title: string
  description: string
  editable: boolean
  source: 'ai_generated' | 'rag_content' | 'user_added'
  ragReferenceId?: string
}
```

**Visual Design:**
- Accordion-style expandable sections
- Section header with item count
- Draggable items (optional - for reordering)
- Edit/Delete buttons per item
- Add item button at section bottom

---

### 5. NewsletterRichEditor.tsx (Step 4)

**Purpose:** Full-featured text editor for newsletter draft editing.

**Props:**
```typescript
interface NewsletterRichEditorProps {
  content: string
  onChange: (content: string) => void
  sections?: Section[]
  onSectionNavigate?: (sectionId: string) => void
  readOnly?: boolean
  isLoading?: boolean
}
```

**Features:**
- Markdown rendering and editing
- Basic formatting toolbar (bold, italic, links, lists)
- Section navigation sidebar
- Estimated read time indicator
- Word count

**Recommended Libraries:**
- `@uiw/react-md-editor` - Markdown editor with preview
- `react-markdown` - For rendering
- Or consider `tiptap` for rich text

---

### 6. ExportButtons.tsx (Step 4)

**Purpose:** Export options for downloading newsletter in different formats.

**Props:**
```typescript
interface ExportButtonsProps {
  newsletterCode: string
  onExport: (format: 'pdf' | 'docx' | 'html') => Promise<void>
  isExporting: boolean
  exportingFormat?: string
  disabled?: boolean
}
```

**Visual Design:**
- Three buttons: PDF, DOCX, HTML
- Icons for each format
- Loading state while generating
- Success/error feedback

---

## CSS Module Structure

**File:** `igad-app/frontend/src/tools/newsletter-generator/pages/newsletterGenerator.module.css`

Copy structure from `proposalWriter.module.css` and add new classes:

```css
/* Base layout classes (copy from proposalWriter) */
.newsletterGeneratorContainer { ... }
.contentArea { ... }
.navigationButtons { ... }
.sidebar { ... }
.secondaryNavbar { ... }

/* Step 1: Configuration */
.audienceGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.audienceItem { ... }
.toneSliderContainer { ... }
.sliderLabel { ... }

/* Step 2: Content Planning */
.informationTypesList { ... }
.typeToggleItem { ... }
.categoryBadge { ... }
.retrievalProgress { ... }

/* Step 3: Outline Review */
.outlineContainer { ... }
.outlineSection { ... }
.outlineSectionHeader { ... }
.outlineItem { ... }
.addItemForm { ... }

/* Step 4: Drafting */
.editorContainer { ... }
.editorToolbar { ... }
.editorContent { ... }
.sectionNav { ... }
.exportSection { ... }
.exportButton { ... }

/* Shared status badges */
.statusBadgeDraft { ... }
.statusBadgeProcessing { ... }
.statusBadgeCompleted { ... }
.statusBadgeExported { ... }
```

---

## Component File Structure

```
igad-app/frontend/src/tools/newsletter-generator/
├── components/
│   ├── NewsletterLayout.tsx           # Main layout wrapper
│   ├── NewsletterSecondaryNavbar.tsx  # Top navbar with breadcrumb
│   ├── NewsletterSidebar.tsx          # Step progress sidebar
│   ├── AudienceCheckboxGroup.tsx      # Step 1: Audience selection
│   ├── DualToneSlider.tsx             # Step 1: Tone configuration
│   ├── InformationTypeToggle.tsx      # Step 2: Topic toggles
│   ├── RetrievalProgress.tsx          # Step 2: RAG progress indicator
│   ├── OutlineSection.tsx             # Step 3: Outline accordion
│   ├── AddOutlineItemForm.tsx         # Step 3: Add custom item
│   ├── NewsletterRichEditor.tsx       # Step 4: Draft editor
│   ├── ExportButtons.tsx              # Step 4: Export options
│   └── GenerationProgress.tsx         # Shared: AI generation progress
├── pages/
│   ├── NewsletterGeneratorPage.tsx    # Main page component
│   ├── Step1Configuration.tsx
│   ├── Step2ContentPlanning.tsx
│   ├── Step3OutlineReview.tsx
│   ├── Step4Drafting.tsx
│   ├── newsletterStepConfig.ts
│   └── newsletterGenerator.module.css
├── hooks/
│   ├── useNewsletter.ts               # Newsletter state management
│   ├── useNewsletterStorage.ts        # LocalStorage persistence
│   └── useGenerationPolling.ts        # Poll for AI generation status
├── services/
│   └── newsletterService.ts           # API service layer
└── types/
    └── newsletter.ts                  # TypeScript interfaces
```

---

## Implementation Checklist

### Phase 1: Copy and Adapt (Day 1)
- [ ] Copy `ProposalLayout.tsx` -> `NewsletterLayout.tsx`
- [ ] Copy `ProposalSecondaryNavbar.tsx` -> `NewsletterSecondaryNavbar.tsx`
- [ ] Copy `ProposalSidebar.tsx` -> `NewsletterSidebar.tsx`
- [ ] Copy `proposalWriter.module.css` -> `newsletterGenerator.module.css`
- [ ] Create `newsletterStepConfig.ts`
- [ ] Update all imports and references

### Phase 2: Create Step 1 Components (Day 2)
- [ ] Create `AudienceCheckboxGroup.tsx`
- [ ] Create `DualToneSlider.tsx`
- [ ] Add CSS classes for Step 1

### Phase 3: Create Step 2 Components (Day 3)
- [ ] Create `InformationTypeToggle.tsx`
- [ ] Create `RetrievalProgress.tsx`
- [ ] Add CSS classes for Step 2

### Phase 4: Create Step 3 Components (Day 4)
- [ ] Create `OutlineSection.tsx`
- [ ] Create `AddOutlineItemForm.tsx`
- [ ] Add CSS classes for Step 3

### Phase 5: Create Step 4 Components (Day 5)
- [ ] Create `NewsletterRichEditor.tsx`
- [ ] Create `ExportButtons.tsx`
- [ ] Create `GenerationProgress.tsx`
- [ ] Add CSS classes for Step 4
