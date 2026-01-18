import { apiClient } from '@/shared/services/apiClient'
import type {
  RFPAnalysis,
  ConceptAnalysis,
  StructureWorkplanAnalysis,
  DraftFeedbackAnalysis,
  ConceptDocument,
} from '../types/analysis'

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
  metadata: Record<string, unknown>
  uploaded_files: Record<string, string[]>
  text_inputs: Record<string, string>
  documents?: {
    rfp_documents: string[]
    concept_documents: string[]
    reference_documents: string[]
    supporting_documents: string[]
  }
  ai_context?: Record<string, unknown>
  created_at: string
  updated_at: string
  version?: number
  // Step completion tracking fields (from DynamoDB)
  concept_document_v2?: ConceptDocument // Generated concept document from Step 2
  proposal_template_generated?: string // ISO timestamp when template was generated in Step 3
  structure_workplan_completed_at?: string // ISO timestamp when structure workplan analysis was completed
  structure_workplan_analysis?: StructureWorkplanAnalysis // Structure workplan analysis data from Step 3
  draft_feedback_analysis?: DraftFeedbackAnalysis // Draft feedback analysis data from Step 4
  draft_is_ai_generated?: boolean // Flag indicating if draft was AI-generated (Step 3 → Step 4)
  draft_source?: 'uploaded' | 'ai_generated' // Source of the draft
}

export interface ProposalSection {
  id: string
  title: string
  content: string
  ai_generated: boolean
  order: number
  metadata: Record<string, unknown>
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

// Types for processing status check (page refresh resumption)
export interface OperationStatus {
  status: 'not_started' | 'processing' | 'completed' | 'failed'
  data?: unknown
  error?: string
}

export interface AllProcessingStatus {
  step1_rfp: OperationStatus
  step1_reference: OperationStatus
  step1_concept: OperationStatus
  step2_concept_document: OperationStatus
  step3_structure: OperationStatus
  step3_ai_template: OperationStatus
  step4_draft_feedback: OperationStatus
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
    contextData?: Record<string, unknown>
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

    // Build update payload
    const updates: Partial<Proposal> = {
      uploaded_files: uploadedFiles,
      text_inputs: formData.textInputs,
    }

    // Sync proposal-title from text_inputs to title field
    // This ensures the Dashboard shows the correct user-entered title
    if (formData.textInputs?.['proposal-title']) {
      updates.title = formData.textInputs['proposal-title']
    }

    return this.updateProposal(proposalId, updates)
  }

