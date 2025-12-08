# Step 2 & 3 Merge Implementation Plan

**Document Version:** 1.0
**Created:** 2024-12-08
**For:** KIRO Implementation
**Project:** IGAD Proposal Writer

---

## 📋 Executive Summary

This document provides a **step-by-step implementation plan** to merge Step 2 (Concept Review) and Step 3 (Updated Concept Document) into a single unified Step 2 component based on Figma mockups (node-id=359-1435 and node-id=834-818).

**Critical Notes:**
- ⚠️ **The mockup shows "Step 2 of 4"** - This is a **content merge**, NOT a step reduction
- ✅ All existing functionality is currently working - DO NOT break it
- 📁 Maintain existing folder structure
- 📝 Document all code changes thoroughly
- 🧪 Test after each major section is completed

---

## 🎯 Objectives

1. **Merge Step2ContentGeneration.tsx and Step3ConceptDocument.tsx** into a single unified component
2. **Re-enable user_comments text field** in sections (field previously existed but was disabled)
3. **Update Prompt 3 - Agent 3** to receive `{{reference_proposal_analysis}}` and `{{existing_work_analysis}}`
4. **Update sidebar** step completion logic if needed
5. **Maintain all existing features:**
   - Fit Assessment display
   - Strong Aspects list
   - Sections Needing Elaboration (with checkboxes)
   - Concept Document display with Download/Re-upload/Regenerate
   - Generate Updated Concept button

---

## 📊 Current Architecture Analysis

### Component Structure

#### **Step2ContentGeneration.tsx** (Current)
- **Location:** `frontend/src/tools/proposal-writer/pages/Step2ContentGeneration.tsx`
- **Lines:** 645 lines
- **Functionality:**
  - Displays Fit Assessment card
  - Shows Strong Aspects list
  - Renders Sections Needing Elaboration with checkboxes
  - Manages selected sections state
  - Expandable section details with suggestions
  - Strategic Verdict display
  - **NO document display or generation**

#### **Step3ConceptDocument.tsx** (Current)
- **Location:** `frontend/src/tools/proposal-writer/pages/Step3ConceptDocument.tsx`
- **Lines:** 1033 lines
- **Functionality:**
  - Displays generated concept document
  - Download as DOCX
  - Edit Sections modal (re-selects sections + user comments)
  - Document regeneration
  - Markdown parsing and rendering
  - User comments per section (ALREADY EXISTS!)

### Key Finding: user_comments Already Exists!

Looking at Step3ConceptDocument.tsx:

```typescript
// Line 32-34
interface SectionNeedingElaboration {
  section: string
  issue: string
  priority: 'Critical' | 'Recommended' | 'Optional'
  suggestions?: string[]
  selected?: boolean
  user_comment?: string  // ← ALREADY EXISTS!
}

// Line 126
const [userComments, setUserComments] = useState<{ [key: string]: string }>({})

// Lines 643-649 - Loading saved comments
const savedComments = sections.reduce((acc: any, s: any) => {
  if (s.user_comment) {
    acc[s.section] = s.user_comment
  }
  return acc
}, {})
```

**This means the user_comments field exists and is being saved/loaded!** We just need to make sure the UI displays the textarea for inputting comments.

---

## 🎨 Figma Mockup Analysis

### Mockup Details (node-id=359-1435 and node-id=834-818)

Both mockups show identical structure for **"Step 2: Concept Review"**:

#### 1. **Header Section**
- Title: "Step 2: Concept Review"
- Badge: "CONCEPT" (blue styling)
- Description: "AI review of your high-level concept with fit assessment and elaboration suggestions"

#### 2. **Fit Assessment Card**
- Icon: Target icon (green)
- Title: "Fit Assessment"
- Subtitle: "Overall alignment with donor priorities and RFP requirements"
- Badge: Shows alignment level (e.g., "Very strong alignment")
- Gray background box with justification text

#### 3. **Strong Aspects Card**
- Icon: Award icon (green)
- Title: "Strong Aspects of Your Proposal"
- Subtitle: "Key strengths identified in your initial concept"
- List of 5 items with green checkmarks

#### 4. **Sections Needing Elaboration**
- Icon: Sparkles icon (green)
- Title: "Sections Needing Elaboration"
- Subtitle: Instructions about selection
- Selection counter: "X sections selected"
- **Each expandable section contains:**
  - Checkbox for selection
  - Section name
  - Priority badge (Critical/Recommended/Optional)
  - "See more" / "See less" expand button
  - **When expanded:**
    - "Details and Guidance" subsection
    - "Suggestions" subsection with bullet list
    - **user_comments textarea** (THIS IS THE KEY ADDITION!)

#### 5. **Updated Concept Document Section**
- Title: "Updated Concept Document"
- Document display area with markdown rendering
- Three action buttons at bottom:
  - **Download** (outline style)
  - **Re-upload** (outline style)
  - **Regenerate** (outline style)

#### 6. **Bottom Action Button**
- **"Generate Updated Concept"** button (green, full width)
- Icon: Sparkles
- Only shows when sections are selected

---

## 🔧 Implementation Strategy

### Phase 1: Create New Unified Component

**Goal:** Create Step2ConceptReview.tsx that combines both Step 2 and Step 3

**Approach:** Start with Step2ContentGeneration.tsx as the base, then add Step 3 features

**Why this approach:**
- Step 2 has cleaner, more modern structure
- Step 3's document display can be added as a new section
- Easier to maintain existing Step 2 logic intact

---

## 📝 Detailed Implementation Steps

### STEP 1: Backup Current Files

**Action:** Create backups before making any changes

```bash
# In frontend/src/tools/proposal-writer/pages/
cp Step2ContentGeneration.tsx Step2ContentGeneration.tsx.backup
cp Step3ConceptDocument.tsx Step3ConceptDocument.tsx.backup
cp step2.module.css step2.module.css.backup
cp step3-concept.module.css step3-concept.module.css.backup
```

