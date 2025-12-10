import { useState, useRef, useCallback, useEffect } from 'react'
import { useToast } from '@/shared/hooks/useToast'
import {
  Upload,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { StepProps } from './stepConfig'
import { proposalService } from '../services/proposalService'
import AnalysisProgressModal from '@/tools/proposal-writer/components/AnalysisProgressModal'
import styles from './step4-review.module.css'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DraftFeedbackAnalysis {
  overall_assessment?: string
  sections?: Array<{
    title: string
    status: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT'
    feedback: string
    suggestions: string[]
  }>
  summary_stats?: {
    excellent_count: number
    good_count: number
    needs_improvement_count: number
  }
}

interface Step4Props extends StepProps {
  proposalId?: string
  uploadedDraftFiles?: string[]
  draftFeedbackAnalysis?: DraftFeedbackAnalysis
  onFeedbackAnalyzed?: (analysis: DraftFeedbackAnalysis) => void
  onFilesChanged?: (files: string[]) => void
}

interface UploadedFile {
  name: string
  size: number
  file?: File
}

type FeedbackStatus = 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT'

interface SectionFeedback {
  id: string
  title: string
  status: FeedbackStatus
  aiFeedback: string
  suggestions: string[]
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<FeedbackStatus, {
  label: string
  bgColor: string
  borderColor: string
  textColor: string
  icon: typeof CheckCircle | typeof AlertTriangle
}> = {
  EXCELLENT: {
    label: 'EXCELLENT',
    bgColor: '#DCFCE7',
    borderColor: '#B9F8CF',
    textColor: '#016630',
    icon: CheckCircle,
  },
  GOOD: {
    label: 'GOOD',
    bgColor: '#DBEAFE',
    borderColor: '#BEDBFF',
    textColor: '#193CB8',
    icon: CheckCircle,
  },
  NEEDS_IMPROVEMENT: {
    label: 'NEEDS IMPROVEMENT',
    bgColor: '#FFEDD4',
    borderColor: '#FFD6A7',
    textColor: '#9F2D00',
    icon: AlertTriangle,
  },
}

const POLLING_INTERVAL = 3000 // 3 seconds
const MAX_POLLING_TIME = 300000 // 5 minutes

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function mapAnalysisToFeedback(analysis: DraftFeedbackAnalysis): SectionFeedback[] {
  if (!analysis?.sections) return []

  return analysis.sections.map((section, index) => ({
    id: String(index + 1),
    title: section.title,
    status: section.status,
    aiFeedback: section.feedback,
    suggestions: section.suggestions || [],
  }))
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * File Upload Zone - Drag & Drop area for uploading proposal documents
 */
interface FileUploadZoneProps {
  onFileSelect: (file: File) => void
  isDragging: boolean
  onDragEnter: () => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  isUploading: boolean
}

function FileUploadZone({
  onFileSelect,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDrop,
  isUploading
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneDragging : ''} ${isUploading ? styles.uploadZoneDisabled : ''}`}
      onDragEnter={(e) => { e.preventDefault(); if (!isUploading) onDragEnter() }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={(e) => { if (!isUploading) onDrop(e) }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileChange}
        className={styles.hiddenInput}
        disabled={isUploading}
      />
      {isUploading ? (
        <>
          <Loader2 className={`${styles.uploadIcon} ${styles.spinning}`} size={48} />
          <p className={styles.uploadText}>Uploading...</p>
        </>
      ) : (
        <>
          <Upload className={styles.uploadIcon} size={48} />
          <p className={styles.uploadText}>
            Drop your proposal file here or click to upload
          </p>
          <p className={styles.uploadSubtext}>
            Supports PDF, DOC, DOCX files up to 20MB
          </p>
          <button
            type="button"
            className={styles.chooseFileButton}
            onClick={handleClick}
          >
            Choose File
          </button>
        </>
      )}
    </div>
  )
}

/**
 * Uploaded File Card - Shows the uploaded file with options to remove or replace
 */
interface UploadedFileCardProps {
  file: UploadedFile
  onRemove: () => void
  onUploadNewVersion: () => void
  isDeleting: boolean
  isAnalyzing: boolean
}

function UploadedFileCard({
  file,
  onRemove,
  onUploadNewVersion,
  isDeleting,
  isAnalyzing
}: UploadedFileCardProps) {
  return (
    <div className={styles.uploadedFileContainer}>
      <div className={styles.uploadedFileCard}>
        <div className={styles.uploadedFileInfo}>
          <FileText className={styles.fileIcon} size={24} />
          <div className={styles.fileDetails}>
            <p className={styles.fileName}>{file.name}</p>
            {file.size > 0 && (
              <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          disabled={isDeleting || isAnalyzing}
        >
          {isDeleting ? (
            <Loader2 size={16} className={styles.spinning} />
          ) : (
            <X size={16} />
          )}
          {isDeleting ? 'Removing...' : 'Remove'}
        </button>
      </div>
      <button
        type="button"
        className={styles.uploadNewVersionButton}
        onClick={onUploadNewVersion}
        disabled={isDeleting || isAnalyzing}
      >
        <Upload size={16} />
        Upload New Version
      </button>
    </div>
  )
}

/**
 * Section Feedback Item - Expandable section showing AI feedback
 */
interface SectionFeedbackItemProps {
  section: SectionFeedback
  isExpanded: boolean
  onToggle: () => void
}

function SectionFeedbackItem({ section, isExpanded, onToggle }: SectionFeedbackItemProps) {
  const statusConfig = STATUS_CONFIG[section.status]
  const StatusIcon = statusConfig.icon

  return (
    <div className={`${styles.feedbackItem} ${isExpanded ? styles.feedbackItemExpanded : ''}`}>
      <button
        type="button"
        className={styles.feedbackItemHeader}
        onClick={onToggle}
      >
        <div className={styles.feedbackItemLeft}>
          <StatusIcon
            size={20}
            className={styles.statusIcon}
            style={{ color: statusConfig.textColor }}
          />
          <span className={styles.feedbackItemTitle}>{section.title}</span>
          <span
            className={styles.statusBadge}
            style={{
              backgroundColor: statusConfig.bgColor,
              borderColor: statusConfig.borderColor,
              color: statusConfig.textColor,
            }}
          >
            {statusConfig.label}
          </span>
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isExpanded && (
        <div className={styles.feedbackItemContent}>
          <div className={styles.feedbackSection}>
            <div className={styles.feedbackSectionHeader}>
              <Sparkles size={16} className={styles.feedbackSectionIcon} />
              <h4 className={styles.feedbackSectionTitle}>AI Feedback</h4>
            </div>
            <p className={styles.feedbackText}>{section.aiFeedback}</p>
          </div>

          {section.suggestions.length > 0 && (
            <div className={styles.suggestionsSection}>
              <div className={styles.feedbackSectionHeader}>
                <Lightbulb size={16} className={styles.suggestionsIcon} />
                <h4 className={styles.feedbackSectionTitle}>Suggestions</h4>
              </div>
              <ul className={styles.suggestionsList}>
                {section.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Summary Stats Card - Shows counts of section statuses
 */
interface SummaryStatsProps {
  stats: {
    excellent_count: number
    good_count: number
    needs_improvement_count: number
  }
}

function SummaryStats({ stats }: SummaryStatsProps) {
  return (
    <div className={styles.summaryStats}>
      <div className={styles.statItem} style={{ color: STATUS_CONFIG.EXCELLENT.textColor }}>
        <CheckCircle size={16} />
        <span>{stats.excellent_count} Excellent</span>
      </div>
      <div className={styles.statItem} style={{ color: STATUS_CONFIG.GOOD.textColor }}>
        <CheckCircle size={16} />
        <span>{stats.good_count} Good</span>
      </div>
      <div className={styles.statItem} style={{ color: STATUS_CONFIG.NEEDS_IMPROVEMENT.textColor }}>
        <AlertTriangle size={16} />
        <span>{stats.needs_improvement_count} Needs Improvement</span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Step4ProposalReview({
  proposalId,
  uploadedDraftFiles = [],
  draftFeedbackAnalysis,
  onFeedbackAnalyzed,
  onFilesChanged
}: Step4Props) {
  // Toast notifications
  const { showSuccess, showError, showWarning } = useToast()

  // State
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['1'])
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [feedbackData, setFeedbackData] = useState<SectionFeedback[]>([])
  const [analysisProgress, setAnalysisProgress] = useState<{
    step: number
    totalSteps: number
    currentStepLabel: string
    overallProgress: number
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const pollingStartTimeRef = useRef<number>(0)

  // Initialize from props
  useEffect(() => {
    // Set uploaded file from props
    if (uploadedDraftFiles.length > 0) {
      setUploadedFile({
        name: uploadedDraftFiles[0],
        size: 0, // Size not available from filename
      })
    }

    // Set feedback data from props
    if (draftFeedbackAnalysis?.sections) {
      setFeedbackData(mapAnalysisToFeedback(draftFeedbackAnalysis))
    }
  }, [uploadedDraftFiles, draftFeedbackAnalysis])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  // Poll for analysis completion
  const pollAnalysisStatus = useCallback(async () => {
    if (!proposalId) return

    try {
      const status = await proposalService.getDraftFeedbackStatus(proposalId)

      // Update progress
      const elapsedTime = Date.now() - pollingStartTimeRef.current
      const progressPercent = Math.min((elapsedTime / MAX_POLLING_TIME) * 100, 95)

      setAnalysisProgress({
        step: 2,
        totalSteps: 3,
        currentStepLabel: 'Analyzing proposal sections...',
        overallProgress: progressPercent,
      })

      if (status.status === 'completed') {
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }

        setIsAnalyzing(false)
        setAnalysisProgress(null)

        // Extract and set feedback data
        const analysis = status.data?.draft_feedback_analysis
        if (analysis) {
          setFeedbackData(mapAnalysisToFeedback(analysis))
          onFeedbackAnalyzed?.(analysis)
          showSuccess('Analysis Complete', 'Draft feedback analysis completed!')
        }
      } else if (status.status === 'failed') {
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }

        setIsAnalyzing(false)
        setAnalysisProgress(null)
        showError('Analysis Failed', status.error || 'Unknown error')
      }

      // Check for timeout
      if (elapsedTime > MAX_POLLING_TIME) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        setIsAnalyzing(false)
        setAnalysisProgress(null)
        showError('Timeout', 'Analysis timed out. Please try again.')
      }
    } catch (error) {
      console.error('Error polling analysis status:', error)
    }
  }, [proposalId, onFeedbackAnalyzed])

  // Start analysis
  const startAnalysis = useCallback(async () => {
    if (!proposalId) {
      showError('Error', 'No proposal ID available')
      return
    }

    try {
      setIsAnalyzing(true)
      setAnalysisProgress({
        step: 1,
        totalSteps: 3,
        currentStepLabel: 'Starting analysis...',
        overallProgress: 10,
      })

      const result = await proposalService.analyzeDraftFeedback(proposalId)

      if (result.status === 'processing' || result.status === 'already_running') {
        // Start polling
        pollingStartTimeRef.current = Date.now()
        pollingRef.current = setInterval(pollAnalysisStatus, POLLING_INTERVAL)

        // Initial poll
        setTimeout(pollAnalysisStatus, 1000)
      } else if (result.status === 'completed') {
        // Already completed (cached)
        setIsAnalyzing(false)
        setAnalysisProgress(null)

        // Fetch the completed data
        const status = await proposalService.getDraftFeedbackStatus(proposalId)
        const analysis = status.data?.draft_feedback_analysis
        if (analysis) {
          setFeedbackData(mapAnalysisToFeedback(analysis))
          onFeedbackAnalyzed?.(analysis)
        }
        showSuccess('Analysis Complete', 'Draft feedback analysis completed!')
      }
    } catch (error: any) {
      console.error('Error starting analysis:', error)
      setIsAnalyzing(false)
      setAnalysisProgress(null)
      showError('Analysis Failed', error.response?.data?.message || 'Failed to start analysis')
    }
  }, [proposalId, pollAnalysisStatus, onFeedbackAnalyzed])

  // Handle file upload
  const handleFileSelect = useCallback(async (file: File) => {
    if (!proposalId) {
      showError('Error', 'No proposal ID available')
      return
    }

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      showError('Invalid File', 'Invalid file type. Please upload PDF, DOC, or DOCX files.')
      return
    }

    // Validate file size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      showError('File Too Large', 'File too large. Maximum size is 20MB.')
      return
    }

    try {
      setIsUploading(true)

      const result = await proposalService.uploadDraftProposal(proposalId, file)

      if (result.success) {
        setUploadedFile({
          name: result.filename,
          size: result.size,
          file: file,
        })

        onFilesChanged?.([result.filename])
        showSuccess('Upload Complete', 'Draft uploaded successfully!')

        // Automatically start analysis after upload
        setTimeout(() => startAnalysis(), 500)
      }
    } catch (error: any) {
      console.error('Error uploading file:', error)
      showError('Upload Failed', error.response?.data?.message || 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }, [proposalId, startAnalysis, onFilesChanged])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleRemoveFile = useCallback(async () => {
    if (!proposalId || !uploadedFile) return

    try {
      setIsDeleting(true)

      await proposalService.deleteDraftProposal(proposalId, uploadedFile.name)

      setUploadedFile(null)
      setFeedbackData([])
      onFilesChanged?.([])
      showSuccess('File Removed', 'Draft removed successfully')
    } catch (error: any) {
      console.error('Error removing file:', error)
      showError('Delete Failed', error.response?.data?.message || 'Failed to remove file')
    } finally {
      setIsDeleting(false)
    }
  }, [proposalId, uploadedFile, onFilesChanged])

  const handleUploadNewVersion = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleNewVersionSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }, [])

  const handleReanalyze = useCallback(() => {
    startAnalysis()
  }, [startAnalysis])

  const handleDownloadWithFeedback = useCallback(() => {
    // TODO: Implement download with AI feedback
    showWarning('Coming Soon', 'Download with AI feedback - Coming soon!')
  }, [])

  return (
    <div className={styles.mainContent}>
      {/* Analysis Progress Modal */}
      <AnalysisProgressModal
        isOpen={isAnalyzing}
        progress={analysisProgress}
      />

      {/* Hidden input for new version upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleNewVersionSelect}
        className={styles.hiddenInput}
      />

      {/* Page Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>
          Step 4: Proposal Review
        </h1>
        <p className={styles.stepMainDescription}>
          Upload your draft for AI feedback, download with edits, and iterate until ready
        </p>
      </div>

      <div className={styles.contentContainer}>
        {/* Upload Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Upload Your Draft Proposal</h2>
            <p className={styles.cardSubtitle}>
              In case you made adjustments to the downloaded Concept Document, please upload the new version here to take it into consideration.
            </p>
          </div>

          {!uploadedFile ? (
            <FileUploadZone
              onFileSelect={handleFileSelect}
              isDragging={isDragging}
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              isUploading={isUploading}
            />
          ) : (
            <UploadedFileCard
              file={uploadedFile}
              onRemove={handleRemoveFile}
              onUploadNewVersion={handleUploadNewVersion}
              isDeleting={isDeleting}
              isAnalyzing={isAnalyzing}
            />
          )}
        </div>

        {/* Section Feedback Card - Only show after file upload */}
        {uploadedFile && (
          <div className={styles.card}>
            <div className={styles.feedbackCardHeader}>
              <div className={styles.feedbackHeaderLeft}>
                <h2 className={styles.cardTitle}>Section-by-Section Feedback</h2>
                {draftFeedbackAnalysis?.summary_stats && (
                  <SummaryStats stats={draftFeedbackAnalysis.summary_stats} />
                )}
              </div>
              <div className={styles.feedbackHeaderActions}>
                {feedbackData.length > 0 && (
                  <button
                    type="button"
                    className={styles.reanalyzeButton}
                    onClick={handleReanalyze}
                    disabled={isAnalyzing}
                  >
                    <RefreshCw size={16} className={isAnalyzing ? styles.spinning : ''} />
                    Re-analyze
                  </button>
                )}
                <button
                  type="button"
                  className={styles.downloadFeedbackButton}
                  onClick={handleDownloadWithFeedback}
                  disabled={feedbackData.length === 0}
                >
                  <Download size={16} />
                  Download with AI feedback
                </button>
              </div>
            </div>

            {feedbackData.length === 0 && !isAnalyzing ? (
              <div className={styles.noFeedbackState}>
                <Sparkles size={48} className={styles.noFeedbackIcon} />
                <p>Analysis will begin automatically after upload</p>
                <button
                  type="button"
                  className={styles.startAnalysisButton}
                  onClick={startAnalysis}
                >
                  Start Analysis
                </button>
              </div>
            ) : (
              <div className={styles.feedbackList}>
                {feedbackData.map(section => (
                  <SectionFeedbackItem
                    key={section.id}
                    section={section}
                    isExpanded={expandedSections.includes(section.id)}
                    onToggle={() => toggleSection(section.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Step4ProposalReview
