# Step 3: Outline Review - Frontend Specification

## Overview

This document specifies the frontend implementation for Step 3 of the Newsletter Generator. Step 3 allows users to review, edit, and customize an AI-generated newsletter outline before proceeding to draft generation.

---

## Components to Create

### 1. ContentSummaryCard.tsx

**Purpose:** Display a read-only summary of Step 2 content planning results.

**Location:** `frontend/src/tools/newsletter-generator/components/ContentSummaryCard.tsx`

**Props:**
```typescript
interface ContentSummaryCardProps {
  selectedTopics: string[]
  totalChunks: number
  lengthPreference: string
  retrievalCompletedAt: string
}
```

**UI Elements:**
- Card container with `.infoCard` styling
- Topic badges showing selected information types
- Chunk count display
- Length preference display
- Retrieval timestamp

**Behavior:**
- Read-only display, no interactions
- Shows Step 2 data in compact format
- Links back to Step 2 for changes

---

### 2. OutlineGenerator.tsx

**Purpose:** Handle outline generation trigger, status display, and regeneration.

**Location:** `frontend/src/tools/newsletter-generator/components/OutlineGenerator.tsx`

**Props:**
```typescript
interface OutlineGeneratorProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
  generatedAt?: string
  onGenerate: () => void
  onRegenerate: () => void
  hasCustomItems: boolean
  disabled?: boolean
}
```

**UI Elements:**
- Generate button (when pending)
- Status indicator:
  - `pending`: "Ready to generate outline"
  - `processing`: Spinner + "Generating outline..."
  - `completed`: Green checkmark + "Outline generated at {time}"
  - `failed`: Red X + error message + Retry button
- Regenerate button (when completed)
- Custom items warning (when regenerating with custom items)

**Behavior:**
- Generate button triggers AI outline generation
- Regenerate shows confirmation dialog if custom items exist
- Disabled state during processing

---

### 3. OutlineSection.tsx

**Purpose:** Render a collapsible section containing outline items.

**Location:** `frontend/src/tools/newsletter-generator/components/OutlineSection.tsx`

**Props:**
```typescript
interface OutlineSectionProps {
  section: OutlineSection
  onItemUpdate: (itemId: string, updates: Partial<OutlineItem>) => void
  onItemRemove: (itemId: string) => void
  onAddItem: () => void
  isEditing: boolean
  expandedByDefault?: boolean
}
```

**UI Elements:**
- Collapsible header with section name
- Item count badge
- Expand/collapse chevron icon
- List of OutlineItem components
- "+ Add Item" button at section bottom
- Empty state when no items

**Behavior:**
- Click header to expand/collapse
- Items reorderable via drag-and-drop (future enhancement)
- Cannot collapse while editing item

---

### 4. OutlineItem.tsx

**Purpose:** Render a single outline item with inline editing capabilities.

**Location:** `frontend/src/tools/newsletter-generator/components/OutlineItem.tsx`

**Props:**
```typescript
interface OutlineItemProps {
  item: OutlineItem
  onUpdate: (updates: Partial<OutlineItem>) => void
  onRemove: () => void
  canRemove: boolean  // false if last item in section
}
```

**UI Elements:**
- Title (editable text field)
- Description (editable textarea)
- Edit icon indicator
- Remove button (× icon)
- Custom item badge (if `is_custom: true`)
- Source count indicator (if content_sources.length > 0)
- User notes input (collapsible)

**States:**
- View mode: Title and description as text
- Edit mode: Inputs appear on click
- Saving indicator during update

**Behavior:**
- Click title/description to enable edit mode
- Blur or Enter saves changes
- Escape cancels edit
- 500ms debounce on auto-save
- Remove button with confirmation for non-custom items

---

### 5. AddOutlineItemModal.tsx

**Purpose:** Modal dialog for adding custom outline items.

**Location:** `frontend/src/tools/newsletter-generator/components/AddOutlineItemModal.tsx`

**Props:**
```typescript
interface AddOutlineItemModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (item: { title: string; description: string; user_notes?: string }) => void
  sectionName: string
}
```

**UI Elements:**
- Modal overlay
- Section name header
- Title input (required)
- Description textarea (required)
- User notes textarea (optional)
- Cancel and Add buttons

**Validation:**
- Title: 5-150 characters
- Description: 10-500 characters
- Both fields required

---

### 6. Step3OutlineReview.tsx (Page)

**Purpose:** Main page component orchestrating Step 3 workflow.

