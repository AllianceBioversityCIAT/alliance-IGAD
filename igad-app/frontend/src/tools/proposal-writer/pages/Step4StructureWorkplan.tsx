import { useState, useEffect } from 'react'
import { Sparkles, Check, ChevronDown, ChevronUp, FileText, Info, Lightbulb, Edit3, BookOpen, Download } from 'lucide-react'
import { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } from 'docx'
import styles from './step4-structure.module.css'
import step2Styles from './step2.module.css'
import step2ConceptStyles from './step2-concept-review.module.css'
import { StepProps } from './stepConfig'

interface Section {
  section: string
  description: string
  priority: 'Critical' | 'Recommended' | 'Optional'
  suggestions: string[]
}

interface Step4Props extends StepProps {
  proposalId?: string
  structureWorkplanAnalysis?: {
    narrative_overview?: string
    proposal_mandatory?: ProposalSection[]
    proposal_outline?: ProposalSection[]
    hcd_notes?: { note: string }[]
  }
  onGenerateTemplate?: (selectedSections: string[], userComments: { [key: string]: string }) => void
  onTemplateGenerated?: () => void
}

interface ProposalSection {
  section_title: string
  recommended_word_count: string
  purpose: string
  content_guidance: string
  guiding_questions: string[]
}

const PRIORITY_COLORS = {
  Critical: { bg: '#FFE2E2', border: '#FFC9C9', text: '#9F0712' },
  Recommended: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  Optional: { bg: '#E0E7FF', border: '#C7D2FE', text: '#193CB8' },
}

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
            dangerouslySetInnerHTML={{ __html: '• ' + formatInlineMarkdown(line.replace(/^[*-]\s+/, '')) }}
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
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('*') && !trimmed.startsWith('-') && !trimmed.startsWith('`')) {
        return trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed
      }
    }
    return text.substring(0, 200) + '...'
  }

  return (
    <div className={step2ConceptStyles.card}>
      <div className={step2ConceptStyles.cardHeader}>
        <div className={step2ConceptStyles.sectionHeader}>
          <FileText className={step2ConceptStyles.sectionIcon} size={24} />
          <div>
            <h2 className={step2ConceptStyles.sectionTitle}>Proposal Structure Overview</h2>
            <p className={step2ConceptStyles.sectionSubtitle}>
              AI-generated analysis of your proposal structure and recommendations
            </p>
          </div>
        </div>
        <button
          type="button"
          className={step2ConceptStyles.expandButton}
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ marginLeft: 'auto' }}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.narrativeContent}>
          {parseMarkdownContent(narrativeText)}
        </div>
      )}

      {!isExpanded && (
        <div className={styles.narrativePreview}>
          <p className={styles.narrativeParagraph}>
            {getPreviewText(narrativeText)}
          </p>
        </div>
      )}
    </div>
  )
}

