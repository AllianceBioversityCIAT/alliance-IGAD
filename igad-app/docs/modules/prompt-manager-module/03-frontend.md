# Prompt Manager Module - Frontend

> React pages, hooks, and services for prompt management UI.

## TypeScript Interfaces

**Source:** `frontend/src/types/prompt.ts`

### ProposalSection Enum

```typescript
export enum ProposalSection {
  PROPOSAL_WRITER = 'proposal_writer',
  NEWSLETTER_GENERATOR = 'newsletter_generator',
  // Legacy sections
  PROBLEM_STATEMENT = 'problem_statement',
  OBJECTIVES = 'objectives',
  METHODOLOGY = 'methodology',
  BUDGET = 'budget',
  THEORY_OF_CHANGE = 'theory_of_change',
  LITERATURE_REVIEW = 'literature_review',
  TIMELINE = 'timeline',
  RISK_ASSESSMENT = 'risk_assessment',
  SUSTAINABILITY = 'sustainability',
  MONITORING_EVALUATION = 'monitoring_evaluation',
  EXECUTIVE_SUMMARY = 'executive_summary',
  APPENDICES = 'appendices',
}

export const SECTION_LABELS: Record<ProposalSection, string> = {
  [ProposalSection.PROPOSAL_WRITER]: 'Proposal Writer',
  [ProposalSection.NEWSLETTER_GENERATOR]: 'Newsletter Generator',
  // ... all labels
}
```

### Predefined Categories

```typescript
export const PROMPT_CATEGORIES = [
  'RFP / Call for Proposals',
  'Reference Proposals',
  'Existing Work & Experience',
  'Initial Concept',
  'Direction',
  'Technical Approach',
  'Budget Planning',
  'Risk Management',
  'Impact Assessment',
  'Stakeholder Analysis',
  'Literature Review',
  'Methodology Design',
  'Timeline Planning',
  'Sustainability Planning',
  'Monitoring & Evaluation',
] as const

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number]
```

### Core Interfaces

```typescript
export interface PromptContext {
  persona?: string
  sources?: string[]
  constraints?: string
  guardrails?: string
}

export interface FewShotExample {
  input: string
  output: string
}

export interface Prompt {
  id: string
  name: string
  section: ProposalSection
  sub_section?: string
  route?: string
  categories: string[]
  tags: string[]
  version: number
  is_active: boolean
  system_prompt: string
  user_prompt_template: string
  tone?: string
  output_format?: string
  few_shot?: FewShotExample[]
  context?: PromptContext
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  comments_count?: number
}

export interface PromptListResponse {
  prompts: Prompt[]
  total: number
  has_more: boolean
}

export interface PromptPreviewRequest {
  system_prompt: string
  user_prompt_template: string
  variables?: Record<string, string>
  context?: PromptContext
}

export interface PromptPreviewResponse {
  output: string
  tokens_used: number
  processing_time: number
}

export interface CreatePromptRequest {
  name: string
  section: ProposalSection
  sub_section?: string
  route?: string
  categories?: string[]
  tags?: string[]
  system_prompt: string
  user_prompt_template: string
  tone?: string
  output_format?: string
  few_shot?: FewShotExample[]
  context?: PromptContext
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  version?: number
}
```

---

## Prompt Service

**Source:** `frontend/src/tools/admin/services/promptService.ts`

```typescript
class PromptService {
  private baseUrl = '/admin/prompts'

  async listPrompts(params?: {
    section?: ProposalSection
    status?: 'draft' | 'published'
    tag?: string
    search?: string
    route?: string
    is_active?: boolean
    limit?: number
    offset?: number
  }): Promise<PromptListResponse>

  async getPrompt(id: string, version?: number | 'latest'): Promise<Prompt>

  async createPrompt(data: CreatePromptRequest): Promise<Prompt>

  async updatePrompt(id: string, data: UpdatePromptRequest): Promise<Prompt>

  async publishPrompt(id: string, version: number): Promise<Prompt>

  async deletePrompt(id: string, version?: number): Promise<void>

  async toggleActive(id: string): Promise<Prompt>

  async previewPrompt(data: PromptPreviewRequest): Promise<PromptPreviewResponse>

  async getPromptBySection(section: ProposalSection): Promise<Prompt | null>
}

export const promptService = new PromptService()
```

### API Mapping

| Method | HTTP | URL |
|--------|------|-----|
| `listPrompts` | GET | `/admin/prompts/list?section=&tag=&search=&...` |
| `getPrompt` | GET | `/admin/prompts/{id}?version=` |
| `createPrompt` | POST | `/admin/prompts/create` |
| `updatePrompt` | PUT | `/admin/prompts/{id}/update` |
| `publishPrompt` | POST | `/admin/prompts/{id}/publish` |
| `deletePrompt` | DELETE | `/admin/prompts/{id}` |
| `toggleActive` | POST | `/admin/prompts/{id}/toggle-active` |
| `previewPrompt` | POST | `/admin/prompts/preview` |
| `getPromptBySection` | GET | `/prompts/section/{section}?published=true` |

---

## React Query Hooks

**Source:** `frontend/src/tools/admin/hooks/usePrompts.ts`

### `usePrompts(filters?)`

Main hook for prompt list management.

