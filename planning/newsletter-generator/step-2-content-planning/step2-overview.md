# Step 2: Content Planning - Overview

## Purpose

Step 2 allows users to select the types of information they want to include in their newsletter. After selection, the system retrieves relevant content from the **Bedrock Knowledge Base** using RAG (Retrieval-Augmented Generation).

This step is critical because it:
1. Defines the newsletter's content scope
2. Retrieves real, up-to-date information from IGAD sources
3. Provides the foundation for AI-generated outline (Step 3)

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Newsletter Generator > NL-20260126-ABCD > Draft           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────────────────────────┐ │
│  │ Sidebar  │  │                                         │ │
│  │          │  │  Select Information Types               │ │
│  │ 1.Config │  │  ─────────────────────────────────────  │ │
│  │ ✓ Done   │  │                                         │ │
│  │          │  │  [ON]  Breaking News & Updates    NEWS  │ │
│  │ 2.Topics │  │  [OFF] Policy Updates             NEWS  │ │
│  │ ● Active │  │  [ON]  Research Findings      INSIGHTS  │ │
│  │          │  │  [ON]  Climate-Smart Agri     INSIGHTS  │ │
│  │ 3.Outline│  │  [OFF] Market Access & Trade  INSIGHTS  │ │
│  │ ○ Locked │  │  [ON]  Funding Opportunities  OPPORTU.  │ │
│  │          │  │  [OFF] Events & Conferences   OPPORTU.  │ │
│  │ 4.Draft  │  │  ...                                    │ │
│  │ ○ Locked │  │                                         │ │
│  │          │  │  ─────────────────────────────────────  │ │
│  │          │  │                                         │ │
│  │          │  │  Selected: 4 topics                     │ │
│  │          │  │  [Retrieve Content]                     │ │
│  │          │  │                                         │ │
│  │          │  │  ─────────────────────────────────────  │ │
│  │          │  │  Retrieval Status: Completed ✓          │ │
│  │          │  │  Retrieved 25 content chunks            │ │
│  └──────────┘  └─────────────────────────────────────────┘ │
│                                                             │
│  ← Back                    Step 2 of 4                Next →│
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Information Types

```typescript
interface InformationType {
  id: string
  name: string
  category: 'news' | 'insights' | 'opportunities' | 'resources'
  description: string
}

const INFORMATION_TYPES: InformationType[] = [
  // NEWS (Blue badges)
  { id: 'breaking_news', name: 'Breaking News & Updates', category: 'news', 
    description: 'Recent news and updates from IGAD region' },
  { id: 'policy_updates', name: 'Policy Updates', category: 'news',
    description: 'Policy changes and regulations' },
  { id: 'food_security', name: 'Food Security Updates', category: 'news',
    description: 'Food security and nutrition information' },
  
  // INSIGHTS (Purple badges)
  { id: 'research_findings', name: 'Research Findings', category: 'insights',
    description: 'Scientific research results and studies' },
  { id: 'technology_innovation', name: 'Technology & Innovation Spotlight', category: 'insights',
    description: 'Agricultural technology and digital farming' },
  { id: 'climate_smart', name: 'Climate-Smart Agriculture', category: 'insights',
    description: 'Climate adaptation and sustainable practices' },
  { id: 'market_access', name: 'Market Access & Trade', category: 'insights',
    description: 'Trade and market information' },
  { id: 'project_updates', name: 'Project Updates & Success Stories', category: 'insights',
    description: 'Project progress and impact stories' },
  { id: 'livestock', name: 'Livestock & Animal Health', category: 'insights',
    description: 'Livestock and veterinary information' },
  
  // OPPORTUNITIES (Yellow badges)
  { id: 'funding', name: 'Funding Opportunities', category: 'opportunities',
    description: 'Grants and funding for projects' },
  { id: 'events', name: 'Events & Conferences', category: 'opportunities',
    description: 'Workshops, conferences, and meetings' },
  
  // RESOURCES (Green badges)
  { id: 'publications', name: 'Publications & Resources', category: 'resources',
    description: 'Reports, documents, and guides' },
]
```

### Topics Item (DynamoDB)

```json
{
  "PK": "NEWSLETTER#NL-20260126-A1B2",
  "SK": "TOPICS",
  
  "selected_types": [
    "breaking_news",
    "research_findings", 
    "climate_smart",
    "funding"
  ],
  
  "retrieval_status": "completed",
  "retrieval_started_at": "2026-01-26T10:40:00Z",
  "retrieval_completed_at": "2026-01-26T10:41:30Z",
  "retrieval_error": null,
  
  "retrieved_content": [
    {
      "chunk_id": "chunk-001",
      "topic_id": "research_findings",
      "content": "Recent IGAD study on drought-resistant varieties...",
      "score": 0.89,
      "source_url": "https://igad.int/research/2026/study",
      "source_metadata": {
        "date": "2026-01-15",
        "title": "Drought Resistance Study"
      }
    }
  ],
  
  "total_chunks_retrieved": 25,
  "updated_at": "2026-01-26T10:41:30Z"
}
```

