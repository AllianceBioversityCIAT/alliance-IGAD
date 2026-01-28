# Step 3: Outline Review - Overview

## Purpose

Step 3 allows users to review and edit an AI-generated newsletter outline before proceeding to drafting. The system uses **Bedrock Claude** to generate a structured outline based on Step 1 configuration and Step 2 retrieved content.

This step is critical because it:
1. Transforms raw content chunks into a coherent newsletter structure
2. Allows users to customize the outline before AI drafting
3. Ensures editorial control over newsletter organization
4. Maps content to appropriate newsletter sections automatically

---

## Configuration Context from Previous Steps

Step 3 uses data from both Step 1 and Step 2:

| Source | Data Used | Impact on Step 3 |
|--------|-----------|------------------|
| Step 1 | `tone_preset` | Affects outline item descriptions and framing |
| Step 1 | `length_preference` | Determines number of items per section |
| Step 1 | `target_audience` | Influences item prioritization and language |
| Step 2 | `selected_types` | Maps topics to newsletter sections |
| Step 2 | `retrieved_content` | Source material for outline items |

### Length-Based Item Counts

| Length Preference | Introduction | Main Content | Updates & News | Conclusion |
|-------------------|--------------|--------------|----------------|------------|
| Quick Read | 1 | 2 | 1 | 1 |
| Standard | 1 | 4 | 2 | 1 |
| Deep Dive | 1 | 6 | 3 | 1 |

### Section Mapping from Topics

| Topic Category | Newsletter Section |
|----------------|-------------------|
| News (breaking_news, policy_updates, food_security) | Updates & News |
| Insights (research_findings, technology_innovation, climate_smart, market_access, project_updates, livestock) | Main Content |
| Opportunities (funding, events) | Opportunities |
| Resources (publications) | Resources |

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Newsletter Generator > NL-20260126-ABCD > Outline Review   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────────────────────────┐ │
│  │ Sidebar  │  │                                         │ │
│  │          │  │  Content Summary (from Step 2)          │ │
│  │ 1.Config │  │  ┌─────────────────────────────────────┐│ │
│  │ ✓ Done   │  │  │ Topics: Research, Climate, Funding  ││ │
│  │          │  │  │ Retrieved: 25 content chunks        ││ │
│  │ 2.Topics │  │  │ Length: Standard (1,000-1,500 words)││ │
│  │ ✓ Done   │  │  └─────────────────────────────────────┘│ │
│  │          │  │                                         │ │
│  │ 3.Outline│  │  ─────────────────────────────────────  │ │
│  │ ● Active │  │                                         │ │
│  │          │  │  [Generate Outline]  Status: Pending    │ │
│  │ 4.Draft  │  │                                         │ │
│  │ ○ Locked │  │  ─────────────────────────────────────  │ │
│  │          │  │                                         │ │
│  │          │  │  Newsletter Outline                     │ │
│  │          │  │                                         │ │
│  │          │  │  ▼ Introduction                         │ │
│  │          │  │    [✎] Welcome message setting context  │ │
│  │          │  │                                         │ │
│  │          │  │  ▼ Main Content (4 items)               │ │
│  │          │  │    [✎] Drought-resistant varieties...   │ │
│  │          │  │    [✎] Climate adaptation strategies... │ │
│  │          │  │    [✎] New funding from FAO...          │ │
│  │          │  │    [✎] Technology adoption in Kenya...  │ │
│  │          │  │    [+ Add Item]                         │ │
│  │          │  │                                         │ │
│  │          │  │  ▼ Updates & News (2 items)             │ │
│  │          │  │    [✎] Policy update: IGAD summit...    │ │
│  │          │  │    [✎] Food security alert: Horn...     │ │
│  │          │  │    [+ Add Item]                         │ │
│  │          │  │                                         │ │
│  │          │  │  ▼ Conclusion                           │ │
│  │          │  │    [✎] Call to action and next steps    │ │
│  └──────────┘  └─────────────────────────────────────────┘ │
│                                                             │
│  ← Previous                  Step 3 of 4              Next →│
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### OutlineItem

