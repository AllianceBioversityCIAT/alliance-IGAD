# Step 1: Configuration - Overview

## Purpose

Step 1 allows users to configure their newsletter preferences before content generation begins. This is the foundation step where users define:

- **Target Audience** - Who will read the newsletter
- **Writing Tone** - Semantic preset for AI content generation
- **Content Length** - Article depth with word count expectations
- **Publishing Strategy** - Frequency with content strategy context
- **Output Format** - Email, PDF, or Web article
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
│  │ ○ Locked │  │  Writing Tone                           │ │
│  │          │  │  ┌─────────────────────────────────┐    │ │
│  │          │  │  │ ○ Expert Analysis               │    │ │
│  │          │  │  │   Formal, data-driven...        │    │ │
│  │          │  │  └─────────────────────────────────┘    │ │
│  │          │  │  ┌─────────────────────────────────┐    │ │
│  │          │  │  │ ● Industry Insight          ✓  │    │ │
│  │          │  │  │   Professional business tone... │    │ │
│  │          │  │  └─────────────────────────────────┘    │ │
│  │          │  │  ┌─────────────────────────────────┐    │ │
│  │          │  │  │ ○ Friendly Summary              │    │ │
│  │          │  │  │   Conversational...             │    │ │
│  │          │  │  └─────────────────────────────────┘    │ │
│  │          │  │                                         │ │
│  │          │  │  Content Length / Publishing Strategy   │ │
│  │          │  │  (Card-based selectors with details)    │ │
│  │          │  │                                         │ │
│  │          │  │  Format: [Email ▼]                      │ │
│  │          │  │  Geographic Focus: [East Africa_______] │ │
│  └──────────┘  └─────────────────────────────────────────┘ │
│                                                             │
│  ← Previous                  Step 1 of 4              Next →│
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Configuration Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `target_audience` | `string[]` | `[]` | Selected audience types |
| `tone_preset` | `string` | `"industry_insight"` | Semantic tone preset |
| `tone_professional` | `number` | `50` | Legacy (kept for backward compatibility) |
| `tone_technical` | `number` | `50` | Legacy (kept for backward compatibility) |
| `format_type` | `string` | `"email"` | Output format |
| `length_preference` | `string` | `"standard"` | Content length preset |
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

### Writing Tone Options (Semantic Presets)

```typescript
const TONE_OPTIONS = [
  {
    value: 'expert_analysis',
    label: 'Expert Analysis',
    description: 'Formal, data-driven content with technical terminology. Best for researchers and specialists.',
    example: 'Our regression analysis indicates a statistically significant correlation (p<0.05)...',
    aiInstruction: 'Write in formal academic/research tone. Use domain-specific terminology, cite methodologies, present data-driven conclusions. Assume expert readership.',
  },
  {
    value: 'industry_insight',
    label: 'Industry Insight',
    description: 'Professional business tone balancing accuracy with clarity. Best for decision-makers.',
    example: 'Three key trends are reshaping the agricultural landscape this quarter...',
    aiInstruction: 'Write in professional business tone. Balance technical accuracy with clarity. Use industry terms but explain implications. Think Harvard Business Review style.',
  },
  {
    value: 'friendly_summary',
    label: 'Friendly Summary',
    description: 'Conversational and accessible language with simplified concepts. Best for general audiences.',
    example: 'Think of climate-smart agriculture as farming that works with nature, not against it...',
    aiInstruction: 'Write conversationally as if explaining to a curious colleague. Simplify complex ideas, use analogies, maintain enthusiasm without sacrificing accuracy.',
  },
]
```

### Content Length Options (With Concrete Expectations)

```typescript
const LENGTH_OPTIONS = [
  {
    value: 'quick_read',
    label: 'Quick Read',
    description: '2-3 min read • 400-600 words',
    detail: 'Perfect for daily digests and morning briefings. 3-4 focused paragraphs with key points.',
    wordRange: [400, 600],
    readingTime: '2-3 min',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: '5-7 min read • 1,000-1,500 words',
    detail: 'Ideal for weekly insights and trend analysis. Multiple sections with subheadings.',
    wordRange: [1000, 1500],
    readingTime: '5-7 min',
  },
  {
    value: 'deep_dive',
    label: 'Deep Dive',
    description: '10-15 min read • 2,500-3,500 words',
    detail: 'Comprehensive guides and monthly reports. Long-form with sections, data, and examples.',
    wordRange: [2500, 3500],
    readingTime: '10-15 min',
  },
]
```

