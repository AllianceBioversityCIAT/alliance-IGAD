import { useState, useEffect, useCallback, useRef } from 'react'
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
  Loader2,
  AlertTriangle,
} from 'lucide-react'
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
import styles from './step3-structure.module.css'
import { StepProps } from './stepConfig'
import { proposalService } from '../services/proposalService'
import { useToast } from '@/shared/components/ui/ToastContainer'

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
  initialGeneratedContent?: string | null
  onGeneratedContentChange?: (content: string | null) => void
  initialSelectedSections?: string[] | null
  onSelectedSectionsChange?: (sections: string[]) => void
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

/**
 * Step3Skeleton Component
 * Displays skeleton loading state while data is being fetched
 */
function Step3Skeleton() {
  return (
    <div className={styles.mainContent}>
      {/* Header Skeleton */}
      <div className={styles.stepHeader}>
        <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
        <div className={`${styles.skeleton} ${styles.skeletonText}`}></div>
      </div>

      <div className={styles.step3Container}>
        {/* Narrative Overview Card Skeleton */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.skeleton}`} style={{ width: 24, height: 24, borderRadius: 6 }}></div>
              <div>
                <div className={`${styles.skeleton} ${styles.skeletonCardTitle}`}></div>
                <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
              </div>
            </div>
          </div>
          <div className={`${styles.skeleton} ${styles.skeletonNarrativeBox}`}></div>
        </div>

        {/* Sections Card Skeleton */}
        <div className={styles.sectionsCard}>
          <div className={styles.sectionsCardInner}>
            <div className={styles.sectionHeader}>
              <div className={`${styles.skeleton}`} style={{ width: 24, height: 24, borderRadius: 6 }}></div>
              <div>
                <div className={`${styles.skeleton} ${styles.skeletonCardTitle}`}></div>
                <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
              </div>
            </div>

            <div className={`${styles.skeleton} ${styles.skeletonSelectionCount}`}></div>

            <div className={styles.skeletonSections}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`${styles.skeleton} ${styles.skeletonSectionItem}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Template Section Skeleton */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div className={`${styles.skeleton}`} style={{ width: 20, height: 20, borderRadius: 6 }}></div>
            <div>
              <div className={`${styles.skeleton} ${styles.skeletonCardTitle}`}></div>
              <div className={`${styles.skeleton} ${styles.skeletonTextShort}`}></div>
            </div>
          </div>
          <div className={`${styles.skeleton} ${styles.skeletonGenerateButton}`}></div>
        </div>
      </div>
    </div>
  )
}