**Location:** `frontend/src/tools/newsletter-generator/pages/Step3OutlineReview.tsx`

**Structure:**
```tsx
<NewsletterLayout>
  <div className={styles.stepContentWrapper}>
    {/* Content Summary */}
    <ContentSummaryCard
      selectedTopics={topicsData.selected_types}
      totalChunks={topicsData.total_chunks_retrieved}
      lengthPreference={newsletter.length_preference}
      retrievalCompletedAt={topicsData.retrieval_completed_at}
    />

    {/* Step 2 Incomplete Warning */}
    {!isStep2Complete && (
      <div className={styles.warningCard}>
        <p>Please complete content planning before generating outline.</p>
        <Button onClick={() => navigate(`.../${newsletterCode}/step-2`)}>
          Go to Step 2
        </Button>
      </div>
    )}

    {/* Outline Generator */}
    {isStep2Complete && (
      <div className={styles.formCard}>
        <h3>Outline Generation</h3>
        <OutlineGenerator
          status={outlineData.outline_status}
          error={outlineData.outline_error}
          generatedAt={outlineData.generated_at}
          onGenerate={handleGenerate}
          onRegenerate={handleRegenerate}
          hasCustomItems={hasCustomItems}
          disabled={!isStep2Complete}
        />
      </div>
    )}

    {/* Outline Sections */}
    {outlineData.outline_status === 'completed' && (
      <div className={styles.formCard}>
        <h3>Newsletter Outline</h3>
        {outlineData.sections.map(section => (
          <OutlineSection
            key={section.id}
            section={section}
            onItemUpdate={handleItemUpdate}
            onItemRemove={handleItemRemove}
            onAddItem={() => openAddItemModal(section.id)}
            isEditing={editingItemId !== null}
            expandedByDefault={section.order <= 2}
          />
        ))}
      </div>
    )}

    {/* Add Item Modal */}
    <AddOutlineItemModal
      isOpen={addItemModalOpen}
      onClose={() => setAddItemModalOpen(false)}
      onAdd={handleAddItem}
      sectionName={addItemSectionName}
    />
  </div>
</NewsletterLayout>
```

---

## State Management

### Using useNewsletter Hook

```typescript
const { newsletter, isLoading, isSaving, updateConfig } = useNewsletter({
  newsletterCode,
  autoSaveDelay: 500,
})
```

### Local State

```typescript
// Topics data from API (from Step 2)
const [topicsData, setTopicsData] = useState<TopicsData | null>(null)
const [isLoadingTopics, setIsLoadingTopics] = useState(true)

// Outline data
const [outlineData, setOutlineData] = useState<NewsletterOutline | null>(null)
const [isLoadingOutline, setIsLoadingOutline] = useState(true)

// Polling state
const [isPolling, setIsPolling] = useState(false)
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
const pollingStartTimeRef = useRef<number | null>(null)

// UI state
const [editingItemId, setEditingItemId] = useState<string | null>(null)
const [addItemModalOpen, setAddItemModalOpen] = useState(false)
const [addItemSectionId, setAddItemSectionId] = useState<string | null>(null)
```

### Polling Logic

```typescript
const POLLING_INTERVAL = 2000  // 2 seconds
const POLLING_TIMEOUT = 300000 // 5 minutes

// Start polling when generation begins
const startPolling = () => {
  setIsPolling(true)
  pollingStartTimeRef.current = Date.now()

  pollingIntervalRef.current = setInterval(async () => {
    // Check timeout
    const elapsed = Date.now() - (pollingStartTimeRef.current || 0)
    if (elapsed > POLLING_TIMEOUT) {
      stopPolling()
      toast.error('Outline generation timed out. Please try again.')
      return
    }

    try {
      const status = await newsletterService.getOutlineStatus(newsletterCode)
      setOutlineData(prev => ({ ...prev, ...status }))

      if (status.outline_status === 'completed' || status.outline_status === 'failed') {
        stopPolling()
        if (status.outline_status === 'completed') {
          toast.success('Outline generated successfully!')
        } else {
          toast.error(status.outline_error || 'Outline generation failed')
        }
      }
    } catch (error) {
      console.error('Polling error:', error)
      // Continue polling on transient errors
    }
  }, POLLING_INTERVAL)
}

// Stop polling on completion or unmount
const stopPolling = () => {
  setIsPolling(false)
  pollingStartTimeRef.current = null
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current)
    pollingIntervalRef.current = null
  }
}

// Cleanup on unmount
useEffect(() => {
  return () => stopPolling()
}, [])

// Resume polling on page load if processing
useEffect(() => {
  if (outlineData?.outline_status === 'processing' && !isPolling) {
    startPolling()
  }
}, [outlineData?.outline_status])
```

