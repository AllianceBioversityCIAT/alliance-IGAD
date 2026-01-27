/**
 * Newsletter Service
 *
 * API service for newsletter CRUD operations.
 */

import { apiClient } from '@/shared/services/apiClient'
import type { PublishingSchedule } from '../types/newsletter'

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

export interface TopicsData {
  selected_types: string[]
  retrieval_status: 'pending' | 'processing' | 'completed' | 'failed'
  retrieved_content: RetrievedChunk[]
  total_chunks_retrieved: number
  retrieval_started_at?: string
  retrieval_completed_at?: string
  retrieval_error?: string
}

export interface RetrievedChunk {
  chunk_id: string
  topic_id: string
  content: string
  score: number
  source_url?: string
  source_metadata?: Record<string, unknown>
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

  // Note: retrieve-content endpoint will be added when KIRO implements Knowledge Base
}