**Verification:**
- [ ] Backup files created
- [ ] Git status shows untracked backup files

---

### STEP 2: Create New Component File

**Action:** Create Step2ConceptReview.tsx

**File Location:** `frontend/src/tools/proposal-writer/pages/Step2ConceptReview.tsx`

**Base Code:** Copy from Step2ContentGeneration.tsx

```bash
cp Step2ContentGeneration.tsx Step2ConceptReview.tsx
```

**Rename:**
- Component name: `Step2ContentGeneration` → `Step2ConceptReview`
- Import references update accordingly

**Verification:**
- [ ] New file created
- [ ] Component name updated
- [ ] File compiles without errors

---

### STEP 3: Merge Type Definitions

**Action:** Add type definitions from Step3 to Step2ConceptReview.tsx

**Location:** Top of Step2ConceptReview.tsx (after existing interfaces)

**Add from Step3ConceptDocument.tsx:**

```typescript
/**
 * Props for the Step2ConceptReview component
 * Extends base StepProps with Step 2 specific properties
 */
interface Step2Props extends StepProps {
  /** AI-generated concept analysis (may be nested due to backend structure) */
  conceptAnalysis?: ConceptAnalysis | { concept_analysis: ConceptAnalysis }
  /** Generated concept document (can have various formats) */
  conceptDocument?: any | null
  /** Unique proposal identifier */
  proposalId?: string
  /** Callback to regenerate document with new selections */
  onRegenerateDocument?: (
    selectedSections: string[],
    userComments: { [key: string]: string }
  ) => void
  /** Callback when concept evaluation changes */
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  }) => void
}

/**
 * Represents a section that needs elaboration in the concept
 * UPDATED to include user_comment field
 */
interface SectionNeedingElaboration {
  /** Name of the section requiring elaboration */
  section: string
  /** Description of the issue or gap in the section */
  issue: string
  /** Priority level for addressing this section */
  priority: 'Critical' | 'Recommended' | 'Optional'
  /** Optional array of suggestions for improving the section */
  suggestions?: string[]
  /** Whether this section is selected for generation */
  selected?: boolean
  /** Optional user comment for this section - ADDED */
  user_comment?: string
}
```

**Verification:**
- [ ] Type definitions added
- [ ] No TypeScript errors
- [ ] All interfaces properly documented

---

### STEP 4: Add State Management for User Comments

**Action:** Add userComments state to component

**Location:** In Step2ConceptReview.tsx, inside the component function (after existing useState hooks)

**Add:**

```typescript
// User comments state - tracks comments for each section
const [userComments, setUserComments] = useState<{ [key: string]: string }>({})
```

**Update:** Modify the `onConceptEvaluationChange` effect to include userComments

**Find** (around line 192-198):

```typescript
useEffect(() => {
  if (onConceptEvaluationChange) {
    onConceptEvaluationChange({
      selectedSections,
    })
  }
}, [selectedSections, onConceptEvaluationChange])
```

**Replace with:**

```typescript
useEffect(() => {
  if (onConceptEvaluationChange) {
    onConceptEvaluationChange({
      selectedSections,
      userComments: Object.keys(userComments).length > 0 ? userComments : undefined,
    })
  }
}, [selectedSections, userComments, onConceptEvaluationChange])
```

**Verification:**
- [ ] userComments state added
- [ ] Effect updated to sync userComments
- [ ] No TypeScript errors

---

### STEP 5: Add User Comments Textarea to Section Item

**Action:** Update SectionItem component to include user comments textarea

**Location:** In Step2ConceptReview.tsx, find the `SectionItem` component (around line 343-414)

**Modify the expanded content section** (after `suggestionsSection`):

**Find** (around line 393-411):

```typescript
{/* Expanded content - shown when isExpanded is true */}
{isExpanded && (
  <div className={styles.sectionItemContent}>
    {/* Details and guidance */}
    <div className={styles.detailsSection}>
      <h4 className={styles.subsectionTitle}>Details and Guidance</h4>
      <p className={styles.subsectionText}>{section.issue}</p>
    </div>

    {/* Suggestions */}
    <div className={styles.suggestionsSection}>
      <h4 className={styles.subsectionTitle}>Suggestions</h4>
      <ul className={styles.suggestionsList}>
        {suggestions.map((suggestion, idx) => (
          <li key={idx}>{suggestion}</li>
        ))}
      </ul>
    </div>
  </div>
)}
```

**Replace with:**

```typescript
{/* Expanded content - shown when isExpanded is true */}
{isExpanded && (
  <div className={styles.sectionItemContent}>
    {/* Details and guidance */}
    <div className={styles.detailsSection}>
      <h4 className={styles.subsectionTitle}>Details and Guidance</h4>
      <p className={styles.subsectionText}>{section.issue}</p>
    </div>

    {/* Suggestions */}
    <div className={styles.suggestionsSection}>
      <h4 className={styles.subsectionTitle}>Suggestions</h4>
      <ul className={styles.suggestionsList}>
        {suggestions.map((suggestion, idx) => (
          <li key={idx}>{suggestion}</li>
        ))}
      </ul>
    </div>

    {/* User Comments - NEW SECTION */}
    <div className={styles.commentsSection}>
      <h4 className={styles.subsectionTitle}>Your Comments</h4>
      <textarea
        className={styles.commentTextarea}
        placeholder="Add your thoughts, additional context, or specific requirements for this section..."
        value={userComment || ''}
        onChange={(e) => onCommentChange(e.target.value)}
      />
    </div>
  </div>
)}
```

**Update SectionItemProps interface:**

```typescript
interface SectionItemProps {
  section: SectionNeedingElaboration
  isSelected: boolean
  isExpanded: boolean
  onToggleSelection: () => void
  onToggleExpansion: () => void
  userComment?: string  // NEW
  onCommentChange: (comment: string) => void  // NEW
}
```

