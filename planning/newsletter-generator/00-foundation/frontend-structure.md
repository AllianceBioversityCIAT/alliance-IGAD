# Frontend Structure

## Overview

The Newsletter Generator frontend follows **Screaming Architecture** - the folder structure clearly communicates the tool's purpose and organization.

---

## Target Folder Structure

```
igad-app/frontend/src/tools/newsletter-generator/
├── components/                    # Reusable UI components
│   ├── NewsletterLayout.tsx       # Main layout wrapper
│   ├── NewsletterLayout.module.css
│   ├── NewsletterSecondaryNavbar.tsx
│   ├── NewsletterSidebar.tsx
│   ├── AudienceCheckboxGroup.tsx  # Step 1: Audience selection
│   ├── ToneSlider.tsx             # Step 1: Tone configuration
│   ├── InformationTypeToggle.tsx  # Step 2: Topic toggles
│   ├── OutlineSection.tsx         # Step 3: Expandable outline
│   └── ExportButton.tsx           # Step 4: Download buttons
│
├── pages/                         # Step components
│   ├── NewsletterGeneratorPage.tsx        # Main orchestrator
│   ├── NewsletterGeneratorPage.module.css
│   ├── Step1Configuration.tsx
│   ├── Step1Configuration.module.css
│   ├── Step2ContentPlanning.tsx
│   ├── Step2ContentPlanning.module.css
│   ├── Step3OutlineReview.tsx
│   ├── Step3OutlineReview.module.css
│   ├── Step4Drafting.tsx
│   ├── Step4Drafting.module.css
│   └── newsletterStepConfig.ts    # Step configuration
│
├── hooks/                         # Custom React hooks
│   ├── useNewsletter.ts           # Newsletter CRUD operations
│   └── useNewsletterDraft.ts      # LocalStorage persistence
│
├── services/                      # API communication
│   └── newsletterService.ts       # HTTP client for backend
│
├── types/                         # TypeScript definitions
│   └── newsletter.ts              # Interfaces and types
│
└── index.tsx                      # Exports
```

---

## Component Mapping (Proposal Writer -> Newsletter)

| Proposal Writer | Newsletter Generator | Changes |
|-----------------|---------------------|---------|
| `ProposalLayout.tsx` | `NewsletterLayout.tsx` | Update step count (4), breadcrumb text |
| `ProposalSecondaryNavbar.tsx` | `NewsletterSecondaryNavbar.tsx` | Change "Proposal Writer" to "Newsletter Generator" |
| `ProposalSidebar.tsx` | `NewsletterSidebar.tsx` | Update step icons and labels |
| `ProposalWriterPage.tsx` | `NewsletterGeneratorPage.tsx` | Different state management, 4 steps |
| `stepConfig.ts` | `newsletterStepConfig.ts` | 4 steps with new configuration |

---

## Step Configuration

### `newsletterStepConfig.ts`

```typescript
import { Settings, FileText, List, Download } from 'lucide-react'

export const newsletterStepConfig = [
  {
    id: 1,
    title: 'Configuration',
    icon: Settings,
    stage: 'Setup',
    stageColor: '#6d97d5',
  },
  {
    id: 2,
    title: 'Content Planning',
    icon: FileText,
    stage: 'Planning',
    stageColor: '#d59e6d',
  },
  {
    id: 3,
    title: 'Outline Review',
    icon: List,
    stage: 'Review',
    stageColor: '#8c6dd5',
  },
  {
    id: 4,
    title: 'Draft & Export',
    icon: Download,
    stage: 'Finalize',
    stageColor: '#48cd65',
  },
]

export interface NewsletterStepProps {
  formData: {
    config: NewsletterConfig
    topics: NewsletterTopics
    outline: NewsletterOutline
    draft: NewsletterDraft
  }
  setFormData: React.Dispatch<React.SetStateAction<...>>
  newsletterId?: string
}
```

---

## Types

### `types/newsletter.ts`

```typescript
// Step 1: Configuration
export interface NewsletterConfig {
  newsletter_id: string
  user_id: string
  target_audience: string[]
  tone_professional: number  // 0-100
  tone_technical: number     // 0-100
  format_type: 'email' | 'pdf' | 'web' | 'social'
  length_preference: 'short' | 'mixed' | 'long'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  geographic_focus: string
  status: 'draft' | 'processing' | 'completed'
  created_at: string
  updated_at: string
}

// Step 2: Topics
export interface NewsletterTopics {
  newsletter_id: string
  selected_types: string[]
  retrieved_content: RetrievedContent[]
  structure_preview: StructureItem[]
  topics_status: 'pending' | 'processing' | 'completed'
}

export interface RetrievedContent {
  topic: string
  content: string
  source: string
  date: string
  relevance_score: number
}

export interface StructureItem {
  section: string
  items: string[]
}

// Step 3: Outline
export interface NewsletterOutline {
  newsletter_id: string
  sections: OutlineSection[]
  outline_status: 'pending' | 'processing' | 'completed'
  generated_at?: string
}

export interface OutlineSection {
  id: string
  title: string
  items: OutlineItem[]
  expanded: boolean
}

export interface OutlineItem {
  id: string
  title: string
  description: string
  editable: boolean
}

// Step 4: Draft
export interface NewsletterDraft {
  newsletter_id: string
  generated_content: string
  sections: Record<string, string>
  draft_status: 'pending' | 'processing' | 'completed'
  user_edits?: string
  generated_at?: string
}

// API Response types
export interface NewsletterResponse {
  newsletter: NewsletterConfig
  message?: string
}

export interface StatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  data?: any
  error?: string
  started_at?: string
  completed_at?: string
}
```

---

## Service Layer

### `services/newsletterService.ts`

