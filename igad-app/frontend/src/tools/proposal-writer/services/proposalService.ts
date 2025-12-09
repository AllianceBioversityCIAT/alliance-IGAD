import { apiClient } from '@/shared/services/apiClient'

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
  documents?: {
    rfp_documents: string[]
    concept_documents: string[]
    reference_documents: string[]
    supporting_documents: string[]
  }
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
    // Backend returns proposal directly, not wrapped in { proposal: ... }
    return response.data
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
        uploadedFiles[key] = files.map(file => (typeof file === 'string' ? file : file.name))
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

  /**
   * Step 1 Combined Analysis: RFP + Reference Proposals in parallel
   * Triggers both RFP and Reference Proposals analysis simultaneously
   */
  async analyzeStep1(proposalId: string): Promise<{
    status: string
    message?: string
    analyses: Array<{
      type: string
      status: string
      started?: boolean
      cached?: boolean
      already_running?: boolean
    }>
    started_at: string
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-step-1`)
    return response.data
  }

  /**
   * Get Step 1 analysis status (RFP ONLY)
   * Returns overall status and RFP analysis status
   */
  async getStep1Status(proposalId: string): Promise<{
    overall_status: 'not_started' | 'processing' | 'completed' | 'failed'
    rfp_analysis: {
      status: string
      data?: any
      error?: string
      started_at?: string
      completed_at?: string
    }
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/step-1-status`)
    return response.data
  }

  /**
   * Start Step 2 analysis (Reference Proposals + Existing Work)
   * Requires Step 1 (RFP) to be completed with semantic_query
   */
  async analyzeStep2(proposalId: string): Promise<{
    status: string
    message?: string
    analyses: Array<{
      type: string
      status: string
      started?: boolean
      cached?: boolean
      already_running?: boolean
    }>
    started_at: string
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-step-2`)
    return response.data
  }

  /**
   * Get combined status of Step 2 analyses (Reference Proposals + Existing Work)
   * Returns overall status and individual status for each analysis
   */
  async getStep2Status(proposalId: string): Promise<{
    overall_status: 'not_started' | 'processing' | 'completed' | 'failed'
    reference_proposals_analysis: {
      status: string
      data?: any
      error?: string
      started_at?: string
      completed_at?: string
    }
    existing_work_analysis: {
      status: string
      data?: any
      error?: string
      started_at?: string
      completed_at?: string
    }
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/step-2-status`)
    return response.data
  }

  async deleteDocument(
    proposalId: string,
    filename: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(`/api/proposals/${proposalId}/documents/${filename}`)
    return response.data
  }

  // Concept file operations
  async uploadConceptFile(
    proposalId: string,
    file: File
  ): Promise<{
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
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  // Concept text operations
  async saveConceptText(
    proposalId: string,
    text: string
  ): Promise<{
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
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  async deleteConceptText(proposalId: string): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(`/api/proposals/${proposalId}/documents/concept-text`)
    return response.data
  }

  async deleteConceptFile(
    proposalId: string,
    filename: string
  ): Promise<{
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

  async getUploadedDocuments(proposalId: string): Promise<{
    rfp_documents: string[]
    concept_documents: string[]
    reference_documents: string[]
    supporting_documents: string[]
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/documents`)
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
    const response = await apiClient.get(`/api/proposals/${proposalId}/concept-document-status`)
    return response.data
  }

  async updateConceptEvaluation(
    proposalId: string,
    conceptEvaluation: any
  ): Promise<{
    status: string
    message: string
    concept_evaluation: any
  }> {
    const response = await apiClient.put(
      `/api/proposals/${proposalId}/concept-evaluation`,
      conceptEvaluation
    )
    return response.data
  }

  async getConceptEvaluation(proposalId: string): Promise<{
    concept_evaluation: any
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/concept-evaluation`)
    return response.data
  }

  // Reference proposals file operations
  async uploadReferenceFile(
    proposalId: string,
    file: File
  ): Promise<{
    success: boolean
    filename: string
    document_key: string
    size: number
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(
      `/api/proposals/${proposalId}/documents/upload-reference-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for file upload + vectorization
      }
    )
    return response.data
  }

  async deleteReferenceFile(
    proposalId: string,
    filename: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(
      `/api/proposals/${proposalId}/documents/reference/${filename}`
    )
    return response.data
  }

  // Supporting documents file operations (Existing Work and Experience)
  async uploadSupportingFile(
    proposalId: string,
    file: File,
    metadata?: {
      organization?: string
      project_type?: string
      region?: string
    }
  ): Promise<{
    success: boolean
    filename: string
    document_key: string
    size: number
    chunks_created?: number
    chunks_vectorized?: number
    metadata?: {
      organization: string
      project_type: string
      region: string
    }
  }> {
    const formData = new FormData()
    formData.append('file', file)

    // Add metadata fields if provided
    if (metadata?.organization) {
      formData.append('organization', metadata.organization)
    }
    if (metadata?.project_type) {
      formData.append('project_type', metadata.project_type)
    }
    if (metadata?.region) {
      formData.append('region', metadata.region)
    }

    const response = await apiClient.post(
      `/api/proposals/${proposalId}/documents/upload-supporting-file`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for file upload + vectorization
      }
    )
    return response.data
  }

  async deleteSupportingFile(
    proposalId: string,
    filename: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(
      `/api/proposals/${proposalId}/documents/supporting/${filename}`
    )
    return response.data
  }

  // Existing work text operations
  async saveWorkText(
    proposalId: string,
    text: string
  ): Promise<{
    success: boolean
    message: string
    text_length: number
  }> {
    const formData = new FormData()
    formData.append('work_text', text)

    const response = await apiClient.post(
      `/api/proposals/${proposalId}/documents/save-work-text`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  async deleteWorkText(proposalId: string): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(`/api/proposals/${proposalId}/documents/work-text`)
    return response.data
  }
}

export const proposalService = new ProposalService()
