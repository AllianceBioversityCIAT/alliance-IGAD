// ============================================================================
// IMPORTS
// ============================================================================
// React Core
import { useState, useEffect, useCallback } from 'react'

// External Libraries - Icons
import { Target, CheckCircle, Check, ChevronDown, ChevronUp, Info, X, Sparkles, Award, FileText, Download, Lightbulb, Edit3, RefreshCw } from 'lucide-react'

// Document generation
import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } from 'docx'

// Local Imports
import { StepProps } from './stepConfig'
import styles from './step2-concept-review.module.css'

// Reupload Modals
import {
  ReuploadConfirmationModal,
  ConceptReuploadModal,
  ReuploadProgressModal,
  ReuploadProgress
} from '../components/ReuploadModals'

// Services
import { proposalService } from '../services/proposalService'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Props for the Step2ConceptReview component
 * Extends base StepProps with Step 2 specific properties
 */
interface Step2Props extends StepProps {
  /** AI-generated concept analysis (may be nested due to backend structure) */
  conceptAnalysis?: ConceptAnalysis | { concept_analysis: ConceptAnalysis }
  /** Generated concept document (can have various formats) */
  conceptDocument?: any | null
  /** Unique proposal identifier */
  proposalId?: string
  /** Callback to regenerate document with new selections */
  onRegenerateDocument?: (
    selectedSections: string[],
    userComments: { [key: string]: string }
  ) => void
  /** Callback when concept evaluation changes */
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  }) => void
  /** Callback when concept is re-uploaded and re-analyzed */
  onConceptReanalyzed?: (newConceptAnalysis: ConceptAnalysis) => void
  /** Callback to clear the generated concept document */
  onClearConceptDocument?: () => void
  /** Current concept file name (for display in confirmation modal) */
  currentConceptFileName?: string
}

/**
 * Represents the fit assessment between the proposal concept and donor priorities
 */
interface FitAssessment {
  /** Level of alignment (e.g., "Very strong alignment", "Moderate alignment") */
  alignment_level: string
  /** Detailed explanation of the alignment assessment */
  justification: string
  /** Confidence level in the assessment */
  confidence: string
}

/**
 * Represents a section of the proposal that needs further elaboration
 * UPDATED to include user_comment field
 */
interface SectionNeedingElaboration {
  /** Name of the section requiring elaboration */
  section: string
  /** Description of the issue or gap in the section */
  issue: string
  /** Priority level for addressing this section */
  priority: 'Critical' | 'Recommended' | 'Optional'
  /** Optional array of suggestions for improving the section */
  suggestions?: string[]
  /** Whether this section is selected for generation */
  selected?: boolean
  /** Optional user comment for this section - ADDED */
  user_comment?: string
}

/**
 * Complete analysis of the proposal concept from AI evaluation
 */
interface ConceptAnalysis {
  /** Overall fit assessment with donor priorities */
  fit_assessment: FitAssessment
  /** List of strong aspects identified in the concept */
  strong_aspects: string[]
  /** Sections that need further elaboration */
  sections_needing_elaboration: SectionNeedingElaboration[]
  /** Strategic verdict and recommendations */
  strategic_verdict: string
}

/**
 * Color configuration for alignment level badges
 * Maps alignment levels to their corresponding visual styling
 */
type AlignmentColorConfig = {
  bg: string
  border: string
  text: string
}

/**
 * Color configuration for priority badges
 * Maps priority levels to their corresponding visual styling
 */
