import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useToast } from '@/shared/hooks/useToast'
import {
  Upload,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Loader2,
  TrendingUp,
  ArrowRight,
  Check,
} from 'lucide-react'
import { StepProps } from './stepConfig'
import { proposalService } from '../services/proposalService'
import AnalysisProgressModal from '@/tools/proposal-writer/components/AnalysisProgressModal'
import styles from './step4-review.module.css'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DraftFeedbackAnalysis {
  overall_assessment?: {
    overall_tag?: string
    overall_summary?: string
    key_strengths?: string[]
    key_issues?: string[]
    global_suggestions?: string[]
  }
  section_feedback?: Array<{
    section_title: string
    tag: string // 'Excellent' | 'Good' | 'Needs improvement'
    ai_feedback: string
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
  isLoading?: boolean
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

const STATUS_CONFIG: Record<
  FeedbackStatus,
  {
    label: string
    bgColor: string
    borderColor: string
    textColor: string
    icon: typeof CheckCircle | typeof AlertTriangle
  }
> = {
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
// SKELETON COMPONENT
// ============================================================================

/**
 * Loading skeleton displayed while data is being fetched
 * Provides visual feedback during initial load
 */
function Step4Skeleton() {
  return (
    <div className={styles.mainContent}>
      {/* Header Skeleton */}
      <div className={styles.stepHeader}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
      </div>

      {/* Upload Card Skeleton */}
      <div className={styles.contentContainer}>
        <div className={styles.card}>
          <div className={`${styles.skeleton} ${styles.skeletonCardTitle}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonUploadZone}`}></div>
        </div>

        {/* Feedback Card Skeleton */}
        <div className={styles.card}>
          <div className={`${styles.skeleton} ${styles.skeletonCardTitle}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>

          {/* Summary Stats Skeleton */}
          <div className={styles.skeletonStats}>
            <div className={`${styles.skeleton} ${styles.skeletonStatCircle}`}></div>
            <div className={styles.skeletonStatBars}>
              <div className={`${styles.skeleton} ${styles.skeletonStatBar}`}></div>
              <div className={`${styles.skeleton} ${styles.skeletonStatBar}`}></div>
              <div className={`${styles.skeleton} ${styles.skeletonStatBar}`}></div>
            </div>
          </div>

          {/* Section Items Skeleton */}
          <div className={styles.skeletonSections}>
            {[1, 2, 3].map(i => (
              <div key={i} className={`${styles.skeleton} ${styles.skeletonSectionItem}`}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes'
  }
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function normalizeTag(tag: string): FeedbackStatus {
  if (!tag) {
    return 'NEEDS_IMPROVEMENT'
  }
  const tagLower = tag.toLowerCase().trim()
  if (tagLower.includes('excellent')) {
    return 'EXCELLENT'
  }
  if (tagLower.includes('good')) {
    return 'GOOD'
  }
  return 'NEEDS_IMPROVEMENT'
}

function mapAnalysisToFeedback(analysis: DraftFeedbackAnalysis): SectionFeedback[] {
  if (!analysis?.section_feedback) {
    return []
  }

  return analysis.section_feedback.map((section, index) => ({
    id: String(index + 1),
    title: section.section_title,
    status: normalizeTag(section.tag),
    aiFeedback: section.ai_feedback,
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
  isUploading,
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
      onDragEnter={e => {
        e.preventDefault()
        if (!isUploading) {
          onDragEnter()
        }
      }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={e => {
        if (!isUploading) {
          onDrop(e)
        }
      }}
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
          <p className={styles.uploadText}>Drop your proposal file here or click to upload</p>
          <p className={styles.uploadSubtext}>Supports PDF, DOC, DOCX files up to 20MB</p>
          <button type="button" className={styles.chooseFileButton} onClick={handleClick}>
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
  isAnalyzing,
}: UploadedFileCardProps) {
  return (
    <div className={styles.uploadedFileContainer}>
      <div className={styles.uploadedFileCard}>
        <div className={styles.uploadedFileInfo}>
          <FileText className={styles.fileIcon} size={24} />
          <div className={styles.fileDetails}>
            <p className={styles.fileName}>{file.name}</p>
            {file.size > 0 && <p className={styles.fileSize}>{formatFileSize(file.size)}</p>}
          </div>
        </div>
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
          disabled={isDeleting || isAnalyzing}
        >
          {isDeleting ? <Loader2 size={16} className={styles.spinning} /> : <X size={16} />}
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
      <button type="button" className={styles.feedbackItemHeader} onClick={onToggle}>
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
 * Summary Stats Card - Shows counts with visual progress bars
 */
interface SummaryStatsProps {
  stats: {
    excellent_count: number
    good_count: number
    needs_improvement_count: number
  }
}

function SummaryStats({ stats }: SummaryStatsProps) {
  const total = stats.excellent_count + stats.good_count + stats.needs_improvement_count
  const excellentPercent = total > 0 ? (stats.excellent_count / total) * 100 : 0
  const goodPercent = total > 0 ? (stats.good_count / total) * 100 : 0
  const needsImprovementPercent = total > 0 ? (stats.needs_improvement_count / total) * 100 : 0

  return (
    <div className={styles.summaryStatsEnhanced}>
      {/* Circular Score */}
      <div className={styles.overallScore}>
        <div
          className={styles.scoreCircle}
          style={{
            background: `conic-gradient(
              ${STATUS_CONFIG.EXCELLENT.textColor} 0deg ${excellentPercent * 3.6}deg,
              ${STATUS_CONFIG.GOOD.textColor} ${excellentPercent * 3.6}deg ${(excellentPercent + goodPercent) * 3.6}deg,
              ${STATUS_CONFIG.NEEDS_IMPROVEMENT.textColor} ${(excellentPercent + goodPercent) * 3.6}deg 360deg
            )`,
          }}
        >
          <div className={styles.scoreInner}>
            <span className={styles.scoreNumber}>{total}</span>
            <span className={styles.scoreLabel}>Sections</span>
          </div>
        </div>
      </div>

      {/* Stats Breakdown */}
      <div className={styles.statsBreakdown}>
        <div className={styles.statRow}>
          <div className={styles.statLabel}>
            <div
              className={styles.statDot}
              style={{ background: STATUS_CONFIG.EXCELLENT.textColor }}
            />
            <span>Excellent</span>
          </div>
          <div className={styles.statBar}>
            <div
              className={styles.statBarFill}
              style={{
                width: `${excellentPercent}%`,
                background: STATUS_CONFIG.EXCELLENT.bgColor,
                borderLeft:
                  stats.excellent_count > 0
                    ? `3px solid ${STATUS_CONFIG.EXCELLENT.textColor}`
                    : 'none',
              }}
            />
          </div>
          <span className={styles.statCount}>{stats.excellent_count}</span>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statLabel}>
            <div className={styles.statDot} style={{ background: STATUS_CONFIG.GOOD.textColor }} />
            <span>Good</span>
          </div>
          <div className={styles.statBar}>
            <div
              className={styles.statBarFill}
              style={{
                width: `${goodPercent}%`,
                background: STATUS_CONFIG.GOOD.bgColor,
                borderLeft:
                  stats.good_count > 0 ? `3px solid ${STATUS_CONFIG.GOOD.textColor}` : 'none',
              }}
            />
          </div>
          <span className={styles.statCount}>{stats.good_count}</span>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statLabel}>
            <div
              className={styles.statDot}
              style={{ background: STATUS_CONFIG.NEEDS_IMPROVEMENT.textColor }}
            />
            <span>Needs Improvement</span>
          </div>
          <div className={styles.statBar}>
            <div
              className={styles.statBarFill}
              style={{
                width: `${needsImprovementPercent}%`,
                background: STATUS_CONFIG.NEEDS_IMPROVEMENT.bgColor,
                borderLeft:
                  stats.needs_improvement_count > 0
                    ? `3px solid ${STATUS_CONFIG.NEEDS_IMPROVEMENT.textColor}`
                    : 'none',
              }}
            />
          </div>
          <span className={styles.statCount}>{stats.needs_improvement_count}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Overall Assessment Card - Shows high-level feedback summary
 */
interface OverallAssessmentCardProps {
  assessment: {
    overall_tag?: string
    overall_summary?: string
    key_strengths?: string[]
    key_issues?: string[]
    global_suggestions?: string[]
  }
}

function OverallAssessmentCard({ assessment }: OverallAssessmentCardProps) {
  const { overall_tag, overall_summary, key_strengths, key_issues, global_suggestions } = assessment

  // Normalize overall tag for styling
  const getTagStyle = () => {
    if (!overall_tag) {
      return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' }
    }
    const tagLower = overall_tag.toLowerCase()
    if (tagLower.includes('excellent')) {
      return {
        bg: STATUS_CONFIG.EXCELLENT.bgColor,
        text: STATUS_CONFIG.EXCELLENT.textColor,
        border: STATUS_CONFIG.EXCELLENT.borderColor,
      }
    }
    if (tagLower.includes('good')) {
      return {
        bg: STATUS_CONFIG.GOOD.bgColor,
        text: STATUS_CONFIG.GOOD.textColor,
        border: STATUS_CONFIG.GOOD.borderColor,
      }
    }
    return {
      bg: STATUS_CONFIG.NEEDS_IMPROVEMENT.bgColor,
      text: STATUS_CONFIG.NEEDS_IMPROVEMENT.textColor,
      border: STATUS_CONFIG.NEEDS_IMPROVEMENT.borderColor,
    }
  }

  const tagStyle = getTagStyle()

  return (
    <div className={styles.overallAssessmentCard}>
      <div className={styles.overallHeader}>
        <div className={styles.overallHeaderLeft}>
          <div className={styles.overallIconWrapper}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className={styles.overallTitle}>Overall Assessment</h2>
            <p className={styles.overallSubtitle}>AI-powered analysis of your draft proposal</p>
          </div>
        </div>
        {overall_tag && (
          <span
            className={styles.overallTagBadge}
            style={{
              backgroundColor: tagStyle.bg,
              color: tagStyle.text,
              borderColor: tagStyle.border,
            }}
          >
            {overall_tag}
          </span>
        )}
      </div>

      {overall_summary && (
        <div className={styles.overallSummaryBox}>
          <p>{overall_summary}</p>
        </div>
      )}

      <div className={styles.overallGrid}>
        {/* Key Strengths */}
        {key_strengths && key_strengths.length > 0 && (
          <div className={styles.overallSection}>
            <div className={styles.overallSectionHeader}>
              <CheckCircle2 size={20} className={styles.strengthIcon} />
              <h3>Key Strengths</h3>
              <span className={styles.countBadge}>{key_strengths.length}</span>
            </div>
            <ul className={styles.strengthsList}>
              {key_strengths.map((strength, idx) => (
                <li key={idx}>
                  <Check size={16} />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Issues */}
        {key_issues && key_issues.length > 0 && (
          <div className={styles.overallSection}>
            <div className={styles.overallSectionHeader}>
              <AlertCircle size={20} className={styles.issueIcon} />
              <h3>Key Issues</h3>
              <span className={styles.countBadge}>{key_issues.length}</span>
            </div>
            <ul className={styles.issuesList}>
              {key_issues.map((issue, idx) => (
                <li key={idx}>
                  <AlertTriangle size={16} />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Global Suggestions */}
      {global_suggestions && global_suggestions.length > 0 && (
        <div className={styles.globalSuggestionsSection}>
          <div className={styles.overallSectionHeader}>
            <Lightbulb size={20} className={styles.globalSuggestionIcon} />
            <h3>Recommendations</h3>
            <span className={styles.countBadge}>{global_suggestions.length}</span>
          </div>
          <ul className={styles.globalSuggestionsList}>
            {global_suggestions.map((suggestion, idx) => (
              <li key={idx}>
                <ArrowRight size={16} />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Step4ProposalReview({
  proposalId,
  isLoading = false,
  uploadedDraftFiles = [],
  draftFeedbackAnalysis,
  onFeedbackAnalyzed,
  onFilesChanged,
}: Step4Props) {
  // Toast notifications
  const { showSuccess, showError, showWarning } = useToast()

  // State - ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['1'])
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [feedbackData, setFeedbackData] = useState<SectionFeedback[]>([])
  const [analysisProgress, setAnalysisProgress] = useState<{
    step: number
    total: number
    message: string
    description?: string
    steps?: string[]
  } | null>(null)

  // Custom steps for draft feedback analysis
  const DRAFT_FEEDBACK_STEPS = useMemo(
    () => ['Step 1: Extracting document content', 'Step 2: Analyzing proposal sections'],
    []
  )
  const DRAFT_FEEDBACK_DESCRIPTION =
    'Our AI is analyzing your draft proposal against RFP requirements to provide section-by-section feedback. This may take 2-3 minutes.'

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
    if (draftFeedbackAnalysis?.section_feedback) {
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
    if (!proposalId) {
      return
    }

    try {
      const status = await proposalService.getDraftFeedbackStatus(proposalId)

      // Update progress
      const elapsedTime = Date.now() - pollingStartTimeRef.current

      setAnalysisProgress({
        step: 2,
        total: 2,
        message: 'Analyzing Your Draft Proposal',
        description: DRAFT_FEEDBACK_DESCRIPTION,
        steps: DRAFT_FEEDBACK_STEPS,
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
        // Handle both nested (draft_feedback_analysis) and direct (section_feedback) structures
        const analysis =
          status.data?.draft_feedback_analysis ||
          (status.data?.section_feedback ? status.data : null)
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
      // Removed console.error
    }
  }, [
    proposalId,
    onFeedbackAnalyzed,
    showSuccess,
    showError,
    DRAFT_FEEDBACK_DESCRIPTION,
    DRAFT_FEEDBACK_STEPS,
  ])

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
        total: 2,
        message: 'Analyzing Your Draft Proposal',
        description: DRAFT_FEEDBACK_DESCRIPTION,
        steps: DRAFT_FEEDBACK_STEPS,
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
        // Handle both nested (draft_feedback_analysis) and direct (section_feedback) structures
        const analysis =
          status.data?.draft_feedback_analysis ||
          (status.data?.section_feedback ? status.data : null)
        if (analysis) {
          setFeedbackData(mapAnalysisToFeedback(analysis))
          onFeedbackAnalyzed?.(analysis)
        }
        showSuccess('Analysis Complete', 'Draft feedback analysis completed!')
      }
    } catch (error: unknown) {
      // Removed console.error
      setIsAnalyzing(false)
      setAnalysisProgress(null)
      showError('Analysis Failed', error.response?.data?.message || 'Failed to start analysis')
    }
  }, [
    proposalId,
    pollAnalysisStatus,
    onFeedbackAnalyzed,
    showError,
    showSuccess,
    DRAFT_FEEDBACK_STEPS,
  ])

  // Handle file upload
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!proposalId) {
        showError('Error', 'No proposal ID available')
        return
      }

      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]
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
      } catch (error: unknown) {
        // Removed console.error
        const err = error as { response?: { data?: { message?: string } } }
        showError('Upload Failed', err.response?.data?.message || 'Failed to upload file')
      } finally {
        setIsUploading(false)
      }
    },
    [proposalId, startAnalysis, onFilesChanged, showError, showSuccess]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const handleRemoveFile = useCallback(async () => {
    if (!proposalId || !uploadedFile) {
      return
    }

    try {
      setIsDeleting(true)

      await proposalService.deleteDraftProposal(proposalId, uploadedFile.name)

      setUploadedFile(null)
      setFeedbackData([])
      onFilesChanged?.([])
      showSuccess('File Removed', 'Draft removed successfully')
    } catch (error: unknown) {
      // Removed console.error
      const err = error as { response?: { data?: { message?: string } } }
      showError('Delete Failed', err.response?.data?.message || 'Failed to remove file')
    } finally {
      setIsDeleting(false)
    }
  }, [proposalId, uploadedFile, onFilesChanged, showSuccess, showError])

  const handleUploadNewVersion = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleNewVersionSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    },
    [handleFileSelect]
  )

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    )
  }, [])

  const handleReanalyze = useCallback(async () => {
    if (!proposalId) {
      showError('Error', 'No proposal ID available')
      return
    }

    try {
      // Clear existing feedback data to show fresh analysis
      setFeedbackData([])

      // Start new analysis with force flag
      setIsAnalyzing(true)
      setAnalysisProgress({
        step: 1,
        total: 2,
        message: 'Re-analyzing Your Draft Proposal',
        description:
          'Running a fresh AI analysis on your draft proposal. This will generate new feedback based on the current document.',
        steps: DRAFT_FEEDBACK_STEPS,
      })

      // Call API with force=true to bypass cache
      const result = await proposalService.analyzeDraftFeedback(proposalId, true)

      if (result.status === 'processing' || result.status === 'already_running') {
        // Start polling
        pollingStartTimeRef.current = Date.now()
        pollingRef.current = setInterval(pollAnalysisStatus, POLLING_INTERVAL)

        // Initial poll
        setTimeout(pollAnalysisStatus, 1000)
      } else if (result.status === 'completed') {
        setIsAnalyzing(false)
        setAnalysisProgress(null)

        // Fetch the new data
        const status = await proposalService.getDraftFeedbackStatus(proposalId)
        const analysis =
          status.data?.draft_feedback_analysis ||
          (status.data?.section_feedback ? status.data : null)
        if (analysis) {
          setFeedbackData(mapAnalysisToFeedback(analysis))
          onFeedbackAnalyzed?.(analysis)
        }
        showSuccess('Re-analysis Complete', 'Fresh feedback has been generated!')
      }
    } catch (error: unknown) {
      // Removed console.error
      setIsAnalyzing(false)
      setAnalysisProgress(null)
      showError('Re-analysis Failed', error.response?.data?.message || 'Failed to re-analyze')
    }
  }, [
    proposalId,
    pollAnalysisStatus,
    onFeedbackAnalyzed,
    showError,
    showSuccess,
    DRAFT_FEEDBACK_STEPS,
  ])

  const handleDownloadWithFeedback = useCallback(() => {
    // TODO: Implement download with AI feedback
    showWarning('Coming Soon', 'Download with AI feedback - Coming soon!')
  }, [showWarning])

  // Show skeleton while loading - AFTER all hooks
  if (isLoading) {
    return <Step4Skeleton />
  }

  return (
    <div className={styles.mainContent}>
      {/* Analysis Progress Modal */}
      <AnalysisProgressModal isOpen={isAnalyzing} progress={analysisProgress} />

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
        <h1 className={styles.stepMainTitle}>Step 4: Proposal Review</h1>
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
              In case you made adjustments to the downloaded Concept Document, please upload the new
              version here to take it into consideration.
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

        {/* Action Bar - Show when we have uploaded file and feedback data */}
        {uploadedFile && feedbackData.length > 0 && (
          <div className={styles.actionBar}>
            <div className={styles.actionBarLeft}>
              <Sparkles size={20} className={styles.actionBarIcon} />
              <span className={styles.actionBarText}>AI Analysis Complete</span>
            </div>
            <div className={styles.actionBarRight}>
              <button
                type="button"
                className={styles.reanalyzeButton}
                onClick={handleReanalyze}
                disabled={isAnalyzing}
              >
                <RefreshCw size={16} className={isAnalyzing ? styles.spinning : ''} />
                Re-analyze
              </button>
              <button
                type="button"
                className={styles.downloadFeedbackButton}
                onClick={handleDownloadWithFeedback}
              >
                <Download size={16} />
                Download with AI feedback
              </button>
            </div>
          </div>
        )}

        {/* Overall Assessment Card - Show when we have analysis data */}
        {uploadedFile && draftFeedbackAnalysis?.overall_assessment && feedbackData.length > 0 && (
          <OverallAssessmentCard assessment={draftFeedbackAnalysis.overall_assessment} />
        )}

        {/* Section Feedback Card - Only show after file upload */}
        {uploadedFile && (
          <div className={styles.card}>
            <div className={styles.feedbackCardHeader}>
              <h2 className={styles.cardTitle}>Section-by-Section Feedback</h2>
              {draftFeedbackAnalysis?.summary_stats && feedbackData.length > 0 && (
                <SummaryStats stats={draftFeedbackAnalysis.summary_stats} />
              )}
            </div>

            {feedbackData.length === 0 && !isAnalyzing ? (
              <div className={styles.noFeedbackState}>
                <div className={styles.emptyStateIcon}>
                  <Sparkles size={48} />
                </div>
                <h3 className={styles.emptyStateTitle}>Ready to Analyze</h3>
                <p className={styles.emptyStateMessage}>
                  Upload your draft proposal to receive AI-powered section-by-section feedback
                </p>
                <button
                  type="button"
                  className={styles.startAnalysisButton}
                  onClick={startAnalysis}
                >
                  <Sparkles size={16} />
                  Start Analysis
                </button>
              </div>
            ) : (
              <>
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

                {/* Bottom action bar after reviewing all sections */}
                <div className={styles.bottomActionBar}>
                  <div className={styles.bottomActionBarText}>
                    <CheckCircle2 size={20} className={styles.bottomActionBarIcon} />
                    <span>Reviewed all {feedbackData.length} sections</span>
                  </div>
                  <button
                    type="button"
                    className={styles.downloadFeedbackButton}
                    onClick={handleDownloadWithFeedback}
                  >
                    <Download size={16} />
                    Download with AI feedback
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Step4ProposalReview