**Update SectionItem function signature:**

```typescript
function SectionItem({
  section,
  isSelected,
  isExpanded,
  onToggleSelection,
  onToggleExpansion,
  userComment,  // NEW
  onCommentChange,  // NEW
}: SectionItemProps) {
```

**Verification:**
- [ ] User comments textarea added
- [ ] Props interface updated
- [ ] Function signature updated
- [ ] No TypeScript errors

---

### STEP 6: Update Parent Component to Pass User Comments

**Action:** Update SectionsNeedingElaborationCard to handle user comments

**Location:** In Step2ConceptReview.tsx, find SectionsNeedingElaborationCard component (around line 456-512)

**Update Props Interface:**

```typescript
interface SectionsNeedingElaborationCardProps {
  sections: SectionNeedingElaboration[]
  selectedSections: string[]
  expandedSections: string[]
  onToggleSection: (sectionName: string) => void
  onToggleExpansion: (sectionName: string) => void
  hasConceptDocument?: boolean
  userComments: { [key: string]: string }  // NEW
  onCommentChange: (sectionName: string, comment: string) => void  // NEW
}
```

**Update function signature:**

```typescript
function SectionsNeedingElaborationCard({
  sections,
  selectedSections,
  expandedSections,
  onToggleSection,
  onToggleExpansion,
  hasConceptDocument,
  userComments,  // NEW
  onCommentChange,  // NEW
}: SectionsNeedingElaborationCardProps) {
```

**Update the SectionItem usage** (around line 498-507):

```typescript
<SectionItem
  key={index}
  section={section}
  isSelected={selectedSections.includes(section.section)}
  isExpanded={expandedSections.includes(section.section)}
  onToggleSelection={() => onToggleSection(section.section)}
  onToggleExpansion={() => onToggleExpansion(section.section)}
  userComment={userComments[section.section]}  // NEW
  onCommentChange={(comment) => onCommentChange(section.section, comment)}  // NEW
/>
```

**Verification:**
- [ ] Props updated
- [ ] Function signature updated
- [ ] SectionItem receives user comment props
- [ ] No TypeScript errors

---

### STEP 7: Create Handler for Comment Changes

**Action:** Add handleCommentChange in main component

**Location:** In Step2ConceptReview.tsx, in the main component, after event handlers section (around line 574-585)

**Add:**

```typescript
/**
 * Handles changes to user comments for a section
 * Updates the userComments state with the new comment
 */
const handleCommentChange = (sectionName: string, comment: string) => {
  setUserComments(prev => ({
    ...prev,
    [sectionName]: comment,
  }))
}
```

**Update the SectionsNeedingElaborationCard call** in render section (around line 630-637):

```typescript
<SectionsNeedingElaborationCard
  sections={sections_needing_elaboration}
  selectedSections={selectedSections}
  expandedSections={expandedSections}
  onToggleSection={toggleSection}
  onToggleExpansion={toggleExpansion}
  hasConceptDocument={!!conceptDocument}
  userComments={userComments}  // NEW
  onCommentChange={handleCommentChange}  // NEW
/>
```

**Verification:**
- [ ] Handler function added
- [ ] Component receives handler
- [ ] User can type in comment fields
- [ ] Comments are saved to state

---

### STEP 8: Add Concept Document Display Section

**Action:** Import document display utilities from Step3ConceptDocument.tsx

**Location:** In Step2ConceptReview.tsx, after the StrategicVerdict component (around line 530)

**Add New Imports:**

```typescript
import { FileText, Download, Sparkles } from 'lucide-react'
import { Document, Packer, Paragraph, HeadingLevel } from 'docx'
```

**Add New State:**

```typescript
const [isDownloading, setIsDownloading] = useState(false)
```

**Add Utility Functions** (copy from Step3ConceptDocument.tsx lines 142-501):

```typescript
/**
 * Extracts content from various possible document structures
 * Priority: generated_concept_document > content > document > proposal_outline > sections
 */
const extractDocumentContent = useCallback((doc: any): string => {
  if (!doc) return ''

  // String content
  if (typeof doc === 'string') return doc

  // New format: generated_concept_document
  if (doc.generated_concept_document) return doc.generated_concept_document

  // Content field
  if (doc.content) return doc.content

  // Document field
  if (doc.document) return doc.document

  // Proposal outline structure
  if (doc.proposal_outline && Array.isArray(doc.proposal_outline)) {
    return doc.proposal_outline
      .map(section => {
        const title = section.section_title || ''
        const purpose = section.purpose || ''
        const wordCount = section.recommended_word_count || ''
        const questions = Array.isArray(section.guiding_questions)
          ? section.guiding_questions.map(q => `- ${q}`).join('\n')
          : ''
        return `## ${title}\n\n**Purpose:** ${purpose}\n\n**Recommended Word Count:** ${wordCount}\n\n**Guiding Questions:**\n${questions}`
      })
      .join('\n\n')
  }

  // Sections object
  if (doc.sections && typeof doc.sections === 'object') {
    return Object.entries(doc.sections)
      .map(([key, value]) => `## ${key}\n\n${value}`)
      .join('\n\n')
  }

  // Fallback
  return JSON.stringify(doc, null, 2)
}, [])

/**
 * Formats inline markdown (bold, italic, code)
 */
const formatInlineMarkdown = useCallback((text: string): string => {
  let formatted = text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')
  return formatted
}, [])

/**
 * Parses markdown content to React elements
 * Handles headers, lists, and paragraphs
 */
