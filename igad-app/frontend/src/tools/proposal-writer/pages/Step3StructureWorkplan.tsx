import { useState, useEffect } from 'react'
import {
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Lightbulb,
  BookOpen,
  Download,
} from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import styles from './step3-structure.module.css'
import { StepProps } from './stepConfig'

// Removed unused Section interface

interface Step3Props extends StepProps {
  proposalId?: string
  structureWorkplanAnalysis?: {
    narrative_overview?: string
    proposal_mandatory?: ProposalSection[]
    proposal_outline?: ProposalSection[]
    hcd_notes?: { note: string }[]
  }
  onGenerateTemplate?: (selectedSections: string[]) => void
  onTemplateGenerated?: () => void
}

interface ProposalSection {
  section_title: string
  recommended_word_count: string
  purpose: string
  content_guidance: string
  guiding_questions: string[]
}

// Removed unused PRIORITY_COLORS constant

/**
 * NarrativeOverview Component
 * Displays AI-generated narrative overview of the proposal structure
 * Features collapsible content for better UX with long text
 */
interface NarrativeOverviewProps {
  narrativeText?: string
}

function NarrativeOverview({ narrativeText }: NarrativeOverviewProps) {
  // Start collapsed by default
  const [isExpanded, setIsExpanded] = useState(false)

  if (!narrativeText || narrativeText.trim().length === 0) {
    return null
  }

  // Parse markdown content into formatted elements
  const parseMarkdownContent = (text: string): JSX.Element[] => {
    const lines = text.split('\n')
    const elements: JSX.Element[] = []
    let currentParagraph: string[] = []
    let inCodeBlock = false

    const formatInlineMarkdown = (str: string): string => {
      let formatted = str
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Remove inline code backticks
      formatted = formatted.replace(/`([^`]+)`/g, '$1')
      return formatted
    }

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ')
        if (text.trim()) {
          elements.push(
            <p
              key={`p-${elements.length}`}
              className={styles.narrativeParagraph}
              dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }}
            />
          )
        }
        currentParagraph = []
      }
    }

    lines.forEach((line, index) => {
      // Handle code block markers (``` or ```json, ```markdown, etc.)
      if (line.trim().startsWith('```')) {
        flushParagraph()
        inCodeBlock = !inCodeBlock
        return // Skip the ``` line itself
      }

      // Skip content inside code blocks
      if (inCodeBlock) {
        return
      }

      // Skip markdown headers like "## Narrative Overview"
      if (line.startsWith('## ') || line.startsWith('# ')) {
        flushParagraph()
        // Don't render headers as they're redundant with the card title
        return
      } else if (line.startsWith('### ')) {
        flushParagraph()
        elements.push(
          <h4 key={`h4-${index}`} className={styles.narrativeSubheading}>
            {line.substring(4)}
          </h4>
        )
      } else if (line.match(/^[*-]\s+/)) {
        flushParagraph()
        elements.push(
          <p
            key={`li-${index}`}
            className={styles.narrativeBullet}
            dangerouslySetInnerHTML={{
              __html: '• ' + formatInlineMarkdown(line.replace(/^[*-]\s+/, '')),
            }}
          />
        )
      } else if (line.trim() === '') {
        flushParagraph()
      } else {
        currentParagraph.push(line.trim())
      }
    })

    flushParagraph()
    return elements
  }

  // Get first paragraph for preview (skip headers and code blocks)
  const getPreviewText = (text: string): string => {
    const lines = text.split('\n')
    let inCodeBlock = false

    for (const line of lines) {
      const trimmed = line.trim()

      // Track code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock
        continue
      }

      // Skip content inside code blocks
      if (inCodeBlock) {
        continue
      }

      // Skip headers, bullets, and empty lines
      if (
        trimmed &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('-') &&
        !trimmed.startsWith('`')
      ) {
        return trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed
      }
    }
    return text.substring(0, 200) + '...'
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.sectionHeader}>
          <FileText className={styles.sectionIcon} size={24} />
          <div>
            <h2 className={styles.sectionTitle}>Proposal Structure Overview</h2>
            <p className={styles.sectionSubtitle}>
              AI-generated analysis of your proposal structure and recommendations
            </p>
          </div>
        </div>
        <button
          type="button"
          className={styles.expandButton}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ marginLeft: 'auto' }}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.narrativeContent}>{parseMarkdownContent(narrativeText)}</div>
      )}

      {!isExpanded && (
        <div className={styles.narrativePreview}>
          <p className={styles.narrativeParagraph}>{getPreviewText(narrativeText)}</p>
        </div>
      )}
    </div>
  )
}

// Removed unused PROPOSAL_SECTIONS constant - was not being used

