// ============================================================================
// IMPORTS
// ============================================================================
import { useEffect, useState, useCallback, useRef } from 'react'
import { FileText, AlertTriangle, Files, Briefcase, Lightbulb, Loader2 } from 'lucide-react'
import { useProposal } from '@/tools/proposal-writer/hooks/useProposal'
import { useToast } from '@/shared/hooks/useToast'
import { StepProps } from './stepConfig'
import styles from './Step1InformationConsolidation.module.css'
import { apiClient } from '@/shared/services/apiClient'
import { proposalService } from '@/tools/proposal-writer/services/proposalService'
import ManualRFPInput from '@/tools/proposal-writer/components/ManualRFPInput'
import {
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from '@/tools/proposal-writer/constants/notificationMessages'

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum file size in bytes (5 MB) - increased from 2MB for larger documents */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** Maximum number of files per section (Reference Proposals and Existing Work) */
const MAX_FILES_PER_SECTION = 3

/** Maximum total size for all files in a section (15 MB total = 3 files x 5MB) */
const MAX_TOTAL_SIZE_PER_SECTION = 15 * 1024 * 1024

/** Allowed file types for concept document */
const ALLOWED_CONCEPT_TYPES = ['.pdf', '.docx', '.txt']

/** Polling interval for vectorization status (in milliseconds) */
const VECTORIZATION_POLL_INTERVAL = 3000

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
  /** Setter for RFP upload state */
  setIsUploadingRFP?: (isUploading: boolean) => void
  /** Setter for reference proposals upload state */
  setIsUploadingReference?: (isUploading: boolean) => void
  /** Setter for supporting docs upload state */
  setIsUploadingSupporting?: (isUploading: boolean) => void
  /** Setter for concept upload state */
  setIsUploadingConcept?: (isUploading: boolean) => void
  /** Setter for vectorization state - notifies parent when files are being vectorized */
  setIsVectorizingFiles?: (isVectorizing: boolean) => void
  /** Callback when RFP document changes - used to invalidate downstream data */
  onRfpDocumentChanged?: () => void
  /** Callback when concept document changes - used to invalidate downstream data */
  onConceptDocumentChanged?: () => void
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
  setIsUploadingRFP: setParentIsUploadingRFP,
  setIsUploadingReference: setParentIsUploadingReference,
  setIsUploadingSupporting: setParentIsUploadingSupporting,
  setIsUploadingConcept: setParentIsUploadingConcept,
  setIsVectorizingFiles: setParentIsVectorizingFiles,
  onRfpDocumentChanged,
  onConceptDocumentChanged,
}: Step1Props) {
  // ============================================================================
  // STATE - Hooks
  // ============================================================================

  const { proposal, updateFormData, isUpdating, isLoading } = useProposal(proposalId)
  const { showSuccess, showError } = useToast()

  // ============================================================================
  // UPLOAD STATE SYNC HELPERS
  // ============================================================================

  /**
   * Sync upload states with parent component
   * Updates both local and parent states
   */
  const syncUploadState = (
    localSetter: (value: boolean) => void,
    parentSetter: ((value: boolean) => void) | undefined,
    value: boolean
  ) => {
    localSetter(value)
    parentSetter?.(value)
  }

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
  // STATE - Reference Proposals
  // ============================================================================

  /** Track if files are being dragged over reference proposals upload area */
  const [isDraggingReference, setIsDraggingReference] = useState(false)
  /** Loading state for reference proposals file upload */
  const [isUploadingReference, setIsUploadingReference] = useState(false)
  /** Error message for reference proposals operations */
  const [referenceUploadError, setReferenceUploadError] = useState('')
  /** File pending deletion */
  const [fileToDelete, setFileToDelete] = useState<{ filename: string; type: string } | null>(null)
  /** Loading state for file deletion */
  const [isDeletingFile, setIsDeletingFile] = useState(false)

  // ============================================================================
  // STATE - Existing Work & Experience
  // ============================================================================

  /** Track if files are being dragged over supporting docs upload area */
  const [isDraggingSupporting, setIsDraggingSupporting] = useState(false)
  /** Loading state for supporting docs file upload */
  const [isUploadingSupporting, setIsUploadingSupporting] = useState(false)
  /** Loading state for existing work text save operation */
  const [isSavingWorkText, setIsSavingWorkText] = useState(false)
  /** Whether existing work text has been saved to backend */
  const [workTextSaved, setWorkTextSaved] = useState(false)
  /** Whether user is currently editing existing work text */
  const [isEditingWorkText, setIsEditingWorkText] = useState(false)
  /** Error message for existing work operations */
  const [workUploadError, setWorkUploadError] = useState('')

  // ============================================================================
  // STATE - Vectorization Status
  // ============================================================================

  /** Vectorization status for all files (reference proposals and supporting docs) */
  const [vectorizationStatus, setVectorizationStatus] = useState<{
    [filename: string]: {
      status: 'pending' | 'processing' | 'completed' | 'failed'
      chunks_processed: number
      total_chunks: number
      error?: string
    }
  }>({})

  /** Whether any files are currently being vectorized */
  const [hasVectorizingFiles, setHasVectorizingFiles] = useState(false)

  /** Ref to track if polling is active */
  const vectorizationPollRef = useRef<NodeJS.Timeout | null>(null)

  /** Ref for debouncing text input saves to backend */
  const textSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
          const { proposalService } =
            await import('@/tools/proposal-writer/services/proposalService')
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
          if (Object.keys(initialTextInputs).length === 0 && proposal?.text_inputs) {
            initialTextInputs = { ...proposal.text_inputs }
          }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId, setFormData])

  /**
   * Fill in missing text inputs from proposal when it loads
   * This handles the case where proposal loads after the initial effect
   * Uses a ref to track if we've already initialized to prevent re-runs
   */
  const hasInitializedFromProposal = useRef(false)

  useEffect(() => {
    if (!proposalId || !proposal?.text_inputs || hasInitializedFromProposal.current) {
      return
    }

    // Only update if formData doesn't have a title but proposal does
    // Use functional update to get current state without adding formData to dependencies
    setFormData(prev => {
      if (!prev.textInputs['proposal-title'] && proposal.text_inputs['proposal-title']) {
        hasInitializedFromProposal.current = true
        return {
          ...prev,
          textInputs: {
            ...prev.textInputs,
            ...proposal.text_inputs,
          },
        }
      }
      return prev
    })
  }, [proposal?.text_inputs, proposalId, setFormData])

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
  // EFFECTS - Vectorization Status Polling
  // ============================================================================

  /**
   * Poll for vectorization status when there are pending vectorization tasks
   */
  const pollVectorizationStatus = useCallback(async () => {
    if (!proposalId) {
      return
    }

    try {
      const response = await proposalService.getVectorizationStatus(proposalId)

      if (response.success) {
        setVectorizationStatus(response.vectorization_status)
        setHasVectorizingFiles(response.has_pending)

        // If all completed, stop polling
        if (response.all_completed) {
          if (vectorizationPollRef.current) {
            clearInterval(vectorizationPollRef.current)
            vectorizationPollRef.current = null
          }
        }
      }
    } catch (error) {
      // Removed console.error
    }
  }, [proposalId])

  /**
   * Start polling when component mounts and we have vectorizing files
   */
  useEffect(() => {
    if (!proposalId) {
      return
    }

    // Initial fetch
    pollVectorizationStatus()

    // Cleanup on unmount
    return () => {
      if (vectorizationPollRef.current) {
        clearInterval(vectorizationPollRef.current)
        vectorizationPollRef.current = null
      }
    }
  }, [proposalId, pollVectorizationStatus])

  /**
   * Start/stop polling based on hasVectorizingFiles state
   */
  useEffect(() => {
    if (hasVectorizingFiles && !vectorizationPollRef.current) {
      // Start polling
      vectorizationPollRef.current = setInterval(
        pollVectorizationStatus,
        VECTORIZATION_POLL_INTERVAL
      )
    } else if (!hasVectorizingFiles && vectorizationPollRef.current) {
      // Stop polling
      clearInterval(vectorizationPollRef.current)
      vectorizationPollRef.current = null
    }

    return () => {
      if (vectorizationPollRef.current) {
        clearInterval(vectorizationPollRef.current)
        vectorizationPollRef.current = null
      }
    }
  }, [hasVectorizingFiles, pollVectorizationStatus])

  /**
   * Cleanup text save debounce timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (textSaveTimeoutRef.current) {
        clearTimeout(textSaveTimeoutRef.current)
        textSaveTimeoutRef.current = null
      }
    }
  }, [])

  /**
   * Notify parent component when vectorization state changes
   * This enables the parent to disable navigation buttons while vectorizing
   */
  useEffect(() => {
    setParentIsVectorizingFiles?.(hasVectorizingFiles)
  }, [hasVectorizingFiles, setParentIsVectorizingFiles])

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
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      const maxMB = MAX_FILE_SIZE / (1024 * 1024)
      const error = ERROR_MESSAGES.FILE_TOO_LARGE(sizeMB, maxMB)
      setUploadError(error.message)
      showError(error.title, error.message)
      return
    }

    // RFP documents require special processing (S3 + vectorization)
    if (proposalId && section === 'rfp-document') {
      syncUploadState(setIsUploadingRFP, setParentIsUploadingRFP, true)
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

        setFormData(prev => ({
          ...prev,
          uploadedFiles: updatedFiles,
        }))

        // Persist to backend
        await updateFormData({
          uploadedFiles: updatedFiles,
          textInputs: formData.textInputs,
        })

        // Show success notification
        showSuccess(SUCCESS_MESSAGES.RFP_UPLOADED.title, SUCCESS_MESSAGES.RFP_UPLOADED.message)

        // Invalidate downstream analyses when RFP document is updated
        // Removed console.log🔄 [RFP Document Changed] Invalidating downstream analyses')
        if (onRfpDocumentChanged) {
          onRfpDocumentChanged()
        }
        window.dispatchEvent(new CustomEvent('documents-updated'))
      } catch (error: unknown) {
        const errorMsg =
          (error as Record<string, unknown>)?.response?.data?.detail ||
          (error as Error)?.message ||
          'Upload failed. Please try again.'
        setUploadError(String(errorMsg))

        // Show error notification with retry action
        showError(ERROR_MESSAGES.RFP_UPLOAD_FAILED.title, String(errorMsg), {
          label: 'Retry',
          onClick: () => handleFileUpload(section, files),
        })
      } finally {
        syncUploadState(setIsUploadingRFP, setParentIsUploadingRFP, false)
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

    syncUploadState(setIsUploadingRFP, setParentIsUploadingRFP, true)
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
      syncUploadState(setIsUploadingRFP, setParentIsUploadingRFP, false)
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

      // Show success notification
      showSuccess(SUCCESS_MESSAGES.FILE_DELETED.title, SUCCESS_MESSAGES.FILE_DELETED.message)

      // Clear RFP analysis cache if deleting RFP document
      if (section === 'rfp-document') {
        localStorage.removeItem(`proposal_rfp_analysis_${proposalId}`)
        window.dispatchEvent(new CustomEvent('rfp-deleted'))
      }
    } catch (error: Record<string, unknown>) {
      const errorMsg = 'Failed to delete file from server'
      setUploadError(errorMsg)
      showError(ERROR_MESSAGES.FILE_DELETE_FAILED.title, errorMsg)
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
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
      const error = ERROR_MESSAGES.INVALID_FILE_TYPE(fileExtension, ALLOWED_CONCEPT_TYPES)
      setConceptUploadError(error.message)
      showError(error.title, error.message)
      return
    }

    // Validate file size
    const sizeError = validateFileSize(file)
    if (sizeError) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      const maxMB = MAX_FILE_SIZE / (1024 * 1024)
      const error = ERROR_MESSAGES.FILE_TOO_LARGE(sizeMB, maxMB)
      setConceptUploadError(error.message)
      showError(error.title, error.message)
      return
    }

    syncUploadState(setIsUploadingConcept, setParentIsUploadingConcept, true)
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

      // Show success notification
      showSuccess(
        SUCCESS_MESSAGES.CONCEPT_FILE_UPLOADED.title,
        SUCCESS_MESSAGES.CONCEPT_FILE_UPLOADED.message
      )

      // Invalidate downstream analyses when concept document is updated
      // Removed console.log🔄 [Concept Document Changed] Invalidating downstream analyses')
      if (onConceptDocumentChanged) {
        onConceptDocumentChanged()
      }
      window.dispatchEvent(new CustomEvent('documents-updated'))
    } catch (error: Record<string, unknown>) {
      const errorMsg =
        (error?.response as Record<string, unknown>)?.data?.detail ||
        'Failed to upload concept file'
      setConceptUploadError(String(errorMsg))
      showError(ERROR_MESSAGES.CONCEPT_UPLOAD_FAILED.title, String(errorMsg), {
        label: 'Retry',
        onClick: () => handleConceptFileUpload(files),
      })
    } finally {
      syncUploadState(setIsUploadingConcept, setParentIsUploadingConcept, false)
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
  // HANDLERS - Reference Proposals
  // ============================================================================

  /**
   * Handle drag over event for reference proposals upload area
   */
  const handleReferenceDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingReference(true)
  }

  /**
   * Handle drag leave event for reference proposals upload area
   */
  const handleReferenceDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingReference(false)
  }

  /**
   * Handle drop event for reference proposals upload area
   */
  const handleReferenceDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingReference(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleReferenceFileUpload(files)
    }
  }

  /**
   * Upload reference proposal files
   * Supports multiple files
   *
   * @param files - FileList from input element
   */
  const handleReferenceFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !proposalId) {
      return
    }

    const file = files[0]

    // Check file count limit (max 3 files)
    const currentCount = getUploadedFileCount('reference-proposals')
    if (currentCount >= MAX_FILES_PER_SECTION) {
      setReferenceUploadError(
        `Maximum ${MAX_FILES_PER_SECTION} files allowed. Please delete a file before uploading another.`
      )
      return
    }

    // Validate file type
    const typeError = validateConceptFileType(file)
    if (typeError) {
      setReferenceUploadError(typeError)
      return
    }

    // Validate file size
    const sizeError = validateFileSize(file)
    if (sizeError) {
      setReferenceUploadError(sizeError)
      return
    }

    // Validate total size won't exceed limit
    const currentTotalSize = getTotalFileSize('reference-proposals')
    const newTotalSize = currentTotalSize + file.size
    if (newTotalSize > MAX_TOTAL_SIZE_PER_SECTION) {
      const currentMB = (currentTotalSize / (1024 * 1024)).toFixed(2)
      const fileMB = (file.size / (1024 * 1024)).toFixed(2)
      const maxMB = MAX_TOTAL_SIZE_PER_SECTION / (1024 * 1024)
      setReferenceUploadError(
        `Total file size would exceed ${maxMB}MB limit. Current: ${currentMB}MB, New file: ${fileMB}MB. Please delete files or upload a smaller file.`
      )
      return
    }

    syncUploadState(setIsUploadingReference, setParentIsUploadingReference, true)
    setReferenceUploadError('')

    try {
      await proposalService.uploadReferenceFile(proposalId, file)

      // Update local state
      const currentFiles = formData.uploadedFiles['reference-proposals'] || []
      setFormData(prev => ({
        ...prev,
        uploadedFiles: {
          ...prev.uploadedFiles,
          'reference-proposals': [...currentFiles, file.name],
        },
      }))

      // Start vectorization status polling
      setHasVectorizingFiles(true)

      // Show success message
      showSuccess('File uploaded! Vectorization in progress...')

      // Invalidate analyses when reference documents are updated
      window.dispatchEvent(new CustomEvent('documents-updated'))
    } catch (error: unknown) {
      const errorMsg =
        (error as Record<string, unknown>)?.response?.data?.detail ||
        'Failed to upload reference file'

      // Check if it's a timeout error
      const isTimeout =
        String(errorMsg).toLowerCase().includes('timeout') ||
        (error as { code?: string })?.code === 'ECONNABORTED'

      if (isTimeout) {
        setReferenceUploadError(
          `⏱️ Upload timed out\n\n` +
            `Large files may take too long to process.\n\n` +
            `Solutions:\n` +
            `• Compress your PDF at: ilovepdf.com/compress_pdf\n` +
            `• Split into smaller documents\n` +
            `• Use only the most relevant pages`
        )
      } else {
        setReferenceUploadError(String(errorMsg))
      }
    } finally {
      syncUploadState(setIsUploadingReference, setParentIsUploadingReference, false)
    }
  }

  /**
   * Delete reference proposal file
   *
   * @param filename - Name of file to delete
   */
  const handleDeleteReferenceFile = async (filename: string) => {
    setFileToDelete({ filename, type: 'reference' })
  }

  /**
   * Confirm and execute file deletion
   */
  const confirmDeleteFile = async () => {
    if (!fileToDelete || !proposalId) {
      return
    }

    setIsDeletingFile(true)

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')

      if (fileToDelete.type === 'reference') {
        await proposalService.deleteReferenceFile(proposalId, fileToDelete.filename)

        const currentFiles = formData.uploadedFiles['reference-proposals'] || []
        const updatedFiles = currentFiles.filter(f => f !== fileToDelete.filename)

        setFormData(prev => ({
          ...prev,
          uploadedFiles: {
            ...prev.uploadedFiles,
            'reference-proposals': updatedFiles,
          },
        }))
      } else if (fileToDelete.type === 'supporting') {
        await proposalService.deleteSupportingFile(proposalId, fileToDelete.filename)

        const currentFiles = formData.uploadedFiles['supporting-docs'] || []
        const updatedFiles = currentFiles.filter(f => f !== fileToDelete.filename)

        setFormData(prev => ({
          ...prev,
          uploadedFiles: {
            ...prev.uploadedFiles,
            'supporting-docs': updatedFiles,
          },
        }))
      }

      showSuccess('File deleted successfully')
    } catch (error: unknown) {
      const errorMsg =
        (error as Record<string, unknown>)?.response?.data?.detail || 'Failed to delete file'
      showError('Delete Failed', String(errorMsg))
    } finally {
      setIsDeletingFile(false)
      setFileToDelete(null)
    }
  }

  // ============================================================================
  // HANDLERS - Existing Work & Experience
  // ============================================================================

  /**
   * Handle drag over event for supporting docs upload area
   */
  const handleSupportingDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingSupporting(true)
  }

  /**
   * Handle drag leave event for supporting docs upload area
   */
  const handleSupportingDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingSupporting(false)
  }

  /**
   * Handle drop event for supporting docs upload area
   */
  const handleSupportingDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingSupporting(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleSupportingFileUpload(files)
    }
  }

  /**
   * Upload supporting document files
   * Supports multiple files
   *
   * @param files - FileList from input element
   */
  const handleSupportingFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !proposalId) {
      return
    }

    const file = files[0]

    // Check file count limit (max 3 files)
    const currentCount = getUploadedFileCount('supporting-docs')
    if (currentCount >= MAX_FILES_PER_SECTION) {
      setWorkUploadError(
        `Maximum ${MAX_FILES_PER_SECTION} files allowed. Please delete a file before uploading another.`
      )
      return
    }

    // Validate file size
    const sizeError = validateFileSize(file)
    if (sizeError) {
      setWorkUploadError(sizeError)
      return
    }

    // Validate total size won't exceed limit
    const currentTotalSize = getTotalFileSize('supporting-docs')
    const newTotalSize = currentTotalSize + file.size
    if (newTotalSize > MAX_TOTAL_SIZE_PER_SECTION) {
      const currentMB = (currentTotalSize / (1024 * 1024)).toFixed(2)
      const fileMB = (file.size / (1024 * 1024)).toFixed(2)
      const maxMB = MAX_TOTAL_SIZE_PER_SECTION / (1024 * 1024)
      setWorkUploadError(
        `Total file size would exceed ${maxMB}MB limit. Current: ${currentMB}MB, New file: ${fileMB}MB. Please delete files or upload a smaller file.`
      )
      return
    }

    syncUploadState(setIsUploadingSupporting, setParentIsUploadingSupporting, true)
    setWorkUploadError('')

    try {
      await proposalService.uploadSupportingFile(proposalId, file)

      // Update local state
      const currentFiles = formData.uploadedFiles['supporting-docs'] || []
      setFormData(prev => ({
        ...prev,
        uploadedFiles: {
          ...prev.uploadedFiles,
          'supporting-docs': [...currentFiles, file.name],
        },
      }))

      // Start vectorization status polling
      setHasVectorizingFiles(true)

      // Show success message
      showSuccess('File uploaded! Vectorization in progress...')

      // Invalidate analyses when supporting documents are updated
      window.dispatchEvent(new CustomEvent('documents-updated'))
    } catch (error: unknown) {
      const errorMsg =
        (error as Record<string, unknown>)?.response?.data?.detail ||
        'Failed to upload supporting file'

      // Check if it's a timeout error
      const isTimeout =
        String(errorMsg).toLowerCase().includes('timeout') ||
        (error as { code?: string })?.code === 'ECONNABORTED'

      if (isTimeout) {
        setWorkUploadError(
          `⏱️ Upload timed out\n\n` +
            `Large files may take too long to process.\n\n` +
            `Solutions:\n` +
            `• Compress at: ilovepdf.com/compress_pdf\n` +
            `• Split into smaller documents\n` +
            `• Use only the most relevant pages`
        )
      } else {
        setWorkUploadError(String(errorMsg))
      }
    } finally {
      syncUploadState(setIsUploadingSupporting, setParentIsUploadingSupporting, false)
    }
  }

  /**
   * Delete supporting document file
   *
   * @param filename - Name of file to delete
   */
  const handleDeleteSupportingFile = async (filename: string) => {
    setFileToDelete({ filename, type: 'supporting' })
  }

  /**
   * Save existing work text to backend
   */
  const handleSaveWorkText = async () => {
    const text = formData.textInputs['existing-work'] || ''

    if (text.length < 50) {
      setWorkUploadError('Existing work text must be at least 50 characters')
      return
    }

    if (!proposalId) {
      return
    }

    setIsSavingWorkText(true)
    setWorkUploadError('')

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
      await proposalService.saveWorkText(proposalId, text)

      setWorkTextSaved(true)
      setIsEditingWorkText(false)
    } catch (error: unknown) {
      const errorMsg =
        (error as Record<string, unknown>)?.response?.data?.detail || 'Failed to save work text'
      setWorkUploadError(String(errorMsg))
    } finally {
      setIsSavingWorkText(false)
    }
  }

  /**
   * Enable editing mode for existing work text
   */
  const handleEditWorkText = () => {
    setIsEditingWorkText(true)
    setWorkTextSaved(false)
  }

  /**
   * Delete saved existing work text from backend
   */
  const handleDeleteWorkText = async () => {
    if (!confirm('Delete saved work text?') || !proposalId) {
      return
    }

    try {
      const { proposalService } = await import('@/tools/proposal-writer/services/proposalService')
      await proposalService.deleteWorkText(proposalId)

      setFormData(prev => ({
        ...prev,
        textInputs: { ...prev.textInputs, 'existing-work': '' },
      }))

      setWorkTextSaved(false)
      setIsEditingWorkText(false)
    } catch (error: unknown) {
      const errorMsg =
        (error as Record<string, unknown>)?.response?.data?.detail || 'Failed to delete work text'
      setWorkUploadError(String(errorMsg))
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
  const handleTextChange = (section: string, value: string) => {
    const updatedInputs = {
      ...formData.textInputs,
      [section]: value,
    }

    // Update local state immediately for responsive UI
    setFormData(prev => ({
      ...prev,
      textInputs: updatedInputs,
    }))

    // Debounce auto-save to backend (500ms) to prevent excessive API calls
    // This prevents re-renders caused by React Query cache updates on every keystroke
    if (proposalId) {
      // Clear any pending save
      if (textSaveTimeoutRef.current) {
        clearTimeout(textSaveTimeoutRef.current)
      }

      // Schedule new save after 500ms of no typing
      textSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await updateFormData({
            uploadedFiles: formData.uploadedFiles,
            textInputs: updatedInputs,
          })
        } catch (error) {
          // Silent fail - localStorage will preserve the change
        }
      }, 500)
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
   * Calculate total size of uploaded files in a section
   * Note: This requires file sizes to be tracked in metadata
   *
   * @param _section - Section identifier
   * @returns Total size in bytes (0 if sizes not tracked)
   */
  const getTotalFileSize = (_section: string): number => {
    // For now, we can't calculate exact size from uploaded files
    // This would require storing file sizes in metadata
    // Return 0 as placeholder - validation will happen on new uploads
    return 0
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

  // Removed unused _validateFiles function

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
        <h1 className={styles.stepMainTitle}>Step 1: Information Consolidation</h1>
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
            You can now click &quot;Analyze &amp; Continue&quot; to proceed to the next step
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
              RFP / Call for Proposals<span className={styles.requiredAsterisk}>*</span>
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
                  <div className={styles.uploadSpinner}></div>
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

      {/* ===== Reference Proposals Section ===== */}
      <section className={styles.uploadSection} aria-labelledby="reference-section-title">
        <div className={styles.uploadSectionHeader}>
          <Files color="#00A63E" size={20} aria-hidden="true" />
          <div className={styles.uploadSectionInfo}>
            <h3 id="reference-section-title" className={styles.uploadSectionTitle}>
              Reference Proposals
            </h3>
            <p className={styles.uploadSectionDescription}>
              Upload successful proposals to this donor or similar calls (max 3 files, 5MB each).
              These help understand donor preferences and winning strategies.
            </p>
          </div>
        </div>

        {/* Upload Area or Uploaded Files Display */}
        {getUploadedFileCount('reference-proposals') === 0 ? (
          <div
            className={`${styles.uploadArea} ${isDraggingReference ? styles.uploadAreaDragging : ''}`}
            onDragOver={handleReferenceDragOver}
            onDragLeave={handleReferenceDragLeave}
            onDrop={handleReferenceDrop}
          >
            {isUploadingReference ? (
              <>
                <div className={styles.uploadingSpinner} aria-live="polite">
                  <div className={styles.uploadSpinner}></div>
                </div>
                <p className={styles.uploadAreaTitle}>Uploading reference file...</p>
              </>
            ) : (
              <>
                <FileText className={styles.uploadAreaIcon} size={32} aria-hidden="true" />
                <p className={styles.uploadAreaTitle}>
                  Drop reference proposals here or click to upload
                </p>
                <p className={styles.uploadAreaDescription}>
                  Supports PDF, DOCX files (max 3 files, 5MB each)
                </p>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={e => handleReferenceFileUpload(e.target.files)}
                  className={styles.hiddenInput}
                  id="reference-proposals"
                  disabled={isUploadingReference}
                  aria-label="Upload reference proposals"
                />
                <label htmlFor="reference-proposals" className={styles.uploadButtonSecondary}>
                  Choose File
                </label>
              </>
            )}
          </div>
        ) : (
          <div className={styles.uploadedFilesList}>
            {/* Show uploading indicator when adding more files */}
            {isUploadingReference && (
              <div className={styles.uploadingFileCard}>
                <div className={styles.uploadingSpinner} aria-live="polite">
                  <div className={styles.uploadSpinner}></div>
                </div>
                <p className={styles.uploadingText}>Uploading and processing file...</p>
              </div>
            )}

            {(formData.uploadedFiles['reference-proposals'] || []).map((file, index) => {
              const filename = typeof file === 'string' ? file : file.name
              const fileExtension = filename.split('.').pop()?.toUpperCase() || 'FILE'
              const fileVecStatus = vectorizationStatus[filename]
              const isVectorizing =
                fileVecStatus?.status === 'pending' || fileVecStatus?.status === 'processing'
              const vectorizationFailed = fileVecStatus?.status === 'failed'
              const vectorizationCompleted = fileVecStatus?.status === 'completed'

              return (
                <div key={index} className={styles.uploadedFileCard}>
                  <div className={styles.uploadedFileContent}>
                    <div className={styles.fileIconBadge} data-extension={fileExtension}>
                      {fileExtension}
                    </div>
                    <div className={styles.fileDetails}>
                      <p className={styles.uploadedFileName} title={filename}>
                        {filename}
                      </p>
                      <div className={styles.fileMetadata}>
                        {isVectorizing ? (
                          <span className={styles.fileStatus} style={{ color: '#2563eb' }}>
                            <Loader2 size={12} className={styles.spinningIcon} />
                            Vectorizing...
                            {fileVecStatus?.total_chunks > 0 && (
                              <span style={{ marginLeft: '4px', fontSize: '11px' }}>
                                ({fileVecStatus.chunks_processed}/{fileVecStatus.total_chunks})
                              </span>
                            )}
                          </span>
                        ) : vectorizationFailed ? (
                          <span className={styles.fileStatus} style={{ color: '#dc2626' }}>
                            <AlertTriangle size={12} />
                            Vectorization failed
                          </span>
                        ) : (
                          <span className={styles.fileStatus}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <circle cx="6" cy="6" r="6" fill="#10b981" />
                              <path
                                d="M3.5 6l1.5 1.5 3-3"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            {vectorizationCompleted ? 'Ready' : 'Uploaded'}
                          </span>
                        )}
                        <span className={styles.fileDivider}>•</span>
                        <span className={styles.fileType}>Reference document</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteReferenceFile(filename)}
                      className={styles.deleteFileButtonCompact}
                      title="Delete file"
                      aria-label={`Delete ${filename}`}
                      disabled={isVectorizing}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path
                          d="M5 7v7m3-7v7m3-7v7M3 5h12M8 3h2a1 1 0 011 1v1H7V4a1 1 0 011-1z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
            {/* Add more files button */}
            {getUploadedFileCount('reference-proposals') < MAX_FILES_PER_SECTION && (
              <div className={styles.addMoreFiles}>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={e => handleReferenceFileUpload(e.target.files)}
                  className={styles.hiddenInput}
                  id="reference-proposals-add"
                  disabled={isUploadingReference}
                  aria-label="Add more reference proposals"
                />
                <label htmlFor="reference-proposals-add" className={styles.uploadButtonSecondary}>
                  Add More Files ({getUploadedFileCount('reference-proposals')}/
                  {MAX_FILES_PER_SECTION})
                </label>
              </div>
            )}
            {getUploadedFileCount('reference-proposals') >= MAX_FILES_PER_SECTION && (
              <div className={styles.infoMessage} role="alert">
                <p>
                  Maximum {MAX_FILES_PER_SECTION} files reached. Delete a file to upload another.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Upload Error Message */}
        {referenceUploadError && (
          <div className={styles.errorMessage} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{referenceUploadError}</span>
          </div>
        )}
      </section>

      {/* ===== Existing Work Section ===== */}
      <section className={styles.uploadSection} aria-labelledby="existing-work-title">
        <div className={styles.uploadSectionHeader}>
          <Briefcase color="#9F1239" size={20} aria-hidden="true" />
          <div className={styles.uploadSectionInfo}>
            <h3 id="existing-work-title" className={styles.uploadSectionTitle}>
              Existing Work &amp; Experience
            </h3>
            <p className={styles.uploadSectionDescription}>
              Describe your organization&apos;s relevant experience, ongoing projects, and previous
              work that relates to this call. You can write text or upload documents (max 3 files,
              5MB each).
            </p>
          </div>
        </div>

        <textarea
          className={styles.textArea}
          placeholder="Describe your relevant experience, ongoing projects, previous work with similar donors, institutional strengths, partnerships, and any preliminary research or activities related to this call..."
          value={formData.textInputs['existing-work'] || ''}
          onChange={e => handleTextChange('existing-work', e.target.value)}
          disabled={
            ((workTextSaved && !isEditingWorkText) ||
              isSavingWorkText ||
              getUploadedFileCount('supporting-docs') > 0) as boolean
          }
          aria-label="Existing work and experience"
        />

        {getUploadedFileCount('supporting-docs') > 0 && (
          <div className={styles.infoMessage} role="alert">
            <p>
              You have uploaded supporting documents. To use text input instead, please delete the
              documents first.
            </p>
          </div>
        )}

        <div className={styles.textAreaFooter}>
          <div>
            <span className={styles.textAreaHint}>
              Please provide more detail (minimum 50 characters)
            </span>
            <span className={styles.textAreaCount}>
              {(formData.textInputs['existing-work'] || '').length} characters
            </span>
          </div>

          <div className={styles.textAreaActions}>
            {!workTextSaved ? (
              <button
                onClick={handleSaveWorkText}
                disabled={
                  isSavingWorkText || (formData.textInputs['existing-work'] || '').length < 50
                }
                className={styles.saveButton}
                aria-label="Save work text"
              >
                {isSavingWorkText ? 'Saving...' : 'Save Text'}
              </button>
            ) : (
              <>
                <span className={styles.savedIndicator} aria-live="polite">
                  Text saved
                </span>
                <button
                  onClick={handleEditWorkText}
                  className={styles.editButton}
                  aria-label="Edit work text"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteWorkText}
                  className={styles.deleteButton}
                  aria-label="Delete work text"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {workUploadError && (
          <div className={styles.errorMessage} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{workUploadError}</span>
          </div>
        )}

        {/* Supporting Documents */}
        <div className={styles.supportingDocs}>
          <h4 className={styles.supportingDocsTitle}>Supporting Documents (Optional)</h4>
          <p className={styles.supportingDocsDescription}>
            Upload additional documents like organizational profiles, previous project reports, or
            technical papers.
          </p>

          {(formData.textInputs['existing-work'] || '').length > 0 && (
            <div className={styles.infoMessage} role="alert">
              <p>
                You have text in the existing work field. To upload documents instead, please clear
                the text first.
              </p>
            </div>
          )}

          {getUploadedFileCount('supporting-docs') === 0 ? (
            <div
              className={`${styles.uploadAreaSmall} ${isDraggingSupporting ? styles.uploadAreaDragging : ''}`}
              onDragOver={handleSupportingDragOver}
              onDragLeave={handleSupportingDragLeave}
              onDrop={handleSupportingDrop}
            >
              {isUploadingSupporting ? (
                <>
                  <div className={styles.uploadingSpinner} aria-live="polite">
                    <div className={styles.uploadSpinner}></div>
                  </div>
                  <p className={styles.uploadAreaTitle}>Uploading supporting file...</p>
                </>
              ) : (
                <>
                  <FileText className={styles.uploadAreaIcon} size={24} aria-hidden="true" />
                  <p className={styles.uploadAreaTitle}>Drop supporting files here</p>
                  <p className={styles.uploadAreaDescription}>
                    Supports PDF, DOCX files (max 3 files, 5MB each)
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={e => handleSupportingFileUpload(e.target.files)}
                    className={styles.hiddenInput}
                    id="supporting-docs"
                    disabled={isUploadingSupporting}
                    aria-label="Upload supporting documents"
                  />
                  <label htmlFor="supporting-docs" className={styles.uploadButtonSecondary}>
                    Choose File
                  </label>
                </>
              )}
            </div>
          ) : (
            <div className={styles.uploadedFilesList}>
              {/* Show uploading indicator when adding more files */}
              {isUploadingSupporting && (
                <div className={styles.uploadingFileCard}>
                  <div className={styles.uploadingSpinner} aria-live="polite">
                    <div className={styles.uploadSpinner}></div>
                  </div>
                  <p className={styles.uploadingText}>Uploading and processing file...</p>
                </div>
              )}

              {(formData.uploadedFiles['supporting-docs'] || []).map((file, index) => {
                const filename = typeof file === 'string' ? file : file.name
                const fileExtension = filename.split('.').pop()?.toUpperCase() || 'FILE'
                const fileVecStatus = vectorizationStatus[filename]
                const isVectorizing =
                  fileVecStatus?.status === 'pending' || fileVecStatus?.status === 'processing'
                const vectorizationFailed = fileVecStatus?.status === 'failed'
                const vectorizationCompleted = fileVecStatus?.status === 'completed'

                return (
                  <div key={index} className={styles.uploadedFileCard}>
                    <div className={styles.uploadedFileContent}>
                      <div className={styles.fileIconBadge} data-extension={fileExtension}>
                        {fileExtension}
                      </div>
                      <div className={styles.fileDetails}>
                        <p className={styles.uploadedFileName} title={filename}>
                          {filename}
                        </p>
                        <div className={styles.fileMetadata}>
                          {isVectorizing ? (
                            <span className={styles.fileStatus} style={{ color: '#2563eb' }}>
                              <Loader2 size={12} className={styles.spinningIcon} />
                              Vectorizing...
                              {fileVecStatus?.total_chunks > 0 && (
                                <span style={{ marginLeft: '4px', fontSize: '11px' }}>
                                  ({fileVecStatus.chunks_processed}/{fileVecStatus.total_chunks})
                                </span>
                              )}
                            </span>
                          ) : vectorizationFailed ? (
                            <span className={styles.fileStatus} style={{ color: '#dc2626' }}>
                              <AlertTriangle size={12} />
                              Vectorization failed
                            </span>
                          ) : (
                            <span className={styles.fileStatus}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="6" fill="#10b981" />
                                <path
                                  d="M3.5 6l1.5 1.5 3-3"
                                  stroke="white"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              {vectorizationCompleted ? 'Ready' : 'Uploaded'}
                            </span>
                          )}
                          <span className={styles.fileDivider}>•</span>
                          <span className={styles.fileType}>Supporting document</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSupportingFile(filename)}
                        className={styles.deleteFileButtonCompact}
                        title="Delete file"
                        aria-label={`Delete ${filename}`}
                        disabled={isVectorizing}
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                          <path
                            d="M5 7v7m3-7v7m3-7v7M3 5h12M8 3h2a1 1 0 011 1v1H7V4a1 1 0 011-1z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
              {/* Add more files button */}
              {getUploadedFileCount('supporting-docs') < MAX_FILES_PER_SECTION && (
                <div className={styles.addMoreFiles}>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={e => handleSupportingFileUpload(e.target.files)}
                    className={styles.hiddenInput}
                    id="supporting-docs-add"
                    disabled={isUploadingSupporting}
                    aria-label="Add more supporting documents"
                  />
                  <label htmlFor="supporting-docs-add" className={styles.uploadButtonSecondary}>
                    Add More Files ({getUploadedFileCount('supporting-docs')}/
                    {MAX_FILES_PER_SECTION})
                  </label>
                </div>
              )}
              {getUploadedFileCount('supporting-docs') >= MAX_FILES_PER_SECTION && (
                <div className={styles.infoMessage} role="alert">
                  <p>
                    Maximum {MAX_FILES_PER_SECTION} files reached. Delete a file to upload another.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ===== Initial Concept Section ===== */}
      <section className={styles.uploadSection} aria-labelledby="concept-section-title">
        <div className={styles.uploadSectionHeader}>
          <Lightbulb color="#2563EB" size={20} aria-hidden="true" />
          <div className={styles.uploadSectionInfo}>
            <h3 id="concept-section-title" className={styles.uploadSectionTitle}>
              Initial Concept or Direction<span className={styles.requiredAsterisk}>*</span>
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
                    <div className={styles.uploadSpinner}></div>
                  </div>
                  <p className={styles.uploadAreaTitle}>Uploading concept file...</p>
                </>
              ) : (
                <>
                  <FileText className={styles.uploadAreaIcon} size={24} aria-hidden="true" />
                  <p className={styles.uploadAreaTitle}>Drop concept document here</p>
                  <p className={styles.uploadAreaDescription}>
                    Supports PDF, DOCX, and TXT files up to 10MB
                  </p>
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

      {/* ===== Delete Confirmation Modal ===== */}
      {fileToDelete && (
        <div
          className={styles.modalOverlay}
          onClick={() => !isDeletingFile && setFileToDelete(null)}
        >
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrapper}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={styles.modalIcon}
                >
                  <path
                    d="M7 10v8m4-8v8m4-8v8M5 6h14M10 4h4a1 1 0 011 1v1H9V5a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h3 className={styles.modalTitle}>Delete File</h3>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalText}>
                Are you sure you want to delete <strong>{fileToDelete.filename}</strong>?
              </p>
              <p className={styles.modalSubtext}>
                This action cannot be undone. The file will be permanently removed from your
                proposal.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setFileToDelete(null)}
                className={styles.modalButtonSecondary}
                disabled={isDeletingFile}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFile}
                className={styles.modalButtonDanger}
                disabled={isDeletingFile}
              >
                {isDeletingFile ? (
                  <>
                    <div className={styles.buttonSpinner}></div>
                    Deleting...
                  </>
                ) : (
                  'Delete File'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
