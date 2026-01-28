# Step 2: Content Planning - Frontend Specification

## Overview

This document specifies the frontend implementation for Step 2 of the Newsletter Generator. Step 2 allows users to select information types and retrieve relevant content from the Bedrock Knowledge Base.

---

## Components to Create

### 1. ConfigSummaryCard.tsx

**Purpose:** Display a read-only summary of Step 1 configuration.

**Location:** `frontend/src/tools/newsletter-generator/components/ConfigSummaryCard.tsx`

**Props:**
```typescript
interface ConfigSummaryCardProps {
  targetAudience: string[]
  tonePreset: string
  lengthPreference: string
  frequency: string
}
```

**UI Elements:**
- Card container with `.infoCard` styling
- Audience badges (using AudienceCheckboxGroup labels)
- Tone preset display (using TONE_OPTIONS label)
- Length preference display (using LENGTH_OPTIONS label)
- Frequency display (using FREQUENCY_OPTIONS label)

**Behavior:**
- Read-only display, no interactions
- Shows all Step 1 settings in a compact format
- Links back to Step 1 for editing

---

### 2. TopicSelector.tsx

**Purpose:** Allow users to select information types with category grouping and relevance indicators.

**Location:** `frontend/src/tools/newsletter-generator/components/TopicSelector.tsx`

**Props:**
```typescript
interface TopicSelectorProps {
  selectedTopics: string[]
  onTopicChange: (topics: string[]) => void
  targetAudience: string[]
  disabled?: boolean
}
```

**UI Elements:**
- Section header: "Recommended for your audience" (if recommendations exist)
- Category sections: News (blue), Insights (purple), Opportunities (yellow), Resources (green)
- Toggle items with:
  - ON/OFF toggle button
  - Topic name
  - Category badge
  - Relevance indicator (stars: high/medium/low)
- Selection counter at bottom

**Behavior:**
- Toggle topics on/off
- Calculate relevance based on `targetAudience` and `audienceRelevance` scores
- Show recommendations (relevance >= 0.8) in separate section
- Group topics by category
- Keyboard accessible (Enter/Space to toggle)

**Relevance Calculation:**
```typescript
function getRelevanceLevel(topic: InformationType, audiences: string[]): 'high' | 'medium' | 'low' {
  const avgRelevance = audiences.reduce((sum, aud) =>
    sum + (topic.audienceRelevance[aud] || 0), 0) / audiences.length

  if (avgRelevance >= 0.8) return 'high'    // ★★★
  if (avgRelevance >= 0.5) return 'medium'  // ★★☆
  return 'low'                               // ★☆☆
}
```

---

### 3. RetrievalProgress.tsx

**Purpose:** Show the status of content retrieval with appropriate feedback.

**Location:** `frontend/src/tools/newsletter-generator/components/RetrievalProgress.tsx`

**Props:**
```typescript
interface RetrievalProgressProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunksRetrieved: number
  error?: string
  onRetry?: () => void
}
```

**UI Elements:**
- Status indicator:
  - `pending`: Gray text "Ready to retrieve content"
  - `processing`: Spinner + "Retrieving content..."
  - `completed`: Green checkmark + "Retrieved X content chunks"
  - `failed`: Red X + error message + Retry button
- Progress information when processing
- Error details with retry action when failed

**Behavior:**
- Visual feedback for all states
- Retry button calls `onRetry` callback
- Accessible status announcements

---

### 4. RetrievedContentPreview.tsx

**Purpose:** Show a preview of retrieved content chunks.

**Location:** `frontend/src/tools/newsletter-generator/components/RetrievedContentPreview.tsx`

**Props:**
```typescript
interface RetrievedContentPreviewProps {
  content: RetrievedChunk[]
  maxItems?: number  // Default: 5
}
```

**UI Elements:**
- Collapsible list of content chunks
- Each chunk shows:
  - Topic badge
  - Content excerpt (first 150 chars)
  - Relevance score
  - Source link (if available)
- "Show more" button if content exceeds `maxItems`

---

### 5. ConfigChangeWarning.tsx

**Purpose:** Warn users when Step 1 configuration has changed since last retrieval.

**Location:** `frontend/src/tools/newsletter-generator/components/ConfigChangeWarning.tsx`

**Props:**
```typescript
interface ConfigChangeWarningProps {
  onReRetrieve: () => void
}
```

**UI Elements:**
- Warning icon + message
- "Re-retrieve Content" button

---

### 6. Step2ContentPlanning.tsx (Page)

**Purpose:** Main page component orchestrating Step 2 workflow.

**Location:** `frontend/src/tools/newsletter-generator/pages/Step2ContentPlanning.tsx`

**Structure:**
```tsx
<NewsletterLayout>
  <div className={styles.stepContentWrapper}>
    {/* Config Summary */}
    <ConfigSummaryCard {...config} />

    {/* Config Change Warning (conditional) */}
    {configChanged && <ConfigChangeWarning onReRetrieve={handleRetrieve} />}

    {/* Topic Selection */}
    <div className={styles.formCard}>
      <h3>Select Information Types</h3>
      <TopicSelector {...topicProps} />
    </div>

    {/* Retrieval Section */}
    <div className={styles.formCard}>
      <h3>Content Retrieval</h3>
      <RetrievalProgress {...progressProps} />
      {canRetrieve && <Button onClick={handleRetrieve}>Retrieve Content</Button>}
    </div>

    {/* Preview (when completed) */}
    {status === 'completed' && (
      <div className={styles.formCard}>
        <h3>Retrieved Content Preview</h3>
        <RetrievedContentPreview content={retrievedContent} />
      </div>
    )}
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
// Topics data from API
const [topicsData, setTopicsData] = useState<TopicsData | null>(null)
const [isLoadingTopics, setIsLoadingTopics] = useState(true)

// Polling state
const [isPolling, setIsPolling] = useState(false)
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
```

