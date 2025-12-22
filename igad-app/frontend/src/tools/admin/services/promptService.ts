import { apiClient } from '@/shared/services/apiClient'
import type {
  Prompt,
  PromptListResponse,
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptPreviewRequest,
  PromptPreviewResponse,
  ProposalSection,
} from '@/types/prompt'

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
  }): Promise<PromptListResponse> {
    const searchParams = new URLSearchParams()

    if (params?.section) {
      searchParams.append('section', params.section)
    }
    if (params?.status) {
      searchParams.append('status', params.status)
    }
    if (params?.tag) {
      searchParams.append('tag', params.tag)
    }
    if (params?.search) {
      searchParams.append('search', params.search)
    }
    if (params?.route) {
      searchParams.append('route', params.route)
    }
    if (params?.is_active !== undefined) {
      searchParams.append('is_active', params.is_active.toString())
    }
    if (params?.limit) {
      searchParams.append('limit', params.limit.toString())
    }
    if (params?.offset) {
      searchParams.append('offset', params.offset.toString())
    }

    const response = await apiClient.get(`${this.baseUrl}/list?${searchParams}`)
    return response.data
  }

  async getPrompt(id: string, version?: number | 'latest'): Promise<Prompt> {
    const versionParam = version ? `?version=${version}` : ''
    const response = await apiClient.get(`${this.baseUrl}/${id}${versionParam}`)
    return response.data
  }

  async createPrompt(data: CreatePromptRequest): Promise<Prompt> {
    const response = await apiClient.post(`${this.baseUrl}/create`, data)
    return response.data
  }

  async updatePrompt(id: string, data: UpdatePromptRequest): Promise<Prompt> {
    const response = await apiClient.put(`${this.baseUrl}/${id}/update`, data)
    return response.data
  }

  async publishPrompt(id: string, version: number): Promise<Prompt> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/publish`, { version })
    return response.data
  }

  async deletePrompt(id: string, version?: number): Promise<void> {
    const versionParam = version ? `/${version}` : ''
    await apiClient.delete(`${this.baseUrl}/${id}${versionParam}`)
  }

  async toggleActive(id: string): Promise<Prompt> {
    const response = await apiClient.post(`${this.baseUrl}/${id}/toggle-active`)
    return response.data
  }

  async previewPrompt(data: PromptPreviewRequest): Promise<PromptPreviewResponse> {
    const response = await apiClient.post(`${this.baseUrl}/preview`, data)
    return response.data
  }

  async getPromptBySection(section: ProposalSection): Promise<Prompt | null> {
    try {
      const response = await apiClient.get(`/prompts/section/${section}?published=true`)
      return response.data
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } }
      if (err.response?.status === 404) {
        return null
      }
      throw error
    }
  }
}

export const promptService = new PromptService()
