# Step 2: Content Planning - Overview

## Purpose

Step 2 allows users to select the types of information they want to include in their newsletter. After selection, the system retrieves relevant content from the **Bedrock Knowledge Base** using RAG (Retrieval-Augmented Generation).

This step is critical because it:
1. Defines the newsletter's content scope
2. Retrieves real, up-to-date information from IGAD sources
3. Uses Step 1 configuration to optimize content selection
4. Provides the foundation for AI-generated outline (Step 3)

---

## Configuration Context from Step 1

Step 2 uses the following configuration from Step 1 to guide content retrieval:

| Step 1 Field | Impact on Step 2 |
|--------------|------------------|
| `target_audience` | Filters content relevance by audience expertise |
| `tone_preset` | Affects source selection (technical vs accessible) |
| `frequency` | Determines time window for content freshness |
| `length_preference` | Affects number of chunks to retrieve |
| `geographic_focus` | Adds geographic filter to queries |

### Configuration-Aware Query Building

```typescript
interface Step1Config {
  target_audience: string[]        // e.g., ['researchers', 'policy_makers']
  tone_preset: string              // 'expert_analysis' | 'industry_insight' | 'friendly_summary'
  frequency: string                // 'daily' | 'weekly' | 'monthly' | 'quarterly'
  length_preference: string        // 'quick_read' | 'standard' | 'deep_dive'
  geographic_focus: string         // e.g., 'IGAD region'
}

// Configuration impacts retrieval parameters
const RETRIEVAL_PARAMS = {
  // Based on tone_preset
  tone_preset: {
    expert_analysis: {
      preferTechnical: true,
      includeResearchData: true,
      sourceTypes: ['research', 'policy', 'reports']
    },
    industry_insight: {
      preferTechnical: false,
      includeResearchData: true,
      sourceTypes: ['reports', 'analysis', 'news']
    },
    friendly_summary: {
      preferTechnical: false,
      includeResearchData: false,
      sourceTypes: ['news', 'updates', 'stories']
    },
  },

  // Based on frequency (content freshness window)
  frequency: {
    daily: { daysBack: 2, maxChunks: 15 },
    weekly: { daysBack: 14, maxChunks: 25 },
    monthly: { daysBack: 45, maxChunks: 40 },
    quarterly: { daysBack: 120, maxChunks: 50 },
  },

  // Based on length_preference (how much content to retrieve)
  length_preference: {
    quick_read: { chunksMultiplier: 0.6 },   // Fewer chunks
    standard: { chunksMultiplier: 1.0 },     // Default
    deep_dive: { chunksMultiplier: 1.5 },    // More chunks
  },
}
```

---

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Newsletter Generator > NL-20260126-ABCD > Draft           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌─────────────────────────────────────────┐ │
│  │ Sidebar  │  │                                         │ │
│  │          │  │  Configuration Summary (from Step 1)    │ │
│  │ 1.Config │  │  ┌─────────────────────────────────────┐│ │
│  │ ✓ Done   │  │  │ Audience: Researchers, Policy      ││ │
│  │          │  │  │ Tone: Industry Insight              ││ │
│  │ 2.Topics │  │  │ Length: Standard (1,000-1,500 words)││ │
│  │ ● Active │  │  │ Frequency: Weekly Digest            ││ │
│  │          │  │  └─────────────────────────────────────┘│ │
│  │ 3.Outline│  │                                         │ │
│  │ ○ Locked │  │  ─────────────────────────────────────  │ │
│  │          │  │                                         │ │
│  │ 4.Draft  │  │  Select Information Types               │ │
│  │ ○ Locked │  │                                         │ │
│  │          │  │  [ON]  Breaking News & Updates    NEWS  │ │
│  │          │  │  [OFF] Policy Updates             NEWS  │ │
│  │          │  │  [ON]  Research Findings      INSIGHTS  │ │
│  │          │  │  [ON]  Climate-Smart Agri     INSIGHTS  │ │
│  │          │  │  [OFF] Market Access & Trade  INSIGHTS  │ │
│  │          │  │  [ON]  Funding Opportunities  OPPORTU.  │ │
│  │          │  │  [OFF] Events & Conferences   OPPORTU.  │ │
│  │          │  │  ...                                    │ │
│  │          │  │                                         │ │
│  │          │  │  ─────────────────────────────────────  │ │
│  │          │  │                                         │ │
│  │          │  │  Selected: 4 topics                     │ │
│  │          │  │  Estimated chunks: ~25 (Weekly Digest)  │ │
│  │          │  │  [Retrieve Content]                     │ │
│  │          │  │                                         │ │
│  │          │  │  ─────────────────────────────────────  │ │
│  │          │  │  Retrieval Status: Completed ✓          │ │
│  │          │  │  Retrieved 25 content chunks            │ │
│  └──────────┘  └─────────────────────────────────────────┘ │
│                                                             │
│  ← Previous                  Step 2 of 4              Next →│
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
  // NEW: Relevance scores by audience type
  audienceRelevance: Record<string, number>  // 0-1 relevance score
}

