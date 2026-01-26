# Step 1: Configuration - Overview

## Purpose

Step 1 allows users to configure their newsletter preferences before content generation begins. This is the foundation step where users define:

- **Target Audience** - Who will read the newsletter
- **Tone Settings** - Professional/casual and technical/approachable balances
- **Format & Length** - Output format and content length preferences
- **Frequency** - How often the newsletter will be published
- **Geographic Focus** - Regional focus for content relevance

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Newsletter Generator > NL-20260126-ABCD > Draft           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────────────────────────┐ │
│  │ Sidebar  │  │                                         │ │
│  │          │  │  Welcome Card (Instructions)            │ │
│  │ 1.Config │  │                                         │ │
│  │ ● Active │  │  ─────────────────────────────────────  │ │
│  │          │  │                                         │ │
│  │ 2.Topics │  │  Target Audience                        │ │
│  │ ○ Locked │  │  [ ] Myself  [ ] Researchers  [ ] Dev   │ │
│  │          │  │  [ ] Policy  [ ] Ag-tech     [ ] Field  │ │
│  │ 3.Outline│  │  [ ] Farmers                            │ │
│  │ ○ Locked │  │                                         │ │
│  │          │  │  ─────────────────────────────────────  │ │
│  │ 4.Draft  │  │                                         │ │
│  │ ○ Locked │  │  Tone Settings                          │ │
│  │          │  │  Professional ────●──── Casual          │ │
│  │          │  │  Technical ──────●───── Approachable    │ │
│  │          │  │                                         │ │
│  │          │  │  ─────────────────────────────────────  │ │
│  │          │  │                                         │ │
│  │          │  │  Format: [Email ▼]  Length: [Mixed ▼]   │ │
│  │          │  │                                         │ │
│  │          │  │  Frequency: [Weekly ▼]                  │ │
│  │          │  │                                         │ │
│  │          │  │  Geographic Focus: [East Africa_______] │ │
│  │          │  │                                         │ │
│  └──────────┘  └─────────────────────────────────────────┘ │
│                                                             │
│  ← Back                    Step 1 of 4                Next →│
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Configuration Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `target_audience` | `string[]` | `[]` | Selected audience types |
| `tone_professional` | `number` | `50` | 0 (Professional) to 100 (Casual) |
| `tone_technical` | `number` | `50` | 0 (Technical) to 100 (Approachable) |
| `format_type` | `string` | `"email"` | Output format |
| `length_preference` | `string` | `"mixed"` | Content length |
| `frequency` | `string` | `"weekly"` | Publication frequency |
| `geographic_focus` | `string` | `""` | Regional focus text |

### Audience Options

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

### Format Options

```typescript
const FORMAT_OPTIONS = [
  { value: 'email', label: 'Email Newsletter' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'web', label: 'Web Article' },
]
```

### Length Options

```typescript
const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short (< 500 words)' },
  { value: 'mixed', label: 'Mixed (500-1000 words)' },
  { value: 'long', label: 'Long (> 1000 words)' },
]
```

### Frequency Options

```typescript
const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
]
```

---

## Validation Rules

### Required for Step Completion

| Field | Validation |
|-------|------------|
| `target_audience` | At least 1 audience selected |
| `tone_professional` | Valid number 0-100 |
| `tone_technical` | Valid number 0-100 |
| `format_type` | Valid option selected |
| `length_preference` | Valid option selected |
| `frequency` | Valid option selected |
| `geographic_focus` | Optional (can be empty) |

### Step Completion Check

```typescript
function isStep1Complete(config: NewsletterConfig): boolean {
  return (
    config.target_audience.length > 0 &&
    config.tone_professional >= 0 && config.tone_professional <= 100 &&
    config.tone_technical >= 0 && config.tone_technical <= 100 &&
    ['email', 'pdf', 'web'].includes(config.format_type) &&
    ['short', 'mixed', 'long'].includes(config.length_preference) &&
    ['daily', 'weekly', 'monthly', 'quarterly'].includes(config.frequency)
  )
}
```

---

## Interactions

### On Page Load

1. Check if newsletter exists (from URL param or localStorage)
2. If exists, load configuration from DynamoDB
3. If not, create new newsletter and redirect to its URL
4. Populate form with existing data or defaults

### On Field Change

1. Update local state immediately (optimistic UI)
2. Debounce API calls (500ms)
3. Save to DynamoDB on debounce

### On Next Button Click

1. Validate all required fields
2. Show validation errors if any
3. If valid, mark Step 1 as completed
4. Navigate to Step 2

### Auto-save Behavior

```typescript
// Debounced save on any field change
const debouncedSave = useMemo(
  () => debounce(async (data: Partial<NewsletterConfig>) => {
    await newsletterService.updateNewsletter(newsletterId, data)
  }, 500),
  [newsletterId]
)
```

---

## UI Components Required

| Component | Purpose | File |
|-----------|---------|------|
| `Step1Configuration.tsx` | Main step page | `pages/Step1Configuration.tsx` |
| `AudienceCheckboxGroup.tsx` | Audience multi-select | `components/AudienceCheckboxGroup.tsx` |
| `DualToneSlider.tsx` | Tone sliders | `components/DualToneSlider.tsx` |
| Dropdown (existing) | Format/Length/Frequency | Use existing component |
| TextInput (existing) | Geographic focus | Use existing component |

---

## Integration Points

### API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/newsletters` | Create new newsletter |
| `GET` | `/api/newsletters/{id}` | Load existing config |
| `PUT` | `/api/newsletters/{id}` | Save configuration updates |

### LocalStorage Keys

```typescript
const STORAGE_KEYS = {
  currentNewsletterId: 'newsletter_current_id',
  draftConfig: 'newsletter_draft_config', // Backup for offline
}
```

---

## Error States

| Error | User Message | Action |
|-------|--------------|--------|
| Network error on load | "Failed to load newsletter. Please refresh." | Show retry button |
| Network error on save | "Changes not saved. Will retry..." | Auto-retry with exponential backoff |
| Validation error | Field-specific error message | Highlight field, show message |
| Newsletter not found | "Newsletter not found." | Redirect to create new |

---

## Related Documents

- [Step 1 Frontend Implementation](./step1-frontend.md)
- [Step 1 Backend Implementation](./step1-backend.md)
- [Step 1 Acceptance Criteria](./step1-acceptance-criteria.md)