```typescript
interface OutlineItem {
  id: string                    // e.g., "item-001"
  section_id: string            // e.g., "section-main"
  title: string                 // Item headline
  description: string           // Brief description of content
  content_sources: string[]     // chunk_ids from Step 2 retrieved_content
  order: number                 // Position within section
  is_custom: boolean            // True if user-created
  is_editable: boolean          // True if can be modified
  user_notes?: string           // Optional user annotations
}
```

### OutlineSection

```typescript
interface OutlineSection {
  id: string                    // e.g., "section-intro"
  name: string                  // e.g., "Introduction"
  order: number                 // Section display order
  items: OutlineItem[]          // Items in this section
}
```

### NewsletterOutline (Full Structure)

```typescript
interface NewsletterOutline {
  newsletter_id: string
  sections: OutlineSection[]
  outline_status: 'pending' | 'processing' | 'completed' | 'failed'
  outline_error?: string
  generated_at?: string
  generation_config: {
    tone_preset: string
    length_preference: string
    target_audience: string[]
  }
  user_modifications: {
    items_added: number
    items_removed: number
    items_edited: number
  }
  updated_at: string
}
```

### Default Sections

```typescript
const DEFAULT_SECTIONS: OutlineSection[] = [
  {
    id: 'section-intro',
    name: 'Introduction',
    order: 1,
    items: []
  },
  {
    id: 'section-main',
    name: 'Main Content',
    order: 2,
    items: []
  },
  {
    id: 'section-updates',
    name: 'Updates & News',
    order: 3,
    items: []
  },
  {
    id: 'section-opportunities',
    name: 'Opportunities',
    order: 4,
    items: []
  },
  {
    id: 'section-resources',
    name: 'Resources',
    order: 5,
    items: []
  },
  {
    id: 'section-conclusion',
    name: 'Conclusion',
    order: 6,
    items: []
  }
]
```

---

## DynamoDB Schema

### OUTLINE Item Structure

```json
{
  "PK": "NEWSLETTER#NL-20260127-ABCD",
  "SK": "OUTLINE",

  "sections": [
    {
      "id": "section-intro",
      "name": "Introduction",
      "order": 1,
      "items": [
        {
          "id": "item-001",
          "section_id": "section-intro",
          "title": "Welcome to the IGAD Agriculture Newsletter",
          "description": "This week's newsletter covers recent developments in drought-resistant agriculture, climate adaptation strategies, and new funding opportunities across the IGAD region.",
          "content_sources": [],
          "order": 1,
          "is_custom": false,
          "is_editable": true,
          "user_notes": null
        }
      ]
    },
    {
      "id": "section-main",
      "name": "Main Content",
      "order": 2,
      "items": [
        {
          "id": "item-002",
          "section_id": "section-main",
          "title": "Breakthrough in Drought-Resistant Maize Varieties",
          "description": "New research from IGAD partners reveals promising results for maize varieties that can withstand extended dry periods, with field trials showing 40% improved yields.",
          "content_sources": ["chunk-001", "chunk-003"],
          "order": 1,
          "is_custom": false,
          "is_editable": true,
          "user_notes": null
        }
      ]
    }
  ],

  "outline_status": "completed",
  "outline_error": null,
  "generated_at": "2026-01-27T10:15:00Z",

  "generation_config": {
    "tone_preset": "industry_insight",
    "length_preference": "standard",
    "target_audience": ["researchers", "policy_makers"]
  },

  "user_modifications": {
    "items_added": 1,
    "items_removed": 0,
    "items_edited": 2
  },

  "updated_at": "2026-01-27T10:20:00Z"
}
```

---

## Outline Generation Process