---

## Validation Rules

### canProceed to Step 4

```typescript
const canProceed = useMemo(() => {
  if (!outlineData) return false

  return (
    outlineData.outline_status === 'completed' &&
    outlineData.sections.length > 0 &&
    outlineData.sections.every(section => section.items.length > 0) &&
    outlineData.sections.flatMap(s => s.items).every(item =>
      item.title.trim().length >= 5 &&
      item.description.trim().length >= 10
    )
  )
}, [outlineData])
```

### Step 2 Completion Check

```typescript
const isStep2Complete = useMemo(() => {
  return (
    topicsData?.retrieval_status === 'completed' &&
    topicsData?.retrieved_content?.length > 0
  )
}, [topicsData])
```

### Has Custom Items Check

```typescript
const hasCustomItems = useMemo(() => {
  if (!outlineData?.sections) return false
  return outlineData.sections
    .flatMap(s => s.items)
    .some(item => item.is_custom)
}, [outlineData])
```

---

## API Integration

### Service Methods to Add

```typescript
// In newsletterService.ts

/**
 * Trigger outline generation from AI
 */
async triggerOutlineGeneration(
  newsletterCode: string
): Promise<{ success: boolean; outline_status: string }> {
  const response = await apiClient.post(
    `/api/newsletters/${newsletterCode}/generate-outline`
  )
  return response.data
}

/**
 * Get outline status (for polling)
 */
async getOutlineStatus(newsletterCode: string): Promise<NewsletterOutline> {
  const response = await apiClient.get(
    `/api/newsletters/${newsletterCode}/outline-status`
  )
  return response.data
}

/**
 * Save outline modifications
 */
async saveOutline(
  newsletterCode: string,
  outline: Partial<NewsletterOutline>
): Promise<NewsletterOutline> {
  const response = await apiClient.put(
    `/api/newsletters/${newsletterCode}/outline`,
    outline
  )
  return response.data
}

/**
 * Add custom item to outline
 */
async addOutlineItem(
  newsletterCode: string,
  sectionId: string,
  item: { title: string; description: string; user_notes?: string }
): Promise<OutlineItem> {
  const response = await apiClient.post(
    `/api/newsletters/${newsletterCode}/outline-item`,
    { section_id: sectionId, ...item }
  )
  return response.data
}

/**
 * Remove item from outline
 */
async removeOutlineItem(
  newsletterCode: string,
  itemId: string
): Promise<{ success: boolean }> {
  const response = await apiClient.delete(
    `/api/newsletters/${newsletterCode}/outline-item/${itemId}`
  )
  return response.data
}
```

---

## CSS Classes to Use

Reuse existing classes from `newsletterGenerator.module.css`:

| Class | Purpose |
|-------|---------|
| `.stepContentWrapper` | Main content container |
| `.infoCard` | Summary/info card |
| `.formCard` | Form section card |
| `.formCardTitle` | Section heading |
| `.formCardDescription` | Explanatory text |
| `.navButton` | Navigation button base |
| `.navButtonPrimary` | Next button |
| `.navButtonSecondary` | Previous button |
| `.warningCard` | Warning message container |

### New Classes to Add

```css
/* Outline Generator */
.outlineGenerator { }
.generatorStatus { }
.generatorSpinner { }
.generatorSuccess { color: #10b981; }
.generatorError { color: #ef4444; }
.regenerateButton { }
.regenerateWarning { color: #f59e0b; }

/* Outline Section */
.outlineSection { }
.outlineSectionHeader { }
.outlineSectionTitle { }
.outlineSectionCount { }
.outlineSectionChevron { }
.outlineSectionExpanded { }
.outlineSectionCollapsed { }
.outlineSectionItems { }
.outlineSectionEmpty { }
.addItemButton { }

/* Outline Item */
.outlineItem { }
.outlineItemCustom { }
.outlineItemTitle { }
.outlineItemTitleInput { }
.outlineItemDescription { }
.outlineItemDescriptionInput { }
.outlineItemActions { }
.outlineItemEdit { }
.outlineItemRemove { }
.outlineItemSources { }
.outlineItemNotes { }
.customBadge {
  background: #dbeafe;
  color: #1d4ed8;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

/* Content Summary */
.contentSummary { }
.contentSummaryItem { }
.topicBadges { }
.chunkCount { }

/* Add Item Modal */
.addItemModal { }
.addItemForm { }
.addItemInput { }
.addItemTextarea { }
.addItemActions { }
.charCount { }
```

