// ============================================================================
// IMPORTS
// ============================================================================
// React Core
import { useState, useEffect, useCallback } from 'react'

// External Libraries - Icons & Document Generation
import { FileText, Download, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Document, Packer, Paragraph, HeadingLevel } from 'docx'

// Local Imports
import styles from './step3-concept.module.css'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Represents a section that needs elaboration in the concept
 */
interface SectionNeedingElaboration {
  /** Name of the section */
  section: string
  /** Description of what needs to be addressed */
  issue: string
  /** Priority level for this section */
  priority: 'Critical' | 'Recommended' | 'Optional'
  /** Optional improvement suggestions */
  suggestions?: string[]
  /** Whether this section is selected for generation */
  selected?: boolean
  /** Optional user comment for this section */
  user_comment?: string
}

/**
 * Complete analysis of the proposal concept
 */
interface ConceptAnalysis {
  /** Sections that need further elaboration */
  sections_needing_elaboration: SectionNeedingElaboration[]
  /** Strategic verdict and recommendations */
  strategic_verdict?: string
  /** Strong aspects identified */
  strong_aspects?: string[]
  /** Fit assessment */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fit_assessment?: any
}

/**
 * Props for the Step3ConceptDocument component
 */
interface Step3Props {
  /** Generated concept document (can have various formats) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conceptDocument: any | null
  /** AI-generated concept analysis (may be nested) */
  conceptAnalysis?: ConceptAnalysis | { concept_analysis: ConceptAnalysis }
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
 * Color configuration for priority badges
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
 * Common document title patterns to exclude from section counting
 */
const DOCUMENT_TITLE_PATTERNS = [
  /improved concept note/i,
  /generated concept document/i,
  /concept document/i,
  /outline/i,
]

// ============================================================================
// COMPONENT
// ============================================================================

const Step3ConceptDocument: React.FC<Step3Props> = ({
  conceptDocument,
  conceptAnalysis,
  proposalId,
  onRegenerateDocument,
  onConceptEvaluationChange,
}) => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [userComments, setUserComments] = useState<{ [key: string]: string }>({})
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Unwraps potentially nested concept analysis structure
   * Handles multiple levels of nesting (concept_analysis.concept_analysis)
   *
   * @param analysis - The concept analysis object (may be nested)
   * @returns Unwrapped concept analysis
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unwrapConceptAnalysis = useCallback((analysis: any): ConceptAnalysis | undefined => {
    if (!analysis) {
      return undefined
    }

    let unwrapped = analysis.concept_analysis || analysis

    // Check for additional nesting
    if (unwrapped?.concept_analysis) {
      unwrapped = unwrapped.concept_analysis
    }

    return unwrapped
  }, [])