const PROPOSAL_SECTIONS: Section[] = [
  {
    section: 'Executive Summary',
    description:
      'A concise overview of the entire proposal, highlighting the problem, proposed solution, expected outcomes, and budget. This section should be written last but appears first.',
    priority: 'Critical',
    suggestions: [
      'Keep it to 1-2 pages maximum',
      'Write in clear, compelling language accessible to non-technical readers',
      'Include key metrics: target beneficiaries, budget, timeline',
      'Emphasize alignment with donor priorities',
    ],
  },
  {
    section: 'Problem Statement',
    description:
      'A clear articulation of the development challenge or issue that the project will address, supported by evidence and data.',
    priority: 'Critical',
    suggestions: [
      'Use recent, credible data and statistics',
      'Demonstrate understanding of root causes, not just symptoms',
      'Show how this problem affects target beneficiaries',
      'Reference relevant studies, reports, or assessments',
    ],
  },
  {
    section: 'Theory of Change',
    description:
      'A logical framework showing how your activities will lead to outputs, outcomes, and ultimately impact. Explains the causal pathway from inputs to long-term change.',
    priority: 'Critical',
    suggestions: [
      'Include a visual diagram if possible',
      'Clearly articulate assumptions',
      'Show both short-term and long-term changes',
      'Link directly to the problem statement',
    ],
  },
  {
    section: 'Project Objectives',
    description:
      'Specific, measurable, achievable, relevant, and time-bound (SMART) objectives that define what the project will accomplish.',
    priority: 'Critical',
    suggestions: [
      'Make objectives SMART (Specific, Measurable, Achievable, Relevant, Time-bound)',
      'Limit to 3-5 main objectives',
      'Align with donor strategic goals',
      'Include both process and outcome objectives',
    ],
  },
  {
    section: 'Implementation Methodology',
    description:
      'Detailed description of the approaches, strategies, and activities that will be used to achieve the project objectives.',
    priority: 'Critical',
    suggestions: [
      'Describe specific activities under each objective',
      'Explain why chosen approaches are appropriate',
      'Address any innovative or evidence-based methodologies',
      'Show how activities are sequenced and interrelated',
    ],
  },
  {
    section: 'Workplan and Timeline',
    description:
      'A detailed schedule showing when activities will be implemented, key milestones, and responsible parties.',
    priority: 'Critical',
    suggestions: [
      'Use a Gantt chart or clear table format',
      'Break down by quarters or months',
      'Include milestones and deliverables',
      'Show dependencies between activities',
    ],
  },
  {
    section: 'Monitoring, Evaluation & Learning',
    description:
      'Framework for tracking progress, measuring results, and using data for adaptive management and learning.',
    priority: 'Critical',
    suggestions: [
      'Define clear indicators for each objective',
      'Describe data collection methods and frequency',
      'Explain how findings will inform project adaptation',
      'Include baseline and target values',
    ],
  },
  {
    section: 'Gender and Social Inclusion',
    description:
      'Analysis of how the project will promote gender equality and address the needs of marginalized or vulnerable groups.',
    priority: 'Recommended',
    suggestions: [
      'Conduct gender and inclusion analysis',
      'Set specific targets for women and marginalized groups',
      'Address potential barriers to participation',
      'Show how activities will be gender-responsive',
    ],
  },
  {
    section: 'Sustainability Plan',
    description:
      'Strategy for ensuring that project benefits continue after donor funding ends, including financial, institutional, and community ownership aspects.',
    priority: 'Recommended',
    suggestions: [
      'Address financial sustainability (revenue models, cost recovery)',
      'Describe capacity building for local partners',
      'Explain community ownership strategies',
      'Show linkages to government systems or policies',
    ],
  },
  {
    section: 'Budget and Budget Narrative',
    description:
      'Detailed budget breakdown by line item and activity, with narrative justification explaining costs and their necessity.',
    priority: 'Critical',
    suggestions: [
      'Align budget categories with donor requirements',
      'Provide detailed narrative for major cost items',
      'Show cost-sharing or co-funding if applicable',
      'Ensure costs are realistic and well-justified',
    ],
  },
  {
    section: 'Organizational Capacity',
    description:
      "Demonstration of your organization's ability to successfully implement the project, including relevant experience, expertise, and resources.",
    priority: 'Recommended',
    suggestions: [
      'Highlight relevant past projects and results',
      'Describe key staff qualifications and experience',
      'Mention partnerships and local presence',
      'Address any capacity gaps and mitigation strategies',
    ],
  },
  {
    section: 'Risk Management',
    description:
      'Identification of potential risks to project success and mitigation strategies to address them.',
    priority: 'Recommended',
    suggestions: [
      'Categorize risks (political, operational, financial, environmental)',
      'Assess likelihood and impact of each risk',
      'Provide specific mitigation strategies',
      'Include contingency plans for critical risks',
    ],
  },
]