const INFORMATION_TYPES: InformationType[] = [
  // NEWS (Blue badges)
  {
    id: 'breaking_news',
    name: 'Breaking News & Updates',
    category: 'news',
    description: 'Recent news and updates from IGAD region',
    audienceRelevance: {
      researchers: 0.6,
      policy_makers: 0.9,
      development_partners: 0.8,
      ag_tech_industry: 0.7,
      field_staff: 0.5,
      farmers: 0.4,
    }
  },
  {
    id: 'policy_updates',
    name: 'Policy Updates',
    category: 'news',
    description: 'Policy changes and regulations',
    audienceRelevance: {
      researchers: 0.7,
      policy_makers: 1.0,
      development_partners: 0.9,
      ag_tech_industry: 0.6,
      field_staff: 0.4,
      farmers: 0.3,
    }
  },
  {
    id: 'food_security',
    name: 'Food Security Updates',
    category: 'news',
    description: 'Food security and nutrition information',
    audienceRelevance: {
      researchers: 0.8,
      policy_makers: 0.9,
      development_partners: 0.9,
      ag_tech_industry: 0.5,
      field_staff: 0.7,
      farmers: 0.8,
    }
  },

  // INSIGHTS (Purple badges)
  {
    id: 'research_findings',
    name: 'Research Findings',
    category: 'insights',
    description: 'Scientific research results and studies',
    audienceRelevance: {
      researchers: 1.0,
      policy_makers: 0.7,
      development_partners: 0.6,
      ag_tech_industry: 0.8,
      field_staff: 0.3,
      farmers: 0.2,
    }
  },
  {
    id: 'technology_innovation',
    name: 'Technology & Innovation Spotlight',
    category: 'insights',
    description: 'Agricultural technology and digital farming',
    audienceRelevance: {
      researchers: 0.8,
      policy_makers: 0.5,
      development_partners: 0.6,
      ag_tech_industry: 1.0,
      field_staff: 0.6,
      farmers: 0.7,
    }
  },
  {
    id: 'climate_smart',
    name: 'Climate-Smart Agriculture',
    category: 'insights',
    description: 'Climate adaptation and sustainable practices',
    audienceRelevance: {
      researchers: 0.9,
      policy_makers: 0.8,
      development_partners: 0.8,
      ag_tech_industry: 0.7,
      field_staff: 0.8,
      farmers: 0.9,
    }
  },
  {
    id: 'market_access',
    name: 'Market Access & Trade',
    category: 'insights',
    description: 'Trade and market information',
    audienceRelevance: {
      researchers: 0.5,
      policy_makers: 0.8,
      development_partners: 0.7,
      ag_tech_industry: 0.9,
      field_staff: 0.6,
      farmers: 0.8,
    }
  },
  {
    id: 'project_updates',
    name: 'Project Updates & Success Stories',
    category: 'insights',
    description: 'Project progress and impact stories',
    audienceRelevance: {
      researchers: 0.5,
      policy_makers: 0.6,
      development_partners: 1.0,
      ag_tech_industry: 0.5,
      field_staff: 0.7,
      farmers: 0.6,
    }
  },
  {
    id: 'livestock',
    name: 'Livestock & Animal Health',
    category: 'insights',
    description: 'Livestock and veterinary information',
    audienceRelevance: {
      researchers: 0.7,
      policy_makers: 0.5,
      development_partners: 0.5,
      ag_tech_industry: 0.4,
      field_staff: 0.9,
      farmers: 1.0,
    }
  },

  // OPPORTUNITIES (Yellow badges)
  {
    id: 'funding',
    name: 'Funding Opportunities',
    category: 'opportunities',
    description: 'Grants and funding for projects',
    audienceRelevance: {
      researchers: 0.9,
      policy_makers: 0.5,
      development_partners: 1.0,
      ag_tech_industry: 0.7,
      field_staff: 0.4,
      farmers: 0.3,
    }
  },
  {
    id: 'events',
    name: 'Events & Conferences',
    category: 'opportunities',
    description: 'Workshops, conferences, and meetings',
    audienceRelevance: {
      researchers: 0.8,
      policy_makers: 0.7,
      development_partners: 0.8,
      ag_tech_industry: 0.6,
      field_staff: 0.5,
      farmers: 0.3,
    }
  },

  // RESOURCES (Green badges)
  {
    id: 'publications',
    name: 'Publications & Resources',
    category: 'resources',
    description: 'Reports, documents, and guides',
    audienceRelevance: {
      researchers: 1.0,
      policy_makers: 0.8,
      development_partners: 0.7,
      ag_tech_industry: 0.5,
      field_staff: 0.4,
      farmers: 0.2,
    }
  },
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

  "retrieval_config": {
    "tone_preset": "industry_insight",
    "frequency": "weekly",
    "length_preference": "standard",
    "target_audience": ["researchers", "policy_makers"],
    "geographic_focus": "IGAD region",
    "max_chunks": 25,
    "days_back": 14
  },

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
        "title": "Drought Resistance Study",
        "type": "research"
      },
      "audience_relevance": 0.85
    }
  ],

  "total_chunks_retrieved": 25,
  "updated_at": "2026-01-26T10:41:30Z"
}
```

---

## RAG Integration with Configuration

### Query Construction Using Step 1 Config

```typescript
interface RAGQueryParams {
  topics: string[]
  config: Step1Config
}

