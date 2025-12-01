// ============================================================================
// IMPORTS
// ============================================================================
import { useEffect, useState } from 'react'
import { FileText, AlertTriangle, Files, Briefcase, Lightbulb } from 'lucide-react'
import { useProposal } from '@/tools/proposal-writer/hooks/useProposal'
import { StepProps } from './stepConfig'
import styles from './Step1InformationConsolidation.module.css'
import { apiClient } from '@/shared/services/apiClient'
import ManualRFPInput from '@/tools/proposal-writer/components/ManualRFPInput'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum file size in bytes (10 MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Allowed file types for concept document */
const ALLOWED_CONCEPT_TYPES = ['.pdf', '.docx', '.txt']

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for Step 1: Information Consolidation component
 * Extends base StepProps with proposal-specific data
 */
interface Step1Props extends StepProps {
  /** Unique identifier for the proposal */
  proposalId?: string
  /** RFP analysis data from AI processing */
  rfpAnalysis?: Record<string, unknown>
  /** Concept analysis data from AI processing */
  conceptAnalysis?: Record<string, unknown>
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

/**
 * Loading skeleton displayed while data is being fetched
 * Provides visual feedback during initial load
 */
function Step1Skeleton() {
  return (
    <div className={styles.stepContent}>
      <div className={styles.skeletonCard}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonButton}`}></div>
      </div>

      <div className={styles.skeletonCard}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonInput}`}></div>
      </div>

      <div className={styles.skeletonCard}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Step 1: Information Consolidation
 *
 * Handles collection of all necessary proposal inputs:
 * - RFP documents (required)
 * - Initial concept text or document (required)
 * - Reference proposals (coming soon)
 * - Supporting documents (coming soon)
 *
 * Features:
 * - File upload with S3 storage
 * - Real-time text input with auto-save
 * - Progress tracking
 * - Document management (delete/replace)
 */
export function Step1InformationConsolidation({
  formData,
  setFormData,
  proposalId,
  rfpAnalysis,
  conceptAnalysis,
}: Step1Props) {
  // ============================================================================
  // STATE - Hooks
  // ============================================================================

  const { proposal, updateFormData, isUpdating, isLoading } = useProposal(proposalId)

  // ============================================================================
  // STATE - Data Loading
  // ============================================================================

  /** Internal loading state to track actual data loading in component */
  const [isLoadingData, setIsLoadingData] = useState(true)

  // ============================================================================
  // STATE - RFP Upload
  // ============================================================================

  /** Loading state for RFP document upload */
  const [isUploadingRFP, setIsUploadingRFP] = useState(false)
  /** Error message for RFP upload failures */
  const [uploadError, setUploadError] = useState<string>('')
  /** Toggle for manual RFP text input modal */
  const [showManualInput, setShowManualInput] = useState(false)

  // ============================================================================
  // STATE - Drag and Drop
  // ============================================================================

  /** Track if files are being dragged over upload area */
  const [isDraggingRFP, setIsDraggingRFP] = useState(false)
  const [isDraggingConcept, setIsDraggingConcept] = useState(false)

  // ============================================================================
  // STATE - Concept Document
  // ============================================================================

  /** Loading state for concept file upload */
  const [isUploadingConcept, setIsUploadingConcept] = useState(false)
  /** Loading state for concept text save operation */
  const [isSavingConceptText, setIsSavingConceptText] = useState(false)
  /** Whether concept text has been saved to backend */
  const [conceptTextSaved, setConceptTextSaved] = useState(false)
  /** Whether user is currently editing concept text */
  const [isEditingConceptText, setIsEditingConceptText] = useState(false)
  /** Error message for concept-related operations */
  const [conceptUploadError, setConceptUploadError] = useState('')

  // ============================================================================
  // EFFECTS - Data Loading
  // ============================================================================

  /**
   * Load proposal data on component mount
   * Priority: Backend documents > localStorage text inputs > proposal defaults
   *
   * This ensures we always have the most up-to-date file list from S3
   * while preserving any unsaved text inputs from localStorage
   *
   * NOTE: Only depends on proposalId to prevent re-runs when proposal object changes
   * (which happens frequently during data fetching)
   */
  useEffect(() => {
    if (!proposalId) {
      setIsLoadingData(false)
      return
    }

    const loadProposalData = async () => {
      setIsLoadingData(true)

      try {
        // Check both localStorage keys:
        // 1. draft_form_data - used by ProposalWriterPage (contains title + other text inputs)
        // 2. proposal_draft_${proposalId} - used by Step1 (contains uploaded files)
        const draftFormDataStr = localStorage.getItem('draft_form_data')
        const step1StorageKey = `proposal_draft_${proposalId}`
        const step1SavedData = localStorage.getItem(step1StorageKey)

        try {
          // Load uploaded documents from backend (source of truth)
          const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
          const documents = await proposalService.getUploadedDocuments(proposalId)

          // Build initial textInputs from localStorage or proposal
          let initialTextInputs: { [key: string]: string } = {}

          // Priority: draft_form_data > step1 localStorage > proposal text_inputs
          if (draftFormDataStr) {
            try {
              const parsed = JSON.parse(draftFormDataStr)
              initialTextInputs = parsed.textInputs || {}
            } catch {
              // Silent fail - try next priority
            }
          } else if (step1SavedData) {
            try {
              const parsed = JSON.parse(step1SavedData)
              initialTextInputs = parsed.textInputs || {}
            } catch {
              // Silent fail - try next priority
            }
          }

          // If no localStorage data, use proposal text_inputs as fallback
          console.log('📋 Step1 - proposal available:', !!proposal)
          console.log('📋 Step1 - proposal.text_inputs:', proposal?.text_inputs)
          console.log('📋 Step1 - initialTextInputs before proposal:', initialTextInputs)
          if (Object.keys(initialTextInputs).length === 0 && proposal?.text_inputs) {
            console.log('✅ Step1 - Using proposal.text_inputs as fallback')
            initialTextInputs = { ...proposal.text_inputs }
          }
          console.log('📋 Step1 - Final initialTextInputs:', initialTextInputs)

          // Build formData from backend documents
          const backendFormData = {
            uploadedFiles: {
              'rfp-document': documents.rfp_documents || [],
              'concept-document': documents.concept_documents || [],
              'reference-proposals': documents.reference_documents || [],
              'supporting-docs': documents.supporting_documents || [],
            },
            textInputs: initialTextInputs,
          }

          setFormData(backendFormData)
        } catch {
          // Fallback to localStorage on error
          if (draftFormDataStr) {
            try {
              const parsed = JSON.parse(draftFormDataStr)
              setFormData(parsed)
              return
            } catch {
              // Silent fail - use empty state
            }
          }

          if (step1SavedData) {
            try {
              const parsed = JSON.parse(step1SavedData)
              setFormData(parsed)
              return
            } catch {
              // Silent fail - use empty state
            }
          }
        }
      } finally {
        setIsLoadingData(false)
      }
    }

    loadProposalData()
  }, [proposalId, setFormData])

  /**
   * Fill in missing text inputs from proposal when it loads
   * This handles the case where proposal loads after the initial effect
   */
  useEffect(() => {
    if (!proposalId || !proposal?.text_inputs) {
      return
    }

    console.log('📋 Step1 - Proposal loaded, checking if text_inputs need updating')
    console.log('📋 Step1 - Current formData.textInputs:', formData.textInputs)
    console.log('📋 Step1 - Proposal text_inputs:', proposal.text_inputs)

    // Only update if formData doesn't have a title but proposal does
    if (!formData.textInputs['proposal-title'] && proposal.text_inputs['proposal-title']) {
      console.log('✅ Step1 - Updating formData with proposal.text_inputs')
      setFormData(prev => ({
        ...prev,
        textInputs: {
          ...prev.textInputs,
          ...proposal.text_inputs,
        },
      }))
    }
  }, [proposal?.text_inputs, proposalId, formData.textInputs])

  /**
   * Auto-save formData to localStorage on changes
   * Provides draft persistence across page refreshes
   */
  useEffect(() => {
    if (proposalId && (formData.uploadedFiles || formData.textInputs)) {
      const storageKey = `proposal_draft_${proposalId}`
      localStorage.setItem(storageKey, JSON.stringify(formData))
    }
  }, [formData, proposalId])

  // ============================================================================
  // HANDLERS - RFP Document
  // ============================================================================

  /**
   * Handle file upload for RFP document
   * Uploads to S3 and triggers vectorization for AI analysis
   *
   * @param section - Document section identifier
   * @param files - FileList from input element
   */
  const handleFileUpload = async (section: string, files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    const file = files[0]

    // Validate file size
    const sizeError = validateFileSize(file)
    if (sizeError) {
      setUploadError(sizeError)
      return
    }

    // RFP documents require special processing (S3 + vectorization)
    if (proposalId && section === 'rfp-document') {
      setIsUploadingRFP(true)
      setUploadError('')

      try {
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)

        // Upload and process document
        await apiClient.post(`/api/proposals/${proposalId}/documents/upload`, uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })

        // Update local state after successful upload
        const updatedFiles = {
          ...formData.uploadedFiles,
          [section]: [file.name],
        }

        setFormData((prev: any) => ({
          ...prev,
          uploadedFiles: updatedFiles,
        }))

        // Persist to backend
        await updateFormData({
          uploadedFiles: updatedFiles,
          textInputs: formData.textInputs,
        })

        // Invalidate analyses when documents are updated
        // This ensures the user re-analyzes with the new document
        console.log('🔄 [Document Updated] Dispatching documents-updated event for RFP')
        window.dispatchEvent(new CustomEvent('documents-updated'))
      } catch (error: unknown) {
        const errorMsg =
          (error as Record<string, unknown>)?.response?.data?.detail ||
          (error as Error)?.message ||
          'Upload failed. Please try again.'
        setUploadError(String(errorMsg))
      } finally {
        setIsUploadingRFP(false)
      }
    } else {
      // Other sections: simple metadata update (no S3 upload yet)
      const updatedFiles = {
        ...formData.uploadedFiles,
        [section]: [file.name],
      }

      setFormData(prev => ({
        ...prev,
        uploadedFiles: updatedFiles,
      }))

      if (proposalId) {
        try {
          await updateFormData({
            uploadedFiles: updatedFiles,
            textInputs: formData.textInputs,
          })

          // Invalidate analyses when documents are updated
          window.dispatchEvent(new CustomEvent('documents-updated'))
        } catch (error) {
          // Silent fail - localStorage will preserve the change
        }
      }
    }
  }

  /**
   * Handle manual RFP text submission
   * Alternative to file upload - processes pasted RFP text
   *
   * @param text - RFP text content
   */
  const handleManualTextSubmit = async (text: string) => {
    if (!proposalId) {
      return
    }

    setIsUploadingRFP(true)
    setShowManualInput(false)
    setUploadError('')

    try {
      const formDataPayload = new FormData()
      formDataPayload.append('rfp_text', text)

      await apiClient.post(`/api/proposals/${proposalId}/documents/upload-text`, formDataPayload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    } catch (error: Record<string, unknown>) {
      const errorMessage =
        (error?.response as Record<string, unknown>)?.data?.detail ||
        (error as Error)?.message ||
        'Unknown error'
      setUploadError(String(errorMessage))
    } finally {
      setIsUploadingRFP(false)
    }
  }

  /**
   * Delete uploaded RFP document
   * Removes from S3, DynamoDB, and local state
   * Also clears cached RFP analysis
   *
   * @param section - Document section identifier
   * @param fileIndex - Index of file in the section array
   */
  const handleDeleteFile = async (section: string, fileIndex: number) => {
    const updatedFiles = { ...formData.uploadedFiles }
    const fileName = updatedFiles[section][fileIndex]

    // Optimistic UI update
    updatedFiles[section].splice(fileIndex, 1)
    setFormData(prev => ({
      ...prev,
      uploadedFiles: updatedFiles,
    }))

    if (!proposalId) {
      return
    }

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')

      // Delete from S3 and vectors
      await proposalService.deleteDocument(proposalId, fileName)

      // Update DynamoDB metadata
      await updateFormData({
        uploadedFiles: updatedFiles,
      })

      // Clear RFP analysis cache if deleting RFP document
      if (section === 'rfp-document') {
        localStorage.removeItem(`proposal_rfp_analysis_${proposalId}`)
        window.dispatchEvent(new CustomEvent('rfp-deleted'))
      }
    } catch (error: Record<string, unknown>) {
      setUploadError('Failed to delete file from server')
    }
  }

  // ============================================================================
  // HANDLERS - Concept Document (File)
  // ============================================================================

  /**
   * Upload concept document file
   * Alternative to text input for concept section
   *
   * @param files - FileList from input element
   */
  const handleConceptFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !proposalId) {
      return
    }

    const file = files[0]

    // Validate file type
    const typeError = validateConceptFileType(file)
    if (typeError) {
      setConceptUploadError(typeError)
      return
    }

    // Validate file size
    const sizeError = validateFileSize(file)
    if (sizeError) {
      setConceptUploadError(sizeError)
      return
    }

    setIsUploadingConcept(true)
    setConceptUploadError('')

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
      await proposalService.uploadConceptFile(proposalId, file)

      // Update local state
      setFormData(prev => ({
        ...prev,
        uploadedFiles: {
          ...prev.uploadedFiles,
          'concept-document': [file.name],
        },
      }))

      // Invalidate analyses when concept document is updated
      // This ensures the user re-analyzes with the new document
      window.dispatchEvent(new CustomEvent('documents-updated'))
    } catch (error: Record<string, unknown>) {
      const errorMsg =
        (error?.response as Record<string, unknown>)?.data?.detail ||
        'Failed to upload concept file'
      setConceptUploadError(String(errorMsg))
    } finally {
      setIsUploadingConcept(false)
    }
  }

  /**
   * Delete concept document file
   *
   * @param filename - Name of file to delete
   */
  const handleDeleteConceptFile = async (filename: string, skipConfirm?: boolean) => {
    if (!skipConfirm && !confirm(`Delete ${filename}?`)) {
      return
    }
    if (!proposalId) {
      return
    }

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
      await proposalService.deleteConceptFile(proposalId, filename)

      setFormData(prev => ({
        ...prev,
        uploadedFiles: {
          ...prev.uploadedFiles,
          'concept-document': [],
        },
      }))
    } catch (error: Record<string, unknown>) {
      const errorMsg =
        (error?.response as Record<string, unknown>)?.data?.detail ||
        'Failed to delete concept file'
      setConceptUploadError(String(errorMsg))
    }
  }

  // ============================================================================
  // HANDLERS - Concept Text
  // ============================================================================

  /**
   * Save concept text to backend
   * Triggers vectorization for AI analysis
   */
  const handleSaveConceptText = async () => {
    const text = formData.textInputs['initial-concept'] || ''

    if (text.length < 100) {
      setConceptUploadError('Concept text must be at least 100 characters')
      return
    }

    if (!proposalId) {
      return
    }

    setIsSavingConceptText(true)
    setConceptUploadError('')

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
      await proposalService.saveConceptText(proposalId, text)

      setConceptTextSaved(true)
      setIsEditingConceptText(false)
    } catch (error: Record<string, unknown>) {
      const errorMsg =
        (error?.response as Record<string, unknown>)?.data?.detail || 'Failed to save concept text'
      setConceptUploadError(String(errorMsg))
    } finally {
      setIsSavingConceptText(false)
    }
  }

  /**
   * Enable editing mode for concept text
   */
  const handleEditConceptText = () => {
    setIsEditingConceptText(true)
    setConceptTextSaved(false)
  }

  /**
   * Delete saved concept text from backend
   */
  const handleDeleteConceptText = async () => {
    if (!confirm('Delete saved concept text?') || !proposalId) {
      return
    }

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
      await proposalService.deleteConceptText(proposalId)

      setFormData(prev => ({
        ...prev,
        textInputs: { ...prev.textInputs, 'initial-concept': '' },
      }))

      setConceptTextSaved(false)
      setIsEditingConceptText(false)
    } catch (error: Record<string, unknown>) {
      const errorMsg =
        (error?.response as Record<string, unknown>)?.data?.detail ||
        'Failed to delete concept text'
      setConceptUploadError(String(errorMsg))
    }
  }

  // ============================================================================
  // HANDLERS - Drag and Drop
  // ============================================================================

  /**
   * Handle drag over event for RFP upload area
   */
  const handleRFPDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingRFP(true)
  }

  /**
   * Handle drag leave event for RFP upload area
   */
  const handleRFPDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingRFP(false)
  }

  /**
   * Handle drop event for RFP upload area
   */
  const handleRFPDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingRFP(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileUpload('rfp-document', files)
    }
  }

  /**
   * Handle drag over event for concept upload area
   */
  const handleConceptDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingConcept(true)
  }

  /**
   * Handle drag leave event for concept upload area
   */
  const handleConceptDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingConcept(false)
  }

  /**
   * Handle drop event for concept upload area
   */
  const handleConceptDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingConcept(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleConceptFileUpload(files)
    }
  }

  // ============================================================================
  // HANDLERS - Text Input
  // ============================================================================

  /**
   * Handle text input changes with auto-save
   * Debounced save to backend via updateFormData
   *
   * @param section - Text input section identifier
   * @param value - New text value
   */
  const handleTextChange = async (section: string, value: string) => {
    const updatedInputs = {
      ...formData.textInputs,
      [section]: value,
    }

    setFormData(prev => ({
      ...prev,
      textInputs: updatedInputs,
    }))

    // Auto-save to backend if proposal exists
    if (proposalId) {
      try {
        await updateFormData({
          uploadedFiles: formData.uploadedFiles,
          textInputs: updatedInputs,
        })
      } catch (error) {
        // Silent fail - localStorage will preserve the change
      }
    }
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get count of uploaded files for a section
   *
   * @param section - Section identifier
   * @returns Number of uploaded files
   */
  const getUploadedFileCount = (section: string): number => {
    return formData.uploadedFiles[section]?.length || 0
  }

  /**
   * Get validation status for all required fields
   * Returns object with validation state and missing fields list
   */
  const getValidationStatus = (): {
    isValid: boolean
    missingFields: string[]
    hasTitle: boolean
    hasRFP: boolean
    hasConcept: boolean
  } => {
    const hasTitle = (formData.textInputs['proposal-title'] || '').trim().length > 0
    const hasRFP = getUploadedFileCount('rfp-document') > 0
    const hasConcept =
      (formData.textInputs['initial-concept'] || '').length >= 100 ||
      getUploadedFileCount('concept-document') > 0

    const missingFields: string[] = []
    if (!hasTitle) {
      missingFields.push('Title')
    }
    if (!hasRFP) {
      missingFields.push('RFP document')
    }
    if (!hasConcept) {
      missingFields.push('Initial Concept')
    }

    return {
      isValid: hasTitle && hasRFP && hasConcept,
      missingFields,
      hasTitle,
      hasRFP,
      hasConcept,
    }
  }

  /**
   * Validate file type for concept document
   * Returns error message if file type is not allowed, empty string if valid
   *
   * @param file - File to validate
   * @returns Error message or empty string
   */
  const validateConceptFileType = (file: File): string => {
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`

    if (!ALLOWED_CONCEPT_TYPES.includes(fileExtension)) {
      return `File type not supported. Please upload a PDF, DOCX, or TXT file. You uploaded: ${fileExtension}`
    }

    return ''
  }

  /**
   * Validate file size
   * Returns error message if file exceeds maximum size, empty string if valid
   *
   * @param file - File to validate
   * @returns Error message or empty string
   */
  const validateFileSize = (file: File): string => {
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      const maxMB = MAX_FILE_SIZE / (1024 * 1024)
      return `File size (${sizeMB} MB) exceeds maximum allowed size of ${maxMB} MB`
    }
    return ''
  }

  /**
   * Validate files before upload
   * Checks size and returns error message if any file is invalid
   *
   * @param files - FileList to validate
   * @returns Error message or empty string
   */
  const validateFiles = (files: FileList | null): string => {
    if (!files || files.length === 0) {
      return ''
    }

    for (let i = 0; i < files.length; i++) {
      const error = validateFileSize(files[i])
      if (error) {
        return error
      }
    }

    return ''
  }

  // ============================================================================
  // RENDER - Loading States
  // ============================================================================

  if (isLoading || isLoadingData) {
    return <Step1Skeleton />
  }

  if (!proposalId) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.stepHeader}>
          <div
            className={styles.skeleton}
            style={{ height: '40px', width: '60%', marginBottom: '16px' }}
          ></div>
          <div className={styles.skeleton} style={{ height: '20px', width: '80%' }}></div>
        </div>
        <div className={styles.skeleton} style={{ height: '150px', marginTop: '24px' }}></div>
        <div className={styles.skeleton} style={{ height: '200px', marginTop: '24px' }}></div>
      </div>
    )
  }

  // ============================================================================
  // RENDER - Main Content
  // ============================================================================

  const validationStatus = getValidationStatus()

  return (
    <div className={styles.mainContent}>
      {/* ===== Header Section ===== */}
      <header className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>
          Step 1: Information Consolidation
          <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeConcept}`}>
            Concept
          </span>
        </h1>
        <p className={styles.stepMainDescription}>
          Gather all necessary context: RFPs, reference proposals, existing work, and initial
          concepts. Once you complete this step, the AI will analyze your inputs to guide proposal
          development.
        </p>
      </header>

      {/* ===== Validation Status Card ===== */}
      {!validationStatus.isValid && (
        <div className={styles.progressCard}>
          <div className={styles.completionText}>
            <strong>{3 - validationStatus.missingFields.length}</strong> of <strong>3</strong>{' '}
            required fields completed
          </div>
          {validationStatus.missingFields.length > 0 && (
            <p className={styles.missingFieldsText}>
              Missing: {validationStatus.missingFields.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* ===== Success Message ===== */}
      {validationStatus.isValid && (
        <div className={styles.nextStepsCard}>
          <div className={styles.nextStepsTitle}>✓ All required fields complete</div>
          <p className={styles.nextStepsDescription}>
            You can now click "Analyze &amp; Continue" to proceed to the next step
          </p>
        </div>
      )}

      {/* ===== Title Field ===== */}
      <div className={styles.titleField}>
        <label className={styles.titleLabel}>
          Title<span className={styles.requiredAsterisk}>*</span>
        </label>
        <input
          type="text"
          placeholder="Write the title"
          value={formData.textInputs['proposal-title'] || ''}
          onChange={e => handleTextChange('proposal-title', e.target.value)}
          className={styles.titleInput}
          aria-label="Proposal title"
        />
      </div>

      {/* ===== RFP Upload Section ===== */}
      <section className={styles.uploadSection} aria-labelledby="rfp-section-title">
        <div className={styles.uploadSectionHeader}>
          <FileText color="#DF3737" size={20} aria-hidden="true" />
          <div className={styles.uploadSectionInfo}>
            <h3 id="rfp-section-title" className={styles.uploadSectionTitle}>
              RFP / Call for Proposals*
            </h3>
            <p className={styles.uploadSectionDescription}>
              Upload the official Request for Proposals document. This is essential for
              understanding donor requirements and evaluation criteria.
            </p>
          </div>
        </div>

        {/* Missing RFP Warning */}
        {getUploadedFileCount('rfp-document') === 0 && (
          <div className={styles.warningCard} role="alert">
            <AlertTriangle className={styles.warningIcon} size={16} aria-hidden="true" />
            <div className={styles.warningContent}>
              <p className={styles.warningTitle}>Missing RFP Document</p>
              <p className={styles.warningDescription}>
                Upload donor guidelines if not included in the main RFP document
              </p>
            </div>
          </div>
        )}

        {/* Upload Area or Uploaded File Display */}
        {getUploadedFileCount('rfp-document') === 0 ? (
          <div
            className={`${styles.uploadArea} ${isDraggingRFP ? styles.uploadAreaDragging : ''}`}
            onDragOver={handleRFPDragOver}
            onDragLeave={handleRFPDragLeave}
            onDrop={handleRFPDrop}
          >
            {isUploadingRFP ? (
              <>
                <div className={styles.uploadingSpinner} aria-live="polite">
                  <div className={styles.spinner}></div>
                </div>
                <p className={styles.uploadAreaTitle}>Uploading and processing...</p>
                <p className={styles.uploadAreaDescription}>
                  Please wait while we upload your document to secure storage
                </p>
              </>
            ) : (
              <>
                <FileText className={styles.uploadAreaIcon} size={32} aria-hidden="true" />
                <p className={styles.uploadAreaTitle}>Drop RFP file here or click to upload</p>
                <p className={styles.uploadAreaDescription}>Supports PDF files up to 10MB</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={e => handleFileUpload('rfp-document', e.target.files)}
                  className={styles.hiddenInput}
                  id="rfp-document"
                  disabled={isUploadingRFP}
                  aria-label="Upload RFP document"
                />
                <label htmlFor="rfp-document" className={styles.uploadButton}>
                  Choose File
                </label>
              </>
            )}
          </div>
        ) : (
          <div className={styles.uploadedFileCard}>
            <div className={styles.uploadedFileHeader}>
              <div className={styles.uploadedFileInfo}>
                <div className={styles.uploadedFileIconWrapper}>
                  <FileText className={styles.uploadedFileIcon} size={24} aria-hidden="true" />
                  <div className={styles.uploadedFileCheck} aria-label="Upload successful">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill="#10b981" />
                      <path
                        d="M5 8l2 2 4-4"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className={styles.uploadedFileName}>
                    {typeof formData.uploadedFiles['rfp-document']?.[0] === 'string'
                      ? formData.uploadedFiles['rfp-document'][0]
                      : formData.uploadedFiles['rfp-document']?.[0]?.name || 'Document'}
                  </p>
                  <p className={styles.uploadedFileDescription}>
                    Document uploaded successfully • Ready for analysis
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteFile('rfp-document', 0)}
                className={styles.deleteFileButton}
                title="Delete and upload a different file"
                aria-label="Delete RFP document"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M6 8v8m4-8v8m4-8v8M4 6h12M9 4h2a1 1 0 011 1v1H8V5a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className={styles.uploadedFileActions}>
              <label htmlFor="rfp-document-replace" className={styles.replaceFileButton}>
                Replace Document
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={e => {
                  handleDeleteFile('rfp-document', 0)
                  handleFileUpload('rfp-document', e.target.files)
                }}
                className={styles.hiddenInput}
                id="rfp-document-replace"
                disabled={isUpdating || isUploadingRFP}
                aria-label="Replace RFP document"
              />
              {rfpAnalysis && (
                <p className={styles.replaceHint}>
                  Replacing will automatically trigger re-analysis
                </p>
              )}
            </div>
          </div>
        )}

        {/* Upload Error Message */}
        {uploadError && (
          <div className={styles.errorMessage} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{uploadError}</span>
          </div>
        )}
      </section>

      {/* ===== Reference Proposals Section (Coming Soon) ===== */}
      <section
        className={`${styles.uploadSection} ${styles.disabledSection}`}
        aria-labelledby="reference-section-title"
      >
        <div className={styles.disabledBadge}>
          <span>Coming Soon</span>
        </div>
        <div className={styles.uploadSectionHeader}>
          <Files color="#00A63E" size={20} aria-hidden="true" />
          <div className={styles.uploadSectionInfo}>
            <h3 id="reference-section-title" className={styles.uploadSectionTitle}>
              Reference Proposals
            </h3>
            <p className={styles.uploadSectionDescription}>
              Upload successful proposals to this donor or similar calls. These help understand
              donor preferences and winning strategies.
            </p>
          </div>
        </div>

        <div className={`${styles.uploadArea} ${styles.uploadAreaDisabled}`}>
          <FileText className={styles.uploadAreaIcon} size={32} aria-hidden="true" />
          <p className={styles.uploadAreaTitle}>Drop reference proposals here or click to upload</p>
          <p className={styles.uploadAreaDescription}>Multiple files supported</p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={e => handleFileUpload('reference-proposals', e.target.files)}
            className={styles.hiddenInput}
            id="reference-proposals"
            disabled={true}
            aria-label="Upload reference proposals (disabled)"
          />
          <label
            htmlFor="reference-proposals"
            className={`${styles.uploadButtonSecondary} ${styles.uploadButtonDisabled}`}
          >
            Choose Files
          </label>
        </div>
      </section>

      {/* ===== Existing Work Section (Coming Soon) ===== */}
      <section
        className={`${styles.uploadSection} ${styles.disabledSection}`}
        aria-labelledby="existing-work-title"
      >
        <div className={styles.disabledBadge}>
          <span>Coming Soon</span>
        </div>
        <div className={styles.uploadSectionHeader}>
          <Briefcase color="#9F1239" size={20} aria-hidden="true" />
          <div className={styles.uploadSectionInfo}>
            <h3 id="existing-work-title" className={styles.uploadSectionTitle}>
              Existing Work &amp; Experience
            </h3>
            <p className={styles.uploadSectionDescription}>
              Describe your organization&apos;s relevant experience, ongoing projects, and previous
              work that relates to this call.
            </p>
          </div>
        </div>

        <textarea
          className={`${styles.textArea} ${styles.textAreaDisabled}`}
          placeholder="Describe your relevant experience, ongoing projects, previous work with similar donors, institutional strengths, partnerships, and any preliminary research or activities related to this call..."
          value={formData.textInputs['existing-work'] || ''}
          onChange={e => handleTextChange('existing-work', e.target.value)}
          disabled={true}
          aria-label="Existing work and experience (disabled)"
        />

        <div className={styles.textAreaFooter}>
          <span className={styles.textAreaHint}>
            Please provide more detail (minimum 50 characters)
          </span>
          <span className={styles.textAreaCount}>
            {(formData.textInputs['existing-work'] || '').length} characters
          </span>
        </div>

        {/* Supporting Documents */}
        <div className={styles.supportingDocs}>
          <h4 className={styles.supportingDocsTitle}>Supporting Documents (Optional)</h4>
          <p className={styles.supportingDocsDescription}>
            Upload additional documents like organizational profiles, previous project reports, or
            technical papers.
          </p>

          <div className={`${styles.uploadAreaSmall} ${styles.uploadAreaDisabled}`}>
            <FileText className={styles.uploadAreaIcon} size={24} aria-hidden="true" />
            <p className={styles.uploadAreaTitle}>Drop supporting files here</p>
            <input
              type="file"
              multiple
              onChange={e => handleFileUpload('supporting-docs', e.target.files)}
              className={styles.hiddenInput}
              id="supporting-docs"
              disabled={true}
              aria-label="Upload supporting documents (disabled)"
            />
            <label
              htmlFor="supporting-docs"
              className={`${styles.uploadButtonSecondary} ${styles.uploadButtonDisabled}`}
            >
              Add Files
            </label>
          </div>
        </div>
      </section>

      {/* ===== Initial Concept Section ===== */}
      <section className={styles.uploadSection} aria-labelledby="concept-section-title">
        <div className={styles.uploadSectionHeader}>
          <Lightbulb color="#2563EB" size={20} aria-hidden="true" />
          <div className={styles.uploadSectionInfo}>
            <h3 id="concept-section-title" className={styles.uploadSectionTitle}>
              Initial Concept or Direction*
            </h3>
            <p className={styles.uploadSectionDescription}>
              Outline your initial ideas, approach, or hypothesis for this proposal. You can write
              text or upload a document outlining your concept.
            </p>
          </div>
        </div>

        <textarea
          className={styles.textArea}
          placeholder="Describe your initial concept, proposed approach, target beneficiaries, expected outcomes, implementation strategy, or any specific innovations you plan to include..."
          value={formData.textInputs['initial-concept'] || ''}
          onChange={e => handleTextChange('initial-concept', e.target.value)}
          disabled={
            ((conceptTextSaved && !isEditingConceptText) ||
              isSavingConceptText ||
              getUploadedFileCount('concept-document') > 0) as boolean
          }
          aria-label="Initial concept text"
        />

        {getUploadedFileCount('concept-document') > 0 && (
          <div className={styles.infoMessage} role="alert">
            <p>
              You have uploaded a concept document. To use text input instead, please delete the
              document first.
            </p>
          </div>
        )}

        <div className={styles.textAreaFooter}>
          <div>
            <span className={styles.textAreaHint}>
              Please provide more detail about your concept (minimum 100 characters)
            </span>
            <span className={styles.textAreaCount}>
              {(formData.textInputs['initial-concept'] || '').length} characters
            </span>
          </div>

          <div className={styles.textAreaActions}>
            {!conceptTextSaved ? (
              <button
                onClick={handleSaveConceptText}
                disabled={
                  isSavingConceptText || (formData.textInputs['initial-concept'] || '').length < 100
                }
                className={styles.saveButton}
                aria-label="Save concept text"
              >
                {isSavingConceptText ? 'Saving...' : 'Save Text'}
              </button>
            ) : (
              <>
                <span className={styles.savedIndicator} aria-live="polite">
                  Text saved
                </span>
                <button
                  onClick={handleEditConceptText}
                  className={styles.editButton}
                  aria-label="Edit concept text"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteConceptText}
                  className={styles.deleteButton}
                  aria-label="Delete concept text"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {conceptUploadError && (
          <div className={styles.errorMessage} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{conceptUploadError}</span>
          </div>
        )}

        {/* Upload Alternative - Concept Document */}
        <div className={styles.uploadAlternative}>
          <h4 className={styles.uploadAlternativeTitle}>Or Upload Concept Document</h4>
          <p className={styles.uploadAlternativeDescription}>
            Upload a Word document (DOCX), PDF, or text file (TXT) outlining your concept instead
          </p>

          {(formData.textInputs['initial-concept'] || '').length > 0 && (
            <div className={styles.infoMessage} role="alert">
              <p>
                You have text in the concept field. To upload a document instead, please clear the
                text first.
              </p>
            </div>
          )}

          {getUploadedFileCount('concept-document') === 0 ? (
            <div
              className={`${styles.uploadAreaSmall} ${isDraggingConcept ? styles.uploadAreaDragging : ''}`}
              onDragOver={handleConceptDragOver}
              onDragLeave={handleConceptDragLeave}
              onDrop={handleConceptDrop}
            >
              {isUploadingConcept ? (
                <>
                  <div className={styles.uploadingSpinner} aria-live="polite">
                    <div className={styles.spinner}></div>
                  </div>
                  <p className={styles.uploadAreaTitle}>Uploading concept file...</p>
                </>
              ) : (
                <>
                  <FileText className={styles.uploadAreaIcon} size={24} aria-hidden="true" />
                  <p className={styles.uploadAreaTitle}>Drop concept document here</p>
                  <p className={styles.uploadAreaDescription}>Supports PDF, DOCX, and TXT files up to 10MB</p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={e => handleConceptFileUpload(e.target.files)}
                    className={styles.hiddenInput}
                    id="concept-document"
                    disabled={isUploadingConcept}
                    aria-label="Upload concept document"
                  />
                  <label htmlFor="concept-document" className={styles.uploadButtonSecondary}>
                    {isUploadingConcept ? 'Uploading...' : 'Choose File'}
                  </label>
                </>
              )}
            </div>
          ) : (
            <div className={styles.uploadedFileCard}>
              <div className={styles.uploadedFileHeader}>
                <div className={styles.uploadedFileInfo}>
                  <div className={styles.uploadedFileIconWrapper}>
                    <FileText className={styles.uploadedFileIcon} size={24} aria-hidden="true" />
                    <div className={styles.uploadedFileCheck} aria-label="Upload successful">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="8" fill="#10b981" />
                        <path
                          d="M5 8l2 2 4-4"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className={styles.uploadedFileName}>
                      {typeof formData.uploadedFiles['concept-document']?.[0] === 'string'
                        ? formData.uploadedFiles['concept-document'][0]
                        : formData.uploadedFiles['concept-document']?.[0]?.name || 'Document'}
                    </p>
                    <p className={styles.uploadedFileDescription}>
                      Concept document uploaded successfully
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const conceptFile = formData.uploadedFiles['concept-document'][0]
                    const filename =
                      typeof conceptFile === 'string' ? conceptFile : conceptFile?.name
                    if (filename) {
                      handleDeleteConceptFile(filename)
                    }
                  }}
                  className={styles.deleteFileButton}
                  title="Delete and upload a different file"
                  aria-label="Delete concept document"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M6 8v8m4-8v8m4-8v8M4 6h12M9 4h2a1 1 0 011 1v1H8V5a1 1 0 011-1z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div className={styles.uploadedFileActions}>
                <label htmlFor="concept-document-replace" className={styles.replaceFileButton}>
                  Replace Document
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={async e => {
                    const conceptFile = formData.uploadedFiles['concept-document'][0]
                    const filename =
                      typeof conceptFile === 'string' ? conceptFile : conceptFile?.name
                    if (filename) {
                      await handleDeleteConceptFile(filename, true)
                    }
                    handleConceptFileUpload(e.target.files)
                    // Reset input so same file can be selected again
                    e.target.value = ''
                  }}
                  className={styles.hiddenInput}
                  id="concept-document-replace"
                  disabled={isUpdating || isUploadingConcept}
                  aria-label="Replace concept document"
                />
                {conceptAnalysis && (
                  <p className={styles.replaceHint}>
                    Replacing will automatically trigger re-analysis
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== Manual RFP Input Modal ===== */}
      <ManualRFPInput
        isOpen={showManualInput}
        onClose={() => setShowManualInput(false)}
        onSubmit={handleManualTextSubmit}
        isProcessing={isUploadingRFP}
      />
    </div>
  )
}
