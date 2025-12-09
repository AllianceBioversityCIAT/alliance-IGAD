// ============================================================================
// IMPORTS
// ============================================================================
// React Core
import { useState, useEffect, useCallback } from 'react'

// External Libraries - Icons
import { Target, CheckCircle, Check, ChevronDown, ChevronUp, Info, X, Sparkles, Award, FileText, Download, Lightbulb, Edit3 } from 'lucide-react'

// Document generation
import { Document, Packer, Paragraph, HeadingLevel } from 'docx'

// Local Imports
import { StepProps } from './stepConfig'
import styles from './step2-concept-review.module.css'

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
}

function UpdatedConceptDocumentCard({
  conceptDocument,
  proposalId,
  onRegenerateDocument,
  selectedSections,
  userComments,
  isDownloading,
  onDownload,
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

  const handleReupload = () => {
    // TODO: Implement re-upload functionality
    alert('Re-upload functionality coming soon!')
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
          onClick={handleReupload}
        >
          <FileText size={16} />
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
        .map(section => {
          const title = section.section_title || ''
          const purpose = section.purpose || ''
          const wordCount = section.recommended_word_count || ''
          const questions = Array.isArray(section.guiding_questions)
            ? section.guiding_questions.map(q => `- ${q}`).join('\n')
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
  const markdownToParagraphs = useCallback((markdown: string): Paragraph[] => {
    const lines = markdown.split('\n')
    const paragraphs: Paragraph[] = []

    lines.forEach(line => {
      if (line.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        )
      } else if (line.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        )
      } else if (line.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          })
        )
      } else if (line.match(/^[*-]\s+/)) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^[*-]\s+/, ''),
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        )
      } else if (line.trim() === '') {
        paragraphs.push(new Paragraph({ text: '' }))
      } else if (line.trim()) {
        paragraphs.push(
          new Paragraph({
            text: line.trim(),
            spacing: { after: 100 },
          })
        )
      }
    })

    return paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: 'No content available' })]
  }, [])

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
        const sections = markdownToParagraphs(content)
        const doc = new Document({
          sections: [{ children: sections }],
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
    [conceptDocument, extractDocumentContent, markdownToParagraphs]
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
          />
        )}

        {/* Generate Updated Concept Button - only show if no document and sections selected */}
        {!conceptDocument && selectedSections.length > 0 && (
          <div className={styles.generateButtonContainer}>
            <button
              className={styles.generateConceptButton}
              onClick={async () => {
                if (onRegenerateDocument) {
                  await onRegenerateDocument(selectedSections, userComments)
                }
              }}
            >
              <Sparkles size={20} />
              Generate Updated Concept
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