const parseMarkdownToReact = useCallback(
  (markdown: string): JSX.Element[] => {
    const lines = markdown.split('\n')
    const elements: JSX.Element[] = []
    let currentList: string[] = []
    let currentParagraph: string[] = []

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className={styles.markdownList}>
            {currentList.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
            ))}
          </ul>
        )
        currentList = []
      }
    }

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ')
        if (text.trim()) {
          elements.push(
            <p
              key={`p-${elements.length}`}
              className={styles.markdownParagraph}
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }}
            />
          )
        }
        currentParagraph = []
      }
    }

    lines.forEach((line, index) => {
      if (line.startsWith('### ')) {
        flushList()
        flushParagraph()
        elements.push(
          <h3 key={`h3-${index}`} className={styles.markdownH3}>
            {line.substring(4)}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        flushList()
        flushParagraph()
        elements.push(
          <h2 key={`h2-${index}`} className={styles.markdownH2}>
            {line.substring(3)}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        flushList()
        flushParagraph()
        elements.push(
          <h1 key={`h1-${index}`} className={styles.markdownH1}>
            {line.substring(2)}
          </h1>
        )
      } else if (line.match(/^[*-]\s+/)) {
        flushParagraph()
        currentList.push(line.replace(/^[*-]\s+/, ''))
      } else if (line.trim() === '') {
        flushList()
        flushParagraph()
      } else {
        flushList()
        currentParagraph.push(line)
      }
    })

    flushList()
    flushParagraph()

    return elements
  },
  [formatInlineMarkdown]
)

/**
 * Converts markdown to DOCX Paragraph objects for document export
 */
const markdownToParagraphs = useCallback((markdown: string): Paragraph[] => {
  const lines = markdown.split('\n')
  const paragraphs: Paragraph[] = []

  lines.forEach(line => {
    if (line.startsWith('### ')) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        })
      )
    } else if (line.startsWith('## ')) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      )
    } else if (line.startsWith('# ')) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      )
    } else if (line.match(/^[*-]\s+/)) {
      paragraphs.push(
        new Paragraph({
          text: line.replace(/^[*-]\s+/, ''),
          bullet: { level: 0 },
          spacing: { after: 50 },
        })
      )
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: '' }))
    } else if (line.trim()) {
      paragraphs.push(
        new Paragraph({
          text: line.trim(),
          spacing: { after: 100 },
        })
      )
    }
  })

  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: 'No content available' })]
}, [])

/**
 * Handles document download as DOCX file
 */
