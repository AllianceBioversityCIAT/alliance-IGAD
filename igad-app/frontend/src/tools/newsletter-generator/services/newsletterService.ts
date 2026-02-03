/**
 * Newsletter Service
 *
 * API service for newsletter CRUD operations.
 */

import { apiClient } from '@/shared/services/apiClient'
import type { PublishingSchedule, ExportFormat } from '../types/newsletter'

// Step completion status interface
export interface StepCompletionStatus {
  completed: boolean
  status?: string
  has_title?: boolean
  has_audience?: boolean
  has_tone_preset?: boolean
  has_sections?: boolean
}

// Types
export interface NewsletterConfig {
  id: string
  newsletterCode: string
  title: string
  status: 'draft' | 'processing' | 'completed' | 'exported'
  target_audience: string[]
  tone_professional: number // Legacy
  tone_technical: number // Legacy
  tone_preset: string // New semantic preset
  format_type: string
  length_preference: string
  frequency: string
  schedule?: PublishingSchedule // Publishing schedule configuration
  geographic_focus: string
  current_step: number
  created_at: string
  updated_at: string
  // Backend-computed step completion (survives page refresh)
  completed_steps?: number[] // Array of completed step numbers [1, 2, 3]
  step_completion?: Record<string, StepCompletionStatus> // Detailed status per step
}

export interface NewsletterListItem {
  newsletterCode: string
  title: string
  status: string
  current_step: number
  created_at: string
  updated_at: string
}

export interface CreateNewsletterRequest {
  title?: string
}

export interface UpdateNewsletterRequest {
  target_audience?: string[]
  tone_professional?: number // Legacy
  tone_technical?: number // Legacy
  tone_preset?: string // New semantic preset
  format_type?: string
  length_preference?: string
  frequency?: string
  schedule?: PublishingSchedule // Publishing schedule configuration
  geographic_focus?: string
  current_step?: number
}

export interface RetrievalConfig {
  tone_preset: string
  frequency: string
  length_preference: string
  target_audience: string[]
  geographic_focus: string
  max_chunks: number
  days_back: number
}

export interface RetrievedChunk {
  chunk_id: string
  topic_id: string
  content: string
  score: number
  source_url?: string
  source_metadata?: Record<string, unknown>
}

export interface TopicsData {
  selected_types: string[]
  retrieval_status: 'pending' | 'processing' | 'completed' | 'failed'
  retrieval_config?: RetrievalConfig
  retrieved_content: RetrievedChunk[]
  total_chunks_retrieved: number
  retrieval_started_at?: string
  retrieval_completed_at?: string
  retrieval_error?: string
}

export interface RetrieveContentResponse {
  success: boolean
  retrieval_status: string
  total_chunks_retrieved?: number
  retrieval_started_at?: string
  retrieval_completed_at?: string
  retrieval_error?: string
}

// Step 3: Outline Types
export interface OutlineItem {
  id: string
  section_id: string
  title: string
  description: string
  content_sources: string[]
  order: number
  is_custom: boolean
  is_editable: boolean
  included: boolean // Whether to include this item in draft generation
  user_notes?: string
}

export interface OutlineSection {
  id: string
  name: string
  order: number
  items: OutlineItem[]
}

export interface OutlineData {
  sections: OutlineSection[]
  outline_status: 'pending' | 'processing' | 'completed' | 'failed'
  outline_error?: string
  generated_at?: string
  generation_config?: {
    tone_preset: string
    length_preference: string
    target_audience: string[]
  }
  user_modifications: {
    items_added: number
    items_removed: number
    items_edited: number
  }
  updated_at?: string
}

export interface GenerateOutlineResponse {
  success: boolean
  outline_status: string
  sections?: OutlineSection[]
  generated_at?: string
  outline_error?: string
}

export interface AddOutlineItemRequest {
  section_id: string
  title: string
  description: string
  user_notes?: string
}

export interface AddOutlineItemResponse {
  success: boolean
  item: OutlineItem
}

// Step 4: Draft Types
export interface DraftItem {
  id: string
  title: string
}

export interface DraftSection {
  id: string
  sectionId: string
  title: string
  content: string
  items: DraftItem[]
  order: number
  isEdited: boolean
}

export interface DraftData {
  title: string
  subtitle?: string
  sections: DraftSection[]
  draft_status: 'pending' | 'processing' | 'completed' | 'failed'
  draft_error?: string
  generated_at?: string
  generation_config?: {
    tone_preset: string
    length_preference: string
    target_audience: string[]
  }
  metadata: {
    wordCount: number
    readingTime: string
  }
  user_edits: {
    sectionsEdited: number
    lastEditedAt?: string
  }
  updated_at?: string
}

export interface GenerateDraftResponse {
  success: boolean
  draft_status: string
  title?: string
  subtitle?: string
  sections?: DraftSection[]
  generated_at?: string
  metadata?: {
    wordCount: number
    readingTime: string
  }
  draft_error?: string
}

export interface SaveDraftRequest {
  title?: string
  subtitle?: string
  sections: DraftSection[]
}

export interface SaveDraftSectionRequest {
  content: string
  title?: string
}

export interface ExportDraftResponse {
  success: boolean
  format: string
  filename: string
  mime_type: string
  content: string
}

export interface AICompleteRequest {
  prompt: string
  context?: string
}