function buildRAGQuery(params: RAGQueryParams): string {
  const { topics, config } = params

  // Base query from selected topics
  const topicNames = topics.map(t => INFORMATION_TYPES.find(it => it.id === t)?.name).join(' ')

  // Add audience context
  const audienceContext = config.target_audience.join(' ')

  // Add geographic context
  const geoContext = config.geographic_focus || 'IGAD region'

  // Add tone context for source selection
  const toneContext = config.tone_preset === 'expert_analysis'
    ? 'research data scientific studies'
    : config.tone_preset === 'friendly_summary'
    ? 'practical applications success stories'
    : 'analysis trends insights'

  return `${topicNames} ${audienceContext} ${geoContext} ${toneContext}`
}

// Example output:
// "Research Findings Climate-Smart Agriculture researchers policy_makers
//  IGAD region analysis trends insights"
```

### Retrieval Parameters by Configuration

| Configuration | Parameter | Effect |
|--------------|-----------|--------|
| `frequency: daily` | `daysBack: 2`, `maxChunks: 15` | Recent, fewer results |
| `frequency: weekly` | `daysBack: 14`, `maxChunks: 25` | Last 2 weeks |
| `frequency: monthly` | `daysBack: 45`, `maxChunks: 40` | Last 6 weeks |
| `frequency: quarterly` | `daysBack: 120`, `maxChunks: 50` | Last 4 months |
| `length: quick_read` | `chunksMultiplier: 0.6` | 60% of base chunks |
| `length: standard` | `chunksMultiplier: 1.0` | 100% of base chunks |
| `length: deep_dive` | `chunksMultiplier: 1.5` | 150% of base chunks |
| `tone: expert_analysis` | Filter for research/technical sources |
| `tone: friendly_summary` | Filter for accessible/story sources |

### Knowledge Base Details

| Property | Value |
|----------|-------|
| **Knowledge Base ID** | `NPDZSLKCYX` |
| **Knowledge Base Name** | `knowledge-base-igad-web-scraping` |
| **Content** | 17 scraped web pages from IGAD |
| **Query Approach** | Combined query with config context |

---

## Smart Topic Suggestions

Based on Step 1 configuration, show recommended topics:

```typescript
function getRecommendedTopics(config: Step1Config): string[] {
  const recommendations: string[] = []

  // Based on audience
  config.target_audience.forEach(audience => {
    INFORMATION_TYPES.forEach(type => {
      if (type.audienceRelevance[audience] >= 0.8) {
        if (!recommendations.includes(type.id)) {
          recommendations.push(type.id)
        }
      }
    })
  })

  // Limit to top 5
  return recommendations.slice(0, 5)
}
```

### UI Enhancement: Show Relevance Indicators

```
┌─────────────────────────────────────────────────────────────┐
│  Recommended for your audience (Researchers, Policy Makers) │
├─────────────────────────────────────────────────────────────┤
│  ★★★ Research Findings           (High relevance)          │
│  ★★★ Policy Updates              (High relevance)          │
│  ★★☆ Climate-Smart Agriculture   (Medium relevance)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Rules