type PriorityColorConfig = {
  bg: string
  border: string
  text: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Color mapping for different alignment levels
 * Green: Strong/Very strong alignment
 * Yellow: Moderate/Partial alignment
 * Red: Weak alignment
 */
const ALIGNMENT_COLORS: Record<string, AlignmentColorConfig> = {
  'Very strong alignment': { bg: '#DCFCE7', border: '#B9F8CF', text: '#016630' },
  'Strong alignment': { bg: '#DCFCE7', border: '#B9F8CF', text: '#016630' },
  'Moderate alignment': { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  'Partial alignment with potential for improvement': {
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#92400E',
  },
  'Weak alignment': { bg: '#FFE2E2', border: '#FFC9C9', text: '#9F0712' },
}

/**
 * Color mapping for section priority levels
 * Red: Critical priority
 * Yellow: Recommended priority
 * Blue: Optional priority
 */
const PRIORITY_COLORS: Record<'Critical' | 'Recommended' | 'Optional', PriorityColorConfig> = {
  Critical: { bg: '#FFE2E2', border: '#FFC9C9', text: '#9F0712' },
  Recommended: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  Optional: { bg: '#E0E7FF', border: '#C7D2FE', text: '#193CB8' },
}

/**
 * Default suggestions shown when a section has no specific suggestions
 */
const DEFAULT_SUGGESTIONS = [
  'Start with the end (impact) and work backwards',
  'List key assumptions that must hold true',
  'Reference evidence for why your approach will work',
]

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Custom hook to unwrap potentially nested concept analysis data
 * Backend sometimes returns data nested as concept_analysis.concept_analysis
 */
function useUnwrappedConceptAnalysis(
  rawConceptAnalysis?: ConceptAnalysis | { concept_analysis: ConceptAnalysis }
): ConceptAnalysis | undefined {
  if (!rawConceptAnalysis) {
    return undefined
  }

  // First level unwrap: check if wrapped in concept_analysis
  const hasConceptAnalysisProperty = 'concept_analysis' in rawConceptAnalysis
  let conceptAnalysis: ConceptAnalysis = hasConceptAnalysisProperty
    ? rawConceptAnalysis.concept_analysis
    : rawConceptAnalysis

  // Second level unwrap: check for double nesting
  if (
    'concept_analysis' in conceptAnalysis &&
    typeof conceptAnalysis.concept_analysis === 'object'
  ) {
    conceptAnalysis = conceptAnalysis.concept_analysis as ConceptAnalysis
  }

  return conceptAnalysis
}

/**
 * Custom hook to manage selected sections state
 * Initializes from saved data or defaults to Critical sections
 * Notifies parent component of changes via callback
 */
function useSelectedSections(
  conceptAnalysis: ConceptAnalysis | undefined,
  conceptEvaluationData?: { selectedSections: string[]; userComments?: { [key: string]: string } } | null,
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  }) => void,
  userComments?: { [key: string]: string }
): [string[], React.Dispatch<React.SetStateAction<string[]>>] {
  // Initialize selected sections from saved data OR default to Critical priority sections
  const [selectedSections, setSelectedSections] = useState<string[]>(() => {
    // Priority 1: Load from saved evaluation data (when returning to this step)
    if (conceptEvaluationData?.selectedSections) {
      return conceptEvaluationData.selectedSections
    }

    // Priority 2: Default to Critical sections (first time on this step)
    if (!conceptAnalysis?.sections_needing_elaboration) {
      return []
    }
    return conceptAnalysis.sections_needing_elaboration
      .filter(s => s.priority === 'Critical')
      .map(s => s.section)
  })

  // Notify parent component whenever selections or comments change
  useEffect(() => {
    if (onConceptEvaluationChange) {
      onConceptEvaluationChange({
        selectedSections,
        userComments: Object.keys(userComments || {}).length > 0 ? userComments : undefined,
      })
    }
  }, [selectedSections, userComments, onConceptEvaluationChange])

  return [selectedSections, setSelectedSections]
}

/**
 * Custom hook to manage expanded sections state
 * Tracks which section detail panels are currently expanded
 */
function useExpandedSections(): [string[], (sectionName: string) => void] {
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  const toggleExpansion = (sectionName: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName]
    )
  }

  return [expandedSections, toggleExpansion]
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the color configuration for an alignment level badge
 * Falls back to "Moderate alignment" if level is not found
 */
function getAlignmentColor(alignmentLevel: string): AlignmentColorConfig {
  return ALIGNMENT_COLORS[alignmentLevel] || ALIGNMENT_COLORS['Moderate alignment']
}

/**
 * Gets the color configuration for a priority badge
 */
