// ============================================================================
// REUPLOAD MODALS
// Modal components for concept document re-upload functionality in Step 2
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  X,
  AlertTriangle,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2
} from 'lucide-react'
import styles from './reupload-modals.module.css'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ReuploadStage =
  | 'idle'
  | 'uploading'
  | 'replacing'
  | 'analyzing'
  | 'finalizing'
  | 'completed'
  | 'error'

export interface ReuploadProgress {
  stage: ReuploadStage
  message: string
  error?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALLOWED_FILE_TYPES = ['.pdf', '.docx', '.txt']
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

const STAGE_CONFIG: Record<ReuploadStage, { label: string; icon: 'loader' | 'check' | 'error' }> = {
  idle: { label: 'Preparing...', icon: 'loader' },
  uploading: { label: 'Uploading new file to S3...', icon: 'loader' },
  replacing: { label: 'Replacing concept document...', icon: 'loader' },
  analyzing: { label: 'Running AI concept analysis...', icon: 'loader' },
  finalizing: { label: 'Updating evaluation data...', icon: 'loader' },
  completed: { label: 'Re-upload completed successfully!', icon: 'check' },
  error: { label: 'An error occurred', icon: 'error' },
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_FILE_TYPES.includes(extension) && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 2MB limit. Your file: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    }
  }

  return { valid: true }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============================================================================
// CONFIRMATION MODAL
// ============================================================================

interface ReuploadConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  currentFileName?: string
}

export function ReuploadConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  currentFileName
}: ReuploadConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className={styles.modalHeader}>
          <div className={styles.warningIcon}>
            <AlertTriangle size={28} />
          </div>
          <h2 className={styles.modalTitle}>Replace Concept Document?</h2>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.warningText}>
            You are about to replace your current concept document
            {currentFileName && <strong> "{currentFileName}"</strong>}.
          </p>

          <div className={styles.warningBox}>
            <h4>This action will:</h4>
            <ul>
              <li>Delete the current concept document from storage</li>
              <li>Upload and analyze the new document</li>
              <li>Reset all concept analysis data</li>
              <li>Clear the generated concept document (if any)</li>
            </ul>
          </div>

          <p className={styles.noteText}>
            This process may take a few minutes. Please don't close this window during the process.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            <RefreshCw size={16} />
            Replace Document
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// FILE UPLOAD MODAL
// ============================================================================

interface ConceptReuploadModalProps {
  isOpen: boolean
  onClose: () => void
  onFileSelect: (file: File) => void
}