  async analyzeRFP(proposalId: string): Promise<{
    status: string
    rfp_analysis?: RFPAnalysis
    message?: string
    cached?: boolean
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-rfp`)
    return response.data
  }

  async getAnalysisStatus(proposalId: string): Promise<{
    status: string
    rfp_analysis?: RFPAnalysis
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
      data?: unknown
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
      data?: unknown
      error?: string
      started_at?: string
      completed_at?: string
    }
    existing_work_analysis: {
      status: string
      data?: unknown
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
  async analyzeConcept(
    proposalId: string,
    options?: { force?: boolean }
  ): Promise<{
    status: string
    concept_analysis?: ConceptAnalysis
    message?: string
    cached?: boolean
    started_at?: string
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-concept`, {
      force: options?.force ?? false,
    })
    return response.data
  }

  async getConceptStatus(proposalId: string): Promise<{
    status: string
    concept_analysis?: ConceptAnalysis
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    // Add timestamp to prevent caching
    const response = await apiClient.get(
      `/api/proposals/${proposalId}/concept-status?_t=${Date.now()}`
    )
    return response.data
  }

  // ==================== Structure and Workplan (Step 3) ====================

  /**
   * Start Structure Workplan analysis (Step 3)
   *
   * Generates a tailored proposal structure and workplan based on RFP analysis
   * and concept evaluation. Uses AI to create sections, guidance, and questions.
   *
   * Prerequisites:
   * - Step 1 (RFP Analysis) must be completed
   * - Step 2 (Concept Evaluation) must be completed
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @returns Analysis status and metadata
   * @throws Error if prerequisites not met or analysis fails to start
   *
   * @example
   * ```typescript
   * const result = await proposalService.analyzeStep3('abc-123')
   * if (result.status === 'processing') {
   *   // Poll for completion using getStructureWorkplanStatus()
   * }
   * ```
   */
  async analyzeStep3(proposalId: string): Promise<{
    status: string
    message: string
    data?: unknown
    started_at?: string
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-step-3`)
    return response.data
  }

  /**
   * Poll Structure Workplan analysis status
   *
   * Check the completion status of an ongoing Structure Workplan analysis.
   * Call this repeatedly (with polling) until status is 'completed' or 'failed'.
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @returns Current analysis status, data (if completed), or error (if failed)
   * @throws Error if unable to check status
   *
   * @example
   * ```typescript
   * const status = await proposalService.getStructureWorkplanStatus('abc-123')
   * if (status.status === 'completed') {
   *   const structure = status.data.structure_workplan_analysis
   *   // Use structure data...
   * }
   * ```
   */
  async getStructureWorkplanStatus(proposalId: string): Promise<{
    status: string
    data?: unknown
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/structure-workplan-status`)
    return response.data
  }

  /**
   * Generate Word template from structure workplan
   *
   * Creates a Microsoft Word document (.docx) containing the proposal structure
   * with sections, guidance, questions, and space for content entry.
   *
   * Prerequisites:
   * - Step 3 (Structure Workplan) must be completed
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @param selectedSections - Optional array of section titles to include
   * @param userComments - Optional object mapping section titles to user comments
   * @returns Blob containing the Word document
   * @throws Error if structure workplan not completed or generation fails
   *
   * @example
   * ```typescript
   * const blob = await proposalService.generateProposalTemplate(
   *   'abc-123',
   *   ['Introduction', 'Methodology'],
   *   { 'Introduction': 'Focus on innovation aspect' }
   * )
   * const url = window.URL.createObjectURL(blob)
   * const a = document.createElement('a')
   * a.href = url
   * a.download = 'proposal-template.docx'
   * a.click()
   * ```
   */
  async generateProposalTemplate(
    proposalId: string,
    selectedSections?: string[],
    userComments?: Record<string, string>
  ): Promise<Blob> {
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/generate-proposal-template`,
      {
        selected_sections: selectedSections || null,
        user_comments: userComments || null,
      },
      { responseType: 'blob' }
    )
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
    conceptEvaluation: { selectedSections: string[]; userComments?: Record<string, string> }
  ): Promise<{
    status: string
    message: string
    concept_document?: ConceptDocument
  }> {
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/generate-concept-document`,
      conceptEvaluation
    )
    return response.data
  }

  async getConceptDocumentStatus(proposalId: string): Promise<{
    status: string
    concept_document?: ConceptDocument
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/concept-document-status`)
    return response.data
  }

  async updateConceptEvaluation(
    proposalId: string,
    conceptEvaluation: { selectedSections: string[]; userComments?: Record<string, string> }
  ): Promise<{
    status: string
    message: string
    concept_evaluation: { selectedSections: string[]; userComments?: Record<string, string> }
  }> {
    const response = await apiClient.put(
      `/api/proposals/${proposalId}/concept-evaluation`,
      conceptEvaluation
    )
    return response.data
  }

  async getConceptEvaluation(proposalId: string): Promise<{
    concept_evaluation: { selectedSections: string[]; userComments?: Record<string, string> }
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
        timeout: 300000, // 5 minutes for large file upload + vectorization
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
        timeout: 300000, // 5 minutes for large file upload + vectorization
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

  // ==================== Draft Proposal Feedback (Step 4) ====================

  /**
   * Upload draft proposal document to S3
   *
   * Uploads the user's draft proposal for feedback analysis in Step 4.
   * Only one draft can be uploaded per proposal.
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @param file - The draft proposal file (PDF, DOC, DOCX)
   * @returns Upload result with filename and S3 key
   * @throws Error if upload fails
   *
   * @example
   * ```typescript
   * const result = await proposalService.uploadDraftProposal('abc-123', draftFile)
   * // Then start analysis
   * await proposalService.analyzeDraftFeedback('abc-123')
   * ```
   */
  async uploadDraftProposal(
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
      `/api/proposals/${proposalId}/upload-draft-proposal`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for large file upload
      }
    )
    return response.data
  }

  /**
   * Delete draft proposal document from S3
   *
   * Removes the uploaded draft proposal document.
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @param filename - Name of the file to delete
   * @returns Delete result
   * @throws Error if delete fails
   */
  async deleteDraftProposal(
    proposalId: string,
    filename: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    const response = await apiClient.delete(
      `/api/proposals/${proposalId}/documents/draft-proposal/${encodeURIComponent(filename)}`
    )
    return response.data
  }

  /**
   * Start Draft Feedback analysis (Step 4)
   *
   * Triggers AI analysis of the uploaded draft proposal against RFP requirements.
   * Returns section-by-section feedback with status ratings and improvement suggestions.
   *
   * Prerequisites:
   * - Step 1 (RFP Analysis) must be completed
   * - Draft proposal must be uploaded
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @returns Analysis status (processing, already_running, or error)
   * @throws Error if prerequisites not met or analysis fails to start
   *
   * @example
   * ```typescript
   * const result = await proposalService.analyzeDraftFeedback('abc-123')
   * if (result.status === 'processing') {
   *   // Poll for completion using getDraftFeedbackStatus()
   * }
   *
   * // Force re-analysis (bypass cache)
   * const freshResult = await proposalService.analyzeDraftFeedback('abc-123', true)
   * ```
   */
  async analyzeDraftFeedback(
    proposalId: string,
    force: boolean = false
  ): Promise<{
    status: string
    message: string
    started_at?: string
  }> {
    const response = await apiClient.post(`/api/proposals/${proposalId}/analyze-draft-feedback`, {
      force: force,
    })
    return response.data
  }

  /**
   * Poll Draft Feedback analysis status
   *
   * Check the completion status of an ongoing Draft Feedback analysis.
   * Call this repeatedly (with polling) until status is 'completed' or 'failed'.
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @returns Current analysis status, data (if completed), or error (if failed)
   * @throws Error if unable to check status
   *
   * @example
   * ```typescript
   * const status = await proposalService.getDraftFeedbackStatus('abc-123')
   * if (status.status === 'completed') {
   *   const sections = status.data.section_feedback
   *   const overall = status.data.overall_assessment
   *   // Display section-by-section feedback
   * }
   * ```
   */
  async getDraftFeedbackStatus(proposalId: string): Promise<{
    status: string
    data?: {
      overall_assessment?: {
        overall_tag?: string
        overall_summary?: string
        key_strengths?: string[]
        key_issues?: string[]
        global_suggestions?: string[]
      }
      section_feedback?: Array<{
        section_title: string
        tag: string
        ai_feedback: string
        suggestions: string[]
      }>
      summary_stats?: {
        excellent_count: number
        good_count: number
        needs_improvement_count: number
      }
      // Legacy nested structure support
      draft_feedback_analysis?: DraftFeedbackAnalysis
    }
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/draft-feedback-status`)
    return response.data
  }

  // ==================== Proposal Document Generation (Step 4) ====================

  /**
   * Start proposal document generation (Step 4 - Download with AI feedback)
   *
   * Generates a refined proposal document based on:
   * - AI-generated section feedback from draft analysis
   * - User comments and guidance per section
   * - Selected sections to refine
   *
   * Prerequisites:
   * - RFP analysis must be completed (Step 1)
   * - Draft feedback analysis must be completed (Step 4)
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @param selectedSections - Array of section titles to include in refinement
   * @param userComments - Optional dict of user comments per section
   * @returns Status response (processing or error)
   * @throws Error if prerequisites not met or generation fails to start
   *
   * @example
   * ```typescript
   * const result = await proposalService.generateProposalDocument(
   *   'abc-123',
   *   ['Executive Summary', 'Methodology'],
   *   { 'Executive Summary': 'Focus on climate resilience' }
   * )
   * if (result.status === 'processing') {
   *   // Poll for completion using getProposalDocumentStatus()
   * }
   * ```
   */
  async generateProposalDocument(
    proposalId: string,
    selectedSections: string[],
    userComments?: Record<string, string>
  ): Promise<{
    status: string
    message: string
    started_at?: string
  }> {
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/generate-proposal-document`,
      {
        selected_sections: selectedSections,
        user_comments: userComments || null,
      }
    )
    return response.data
  }

  /**
   * Poll proposal document generation status
   *
   * Check the completion status of an ongoing proposal document generation.
   * Call this repeatedly (with polling) until status is 'completed' or 'failed'.
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @returns Current status, data (if completed), or error (if failed)
   * @throws Error if unable to check status
   *
   * @example
   * ```typescript
   * const status = await proposalService.getProposalDocumentStatus('abc-123')
   * if (status.status === 'completed') {
   *   const refinedProposal = status.data?.generated_proposal
   *   // Generate DOCX and trigger download
   * }
   * ```
   */
  async getProposalDocumentStatus(proposalId: string): Promise<{
    status: string
    data?: {
      generated_proposal: string
      sections: Record<string, string>
      metadata: {
        proposal_code: string
        sections_refined: number
        generation_time_seconds: number
        generated_at: string
      }
    }
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(
      `/api/proposals/${proposalId}/proposal-document-status`
    )
    return response.data
  }

  // Vectorization status operations
  async getVectorizationStatus(proposalId: string): Promise<{
    success: boolean
    vectorization_status: {
      [filename: string]: {
        status: 'pending' | 'processing' | 'completed' | 'failed'
        chunks_processed: number
        total_chunks: number
        error?: string
        started_at?: string
        completed_at?: string
      }
    }
    all_completed: boolean
    has_pending: boolean
    has_failed: boolean
  }> {
    const response = await apiClient.get(
      `/api/proposals/${proposalId}/documents/vectorization-status`
    )
    return response.data
  }

  async getFileVectorizationStatus(
    proposalId: string,
    filename: string
  ): Promise<{
    success: boolean
    filename: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'unknown'
    chunks_processed?: number
    total_chunks?: number
    error?: string
  }> {
    const response = await apiClient.get(
      `/api/proposals/${proposalId}/documents/vectorization-status/${encodeURIComponent(filename)}`
    )
    return response.data
  }

  /**
   * Update proposal status
   *
   * Changes proposal status (e.g., from "draft" to "completed")
   * Used when user completes Step 4 and clicks "Finish Process"
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @param status - New status ('draft' | 'completed' | 'in_progress' | 'review' | 'archived')
   * @returns Updated proposal data
   * @throws Error if update fails
   *
   * @example
   * ```typescript
   * await proposalService.updateProposalStatus('abc-123', 'completed')
   * ```
   */
  async updateProposalStatus(
    proposalId: string,
    status: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived'
  ): Promise<Proposal> {
    const response = await apiClient.put(`/api/proposals/${proposalId}`, {
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : undefined,
    })
    return response.data.proposal || response.data
  }

  // ==================== AI Proposal Template Generation (Step 3) ====================

  /**
   * Start AI proposal template generation
   *
   * Triggers AI to generate a full draft proposal based on:
   * - Selected sections from structure workplan
   * - Concept document
   * - RFP analysis
   * - Reference proposals analysis (if available)
   * - Existing work analysis (if available)
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @param selectedSections - Array of section titles to include
   * @param userComments - Optional user comments per section
   * @returns Status response
   * @throws Error if prerequisites not met
   */
  async generateAiProposalTemplate(
    proposalId: string,
    selectedSections: string[],
    userComments?: Record<string, string>
  ): Promise<{
    status: string
    message: string
  }> {
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/generate-ai-proposal-template`,
      {
        selected_sections: selectedSections,
        user_comments: userComments || null,
      }
    )
    return response.data
  }

  /**
   * Get AI proposal template generation status
   *
   * Poll this endpoint to check if AI generation has completed.
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @returns Status and generated content when completed
   */
  async getProposalTemplateStatus(proposalId: string): Promise<{
    status: string
    data?: {
      generated_proposal: string
      sections: Record<string, string>
      metadata: {
        proposal_code: string
        generated_at: string
        generation_time_seconds: number
        sections_count: number
        selected_sections: string[]
      }
      s3_url?: string
    }
    error?: string
    started_at?: string
    completed_at?: string
  }> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/proposal-template-status`)
    return response.data
  }

  /**
   * Copy the AI-generated proposal template to the draft proposal location.
   * This makes it available for Step 4's draft feedback analysis.
   */
  async useGeneratedTemplateAsDraft(proposalId: string): Promise<{
    success: boolean
    filename: string
    message: string
    s3_key?: string
  }> {
    const response = await apiClient.post(
      `/api/proposals/${proposalId}/use-generated-template-as-draft`
    )
    return response.data
  }

  /**
   * Download the draft proposal file from S3.
   * Triggers browser download of the file.
   */
  async downloadDraft(proposalId: string): Promise<void> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/download-draft`, {
      responseType: 'blob',
    })

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition']
    let filename = `draft_proposal_${proposalId}.docx`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Create download link and trigger download
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  /**
   * Download the AI-generated proposal template as a DOCX file.
   * Triggers browser download of the professionally formatted document.
   */
  async downloadTemplateAsDocx(proposalId: string): Promise<void> {
    const response = await apiClient.get(`/api/proposals/${proposalId}/download-template-docx`, {
      responseType: 'blob',
    })

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers['content-disposition']
    let filename = `ai_proposal_draft_${proposalId}.docx`
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch) {
        filename = filenameMatch[1]
      }
    }

    // Create download link and trigger download
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // ==================== Processing Status Check (for page refresh resumption) ====================

  /**
   * Get all processing status in parallel
   *
   * Checks the status of all analysis operations to detect any in-progress
   * processes when the page is refreshed. Used to resume polling for
   * operations that were interrupted by page refresh.
   *
   * @param proposalId - Proposal UUID or code (PROP-YYYYMMDD-XXXX)
   * @returns Status of all analysis operations
   *
   * @example
   * ```typescript
   * const status = await proposalService.getAllProcessingStatus('abc-123')
   * if (status.step1_rfp.status === 'processing') {
   *   // Resume polling for RFP analysis
   * }
   * ```
   */
  async getAllProcessingStatus(proposalId: string): Promise<AllProcessingStatus> {
    // Fetch all status endpoints in parallel for performance
    const [
      step1Status,
      step2Status,
      conceptStatus,
      conceptDocStatus,
      structureStatus,
      templateStatus,
      draftFeedbackStatus,
    ] = await Promise.all([
      this.getStep1Status(proposalId).catch(() => null),
      this.getStep2Status(proposalId).catch(() => null),
      this.getConceptStatus(proposalId).catch(() => null),
      this.getConceptDocumentStatus(proposalId).catch(() => null),
      this.getStructureWorkplanStatus(proposalId).catch(() => null),
      this.getProposalTemplateStatus(proposalId).catch(() => null),
      this.getDraftFeedbackStatus(proposalId).catch(() => null),
    ])

    const defaultStatus: OperationStatus = { status: 'not_started' }

    return {
      step1_rfp: step1Status?.rfp_analysis
        ? {
            status: step1Status.rfp_analysis.status as OperationStatus['status'],
            data: step1Status.rfp_analysis.data,
            error: step1Status.rfp_analysis.error,
          }
        : defaultStatus,

      step1_reference: step2Status?.reference_proposals_analysis
        ? {
            status: step2Status.reference_proposals_analysis.status as OperationStatus['status'],
            data: step2Status.reference_proposals_analysis.data,
            error: step2Status.reference_proposals_analysis.error,
          }
        : defaultStatus,

      step1_concept: conceptStatus
        ? {
            status: conceptStatus.status as OperationStatus['status'],
            data: conceptStatus.concept_analysis,
            error: conceptStatus.error,
          }
        : defaultStatus,

      step2_concept_document: conceptDocStatus
        ? {
            status: conceptDocStatus.status as OperationStatus['status'],
            data: conceptDocStatus.concept_document,
            error: conceptDocStatus.error,
          }
        : defaultStatus,

      step3_structure: structureStatus
        ? {
            status: structureStatus.status as OperationStatus['status'],
            data: structureStatus.data,
            error: structureStatus.error,
          }
        : defaultStatus,

      step3_ai_template: templateStatus
        ? {
            status: templateStatus.status as OperationStatus['status'],
            data: templateStatus.data,
            error: templateStatus.error,
          }
        : defaultStatus,

      step4_draft_feedback: draftFeedbackStatus
        ? {
            status: draftFeedbackStatus.status as OperationStatus['status'],
            data: draftFeedbackStatus.data,
            error: draftFeedbackStatus.error,
          }
        : defaultStatus,
    }
  }
}

export const proposalService = new ProposalService()