```typescript
interface UsePromptsFilters {
  section?: ProposalSection
  status?: 'draft' | 'published'
  tag?: string
  search?: string
  route?: string
  is_active?: boolean
}

const {
  // Data
  prompts,        // Prompt[]
  total,          // number
  hasMore,        // boolean
  currentPage,    // number

  // Loading states
  isLoading,
  isCreating,
  isUpdating,
  isPublishing,
  isDeleting,
  isPreviewing,
  isTogglingActive,

  // Error states
  error,
  createError,
  updateError,
  publishError,
  deleteError,
  previewError,

  // Preview data
  previewData,    // PromptPreviewResponse

  // Actions (all return Promise)
  createPrompt,
  updatePrompt,
  publishPrompt,
  deletePrompt,
  toggleActive,
  previewPrompt,
  refetch,

  // Pagination
  setCurrentPage,
  nextPage,
  prevPage,
} = usePrompts(filters)
```

#### Query Configuration

```typescript
useQuery({
  queryKey: ['prompts', filters, currentPage],
  queryFn: () => promptService.listPrompts({ ...filters, limit: 20, offset: currentPage * 20 }),
  placeholderData: keepPreviousData,
  staleTime: 5 * 60 * 1000,  // 5 minutes
})
```

#### Mutation Invalidation

All mutations invalidate `['prompts']` query key on success.

### `usePrompt(id, version?)`

Single prompt query.

```typescript
const { data, isLoading, error } = usePrompt(promptId, version)
// queryKey: ['prompt', id, version]
// staleTime: 5 minutes
// enabled: !!id
```

### `usePromptBySection(section)`

Runtime prompt retrieval.

```typescript
const { data, isLoading } = usePromptBySection(ProposalSection.PROPOSAL_WRITER)
// queryKey: ['prompt-by-section', section]
// staleTime: 2 minutes
```

---

## Pages

### PromptManagerPage

**Source:** `frontend/src/tools/admin/pages/PromptManagerPage.tsx`

List view showing all prompts with filtering and actions.

#### Features

- Filter by section, tag, search text, active status, route
- Paginated list (20 per page)
- Each prompt shows: name, section, route, categories, version, active badge, comments count
- Actions: Edit (navigate to editor), Toggle Active, Delete
- Create New Prompt button (navigates to `/admin/prompt-manager/create`)

#### Route

```
/admin/prompt-manager → AdminRoute → PromptManagerPage
```

### PromptEditorPage

**Source:** `frontend/src/tools/admin/pages/PromptEditorPage.tsx`

Create/edit form for prompts.

#### Routes

```
/admin/prompt-manager/create        → Create mode
/admin/prompt-manager/edit/:id      → Edit mode (loads existing prompt)
```

#### Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Name | text | Yes | Prompt display name |
| Section | select | Yes | ProposalSection enum |
| Sub-section | text | No | e.g., "step-1" |
| Route | text | No | e.g., "/proposal-writer/step-1" |
| Categories | multi-select | No | From PROMPT_CATEGORIES |
| Tags | tag input | No | Free-text tags |
| System Prompt | textarea | Yes | System instruction |
| User Prompt Template | textarea | Yes | User prompt with variables |
| Tone | text | No | Default: "Professional and informative" |
| Output Format | textarea | No | Default: "Clear and structured response" |
| Few-shot Examples | dynamic list | No | Input/output pairs |
| Context | object | No | Persona, sources, constraints, guardrails |
| Change Comment | text | No (edit only) | Description of changes |

#### Modes

- **Create:** Empty form, POST `/admin/prompts/create`
- **Edit:** Pre-filled form from `usePrompt(id)`, PUT `/admin/prompts/{id}/update`

#### Panels

- **Preview Panel:** Send prompt to Bedrock for AI response preview
- **Comments Panel:** View/add comments (edit mode only)
- **History Panel:** View change history (edit mode only)

---

## Component Hierarchy

```
App
└── AdminRoute
    ├── PromptManagerPage
    │   ├── PromptFilters (section, tag, search, route, is_active)
    │   ├── PromptCard[] (one per prompt)
    │   │   ├── ActiveBadge
    │   │   ├── SectionBadge
    │   │   ├── CategoryTags
    │   │   └── ActionButtons (edit, toggle, delete)
    │   └── Pagination (prev, next, page info)
    │
    └── PromptEditorPage
        ├── PromptForm
        │   ├── NameField
        │   ├── SectionSelect
        │   ├── SubSectionField
        │   ├── RouteField
        │   ├── CategorySelector (multi-select from PROMPT_CATEGORIES)
        │   ├── TagInput
        │   ├── SystemPromptTextarea
        │   ├── UserPromptTemplateTextarea
        │   ├── ToneField
        │   ├── OutputFormatTextarea
        │   ├── FewShotExamples (dynamic add/remove)
        │   ├── ContextFields (persona, sources, constraints, guardrails)
        │   └── ChangeCommentField (edit mode only)
        ├── PromptPreview
        │   ├── PreviewButton
        │   └── PreviewResult (output, tokens, time)
        ├── CommentSection (edit mode)
        │   ├── CommentForm
        │   └── CommentThread[] (with replies)
        └── ChangeHistory (edit mode)
            └── ChangeEntry[] (timestamp, author, type, changes)
```

---

## State Management

- **Server state:** TanStack React Query (caching, invalidation, optimistic updates)
- **Form state:** React Hook Form (validation, dirty tracking)
- **UI state:** React useState (modals, panels, loading states)

### Query Cache Strategy

| Query Key | Stale Time | Notes |
|-----------|-----------|-------|
| `['prompts', filters, page]` | 5 min | List with `keepPreviousData` |
| `['prompt', id, version]` | 5 min | Single prompt |
| `['prompt-by-section', section]` | 2 min | Runtime access (shorter cache) |

---

## Dependencies

```json
{
  "@tanstack/react-query": "^5.x",
  "react-hook-form": "^7.x",
  "react-router-dom": "^6.x",
  "lucide-react": "^0.x"
}
```