export function Step4StructureWorkplan({
  proposalId,
  structureWorkplanAnalysis,
  onGenerateTemplate,
  onTemplateGenerated,
}: Step4Props) {
  // Combine mandatory and outline sections
  const allSections = [
    ...(structureWorkplanAnalysis?.proposal_mandatory || []),
    ...(structureWorkplanAnalysis?.proposal_outline || [])
  ]

  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [userComments, setUserComments] = useState<{ [key: string]: string }>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize selected sections when data becomes available
  useEffect(() => {
    if (structureWorkplanAnalysis?.proposal_mandatory && !hasInitialized) {
      const mandatorySectionTitles = structureWorkplanAnalysis.proposal_mandatory.map(s => s.section_title)
      setSelectedSections(mandatorySectionTitles)
      setHasInitialized(true)
      console.log('📋 Initialized selectedSections with mandatory sections:', mandatorySectionTitles)
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

  const handleCommentChange = (sectionName: string, comment: string) => {
    console.log('📝 Comment changed for section:', sectionName, '| Comment:', comment.substring(0, 50) + '...')
    setUserComments(prev => {
      const updated = { ...prev, [sectionName]: comment }
      console.log('📝 Updated userComments:', Object.keys(updated).map(k => `${k}: ${updated[k].substring(0, 20)}...`))
      return updated
    })
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

      console.log('📋 Generating template with:', {
        proposalId,
        totalAvailable: allAvailableSections.length,
        selectedSections: selectedSections,
        sectionsToInclude: sectionsToInclude.map(s => s.section_title),
        userComments: userComments
      })

      // Create Word document sections (using docx library on frontend)
      const documentSections: Paragraph[] = []

      // Get formatted date
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
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
            })
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
            })
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
            })
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
            })
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
              })
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
                })
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
                })
              ],
              spacing: { after: 200, line: 276 },
            })
          )
        }

        // User comment (if provided)
        const userComment = userComments[sectionTitle]
        if (userComment) {
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: '✏️ Your Notes & Context',
                  bold: true,
                  size: 22,
                  color: '166534',
                })
              ],
              spacing: { before: 240, after: 100 },
            })
          )
          documentSections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: userComment,
                  italics: true,
                  size: 20,
                  color: '166534',
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
                })
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
                })
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
                })
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
                    })
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
              })
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
              })
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
              })
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
          spacing: { before: 400, after: 200 }
        })
      )

      documentSections.push(
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
      documentSections.push(
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

      // Create the document with page margins
      const doc = new Document({
        sections: [{
          children: documentSections,
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              }
            }
          }
        }],
      })

      // Generate blob and download
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `proposal_template_${proposalId}_${new Date().toISOString().slice(0, 10)}.docx`
      a.click()
      URL.revokeObjectURL(url)

      console.log('✅ Template downloaded successfully')

      // Notify parent that template was generated
      if (onTemplateGenerated) {
        onTemplateGenerated()
      }
    } catch (error: any) {
      console.error('❌ Error generating template:', error)
      alert(`Failed to generate template: ${error.message || 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const totalSections = allSections.length
  const reviewedCount = Object.keys(userComments).filter(key => userComments[key].trim()).length

  // Show loading state if no analysis yet
  if (!structureWorkplanAnalysis) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.stepHeader}>
          <h1 className={styles.stepMainTitle}>
            Step 3: Structure & Workplan
            <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeProposal}`}>
              Proposal
            </span>
          </h1>
          <p className={styles.stepMainDescription}>
            Loading proposal structure and workplan...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.mainContent}>
      {/* Page Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>
          Step 3: Structure & Workplan
          <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeProposal}`}>
            Proposal
          </span>
        </h1>
        <p className={styles.stepMainDescription}>
          Review and customize your proposal structure based on RFP requirements and donor guidelines
        </p>
      </div>

      <div className={step2Styles.step2Container}>
        {/* Narrative Overview Card */}
        <NarrativeOverview narrativeText={structureWorkplanAnalysis.narrative_overview} />

        {/* Sections Card */}
        <div className={step2Styles.sectionsCard}>
          <div className={step2Styles.sectionsCardInner}>
            <div className={step2Styles.sectionHeader}>
              <Sparkles className={step2Styles.sectionIcon} size={24} />
              <div>
                <h2 className={step2Styles.sectionTitle}>Proposal Sections</h2>
                <p className={step2Styles.sectionSubtitle}>
                  Review the proposed structure. Mandatory sections are pre-selected.
                </p>
              </div>
            </div>

            <div className={step2Styles.selectionCount}>
              <strong>{selectedSections.length}</strong> sections selected •{' '}
              <strong>{reviewedCount}</strong> of {totalSections} sections reviewed
            </div>

            <div className={step2Styles.sectionsList}>
              {allSections.map((section, index) => {
                const isSelected = selectedSections.includes(section.section_title)
                const isExpanded = expandedSections.includes(section.section_title)
                const isMandatory = structureWorkplanAnalysis?.proposal_mandatory?.some(
                  s => s.section_title === section.section_title
                )

                return (
                  <div key={index} className={step2Styles.sectionItem}>
                    <div className={step2Styles.sectionItemHeader}>
                      <div className={step2Styles.sectionItemHeaderLeft}>
                        <div
                          className={`${step2Styles.checkbox} ${isSelected ? step2Styles.checkboxChecked : ''}`}
                          onClick={() => toggleSection(section.section_title)}
                        >
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                        <div className={step2Styles.sectionItemInfo}>
                          <h3 className={step2Styles.sectionItemTitle}>{section.section_title}</h3>
                          {isMandatory && (
                            <span
                              className={step2Styles.badge}
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
                              className={step2Styles.badge}
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
                        className={step2Styles.expandButton}
                        onClick={() => toggleExpansion(section.section_title)}
                      >
                        {isExpanded ? 'See less' : 'See more'}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className={step2Styles.sectionItemContent}>
                        {section.purpose && (
                          <div className={step2Styles.detailsSection}>
                            <Info className={step2Styles.subsectionIcon} size={16} />
                            <div>
                              <h4 className={step2Styles.subsectionTitle}>Purpose</h4>
                              <p className={step2Styles.subsectionText}>{section.purpose}</p>
                            </div>
                          </div>
                        )}

                        {section.content_guidance && (
                          <div className={step2Styles.detailsSection}>
                            <BookOpen className={step2Styles.subsectionIcon} size={16} />
                            <div>
                              <h4 className={step2Styles.subsectionTitle}>Content Guidance</h4>
                              <p className={step2Styles.subsectionText}>{section.content_guidance}</p>
                            </div>
                          </div>
                        )}

                        {section.guiding_questions && section.guiding_questions.length > 0 && (
                          <div className={step2Styles.suggestionsSection}>
                            <Lightbulb className={step2Styles.subsectionIcon} size={16} />
                            <div>
                              <h4 className={step2Styles.subsectionTitle}>Guiding Questions</h4>
                              <ul className={step2Styles.suggestionsList}>
                                {section.guiding_questions.map((question, idx) => (
                                  <li key={idx}>{question}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}

                        <div className={step2Styles.commentsSection}>
                          <Edit3 className={step2Styles.subsectionIcon} size={16} />
                          <div>
                            <h4 className={step2Styles.subsectionTitle}>
                              Your comments for this section
                            </h4>
                            <textarea
                              className={step2Styles.commentTextarea}
                              placeholder="Add specific guidance, data points, or context for this section..."
                              value={userComments[section.section_title] || ''}
                              onChange={e => handleCommentChange(section.section_title, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Generate Template Section */}
        <div className={step2Styles.card}>
          <div className={step2Styles.sectionHeader}>
            <FileText className={step2Styles.sectionIcon} size={20} />
            <div>
              <h3 className={step2Styles.sectionTitle}>Generate Proposal Template</h3>
              <p className={step2Styles.sectionSubtitle}>
                Create a customized Word template with instructions and suggested content based on
                your RFP
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.generateButton}
            onClick={(e) => handleGenerateTemplate(e)}
            disabled={isGenerating || selectedSections.length === 0}
            title={selectedSections.length === 0 ? 'Select at least one section to generate template' : ''}
          >
            <Download size={16} />
            {isGenerating ? 'Generating...' : selectedSections.length === 0 ? 'Select sections first' : `Generate Template (${selectedSections.length} sections)`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Step4StructureWorkplan
