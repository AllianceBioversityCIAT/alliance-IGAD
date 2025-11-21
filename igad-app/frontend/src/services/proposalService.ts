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
      uploadedFiles?: Record<string, File[] | string[]>
      textInputs?: Record<string, string>
    }
  ): Promise<Proposal> {
    // Convert File objects to file paths/names for storage
    const uploadedFiles: Record<string, string[]> = {}
    if (formData.uploadedFiles) {
      for (const [key, files] of Object.entries(formData.uploadedFiles)) {
        uploadedFiles[key] = files.map(file => 
          typeof file === 'string' ? file : file.name
        )
      }
    }

    return this.updateProposal(proposalId, {
      uploaded_files: uploadedFiles,
      text_inputs: formData.textInputs,
    })
  }

  async analyzeRFP(proposalId: string): Promise<{
    status: string
    rfp_analysis?: any
    message?: string
    cached?: boolean
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-rfp`)
    return response.data
  }

  async getAnalysisStatus(proposalId: string): Promise<{
    status: string
    rfp_analysis?: any
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/analysis-status`)
    return response.data
  }

  async deleteDocument(proposalId: string, filename: string): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(`/api/proposals/${proposalId}/documents/${filename}`)
    return response.data
  }

  // Concept file operations
  async uploadConceptFile(proposalId: string, file: File): Promise<{
    success: boolean
    filename: string
    document_key: string
    size: number
  }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/documents/upload-concept-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data
  }

  // Concept text operations
  async saveConceptText(proposalId: string, text: string): Promise<{
    success: boolean
    message: string
    text_length: number
  }> {
    const formData = new FormData()
    formData.append('concept_text', text)
    
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/documents/save-concept-text`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data
  }

  async deleteConceptText(proposalId: string): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(
      `/api/proposals/${proposalId}/documents/concept-text`
    )
    return response.data
  }

  async deleteConceptFile(proposalId: string, filename: string): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(
      `/api/proposals/${proposalId}/documents/concept/${filename}`
    )
    return response.data
  }

  // Concept analysis operations
  async analyzeConcept(proposalId: string): Promise<{
    status: string
    concept_analysis?: any
    message?: string
    cached?: boolean
    started_at?: string
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-concept`)
    return response.data
  }

  async getConceptStatus(proposalId: string): Promise<{
    status: string
    concept_analysis?: any
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/concept-status`)
    return response.data
  }

  async generateConceptDocument(
    proposalId: string,
    conceptEvaluation: any
  ): Promise<{
    status: string
    message: string
    concept_document?: any
  }> {
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/generate-concept-document`,
      conceptEvaluation
    )
    return response.data
  }

  async getConceptDocumentStatus(proposalId: string): Promise<{
    status: string
    concept_document?: any
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(
      `/api/proposals/${proposalId}/concept-document-status`
    )
    return response.data
  }
}

export const proposalService = new ProposalService()