---

## Navigation Flow

### From Step 2
- User completes Step 2 content retrieval
- Clicks "Next" → navigates to `/newsletter-generator/{code}/step-3`

### Step 3 Actions
1. Load newsletter config (useNewsletter)
2. Load topics data (Step 2 results)
3. Load existing outline (if any)
4. Generate outline (if none exists)
5. Edit items as needed
6. Add custom items if desired
7. Click "Next" → navigates to Step 4

### Navigation Buttons

```typescript
const navigationButtons = [
  <button onClick={handlePrevious}>← Previous</button>,  // Always enabled
  <button onClick={handleNext} disabled={!canProceed}>Next →</button>
]

const handlePrevious = () => {
  navigate(`/newsletter-generator/${newsletterCode}/step-2`)
}

const handleNext = () => {
  updateConfig({ current_step: 4 })
  navigate(`/newsletter-generator/${newsletterCode}/step-4`)
}
```

---

## Event Handlers

### Item Update Handler

```typescript
const handleItemUpdate = async (itemId: string, updates: Partial<OutlineItem>) => {
  // Optimistic update
  setOutlineData(prev => {
    if (!prev) return prev
    return {
      ...prev,
      sections: prev.sections.map(section => ({
        ...section,
        items: section.items.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      })),
      user_modifications: {
        ...prev.user_modifications,
        items_edited: prev.user_modifications.items_edited + 1
      }
    }
  })

  // Persist to backend (debounced)
  debouncedSaveOutline(outlineData)
}
```

### Item Remove Handler

```typescript
const handleItemRemove = async (itemId: string) => {
  const item = outlineData?.sections
    .flatMap(s => s.items)
    .find(i => i.id === itemId)

  const section = outlineData?.sections.find(s => s.id === item?.section_id)

  // Prevent removing last item
  if (section && section.items.length <= 1) {
    toast.error('Cannot remove the last item in a section')
    return
  }

  // Confirm deletion
  if (!confirm('Remove this item from the outline?')) {
    return
  }

  try {
    await newsletterService.removeOutlineItem(newsletterCode, itemId)

    setOutlineData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(section => ({
          ...section,
          items: section.items.filter(item => item.id !== itemId)
        })),
        user_modifications: {
          ...prev.user_modifications,
          items_removed: prev.user_modifications.items_removed + 1
        }
      }
    })

    toast.success('Item removed')
  } catch (error) {
    toast.error('Failed to remove item')
  }
}
```

### Add Item Handler

```typescript
const handleAddItem = async (newItem: { title: string; description: string; user_notes?: string }) => {
  if (!addItemSectionId) return

  try {
    const item = await newsletterService.addOutlineItem(
      newsletterCode,
      addItemSectionId,
      newItem
    )

    setOutlineData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(section =>
          section.id === addItemSectionId
            ? { ...section, items: [...section.items, item] }
            : section
        ),
        user_modifications: {
          ...prev.user_modifications,
          items_added: prev.user_modifications.items_added + 1
        }
      }
    })

    setAddItemModalOpen(false)
    toast.success('Item added to outline')
  } catch (error) {
    toast.error('Failed to add item')
  }
}
```

---

## Error Handling

| Error | User Message | Action |
|-------|--------------|--------|
| Failed to load outline | "Failed to load outline data" | Show retry button |
| Failed to save item | "Failed to save changes" | Toast notification |
| Generation failed | Display `outline_error` from API | Show retry button |
| Generation timeout | "Outline generation timed out" | Show retry button |
| Network error during polling | Silent retry with backoff | Continue polling |
| Step 2 incomplete | "Please complete content planning first" | Link to Step 2 |

---

## Accessibility

- Use semantic HTML (`button`, `input`, `textarea`)
- ARIA labels for interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Focus management after modal close
- Screen reader announcements for status changes
- Collapsible sections with proper ARIA attributes
- Focus trap in modal dialog

---

## Related Files

- Types: `types/newsletter.ts`
- Service: `services/newsletterService.ts`
- Hook: `hooks/useNewsletter.ts`
- Layout: `components/NewsletterLayout.tsx`
- Styles: `pages/newsletterGenerator.module.css`
- Step 2 Components: Reference for patterns
