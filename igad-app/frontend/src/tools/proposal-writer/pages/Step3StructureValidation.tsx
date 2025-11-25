import React, { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Sparkles, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './step3.module.css'
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

const Step3StructureValidation: React.FC<Step3Props> = ({
  conceptDocument,
  conceptAnalysis,
  proposalId,
  onRegenerateDocument,
  onEditSections,
  onNextStep,
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
  const totalSections = conceptDocument?.proposal_outline?.length || selectedCount || 0

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
    console.log('conceptDocument structure:', conceptDocument)
    console.log('conceptDocument type:', typeof conceptDocument)

    // Try to extract the actual content from various possible structures
    if (typeof conceptDocument === 'string') {
      content = conceptDocument
    } else if (conceptDocument?.generated_concept_document) {
      content = conceptDocument.generated_concept_document
    } else if (conceptDocument?.content) {
      content = conceptDocument.content
    } else if (conceptDocument?.document) {
      content = conceptDocument.document
    } else if (conceptDocument?.proposal_outline) {
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
    } else if (conceptDocument?.sections) {
      // Build content from sections
      content = Object.entries(conceptDocument.sections)
        .map(([key, value]) => `## ${key}\n\n${value}`)
        .join('\n\n')
    } else {
      // Last resort: stringify the object
      content = JSON.stringify(conceptDocument, null, 2)
    }

    return (
      <div className={styles.documentContent}>
        <div className={styles.markdownContent}>{parseMarkdownToReact(content)}</div>
      </div>
    )
  }

  const parseMarkdownToReact = (markdown: string) => {
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

  const handleDownloadDocument = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      console.log('🔽 Download button clicked!')
      setIsDownloading(true)

      // Use setTimeout to ensure the click event completes before download starts
      setTimeout(() => {
        try {
          let content = ''

          // Extract content from the same structure used in renderConceptDocument
          if (typeof conceptDocument === 'string') {
            content = conceptDocument
          } else if (conceptDocument?.generated_concept_document) {
            content = conceptDocument.generated_concept_document
          } else if (conceptDocument?.content) {
            content = conceptDocument.content
          } else if (conceptDocument?.document) {
            content = conceptDocument.document
          } else if (conceptDocument?.proposal_outline) {
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
          } else if (conceptDocument?.sections) {
            content = Object.entries(conceptDocument.sections)
              .map(([key, value]) => `## ${key}\n\n${value}`)
              .join('\n\n')
          } else {
            content = 'No content available'
          }

          // Convert markdown to HTML
          const htmlContent = parseMarkdownToHTML(content)

          // Create a complete HTML document
          const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Concept Document</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; }
    h3 { color: #7f8c8d; }
    p { margin: 10px 0; }
    strong { color: #2c3e50; }
    ul, ol { margin: 10px 0; padding-left: 30px; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
        `

          // Create blob and download
          const blob = new Blob([fullHtml], { type: 'application/msword' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `concept-document-${new Date().toISOString().slice(0, 10)}.doc`
          a.click()
          URL.revokeObjectURL(url)

          console.log('✅ Download complete!')
          setIsDownloading(false)
        } catch (error) {
          console.error('❌ Error generating document:', error)
          alert('Error generating document. Please try again.')
          setIsDownloading(false)
        }
      }, 100)
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
        <h1 className={styles.stepMainTitle}>Step 3: Structure & Workplan</h1>
        <p className={styles.stepMainDescription}>
          Generate comprehensive checklist and customized proposal template based on RFP
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
                  Select which sections to include and add comments to guide content generation
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
                          {isExpanded ? 'See less' : 'See more and comment'} ▼
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

                          <textarea
                            className={styles.commentBox}
                            placeholder="Add your comments for this section..."
                            value={userComments[section.section] || ''}
                            onChange={e =>
                              setUserComments({
                                ...userComments,
                                [section.section]: e.target.value,
                              })
                            }
                          />
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

export default Step3StructureValidation
