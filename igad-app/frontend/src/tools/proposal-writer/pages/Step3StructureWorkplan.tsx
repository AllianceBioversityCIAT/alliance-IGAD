import { useState, useEffect, useCallback } from 'react'
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
import styles from './step3-structure.module.css'
import { StepProps } from './stepConfig'
import { proposalService } from '../services/proposalService'

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

  // Initialize selected sections when data becomes available (only if not already initialized from props)
  useEffect(() => {
    if (structureWorkplanAnalysis?.proposal_mandatory && !hasInitialized) {
      // If we have initial sections from parent (loaded from storage), use those
      if (initialSelectedSections && initialSelectedSections.length > 0) {
        setSelectedSections(initialSelectedSections)
        setLastGeneratedSections(initialSelectedSections)
      } else {
        // Otherwise default to mandatory sections
        const mandatorySectionTitles = structureWorkplanAnalysis.proposal_mandatory.map(
          s => s.section_title
        )
        setSelectedSections(mandatorySectionTitles)
      }
      setHasInitialized(true)
    }
  }, [structureWorkplanAnalysis, hasInitialized, initialSelectedSections])

  // Update state when initialGeneratedContent changes (loaded from parent)
  useEffect(() => {
    if (initialGeneratedContent && !generatedProposal) {
      setGeneratedProposal(initialGeneratedContent)
      setGenerationStatus('completed')
    }
  }, [initialGeneratedContent, generatedProposal])

  // Update state when initialSelectedSections changes (loaded from parent)
  useEffect(() => {
    if (initialSelectedSections && initialSelectedSections.length > 0 && hasInitialized) {
      setSelectedSections(initialSelectedSections)
      setLastGeneratedSections(initialSelectedSections)
    }
  }, [initialSelectedSections, hasInitialized])

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

    let attempts = 0
    const maxAttempts = 120 // 6 minutes max (3 second intervals)

    const poll = async () => {
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
        } else if (attempts >= maxAttempts) {
          setGenerationError('Generation timeout. Please try again.')
          setGenerationStatus('failed')
          setIsGenerating(false)
        } else {
          // Continue polling
          setTimeout(poll, 3000)
        }
      } catch (error) {
        setGenerationError('Failed to check generation status')
        setGenerationStatus('failed')
        setIsGenerating(false)
      }
    }

    poll()
  }, [proposalId, onTemplateGenerated, onGeneratedContentChange])

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
      alert(`Failed to generate template: ${err.message || 'Unknown error'}`)
    }
  }

  // Download generated proposal as HTML
  const handleDownloadGeneratedProposal = () => {
    if (!generatedProposal) {
      return
    }

    // Convert markdown to HTML (simple conversion)
    const htmlContent = generatedProposal
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n/g, '<br/>')

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AI Generated Proposal Draft</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.8; max-width: 900px; margin: 40px auto; padding: 20px; color: #1f2937; }
    h1 { color: #166534; border-bottom: 3px solid #166534; padding-bottom: 15px; margin-top: 40px; }
    h2 { color: #1f2937; margin-top: 35px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
    h3 { color: #374151; margin-top: 25px; }
    p { margin: 15px 0; }
    strong { color: #1f2937; }
    ul { margin: 15px 0; padding-left: 30px; }
    li { margin: 8px 0; }
    code { background-color: #f3f4f6; padding: 3px 8px; border-radius: 4px; font-size: 0.9em; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .footer { text-align: center; margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="border: none; margin: 0;">AI Generated Proposal Draft</h1>
    <p style="color: #6b7280;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>
  ${htmlContent}
  <div class="footer">
    <p>Generated by IGAD Proposal Writer - AI Assistant</p>
  </div>
</body>
</html>`

    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai_proposal_draft_${proposalId}_${new Date().toISOString().slice(0, 10)}.html`
    a.click()
    URL.revokeObjectURL(url)
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
                >
                  <Download size={16} />
                  Download Full Draft (HTML)
                </button>
                <button
                  type="button"
                  className={styles.regenerateButton}
                  onClick={e => handleGenerateTemplate(e)}
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
                >
                  Download Previous Draft
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