const handleDownloadDocument = useCallback(
  async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    setIsDownloading(true)

    try {
      const content = extractDocumentContent(conceptDocument)
      const sections = markdownToParagraphs(content)
      const doc = new Document({
        sections: [{ children: sections }],
      })

      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `concept-document-${new Date().toISOString().slice(0, 10)}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      alert('Error generating document. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  },
  [conceptDocument, extractDocumentContent, markdownToParagraphs]
)
```

**Verification:**
- [ ] Imports added
- [ ] State added
- [ ] Utility functions added
- [ ] No TypeScript errors

---

### STEP 9: Add Concept Document Display Component

**Action:** Create UpdatedConceptDocumentCard component

**Location:** In Step2ConceptReview.tsx, after StrategicVerdict component (around line 530)

**Add:**

```typescript
/**
 * Updated Concept Document Card Component
 * Displays the generated concept document with download, re-upload, and regenerate options
 */
interface UpdatedConceptDocumentCardProps {
  conceptDocument: any
  proposalId?: string
  onRegenerateDocument?: (selectedSections: string[], userComments: { [key: string]: string }) => void
  selectedSections: string[]
  userComments: { [key: string]: string }
  isDownloading: boolean
  onDownload: () => void
}

function UpdatedConceptDocumentCard({
  conceptDocument,
  proposalId,
  onRegenerateDocument,
  selectedSections,
  userComments,
  isDownloading,
  onDownload,
}: UpdatedConceptDocumentCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!proposalId || !onRegenerateDocument) {
      alert('Unable to regenerate document. Please try again.')
      return
    }

    setIsRegenerating(true)
    try {
      await onRegenerateDocument(selectedSections, userComments)
    } catch (error) {
      console.error('Regeneration error:', error)
      alert('Error regenerating document. Please try again.')
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleReupload = () => {
    // TODO: Implement re-upload functionality
    alert('Re-upload functionality coming soon!')
  }

  // If no document, don't render
  if (!conceptDocument) {
    return null
  }

  return (
    <div className={styles.documentCard}>
      <div className={styles.documentHeader}>
        <div className={styles.documentHeaderLeft}>
          <FileText size={20} color="#00A63E" />
          <div>
            <h3 className={styles.documentTitle}>Updated Concept Document</h3>
            <p className={styles.documentSubtitle}>
              Review your enhanced concept document with elaborated sections
            </p>
          </div>
        </div>
      </div>

      <div className={styles.documentContent}>
        <div className={styles.markdownContent}>
          {parseMarkdownToReact(extractDocumentContent(conceptDocument))}
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.downloadButton}
          onClick={onDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <div className={styles.spinner}></div>
              Downloading...
            </>
          ) : (
            <>
              <Download size={16} />
              Download
            </>
          )}
        </button>

        <button
          className={styles.reuploadButton}
          onClick={handleReupload}
        >
          <FileText size={16} />
          Re-upload
        </button>

        <button
          className={styles.regenerateButton}
          onClick={handleRegenerate}
          disabled={isRegenerating || selectedSections.length === 0}
        >
          {isRegenerating ? (
            <>
              <div className={styles.spinner}></div>
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Regenerate
            </>
          )}
        </button>
      </div>
    </div>
  )
}
```

**Add to Main Render** (after StrategicVerdict, around line 640):

```typescript
{/* Strategic Verdict (if available) */}
<StrategicVerdict verdict={strategic_verdict} />

{/* Updated Concept Document (if available) - NEW */}
{conceptDocument && (
  <UpdatedConceptDocumentCard
    conceptDocument={conceptDocument}
    proposalId={proposalId}
    onRegenerateDocument={onRegenerateDocument}
    selectedSections={selectedSections}
    userComments={userComments}
    isDownloading={isDownloading}
    onDownload={handleDownloadDocument}
  />
)}
```

**Verification:**
- [ ] Component added
- [ ] Renders when conceptDocument exists
- [ ] Download button works
- [ ] No TypeScript errors

---

### STEP 10: Add Generate Updated Concept Button

**Action:** Add bottom action button (only shows when sections selected and NO document exists)

**Location:** After UpdatedConceptDocumentCard in render (around line 655)

**Add:**

```typescript
{/* Generate Updated Concept Button - only show if no document and sections selected */}
{!conceptDocument && selectedSections.length > 0 && (
  <div className={styles.generateButtonContainer}>
    <button
      className={styles.generateConceptButton}
      onClick={async () => {
        if (onRegenerateDocument) {
          await onRegenerateDocument(selectedSections, userComments)
        }
      }}
    >
      <Sparkles size={20} />
      Generate Updated Concept
    </button>
  </div>
)}
```

**Verification:**
- [ ] Button appears when no document exists
- [ ] Button hidden when document exists
- [ ] Button triggers generation
- [ ] No TypeScript errors

---

### STEP 11: Merge CSS Styles

**Action:** Create step2-concept-review.module.css by merging both CSS files

**File Location:** `frontend/src/tools/proposal-writer/pages/step2-concept-review.module.css`

**Approach:** Start with step2.module.css, add unique styles from step3-concept.module.css

**Copy step2.module.css:**

```bash
cp step2.module.css step2-concept-review.module.css
```

**Add from step3-concept.module.css** (append to end):

```css
/* ========================================
   DOCUMENT DISPLAY STYLES (from Step 3)
   ======================================== */

/* Document Card */
.documentCard {
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 14px;
  padding: 24px;
  margin-top: 24px;
}

.documentHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #E5E7EB;
}

.documentHeaderLeft {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.documentTitle {
  font-size: 18px;
  font-weight: 400;
  line-height: 28px;
  color: #0A0A0A;
  margin: 0;
}

.documentSubtitle {
  font-size: 14px;
  line-height: 20px;
  color: #717182;
  margin: 4px 0 0 0;
}

/* Document Content */
.documentContent {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 24px;
  margin-bottom: 24px;
  max-height: 600px;
  overflow-y: auto;
  overflow-x: hidden;
  word-wrap: break-word;
}

.markdownContent {
  font-family: 'Arial', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #0A0A0A;
}

.markdownH1 {
  font-size: 24px;
  font-weight: 600;
  color: #0A0A0A;
  margin: 24px 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #E5E7EB;
}

.markdownH1:first-child {
  margin-top: 0;
}

.markdownH2 {
  font-size: 20px;
  font-weight: 600;
  color: #0A0A0A;
  margin: 20px 0 10px 0;
}

.markdownH3 {
  font-size: 16px;
  font-weight: 600;
  color: #0A0A0A;
  margin: 16px 0 8px 0;
}

.markdownParagraph {
  font-size: 14px;
  line-height: 1.8;
  color: #374151;
  margin: 0 0 12px 0;
  text-align: justify;
}

.markdownList {
  margin: 8px 0 16px 0;
  padding-left: 24px;
}

.markdownList li {
  font-size: 14px;
  line-height: 1.8;
  color: #374151;
  margin-bottom: 6px;
}

.markdownList li strong {
  font-weight: 600;
  color: #0A0A0A;
}

.markdownList li em {
  font-style: italic;
}

.markdownList li code {
  background: #F3F4F6;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #DB2777;
}

/* Action Buttons */
.buttonGroup {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.downloadButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  color: #0A0A0A;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
}

.downloadButton:hover:not(:disabled) {
  background: #F9FAFB;
  border-color: #9CA3AF;
}

.downloadButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reuploadButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #FFFFFF;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  color: #0A0A0A;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
}

.reuploadButton:hover:not(:disabled) {
  background: #F9FAFB;
  border-color: #9CA3AF;
}

.regenerateButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #FFFFFF;
  border: 1px solid #00A63E;
  border-radius: 8px;
  color: #00A63E;
  font-size: 14px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.2s;
}

.regenerateButton:hover:not(:disabled) {
  background: #F0FDF4;
}

.regenerateButton:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #00A63E;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Generate Updated Concept Button */
.generateButtonContainer {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.generateConceptButton {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 32px;
  background: #00A63E;
  border: none;
  border-radius: 8px;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0, 166, 62, 0.2);
}

.generateConceptButton:hover {
  background: #008C34;
  box-shadow: 0 6px 10px rgba(0, 166, 62, 0.3);
  transform: translateY(-2px);
}

.generateConceptButton:active {
  transform: translateY(0);
}

/* Responsive */
@media (max-width: 768px) {
  .documentCard {
    padding: 16px;
  }

  .documentHeader {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .documentContent {
    padding: 16px;
    max-height: 400px;
  }

  .markdownH1 {
    font-size: 20px;
  }

  .markdownH2 {
    font-size: 18px;
  }

  .markdownH3 {
    font-size: 16px;
  }

  .buttonGroup {
    flex-direction: column;
  }

  .downloadButton,
  .reuploadButton,
  .regenerateButton {
    width: 100%;
    justify-content: center;
  }

  .generateConceptButton {
    width: 100%;
    justify-content: center;
  }
}
```

**Update Import in Component:**

Change from:
```typescript
import styles from './step2.module.css'
```

To:
```typescript
import styles from './step2-concept-review.module.css'
```

**Verification:**
- [ ] New CSS file created
- [ ] All styles from both files merged
- [ ] Import updated in component
- [ ] UI renders correctly

---

### STEP 12: Update ProposalWriterPage.tsx

**Action:** Replace Step2 and Step3 with new unified component

**Location:** `frontend/src/tools/proposal-writer/pages/ProposalWriterPage.tsx`

**Step 12.1: Update Imports**

**Find** (around lines 7-9):

```typescript
import { Step1InformationConsolidation } from './Step1InformationConsolidation'
import { Step2ContentGeneration } from './Step2ContentGeneration'
import Step3ConceptDocument from './Step3ConceptDocument'
```

**Replace with:**

```typescript
import { Step1InformationConsolidation } from './Step1InformationConsolidation'
import { Step2ConceptReview } from './Step2ConceptReview'
```

**Step 12.2: Update Step Rendering Logic**

**Find the step rendering section** (search for `currentStep === 2` and `currentStep === 3`)

**Replace Step 2 rendering:**

```typescript
{currentStep === 2 && (
  <Step2ConceptReview
    conceptAnalysis={conceptAnalysis}
    conceptEvaluationData={conceptEvaluationData}
    onConceptEvaluationChange={handleConceptEvaluationChange}
    conceptDocument={conceptDocument}
    proposalId={proposalId}
    onRegenerateDocument={handleRegenerateDocument}
  />
)}
```

**Remove Step 3 rendering** (delete the entire block):

```typescript
{currentStep === 3 && (
  <Step3ConceptDocument
    conceptDocument={conceptDocument}
    conceptAnalysis={conceptAnalysis}
    proposalId={proposalId}
    onRegenerateDocument={handleRegenerateDocument}
    onConceptEvaluationChange={handleConceptEvaluationChange}
  />
)}
```

**Step 12.3: Update Step 3 and Step 4 to Show Coming Soon**

**Replace with:**

```typescript
{currentStep === 3 && (
  <ComingSoonPlaceholder
    stepNumber={3}
    stepTitle="Proposal Template Selection"
    expectedFeatures={[
      'Choose from donor-specific templates',
      'Customize proposal structure',
      'Map concept sections to proposal outline',
    ]}
  />
)}

{currentStep === 4 && (
  <ComingSoonPlaceholder
    stepNumber={4}
    stepTitle="Full Proposal Generation"
    expectedFeatures={[
      'AI-powered full proposal writing',
      'Section-by-section generation',
      'Download complete proposal',
    ]}
  />
)}
```

**Verification:**
- [ ] Imports updated
- [ ] Step 2 renders new unified component
- [ ] Step 3 removed
- [ ] Steps 3-4 show Coming Soon placeholder
- [ ] No TypeScript errors
- [ ] Application compiles

---

### STEP 13: Update Backend - Concept Evaluation Service

**Action:** Update concept_evaluation/service.py to receive Step 2 analyses

**File Location:** `backend/app/tools/proposal_writer/concept_evaluation/service.py`

**This change was ALREADY IMPLEMENTED** in the previous conversation. Verify it's correct:

**Check lines 60-90:**

```python
def analyze_concept(
    self,
    proposal_id: str,
    rfp_analysis: Dict,
    reference_proposals_analysis: Optional[Dict] = None,  # Should exist
    existing_work_analysis: Optional[Dict] = None          # Should exist
) -> Dict[str, Any]:
```

**Check lines 288-369** for `_build_user_prompt`:

```python
def _build_user_prompt(self, prompt_parts, concept_text, rfp_analysis,
                       reference_proposals_analysis, existing_work_analysis):
    # ... code ...

    # Should have these replacements:
    user_prompt = user_prompt.replace("{{reference_proposal_analysis}}", reference_proposals_json)
    user_prompt = user_prompt.replace("{{reference_proposals_analysis}}", reference_proposals_json)
    user_prompt = user_prompt.replace("{{existing_work_analysis}}", existing_work_json)
```

**Verification:**
- [ ] analyze_concept receives both analyses
- [ ] _build_user_prompt injects both analyses
- [ ] Both singular and plural forms supported
- [ ] Worker passes analyses to this service

**If NOT implemented, follow these sub-steps:**

<details>
<summary>Click to expand: Backend Update Steps (if needed)</summary>

**Sub-step 13.1:** Update analyze_concept signature

**Location:** Line ~60

```python
def analyze_concept(
    self,
    proposal_id: str,
    rfp_analysis: Dict,
    reference_proposals_analysis: Optional[Dict] = None,
    existing_work_analysis: Optional[Dict] = None
) -> Dict[str, Any]:
```

**Sub-step 13.2:** Update _build_user_prompt

**Location:** Line ~126

```python
user_prompt = self._build_user_prompt(
    prompt_parts,
    concept_text,
    rfp_analysis,
    reference_proposals_analysis,  # NEW
    existing_work_analysis         # NEW
)
```

**Sub-step 13.3:** Update _build_user_prompt signature and logic

**Location:** Line ~288

```python
def _build_user_prompt(
    self,
    prompt_parts: List[Dict],
    concept_text: str,
    rfp_analysis: Dict,
    reference_proposals_analysis: Optional[Dict] = None,
    existing_work_analysis: Optional[Dict] = None
) -> str:
    """Build the complete user prompt with all required data."""

    # ... existing RFP analysis code ...

    # Add Reference Proposals Analysis
    reference_proposals_json = "No reference proposals analysis available"
    if reference_proposals_analysis:
        ref_unwrapped = self._unwrap_analysis(reference_proposals_analysis)
        reference_proposals_json = json.dumps(ref_unwrapped, indent=2)

    # Add Existing Work Analysis
    existing_work_json = "No existing work analysis available"
    if existing_work_analysis:
        work_unwrapped = self._unwrap_analysis(existing_work_analysis)
        existing_work_json = json.dumps(work_unwrapped, indent=2)

    # Replace placeholders (support both singular and plural forms)
    user_prompt = user_prompt.replace("{{reference_proposal_analysis}}", reference_proposals_json)
    user_prompt = user_prompt.replace("{{reference_proposals_analysis}}", reference_proposals_json)
    user_prompt = user_prompt.replace("{{existing_work_analysis}}", existing_work_json)

    return user_prompt
```

**Sub-step 13.4:** Update worker.py to pass analyses

**File:** `backend/app/tools/proposal_writer/workflow/worker.py`

**Location:** Line ~506

```python
# Get Step 2 analyses
reference_proposals_analysis = proposal.get("reference_proposals_analysis")
existing_work_analysis = proposal.get("existing_work_analysis")

result = analyzer.analyze_concept(
    proposal_id,
    rfp_analysis,
    reference_proposals_analysis,
    existing_work_analysis
)
```

</details>

---

### STEP 14: Testing Checklist

**Action:** Test all functionality systematically

#### 14.1 Visual Testing

- [ ] **Step 2 Header**: Title, badge, description all render correctly
- [ ] **Fit Assessment Card**: Icon, badge, text display properly
- [ ] **Strong Aspects Card**: Icon, list with checkmarks render
- [ ] **Sections Card**: Header, selection counter, sections list
- [ ] **Section Items**: Checkbox, title, priority badge, expand button
- [ ] **Expanded Section**: Details, Suggestions, User Comments textarea all visible
- [ ] **User Comments**: Textarea accepts input, saves to state
- [ ] **Strategic Verdict**: Displays if available
- [ ] **Updated Concept Document Card**: Shows when document exists
- [ ] **Document Content**: Markdown renders correctly
- [ ] **Action Buttons**: Download, Re-upload, Regenerate display
- [ ] **Generate Button**: Shows when no document and sections selected

#### 14.2 Functional Testing

- [ ] **Load existing draft**: All data loads from localStorage/DynamoDB
- [ ] **Select sections**: Checkbox toggles work correctly
- [ ] **Expand sections**: See more/See less works
- [ ] **Type comments**: User can type in comment fields
- [ ] **Comments persist**: Comments save when navigating away and back
- [ ] **Download document**: DOCX downloads correctly
- [ ] **Regenerate document**: Triggers regeneration with new selections + comments
- [ ] **Generate new concept**: Initial generation works with selections + comments

#### 14.3 Data Flow Testing

- [ ] **Selected sections sync**: Changes reflect in parent component
- [ ] **User comments sync**: Comments sync to parent component
- [ ] **onConceptEvaluationChange**: Callback fires with correct data
- [ ] **onRegenerateDocument**: Callback receives selectedSections + userComments
- [ ] **Backend receives comments**: Prompt 3 gets user_comments in payload

#### 14.4 Navigation Testing

- [ ] **Step 1 → Step 2**: Navigation works
- [ ] **Step 2 → Step 3**: Shows Coming Soon placeholder
- [ ] **Return to Step 2**: All state preserved (selections, comments, document)
- [ ] **Sidebar shows correct step**: Progress indicator accurate

#### 14.5 Responsive Testing

- [ ] **Desktop (1920px)**: All elements aligned correctly
- [ ] **Laptop (1366px)**: Layout adapts properly
- [ ] **Tablet (768px)**: Mobile styles apply
- [ ] **Mobile (375px)**: All elements stack vertically

#### 14.6 Edge Cases

- [ ] **No concept analysis**: Empty state shows
- [ ] **No document**: Generate button shows
- [ ] **No sections selected**: Generate button disabled
- [ ] **Empty comments**: Works without comments
- [ ] **Long document**: Scroll works correctly
- [ ] **Many sections**: All render without performance issues

---

### STEP 15: Backend Verification - Prompt 3 Uses Comments

**Action:** Verify that Prompt 3 in DynamoDB uses user_comments

**Location:** DynamoDB Table `igad-prompts-prod` (or your environment)

**Check Prompt 3 - Agent 3:**

**Key:** Should be something like:
```
PK: PROMPT#step-1
SK: 3  (or similar)
```

**Verify prompt_parts contains placeholders:**
- `{{reference_proposal_analysis}}` or `{{reference_proposals_analysis}}`
- `{{existing_work_analysis}}`
- User instructions should mention using user comments from sections

**Expected Prompt Structure:**

```
You are generating an updated concept document based on:

1. RFP Analysis: {{rfp_analysis}}
2. Reference Proposals Analysis: {{reference_proposals_analysis}}
3. Existing Work Analysis: {{existing_work_analysis}}
4. Selected sections that need elaboration
5. User comments for each section

For each selected section:
- Review the original concept
- Consider the user's comments and specific requirements
- Incorporate guidance from reference proposals
- Leverage insights from existing work analysis
- Generate comprehensive, donor-aligned content

Generate a complete concept document with all selected sections fully elaborated.
```

**If prompt doesn't include these, update it in DynamoDB.**

**Verification:**
- [ ] Prompt 3 exists in DynamoDB
- [ ] Contains {{reference_proposals_analysis}} placeholder
- [ ] Contains {{existing_work_analysis}} placeholder
- [ ] Instructions mention using user comments

---

### STEP 16: Final Code Cleanup

**Action:** Clean up commented code, add documentation

#### 16.1 Remove Unused Code

- [ ] Remove old Step2ContentGeneration.tsx (keep backup)
- [ ] Remove old Step3ConceptDocument.tsx (keep backup)
- [ ] Remove old step2.module.css (keep backup)
- [ ] Remove old step3-concept.module.css (keep backup)

#### 16.2 Update Documentation

**Add JSDoc comments to:**
- [ ] Step2ConceptReview main component
- [ ] All sub-components (FitAssessmentCard, etc.)
- [ ] All handler functions
- [ ] All utility functions

#### 16.3 Code Formatting

- [ ] Run `npm run lint` in frontend
- [ ] Fix any linting errors
- [ ] Run `npm run format` (if available)

#### 16.4 Git Commit

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat(proposal-writer): merge Step 2 and Step 3 into unified Concept Review

- Create Step2ConceptReview.tsx combining Step2ContentGeneration and Step3ConceptDocument
- Add user_comments textarea to sections for user input
- Update Prompt 3 to receive reference_proposals_analysis and existing_work_analysis
- Add concept document display with Download/Re-upload/Regenerate buttons
- Add 'Generate Updated Concept' button for initial generation
- Update ProposalWriterPage to use unified Step 2 component
- Merge CSS styles from both components into step2-concept-review.module.css
- Update sidebar logic for new 4-step flow (Steps 3-4 now Coming Soon)

BREAKING CHANGE: Step 3 (Updated Concept Document) merged into Step 2 (Concept Review)
"
```

**Verification:**
- [ ] All changes committed
- [ ] Commit message descriptive
- [ ] No uncommitted changes remain

---

## 🚀 Deployment Checklist

### Frontend Deployment

1. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Verify Build:**
   - [ ] No build errors
   - [ ] Bundle size reasonable
   - [ ] All assets included

3. **Deploy:**
   ```bash
   # Follow your deployment process
   # Example: AWS Amplify, Vercel, etc.
   ```

### Backend Deployment

1. **Verify Prompt 3 in DynamoDB:**
   - [ ] Prompt includes new placeholders
   - [ ] Prompt instructions mention user comments

2. **Test Backend Endpoints:**
   ```bash
   # Test concept evaluation endpoint
   curl -X POST https://your-api/concept-evaluation \
     -H "Content-Type: application/json" \
     -d '{
       "proposal_id": "test-id",
       "rfp_analysis": {...},
       "reference_proposals_analysis": {...},
       "existing_work_analysis": {...},
       "selected_sections": ["Section 1"],
       "user_comments": {"Section 1": "Test comment"}
     }'
   ```

3. **Monitor Logs:**
   - [ ] CloudWatch logs show correct data flow
   - [ ] No errors in Lambda execution
   - [ ] User comments appear in generated documents

---

## ⚠️ Common Pitfalls to Avoid

### 1. Don't Break Existing Functionality

❌ **DON'T:**
- Remove features that currently work
- Change data structures without updating all usages
- Modify backend without testing frontend impact

✅ **DO:**
- Test thoroughly after each step
- Keep backups of working code
- Update both frontend and backend together

### 2. Don't Forget User Comments

❌ **DON'T:**
- Assume user_comments is just for display
- Forget to pass comments to backend
- Ignore comments in document generation

✅ **DO:**
- Include comments in all API calls
- Verify comments appear in generated documents
- Test with and without comments

### 3. Don't Ignore TypeScript Errors

❌ **DON'T:**
- Use `any` types everywhere
- Ignore compiler warnings
- Skip type checking

✅ **DO:**
- Fix TypeScript errors immediately
- Use proper interfaces
- Run `npm run type-check` frequently

### 4. Don't Skip Testing

❌ **DON'T:**
- Test only happy path
- Skip edge cases
- Assume it works without verification

✅ **DO:**
- Test all scenarios in checklist
- Test on multiple devices/browsers
- Test with real data

---

## 📊 Success Criteria

### Functional Requirements

- [x] Step 2 displays Fit Assessment
- [x] Step 2 displays Strong Aspects
- [x] Step 2 displays Sections Needing Elaboration with checkboxes
- [x] Step 2 displays user_comments textarea in expanded sections
- [x] Step 2 displays Updated Concept Document when available
- [x] Download button generates DOCX file correctly
- [x] Regenerate button triggers document regeneration with new selections + comments
- [x] Generate Updated Concept button appears when no document exists
- [x] User comments persist across navigation
- [x] Backend receives user_comments in Prompt 3
- [x] Generated documents reflect user comments

### Technical Requirements

- [x] No TypeScript errors
- [x] No console errors
- [x] Code properly documented
- [x] Git history clean
- [x] All tests pass

### UX Requirements

- [x] UI matches Figma mockups
- [x] Responsive on all screen sizes
- [x] Loading states display correctly
- [x] Error messages are user-friendly
- [x] Navigation is intuitive

---

## 🔄 Rollback Plan

If issues arise, rollback using:

```bash
# Restore from backups
cp Step2ContentGeneration.tsx.backup Step2ContentGeneration.tsx
cp Step3ConceptDocument.tsx.backup Step3ConceptDocument.tsx
cp step2.module.css.backup step2.module.css
cp step3-concept.module.css.backup step3-concept.module.css

# Restore ProposalWriterPage.tsx
git checkout HEAD -- ProposalWriterPage.tsx

# Remove new files
rm Step2ConceptReview.tsx
rm step2-concept-review.module.css

# Rebuild
npm run build
```

---

## 📞 Support

If you encounter issues during implementation:

1. **Check Console Logs:** Look for errors in browser console and CloudWatch
2. **Verify Data Flow:** Use console.log to trace data through components
3. **Test in Isolation:** Test each component separately
4. **Review Git Diff:** Compare changes against working version
5. **Ask for Help:** Don't hesitate to request assistance

---

## ✅ Final Verification

Before marking this as complete, verify:

- [ ] All steps in this plan completed
- [ ] All tests pass
- [ ] Code deployed to production
- [ ] User acceptance testing completed
- [ ] Documentation updated
- [ ] Team trained on new workflow

---

## 📝 Notes for KIRO

**Important Reminders:**

1. **Take Your Time:** This is a complex merge. Don't rush.

2. **Test Frequently:** After each major step, test that everything still works.

3. **Document as You Go:** Add comments explaining why you made certain decisions.

4. **Keep Backups:** Never delete old code until new code is verified working.

5. **User Comments are Critical:** This feature allows users to provide context for AI generation. Make sure it works end-to-end.

6. **Backend Already Updated:** The backend changes for Prompt 3 receiving reference_proposals_analysis and existing_work_analysis are already implemented. Just verify they work.

7. **CSS Conflicts:** If you see styling issues, check for conflicting class names between the merged CSS files.

8. **Mobile First:** Test on mobile devices early. Responsive issues are easier to fix early.

---

**Good luck with the implementation! 🚀**

**If you have any questions about this plan, please ask before starting implementation.**