// API Functions
export const newsletterService = {
  /**
   * Create a new newsletter
   */
  async createNewsletter(data: CreateNewsletterRequest = {}): Promise<NewsletterConfig> {
    const response = await apiClient.post('/api/newsletters', data)
    return response.data
  },

  /**
   * Get a newsletter by code
   */
  async getNewsletter(newsletterCode: string): Promise<NewsletterConfig> {
    const response = await apiClient.get(`/api/newsletters/${newsletterCode}`)
    return response.data
  },

  /**
   * Update newsletter configuration
   */
  async updateNewsletter(
    newsletterCode: string,
    data: UpdateNewsletterRequest
  ): Promise<{ success: boolean; updated_at: string }> {
    const response = await apiClient.put(`/api/newsletters/${newsletterCode}`, data)
    return response.data
  },

  /**
   * List all newsletters for current user
   */
  async listNewsletters(): Promise<{ newsletters: NewsletterListItem[]; total: number }> {
    const response = await apiClient.get('/api/newsletters')
    return response.data
  },

  /**
   * Delete a newsletter
   */
  async deleteNewsletter(newsletterCode: string): Promise<{ success: boolean; deleted: string }> {
    const response = await apiClient.delete(`/api/newsletters/${newsletterCode}`)
    return response.data
  },

  /**
   * Save selected topics (Step 2)
   */
  async saveTopics(
    newsletterCode: string,
    selectedTypes: string[]
  ): Promise<{ success: boolean; selected_types: string[]; updated_at: string }> {
    const response = await apiClient.put(`/api/newsletters/${newsletterCode}/topics`, {
      selected_types: selectedTypes,
    })
    return response.data
  },

  /**
   * Get topics and retrieved content
   */
  async getTopics(newsletterCode: string): Promise<TopicsData> {
    const response = await apiClient.get(`/api/newsletters/${newsletterCode}/topics`)
    return response.data
  },

  /**
   * Trigger content retrieval from Knowledge Base (Step 2)
   */
  async triggerContentRetrieval(
    newsletterCode: string,
    selectedTypes: string[]
  ): Promise<RetrieveContentResponse> {
    const response = await apiClient.post(`/api/newsletters/${newsletterCode}/retrieve-content`, {
      selected_types: selectedTypes,
    })
    return response.data
  },

  /**
   * Get retrieval status (for polling)
   */
  async getRetrievalStatus(newsletterCode: string): Promise<TopicsData> {
    const response = await apiClient.get(`/api/newsletters/${newsletterCode}/retrieval-status`)
    return response.data
  },

  // ==================== STEP 3: OUTLINE ====================

  /**
   * Get outline data
   */
  async getOutline(newsletterCode: string): Promise<OutlineData> {
    const response = await apiClient.get(`/api/newsletters/${newsletterCode}/outline`)
    return response.data
  },

  /**
   * Trigger AI outline generation
   */
  async generateOutline(newsletterCode: string): Promise<GenerateOutlineResponse> {
    const response = await apiClient.post(`/api/newsletters/${newsletterCode}/generate-outline`)
    return response.data
  },

  /**
   * Get outline status (for polling)
   */
  async getOutlineStatus(newsletterCode: string): Promise<OutlineData> {
    const response = await apiClient.get(`/api/newsletters/${newsletterCode}/outline-status`)
    return response.data
  },

  /**
   * Save outline modifications
   */
  async saveOutline(
    newsletterCode: string,
    sections: OutlineSection[]
  ): Promise<{ success: boolean; updated_at: string }> {
    const response = await apiClient.put(`/api/newsletters/${newsletterCode}/outline`, {
      sections,
    })
    return response.data
  },

  /**
   * Add custom item to outline section
   */
  async addOutlineItem(
    newsletterCode: string,
    data: AddOutlineItemRequest
  ): Promise<AddOutlineItemResponse> {
    const response = await apiClient.post(`/api/newsletters/${newsletterCode}/outline-item`, data)
    return response.data
  },

  /**
   * Remove item from outline
   */
  async removeOutlineItem(
    newsletterCode: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(
      `/api/newsletters/${newsletterCode}/outline-item/${itemId}`
    )
    return response.data
  },

  // ==================== STEP 4: DRAFT ====================

  /**
   * Get draft data
   */
  async getDraft(newsletterCode: string): Promise<DraftData> {
    const response = await apiClient.get(`/api/newsletters/${newsletterCode}/draft`)
    return response.data
  },

  /**
   * Trigger AI draft generation
   */
  async generateDraft(newsletterCode: string): Promise<GenerateDraftResponse> {
    const response = await apiClient.post(`/api/newsletters/${newsletterCode}/generate-draft`)
    return response.data
  },

  /**
   * Get draft status (for polling)
   */
  async getDraftStatus(newsletterCode: string): Promise<DraftData> {
    const response = await apiClient.get(`/api/newsletters/${newsletterCode}/draft-status`)
    return response.data
  },

  /**
   * Save draft modifications
   */
  async saveDraft(
    newsletterCode: string,
    data: SaveDraftRequest
  ): Promise<{ success: boolean; updated_at: string; wordCount: number }> {
    const response = await apiClient.put(`/api/newsletters/${newsletterCode}/draft`, data)
    return response.data
  },

  /**
   * Save a single draft section
   */
  async saveDraftSection(
    newsletterCode: string,
    sectionId: string,
    data: SaveDraftSectionRequest
  ): Promise<{ success: boolean; updated_at: string; wordCount: number }> {
    const response = await apiClient.put(
      `/api/newsletters/${newsletterCode}/draft/section/${sectionId}`,
      data
    )
    return response.data
  },

  /**
   * Export draft in specified format
   */
  async exportDraft(newsletterCode: string, format: ExportFormat): Promise<ExportDraftResponse> {
    const response = await apiClient.post(`/api/newsletters/${newsletterCode}/export`, {
      format,
    })
    return response.data
  },

  /**
   * AI autocomplete for inline editing
   */
  async aiComplete(data: AICompleteRequest): Promise<{ completion: string }> {
    const response = await apiClient.post('/api/newsletters/ai-complete', data)
    return response.data
  },
}