---

## RAG Integration

### Knowledge Base Details

| Property | Value |
|----------|-------|
| **Knowledge Base ID** | `NPDZSLKCYX` |
| **Knowledge Base Name** | `knowledge-base-igad-web-scraping` |
| **Content** | 17 scraped web pages from IGAD |
| **Query Approach** | Combined query for all selected topics |

### Query Flow

```
User selects topics → Build combined query → Query Knowledge Base → Store results
```

1. **Topic Selection:** User toggles topics ON/OFF
2. **Query Building:** Convert topics to search query:
   ```
   "research findings climate smart agriculture funding opportunities IGAD region"
   ```
3. **Knowledge Base Query:** Single API call with combined query
4. **Result Processing:** Parse and tag results by relevance to each topic
5. **Storage:** Save retrieved chunks to DynamoDB TOPICS item

### Why Combined Query?

- **Efficiency:** Single API call vs multiple calls
- **Context:** Better semantic understanding with related topics together
- **Cost:** Lower Bedrock API usage
- **Speed:** Faster retrieval (~2-5 seconds total)

---

## Validation Rules

### Step Completion Requirements

| Requirement | Validation |
|-------------|------------|
| Topics selected | At least 1 topic selected |
| Content retrieved | `retrieval_status === 'completed'` |
| Chunks available | `retrieved_content.length > 0` |

### Step Completion Check

```typescript
function isStep2Complete(topics: NewsletterTopics): boolean {
  return (
    topics.selected_types.length > 0 &&
    topics.retrieval_status === 'completed' &&
    topics.retrieved_content.length > 0
  )
}
```

---

## Interactions

### On Page Load

1. Load TOPICS item from DynamoDB (if exists)
2. Populate toggle states from `selected_types`
3. Show retrieval status if already retrieved
4. Show retrieved content summary

### On Topic Toggle

1. Update local state immediately
2. Debounce API call (500ms)
3. Save `selected_types` to DynamoDB
4. Clear retrieval status (content needs re-retrieval)

### On "Retrieve Content" Click

1. Show loading state
2. Call backend endpoint to trigger RAG
3. Poll for status every 2 seconds
4. On completion, show success and chunk count

### On Next Button Click

1. Validate: topics selected AND content retrieved
2. If not retrieved, prompt user to retrieve
3. Navigate to Step 3

---

## UI Components Required

| Component | Purpose | File |
|-----------|---------|------|
| `Step2ContentPlanning.tsx` | Main step page | `pages/Step2ContentPlanning.tsx` |
| `InformationTypeToggle.tsx` | Toggle list with badges | `components/InformationTypeToggle.tsx` |
| `RetrievalProgress.tsx` | RAG progress indicator | `components/RetrievalProgress.tsx` |
| `RetrievedContentSummary.tsx` | Show retrieved chunks | `components/RetrievedContentSummary.tsx` |

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `PUT` | `/api/newsletters/{id}/topics` | Save selected topics |
| `POST` | `/api/newsletters/{id}/retrieve-content` | Trigger RAG retrieval |
| `GET` | `/api/newsletters/{id}/retrieval-status` | Poll retrieval status |
| `GET` | `/api/newsletters/{id}/topics` | Get topics + retrieved content |

---

## Error States

| Error | User Message | Action |
|-------|--------------|--------|
| No topics selected | "Please select at least one topic" | Highlight toggle list |
| Retrieval failed | "Failed to retrieve content. Please try again." | Show retry button |
| Retrieval timeout | "Content retrieval is taking longer than expected." | Show cancel + retry |
| No content found | "No relevant content found for selected topics." | Suggest different topics |

---

## Performance Considerations

1. **Retrieval Time:** 2-10 seconds depending on query complexity
2. **Polling Interval:** 2 seconds to balance responsiveness and API load
3. **Content Size:** Limit to 50 chunks max (configurable)
4. **Caching:** Cache results for 1 hour (re-retrieve if topics change)

---

## Related Documents

- [Step 2 Frontend Implementation](./step2-frontend.md)
- [Step 2 Backend Implementation](./step2-backend.md)
- [Step 2 RAG Integration](./step2-rag-integration.md)
- [Step 2 Acceptance Criteria](./step2-acceptance-criteria.md)
- [Knowledge Base Integration (KIRO)](../00-foundation/knowledge-base-integration.md)
