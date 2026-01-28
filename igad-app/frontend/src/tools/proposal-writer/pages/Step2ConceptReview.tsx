// ============================================================================
// IMPORTS
// ============================================================================
// React Core
import { useState, useEffect, useCallback, useMemo } from 'react'

// External Libraries - Icons
import {
  Target,
  CheckCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Sparkles,
  Award,
  FileText,
  Download,
  Lightbulb,
  Edit3,
  RefreshCw,
} from 'lucide-react'

// Document generation
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'

// Local Imports
import { StepProps } from './stepConfig'
import styles from './step2-concept-review.module.css'
import { parseMarkdownToReact } from '../utils/markdownParser'

// Reupload Modals
import {
  ReuploadConfirmationModal,
  ConceptReuploadModal,
  ReuploadProgressModal,
  ReuploadProgress,
  RegenerateConfirmationModal,
} from '../components/ReuploadModals'

// Services
import { proposalService } from '../services/proposalService'

// Toast notifications
import { useToast } from '@/shared/components/ui/ToastContainer'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

import type { ConceptAnalysis, FitAssessment, SectionNeedingElaboration } from '../types/analysis'

/**
 * Props for the Step2ConceptReview component
 * Extends base StepProps with Step 2 specific properties
 */
interface Step2Props extends Omit<StepProps, 'conceptAnalysis' | 'conceptDocument'> {
  /** AI-generated concept analysis (may be nested due to backend structure) */
  conceptAnalysis?: ConceptAnalysis | { concept_analysis: ConceptAnalysis }
  /** Generated concept document (can have various formats) */
  conceptDocument?: import('../types/analysis').ConceptDocument | null
  /** Unique proposal identifier */
  proposalId?: string
  /** Callback when concept analysis changes (after regeneration) */
  onConceptAnalysisChanged?: (newAnalysis: ConceptAnalysis) => void
  /** Callback when concept document changes (after generation) */
  onConceptDocumentChanged?: (
    newDocument: import('../types/analysis').ConceptDocument | null
  ) => void
  /** Callback when concept evaluation changes (sections selected, comments) */
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  }) => void
  /** Callback when regeneration state changes (for showing progress modal) */
  onRegenerationStateChanged?: (isRegenerating: boolean) => void
  /** Current concept file name (for display in confirmation modal) */
  currentConceptFileName?: string
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
  conceptEvaluationData?: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  } | null,
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  }) => void,
  userComments?: { [key: string]: string }
): [string[], React.Dispatch<React.SetStateAction<string[]>>] {
  // Initialize selected sections from saved data OR default to Critical priority sections
  const [selectedSections, setSelectedSections] = useState<string[]>(() => {
    // Get valid section names from current concept analysis
    const validSectionNames =
      conceptAnalysis?.sections_needing_elaboration?.map(s => s.section) || []

    // Priority 1: Load from saved evaluation data (when returning to this step)
    // But filter to only include sections that still exist in current analysis
    if (conceptEvaluationData?.selectedSections) {
      const filteredSelections = conceptEvaluationData.selectedSections.filter(sectionName =>
        validSectionNames.includes(sectionName)
      )
      // If we have valid selections after filtering, use them
      if (filteredSelections.length > 0) {
        return filteredSelections
      }
      // Otherwise fall through to default behavior
    }

    // Priority 2: Default to Critical sections (first time on this step)
    if (!conceptAnalysis?.sections_needing_elaboration) {
      return []
    }
    return conceptAnalysis.sections_needing_elaboration
      .filter(s => s.priority === 'Critical')
      .map(s => s.section)
  })

  // When conceptAnalysis changes, filter selectedSections to remove any that no longer exist
  useEffect(() => {
    if (!conceptAnalysis?.sections_needing_elaboration) {
      return
    }

    const validSectionNames = conceptAnalysis.sections_needing_elaboration.map(s => s.section)

    setSelectedSections(prev => {
      const filtered = prev.filter(sectionName => validSectionNames.includes(sectionName))
      // Only update if something was actually filtered out
      if (filtered.length !== prev.length) {
        // Removed console.log`🔄 Filtered selectedSections: ${prev.length} -> ${filtered.length}`)
        return filtered
      }
      return prev
    })
  }, [conceptAnalysis?.sections_needing_elaboration])

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
                onChange={e => onCommentChange(e.target.value)}
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
            If you change your section selections, you&apos;ll need to regenerate your concept
            document in the next step.
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
              onCommentChange={comment => onCommentChange(section.section, comment)}
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
  conceptDocument: import('../types/analysis').ConceptDocument
  proposalId?: string
  onRegenerateDocument?: (
    selectedSections: string[],
    userComments: { [key: string]: string }
  ) => void
  onRegenerateAnalysis?: () => void | Promise<void>
  selectedSections: string[]
  userComments: { [key: string]: string }
  isDownloading: boolean
  onDownload: () => void
  onReuploadClick: () => void
}

