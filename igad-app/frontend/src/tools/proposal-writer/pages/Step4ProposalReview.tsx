import { useState, useRef, useCallback } from 'react'
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
  Lightbulb
} from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './step4-review.module.css'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Step4Props extends StepProps {
  proposalId?: string
}

interface UploadedFile {
  name: string
  size: number
  file: File
}

type FeedbackStatus = 'excellent' | 'good' | 'needs_improvement'

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

const STATUS_CONFIG = {
  excellent: {
    label: 'EXCELLENT',
    bgColor: '#DCFCE7',
    borderColor: '#B9F8CF',
    textColor: '#016630',
    icon: CheckCircle,
  },
  good: {
    label: 'GOOD',
    bgColor: '#DBEAFE',
    borderColor: '#BEDBFF',
    textColor: '#193CB8',
    icon: CheckCircle,
  },
  needs_improvement: {
    label: 'NEEDS IMPROVEMENT',
    bgColor: '#FFEDD4',
    borderColor: '#FFD6A7',
    textColor: '#9F2D00',
    icon: AlertTriangle,
  },
}

// Mock data for UI demonstration
const MOCK_FEEDBACK: SectionFeedback[] = [
  {
    id: '1',
    title: 'Theory of Change',
    status: 'needs_improvement',
    aiFeedback: 'The theory of change section needs more clarity on the causal pathway from activities to outcomes. Consider strengthening the logical connections between your interventions and expected results.',
    suggestions: [
      'Add a visual diagram showing the logical flow from inputs to impact',
      'Clarify the assumptions underlying each step of the change process',
      'Include evidence or references supporting your proposed approach',
    ],
  },
  {
    id: '2',
    title: 'Gender and Social Inclusion',
    status: 'excellent',
    aiFeedback: 'Your gender and social inclusion section is comprehensive and well-structured. It demonstrates a clear understanding of the context and proposes meaningful interventions.',
    suggestions: [
      'Consider adding specific indicators for measuring gender outcomes',
    ],
  },
  {
    id: '3',
    title: 'Sustainability and Exit Strategy',
    status: 'good',
    aiFeedback: 'The sustainability plan is solid with clear ownership transfer mechanisms. The exit strategy could benefit from more specific timelines.',
    suggestions: [
      'Add specific milestones for the transition period',
      'Include capacity building metrics for local partners',
    ],
  },
  {
    id: '4',
    title: 'Partnership Framework',
    status: 'excellent',
    aiFeedback: 'Excellent partnership framework with clear roles and responsibilities. The coordination mechanisms are well-defined.',
    suggestions: [],
  },
  {
    id: '5',
    title: 'Risk Management',
    status: 'good',
    aiFeedback: 'Good risk identification and mitigation strategies. Consider expanding on operational risks.',
    suggestions: [
      'Add contingency plans for key operational risks',
      'Include risk monitoring frequency and responsible parties',
    ],
  },
  {
    id: '6',
    title: 'Innovation and Learning Component',
    status: 'excellent',
    aiFeedback: 'Your executive summary is compelling and well-structured. It clearly articulates the problem, proposed solution, and expected impact. The language is concise and appropriate for the target audience.',
    suggestions: [
      'Consider adding a specific statistic about expected beneficiary reach in the opening paragraph',
      'Strengthen the call-to-action in the final sentence to create urgency',
      'Include one sentence on competitive advantage or unique value proposition',
    ],
  },
  {
    id: '7',
    title: 'Scalability Plan',
    status: 'excellent',
    aiFeedback: 'The scalability plan demonstrates clear thinking about growth potential and replication strategies.',
    suggestions: [],
  },
]

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
}

function FileUploadZone({
  onFileSelect,
  isDragging,
  onDragEnter,
  onDragLeave,
  onDrop
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneDragging : ''}`}
      onDragEnter={(e) => { e.preventDefault(); onDragEnter() }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />
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
}

function UploadedFileCard({ file, onRemove, onUploadNewVersion }: UploadedFileCardProps) {
  return (
    <div className={styles.uploadedFileContainer}>
      <div className={styles.uploadedFileCard}>
        <div className={styles.uploadedFileInfo}>
          <FileText className={styles.fileIcon} size={24} />
          <div className={styles.fileDetails}>
            <p className={styles.fileName}>{file.name}</p>
            <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.removeButton}
          onClick={onRemove}
        >
          <X size={16} />
          Remove
        </button>
      </div>
      <button
        type="button"
        className={styles.uploadNewVersionButton}
        onClick={onUploadNewVersion}
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function Step4ProposalReview({ proposalId }: Step4Props) {
  // State
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['6']) // Default expand one
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [feedbackData, setFeedbackData] = useState<SectionFeedback[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handlers
  const handleFileSelect = useCallback((file: File) => {
    setUploadedFile({
      name: file.name,
      size: file.size,
      file: file,
    })

    // Simulate AI analysis
    setIsAnalyzing(true)
    setTimeout(() => {
      setFeedbackData(MOCK_FEEDBACK)
      setIsAnalyzing(false)
    }, 1500)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null)
    setFeedbackData([])
  }, [])

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

  const handleDownloadWithFeedback = useCallback(() => {
    // TODO: Implement download with AI feedback
    alert('Download with AI feedback - Coming soon!')
  }, [])

  return (
    <div className={styles.mainContent}>
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
            />
          ) : (
            <UploadedFileCard
              file={uploadedFile}
              onRemove={handleRemoveFile}
              onUploadNewVersion={handleUploadNewVersion}
            />
          )}
        </div>

        {/* Section Feedback Card - Only show after file upload */}
        {uploadedFile && (
          <div className={styles.card}>
            <div className={styles.feedbackCardHeader}>
              <h2 className={styles.cardTitle}>Section-by-Section Feedback</h2>
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

            {isAnalyzing ? (
              <div className={styles.analyzingState}>
                <div className={styles.spinner}></div>
                <p>Analyzing your proposal...</p>
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