export function Step3StructureWorkplan({
  proposalId,
  structureWorkplanAnalysis,
  onGenerateTemplate: _onGenerateTemplate,
  onTemplateGenerated,
  initialGeneratedContent,
  onGeneratedContentChange,
  initialSelectedSections,
  onSelectedSectionsChange,
}: Step3Props) {
  // Toast notifications
  const { showError } = useToast()

  // Combine mandatory and outline sections
  const allSections = [
    ...(structureWorkplanAnalysis?.proposal_mandatory || []),
    ...(structureWorkplanAnalysis?.proposal_outline || []),
  ]

  const [selectedSections, setSelectedSections] = useState<string[]>(initialSelectedSections || [])
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [generatedProposal, setGeneratedProposal] = useState<string | null>(initialGeneratedContent || null)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>(
    initialGeneratedContent ? 'completed' : 'idle'
  )
  const [generationError, setGenerationError] = useState<string | null>(null)
  // Track the sections used for last successful generation
  const [lastGeneratedSections, setLastGeneratedSections] = useState<string[]>(
    initialSelectedSections || []
  )

  // Ref for polling timeout to allow cleanup
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef<boolean>(false)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      isPollingRef.current = false
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
    }
  }, [])

  // Track if we've applied initial sections from parent
  const hasAppliedInitialSections = useRef(false)

  // Initialize selected sections when data becomes available
  // Priority: initialSelectedSections (from parent/DynamoDB) > mandatory sections (fallback)
  // This effect runs ONCE when initial data is available, not on every selection change
  useEffect(() => {
    if (!structureWorkplanAnalysis?.proposal_mandatory) {
      return
    }

    // Skip if already initialized to prevent overwriting user changes
    if (hasAppliedInitialSections.current) {
      return
    }

    // If parent provides initialSelectedSections (from DynamoDB), apply them once
    if (initialSelectedSections && initialSelectedSections.length > 0) {
      setSelectedSections(initialSelectedSections)
      setLastGeneratedSections(initialSelectedSections)
      hasAppliedInitialSections.current = true
      setHasInitialized(true)
      return
    }

    // Fallback to mandatory sections if no initial sections provided
    if (!hasInitialized) {
      const mandatorySectionTitles = structureWorkplanAnalysis.proposal_mandatory.map(
        s => s.section_title
      )
      setSelectedSections(mandatorySectionTitles)
      hasAppliedInitialSections.current = true
      setHasInitialized(true)
    }
  }, [structureWorkplanAnalysis, initialSelectedSections, hasInitialized])

  // Update state when initialGeneratedContent changes (loaded from parent)
  useEffect(() => {
    if (initialGeneratedContent && !generatedProposal) {
      setGeneratedProposal(initialGeneratedContent)
      setGenerationStatus('completed')
    }
  }, [initialGeneratedContent, generatedProposal])

  // Notify parent when selected sections change
  useEffect(() => {
    if (hasInitialized && onSelectedSectionsChange) {
      onSelectedSectionsChange(selectedSections)
    }
  }, [selectedSections, hasInitialized, onSelectedSectionsChange])

  // Check if sections have changed since last generation (to show regenerate option)
  const sectionsChangedSinceGeneration = useCallback(() => {
    if (generationStatus !== 'completed') {
      return false
    }
    if (selectedSections.length !== lastGeneratedSections.length) {
      return true
    }
    const sortedCurrent = [...selectedSections].sort()
    const sortedLast = [...lastGeneratedSections].sort()
    return !sortedCurrent.every((s, i) => s === sortedLast[i])
  }, [selectedSections, lastGeneratedSections, generationStatus])

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

  // Poll for AI template generation status
  const pollTemplateStatus = useCallback(async () => {
    if (!proposalId) return

    // Prevent multiple polling instances
    if (isPollingRef.current) {
      console.log('[Step3] Polling already in progress, skipping')
      return
    }

    let attempts = 0
    const maxAttempts = 120 // 6 minutes max (3 second intervals)

    // Mark polling as active
    isPollingRef.current = true

    const poll = async () => {
      // Check if polling was cancelled (component unmounted or new generation started)
      if (!isPollingRef.current) {
        console.log('[Step3] Polling cancelled, stopping')
        return
      }

      attempts++
      try {
        const status = await proposalService.getProposalTemplateStatus(proposalId)

        if (status.status === 'completed' && status.data) {
          const content = status.data.generated_proposal
          setGeneratedProposal(content)
          setGenerationStatus('completed')
          setIsGenerating(false)
          // Save the sections used for this generation
          setLastGeneratedSections([...selectedSections])
          // Mark polling as complete
          isPollingRef.current = false

          // Notify parent about the generated content
          if (onGeneratedContentChange) {
            onGeneratedContentChange(content)
          }

          // Notify parent that template was generated
          if (onTemplateGenerated) {
            onTemplateGenerated()
          }
        } else if (status.status === 'failed') {
          setGenerationError(status.error || 'Generation failed')
          setGenerationStatus('failed')
          setIsGenerating(false)
          isPollingRef.current = false
        } else if (attempts >= maxAttempts) {
          setGenerationError('Generation timeout. Please try again.')
          setGenerationStatus('failed')
          setIsGenerating(false)
          isPollingRef.current = false
        } else {
          // Continue polling only if still active
          if (isPollingRef.current) {
            pollingTimeoutRef.current = setTimeout(poll, 3000)
          }
        }
      } catch (error) {
        setGenerationError('Failed to check generation status')
        setGenerationStatus('failed')
        setIsGenerating(false)
        isPollingRef.current = false
      }
    }

    poll()
  }, [proposalId, onTemplateGenerated, onGeneratedContentChange, selectedSections])

  const handleGenerateTemplate = async (e?: React.MouseEvent) => {
    // Prevent default behavior and stop propagation
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    if (!proposalId || !structureWorkplanAnalysis) {
      showError('Missing data', 'Proposal data not found')
      return
    }

    // Validate that at least one section is selected
    if (selectedSections.length === 0) {
      showError('Missing selection', 'Please select at least one section to include in the template.')
      return
    }

    // Stop any existing polling before starting new generation
    isPollingRef.current = false
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current)
      pollingTimeoutRef.current = null
    }

    setIsGenerating(true)
    setGenerationStatus('processing')
    setGenerationError(null)

    try {
      // Call the AI generation API
      const result = await proposalService.generateAiProposalTemplate(
        proposalId,
        selectedSections
      )

      if (result.status === 'processing') {
        // Start polling for completion
        pollTemplateStatus()
      } else if (result.status === 'completed') {
        // Already completed (unlikely but handle it)
        const status = await proposalService.getProposalTemplateStatus(proposalId)
        if (status.data?.generated_proposal) {
          const content = status.data.generated_proposal
          setGeneratedProposal(content)
          setGenerationStatus('completed')
          setIsGenerating(false)

          if (onGeneratedContentChange) {
            onGeneratedContentChange(content)
          }

          if (onTemplateGenerated) {
            onTemplateGenerated()
          }
        }
      } else {
        throw new Error(result.message || 'Failed to start generation')
      }
    } catch (error: unknown) {
      const err = error as { message?: string }
      setGenerationError(err.message || 'Failed to generate template')
      setGenerationStatus('failed')
      setIsGenerating(false)
      showError('Generation failed', `Failed to generate template: ${err.message || 'Unknown error'}`)
    }
  }

  // Download generated proposal as DOCX
  const [isDownloading, setIsDownloading] = useState(false)

  /**
   * Parse inline formatting (bold, italic) into TextRun array
   */
  const parseInlineFormatting = useCallback((text: string): TextRun[] => {
    const runs: TextRun[] = []
    // Match **bold** and *italic* patterns
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }))
      }

      const matchedText = match[0]
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        runs.push(new TextRun({ text: matchedText.slice(2, -2), bold: true }))
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        runs.push(new TextRun({ text: matchedText.slice(1, -1), italics: true }))
      }

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      runs.push(new TextRun({ text: text.slice(lastIndex) }))
    }

    return runs.length > 0 ? runs : [new TextRun({ text })]
  }, [])

  /**
   * Convert markdown content to docx Paragraph/Table array
   */
  const markdownToParagraphs = useCallback((markdown: string): (Paragraph | Table)[] => {
    const elements: (Paragraph | Table)[] = []
    const lines = markdown.split('\n')
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
    const parseTableRowCells = (line: string): string[] => {
      return line
        .split('|')
        .map(cell => cell.trim())
        .filter((_, index, arr) => {
          if (index === 0 && arr[0] === '') return false
          if (index === arr.length - 1 && arr[arr.length - 1] === '') return false
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // Check for table rows
      if (isTableRow(trimmedLine)) {
        if (isTableSeparator(trimmedLine)) {
          inTable = true
          continue
        }

        if (!inTable && tableHeaders.length === 0) {
          tableHeaders = parseTableRowCells(trimmedLine)
        } else {
          inTable = true
          tableRows.push(parseTableRowCells(trimmedLine))
        }
        continue
      }

      // Flush table if we hit a non-table line
      if (inTable || tableHeaders.length > 0) {
        flushTable()
      }

      // Skip empty lines but add spacing
      if (!trimmedLine) {
        continue
      }

      // Headers
      if (trimmedLine.startsWith('#### ')) {
        elements.push(
          new Paragraph({
            children: parseInlineFormatting(trimmedLine.slice(5)),
            heading: HeadingLevel.HEADING_4,
            spacing: { before: 200, after: 100 },
          })
        )
      } else if (trimmedLine.startsWith('### ')) {
        elements.push(
          new Paragraph({
            children: parseInlineFormatting(trimmedLine.slice(4)),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 120 },
          })
        )
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(
          new Paragraph({
            children: parseInlineFormatting(trimmedLine.slice(3)),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 280, after: 140 },
          })
        )
      } else if (trimmedLine.startsWith('# ')) {
        elements.push(
          new Paragraph({
            children: parseInlineFormatting(trimmedLine.slice(2)),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 320, after: 160 },
          })
        )
      }
      // Bullet points
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({ text: '• ' }),
              ...parseInlineFormatting(trimmedLine.slice(2)),
            ],
            spacing: { before: 60, after: 60 },
            indent: { left: 720 },
          })
        )
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(trimmedLine)) {
        const match = trimmedLine.match(/^(\d+\.)\s(.*)$/)
        if (match) {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: match[1] + ' ' }),
                ...parseInlineFormatting(match[2]),
              ],
              spacing: { before: 60, after: 60 },
              indent: { left: 720 },
            })
          )
        }
      }
      // Regular paragraphs
      else {
        elements.push(
          new Paragraph({
            children: parseInlineFormatting(trimmedLine),
            spacing: { before: 120, after: 120 },
          })
        )
      }
    }

    // Flush any remaining table
    flushTable()

    return elements
  }, [parseInlineFormatting])

  const handleDownloadGeneratedProposal = async () => {
    if (!generatedProposal) {
      return
    }

    setIsDownloading(true)
    try {
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      // Build document paragraphs
      const documentParagraphs: (Paragraph | Table)[] = []

      // Add title
      documentParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'AI Generated Proposal Draft',
              bold: true,
              size: 32,
              color: '166534',
            }),
          ],
          spacing: { after: 200 },
          alignment: AlignmentType.CENTER,
        })
      )

      // Add generation date
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

      // Add proposal ID if available
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
      }

      // Add separator
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
      const contentSections = markdownToParagraphs(generatedProposal)
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
              text: 'Generated by IGAD Proposal Writer - AI Assistant',
              size: 18,
              color: '9CA3AF',
              italics: true,
            }),
          ],
          alignment: AlignmentType.CENTER,
        })
      )

      // Create document
      const doc = new Document({
        sections: [
          {
            children: documentParagraphs,
            properties: {
              page: {
                margin: {
                  top: 1440,
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
      a.download = `ai_proposal_draft_${proposalId || 'draft'}_${new Date().toISOString().slice(0, 10)}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      // Removed console.error
      showError('Download failed', 'Failed to download document. Please try again.')
    } finally {
      setIsDownloading(false)
    }
  }

  // Show skeleton loading state if no analysis yet
  if (!structureWorkplanAnalysis) {
    return <Step3Skeleton />
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
            <Sparkles className={styles.sectionIcon} size={20} />
            <div>
              <h3 className={styles.sectionTitle}>AI Proposal Draft Generation</h3>
              <p className={styles.sectionSubtitle}>
                Generate a complete AI-written proposal draft based on your selected sections,
                concept document, and all previous analyses
              </p>
            </div>
          </div>

          {/* Generating State */}
          {isGenerating && generationStatus === 'processing' && (
            <div className={styles.generatingState}>
              <div className={styles.generatingSpinner}>
                <Loader2 className={styles.spinnerIcon} size={24} />
              </div>
              <div className={styles.generatingInfo}>
                <h4 className={styles.generatingTitle}>Generating your proposal draft...</h4>
                <p className={styles.generatingText}>
                  Our AI is analyzing your RFP requirements, concept document, and selected sections
                  to create a comprehensive proposal draft. This typically takes 3-5 minutes.
                </p>
                <div className={styles.generatingSteps}>
                  <div className={styles.generatingStep}>
                    <span className={styles.stepDot}></span>
                    Analyzing all input documents and context
                  </div>
                  <div className={styles.generatingStep}>
                    <span className={styles.stepDot}></span>
                    Generating content for {selectedSections.length} sections
                  </div>
                  <div className={styles.generatingStep}>
                    <span className={styles.stepDot}></span>
                    Ensuring alignment with donor requirements
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {generationStatus === 'failed' && generationError && (
            <div className={styles.errorState}>
              <p className={styles.errorText}>{generationError}</p>
              <button
                type="button"
                className={styles.retryButton}
                onClick={e => handleGenerateTemplate(e)}
              >
                Retry Generation
              </button>
            </div>
          )}

          {/* Success State - Show Generated Content */}
          {generationStatus === 'completed' && generatedProposal && !sectionsChangedSinceGeneration() && (
            <div className={styles.successState}>
              <div className={styles.successHeader}>
                <Check className={styles.successIcon} size={20} />
                <span>Proposal draft generated successfully!</span>
              </div>
              <div className={styles.generatedPreview}>
                <div className={styles.previewContent}>
                  {generatedProposal.slice(0, 500)}
                  {generatedProposal.length > 500 && '...'}
                </div>
              </div>
              <div className={styles.downloadActions}>
                <button
                  type="button"
                  className={styles.downloadButton}
                  onClick={handleDownloadGeneratedProposal}
                  disabled={isDownloading}
                >
                  <Download size={16} />
                  {isDownloading ? 'Downloading...' : 'Download Full Draft (DOCX)'}
                </button>
                <button
                  type="button"
                  className={styles.regenerateButton}
                  onClick={e => handleGenerateTemplate(e)}
                  disabled={isDownloading}
                >
                  <Sparkles size={16} />
                  Regenerate
                </button>
              </div>
            </div>
          )}

          {/* Sections Changed State - Show Warning and Regenerate */}
          {generationStatus === 'completed' && generatedProposal && sectionsChangedSinceGeneration() && (
            <div className={styles.sectionsChangedState}>
              <div className={styles.warningHeader}>
                <AlertTriangle className={styles.warningIcon} size={20} />
                <span>Selected sections have changed</span>
              </div>
              <p className={styles.warningText}>
                You have modified the selected sections since the last draft was generated.
                Please regenerate the proposal to include your updated selection.
              </p>
              <button
                type="button"
                className={styles.generateButton}
                onClick={e => handleGenerateTemplate(e)}
                disabled={isGenerating || selectedSections.length === 0}
              >
                <Sparkles size={16} />
                Regenerate AI Proposal Draft ({selectedSections.length} sections)
              </button>
              <div className={styles.previousDraftNote}>
                <span>Previous draft is still available: </span>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={handleDownloadGeneratedProposal}
                  disabled={isDownloading}
                >
                  {isDownloading ? 'Downloading...' : 'Download Previous Draft (DOCX)'}
                </button>
              </div>
            </div>
          )}

          {/* Initial State - Show Generate Button */}
          {generationStatus === 'idle' && (
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
              <Sparkles size={16} />
              {selectedSections.length === 0
                ? 'Select sections first'
                : `Generate AI Proposal Draft (${selectedSections.length} sections)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Step3StructureWorkplan