export function Step3StructureWorkplan({
  proposalId,
  structureWorkplanAnalysis,
  onGenerateTemplate: _onGenerateTemplate,
  onTemplateGenerated,
}: Step3Props) {
  // Combine mandatory and outline sections
  const allSections = [
    ...(structureWorkplanAnalysis?.proposal_mandatory || []),
    ...(structureWorkplanAnalysis?.proposal_outline || []),
  ]

  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize selected sections when data becomes available
  useEffect(() => {
    if (structureWorkplanAnalysis?.proposal_mandatory && !hasInitialized) {
      const mandatorySectionTitles = structureWorkplanAnalysis.proposal_mandatory.map(
        s => s.section_title
      )
      setSelectedSections(mandatorySectionTitles)
      setHasInitialized(true)
    }
  }, [structureWorkplanAnalysis, hasInitialized])

  const toggleSection = (sectionName: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName]
    )
  }

  const toggleExpansion = (sectionName: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName]
    )
  }

  const handleGenerateTemplate = async (e?: React.MouseEvent) => {
    // Prevent default behavior and stop propagation
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!proposalId || !structureWorkplanAnalysis) {
      alert('Proposal data not found')
      return
    }

    // Validate that at least one section is selected
    if (selectedSections.length === 0) {
      alert('Please select at least one section to include in the template.')
      return
    }

    setIsGenerating(true)
    try {
      // Get all sections (mandatory + outline)
      const mandatorySections = structureWorkplanAnalysis.proposal_mandatory || []
      const outlineSections = structureWorkplanAnalysis.proposal_outline || []
      const allAvailableSections = [...mandatorySections, ...outlineSections]

      // ONLY include sections that are selected (checked)
      const sectionsToInclude = allAvailableSections.filter(s =>
        selectedSections.includes(s.section_title)
      )

      // Create Word document sections (using docx library on frontend)
      const documentSections: Paragraph[] = []

      // Get formatted date
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Add title (centered, large, green)
      documentSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Proposal Template',
              bold: true,
              size: 36,
              color: '166534',
            }),
          ],
          spacing: { after: 200 },
          alignment: AlignmentType.CENTER,
        })
      )

      // Add metadata (centered, gray)
      documentSections.push(
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

      documentSections.push(
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

      // Add horizontal line separator
      documentSections.push(
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

      // Add each section
      for (const section of sectionsToInclude) {
        const sectionTitle = section.section_title || 'Untitled Section'
        const isMandatory = mandatorySections.some(s => s.section_title === sectionTitle)

        // Section title (styled)
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sectionTitle,
                bold: true,
                size: 28,
                color: '1F2937',
              }),
            ],
            spacing: { before: 400, after: 200 },
          })
        )

        // Mandatory badge
        if (isMandatory) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '⚠️ MANDATORY SECTION',
                  bold: true,
                  color: '9F0712',
                  size: 20,
                }),
              ],
              spacing: { after: 120 },
            })
          )
        }

        // Word count
        if (section.recommended_word_count) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '📝 Recommended length: ',
                  bold: true,
                  size: 20,
                  color: '4B5563',
                }),
                new TextRun({
                  text: section.recommended_word_count,
                  size: 20,
                  color: '6B7280',
                }),
              ],
              spacing: { after: 200 },
            })
          )
        }

        // Purpose
        if (section.purpose) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Purpose',
                  bold: true,
                  size: 22,
                  color: '374151',
                }),
              ],
              spacing: { before: 240, after: 100 },
            })
          )
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: section.purpose,
                  size: 20,
                }),
              ],
              spacing: { after: 200, line: 276 },
            })
          )
        }

        // Content guidance
        if (section.content_guidance) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'What to Include',
                  bold: true,
                  size: 22,
                  color: '374151',
                }),
              ],
              spacing: { before: 240, after: 100 },
            })
          )
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: section.content_guidance,
                  size: 20,
                }),
              ],
              spacing: { after: 200, line: 276 },
            })
          )
        }

        // Guiding questions
        if (section.guiding_questions && section.guiding_questions.length > 0) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '💡 Guiding Questions',
                  bold: true,
                  size: 22,
                  color: '374151',
                }),
              ],
              spacing: { before: 240, after: 100 },
            })
          )
          section.guiding_questions.forEach(question => {
            if (question) {
              documentSections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: question,
                      size: 20,
                    }),
                  ],
                  bullet: { level: 0 },
                  spacing: { after: 60, line: 276 },
                })
              )
            }
          })
        }

        // Writing space
        documentSections.push(
          new Paragraph({
            text: '',
            spacing: { before: 300, after: 100 },
          })
        )
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '📄 Your Content',
                bold: true,
                size: 22,
                color: '2563EB',
              }),
            ],
            spacing: { after: 100 },
          })
        )
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '[Write your content here]',
                size: 20,
                color: '9CA3AF',
                italics: true,
              }),
            ],
            spacing: { after: 400, line: 276 },
          })
        )

        // Section separator
        documentSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '─────────────────────────────────────────────────────',
                color: 'E5E7EB',
              }),
            ],
            spacing: { before: 200, after: 400 },
            alignment: AlignmentType.CENTER,
          })
        )
      }

      // Add footer separator
      documentSections.push(
        new Paragraph({
          text: '',
          spacing: { before: 400, after: 200 },
        })
      )

      documentSections.push(
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
      documentSections.push(
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

      // Create the document with page margins
      const doc = new Document({
        sections: [
          {
            children: documentSections,
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

      // Generate blob and download
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proposal_template_${proposalId}_${new Date().toISOString().slice(0, 10)}.docx`
      a.click()
      URL.revokeObjectURL(url)

      // Removed console.log'✅ Template downloaded successfully')

      // Notify parent that template was generated
      if (onTemplateGenerated) {
        onTemplateGenerated()
      }
    } catch (error: unknown) {
      // Removed console.error
      const err = error as { message?: string }
      alert(`Failed to generate template: ${err.message || 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Show loading state if no analysis yet
  if (!structureWorkplanAnalysis) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.stepHeader}>
          <h1 className={styles.stepMainTitle}>
            Step 3: Structure
            <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeProposal}`}>
              Proposal
            </span>
          </h1>
          <p className={styles.stepMainDescription}>Loading proposal structure and workplan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.mainContent}>
      {/* Page Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>
          Step 3: Structure
          <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeProposal}`}>
            Proposal
          </span>
        </h1>
        <p className={styles.stepMainDescription}>
          Review and customize your proposal structure based on RFP requirements and donor
          guidelines
        </p>
      </div>

      <div className={styles.step3Container}>
        {/* Narrative Overview Card */}
        <NarrativeOverview narrativeText={structureWorkplanAnalysis.narrative_overview} />

        {/* Sections Card */}
        <div className={styles.sectionsCard}>
          <div className={styles.sectionsCardInner}>
            <div className={styles.sectionHeader}>
              <Sparkles className={styles.sectionIcon} size={24} />
              <div>
                <h2 className={styles.sectionTitle}>Proposal Sections</h2>
                <p className={styles.sectionSubtitle}>
                  Review the proposed structure. Mandatory sections are pre-selected.
                </p>
              </div>
            </div>

            <div className={styles.selectionCount}>
              <strong>{selectedSections.length}</strong> sections selected
            </div>

            <div className={styles.sectionsList}>
              {allSections.map((section, index) => {
                const isSelected = selectedSections.includes(section.section_title)
                const isExpanded = expandedSections.includes(section.section_title)
                const isMandatory = structureWorkplanAnalysis?.proposal_mandatory?.some(
                  s => s.section_title === section.section_title
                )

                return (
                  <div key={index} className={styles.sectionItem}>
                    <div className={styles.sectionItemHeader}>
                      <div className={styles.sectionItemHeaderLeft}>
                        <div
                          className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ''}`}
                          onClick={() => toggleSection(section.section_title)}
                        >
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                        <div className={styles.sectionItemInfo}>
                          <h3 className={styles.sectionItemTitle}>{section.section_title}</h3>
                          {isMandatory && (
                            <span
                              className={styles.badge}
                              style={{
                                backgroundColor: '#FFE2E2',
                                border: '1px solid #FFC9C9',
                                color: '#9F0712',
                              }}
                            >
                              Mandatory
                            </span>
                          )}
                          {section.recommended_word_count && (
                            <span
                              className={styles.badge}
                              style={{
                                backgroundColor: '#F3F4F6',
                                border: '1px solid #E5E7EB',
                                color: '#6B7280',
                              }}
                            >
                              {section.recommended_word_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.expandButton}
                        onClick={() => toggleExpansion(section.section_title)}
                      >
                        {isExpanded ? 'See less' : 'See more'}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className={styles.sectionItemContent}>
                        {section.purpose && (
                          <div className={styles.detailsSection}>
                            <Info className={styles.subsectionIcon} size={16} />
                            <div>
                              <h4 className={styles.subsectionTitle}>Purpose</h4>
                              <p className={styles.subsectionText}>{section.purpose}</p>
                            </div>
                          </div>
                        )}

                        {section.content_guidance && (
                          <div className={styles.detailsSection}>
                            <BookOpen className={styles.subsectionIcon} size={16} />
                            <div>
                              <h4 className={styles.subsectionTitle}>Content Guidance</h4>
                              <p className={styles.subsectionText}>{section.content_guidance}</p>
                            </div>
                          </div>
                        )}

                        {section.guiding_questions && section.guiding_questions.length > 0 && (
                          <div className={styles.suggestionsSection}>
                            <Lightbulb className={styles.subsectionIcon} size={16} />
                            <div>
                              <h4 className={styles.subsectionTitle}>Guiding Questions</h4>
                              <ul className={styles.suggestionsList}>
                                {section.guiding_questions.map((question, idx) => (
                                  <li key={idx}>{question}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Generate Template Section */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <FileText className={styles.sectionIcon} size={20} />
            <div>
              <h3 className={styles.sectionTitle}>Generate Proposal Template</h3>
              <p className={styles.sectionSubtitle}>
                Create a customized Word template with instructions and suggested content based on
                your RFP
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.generateButton}
            onClick={e => handleGenerateTemplate(e)}
            disabled={isGenerating || selectedSections.length === 0}
            title={
              selectedSections.length === 0
                ? 'Select at least one section to generate template'
                : ''
            }
          >
            <Download size={16} />
            {isGenerating
              ? 'Generating...'
              : selectedSections.length === 0
                ? 'Select sections first'
                : `Generate Template (${selectedSections.length} sections)`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Step3StructureWorkplan
