/**
 * Step4DraftPreview
 *
 * Newsletter Generator Step 4: Draft & Preview
 * Generates full newsletter draft from outline, allows inline editing, and exports.
 *
 * Features:
 * - AI draft generation from Step 3 outline
 * - Canvas-style preview (Looker Studio inspired)
 * - Inline section editing with markdown support
 * - Preview/Edit mode toggle
 * - Export to HTML, Markdown, or Plain Text
 * - Auto-save with debounce
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Info,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Check,
  X,
  Download,
  Edit3,
  Eye,
  FileText,
  Clock,
  ChevronDown,
  Save,
  Mail,
  File,
} from 'lucide-react'
import { NewsletterLayout } from '../components/NewsletterLayout'
import { useNewsletter } from '../hooks/useNewsletter'
import {
  newsletterService,
  type DraftData,
  type DraftSection,
  type OutlineData,
} from '../services/newsletterService'
import { useToast } from '@/shared/hooks/useToast'
import {
  DEFAULT_NEWSLETTER_CONFIG,
  LENGTH_OPTIONS,
  EXPORT_FORMAT_OPTIONS,
  type ExportFormat,
} from '../types/newsletter'
import styles from './newsletterGenerator.module.css'
import step4Styles from './Step4DraftPreview.module.css'

const POLLING_INTERVAL = 2000 // 2 seconds
const POLLING_TIMEOUT = 300000 // 5 minutes
const AUTO_SAVE_DELAY = 1000 // 1 second debounce

type ViewMode = 'preview' | 'edit'

export function Step4DraftPreview() {
  const { newsletterCode } = useParams<{ newsletterCode: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  // Newsletter hook for config data
  const { newsletter, isLoading, isSaving } = useNewsletter({
    newsletterCode,
    autoSaveDelay: AUTO_SAVE_DELAY,
  })

  // Local state for outline (from Step 3)
  const [outlineData, setOutlineData] = useState<OutlineData | null>(null)
  const [isLoadingOutline, setIsLoadingOutline] = useState(true)

  // Local state for draft
  const [draftData, setDraftData] = useState<DraftData | null>(null)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  // Polling state
  const [isPolling, setIsPolling] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingStartTimeRef = useRef<number | null>(null)

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Export state
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  // Auto-save debounce
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Extract config values
  const lengthPreference =
    newsletter?.length_preference ?? DEFAULT_NEWSLETTER_CONFIG.length_preference
  const lengthOption = LENGTH_OPTIONS.find(l => l.value === lengthPreference)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Load outline data on mount
  useEffect(() => {
    if (!newsletterCode) {
      return
    }

    const loadOutline = async () => {
      try {
        setIsLoadingOutline(true)
        const data = await newsletterService.getOutline(newsletterCode)
        setOutlineData(data)
      } catch {
        showError('Failed to load outline data')
      } finally {
        setIsLoadingOutline(false)
      }
    }

    loadOutline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsletterCode])

  // Load draft data on mount
  useEffect(() => {
    if (!newsletterCode) {
      return
    }

    const loadDraft = async () => {
      try {
        setIsLoadingDraft(true)
        const data = await newsletterService.getDraft(newsletterCode)
        setDraftData(data)

        // If draft is processing, start polling
        if (data.draft_status === 'processing') {
          startPolling()
        }

        // Expand all sections by default
        if (data.sections?.length > 0) {
          setExpandedSections(new Set(data.sections.map(s => s.id)))
        }
      } catch {
        // Draft may not exist yet - this is fine
        setDraftData({
          title: newsletter?.title || 'Newsletter Draft',
          sections: [],
          draft_status: 'pending',
          metadata: { wordCount: 0, readingTime: '0 min' },
          user_edits: { sectionsEdited: 0 },
        })
      } finally {
        setIsLoadingDraft(false)
      }
    }

    loadDraft()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsletterCode])

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Polling functions
  const stopPolling = useCallback(() => {
    setIsPolling(false)
    pollingStartTimeRef.current = null

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      return
    }

    setIsPolling(true)
    pollingStartTimeRef.current = Date.now()

    pollingIntervalRef.current = setInterval(async () => {
      if (!newsletterCode) {
        return
      }

      // Check timeout
      if (
        pollingStartTimeRef.current &&
        Date.now() - pollingStartTimeRef.current > POLLING_TIMEOUT
      ) {
        stopPolling()
        showError('Draft generation timed out', 'Please try again.')
        setDraftData(prev =>
          prev
            ? {
                ...prev,
                draft_status: 'failed',
                draft_error: 'Generation timed out after 5 minutes',
              }
            : null
        )
        return
      }

      try {
        const status = await newsletterService.getDraftStatus(newsletterCode)
        setDraftData(status)

        if (status.draft_status === 'completed' || status.draft_status === 'failed') {
          stopPolling()

          if (status.draft_status === 'completed') {
            showSuccess('Draft generated successfully!')
            // Expand all sections
            if (status.sections?.length > 0) {
              setExpandedSections(new Set(status.sections.map(s => s.id)))
            }
          }
        }
      } catch {
        // Continue polling on transient errors
      }
    }, POLLING_INTERVAL)
  }, [newsletterCode, showError, showSuccess, stopPolling])

  // Cleanup polling on unmount
  useEffect(() => {
    const autoSaveTimeout = autoSaveTimeoutRef.current
    return () => {
      stopPolling()
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout)
      }
    }
  }, [stopPolling])

  // Check if Step 3 is complete
  const isStep3Complete = useMemo(() => {
    return (
      outlineData?.outline_status === 'completed' &&
      outlineData?.sections?.length > 0 &&
      outlineData.sections.some(s => s.items?.length > 0)
    )
  }, [outlineData])

  // Calculate completed steps
  const completedSteps: number[] = []
  if (newsletter?.current_step && newsletter.current_step > 1) {
    completedSteps.push(1)
  }
  if (newsletter?.current_step && newsletter.current_step > 2) {
    completedSteps.push(2)
  }
  if (newsletter?.current_step && newsletter.current_step > 3) {
    completedSteps.push(3)
  }

  // Check if can export
  const canExport = useMemo(() => {
    return (
      draftData?.draft_status === 'completed' &&
      draftData?.sections?.length > 0 &&
      draftData.sections.some(s => s.content?.trim())
    )
  }, [draftData])

  // Handle generate draft
  const handleGenerateDraft = async () => {
    if (!newsletterCode || !isStep3Complete) {
      return
    }

    setIsGenerating(true)

    try {
      const result = await newsletterService.generateDraft(newsletterCode)

      if (result.success) {
        setDraftData(prev => ({
          ...prev!,
          title: result.title || prev?.title || 'Newsletter Draft',
          subtitle: result.subtitle,
          sections: result.sections || [],
          draft_status: result.draft_status as DraftData['draft_status'],
          generated_at: result.generated_at,
          metadata: result.metadata || prev?.metadata || { wordCount: 0, readingTime: '0 min' },
          draft_error: undefined,
        }))

        // If still processing, start polling
        if (result.draft_status === 'processing') {
          startPolling()
        } else if (result.draft_status === 'completed') {
          showSuccess('Draft generated successfully!')
          // Expand all sections
          if (result.sections?.length) {
            setExpandedSections(new Set(result.sections.map(s => s.id)))
          }
        }
      } else {
        setDraftData(prev => ({
          ...prev!,
          draft_status: 'failed',
          draft_error: result.draft_error || 'Unknown error',
        }))
        showError('Failed to generate draft')
      }
    } catch {
      showError('Failed to start draft generation')
      setDraftData(prev =>
        prev
          ? {
              ...prev,
              draft_status: 'failed',
              draft_error: 'Network error. Please try again.',
            }
          : null
      )
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle regenerate with confirmation
  const handleRegenerate = async () => {
    const hasEdits =
      draftData?.user_edits?.sectionsEdited && draftData.user_edits.sectionsEdited > 0
    if (hasEdits) {
      const confirmed = window.confirm(
        'Regenerating will replace your current draft. Any edits will be lost. Continue?'
      )
      if (!confirmed) {
        return
      }
    }

    await handleGenerateDraft()
  }

  // Toggle section expand/collapse
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Start editing a section
  const startEditing = (section: DraftSection) => {
    setEditingSectionId(section.id)
    setEditContent(section.content)
    setViewMode('edit')
  }

  // Save section edit
  const saveSectionEdit = async () => {
    if (!editingSectionId || !draftData || !newsletterCode) {
      return
    }

    setIsSavingDraft(true)

    try {
      // Update local state first for immediate feedback
      const updatedSections = draftData.sections.map(section =>
        section.id === editingSectionId
          ? { ...section, content: editContent, isEdited: true }
          : section
      )

      setDraftData(prev => ({
        ...prev!,
        sections: updatedSections,
      }))

      // Save to backend
      await newsletterService.saveDraftSection(newsletterCode, editingSectionId, {
        content: editContent,
      })

      setEditingSectionId(null)
      setEditContent('')
      showSuccess('Section saved')
    } catch {
      showError('Failed to save section')
    } finally {
      setIsSavingDraft(false)
    }
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingSectionId(null)
    setEditContent('')
  }

  // Handle export
  const handleExport = async (format: ExportFormat) => {
    if (!newsletterCode || !canExport) {
      return
    }

    setIsExporting(true)
    setShowExportDropdown(false)

    try {
      const result = await newsletterService.exportDraft(newsletterCode, format)

      if (result.success) {
        // Create and download file
        const blob = new Blob([result.content], { type: result.mime_type })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        showSuccess(`Newsletter exported as ${format.toUpperCase()}`)
      } else {
        showError('Failed to export newsletter')
      }
    } catch {
      showError('Failed to export newsletter')
    } finally {
      setIsExporting(false)
    }
  }

  // Navigation handlers
  const handlePrevious = () => {
    navigate(`/newsletter-generator/${newsletterCode}/step-3`)
  }

  // Navigation buttons
  const navigationButtons = [
    <button
      key="previous"
      className={`${styles.navButton} ${styles.navButtonSecondary}`}
      onClick={handlePrevious}
      disabled={isLoading}
    >
      <ChevronLeft size={18} />
      Previous
    </button>,
    <div key="export" className={step4Styles.exportButtonWrapper} ref={exportDropdownRef}>
      <button
        className={`${styles.navButton} ${styles.navButtonPrimary}`}
        onClick={() => setShowExportDropdown(!showExportDropdown)}
        disabled={!canExport || isExporting}
      >
        {isExporting ? (
          <>
            <div className={step4Styles.spinner} />
            Exporting...
          </>
        ) : (
          <>
            <Download size={18} />
            Export
            <ChevronDown size={16} />
          </>
        )}
      </button>
      {showExportDropdown && (
        <div className={step4Styles.exportDropdown}>
          {EXPORT_FORMAT_OPTIONS.map(option => (
            <button
              key={option.value}
              className={step4Styles.exportOption}
              onClick={() => handleExport(option.value)}
            >
              {option.value === 'html' && <Mail size={16} />}
              {option.value === 'markdown' && <FileText size={16} />}
              {option.value === 'text' && <File size={16} />}
              <div className={step4Styles.exportOptionText}>
                <span className={step4Styles.exportOptionLabel}>{option.label}</span>
                <span className={step4Styles.exportOptionDesc}>{option.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>,
  ]

  // Get status display
  const draftStatus = draftData?.draft_status ?? 'pending'
  const isProcessing = draftStatus === 'processing' || isGenerating || isPolling

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) {
      return null
    }
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  // Render markdown content as HTML (basic)
  const renderMarkdown = (content: string) => {
    if (!content) {
      return ''
    }

    let html = content

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>')
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>')

    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

    // Links
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>')
    html = html.replace(/\n/g, '<br />')

    return `<p>${html}</p>`
  }

  return (
    <NewsletterLayout
      currentStep={4}
      completedSteps={completedSteps}
      navigationButtons={navigationButtons}
      newsletterCode={newsletter?.newsletterCode}
      newsletterId={newsletter?.id}
      newsletterStatus={newsletter?.status}
      isLoadingNewsletter={isLoading}
      isLoadingStepData={isLoading || isLoadingOutline || isLoadingDraft}
    >
      <div className={styles.stepContentWrapper}>
        {/* Info Card */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardTitle}>
            <Info
              size={18}
              style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}
            />
            Draft & Preview
          </div>
          <p className={styles.infoCardDescription}>
            Generate your complete newsletter from the outline. Review the preview, edit sections
            inline, and export in your preferred format when ready.
          </p>
        </div>

        {/* Step 3 Incomplete Warning */}
        {!isLoadingOutline && !isStep3Complete && (
          <div className={step4Styles.step3Warning}>
            <AlertTriangle size={40} />
            <p className={step4Styles.step3WarningText}>
              Please complete the outline review in Step 3 before generating your newsletter draft.
              Your outline needs at least one section with items.
            </p>
            <button
              className={step4Styles.step3WarningButton}
              onClick={() => navigate(`/newsletter-generator/${newsletterCode}/step-3`)}
            >
              Go to Step 3
            </button>
          </div>
        )}

        {/* Draft Generator */}
        {isStep3Complete && (
          <div className={styles.formCard}>
            <h3 className={styles.formCardTitle}>Draft Generation</h3>
            <p className={styles.formCardDescription}>
              Generate a complete newsletter draft from your outline.
              {lengthOption && ` Target: ${lengthOption.description}`}
            </p>

            <div className={step4Styles.draftGenerator}>
              {/* Status Display */}
              <div className={step4Styles.generatorStatus}>
                <div className={step4Styles.generatorStatusIcon}>
                  {draftStatus === 'pending' && (
                    <Clock size={20} className={step4Styles.generatorStatusPending} />
                  )}
                  {draftStatus === 'processing' && <div className={step4Styles.spinner} />}
                  {draftStatus === 'completed' && (
                    <Check size={20} className={step4Styles.generatorStatusCompleted} />
                  )}
                  {draftStatus === 'failed' && (
                    <X size={20} className={step4Styles.generatorStatusFailed} />
                  )}
                </div>
                <span className={step4Styles.generatorStatusText}>
                  {draftStatus === 'pending' && 'Ready to generate draft'}
                  {draftStatus === 'processing' && 'Generating draft...'}
                  {draftStatus === 'completed' && 'Draft generated'}
                  {draftStatus === 'failed' && (draftData?.draft_error || 'Generation failed')}
                </span>
                {draftStatus === 'completed' && draftData?.metadata && (
                  <span className={step4Styles.generatorStatusMeta}>
                    {draftData.metadata.wordCount} words &middot; {draftData.metadata.readingTime}{' '}
                    read
                  </span>
                )}
              </div>

              {/* Generate / Regenerate Buttons */}
              {(draftStatus === 'pending' || draftStatus === 'failed') && (
                <button
                  className={step4Styles.generateButton}
                  onClick={handleGenerateDraft}
                  disabled={isProcessing || !isStep3Complete}
                >
                  {isProcessing ? (
                    <>
                      <div className={`${step4Styles.spinner} ${step4Styles.spinnerWhite}`} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate Draft
                    </>
                  )}
                </button>
              )}

              {draftStatus === 'completed' && (
                <button
                  className={step4Styles.regenerateButton}
                  onClick={handleRegenerate}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className={step4Styles.spinner} />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Regenerate Draft
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Draft Canvas */}
        {draftStatus === 'completed' && draftData && draftData.sections.length > 0 && (
          <div className={step4Styles.canvasContainer}>
            {/* Toolbar */}
            <div className={step4Styles.toolbar}>
              <div className={step4Styles.toolbarLeft}>
                <div className={step4Styles.modeToggle}>
                  <button
                    className={`${step4Styles.modeButton} ${
                      viewMode === 'preview' ? step4Styles.modeButtonActive : ''
                    }`}
                    onClick={() => setViewMode('preview')}
                  >
                    <Eye size={16} />
                    Preview
                  </button>
                  <button
                    className={`${step4Styles.modeButton} ${
                      viewMode === 'edit' ? step4Styles.modeButtonActive : ''
                    }`}
                    onClick={() => setViewMode('edit')}
                  >
                    <Edit3 size={16} />
                    Edit
                  </button>
                </div>
              </div>
              <div className={step4Styles.toolbarRight}>
                {draftData.generated_at && (
                  <span className={step4Styles.toolbarMeta}>
                    Generated {formatDate(draftData.generated_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Canvas */}
            <div className={step4Styles.canvas}>
              {/* Newsletter Header */}
              <header className={step4Styles.canvasHeader}>
                <h1 className={step4Styles.canvasTitle}>{draftData.title}</h1>
                {draftData.subtitle && (
                  <p className={step4Styles.canvasSubtitle}>{draftData.subtitle}</p>
                )}
              </header>

              {/* Sections */}
              <div className={step4Styles.canvasSections}>
                {draftData.sections.map(section => (
                  <div key={section.id} className={step4Styles.canvasSection}>
                    {/* Section Header */}
                    <div
                      className={step4Styles.canvasSectionHeader}
                      onClick={() => toggleSection(section.id)}
                    >
                      <ChevronDown
                        size={18}
                        className={`${step4Styles.sectionChevron} ${
                          expandedSections.has(section.id) ? step4Styles.sectionChevronExpanded : ''
                        }`}
                      />
                      <span className={step4Styles.sectionTitle}>{section.title}</span>
                      {section.isEdited && <span className={step4Styles.editedBadge}>Edited</span>}
                      {viewMode === 'edit' && expandedSections.has(section.id) && (
                        <button
                          className={step4Styles.editButton}
                          onClick={e => {
                            e.stopPropagation()
                            startEditing(section)
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Section Content */}
                    {expandedSections.has(section.id) && (
                      <div className={step4Styles.canvasSectionContent}>
                        {editingSectionId === section.id ? (
                          <div className={step4Styles.editArea}>
                            <textarea
                              className={step4Styles.editTextarea}
                              value={editContent}
                              onChange={e => setEditContent(e.target.value)}
                              placeholder="Enter markdown content..."
                            />
                            <div className={step4Styles.editActions}>
                              <button
                                className={step4Styles.editCancelButton}
                                onClick={cancelEditing}
                              >
                                Cancel
                              </button>
                              <button
                                className={step4Styles.editSaveButton}
                                onClick={saveSectionEdit}
                                disabled={isSavingDraft}
                              >
                                {isSavingDraft ? (
                                  <>
                                    <div className={step4Styles.spinner} />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save size={14} />
                                    Save
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={step4Styles.contentPreview}
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(section.content),
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Auto-save indicator */}
        {(isSaving || isSavingDraft) && (
          <div style={{ textAlign: 'center', color: '#717182', fontSize: '13px' }}>
            Saving changes...
          </div>
        )}
      </div>
    </NewsletterLayout>
  )
}