### Publishing Strategy Options (With Content Context)

```typescript
const FREQUENCY_OPTIONS = [
  {
    value: 'daily',
    label: 'Daily Pulse',
    description: 'Quick updates and breaking developments',
    detail: 'Focus on immediacy: what changed today, actionable tips, trending topics.',
    contentFocus: 'Breaking updates, quick wins, tips',
    recommendedLength: 'quick_read',
    recommendedTone: 'friendly_summary',
  },
  {
    value: 'weekly',
    label: 'Weekly Digest',
    description: 'Curated highlights and emerging trends',
    detail: "Synthesize the week's key developments into themes, identify patterns.",
    contentFocus: 'Trend analysis, curated highlights',
    recommendedLength: 'standard',
    recommendedTone: 'industry_insight',
  },
  {
    value: 'monthly',
    label: 'Monthly Review',
    description: 'Comprehensive analysis and strategic insights',
    detail: 'Analyze long-term patterns, include data analysis, strategic recommendations.',
    contentFocus: 'Comprehensive analysis, strategy',
    recommendedLength: 'deep_dive',
    recommendedTone: 'industry_insight',
  },
  {
    value: 'quarterly',
    label: 'Quarterly Report',
    description: 'Big picture trends and forecasts',
    detail: 'Evaluate major trends, compare periods, forecast future developments.',
    contentFocus: 'Long-term trends, forecasts',
    recommendedLength: 'deep_dive',
    recommendedTone: 'expert_analysis',
  },
]
```

### Format Options

```typescript
const FORMAT_OPTIONS = [
  { value: 'email', label: 'Email Newsletter' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'web', label: 'Web Article' },
  { value: 'html', label: 'HTML Email' },
]
```

---

## Validation Rules

### Required for Step Completion

| Field | Validation |
|-------|------------|
| `target_audience` | At least 1 audience selected |
| `tone_preset` | Valid option selected |
| `format_type` | Valid option selected |
| `length_preference` | Valid option selected |
| `frequency` | Valid option selected |
| `geographic_focus` | Optional (can be empty) |

### Step Completion Check

```typescript
function isStep1Complete(config: NewsletterConfig): boolean {
  return (
    config.target_audience.length > 0 &&
    ['expert_analysis', 'industry_insight', 'friendly_summary'].includes(config.tone_preset) &&
    ['email', 'pdf', 'web', 'html'].includes(config.format_type) &&
    ['quick_read', 'standard', 'deep_dive'].includes(config.length_preference) &&
    ['daily', 'weekly', 'monthly', 'quarterly'].includes(config.frequency)
  )
}
```

---

## Configuration Impact on Subsequent Steps

### Step 2: Content Planning
The configuration guides RAG query construction:
- **Audience** → Filter content relevance by audience expertise level
- **Tone Preset** → Affects content selection (technical vs accessible sources)
- **Frequency** → Determines time window for content (daily = last 24h, quarterly = last 90 days)
- **Length** → Affects number of chunks to retrieve

### Step 3: Outline Review
- **Tone Preset** → AI generates outline with appropriate section titles
- **Length** → Determines number and depth of sections

### Step 4: Drafting & Export
- **Tone Preset** → AI instruction for content generation
- **Length** → Target word count per section
- **Format** → Output rendering format

---

## UI Components

| Component | Purpose | File |
|-----------|---------|------|
| `Step1Configuration.tsx` | Main step page | `pages/Step1Configuration.tsx` |
| `AudienceCheckboxGroup.tsx` | Audience multi-select | `components/AudienceCheckboxGroup.tsx` |
| `ToneSelector.tsx` | Card-based tone presets | `components/ToneSelector.tsx` |
| `LengthSelector.tsx` | Card-based length options | `components/LengthSelector.tsx` |
| `FrequencySelector.tsx` | Card-based frequency options | `components/FrequencySelector.tsx` |
| Dropdown (existing) | Format selection | Use existing component |
| TextInput (existing) | Geographic focus | Use existing component |

---

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/newsletters` | Create new newsletter |
| `GET` | `/api/newsletters/{code}` | Load existing config |
| `PUT` | `/api/newsletters/{code}` | Save configuration updates |

---

## Related Documents

- [Step 1 Frontend Implementation](./step1-frontend.md)
- [Step 1 Backend Implementation](./step1-backend.md)
- [Step 1 Acceptance Criteria](./step1-acceptance-criteria.md)
