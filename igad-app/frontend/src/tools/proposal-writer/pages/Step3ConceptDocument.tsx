import React, { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Sparkles, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx'
import styles from './step3-concept.module.css'
import step2Styles from './step2.module.css'

interface Step3Props {
  conceptDocument: any | null
  conceptAnalysis?: any
  proposalId?: string
  onRegenerateDocument?: (
    selectedSections: string[],
    userComments: { [key: string]: string }
  ) => void
  onEditSections?: () => void
  onNextStep?: () => void
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments?: { [key: string]: string }
  }) => void
}

interface SectionNeedingElaboration {
  section: string
  issue: string
  priority: 'Critical' | 'Recommended' | 'Optional'
  suggestions?: string[]
}

const PRIORITY_COLORS = {
  Critical: { bg: '#FFE2E2', border: '#FFC9C9', text: '#9F0712' },
  Recommended: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  Optional: { bg: '#E0E7FF', border: '#C7D2FE', text: '#193CB8' },
}

const Step3ConceptDocument: React.FC<Step3Props> = ({
  conceptDocument,
  conceptAnalysis,
  proposalId,
  onRegenerateDocument,
  onEditSections,
  onNextStep,
  onConceptEvaluationChange,
}) => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [userComments, setUserComments] = useState<{ [key: string]: string }>({})
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [isDownloading, setIsDownloading] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  console.log('📄 Step3 - conceptDocument:', conceptDocument)
  console.log('📄 Step3 - conceptAnalysis:', conceptAnalysis)

  // Calculate number of selected sections
  // Handle multiple levels of nesting
  let unwrappedAnalysis = conceptAnalysis?.concept_analysis || conceptAnalysis

  // Check if there's another level of nesting (concept_analysis.concept_analysis)
  if (unwrappedAnalysis?.concept_analysis) {
    unwrappedAnalysis = unwrappedAnalysis.concept_analysis
  }

  const sectionsNeedingElaboration = unwrappedAnalysis?.sections_needing_elaboration || []
  const selectedCount = sectionsNeedingElaboration.filter((s: any) => s.selected === true).length
  // Calculate number of sections from the actual document
  const getDocumentSectionCount = () => {
    if (!conceptDocument) return 0

    // NEW FORMAT: Check generated_concept_document and sections
    if (conceptDocument?.generated_concept_document) {
      // If sections object exists, use its count (more accurate)
      if (conceptDocument?.sections && typeof conceptDocument.sections === 'object') {
        const count = Object.keys(conceptDocument.sections).length
        console.log(`📊 Using sections count from NEW format: ${count}`)
        return count
      }
      // Otherwise, count ## headers in markdown
      const headerMatches = conceptDocument.generated_concept_document.match(/^##\s+/gm)
      const count = headerMatches ? headerMatches.length : 0
      console.log(`📊 Counting headers in generated_concept_document: ${count}`)
      return count
    }

    // OLD FORMAT: proposal_outline
    if (conceptDocument?.proposal_outline && Array.isArray(conceptDocument.proposal_outline)) {
      const count = conceptDocument.proposal_outline.length
      console.log(`📊 Using proposal_outline count: ${count}`)
      return count
    }

    // FALLBACK: sections object
    if (conceptDocument?.sections && typeof conceptDocument.sections === 'object') {
      const count = Object.keys(conceptDocument.sections).length
      console.log(`📊 Using sections object count: ${count}`)
      return count
    }

    // From selected sections
    const count = selectedCount || 0
    console.log(`📊 Using selected sections count (fallback): ${count}`)
    return count
  }

  const totalSections = getDocumentSectionCount()

  console.log(
    `📊 Step3 - Selected sections: ${selectedCount} of ${sectionsNeedingElaboration.length} total`
  )
  console.log(`📊 Step3 - Document has ${totalSections} sections in outline`)

  if (!conceptDocument) {
    return (
      <div className={styles.emptyState}>
        <FileText size={48} color="#9CA3AF" />
        <p>No concept document available. Please complete Step 2 first.</p>
      </div>
    )
  }

  // Parse the concept document content
  const renderConceptDocument = () => {
    let content = ''

    // Log the structure for debugging
    console.log('📄 Step3 - renderConceptDocument called')
    console.log('📦 conceptDocument structure:', conceptDocument)
    console.log('📦 conceptDocument type:', typeof conceptDocument)

    if (conceptDocument && typeof conceptDocument === 'object') {
      console.log('📦 conceptDocument keys:', Object.keys(conceptDocument))
    }

    // Try to extract the actual content from various possible structures
    // Priority order: generated_concept_document > content > document > proposal_outline > sections

    if (typeof conceptDocument === 'string') {
      console.log('✅ Using conceptDocument as string')
      content = conceptDocument
    } else if (conceptDocument?.generated_concept_document) {
      console.log('✅ Using generated_concept_document field (NEW FORMAT)')
      console.log('📝 Content length:', conceptDocument.generated_concept_document.length)
      console.log(
        '📝 First 500 chars:',
        conceptDocument.generated_concept_document.substring(0, 500)
      )
      console.log('📝 Has newlines:', conceptDocument.generated_concept_document.includes('\n'))

      // Check if sections are also available for enhanced display
      if (conceptDocument?.sections && typeof conceptDocument.sections === 'object') {
        const sectionCount = Object.keys(conceptDocument.sections).length
        console.log(`📊 Also found ${sectionCount} sections in sections object`)
      }

      content = conceptDocument.generated_concept_document
    } else if (conceptDocument?.content) {
      console.log('✅ Using content field')
      content = conceptDocument.content
    } else if (conceptDocument?.document) {
      console.log('✅ Using document field')
      content = conceptDocument.document
    } else if (conceptDocument?.proposal_outline) {
      console.log('✅ Using proposal_outline structure')
      // Handle proposal_outline structure - convert sections to markdown
      const outline = conceptDocument.proposal_outline
      if (Array.isArray(outline)) {
        content = outline
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
    } else if (conceptDocument?.sections && typeof conceptDocument.sections === 'object') {
      console.log('✅ Using sections object (fallback)')
      console.log('📊 Number of sections:', Object.keys(conceptDocument.sections).length)
      // Build content from sections
      content = Object.entries(conceptDocument.sections)
        .map(([key, value]) => `## ${key}\n\n${value}`)
        .join('\n\n')
    } else {
      console.warn('⚠️ Unknown conceptDocument structure, using JSON stringify')
      // Last resort: stringify the object
      content = JSON.stringify(conceptDocument, null, 2)
    }

    console.log('📝 Final content length:', content.length, 'characters')

    return (
      <div className={styles.documentContent}>
        <div className={styles.markdownContent}>{parseMarkdownToReact(content)}</div>
      </div>
    )
  }

  const parseMarkdownToReact = (markdown: string) => {
    console.log('🎨 parseMarkdownToReact called')
    console.log('📝 Markdown length:', markdown.length)
    console.log('📝 First 200 chars:', markdown.substring(0, 200))
    console.log('📝 Number of lines:', markdown.split('\n').length)

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
      // Headers
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
      }
      // Lists
      else if (line.match(/^[\*\-]\s+/)) {
        flushParagraph()
        currentList.push(line.replace(/^[\*\-]\s+/, ''))
      }
      // Empty line
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

    console.log('📊 parseMarkdownToReact result:')
    console.log('   - Total elements created:', elements.length)
    console.log('   - Element types:', elements.map(e => e.type).join(', '))

    return elements
  }

  const formatInlineMarkdown = (text: string): string => {
    let formatted = text

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')

    // Code
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')

    return formatted
  }

  const markdownToParagraphs = (markdown: string): Paragraph[] => {
    const lines = markdown.split('\n')
    const paragraphs: Paragraph[] = []

    let i = 0
    while (i < lines.length) {
      const line = lines[i]

      // Headers (### or ##)
      if (line.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          })
        )
      } else if (line.startsWith('## ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 }
          })
        )
      } else if (line.startsWith('# ')) {
        paragraphs.push(
          new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )
      }
      // Lists
      else if (line.match(/^[\*\-]\s+/)) {
        paragraphs.push(
          new Paragraph({
            text: line.replace(/^[\*\-]\s+/, ''),
            bullet: { level: 0 },
            spacing: { after: 50 }
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
            spacing: { after: 100 }
          })
        )
      }

      i++
    }

    return paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: 'No content available' })]
  }

  const handleDownloadDocument = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      console.log('🔽 Download button clicked!')
      console.log('📦 conceptDocument for download:', conceptDocument)
      setIsDownloading(true)

      try {
        let content = ''

        // Extract content from the same structure used in renderConceptDocument
        if (typeof conceptDocument === 'string') {
          console.log('✅ Download: Using string content')
          content = conceptDocument
        } else if (conceptDocument?.generated_concept_document) {
          console.log('✅ Download: Using generated_concept_document (NEW FORMAT)')
          content = conceptDocument.generated_concept_document
        } else if (conceptDocument?.content) {
          console.log('✅ Download: Using content field')
          content = conceptDocument.content
        } else if (conceptDocument?.document) {
          console.log('✅ Download: Using document field')
          content = conceptDocument.document
        } else if (conceptDocument?.proposal_outline) {
          console.log('✅ Download: Using proposal_outline')
          const outline = conceptDocument.proposal_outline
          if (Array.isArray(outline)) {
            content = outline
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
        } else if (conceptDocument?.sections && typeof conceptDocument.sections === 'object') {
          console.log('✅ Download: Using sections object')
          content = Object.entries(conceptDocument.sections)
            .map(([key, value]) => `## ${key}\n\n${value}`)
            .join('\n\n')
        } else {
          console.warn('⚠️ Download: No valid content format found')
          content = 'No content available'
        }

        console.log(`📝 Download: Final content length: ${content.length} characters`)

        // Convert markdown to DOCX using docx library
        const sections = markdownToParagraphs(content)

        const doc = new Document({
          sections: [
            {
              children: sections
            }
          ]
        })

        // Generate and download DOCX
        const blob = await Packer.toBlob(doc)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `concept-document-${new Date().toISOString().slice(0, 10)}.docx`
        a.click()
        URL.revokeObjectURL(url)

        console.log('✅ Download complete!')
        setIsDownloading(false)
      } catch (error) {
        console.error('❌ Error generating document:', error)
        alert('Error generating document. Please try again.')
        setIsDownloading(false)
      }
    },
    [conceptDocument]
  )

  const parseMarkdownToHTML = (markdown: string): string => {
    let html = markdown

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')

    // Italic
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>')

    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>')
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>')

    // Wrap consecutive list items
    html = html.replace(/(<li>.*<\/li>\n?)+/gim, '<ul>$&</ul>')

    // Paragraphs
    html = html
      .split('\n\n')
      .map(para => {
        if (!para.match(/^<[h|u|l]/)) {
          return `<p>${para}</p>`
        }
        return para
      })
      .join('\n')

    return html
  }

  const toggleSectionSelection = (section: string) => {
    setSelectedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  const toggleSectionExpansion = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  // Initialize selected sections when modal opens
  useEffect(() => {
    if (showEditModal) {
      console.log('📂 Opening Edit Sections modal...')
      console.log('📋 Full conceptAnalysis:', JSON.stringify(conceptAnalysis, null, 2))

      // Load from conceptAnalysis if available (from DynamoDB)
      // Handle multiple levels of nesting
      let analysis = conceptAnalysis?.concept_analysis || conceptAnalysis

      // Check if there's another level of nesting (concept_analysis.concept_analysis)
      if (analysis?.concept_analysis) {
        console.log('🔍 Found nested concept_analysis, unwrapping...')
        analysis = analysis.concept_analysis
      }

      const sections = analysis?.sections_needing_elaboration || []

      console.log('📊 Unwrapped analysis:', JSON.stringify(analysis, null, 2))
      console.log(`📊 Found ${sections.length} sections in concept analysis`)

      // Check if sections have the 'selected' flag
      const hasSelectedFlags = sections.some((s: any) => 'selected' in s)

      console.log(`🔍 Has selected flags: ${hasSelectedFlags}`)

      if (hasSelectedFlags) {
        // Load saved selections from DynamoDB
        const savedSelections = sections
          .filter((s: any) => s.selected === true)
          .map((s: any) => s.section)

        const savedComments = sections.reduce((acc: any, s: any) => {
          if (s.user_comment) {
            acc[s.section] = s.user_comment
          }
          return acc
        }, {})

        console.log('✅ Loading saved selections from DynamoDB:', savedSelections)
        console.log('✅ Loading saved comments from DynamoDB:', savedComments)

        setSelectedSections(savedSelections)
        setUserComments(savedComments)
      } else {
        // No selected flags found - default to all Critical sections
        console.log('⚠️ No selected flags found, defaulting to Critical sections')
        const criticalSections = sections
          .filter((s: SectionNeedingElaboration) => s.priority === 'Critical')
          .map((s: SectionNeedingElaboration) => s.section)

        console.log('📌 Critical sections:', criticalSections)
        setSelectedSections(criticalSections)
      }
    }
  }, [showEditModal, conceptAnalysis])

  // Synchronize section changes with parent component
  useEffect(() => {
    if (!onConceptEvaluationChange || selectedSections.length === 0) {
      return
    }

    console.log('📤 Syncing concept evaluation with parent:')
    console.log(`   Selected sections: ${selectedSections.length}`)
    console.log(`   Sections:`, selectedSections)
    console.log(`   Comments:`, userComments)

    onConceptEvaluationChange({
      selectedSections,
      userComments: Object.keys(userComments).length > 0 ? userComments : undefined,
    })
  }, [selectedSections, userComments, onConceptEvaluationChange])

  const handleRegenerateDocument = async () => {
    if (!proposalId || !onRegenerateDocument) {
      alert('Unable to regenerate document. Please try again.')
      return
    }

    console.log('🔄 Regenerating document with:')
    console.log(`   Selected sections: ${selectedSections.length}`)
    console.log(`   Sections:`, selectedSections)
    console.log(`   Comments:`, userComments)

    setIsRegenerating(true)
    try {
      await onRegenerateDocument(selectedSections, userComments)
      console.log('✅ Document regenerated successfully')
      setShowEditModal(false)
      // Don't reset states - they will be reloaded when modal reopens
      // This preserves the selection state
    } catch (error) {
      console.error('❌ Error regenerating document:', error)
      alert('Error regenerating document. Please try again.')
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className={styles.mainContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>Step 3: Updated Concept Document</h1>
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
                {totalSections} section{totalSections !== 1 ? 's' : ''} included • Ready for review
                and refinement
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
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>
                  <Sparkles size={20} />
                  Edit Sections
                </h2>
                <p className={styles.modalSubtitle}>
                  Select which sections to include in the regenerated document
                </p>
              </div>
              <button className={styles.modalCloseButton} onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.selectionCount}>
                {selectedSections.length} sections selected
              </div>

              <div className={styles.sectionsList}>
                {sectionsNeedingElaboration.map((section: any, index: number) => {
                  const isSelected = selectedSections.includes(section.section)
                  const isExpanded = expandedSections.includes(section.section)
                  const priorityColor =
                    PRIORITY_COLORS[section.priority as keyof typeof PRIORITY_COLORS]

                  return (
                    <div key={index} className={styles.sectionItem}>
                      <div className={styles.sectionItemHeader}>
                        <div className={styles.sectionItemLeft}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSectionSelection(section.section)}
                            className={styles.sectionCheckbox}
                          />
                          <div className={styles.sectionInfo}>
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
                          </div>
                        </div>
                        <button
                          className={styles.expandButton}
                          onClick={() => toggleSectionExpansion(section.section)}
                        >
                          {isExpanded ? 'See less' : 'See more'} ▼
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
                  'Re-generate Concept Document'
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