  /**
   * Extracts content from various possible document structures
   * Priority: generated_concept_document > content > document > proposal_outline > sections
   *
   * @param doc - The concept document object
   * @returns Extracted content as string
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractDocumentContent = useCallback((doc: any): string => {
    if (!doc) {
      return ''
    }

    // eslint-disable-next-line no-console
    console.log('📄 Extracting content from document')
    // eslint-disable-next-line no-console
    console.log('📦 Document type:', typeof doc)

    // String content
    if (typeof doc === 'string') {
      // eslint-disable-next-line no-console
      console.log('✅ Using string content')
      return doc
    }

    // New format: generated_concept_document
    if (doc.generated_concept_document) {
      // eslint-disable-next-line no-console
      console.log('✅ Using generated_concept_document field (NEW FORMAT)')
      return doc.generated_concept_document
    }

    // Content field
    if (doc.content) {
      // eslint-disable-next-line no-console
      console.log('✅ Using content field')
      return doc.content
    }

    // Document field
    if (doc.document) {
      // eslint-disable-next-line no-console
      console.log('✅ Using document field')
      return doc.document
    }

    // Proposal outline structure
    if (doc.proposal_outline && Array.isArray(doc.proposal_outline)) {
      // eslint-disable-next-line no-console
      console.log('✅ Using proposal_outline structure')
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

    // Sections object
    if (doc.sections && typeof doc.sections === 'object') {
      // eslint-disable-next-line no-console
      console.log('✅ Using sections object')
      return Object.entries(doc.sections)
        .map(([key, value]) => `## ${key}\n\n${value}`)
        .join('\n\n')
    }

    // Fallback
    // eslint-disable-next-line no-console
    console.warn('⚠️ Unknown document structure')
    return JSON.stringify(doc, null, 2)
  }, [])

  /**
   * Counts the number of sections in the document
   *
   * @returns Number of sections
   */
  const getDocumentSectionCount = useCallback((): number => {
    if (!conceptDocument) {
      return 0
    }

    // New format: check sections object first (most accurate)
    if (conceptDocument?.sections && typeof conceptDocument.sections === 'object') {
      const count = Object.keys(conceptDocument.sections).length
      // eslint-disable-next-line no-console
      console.log(`📊 Section count from sections object: ${count}`)
      return count
    }

    // Count headers in generated_concept_document
    if (conceptDocument?.generated_concept_document) {
      const headerMatches = conceptDocument.generated_concept_document.match(/^##\s+(.+)$/gm)
      if (headerMatches) {
        // Filter out document title patterns
        const contentHeaders = headerMatches.filter((header: string) => {
          const headerText = header.substring(3).trim()
          return !DOCUMENT_TITLE_PATTERNS.some(pattern => pattern.test(headerText))
        })
        const count = contentHeaders.length
        // eslint-disable-next-line no-console
        console.log(`📊 Section count from headers: ${count} (${headerMatches.length} total)`)
        return count
      }
    }

    // Old format: proposal_outline
    if (conceptDocument?.proposal_outline && Array.isArray(conceptDocument.proposal_outline)) {
      const count = conceptDocument.proposal_outline.length
      // eslint-disable-next-line no-console
      console.log(`📊 Section count from proposal_outline: ${count}`)
      return count
    }

    // Fallback to selected sections count
    const unwrapped = unwrapConceptAnalysis(conceptAnalysis)
    const sections = unwrapped?.sections_needing_elaboration || []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedCount = sections.filter((s: any) => s.selected === true).length
    // eslint-disable-next-line no-console
    console.log(`📊 Section count from selections (fallback): ${selectedCount}`)
    return selectedCount
  }, [conceptDocument, conceptAnalysis, unwrapConceptAnalysis])

  /**
   * Checks if user had a previously saved document
   *
   * @returns True if document was previously saved
   */
  const hadPreviousDocument = useCallback((): boolean => {
    if (!proposalId) {
      return false
    }
    const savedDocument = localStorage.getItem(`proposal_concept_document_${proposalId}`)
    return !!savedDocument
  }, [proposalId])

  // ============================================================================
  // MARKDOWN PARSING FUNCTIONS
  // ============================================================================

  /**
   * Formats inline markdown (bold, italic, code)
   *
   * @param text - Text with markdown syntax
   * @returns HTML-formatted text
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
   * Handles headers, lists, and paragraphs
   *
   * @param markdown - Markdown content
   * @returns Array of React elements
   */
  const parseMarkdownToReact = useCallback(
    (markdown: string): JSX.Element[] => {
      // eslint-disable-next-line no-console
      console.log('🎨 Parsing markdown to React')
      // eslint-disable-next-line no-console
      console.log(`📝 Content: ${markdown.length} chars, ${markdown.split('\n').length} lines`)

      const lines = markdown.split('\n')
      const elements: JSX.Element[] = []
      let currentList: string[] = []
      let currentParagraph: string[] = []

      /**
       * Flushes accumulated list items to elements array
       */
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

      /**
       * Flushes accumulated paragraph text to elements array
       */
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

      // Parse each line
      lines.forEach((line, index) => {
        // H3 headers
        if (line.startsWith('### ')) {
          flushList()
          flushParagraph()
          elements.push(
            <h3 key={`h3-${index}`} className={styles.markdownH3}>
              {line.substring(4)}
            </h3>
          )
        }
        // H2 headers
        else if (line.startsWith('## ')) {
          flushList()
          flushParagraph()
          elements.push(
            <h2 key={`h2-${index}`} className={styles.markdownH2}>
              {line.substring(3)}
            </h2>
          )
        }
        // H1 headers
        else if (line.startsWith('# ')) {
          flushList()
          flushParagraph()
          elements.push(
            <h1 key={`h1-${index}`} className={styles.markdownH1}>
              {line.substring(2)}
            </h1>
          )
        }
        // List items
        else if (line.match(/^[*-]\s+/)) {
          flushParagraph()
          currentList.push(line.replace(/^[*-]\s+/, ''))
        }
        // Empty lines
        else if (line.trim() === '') {
          flushList()
          flushParagraph()
        }
        // Paragraph text
        else {
          flushList()
          currentParagraph.push(line)
        }
      })

      // Flush any remaining content
      flushList()
      flushParagraph()

      // eslint-disable-next-line no-console
      console.log(`📊 Created ${elements.length} React elements`)
      return elements
    },
    [formatInlineMarkdown]
  )

  /**
   * Converts markdown to DOCX Paragraph objects for document export
   *
   * @param markdown - Markdown content
   * @returns Array of DOCX Paragraph objects
   */
  const markdownToParagraphs = useCallback((markdown: string): Paragraph[] => {
    const lines = markdown.split('\n')
    const paragraphs: Paragraph[] = []

    lines.forEach(line => {
      // H3 headers
      if (line.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        )
      }
      // H2 headers
      else if (line.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        )
      }
      // H1 headers
      else if (line.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          })
        )
      }
      // List items
      else if (line.match(/^[*-]\s+/)) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^[*-]\s+/, ''),
            bullet: { level: 0 },
            spacing: { after: 50 },
          })
        )
      }
      // Empty lines
      else if (line.trim() === '') {
        paragraphs.push(new Paragraph({ text: '' }))
      }
      // Regular paragraphs
      else if (line.trim()) {
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

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles document download as DOCX file
   * Converts markdown content to Word document format
   */
  const handleDownloadDocument = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      // eslint-disable-next-line no-console
      console.log('🔽 Download initiated')
      setIsDownloading(true)

      try {
        const content = extractDocumentContent(conceptDocument)
        // eslint-disable-next-line no-console
        console.log(`📝 Content extracted: ${content.length} characters`)

        // Convert markdown to DOCX
        const sections = markdownToParagraphs(content)
        const doc = new Document({
          sections: [{ children: sections }],
        })

        // Generate and download
        const blob = await Packer.toBlob(doc)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `concept-document-${new Date().toISOString().slice(0, 10)}.docx`
        a.click()
        URL.revokeObjectURL(url)

        // eslint-disable-next-line no-console
        console.log('✅ Download complete')
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Download error:', error)
        alert('Error generating document. Please try again.')
      } finally {
        setIsDownloading(false)
      }
    },
    [conceptDocument, extractDocumentContent, markdownToParagraphs]
  )

  /**
   * Toggles section selection for regeneration
   *
   * @param section - Section name to toggle
   */
  const toggleSectionSelection = useCallback((section: string) => {
    setSelectedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }, [])

  /**
   * Toggles section expansion in modal
   *
   * @param section - Section name to toggle
   */
  const toggleSectionExpansion = useCallback((section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }, [])

  /**
   * Handles document regeneration with selected sections
   * Validates required data and triggers regeneration callback
   */
  const handleRegenerateDocument = useCallback(async () => {
    if (!proposalId || !onRegenerateDocument) {
      alert('Unable to regenerate document. Please try again.')
      return
    }

    // eslint-disable-next-line no-console
    console.log('🔄 Regenerating document')
    // eslint-disable-next-line no-console
    console.log(`   Selected: ${selectedSections.length} sections`)
    // eslint-disable-next-line no-console
    console.log(`   Comments: ${Object.keys(userComments).length}`)

    setIsRegenerating(true)
    try {
      await onRegenerateDocument(selectedSections, userComments)
      // eslint-disable-next-line no-console
      console.log('✅ Regeneration successful')
      setShowEditModal(false)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Regeneration error:', error)
      alert('Error regenerating document. Please try again.')
    } finally {
      setIsRegenerating(false)
    }
  }, [proposalId, onRegenerateDocument, selectedSections, userComments])

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Initialize selected sections when modal opens
   * Loads saved selections from DynamoDB or defaults to Critical sections
   */
  useEffect(() => {
    if (!showEditModal) {
      return
    }

    // eslint-disable-next-line no-console
    console.log('📂 Opening Edit Sections modal')

    const analysis = unwrapConceptAnalysis(conceptAnalysis)
    const sections = analysis?.sections_needing_elaboration || []

    // eslint-disable-next-line no-console
    console.log(`📊 Found ${sections.length} sections`)

    // Check if sections have saved selections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasSelectedFlags = sections.some((s: any) => 'selected' in s)

    if (hasSelectedFlags) {
      // Load saved selections
      const savedSelections = sections
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((s: any) => s.selected === true)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => s.section)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const savedComments = sections.reduce((acc: any, s: any) => {
        if (s.user_comment) {
          acc[s.section] = s.user_comment
        }
        return acc
      }, {})

      // eslint-disable-next-line no-console
      console.log('✅ Loading saved selections:', savedSelections)
      setSelectedSections(savedSelections)
      setUserComments(savedComments)
    } else {
      // Default to Critical sections
      // eslint-disable-next-line no-console
      console.log('⚠️ No saved selections, defaulting to Critical')
      const criticalSections = sections
        .filter((s: SectionNeedingElaboration) => s.priority === 'Critical')
        .map((s: SectionNeedingElaboration) => s.section)

      setSelectedSections(criticalSections)
    }
  }, [showEditModal, conceptAnalysis, unwrapConceptAnalysis])

  /**
   * Synchronize section changes with parent component
   * Triggers callback when selections or comments change
   */
  useEffect(() => {
    if (showEditModal || !onConceptEvaluationChange || selectedSections.length === 0) {
      return
    }

    // eslint-disable-next-line no-console
    console.log('📤 Syncing evaluation with parent')
    // eslint-disable-next-line no-console
    console.log(`   Sections: ${selectedSections.length}`)

    onConceptEvaluationChange({
      selectedSections,
      userComments: Object.keys(userComments).length > 0 ? userComments : undefined,
    })
  }, [selectedSections, userComments, onConceptEvaluationChange, showEditModal])

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Renders the concept document content
   * Parses markdown and displays as formatted React elements
   */
  const renderConceptDocument = useCallback(() => {
    const content = extractDocumentContent(conceptDocument)
    // eslint-disable-next-line no-console
    console.log(`📝 Rendering document: ${content.length} chars`)

    return (
      <div className={styles.documentContent}>
        <div className={styles.markdownContent}>{parseMarkdownToReact(content)}</div>
      </div>
    )
  }, [conceptDocument, extractDocumentContent, parseMarkdownToReact])

  /**
   * Renders the empty state when no document is available
   * Shows different messages based on whether sections changed or first time
   */
  const renderEmptyState = useCallback(() => {
    const unwrapped = unwrapConceptAnalysis(conceptAnalysis)
    const sectionsNeedingElaboration = unwrapped?.sections_needing_elaboration || []
    const hasPreviousDocument = hadPreviousDocument()

    // Sections changed - show regeneration prompt
    if (hasPreviousDocument && sectionsNeedingElaboration.length > 0) {
      return (
        <div className={styles.invalidatedDocumentCard}>
          <div className={styles.invalidatedIcon}>
            <Sparkles size={48} color="#F59E0B" />
          </div>
          <h2 className={styles.invalidatedTitle}>Section Selections Have Changed</h2>
          <p className={styles.invalidatedDescription}>
            You&apos;ve updated your section selections in Step 2. To see an updated concept
            document with your new selections, please click the button below to generate a fresh
            document.
          </p>
          <button
            className={styles.regeneratePrimaryButton}
            onClick={() => {
              if (onRegenerateDocument && sectionsNeedingElaboration.length > 0) {
                const currentSelections = sectionsNeedingElaboration
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .filter((s: any) => s.selected === true)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  .map((s: any) => s.section)

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentComments = sectionsNeedingElaboration.reduce((acc: any, s: any) => {
                  if (s.user_comment) {
                    acc[s.section] = s.user_comment
                  }
                  return acc
                }, {})

                onRegenerateDocument(currentSelections, currentComments)
              }
            }}
          >
            <Sparkles size={16} />
            Generate Updated Concept Document
          </button>
        </div>
      )
    }

    // First time - no document yet
    return (
      <div className={styles.emptyState}>
        <FileText size={48} color="#9CA3AF" />
        <p>No concept document available. Please complete Step 2 first.</p>
      </div>
    )
  }, [conceptAnalysis, hadPreviousDocument, onRegenerateDocument, unwrapConceptAnalysis])

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const unwrappedAnalysis = unwrapConceptAnalysis(conceptAnalysis)
  const sectionsNeedingElaboration = unwrappedAnalysis?.sections_needing_elaboration || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedCount = sectionsNeedingElaboration.filter((s: any) => s.selected === true).length
  const totalSections = getDocumentSectionCount()

  // eslint-disable-next-line no-console
  console.log('📄 Step3 render')
  // eslint-disable-next-line no-console
  console.log(`   Document sections: ${totalSections}`)
  // eslint-disable-next-line no-console
  console.log(`   Selected sections: ${selectedCount}/${sectionsNeedingElaboration.length}`)

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  // No document available
  if (!conceptDocument) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.stepHeader}>
          <h1 className={styles.stepMainTitle}>
            Step 3: Updated Concept Document
            <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeConcept}`}>
              Concept
            </span>
          </h1>
          <p className={styles.stepMainDescription}>
            Review and download your enhanced concept document with elaborated sections
          </p>
        </div>
        {renderEmptyState()}
      </div>
    )
  }

  // Document available
  return (
    <div className={styles.mainContent}>
      {/* Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>
          Step 3: Updated Concept Document
          <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeConcept}`}>
            Concept
          </span>
        </h1>
        <p className={styles.stepMainDescription}>
          Review and download your enhanced concept document with elaborated sections
        </p>
      </div>

      {/* Document Card */}
      <div className={styles.documentCard}>
        <div className={styles.documentHeader}>
          <div className={styles.documentHeaderLeft}>
            <FileText size={20} color="#00A63E" />
            <div>
              <h3 className={styles.documentTitle}>Generated Concept Document</h3>
              <p className={styles.documentSubtitle}>
                {totalSections} section{totalSections !== 1 ? 's' : ''} included &bull; Ready for
                review and refinement
                {conceptDocument?.generated_concept_document && conceptDocument?.sections && (
                  <>
                    <br />
                    <span
                      style={{
                        marginTop: '4px',
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: '#DCFCE7',
                        color: '#166534',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                      }}
                    >
                      Enhanced Format
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button className={styles.editSectionsButton} onClick={() => setShowEditModal(true)}>
            <Sparkles size={16} />
            Edit Sections
          </button>
        </div>

        {renderConceptDocument()}

        <div className={styles.buttonGroup}>
          <button
            className={styles.downloadButton}
            onClick={handleDownloadDocument}
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
                Download Document
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edit Sections Modal */}
      {showEditModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowEditModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div>
                <h2 id="modal-title" className={styles.modalTitle}>
                  <Sparkles size={20} />
                  Edit Sections
                </h2>
                <p id="modal-description" className={styles.modalSubtitle}>
                  Select sections to include ({selectedSections.length}/
                  {sectionsNeedingElaboration.length})
                </p>
              </div>
              <button
                className={styles.modalCloseButton}
                onClick={() => setShowEditModal(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className={styles.modalBody}>
              <div className={styles.sectionsList}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {sectionsNeedingElaboration.map((section: any, index: number) => {
                  const isSelected = selectedSections.includes(section.section)
                  const isExpanded = expandedSections.includes(section.section)
                  const priorityColor =
                    PRIORITY_COLORS[section.priority as keyof typeof PRIORITY_COLORS]

                  return (
                    <div
                      key={index}
                      className={`${styles.sectionItem} ${isSelected ? styles.sectionItemSelected : ''}`}
                    >
                      <div className={styles.sectionItemHeader}>
                        <div className={styles.sectionItemLeft}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSectionSelection(section.section)}
                            className={styles.sectionCheckbox}
                            id={`section-${index}`}
                            aria-label={`Select ${section.section}`}
                          />
                          <label htmlFor={`section-${index}`} className={styles.sectionInfo}>
                            <h4 className={styles.sectionName}>{section.section}</h4>
                            <span
                              className={styles.priorityBadge}
                              style={{
                                backgroundColor: priorityColor.bg,
                                border: `1px solid ${priorityColor.border}`,
                                color: priorityColor.text,
                              }}
                            >
                              {section.priority}
                            </span>
                          </label>
                        </div>
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleSectionExpansion(section.section)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Show less details' : 'Show more details'}
                        >
                          {isExpanded ? (
                            <>
                              See less <ChevronUp size={16} />
                            </>
                          ) : (
                            <>
                              See more <ChevronDown size={16} />
                            </>
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className={styles.sectionDetails}>
                          <p className={styles.sectionIssue}>{section.issue}</p>

                          {section.suggestions && section.suggestions.length > 0 && (
                            <div className={styles.suggestionsBox}>
                              <h5>Suggestions:</h5>
                              <ul>
                                {section.suggestions.map((suggestion: string, idx: number) => (
                                  <li key={idx}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowEditModal(false)}
                disabled={isRegenerating}
              >
                Cancel
              </button>
              <button
                className={styles.regenerateButton}
                onClick={handleRegenerateDocument}
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
                    Re-generate ({selectedSections.length} section
                    {selectedSections.length !== 1 ? 's' : ''})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Step3ConceptDocument