### Step Completion Requirements

| Requirement | Validation |
|-------------|------------|
| Topics selected | At least 1 topic selected |
| Content retrieved | `retrieval_status === 'completed'` |
| Chunks available | `retrieved_content.length > 0` |
| Config applied | `retrieval_config` matches current Step 1 config |

### Step Completion Check

```typescript
function isStep2Complete(topics: NewsletterTopics, config: Step1Config): boolean {
  return (
    topics.selected_types.length > 0 &&
    topics.retrieval_status === 'completed' &&
    topics.retrieved_content.length > 0 &&
    // Ensure retrieval was done with current config
    topics.retrieval_config?.tone_preset === config.tone_preset &&
    topics.retrieval_config?.frequency === config.frequency
  )
}
```

### Config Change Detection

If user goes back to Step 1 and changes configuration, Step 2 should:
1. Detect the config change
2. Show warning: "Configuration has changed. Content needs to be re-retrieved."
3. Require re-retrieval before proceeding

```typescript
function hasConfigChanged(
  savedConfig: RetrievalConfig,
  currentConfig: Step1Config
): boolean {
  return (
    savedConfig.tone_preset !== currentConfig.tone_preset ||
    savedConfig.frequency !== currentConfig.frequency ||
    savedConfig.length_preference !== currentConfig.length_preference ||
    JSON.stringify(savedConfig.target_audience) !== JSON.stringify(currentConfig.target_audience)
  )
}
```

---

## UI Components Required

| Component | Purpose | File |
|-----------|---------|------|
| `Step2ContentPlanning.tsx` | Main step page | `pages/Step2ContentPlanning.tsx` |
| `ConfigSummaryCard.tsx` | Show Step 1 config summary | `components/ConfigSummaryCard.tsx` |
| `InformationTypeToggle.tsx` | Toggle list with badges | `components/InformationTypeToggle.tsx` |
| `TopicRelevanceIndicator.tsx` | Show audience relevance | `components/TopicRelevanceIndicator.tsx` |
| `RetrievalProgress.tsx` | RAG progress indicator | `components/RetrievalProgress.tsx` |
| `RetrievedContentSummary.tsx` | Show retrieved chunks | `components/RetrievedContentSummary.tsx` |
| `ConfigChangeWarning.tsx` | Warn if Step 1 config changed | `components/ConfigChangeWarning.tsx` |

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/newsletters/{code}` | Get Step 1 config |
| `PUT` | `/api/newsletters/{code}/topics` | Save selected topics |
| `POST` | `/api/newsletters/{code}/retrieve-content` | Trigger RAG retrieval |
| `GET` | `/api/newsletters/{code}/retrieval-status` | Poll retrieval status |
| `GET` | `/api/newsletters/{code}/topics` | Get topics + retrieved content |

### Retrieve Content Request

```json
{
  "selected_types": ["breaking_news", "research_findings", "climate_smart"],
  "config": {
    "tone_preset": "industry_insight",
    "frequency": "weekly",
    "length_preference": "standard",
    "target_audience": ["researchers", "policy_makers"],
    "geographic_focus": "IGAD region"
  }
}
```

---

## Error States

| Error | User Message | Action |
|-------|--------------|--------|
| No topics selected | "Please select at least one topic" | Highlight toggle list |
| Config changed | "Your settings have changed. Please retrieve content again." | Show re-retrieve button |
| Retrieval failed | "Failed to retrieve content. Please try again." | Show retry button |
| Retrieval timeout | "Content retrieval is taking longer than expected." | Show cancel + retry |
| No content found | "No relevant content found for selected topics." | Suggest different topics |

---

## Performance Considerations

1. **Retrieval Time:** 2-10 seconds depending on query complexity
2. **Polling Interval:** 2 seconds to balance responsiveness and API load
3. **Content Size:** Configurable max chunks based on `length_preference`
4. **Caching:** Cache results for 1 hour (invalidate if config or topics change)

---

## Related Documents

- [Step 1 Configuration](../step-1-configuration/step1-overview.md)
- [Step 2 Frontend Implementation](./step2-frontend.md)
- [Step 2 Backend Implementation](./step2-backend.md)
- [Step 2 RAG Integration](./step2-rag-integration.md)
- [Step 2 Acceptance Criteria](./step2-acceptance-criteria.md)
- [Knowledge Base Integration (KIRO)](../00-foundation/knowledge-base-integration.md)
