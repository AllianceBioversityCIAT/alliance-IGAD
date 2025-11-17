import { apiClient } from './apiClient'

export interface Proposal {
  id: string
  proposalCode: string
  user_id: string
  user_email?: string
  user_name?: string
  title: string
  description: string
  template_id?: string
  status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived'
  sections?: ProposalSection[]
  metadata: Record<string, any>
  uploaded_files: Record<string, string[]>
  text_inputs: Record<string, string>
  ai_context?: Record<string, any>
  created_at: string
  updated_at: string
  version?: number
}

export interface ProposalSection {
  id: string
  title: string
  content: string
  ai_generated: boolean
  order: number
  metadata: Record<string, any>
}

export interface AIGenerationResult {
  content: string
  tokens_used: number
  generation_time: number
  section_id?: string
}

export interface AISuggestion {
  type: string
  section_id?: string
  section_title?: string
  message: string
  action: string
}

class ProposalService {
  async createProposal(data: {
    title: string
    description?: string
    template_id?: string
  }): Promise<Proposal> {
    const response = await apiClient.post('/api/proposals', data)
    return response.data.proposal
  }

  async getProposal(id: string): Promise<Proposal> {
    const response = await apiClient.get(`/api/proposals/${id}`)
    return response.data.proposal
  }

  async updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
    const response = await apiClient.put(`/api/proposals/${id}`, updates)
    return response.data.proposal
  }

  async deleteProposal(id: string): Promise<void> {
    await apiClient.delete(`/api/proposals/${id}`)
  }

  async listProposals(): Promise<Proposal[]> {
    const response = await apiClient.get('/api/proposals')
    return response.data.proposals
  }

  async generateSectionContent(
    proposalId: string,
    sectionId: string,
    contextData?: Record<string, any>
  ): Promise<AIGenerationResult> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/generate`, {
      section_id: sectionId,
      context_data: contextData,
    })
    return response.data.result
  }

  async improveSectionContent(
    proposalId: string,
    sectionId: string,
    improvementType: string = 'general'
  ): Promise<AIGenerationResult> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/improve`, {
      section_id: sectionId,
      improvement_type: improvementType,
    })
    return response.data.result
  }

  async generateExecutiveSummary(proposalId: string): Promise<AIGenerationResult> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/summarize`)
    return response.data.result
  }

  async getSuggestions(proposalId: string): Promise<AISuggestion[]> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/suggestions`)
    return response.data.suggestions
  }

  async updateFormData(
    proposalId: string,
    formData: {
      uploadedFiles?: Record<string, File[]>
      textInputs?: Record<string, string>
    }
  ): Promise<Proposal> {
    // Convert File objects to file paths/names for storage
    const uploadedFiles: Record<string, string[]> = {}
    if (formData.uploadedFiles) {
      for (const [key, files] of Object.entries(formData.uploadedFiles)) {
        uploadedFiles[key] = files.map(file => file.name)
      }
    }

    return this.updateProposal(proposalId, {
      uploaded_files: uploadedFiles,
      text_inputs: formData.textInputs,
    })
  }

  async analyzeRFP(proposalId: string): Promise<{
    success: boolean
    rfp_analysis: any
    message?: string
    cached?: boolean
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-rfp`)
    return response.data
  }
}

export const proposalService = new ProposalService()