### AI Generation Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Step 1 Config  │───>│                  │───>│  Newsletter     │
│  - tone         │    │  Bedrock Claude  │    │  Outline        │
│  - length       │    │  (sonnet-4)      │    │  - sections     │
│  - audience     │    │                  │    │  - items        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              ↑
┌─────────────────┐           │
│  Step 2 Content │───────────┘
│  - chunks       │
│  - topics       │
│  - sources      │
└─────────────────┘
```

### Generation Steps

1. **Collect Input Data**
   - Get newsletter config from METADATA
   - Get retrieved content from TOPICS
   - Calculate item counts based on length_preference

2. **Build AI Prompt**
   - Load prompt template from DynamoDB (section: newsletter_generator, sub_section: step-3)
   - Inject configuration context
   - Include retrieved content chunks

3. **Call Bedrock Claude**
   - Model: `us.anthropic.claude-sonnet-4-20250514-v1:0`
   - Max tokens: 8000
   - Temperature: 0.3 (for consistent structure)
   - Timeout: 120 seconds

4. **Parse and Store**
   - Parse AI response into OutlineSection[] structure
   - Validate section/item format
   - Store in OUTLINE item

---

## Validation Rules

### Step Completion Requirements

| Requirement | Validation |
|-------------|------------|
| Step 2 Complete | `topics.retrieval_status === 'completed'` |
| Outline Generated | `outline.outline_status === 'completed'` |
| Sections Valid | Each section has at least one item |
| Items Valid | Each item has title and description |

### Step Completion Check

```typescript
function isStep3Complete(outline: NewsletterOutline): boolean {
  return (
    outline.outline_status === 'completed' &&
    outline.sections.length > 0 &&
    outline.sections.every(s => s.items.length > 0) &&
    outline.sections.flatMap(s => s.items).every(i =>
      i.title.trim().length > 0 &&
      i.description.trim().length > 0
    )
  )
}
```

### Item Validation

```typescript
interface ItemValidation {
  minTitleLength: 5
  maxTitleLength: 150
  minDescriptionLength: 10
  maxDescriptionLength: 500
}
```

---

## User Actions

### Inline Editing

Users can edit any item directly:
- Click on title to edit title
- Click on description to edit description
- Changes auto-save after 500ms debounce
- Edit icon (✎) indicates editable items

### Add Custom Item

Users can add custom items to any section:
1. Click "+ Add Item" button in section
2. Fill in title and description in modal
3. Item marked as `is_custom: true`
4. Custom items preserved on regeneration

### Remove Item

Users can remove items (except last item in section):
1. Click remove button (×) on item
2. Confirm deletion
3. `user_modifications.items_removed` incremented
4. Cannot remove if section would be empty

### Regenerate Outline

Users can regenerate the entire outline:
1. Click "Regenerate" button
2. Confirm action (warning: will replace current outline)
3. Custom items are preserved
4. AI generates new outline
5. Custom items re-added to appropriate sections

---

## Error States

| Error | User Message | Action |
|-------|--------------|--------|
| Step 2 incomplete | "Please complete content planning first" | Link to Step 2 |
| No retrieved content | "No content available for outline generation" | Link to Step 2 |
| Generation failed | "Failed to generate outline. Please try again." | Retry button |
| Generation timeout | "Outline generation is taking longer than expected." | Cancel + Retry |
| Save failed | "Failed to save changes" | Toast notification |
| Invalid item | "Title and description are required" | Highlight invalid field |

---

## Performance Considerations

1. **Generation Time:** 10-30 seconds depending on content volume
2. **Polling Interval:** 2 seconds to balance responsiveness and API load
3. **Polling Timeout:** 5 minutes maximum
4. **Auto-Save:** 500ms debounce for item edits
5. **Optimistic Updates:** UI updates immediately, syncs in background

---

## Related Documents

- [Step 2 Content Planning](../step-2-content-planning/step2-overview.md)
- [Step 3 Frontend Implementation](./step3-frontend.md)
- [Step 3 Backend Implementation](./step3-backend.md)
- [Step 3 Acceptance Criteria](./step3-acceptance-criteria.md)
- [AI Prompt Configuration](../00-foundation/ai-prompts.md)