### Polling Logic

```typescript
// Start polling when retrieval begins
const startPolling = () => {
  setIsPolling(true)
  pollingIntervalRef.current = setInterval(async () => {
    const status = await newsletterService.getRetrievalStatus(newsletterCode)
    setTopicsData(prev => ({ ...prev, ...status }))

    if (status.retrieval_status === 'completed' || status.retrieval_status === 'failed') {
      stopPolling()
    }
  }, 2000) // 2 second intervals
}

// Stop polling on completion or unmount
const stopPolling = () => {
  setIsPolling(false)
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current)
    pollingIntervalRef.current = null
  }
}

// Cleanup on unmount
useEffect(() => {
  return () => stopPolling()
}, [])
```

---

## Validation Rules

### canProceed to Step 3

```typescript
const canProceed = useMemo(() => {
  return (
    topicsData?.selected_types?.length > 0 &&
    topicsData?.retrieval_status === 'completed' &&
    topicsData?.retrieved_content?.length > 0 &&
    !configChanged
  )
}, [topicsData, configChanged])
```

### Config Change Detection

```typescript
const configChanged = useMemo(() => {
  if (!topicsData?.retrieval_config || !newsletter) return false

  const saved = topicsData.retrieval_config
  return (
    saved.tone_preset !== newsletter.tone_preset ||
    saved.frequency !== newsletter.frequency ||
    saved.length_preference !== newsletter.length_preference ||
    JSON.stringify(saved.target_audience?.sort()) !==
      JSON.stringify(newsletter.target_audience?.sort())
  )
}, [topicsData, newsletter])
```

---

## API Integration

### Service Methods to Add

```typescript
// In newsletterService.ts

/**
 * Trigger content retrieval from Knowledge Base
 */
async triggerContentRetrieval(
  newsletterCode: string,
  selectedTypes: string[]
): Promise<{ success: boolean; retrieval_status: string }> {
  const response = await apiClient.post(
    `/api/newsletters/${newsletterCode}/retrieve-content`,
    { selected_types: selectedTypes }
  )
  return response.data
}

/**
 * Get retrieval status (for polling)
 */
async getRetrievalStatus(newsletterCode: string): Promise<TopicsData> {
  const response = await apiClient.get(
    `/api/newsletters/${newsletterCode}/retrieval-status`
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

### New Classes to Add

```css
/* Topic Selector */
.topicSelector { }
.topicCategory { }
.topicCategoryTitle { }
.topicItem { }
.topicItemSelected { }
.topicToggle { }
.topicName { }
.topicBadge { }
.topicBadgeNews { background: #3b82f6; }
.topicBadgeInsights { background: #8b5cf6; }
.topicBadgeOpportunities { background: #f59e0b; }
.topicBadgeResources { background: #10b981; }
.topicRelevance { }
.topicRelevanceHigh { color: #10b981; }
.topicRelevanceMedium { color: #f59e0b; }
.topicRelevanceLow { color: #9ca3af; }

/* Retrieval Progress */
.retrievalProgress { }
.retrievalStatus { }
.retrievalSpinner { }
.retrievalSuccess { color: #10b981; }
.retrievalError { color: #ef4444; }
.retryButton { }

/* Config Summary */
.configSummary { }
.configItem { }
.configLabel { }
.configValue { }
.audienceBadge { }

/* Warning */
.configWarning { }
.warningIcon { }
.warningText { }
```

---

## Navigation Flow

### From Step 1
- User completes Step 1 configuration
- Clicks "Next" → navigates to `/newsletter-generator/{code}/step-2`

### Step 2 Actions
1. Load newsletter config (useNewsletter)
2. Load topics data (getTopics)
3. Select topics (auto-save via saveTopics)
4. Click "Retrieve Content" (triggers retrieval)
5. Poll until completed
6. Review retrieved content
7. Click "Next" → navigates to Step 3

### Navigation Buttons

```typescript
const navigationButtons = [
  <button onClick={handlePrevious}>← Previous</button>,  // Always enabled
  <button onClick={handleNext} disabled={!canProceed}>Next →</button>
]

const handlePrevious = () => {
  navigate(`/newsletter-generator/${newsletterCode}/step-1`)
}

const handleNext = () => {
  updateConfig({ current_step: 3 })
  navigate(`/newsletter-generator/${newsletterCode}/step-3`)
}
```

---

## Error Handling

| Error | User Message | Action |
|-------|--------------|--------|
| Failed to load topics | "Failed to load content settings" | Show retry button |
| Failed to save topics | "Failed to save selection" | Toast notification |
| Retrieval failed | Display `retrieval_error` from API | Show retry button |
| Network error during polling | "Connection lost. Retrying..." | Auto-retry with backoff |

---

## Accessibility

- Use semantic HTML (`button`, `input[type=checkbox]`)
- ARIA labels for toggle buttons
- Keyboard navigation (Tab, Enter, Space)
- Focus management after actions
- Screen reader announcements for status changes

---

## Related Files

- Types: `types/newsletter.ts`
- Service: `services/newsletterService.ts`
- Hook: `hooks/useNewsletter.ts`
- Layout: `components/NewsletterLayout.tsx`
- Styles: `pages/newsletterGenerator.module.css`