function UpdatedConceptDocumentCard({
  conceptDocument,
  proposalId,
  onRegenerateDocument: _onRegenerateDocument,
  onRegenerateAnalysis,
  selectedSections,
  userComments: _userComments,
  isDownloading,
  onDownload,
  onReuploadClick,
}: UpdatedConceptDocumentCardProps) {
  const { showError } = useToast()
  const [isRegenerating, setIsRegenerating] = useState(false)

  // "Regenerate" button: re-runs entire concept analysis (Fit Assessment, Strong Aspects, Sections)
  // and clears the concept document so user can generate a new one
  const handleRegenerate = async () => {
    if (!proposalId || !onRegenerateAnalysis) {
      showError('Unable to regenerate', 'Unable to regenerate analysis. Please try again.')
      return
    }

    setIsRegenerating(true)
    try {
      await onRegenerateAnalysis()
    } catch (error) {
      // Removed console.errorRegeneration error:', error)
      showError('Regeneration failed', 'Error regenerating analysis. Please try again.')
    } finally {
      setIsRegenerating(false)
    }
  }

  // Extract and parse document content
  const extractDocumentContent = useCallback(
    (doc: import('../types/analysis').ConceptDocument | null | undefined): string => {
      if (!doc) {
        return ''
      }
      if (typeof doc === 'string') {
        return doc
      }
      if (doc.generated_concept_document) {
        return doc.generated_concept_document
      }
      if (doc.content) {
        return doc.content
      }
      if (doc.document) {
        return doc.document
      }
      return JSON.stringify(doc, null, 2)
    },
    []
  )

  const parsedContent = useMemo(() => {
    return parseMarkdownToReact(extractDocumentContent(conceptDocument), styles)
  }, [conceptDocument, extractDocumentContent])

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
        <div className={styles.markdownContent}>{parsedContent}</div>
      </div>

      <div className={styles.buttonGroup}>
        <button className={styles.downloadButton} onClick={onDownload} disabled={isDownloading}>
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

        <button className={styles.reuploadButton} onClick={onReuploadClick}>
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
  onConceptAnalysisChanged,
  onConceptDocumentChanged,
  onRegenerationStateChanged,
  currentConceptFileName,
}: Step2Props) {
  // ========================================
  // HOOKS & STATE
  // ========================================

  // Toast notifications
  const { showError } = useToast()

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

  // Regenerate confirmation modal state
  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false)

  // ========================================
  // REGENERATION & GENERATION STATE
  // ========================================
  const [, setIsRegeneratingAnalysis] = useState(false)
  const [isGeneratingDocument, setIsGeneratingDocument] = useState(false)
  const [, setProgressMessage] = useState<string | null>(null)

  // ========================================
  // REGENERATION & GENERATION HANDLERS
  // ========================================

  /**
   * Regenerates the entire concept analysis (Fit Assessment, Strong Aspects, Sections)
   * Also clears the concept document so user can generate a new one
   */
  const handleRegenerateAnalysis = useCallback(async () => {
    if (!proposalId) {
      showError('Missing proposal', 'No proposal ID found. Please try again.')
      return
    }

    setIsRegeneratingAnalysis(true)
    setProgressMessage('Regenerating concept analysis...')
    // Notify parent to show progress modal
    onRegenerationStateChanged?.(true)

    try {
      // Clear the existing concept document
      onConceptDocumentChanged?.(null)

      // Start concept analysis with force=true to bypass cache
      await proposalService.analyzeConcept(proposalId, { force: true })

      // Poll for analysis completion
      let analysisComplete = false
      let pollCount = 0
      const maxPolls = 60 // 5 minutes max (5s intervals)

      while (!analysisComplete && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 5000))
        pollCount++

        const status = await proposalService.getConceptStatus(proposalId)

        if (status.status === 'completed' && status.concept_analysis) {
          analysisComplete = true

          // Notify parent component of new analysis
          onConceptAnalysisChanged?.(status.concept_analysis)

          // Reset selected sections to default (Critical priority, or all if no Critical)
          const newAnalysis = status.concept_analysis
          if (newAnalysis.sections_needing_elaboration) {
            const allSections = newAnalysis.sections_needing_elaboration
            const criticalSections = allSections
              .filter((s: SectionNeedingElaboration) => s.priority === 'Critical')
              .map((s: SectionNeedingElaboration) => s.section)

            // If no Critical sections, select all sections by default
            const sectionsToSelect =
              criticalSections.length > 0
                ? criticalSections
                : allSections.map((s: SectionNeedingElaboration) => s.section)

            setSelectedSections(sectionsToSelect)
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
    } catch (error) {
      // Removed console.errorRegeneration error:', error)
      showError('Regeneration failed', 'Error regenerating analysis. Please try again.')
    } finally {
      setIsRegeneratingAnalysis(false)
      setProgressMessage(null)
      // Notify parent to hide progress modal
      onRegenerationStateChanged?.(false)
    }
  }, [
    proposalId,
    showError,
    onConceptDocumentChanged,
    onConceptAnalysisChanged,
    onRegenerationStateChanged,
    setSelectedSections,
  ])

  /**
   * Generates the concept document based on selected sections and user comments
   * Does NOT regenerate the analysis - only creates the document
   *
   * Flow:
   * 1. Unwrap conceptAnalysis to get sections
   * 2. Mark all sections with selected flag and user_comment
   * 3. Save concept evaluation to DynamoDB via updateConceptEvaluation
   * 4. Generate concept document
   * 5. Poll for completion
   */
  const handleGenerateDocument = useCallback(
    async (
      sections: string[] = selectedSections,
      comments: { [key: string]: string } = userComments
    ) => {
      if (!proposalId) {
        showError('Missing proposal', 'No proposal ID found. Please try again.')
        return
      }

      if (sections.length === 0) {
        showError('Missing selection', 'Please select at least one section to generate.')
        return
      }

      setIsGeneratingDocument(true)
      setProgressMessage('Preparing concept evaluation...')

      try {
        // Step 1: Unwrap conceptAnalysis (handle nested structure from backend)
        let unwrappedAnalysis = conceptAnalysis
        if (unwrappedAnalysis && 'concept_analysis' in unwrappedAnalysis) {
          unwrappedAnalysis = (unwrappedAnalysis as { concept_analysis: ConceptAnalysis })
            .concept_analysis
        }
        // Check for another level of nesting
        if (unwrappedAnalysis && 'concept_analysis' in unwrappedAnalysis) {
          unwrappedAnalysis = (
            unwrappedAnalysis as unknown as { concept_analysis: ConceptAnalysis }
          ).concept_analysis
        }

        if (!unwrappedAnalysis) {
          throw new Error('Concept analysis not found. Please complete the analysis first.')
        }

        // Removed console.log'🔍 Unwrapped concept analysis for document generation')

        // Step 2: Get all sections and mark with selected flag and user_comment
        const allSections = unwrappedAnalysis.sections_needing_elaboration || []
        const allSectionsWithSelection = allSections.map((section: SectionNeedingElaboration) => ({
          ...section,
          selected: sections.includes(section.section),
          user_comment: comments[section.section] || '',
        }))

        // Step 4: Prepare update payload for DynamoDB
        const userCommentsPayload: Record<string, string> = {}
        allSectionsWithSelection.forEach((section: { section: string; user_comment: string }) => {
          if (section.user_comment) {
            userCommentsPayload[section.section] = section.user_comment
          }
        })

        const updatePayload = {
          selected_sections: allSectionsWithSelection.map(
            (section: SectionNeedingElaboration & { selected: boolean }) => ({
              title: section.section,
              selected: section.selected,
              analysis: section.issue, // 'issue' maps to 'analysis' in the API
              alignment_level: section.priority,
              suggestions: section.suggestions || [],
            })
          ),
          user_comments:
            Object.keys(userCommentsPayload).length > 0 ? userCommentsPayload : undefined,
        }

        // Step 5: Save concept evaluation to DynamoDB
        setProgressMessage('Saving concept evaluation...')
        // Removed console.log'💾 Saving concept evaluation to DynamoDB...')
        await proposalService.updateConceptEvaluation(proposalId, updatePayload)
        // Removed console.log'✅ Concept evaluation saved')

        // Step 6: Start document generation
        setProgressMessage('Generating updated concept document...')
        // Removed console.log'📄 Starting document generation...')
        await proposalService.generateConceptDocument(proposalId, updatePayload)

        // Step 7: Poll for completion
        let generationComplete = false
        let pollCount = 0
        const maxPolls = 60 // 5 minutes max (5s intervals)

        while (!generationComplete && pollCount < maxPolls) {
          await new Promise(resolve => setTimeout(resolve, 5000))
          pollCount++

          const status = await proposalService.getConceptDocumentStatus(proposalId)

          if (status.status === 'completed' && status.concept_document) {
            generationComplete = true
            // Removed console.log'✅ Document generation completed')
            // Notify parent component of new document
            onConceptDocumentChanged?.(status.concept_document)
          } else if (status.status === 'failed' || status.error) {
            throw new Error(status.error || 'Document generation failed')
          }
        }

        if (!generationComplete) {
          throw new Error('Document generation timed out. Please try again.')
        }
      } catch (error) {
        // Removed console.errorDocument generation error:', error)
        showError(
          'Generation failed',
          `Error generating document: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      } finally {
        setIsGeneratingDocument(false)
        setProgressMessage(null)
      }
    },
    [
      proposalId,
      selectedSections,
      userComments,
      conceptAnalysis,
      onConceptDocumentChanged,
      showError,
    ]
  )

  // ========================================
  // REUPLOAD STATE
  // ========================================
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [reuploadProgress, setReuploadProgress] = useState<ReuploadProgress>({
    stage: 'idle',
    message: 'Preparing...',
  })

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Toggles selection of a section for elaboration
   * Adds to selectedSections if not present, removes if already present
   * Note: Document invalidation is handled by the parent's useEffect that watches conceptEvaluationData
   */
  const toggleSection = (sectionName: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName]
    )
  }

  /**
   * Handles changes to user comments for a section
   * Updates the userComments state with the new comment
   * Note: Document invalidation is handled by the parent's useEffect that watches conceptEvaluationData
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
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!proposalId) {
        showError('Missing proposal', 'No proposal ID found. Please try again.')
        return
      }

      // Close upload modal and show progress modal
      setShowUploadModal(false)
      setShowProgressModal(true)

      try {
        // Stage 1: Uploading
        setReuploadProgress({
          stage: 'uploading',
          message: 'Uploading your new concept document to storage...',
        })

        // Delete old concept file if exists
        if (currentConceptFileName) {
          try {
            await proposalService.deleteConceptFile(proposalId, currentConceptFileName)
          } catch (error) {
            // Removed console.warn
            // Continue anyway - the old file may not exist
          }
        }

        // Upload new file
        await proposalService.uploadConceptFile(proposalId, file)

        // Stage 2: Replacing
        setReuploadProgress({
          stage: 'replacing',
          message: 'Replacing concept document in the system...',
        })

        // Clear the generated concept document if it exists
        onConceptDocumentChanged?.(null)

        // Stage 3: Analyzing
        setReuploadProgress({
          stage: 'analyzing',
          message: 'Running AI concept analysis... This may take a minute.',
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
              message: 'Updating evaluation data...',
            })

            // Notify parent component of new analysis
            onConceptAnalysisChanged?.(status.concept_analysis)

            // Reset selected sections to default (Critical priority, or all if no Critical)
            const newAnalysis = status.concept_analysis
            if (newAnalysis.sections_needing_elaboration) {
              const allSections = newAnalysis.sections_needing_elaboration
              const criticalSections = allSections
                .filter((s: SectionNeedingElaboration) => s.priority === 'Critical')
                .map((s: SectionNeedingElaboration) => s.section)

              // If no Critical sections, select all sections by default
              const sectionsToSelect =
                criticalSections.length > 0
                  ? criticalSections
                  : allSections.map((s: SectionNeedingElaboration) => s.section)

              setSelectedSections(sectionsToSelect)
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
          message: 'Your concept document has been replaced and analyzed successfully!',
        })
      } catch (error) {
        // Removed console.errorRe-upload error:', error)
        setReuploadProgress({
          stage: 'error',
          message: 'An error occurred during the re-upload process.',
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        })
      }
    },
    [
      proposalId,
      currentConceptFileName,
      onConceptDocumentChanged,
      onConceptAnalysisChanged,
      setSelectedSections,
      showError,
    ]
  )

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
  const extractDocumentContent = useCallback(
    (doc: import('../types/analysis').ConceptDocument | null | undefined): string => {
      if (!doc) {
        return ''
      }
      if (typeof doc === 'string') {
        return doc
      }
      if (doc.generated_concept_document) {
        return doc.generated_concept_document
      }
      if (doc.content) {
        return doc.content
      }
      if (doc.document) {
        return doc.document
      }

      if (doc.proposal_outline && Array.isArray(doc.proposal_outline)) {
        return doc.proposal_outline
          .map(
            (section: {
              section_title?: string
              purpose?: string
              recommended_word_count?: string
              guiding_questions?: string[]
            }) => {
              const title = section.section_title || ''
              const purpose = section.purpose || ''
              const wordCount = section.recommended_word_count || ''
              const questions = Array.isArray(section.guiding_questions)
                ? section.guiding_questions.map((q: string) => `- ${q}`).join('\n')
                : ''
              return `## ${title}\n\n**Purpose:** ${purpose}\n\n**Recommended Word Count:** ${wordCount}\n\n**Guiding Questions:**\n${questions}`
            }
          )
          .join('\n\n')
      }

      if (doc.sections && typeof doc.sections === 'object') {
        return Object.entries(doc.sections)
          .map(([key, value]) => `## ${key}\n\n${value}`)
          .join('\n\n')
      }

      return JSON.stringify(doc, null, 2)
    },
    []
  )

  // Removed unused formatInlineMarkdown - it's defined in UpdatedConceptDocumentCard

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
        runs.push(
          new TextRun({
            text: match.slice(2, -2),
            bold: true,
          })
        )
      } else if (match.startsWith('*') && match.endsWith('*')) {
        // Italic text
        runs.push(
          new TextRun({
            text: match.slice(1, -1),
            italics: true,
          })
        )
      } else if (match.startsWith('`') && match.endsWith('`')) {
        // Code text
        runs.push(
          new TextRun({
            text: match.slice(1, -1),
            font: 'Courier New',
            color: '166534',
          })
        )
      } else {
        // Normal text
        runs.push(new TextRun({ text: match }))
      }
    })

    return runs
  }, [])

  const markdownToParagraphs = useCallback(
    (markdown: string): (Paragraph | Table)[] => {
      const lines = markdown.split('\n')
      const elements: (Paragraph | Table)[] = []
      let tableRows: string[][] = []
      let tableHeaders: string[] = []
      let inTable = false

      // Helper to check if line is a table row
      const isTableRow = (line: string): boolean => {
        const trimmed = line.trim()
        return trimmed.includes('|') && (trimmed.startsWith('|') || trimmed.split('|').length >= 2)
      }

      // Helper to check if line is table separator
      const isTableSeparator = (line: string): boolean => {
        const trimmed = line.trim()
        return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(trimmed)
      }

      // Helper to parse table row into cells
      const parseTableRow = (line: string): string[] => {
        return line
          .split('|')
          .map(cell => cell.trim())
          .filter((_, index, arr) => {
            if (index === 0 && arr[0] === '') {
              return false
            }
            if (index === arr.length - 1 && arr[arr.length - 1] === '') {
              return false
            }
            return true
          })
      }

      // Helper to flush table to elements
      const flushTable = () => {
        if (tableHeaders.length > 0 || tableRows.length > 0) {
          const rows: TableRow[] = []

          // Add header row
          if (tableHeaders.length > 0) {
            rows.push(
              new TableRow({
                tableHeader: true,
                children: tableHeaders.map(
                  header =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: header,
                              bold: true,
                              size: 22,
                            }),
                          ],
                        }),
                      ],
                      shading: { fill: 'F3F4F6' },
                    })
                ),
              })
            )
          }

          // Add data rows
          tableRows.forEach(row => {
            rows.push(
              new TableRow({
                children: row.map(
                  cell =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: parseInlineFormatting(cell),
                        }),
                      ],
                    })
                ),
              })
            )
          })

          // Create table with borders
          elements.push(
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows,
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
                insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              },
            })
          )

          // Add spacing after table
          elements.push(new Paragraph({ text: '', spacing: { after: 200 } }))

          tableHeaders = []
          tableRows = []
          inTable = false
        }
      }

      lines.forEach(line => {
        // Check for table rows
        if (isTableRow(line)) {
          if (isTableSeparator(line)) {
            inTable = true
            return
          }

          if (!inTable && tableHeaders.length === 0) {
            tableHeaders = parseTableRow(line)
          } else {
            inTable = true
            tableRows.push(parseTableRow(line))
          }
          return
        }

        // Flush table if we hit a non-table line
        if (inTable || tableHeaders.length > 0) {
          flushTable()
        }

        if (line.startsWith('#### ')) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.substring(5)),
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 200, after: 100 },
            })
          )
        } else if (line.startsWith('### ')) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.substring(4)),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 240, after: 120 },
            })
          )
        } else if (line.startsWith('## ')) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.substring(3)),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 360, after: 160 },
            })
          )
        } else if (line.startsWith('# ')) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.substring(2)),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 480, after: 240 },
            })
          )
        } else if (line.match(/^[*-]\s+/)) {
          const bulletText = line.replace(/^[*-]\s+/, '')
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(bulletText),
              bullet: { level: 0 },
              spacing: { after: 60, line: 276 },
            })
          )
        } else if (line.match(/^\s{2,}[*-]\s+/)) {
          const bulletText = line.replace(/^\s{2,}[*-]\s+/, '')
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(bulletText),
              bullet: { level: 1 },
              spacing: { after: 60, line: 276 },
            })
          )
        } else if (line.trim() === '') {
          elements.push(
            new Paragraph({
              text: '',
              spacing: { after: 120 },
            })
          )
        } else if (line.trim()) {
          elements.push(
            new Paragraph({
              children: parseInlineFormatting(line.trim()),
              spacing: { after: 140, line: 276 },
            })
          )
        }
      })

      // Flush any remaining table
      flushTable()

      return elements.length > 0 ? elements : [new Paragraph({ text: 'No content available' })]
    },
    [parseInlineFormatting]
  )

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
          day: 'numeric',
        })

        // Build document with header and formatted content
        const documentParagraphs: (Paragraph | Table)[] = []

        // Add title
        documentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Updated Concept Document',
                bold: true,
                size: 32,
                color: '166534',
              }),
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
              }),
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
                }),
              ],
              spacing: { after: 400 },
              alignment: AlignmentType.CENTER,
            })
          )
        } else {
          documentParagraphs.push(
            new Paragraph({
              text: '',
              spacing: { after: 200 },
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
              }),
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
            spacing: { before: 400, after: 200 },
          })
        )

        documentParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '═══════════════════════════════════════════════════',
                color: 'CCCCCC',
              }),
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
              }),
            ],
            alignment: AlignmentType.CENTER,
          })
        )

        const doc = new Document({
          sections: [
            {
              children: documentParagraphs,
              properties: {
                page: {
                  margin: {
                    top: 1440, // 1 inch
                    right: 1440,
                    bottom: 1440,
                    left: 1440,
                  },
                },
              },
            },
          ],
        })

        const blob = await Packer.toBlob(doc)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `concept-document-${new Date().toISOString().slice(0, 10)}.docx`
        a.click()
        URL.revokeObjectURL(url)
      } catch (error) {
        // Removed console.errorDownload error:', error)
        showError('Download failed', 'Error generating document. Please try again.')
      } finally {
        setIsDownloading(false)
      }
    },
    [conceptDocument, extractDocumentContent, markdownToParagraphs, proposalId, showError]
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
            onRegenerateDocument={handleGenerateDocument}
            onRegenerateAnalysis={() => setShowRegenerateConfirmModal(true)}
            selectedSections={selectedSections}
            userComments={userComments}
            isDownloading={isDownloading}
            onDownload={handleDownloadDocument}
            onReuploadClick={handleReuploadClick}
          />
        )}

        {/* Generate Updated Concept Button - show when no document exists */}
        {!conceptDocument && (
          <div className={styles.generateButtonContainer}>
            <button
              className={styles.generateConceptButton}
              onClick={() => handleGenerateDocument(selectedSections, userComments)}
              disabled={isGeneratingDocument || selectedSections.length === 0}
              title={
                selectedSections.length === 0
                  ? 'Please select at least one section to generate'
                  : ''
              }
            >
              {isGeneratingDocument ? (
                <>
                  <div className={styles.spinner}></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Updated Concept
                </>
              )}
            </button>
            {selectedSections.length === 0 && (
              <p className={styles.generateButtonHint}>
                Select at least one section above to generate the updated concept
              </p>
            )}
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

      {/* Regenerate Confirmation Modal */}
      <RegenerateConfirmationModal
        isOpen={showRegenerateConfirmModal}
        onClose={() => setShowRegenerateConfirmModal(false)}
        onConfirm={() => {
          setShowRegenerateConfirmModal(false)
          handleRegenerateAnalysis()
        }}
      />
    </div>
  )
}