```typescript
import { authService } from '@/shared/services/authService'

const API_BASE = '/api/newsletters'

export const newsletterService = {
  // CRUD
  async createNewsletter(data: Partial<NewsletterConfig>) {
    return this.request('POST', API_BASE, data)
  },
  
  async getNewsletter(id: string) {
    return this.request('GET', `${API_BASE}/${id}`)
  },
  
  async updateNewsletter(id: string, data: Partial<NewsletterConfig>) {
    return this.request('PUT', `${API_BASE}/${id}`, data)
  },
  
  async deleteNewsletter(id: string) {
    return this.request('DELETE', `${API_BASE}/${id}`)
  },
  
  // Step 2: Topics
  async saveTopics(id: string, topics: string[]) {
    return this.request('PUT', `${API_BASE}/${id}/topics`, { selected_types: topics })
  },
  
  async retrieveContent(id: string) {
    return this.request('POST', `${API_BASE}/${id}/retrieve-content`)
  },
  
  async getRetrievalStatus(id: string) {
    return this.request('GET', `${API_BASE}/${id}/retrieval-status`)
  },
  
  // Step 3: Outline
  async generateOutline(id: string) {
    return this.request('POST', `${API_BASE}/${id}/generate-outline`)
  },
  
  async getOutlineStatus(id: string) {
    return this.request('GET', `${API_BASE}/${id}/outline-status`)
  },
  
  async updateOutline(id: string, outline: NewsletterOutline) {
    return this.request('PUT', `${API_BASE}/${id}/outline`, outline)
  },
  
  // Step 4: Draft
  async generateDraft(id: string) {
    return this.request('POST', `${API_BASE}/${id}/generate-draft`)
  },
  
  async getDraftStatus(id: string) {
    return this.request('GET', `${API_BASE}/${id}/draft-status`)
  },
  
  async updateDraft(id: string, content: string) {
    return this.request('PUT', `${API_BASE}/${id}/draft`, { content })
  },
  
  async exportNewsletter(id: string, format: 'pdf' | 'docx' | 'html') {
    return this.requestBlob('GET', `${API_BASE}/${id}/export/${format}`)
  },
  
  // Base request method
  private async request(method: string, url: string, data?: any) {
    const token = authService.getAccessToken()
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return response.json()
  },
  
  private async requestBlob(method: string, url: string) {
    const token = authService.getAccessToken()
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!response.ok) {
      throw new Error(`Export error: ${response.status}`)
    }
    
    return response.blob()
  },
}
```

---

## Hooks

### `hooks/useNewsletter.ts`

```typescript
import { useState, useCallback } from 'react'
import { newsletterService } from '../services/newsletterService'
import { NewsletterConfig } from '../types/newsletter'

export function useNewsletter() {
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const createNewsletter = useCallback(
    async (data: Partial<NewsletterConfig>, options?: {
      onSuccess?: (newsletter: NewsletterConfig) => void
      onError?: (error: Error) => void
    }) => {
      setIsCreating(true)
      try {
        const result = await newsletterService.createNewsletter(data)
        options?.onSuccess?.(result.newsletter)
        return result.newsletter
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      } finally {
        setIsCreating(false)
      }
    },
    []
  )
  
  const deleteNewsletter = useCallback(
    async (id: string, options?: {
      onSuccess?: () => void
      onError?: (error: Error) => void
    }) => {
      setIsDeleting(true)
      try {
        await newsletterService.deleteNewsletter(id)
        options?.onSuccess?.()
      } catch (error) {
        options?.onError?.(error as Error)
        throw error
      } finally {
        setIsDeleting(false)
      }
    },
    []
  )
  
  return {
    createNewsletter,
    deleteNewsletter,
    isCreating,
    isDeleting,
  }
}
```

### `hooks/useNewsletterDraft.ts`

```typescript
import { useCallback } from 'react'

const STORAGE_PREFIX = 'newsletter_draft_'

export function useNewsletterDraft() {
  const saveNewsletterId = useCallback((id: string) => {
    localStorage.setItem(`${STORAGE_PREFIX}id`, id)
  }, [])
  
  const saveNewsletterCode = useCallback((code: string) => {
    localStorage.setItem(`${STORAGE_PREFIX}code`, code)
  }, [])
  
  const saveFormData = useCallback((data: any) => {
    localStorage.setItem(`${STORAGE_PREFIX}formData`, JSON.stringify(data))
  }, [])
  
  const loadDraft = useCallback(() => {
    return {
      newsletterId: localStorage.getItem(`${STORAGE_PREFIX}id`),
      newsletterCode: localStorage.getItem(`${STORAGE_PREFIX}code`),
      formData: JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}formData`) || '{}'),
    }
  }, [])
  
  const clearDraft = useCallback(() => {
    localStorage.removeItem(`${STORAGE_PREFIX}id`)
    localStorage.removeItem(`${STORAGE_PREFIX}code`)
    localStorage.removeItem(`${STORAGE_PREFIX}formData`)
  }, [])
  
  return {
    saveNewsletterId,
    saveNewsletterCode,
    saveFormData,
    loadDraft,
    clearDraft,
  }
}
```

---

## Router Configuration

Add to `src/App.tsx` or router configuration:

```typescript
import { NewsletterGeneratorPage } from '@/tools/newsletter-generator'

// In routes array:
{
  path: '/newsletter-generator/*',
  element: <NewsletterGeneratorPage />,
}
```

---

## CSS Module Conventions

Follow existing Proposal Writer patterns:
- Use `.module.css` files for component-specific styles
- Import shared variables from `@/shared/styles/variables.css`
- Use BEM-like naming: `componentName`, `componentName__element`, `componentName--modifier`