export function ConceptReuploadModal({
  isOpen,
  onClose,
  onFileSelect
}: ConceptReuploadModalProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null)
      setValidationError(null)
      setIsDragging(false)
    }
  }, [isOpen])

  const handleFileChange = useCallback((file: File) => {
    setValidationError(null)

    const validation = validateFile(file)
    if (!validation.valid) {
      setValidationError(validation.error || 'Invalid file')
      return
    }

    setSelectedFile(file)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleUploadClick = () => {
    if (selectedFile) {
      onFileSelect(selectedFile)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setValidationError(null)
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className={styles.modalHeader}>
          <div className={styles.uploadIcon}>
            <Upload size={28} />
          </div>
          <h2 className={styles.modalTitle}>Upload New Concept Document</h2>
          <p className={styles.modalSubtitle}>
            Select a file to replace your current concept document
          </p>
        </div>

        <div className={styles.modalBody}>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleInputChange}
            className={styles.hiddenInput}
          />

          {!selectedFile ? (
            // Upload drop zone
            <div
              className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className={styles.dropZoneIcon} size={40} />
              <p className={styles.dropZoneText}>
                Drag and drop your file here
              </p>
              <p className={styles.dropZoneSubtext}>
                or click to browse
              </p>
              <div className={styles.fileRequirements}>
                <span>Supported: PDF, DOCX, TXT</span>
                <span>Max size: 2MB</span>
              </div>
            </div>
          ) : (
            // Selected file preview
            <div className={styles.selectedFileCard}>
              <div className={styles.fileInfo}>
                <FileText size={24} className={styles.fileIcon} />
                <div className={styles.fileDetails}>
                  <p className={styles.fileName}>{selectedFile.name}</p>
                  <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <button
                className={styles.removeFileButton}
                onClick={handleRemoveFile}
                aria-label="Remove file"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <div className={styles.errorMessage}>
              <XCircle size={16} />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.uploadButton}
            onClick={handleUploadClick}
            disabled={!selectedFile}
          >
            <Upload size={16} />
            Start Upload & Analysis
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PROGRESS MODAL
// ============================================================================

interface ReuploadProgressModalProps {
  isOpen: boolean
  progress: ReuploadProgress
  onClose: () => void
  onRetry?: () => void
}

export function ReuploadProgressModal({
  isOpen,
  progress,
  onClose,
  onRetry
}: ReuploadProgressModalProps) {
  const stages: ReuploadStage[] = ['uploading', 'replacing', 'analyzing', 'finalizing']
  const currentStageIndex = stages.indexOf(progress.stage)
  const isComplete = progress.stage === 'completed'
  const hasError = progress.stage === 'error'

  if (!isOpen) return null

  const renderStageIcon = (stage: ReuploadStage, index: number) => {
    const isPast = currentStageIndex > index
    const isCurrent = currentStageIndex === index
    const isError = hasError && isCurrent

    if (isError) {
      return <XCircle size={20} className={styles.stageIconError} />
    }
    if (isPast || isComplete) {
      return <CheckCircle size={20} className={styles.stageIconComplete} />
    }
    if (isCurrent) {
      return <Loader2 size={20} className={`${styles.stageIconActive} ${styles.spinning}`} />
    }
    return <div className={styles.stageIconPending} />
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Only show close button if complete or error */}
        {(isComplete || hasError) && (
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        )}

        <div className={styles.modalHeader}>
          {isComplete ? (
            <div className={styles.successIcon}>
              <CheckCircle size={48} />
            </div>
          ) : hasError ? (
            <div className={styles.errorIcon}>
              <XCircle size={48} />
            </div>
          ) : (
            <div className={styles.processingIcon}>
              <Loader2 size={48} className={styles.spinning} />
            </div>
          )}
          <h2 className={styles.modalTitle}>
            {isComplete ? 'Re-upload Complete!' : hasError ? 'Re-upload Failed' : 'Processing...'}
          </h2>
          <p className={styles.modalSubtitle}>
            {progress.message}
          </p>
        </div>

        <div className={styles.modalBody}>
          {/* Progress stages */}
          <div className={styles.progressStages}>
            {stages.map((stage, index) => (
              <div
                key={stage}
                className={`${styles.progressStage} ${
                  currentStageIndex >= index || isComplete
                    ? styles.progressStageActive
                    : ''
                } ${
                  hasError && currentStageIndex === index
                    ? styles.progressStageError
                    : ''
                }`}
              >
                <div className={styles.stageIconWrapper}>
                  {renderStageIcon(stage, index)}
                </div>
                <span className={styles.stageLabel}>
                  {STAGE_CONFIG[stage].label.replace('...', '')}
                </span>
              </div>
            ))}
          </div>

          {/* Error details */}
          {hasError && progress.error && (
            <div className={styles.errorDetails}>
              <p>{progress.error}</p>
            </div>
          )}
        </div>

        {/* Footer - only show for complete/error states */}
        {(isComplete || hasError) && (
          <div className={styles.modalFooter}>
            {hasError && onRetry && (
              <button className={styles.retryButton} onClick={onRetry}>
                <RefreshCw size={16} />
                Try Again
              </button>
            )}
            <button
              className={isComplete ? styles.confirmButton : styles.cancelButton}
              onClick={onClose}
            >
              {isComplete ? 'Done' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// REGENERATE CONFIRMATION MODAL
// ============================================================================

interface RegenerateConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function RegenerateConfirmationModal({
  isOpen,
  onClose,
  onConfirm
}: RegenerateConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className={styles.modalHeader}>
          <div className={styles.warningIcon}>
            <AlertTriangle size={28} />
          </div>
          <h2 className={styles.modalTitle}>Regenerate Concept Analysis?</h2>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.warningText}>
            This will re-analyze your concept note with AI and replace the current analysis.
          </p>

          <div className={styles.warningBox}>
            <h4>The following will be reset:</h4>
            <ul>
              <li>Your generated concept document</li>
              <li>Comments added to sections</li>
              <li>Section selections (will default to Critical)</li>
            </ul>
          </div>

          <p className={styles.noteText}>
            This process takes 1-2 minutes. Please don't close this window during the analysis.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            <RefreshCw size={16} />
            Regenerate Analysis
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ReuploadConfirmationModal,
  ConceptReuploadModal,
  ReuploadProgressModal,
  RegenerateConfirmationModal
}