function getPriorityColor(priority: 'Critical' | 'Recommended' | 'Optional'): PriorityColorConfig {
  return PRIORITY_COLORS[priority]
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Empty state component shown when concept analysis is not available
 * Prompts user to complete Step 1 first
 */
function EmptyState() {
  return (
    <div className={styles.mainContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>
          Step 2: Concept Review
          <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeConcept}`}>
            Concept
          </span>
        </h1>
        <p className={styles.stepMainDescription}>
          AI review of your high-level concept with fit assessment and elaboration suggestions
        </p>
      </div>
      <div className={styles.emptyState}>
        <p>Complete Step 1 to see your concept analysis</p>
      </div>
    </div>
  )
}

/**
 * Fit Assessment Card Component
 * Displays the overall alignment assessment between proposal and donor priorities
 */
function FitAssessmentCard({ fitAssessment }: { fitAssessment: FitAssessment }) {
  const alignmentColor = getAlignmentColor(fitAssessment.alignment_level)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.sectionHeader}>
          <Target className={styles.sectionIcon} size={24} />
          <div>
            <h2 className={styles.sectionTitle}>Fit Assessment</h2>
            <p className={styles.sectionSubtitle}>
              Overall alignment with donor priorities and RFP requirements
            </p>
          </div>
        </div>
        <span
          className={styles.badge}
          style={{
            backgroundColor: alignmentColor.bg,
            border: `1px solid ${alignmentColor.border}`,
            color: alignmentColor.text,
          }}
        >
          {fitAssessment.alignment_level}
        </span>
      </div>
      <div className={styles.fitAssessmentContent}>
        <p className={styles.justificationText}>{fitAssessment.justification}</p>
      </div>
    </div>
  )
}

/**
 * Strong Aspects Card Component
 * Lists the key strengths identified in the proposal concept
 */
function StrongAspectsCard({ strongAspects }: { strongAspects: string[] }) {
  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader}>
        <Award className={styles.sectionIcon} size={24} />
        <div>
          <h2 className={styles.sectionTitle}>Strong Aspects of Your Proposal</h2>
          <p className={styles.sectionSubtitle}>Key strengths identified in your initial concept</p>
        </div>
      </div>
      <div className={styles.strongAspectsList}>
        {strongAspects.map((aspect, index) => (
          <div key={index} className={styles.strongAspectItem}>
            <CheckCircle className={styles.checkIcon} size={20} />
            <span className={styles.aspectText}>{aspect}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Section Item Component
 * Represents a single section that needs elaboration
 * Includes checkbox, priority badge, and expandable details
 */
interface SectionItemProps {
  section: SectionNeedingElaboration
  isSelected: boolean
  isExpanded: boolean
  onToggleSelection: () => void
  onToggleExpansion: () => void
  userComment?: string
  onCommentChange: (comment: string) => void
}

function SectionItem({
  section,
  isSelected,
  isExpanded,
  onToggleSelection,
  onToggleExpansion,
  userComment,
  onCommentChange,
}: SectionItemProps) {
  const priorityColor = getPriorityColor(section.priority)
  const suggestions =
    section.suggestions && section.suggestions.length > 0
      ? section.suggestions
      : DEFAULT_SUGGESTIONS

  return (
    <div className={styles.sectionItem}>
      {/* Section Header - always visible */}
      <div className={styles.sectionItemHeader}>
        <div className={styles.sectionItemHeaderLeft}>
          {/* Checkbox for selection */}
          <div
            className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ''}`}
            onClick={onToggleSelection}
          >
            {isSelected && <Check size={14} color="white" />}
          </div>

          {/* Section info: title and priority badge */}
          <div className={styles.sectionItemInfo}>
            <h3 className={styles.sectionItemTitle}>{section.section}</h3>
            <span
              className={styles.badge}
              style={{
                backgroundColor: priorityColor.bg,
                border: `1px solid ${priorityColor.border}`,
                color: priorityColor.text,
              }}
            >
              {section.priority}
            </span>
          </div>
        </div>

        {/* Expand/Collapse button */}
        <button className={styles.expandButton} onClick={onToggleExpansion}>
          {isExpanded ? 'See less' : 'See more'}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded content - shown when isExpanded is true */}
      {isExpanded && (
        <div className={styles.sectionItemContent}>
          {/* Details and guidance */}
          <div className={styles.detailsSection}>
            <Info className={styles.subsectionIcon} size={16} />
            <div>
              <h4 className={styles.subsectionTitle}>Details and Guidance</h4>
              <p className={styles.subsectionText}>{section.issue}</p>
            </div>
          </div>

          {/* Suggestions */}
          <div className={styles.suggestionsSection}>
            <Lightbulb className={styles.subsectionIcon} size={16} />
            <div>
              <h4 className={styles.subsectionTitle}>Suggestions</h4>
              <ul className={styles.suggestionsList}>
                {suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* User Comments - UPDATED LABEL */}
          <div className={styles.commentsSection}>
            <Edit3 className={styles.subsectionIcon} size={16} />
            <div>
              <h4 className={styles.subsectionTitle}>Provide additional details and context</h4>
              <textarea
                className={styles.commentTextarea}
                placeholder="Add specific guidance, data points, or requirements for this section..."
                value={userComment || ''}
                onChange={(e) => onCommentChange(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Regeneration Info Banner Component
 * Displays a dismissible notification when a concept document exists,
 * informing users that changes will require regeneration
 */
function RegenerationInfoBanner() {
  const [isDismissed, setIsDismissed] = useState(false)

  // Don't render if dismissed
  if (isDismissed) {
    return null
  }

  return (
    <div className={styles.regenerationBanner}>
      <div className={styles.bannerContent}>
        <Info className={styles.bannerIcon} size={20} />
        <div className={styles.bannerText}>
          <h4 className={styles.bannerTitle}>Changes will require regeneration</h4>
          <p className={styles.bannerMessage}>
            If you change your section selections, you'll need to regenerate your concept document
            in the next step.
          </p>
        </div>
      </div>
      <button
        className={styles.bannerDismiss}
        onClick={() => setIsDismissed(true)}
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}

/**
 * Sections Needing Elaboration Card Component
 * Main interactive component where users select which sections to elaborate
 */
interface SectionsNeedingElaborationCardProps {
  sections: SectionNeedingElaboration[]
  selectedSections: string[]
  expandedSections: string[]
  onToggleSection: (sectionName: string) => void
  onToggleExpansion: (sectionName: string) => void
  hasConceptDocument?: boolean
  userComments: { [key: string]: string }
  onCommentChange: (sectionName: string, comment: string) => void
}

function SectionsNeedingElaborationCard({
  sections,
  selectedSections,
  expandedSections,
  onToggleSection,
  onToggleExpansion,
  hasConceptDocument,
  userComments,
  onCommentChange,
}: SectionsNeedingElaborationCardProps) {
  return (
    <div className={styles.sectionsCard}>
      <div className={styles.sectionsCardInner}>
        <div className={styles.sectionHeader}>
          <Sparkles className={styles.sectionIcon} size={24} />
          <div>
            <h2 className={styles.sectionTitle}>Sections Needing Elaboration</h2>
            <p className={styles.sectionSubtitle}>
              Select the sections you would like to include in the updated concept document.
              Selected sections will be automatically generated and included in your updated concept
              document in the next step.
            </p>
          </div>
        </div>

        {/* Show banner only when a concept document exists */}
        {hasConceptDocument && <RegenerationInfoBanner />}

        {/* Selection counter */}
        <div className={styles.selectionCount}>
          <strong>{selectedSections.length}</strong> sections selected
        </div>

        {/* List of sections */}
        <div className={styles.sectionsList}>
          {sections.map((section, index) => (
            <SectionItem
              key={index}
              section={section}
              isSelected={selectedSections.includes(section.section)}
              isExpanded={expandedSections.includes(section.section)}
              onToggleSelection={() => onToggleSection(section.section)}
              onToggleExpansion={() => onToggleExpansion(section.section)}
              userComment={userComments[section.section]}
              onCommentChange={(comment) => onCommentChange(section.section, comment)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Strategic Verdict Component
 * Displays the overall strategic verdict and recommendations
 * Only shown if verdict text is available
 */
function StrategicVerdict({ verdict }: { verdict?: string }) {
  if (!verdict) {
    return null
  }

  return (
    <div className={styles.verdictBox}>
      <p className={styles.verdictText}>{verdict}</p>
    </div>
  )
}

/**
 * Updated Concept Document Card Component
 * Displays the generated concept document with download, re-upload, and regenerate options
 */
interface UpdatedConceptDocumentCardProps {
  conceptDocument: any
  proposalId?: string
  onRegenerateDocument?: (selectedSections: string[], userComments: { [key: string]: string }) => void
  selectedSections: string[]
  userComments: { [key: string]: string }
  isDownloading: boolean
  onDownload: () => void
  onReuploadClick: () => void
}

function UpdatedConceptDocumentCard({
  conceptDocument,
  proposalId,
  onRegenerateDocument,
  selectedSections,
  userComments,
  isDownloading,
  onDownload,
  onReuploadClick,
}: UpdatedConceptDocumentCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerate = async () => {
    if (!proposalId || !onRegenerateDocument) {
      alert('Unable to regenerate document. Please try again.')
      return
    }

    setIsRegenerating(true)
    try {
      await onRegenerateDocument(selectedSections, userComments)
    } catch (error) {
      console.error('Regeneration error:', error)
      alert('Error regenerating document. Please try again.')
    } finally {
      setIsRegenerating(false)
    }
  }

  // Extract and parse document content
  const extractDocumentContent = (doc: any): string => {
    if (!doc) return ''
    if (typeof doc === 'string') return doc
    if (doc.generated_concept_document) return doc.generated_concept_document
    if (doc.content) return doc.content
    if (doc.document) return doc.document
    return JSON.stringify(doc, null, 2)
  }

  const formatInlineMarkdown = (text: string): string => {
    let formatted = text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')
    return formatted
  }

  const parseMarkdownToReact = (markdown: string): JSX.Element[] => {
    const lines = markdown.split('\n')
    const elements: JSX.Element[] = []
    let currentList: string[] = []
    let currentParagraph: string[] = []

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className={styles.markdownList}>
            {currentList.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
            ))}
          </ul>
        )
        currentList = []
      }
    }

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ')
        if (text.trim()) {
          elements.push(
            <p
              key={`p-${elements.length}`}
              className={styles.markdownParagraph}
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }}
            />
          )
        }
        currentParagraph = []
      }
    }

    lines.forEach((line, index) => {
      if (line.startsWith('### ')) {
        flushList()
        flushParagraph()
        elements.push(
          <h3 key={`h3-${index}`} className={styles.markdownH3}>
            {line.substring(4)}
          </h3>
        )
      } else if (line.startsWith('## ')) {
        flushList()
        flushParagraph()
        elements.push(
          <h2 key={`h2-${index}`} className={styles.markdownH2}>
            {line.substring(3)}
          </h2>
        )
      } else if (line.startsWith('# ')) {
        flushList()
        flushParagraph()
        elements.push(
          <h1 key={`h1-${index}`} className={styles.markdownH1}>
            {line.substring(2)}
          </h1>
        )
      } else if (line.match(/^[*-]\s+/)) {
        flushParagraph()
        currentList.push(line.replace(/^[*-]\s+/, ''))
      } else if (line.trim() === '') {
        flushList()
        flushParagraph()
      } else {
        flushList()
        currentParagraph.push(line)
      }
    })

    flushList()
    flushParagraph()

    return elements
  }

  return (
    <div className={styles.documentCard}>
      <div className={styles.documentHeader}>
        <div className={styles.documentHeaderLeft}>
          <FileText size={20} color="#00A63E" />
          <div>
            <h3 className={styles.documentTitle}>Updated Concept Document</h3>
            <p className={styles.documentSubtitle}>
              Review your enhanced concept document with elaborated sections
            </p>
          </div>
        </div>
      </div>

      <div className={styles.documentContent}>
        <div className={styles.markdownContent}>
          {parseMarkdownToReact(extractDocumentContent(conceptDocument))}
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.downloadButton}
          onClick={onDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <div className={styles.spinner}></div>
              Downloading...
            </>
          ) : (
            <>
              <Download size={16} />
              Download
            </>
          )}
        </button>

        <button
          className={styles.reuploadButton}
          onClick={onReuploadClick}
        >
          <RefreshCw size={16} />
          Re-upload
        </button>

        <button
          className={styles.regenerateButton}
          onClick={handleRegenerate}
          disabled={isRegenerating || selectedSections.length === 0}
        >
          {isRegenerating ? (
            <>
              <div className={styles.spinner}></div>
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Regenerate
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Step 2: Content Generation Component
 *
 * This step displays AI-generated analysis of the proposal concept, including:
 * - Fit assessment: How well the concept aligns with donor priorities
 * - Strong aspects: Key strengths identified in the concept
 * - Sections needing elaboration: Areas that need more detail (user can select which to include)
 * - Strategic verdict: Overall recommendations
 *
 * The component handles:
 * - Unwrapping potentially nested API response data
 * - Persisting user selections across navigation
 * - Default selection of Critical priority sections
 * - Expandable/collapsible section details
 */
export function Step2ConceptReview({
  conceptAnalysis: rawConceptAnalysis,
  conceptEvaluationData,
  onConceptEvaluationChange,
  conceptDocument,
  proposalId,
  onRegenerateDocument,
  onConceptReanalyzed,
  onClearConceptDocument,
  currentConceptFileName,
}: Step2Props) {
  // ========================================
  // HOOKS & STATE
  // ========================================

  // Unwrap potentially nested concept analysis data
  const conceptAnalysis = useUnwrappedConceptAnalysis(rawConceptAnalysis)

  // User comments state - tracks comments for each section
  const [userComments, setUserComments] = useState<{ [key: string]: string }>({})

  // Manage selected sections (which sections user wants to elaborate)
  const [selectedSections, setSelectedSections] = useSelectedSections(
    conceptAnalysis,
    conceptEvaluationData,
    onConceptEvaluationChange,
    userComments
  )

  // Manage expanded sections (which section details are currently visible)
  const [expandedSections, toggleExpansion] = useExpandedSections()

  // Document download state
  const [isDownloading, setIsDownloading] = useState(false)

  // ========================================
  // REUPLOAD STATE
  // ========================================
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [reuploadProgress, setReuploadProgress] = useState<ReuploadProgress>({
    stage: 'idle',
    message: 'Preparing...'
  })

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Toggles selection of a section for elaboration
   * Adds to selectedSections if not present, removes if already present
   */
  const toggleSection = (sectionName: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName]
    )
  }

  /**
   * Handles changes to user comments for a section
   * Updates the userComments state with the new comment
   */
  const handleCommentChange = (sectionName: string, comment: string) => {
    setUserComments(prev => ({
      ...prev,
      [sectionName]: comment,
    }))
  }

  // ========================================
  // REUPLOAD HANDLERS
  // ========================================

  /**
   * Opens the confirmation modal when user clicks Re-upload
   */
  const handleReuploadClick = useCallback(() => {
    setShowConfirmationModal(true)
  }, [])

  /**
   * Handles confirmation - closes confirmation modal and opens upload modal
   */
  const handleReuploadConfirm = useCallback(() => {
    setShowConfirmationModal(false)
    setShowUploadModal(true)
  }, [])

  /**
   * Handles file selection and starts the re-upload process
   */
  const handleFileSelect = useCallback(async (file: File) => {
    if (!proposalId) {
      alert('No proposal ID found. Please try again.')
      return
    }

    // Close upload modal and show progress modal
    setShowUploadModal(false)
    setShowProgressModal(true)

    try {
      // Stage 1: Uploading
      setReuploadProgress({
        stage: 'uploading',
        message: 'Uploading your new concept document to storage...'
      })

      // Delete old concept file if exists
      if (currentConceptFileName) {
        try {
          await proposalService.deleteConceptFile(proposalId, currentConceptFileName)
        } catch (error) {
          console.warn('Could not delete old concept file:', error)
          // Continue anyway - the old file may not exist
        }
      }

      // Upload new file
      await proposalService.uploadConceptFile(proposalId, file)

      // Stage 2: Replacing
      setReuploadProgress({
        stage: 'replacing',
        message: 'Replacing concept document in the system...'
      })

      // Clear the generated concept document if it exists
      if (onClearConceptDocument) {
        onClearConceptDocument()
      }

      // Stage 3: Analyzing
      setReuploadProgress({
        stage: 'analyzing',
        message: 'Running AI concept analysis... This may take a minute.'
      })

      // Start concept analysis with force=true to bypass cache and recalculate
      await proposalService.analyzeConcept(proposalId, { force: true })

      // Poll for analysis completion
      let analysisComplete = false
      let pollCount = 0
      const maxPolls = 60 // 5 minutes max (5s intervals)

      while (!analysisComplete && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        pollCount++

        const status = await proposalService.getConceptStatus(proposalId)

        if (status.status === 'completed' && status.concept_analysis) {
          analysisComplete = true

          // Stage 4: Finalizing
          setReuploadProgress({
            stage: 'finalizing',
            message: 'Updating evaluation data...'
          })

          // Notify parent component of new analysis
          if (onConceptReanalyzed) {
            onConceptReanalyzed(status.concept_analysis)
          }

          // Reset selected sections to default (Critical priority)
          const newAnalysis = status.concept_analysis
          if (newAnalysis.sections_needing_elaboration) {
            const criticalSections = newAnalysis.sections_needing_elaboration
              .filter((s: any) => s.priority === 'Critical')
              .map((s: any) => s.section)
            setSelectedSections(criticalSections)
          }

          // Clear user comments
          setUserComments({})

        } else if (status.status === 'failed' || status.error) {
          throw new Error(status.error || 'Concept analysis failed')
        }
      }

      if (!analysisComplete) {
        throw new Error('Analysis timed out. Please try again.')
      }

      // Complete
      setReuploadProgress({
        stage: 'completed',
        message: 'Your concept document has been replaced and analyzed successfully!'
      })

    } catch (error) {
      console.error('Re-upload error:', error)
      setReuploadProgress({
        stage: 'error',
        message: 'An error occurred during the re-upload process.',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }, [proposalId, currentConceptFileName, onClearConceptDocument, onConceptReanalyzed, setSelectedSections])

  /**
   * Handles retry after error
   */
  const handleRetry = useCallback(() => {
    setShowProgressModal(false)
    setReuploadProgress({ stage: 'idle', message: 'Preparing...' })
    setShowUploadModal(true)
  }, [])

  /**
   * Handles closing the progress modal
   */
  const handleProgressModalClose = useCallback(() => {
    setShowProgressModal(false)
    setReuploadProgress({ stage: 'idle', message: 'Preparing...' })
  }, [])

  // ========================================
  // DOCUMENT UTILITIES
  // ========================================

  /**
   * Extracts content from various possible document structures
   */
  const extractDocumentContent = useCallback((doc: any): string => {
    if (!doc) return ''
    if (typeof doc === 'string') return doc
    if (doc.generated_concept_document) return doc.generated_concept_document
    if (doc.content) return doc.content
    if (doc.document) return doc.document
    
    if (doc.proposal_outline && Array.isArray(doc.proposal_outline)) {
      return doc.proposal_outline
        .map((section: { section_title?: string; purpose?: string; recommended_word_count?: string; guiding_questions?: string[] }) => {
          const title = section.section_title || ''
          const purpose = section.purpose || ''
          const wordCount = section.recommended_word_count || ''
          const questions = Array.isArray(section.guiding_questions)
            ? section.guiding_questions.map((q: string) => `- ${q}`).join('\n')
            : ''
          return `## ${title}\n\n**Purpose:** ${purpose}\n\n**Recommended Word Count:** ${wordCount}\n\n**Guiding Questions:**\n${questions}`
        })
        .join('\n\n')
    }
    
    if (doc.sections && typeof doc.sections === 'object') {
      return Object.entries(doc.sections)
        .map(([key, value]) => `## ${key}\n\n${value}`)
        .join('\n\n')
    }
    
    return JSON.stringify(doc, null, 2)
  }, [])

  /**
   * Formats inline markdown (bold, italic, code)
   */
  const formatInlineMarkdown = useCallback((text: string): string => {
    let formatted = text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')
    return formatted
  }, [])

  /**
   * Parses markdown content to React elements
   */
  const parseMarkdownToReact = useCallback(
    (markdown: string): JSX.Element[] => {
      const lines = markdown.split('\n')
      const elements: JSX.Element[] = []
      let currentList: string[] = []
      let currentParagraph: string[] = []

      const flushList = () => {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`ul-${elements.length}`} className={styles.markdownList}>
              {currentList.map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
              ))}
            </ul>
          )
          currentList = []
        }
      }

      const flushParagraph = () => {
        if (currentParagraph.length > 0) {
          const text = currentParagraph.join(' ')
          if (text.trim()) {
            elements.push(
              <p
                key={`p-${elements.length}`}
                className={styles.markdownParagraph}
                dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }}
              />
            )
          }
          currentParagraph = []
        }
      }

      lines.forEach((line, index) => {
        if (line.startsWith('### ')) {
          flushList()
          flushParagraph()
          elements.push(
            <h3 key={`h3-${index}`} className={styles.markdownH3}>
              {line.substring(4)}
            </h3>
          )
        } else if (line.startsWith('## ')) {
          flushList()
          flushParagraph()
          elements.push(
            <h2 key={`h2-${index}`} className={styles.markdownH2}>
              {line.substring(3)}
            </h2>
          )
        } else if (line.startsWith('# ')) {
          flushList()
          flushParagraph()
          elements.push(
            <h1 key={`h1-${index}`} className={styles.markdownH1}>
              {line.substring(2)}
            </h1>
          )
        } else if (line.match(/^[*-]\s+/)) {
          flushParagraph()
          currentList.push(line.replace(/^[*-]\s+/, ''))
        } else if (line.trim() === '') {
          flushList()
          flushParagraph()
        } else {
          flushList()
          currentParagraph.push(line)
        }
      })

      flushList()
      flushParagraph()

      return elements
    },
    [formatInlineMarkdown]
  )

  /**
   * Converts markdown to DOCX Paragraph objects
   */
  const parseInlineFormatting = useCallback((text: string): TextRun[] => {
    const runs: TextRun[] = []
    const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|[^*`]+)/g
    const matches = text.match(regex)

    if (!matches) {
      return [new TextRun({ text })]
    }

    matches.forEach(match => {
      if (match.startsWith('**') && match.endsWith('**')) {
        // Bold text
        runs.push(new TextRun({
          text: match.slice(2, -2),
          bold: true,
        }))
      } else if (match.startsWith('*') && match.endsWith('*')) {
        // Italic text
        runs.push(new TextRun({
          text: match.slice(1, -1),
          italics: true,
        }))
      } else if (match.startsWith('`') && match.endsWith('`')) {
        // Code text
        runs.push(new TextRun({
          text: match.slice(1, -1),
          font: 'Courier New',
          color: '166534',
        }))
      } else {
        // Normal text
        runs.push(new TextRun({ text: match }))
      }
    })

    return runs
  }, [])

  const markdownToParagraphs = useCallback((markdown: string): Paragraph[] => {
    const lines = markdown.split('\n')
    const paragraphs: Paragraph[] = []

    lines.forEach(line => {
      if (line.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            children: parseInlineFormatting(line.substring(4)),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 120 },
          })
        )
      } else if (line.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            children: parseInlineFormatting(line.substring(3)),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 360, after: 160 },
          })
        )
      } else if (line.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            children: parseInlineFormatting(line.substring(2)),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 480, after: 240 },
          })
        )
      } else if (line.match(/^[*-]\s+/)) {
        const bulletText = line.replace(/^[*-]\s+/, '')
        paragraphs.push(
          new Paragraph({
            children: parseInlineFormatting(bulletText),
            bullet: { level: 0 },
            spacing: { after: 60, line: 276 },
          })
        )
      } else if (line.match(/^\s{2,}[*-]\s+/)) {
        // Nested bullet (sub-item)
        const bulletText = line.replace(/^\s{2,}[*-]\s+/, '')
        paragraphs.push(
          new Paragraph({
            children: parseInlineFormatting(bulletText),
            bullet: { level: 1 },
            spacing: { after: 60, line: 276 },
          })
        )
      } else if (line.trim() === '') {
        paragraphs.push(new Paragraph({
          text: '',
          spacing: { after: 120 }
        }))
      } else if (line.trim()) {
        paragraphs.push(
          new Paragraph({
            children: parseInlineFormatting(line.trim()),
            spacing: { after: 140, line: 276 },
          })
        )
      }
    })

    return paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: 'No content available' })]
  }, [parseInlineFormatting])

  /**
   * Handles document download as DOCX file
   */
  const handleDownloadDocument = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      setIsDownloading(true)

      try {
        const content = extractDocumentContent(conceptDocument)
        const currentDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Build document with header and formatted content
        const documentParagraphs: Paragraph[] = []

        // Add title
        documentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Updated Concept Document',
                bold: true,
                size: 32,
                color: '166534',
              })
            ],
            spacing: { after: 200 },
            alignment: AlignmentType.CENTER,
          })
        )

        // Add metadata section
        documentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: ${currentDate}`,
                size: 20,
                color: '6B7280',
              })
            ],
            spacing: { after: 100 },
            alignment: AlignmentType.CENTER,
          })
        )

        if (proposalId) {
          documentParagraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Proposal ID: ${proposalId}`,
                  size: 20,
                  color: '6B7280',
                })
              ],
              spacing: { after: 400 },
              alignment: AlignmentType.CENTER,
            })
          )
        } else {
          documentParagraphs.push(
            new Paragraph({
              text: '',
              spacing: { after: 200 }
            })
          )
        }

        // Add horizontal line separator
        documentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '═══════════════════════════════════════════════════',
                color: 'CCCCCC',
              })
            ],
            spacing: { after: 400 },
            alignment: AlignmentType.CENTER,
          })
        )

        // Add content sections
        const contentSections = markdownToParagraphs(content)
        documentParagraphs.push(...contentSections)

        // Add footer separator
        documentParagraphs.push(
          new Paragraph({
            text: '',
            spacing: { before: 400, after: 200 }
          })
        )

        documentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '═══════════════════════════════════════════════════',
                color: 'CCCCCC',
              })
            ],
            spacing: { after: 200 },
            alignment: AlignmentType.CENTER,
          })
        )

        // Add footer
        documentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Generated by IGAD Proposal Writer',
                size: 18,
                color: '9CA3AF',
                italics: true,
              })
            ],
            alignment: AlignmentType.CENTER,
          })
        )

        const doc = new Document({
          sections: [{
            children: documentParagraphs,
            properties: {
              page: {
                margin: {
                  top: 1440,  // 1 inch
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                }
              }
            }
          }],
        })

        const blob = await Packer.toBlob(doc)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `concept-document-${new Date().toISOString().slice(0, 10)}.docx`
        a.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Download error:', error)
        alert('Error generating document. Please try again.')
      } finally {
        setIsDownloading(false)
      }
    },
    [conceptDocument, extractDocumentContent, markdownToParagraphs, proposalId]
  )

  // ========================================
  // EARLY RETURNS
  // ========================================

  // Show empty state if concept analysis is not available
  if (!conceptAnalysis || !conceptAnalysis.fit_assessment) {
    return <EmptyState />
  }

  // ========================================
  // DESTRUCTURE DATA
  // ========================================

  const { fit_assessment, strong_aspects, sections_needing_elaboration, strategic_verdict } =
    conceptAnalysis

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className={styles.mainContent}>
      {/* Page Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>
          Step 2: Concept Review
          <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeConcept}`}>
            Concept
          </span>
        </h1>
        <p className={styles.stepMainDescription}>
          AI review of your high-level concept with fit assessment and elaboration suggestions
        </p>
      </div>

      <div className={styles.step2Container}>
        {/* Fit Assessment Card */}
        <FitAssessmentCard fitAssessment={fit_assessment} />

        {/* Strong Aspects Card */}
        <StrongAspectsCard strongAspects={strong_aspects} />

        {/* Sections Needing Elaboration Card */}
        <SectionsNeedingElaborationCard
          sections={sections_needing_elaboration}
          selectedSections={selectedSections}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          onToggleExpansion={toggleExpansion}
          hasConceptDocument={!!conceptDocument}
          userComments={userComments}
          onCommentChange={handleCommentChange}
        />

        {/* Strategic Verdict (if available) */}
        <StrategicVerdict verdict={strategic_verdict} />

        {/* Updated Concept Document (if available) - NEW */}
        {conceptDocument && (
          <UpdatedConceptDocumentCard
            conceptDocument={conceptDocument}
            proposalId={proposalId}
            onRegenerateDocument={onRegenerateDocument}
            selectedSections={selectedSections}
            userComments={userComments}
            isDownloading={isDownloading}
            onDownload={handleDownloadDocument}
            onReuploadClick={handleReuploadClick}
          />
        )}

        {/* Generate Updated Concept Button - only show if no document and sections selected */}
        {!conceptDocument && selectedSections.length > 0 && (
          <div className={styles.generateButtonContainer}>
            <button
              className={styles.generateConceptButton}
              onClick={() => {
                if (onRegenerateDocument) {
                  onRegenerateDocument(selectedSections, userComments)
                }
              }}
            >
              <Sparkles size={20} />
              Generate Updated Concept
            </button>
          </div>
        )}
      </div>

      {/* ========================================
          REUPLOAD MODALS
          ======================================== */}

      {/* Confirmation Modal */}
      <ReuploadConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        onConfirm={handleReuploadConfirm}
        currentFileName={currentConceptFileName}
      />

      {/* Upload Modal */}
      <ConceptReuploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onFileSelect={handleFileSelect}
      />

      {/* Progress Modal */}
      <ReuploadProgressModal
        isOpen={showProgressModal}
        progress={reuploadProgress}
        onClose={handleProgressModalClose}
        onRetry={handleRetry}
      />
    </div>
  )
}
