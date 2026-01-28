/**
 * Step3OutlineReview
 *
 * Newsletter Generator Step 3: Outline Review
 * Allows users to review, edit, and customize an AI-generated newsletter outline.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Check,
  X,
  Plus,
  Trash2,
  FileText,
  Clock,
} from 'lucide-react'
import { NewsletterLayout } from '../components/NewsletterLayout'
import { useNewsletter } from '../hooks/useNewsletter'
import {
  newsletterService,
  type TopicsData,
  type OutlineData,
  type OutlineItem,
} from '../services/newsletterService'
import { useToast } from '@/shared/hooks/useToast'
import {
  DEFAULT_NEWSLETTER_CONFIG,
  INFORMATION_TYPES,
  CATEGORY_CONFIG,
  LENGTH_OPTIONS,
} from '../types/newsletter'
import styles from './newsletterGenerator.module.css'
import step3Styles from './Step3OutlineReview.module.css'

const POLLING_INTERVAL = 2000 // 2 seconds
const POLLING_TIMEOUT = 300000 // 5 minutes
const AUTO_SAVE_DELAY = 500 // 500ms debounce

export function Step3OutlineReview() {
  const { newsletterCode } = useParams<{ newsletterCode: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()

  // Newsletter hook for config data
  const { newsletter, isLoading, isSaving, notFound } = useNewsletter({
    newsletterCode,
    autoSaveDelay: AUTO_SAVE_DELAY,
  })

  // Local state for topics (from Step 2)
  const [topicsData, setTopicsData] = useState<TopicsData | null>(null)
  const [isLoadingTopics, setIsLoadingTopics] = useState(true)

  // Local state for outline
  const [outlineData, setOutlineData] = useState<OutlineData | null>(null)
  const [isLoadingOutline, setIsLoadingOutline] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingOutline, setIsSavingOutline] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  // Polling state
  const [isPolling, setIsPolling] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingStartTimeRef = useRef<number | null>(null)

  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['section-intro', 'section-main'])
  )
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ title: string; description: string }>({
    title: '',
    description: '',
  })

  // Add item modal state
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [addItemSectionId, setAddItemSectionId] = useState<string | null>(null)
  const [newItemTitle, setNewItemTitle] = useState('')
  const [newItemDescription, setNewItemDescription] = useState('')
  const [newItemNotes, setNewItemNotes] = useState('')

  // Extract config values
  const lengthPreference =
    newsletter?.length_preference ?? DEFAULT_NEWSLETTER_CONFIG.length_preference
  const lengthOption = LENGTH_OPTIONS.find(l => l.value === lengthPreference)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Load topics data on mount
  useEffect(() => {
    if (!newsletterCode || notFound) {
      return
    }

    const loadTopics = async () => {
      try {
        setIsLoadingTopics(true)
        const data = await newsletterService.getTopics(newsletterCode)
        setTopicsData(data)
      } catch {
        // Don't show error if newsletter not found - handled elsewhere
        if (!notFound) {
          showError('Failed to load content data')
        }
      } finally {
        setIsLoadingTopics(false)
      }
    }

    loadTopics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsletterCode, notFound])

  // Load outline data on mount
  useEffect(() => {
    if (!newsletterCode || notFound) {
      return
    }

    const loadOutline = async () => {
      try {
        setIsLoadingOutline(true)
        const data = await newsletterService.getOutline(newsletterCode)
        setOutlineData(data)

        // If outline is processing, start polling
        if (data.outline_status === 'processing') {
          startPolling()
        }
      } catch {
        // Outline may not exist yet - this is fine (unless newsletter not found)
        if (!notFound) {
          setOutlineData({
            sections: [],
            outline_status: 'pending',
            user_modifications: { items_added: 0, items_removed: 0, items_edited: 0 },
          })
        }
      } finally {
        setIsLoadingOutline(false)
      }
    }

    loadOutline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsletterCode, notFound])

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
        showError('Outline generation timed out', 'Please try again.')
        setOutlineData(prev =>
          prev
            ? {
                ...prev,
                outline_status: 'failed',
                outline_error: 'Generation timed out after 5 minutes',
              }
            : null
        )
        return
      }

      try {
        const status = await newsletterService.getOutlineStatus(newsletterCode)
        setOutlineData(status)

        if (status.outline_status === 'completed' || status.outline_status === 'failed') {
          stopPolling()

          if (status.outline_status === 'completed') {
            showSuccess('Outline generated successfully!')
            // Expand all sections with items
            const sectionsWithItems = status.sections.filter(s => s.items.length > 0).map(s => s.id)
            setExpandedSections(new Set(sectionsWithItems))
          }
        }
      } catch {
        // Continue polling on transient errors
      }
    }, POLLING_INTERVAL)
  }, [newsletterCode, showError, showSuccess, stopPolling])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // Check if Step 2 is complete
  const isStep2Complete = useMemo(() => {
    return (
      topicsData?.retrieval_status === 'completed' && (topicsData?.total_chunks_retrieved ?? 0) > 0
    )
  }, [topicsData])

  // Calculate completed steps
  const completedSteps: number[] = []
  if (newsletter?.current_step && newsletter.current_step > 1) {
    completedSteps.push(1)
  }
  if (newsletter?.current_step && newsletter.current_step > 2) {
    completedSteps.push(2)
  }

  // Check if has custom items
  const hasCustomItems = useMemo(() => {
    if (!outlineData?.sections) {
      return false
    }
    return outlineData.sections.flatMap(s => s.items).some(item => item.is_custom)
  }, [outlineData])

  // Check if can proceed - Flexible validation (UX optimized)
  // Requirements:
  // 1. Main Content section MUST have at least 1 INCLUDED item (core editorial requirement)
  // 2. At least 2 sections total with INCLUDED items (ensures newsletter has substance)
  // 3. All INCLUDED items meet quality standards (title >= 5 chars, description >= 10 chars)
  const canProceed = useMemo(() => {
    if (!outlineData) {
      return false
    }

    // Must have completed generation
    if (outlineData.outline_status !== 'completed') {
      return false
    }

    // Must have at least some sections
    if (outlineData.sections.length === 0) {
      return false
    }

    // Helper: check if item is included (treat undefined as true for backwards compatibility)
    const isIncluded = (item: OutlineItem) => item.included !== false

    // Filter sections with INCLUDED items
    const sectionsWithIncludedItems = outlineData.sections.filter(
      s => s.items.filter(isIncluded).length > 0
    )

    // Must have at least 2 sections with included content (ensures substance)
    if (sectionsWithIncludedItems.length < 2) {
      return false
    }

    // Main Content section must have at least one INCLUDED item (core requirement)
    const mainContentSection = outlineData.sections.find(s => s.id === 'section-main')
    if (!mainContentSection || mainContentSection.items.filter(isIncluded).length === 0) {
      return false
    }

    // All INCLUDED items must meet quality standards
    return outlineData.sections
      .flatMap(s => s.items)
      .filter(isIncluded)
      .every(item => {
        return item.title.trim().length >= 5 && item.description.trim().length >= 10
      })
  }, [outlineData])

  // Helper for validation status message
  const getValidationMessage = useCallback(() => {
    if (!outlineData || outlineData.outline_status !== 'completed') {
      return { message: 'Generate outline to proceed', isReady: false }
    }

    // Helper: check if item is included (treat undefined as true for backwards compatibility)
    const isIncluded = (item: OutlineItem) => item.included !== false

    const sectionsWithIncludedItems = outlineData.sections.filter(
      s => s.items.filter(isIncluded).length > 0
    )
    const mainContentSection = outlineData.sections.find(s => s.id === 'section-main')
    const includedMainContentItems = mainContentSection?.items.filter(isIncluded).length ?? 0

    if (includedMainContentItems === 0) {
      return { message: 'Main Content section needs at least one selected item', isReady: false }
    }

    if (sectionsWithIncludedItems.length < 2) {
      return { message: 'Select content in at least one more section', isReady: false }
    }

    const invalidIncludedItems = outlineData.sections
      .flatMap(s => s.items)
      .filter(isIncluded)
      .filter(item => item.title.trim().length < 5 || item.description.trim().length < 10)

    if (invalidIncludedItems.length > 0) {
      return {
        message: `${invalidIncludedItems.length} selected item(s) need longer titles or descriptions`,
        isReady: false,
      }
    }

    // Count total included items
    const totalIncluded = outlineData.sections.flatMap(s => s.items).filter(isIncluded).length

    return { message: `${totalIncluded} items selected for draft`, isReady: true }
  }, [outlineData])

  const validationStatus = getValidationMessage()

  // Handle generate outline
  const handleGenerateOutline = async () => {
    if (!newsletterCode || !isStep2Complete) {
      return
    }

    setIsGenerating(true)

    try {
      const result = await newsletterService.generateOutline(newsletterCode)

      if (result.success) {
        setOutlineData(prev => ({
          ...prev!,
          sections: result.sections || [],
          outline_status: result.outline_status as OutlineData['outline_status'],
          generated_at: result.generated_at,
          outline_error: undefined,
        }))

        // If still processing, start polling
        if (result.outline_status === 'processing') {
          startPolling()
        } else if (result.outline_status === 'completed') {
          showSuccess('Outline generated successfully!')
          // Expand sections with items
          const sectionsWithItems = (result.sections || [])
            .filter(s => s.items.length > 0)
            .map(s => s.id)
          setExpandedSections(new Set(sectionsWithItems))
        }
      } else {
        setOutlineData(prev => ({
          ...prev!,
          outline_status: 'failed',
          outline_error: result.outline_error || 'Unknown error',
        }))
        showError('Failed to generate outline')
      }
    } catch {
      showError('Failed to start outline generation')
      setOutlineData(prev =>
        prev
          ? {
              ...prev,
              outline_status: 'failed',
              outline_error: 'Network error. Please try again.',
            }
          : null
      )
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle regenerate with confirmation
  const handleRegenerate = async () => {
    if (hasCustomItems) {
      const confirmed = window.confirm(
        'Regenerating will create a new outline. Your custom items will be preserved and added back. Continue?'
      )
      if (!confirmed) {
        return
      }
    }

    await handleGenerateOutline()
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

  // Start editing an item
  const startEditing = (item: OutlineItem) => {
    setEditingItemId(item.id)
    setEditValues({ title: item.title, description: item.description })
  }

  // Save item edit
  const saveItemEdit = async () => {
    if (!editingItemId || !outlineData || !newsletterCode) {
      return
    }

    // Validate
    if (editValues.title.trim().length < 5) {
      showError('Title must be at least 5 characters')
      return
    }
    if (editValues.description.trim().length < 10) {
      showError('Description must be at least 10 characters')
      return
    }

    // Update local state
    const updatedSections = outlineData.sections.map(section => ({
      ...section,
      items: section.items.map(item =>
        item.id === editingItemId
          ? { ...item, title: editValues.title.trim(), description: editValues.description.trim() }
          : item
      ),
    }))

    setOutlineData(prev => ({
      ...prev!,
      sections: updatedSections,
      user_modifications: {
        ...prev!.user_modifications,
        items_edited: prev!.user_modifications.items_edited + 1,
      },
    }))

    setEditingItemId(null)

    // Save to backend
    try {
      setIsSavingOutline(true)
      await newsletterService.saveOutline(newsletterCode, updatedSections)
    } catch {
      showError('Failed to save changes')
    } finally {
      setIsSavingOutline(false)
    }
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingItemId(null)
    setEditValues({ title: '', description: '' })
  }

  // Handle keyboard events in edit mode
  const handleEditKeyDown = (e: React.KeyboardEvent, field: 'title' | 'description') => {
    if (e.key === 'Escape') {
      cancelEditing()
    } else if (e.key === 'Enter' && field === 'title') {
      e.preventDefault()
      saveItemEdit()
    }
  }

  // Remove item
  const handleRemoveItem = async (item: OutlineItem) => {
    if (!outlineData || !newsletterCode) {
      return
    }

    // Find section
    const section = outlineData.sections.find(s => s.id === item.section_id)
    if (!section) {
      return
    }

    // Prevent removing last item
    if (section.items.length <= 1) {
      showError('Cannot remove the last item in a section')
      return
    }

    // Confirm
    const confirmed = window.confirm('Remove this item from the outline?')
    if (!confirmed) {
      return
    }

    try {
      await newsletterService.removeOutlineItem(newsletterCode, item.id)

      // Update local state
      setOutlineData(prev => ({
        ...prev!,
        sections: prev!.sections.map(s =>
          s.id === item.section_id ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s
        ),
        user_modifications: {
          ...prev!.user_modifications,
          items_removed: prev!.user_modifications.items_removed + 1,
        },
      }))

      showSuccess('Item removed')
    } catch {
      showError('Failed to remove item')
    }
  }

  // Toggle item include/exclude
  const handleToggleInclude = async (item: OutlineItem) => {
    if (!outlineData || !newsletterCode) {
      return
    }

    const newIncluded = !item.included

    // Update local state immediately for responsiveness
    const updatedSections = outlineData.sections.map(section => ({
      ...section,
      items: section.items.map(i => (i.id === item.id ? { ...i, included: newIncluded } : i)),
    }))

    setOutlineData(prev => ({
      ...prev!,
      sections: updatedSections,
    }))

    // Save to backend
    try {
      setIsSavingOutline(true)
      await newsletterService.saveOutline(newsletterCode, updatedSections)
    } catch {
      // Revert on error
      setOutlineData(prev => ({
        ...prev!,
        sections: outlineData.sections,
      }))
      showError('Failed to update item')
    } finally {
      setIsSavingOutline(false)
    }
  }

  // Open add item modal
  const openAddItemModal = (sectionId: string) => {
    setAddItemSectionId(sectionId)
    setNewItemTitle('')
    setNewItemDescription('')
    setNewItemNotes('')
    setAddItemModalOpen(true)
  }

  // Add new item
  const handleAddItem = async () => {
    if (!addItemSectionId || !newsletterCode) {
      return
    }

    // Validate
    if (newItemTitle.trim().length < 5) {
      showError('Title must be at least 5 characters')
      return
    }
    if (newItemDescription.trim().length < 10) {
      showError('Description must be at least 10 characters')
      return
    }

    try {
      const result = await newsletterService.addOutlineItem(newsletterCode, {
        section_id: addItemSectionId,
        title: newItemTitle.trim(),
        description: newItemDescription.trim(),
        user_notes: newItemNotes.trim() || undefined,
      })

      // Update local state
      setOutlineData(prev => ({
        ...prev!,
        sections: prev!.sections.map(s =>
          s.id === addItemSectionId ? { ...s, items: [...s.items, result.item] } : s
        ),
        user_modifications: {
          ...prev!.user_modifications,
          items_added: prev!.user_modifications.items_added + 1,
        },
      }))

      setAddItemModalOpen(false)
      showSuccess('Item added to outline')
    } catch {
      showError('Failed to add item')
    }
  }

  // Navigation handlers
  const handlePrevious = () => {
    navigate(`/newsletter-generator/${newsletterCode}/step-2`)
  }

  const handleNext = async () => {
    if (!newsletterCode || !outlineData) {
      return
    }

    setIsNavigating(true)

    try {
      // Save outline state first (flush any pending changes)
      await newsletterService.saveOutline(newsletterCode, outlineData.sections)

      // Update newsletter step (wait for completion)
      await newsletterService.updateNewsletter(newsletterCode, { current_step: 4 })

      // Then navigate
      navigate(`/newsletter-generator/${newsletterCode}/step-4`)
    } catch {
      showError('Failed to save progress. Please try again.')
      setIsNavigating(false)
    }
  }

  // Navigation buttons with validation feedback
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
    <div key="next-with-validation" className={step3Styles.nextButtonWrapper}>
      <div className={step3Styles.validationStatus}>
        {validationStatus.isReady ? (
          <Check size={14} className={step3Styles.validationSuccess} />
        ) : (
          <AlertTriangle size={14} className={step3Styles.validationWarning} />
        )}
        <span
          className={
            validationStatus.isReady
              ? step3Styles.validationMessageReady
              : step3Styles.validationMessagePending
          }
        >
          {validationStatus.message}
        </span>
      </div>
      <button
        className={`${styles.navButton} ${styles.navButtonPrimary}`}
        onClick={handleNext}
        disabled={!canProceed || isLoading || isNavigating}
        title={!canProceed ? validationStatus.message : 'Proceed to draft generation'}
      >
        {isNavigating ? (
          <>
            <div className={step3Styles.spinnerSmall} />
            Saving...
          </>
        ) : (
          <>
            Next
            <ChevronRight size={18} />
          </>
        )}
      </button>
    </div>,
  ]

  // Get status display
  const outlineStatus = outlineData?.outline_status ?? 'pending'
  const isProcessing = outlineStatus === 'processing' || isGenerating || isPolling

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

  // Get section with items for a specific sectionId
  const getSectionName = (sectionId: string | null) => {
    if (!sectionId || !outlineData) {
      return ''
    }
    const section = outlineData.sections.find(s => s.id === sectionId)
    return section?.name || ''
  }

  // Show not found message if newsletter doesn't exist
  if (notFound) {
    return (
      <NewsletterLayout
        currentStep={3}
        completedSteps={[]}
        navigationButtons={[]}
        isLoadingNewsletter={false}
        isLoadingStepData={false}
      >
        <div className={step3Styles.step2Warning}>
          <AlertTriangle size={40} />
          <p className={step3Styles.step2WarningText}>
            Newsletter not found. The newsletter you&apos;re looking for doesn&apos;t exist or has
            been deleted.
          </p>
          <button
            className={step3Styles.step2WarningButton}
            onClick={() => navigate('/newsletter-generator')}
          >
            Go to Newsletter Generator
          </button>
        </div>
      </NewsletterLayout>
    )
  }

  return (
    <NewsletterLayout
      currentStep={3}
      completedSteps={completedSteps}
      navigationButtons={navigationButtons}
      newsletterCode={newsletter?.newsletterCode}
      newsletterId={newsletter?.id}
      newsletterStatus={newsletter?.status}
      isLoadingNewsletter={isLoading}
      isLoadingStepData={isLoading || isLoadingTopics || isLoadingOutline}
    >
      <div className={styles.stepContentWrapper}>
        {/* Info Card */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardTitle}>
            <Info
              size={18}
              style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}
            />
            Outline Review
          </div>
          <p className={styles.infoCardDescription}>
            Review and customize your newsletter outline. <strong>Main Content is required</strong>,
            other sections are optional based on your retrieved content. You can edit titles and
            descriptions, add custom items, or regenerate the outline with AI.
          </p>
        </div>

        {/* Content Summary from Step 2 */}
        {isStep2Complete && topicsData && (
          <div className={step3Styles.contentSummary}>
            <div className={step3Styles.contentSummaryItem}>
              <span className={step3Styles.contentSummaryLabel}>Selected Topics</span>
              <div className={step3Styles.topicBadges}>
                {topicsData.selected_types.slice(0, 3).map(topicId => {
                  const topic = INFORMATION_TYPES.find(t => t.id === topicId)
                  const categoryConfig = topic ? CATEGORY_CONFIG[topic.category] : null
                  return (
                    <span
                      key={topicId}
                      className={step3Styles.topicBadge}
                      style={{
                        backgroundColor: categoryConfig?.bgColor || '#f3f4f6',
                        color: categoryConfig?.color || '#6b7280',
                      }}
                    >
                      {topic?.name || topicId}
                    </span>
                  )
                })}
                {topicsData.selected_types.length > 3 && (
                  <span
                    className={step3Styles.topicBadge}
                    style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                  >
                    +{topicsData.selected_types.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <div className={step3Styles.contentSummaryItem}>
              <span className={step3Styles.contentSummaryLabel}>Content Chunks</span>
              <span className={step3Styles.contentSummaryValue}>
                {topicsData.total_chunks_retrieved} retrieved
              </span>
            </div>
            <div className={step3Styles.contentSummaryItem}>
              <span className={step3Styles.contentSummaryLabel}>Length</span>
              <span className={step3Styles.contentSummaryValue}>
                {lengthOption?.label || lengthPreference}
              </span>
            </div>
          </div>
        )}

        {/* Step 2 Incomplete Warning */}
        {!isLoadingTopics && !isStep2Complete && (
          <div className={step3Styles.step2Warning}>
            <AlertTriangle size={40} />
            <p className={step3Styles.step2WarningText}>
              Please complete content planning in Step 2 before generating your newsletter outline.
              You need to select topics and retrieve content first.
            </p>
            <button
              className={step3Styles.step2WarningButton}
              onClick={() => navigate(`/newsletter-generator/${newsletterCode}/step-2`)}
            >
              Go to Step 2
            </button>
          </div>
        )}

        {/* Outline Generator */}
        {isStep2Complete && (
          <div className={styles.formCard}>
            <h3 className={styles.formCardTitle}>Outline Generation</h3>
            <p className={styles.formCardDescription}>
              Generate an AI-powered outline based on your selected topics and retrieved content.
            </p>

            <div className={step3Styles.outlineGenerator}>
              {/* Status Display */}
              <div className={step3Styles.generatorStatus}>
                <div className={step3Styles.generatorStatusIcon}>
                  {outlineStatus === 'pending' && (
                    <Clock size={20} className={step3Styles.generatorStatusPending} />
                  )}
                  {outlineStatus === 'processing' && <div className={step3Styles.spinner} />}
                  {outlineStatus === 'completed' && (
                    <Check size={20} className={step3Styles.generatorStatusCompleted} />
                  )}
                  {outlineStatus === 'failed' && (
                    <X size={20} className={step3Styles.generatorStatusFailed} />
                  )}
                </div>
                <span className={step3Styles.generatorStatusText}>
                  {outlineStatus === 'pending' && 'Ready to generate outline'}
                  {outlineStatus === 'processing' && 'Generating outline...'}
                  {outlineStatus === 'completed' && 'Outline generated'}
                  {outlineStatus === 'failed' &&
                    (outlineData?.outline_error || 'Generation failed')}
                </span>
                {outlineStatus === 'completed' && outlineData?.generated_at && (
                  <span className={step3Styles.generatorStatusTime}>
                    {formatDate(outlineData.generated_at)}
                  </span>
                )}
              </div>

              {/* Generate / Regenerate Buttons */}
              {(outlineStatus === 'pending' || outlineStatus === 'failed') && (
                <button
                  className={step3Styles.generateButton}
                  onClick={handleGenerateOutline}
                  disabled={isProcessing || !isStep2Complete}
                >
                  {isProcessing ? (
                    <>
                      <div className={`${step3Styles.spinner} ${step3Styles.spinnerWhite}`} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Generate Outline
                    </>
                  )}
                </button>
              )}

              {outlineStatus === 'completed' && (
                <button
                  className={step3Styles.regenerateButton}
                  onClick={handleRegenerate}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className={step3Styles.spinner} />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Regenerate Outline
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Outline Sections */}
        {outlineStatus === 'completed' && outlineData && outlineData.sections.length > 0 && (
          <div className={styles.formCard}>
            <h3 className={styles.formCardTitle}>Newsletter Outline</h3>
            <p className={styles.formCardDescription}>
              Click on any title or description to edit it. Add custom items using the + button.
            </p>

            <div className={step3Styles.outlineSections}>
              {outlineData.sections
                .filter(section => section.items.length > 0)
                .map(section => (
                  <div key={section.id} className={step3Styles.outlineSection}>
                    {/* Section Header */}
                    <div
                      className={step3Styles.outlineSectionHeader}
                      onClick={() => toggleSection(section.id)}
                    >
                      <ChevronDown
                        size={18}
                        className={`${step3Styles.outlineSectionChevron} ${
                          expandedSections.has(section.id)
                            ? step3Styles.outlineSectionChevronExpanded
                            : ''
                        }`}
                      />
                      <span className={step3Styles.outlineSectionTitle}>{section.name}</span>
                      <span className={step3Styles.outlineSectionCount}>
                        {section.items.filter(i => i.included !== false).length} of{' '}
                        {section.items.length} selected
                      </span>
                    </div>

                    {/* Section Items */}
                    {expandedSections.has(section.id) && (
                      <div className={step3Styles.outlineSectionItems}>
                        {section.items.length === 0 ? (
                          <div className={step3Styles.outlineSectionEmpty}>
                            No items in this section
                          </div>
                        ) : (
                          section.items.map(item => (
                            <div
                              key={item.id}
                              className={`${step3Styles.outlineItem} ${
                                item.included === false ? step3Styles.outlineItemExcluded : ''
                              }`}
                            >
                              <div className={step3Styles.outlineItemHeader}>
                                {/* Checkbox for include/exclude */}
                                <label className={step3Styles.outlineItemCheckbox}>
                                  <input
                                    type="checkbox"
                                    checked={item.included !== false}
                                    onChange={() => handleToggleInclude(item)}
                                    className={step3Styles.outlineItemCheckboxInput}
                                  />
                                  <span className={step3Styles.outlineItemCheckboxCustom} />
                                </label>
                                <div className={step3Styles.outlineItemContent}>
                                  {/* Title */}
                                  {editingItemId === item.id ? (
                                    <input
                                      type="text"
                                      className={step3Styles.outlineItemTitleInput}
                                      value={editValues.title}
                                      onChange={e =>
                                        setEditValues(prev => ({
                                          ...prev,
                                          title: e.target.value,
                                        }))
                                      }
                                      onKeyDown={e => handleEditKeyDown(e, 'title')}
                                      onBlur={saveItemEdit}
                                      autoFocus
                                    />
                                  ) : (
                                    <p
                                      className={step3Styles.outlineItemTitle}
                                      onClick={() => startEditing(item)}
                                    >
                                      {item.title}
                                    </p>
                                  )}

                                  {/* Description */}
                                  {editingItemId === item.id ? (
                                    <textarea
                                      className={step3Styles.outlineItemDescriptionInput}
                                      value={editValues.description}
                                      onChange={e =>
                                        setEditValues(prev => ({
                                          ...prev,
                                          description: e.target.value,
                                        }))
                                      }
                                      onKeyDown={e => handleEditKeyDown(e, 'description')}
                                      onBlur={saveItemEdit}
                                    />
                                  ) : (
                                    <p
                                      className={step3Styles.outlineItemDescription}
                                      onClick={() => startEditing(item)}
                                    >
                                      {item.description}
                                    </p>
                                  )}

                                  {/* Source count */}
                                  {item.content_sources.length > 0 && (
                                    <div className={step3Styles.outlineItemSources}>
                                      <FileText size={12} />
                                      {item.content_sources.length} source
                                      {item.content_sources.length !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className={step3Styles.outlineItemActions}>
                                  {item.is_custom && (
                                    <span className={step3Styles.outlineItemBadge}>Custom</span>
                                  )}
                                  <button
                                    className={step3Styles.outlineItemRemove}
                                    onClick={() => handleRemoveItem(item)}
                                    disabled={section.items.length <= 1}
                                    title={
                                      section.items.length <= 1
                                        ? 'Cannot remove last item'
                                        : 'Remove item'
                                    }
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}

                        {/* Add Item Button */}
                        <button
                          className={step3Styles.addItemButton}
                          onClick={() => openAddItemModal(section.id)}
                        >
                          <Plus size={16} />
                          Add Item
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Auto-save indicator */}
        {(isSaving || isSavingOutline) && (
          <div style={{ textAlign: 'center', color: '#717182', fontSize: '13px' }}>
            Saving changes...
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {addItemModalOpen && (
        <div className={step3Styles.modalOverlay} onClick={() => setAddItemModalOpen(false)}>
          <div className={step3Styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={step3Styles.modalHeader}>
              <h3 className={step3Styles.modalTitle}>
                Add Item to {getSectionName(addItemSectionId)}
              </h3>
              <button className={step3Styles.modalClose} onClick={() => setAddItemModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={step3Styles.modalBody}>
              {/* Title */}
              <div className={step3Styles.modalField}>
                <label className={`${step3Styles.modalLabel} ${step3Styles.modalLabelRequired}`}>
                  Title
                </label>
                <input
                  type="text"
                  className={step3Styles.modalInput}
                  value={newItemTitle}
                  onChange={e => setNewItemTitle(e.target.value)}
                  placeholder="Enter item title..."
                  maxLength={150}
                />
                <span
                  className={`${step3Styles.charCount} ${
                    newItemTitle.length < 5
                      ? step3Styles.charCountWarning
                      : newItemTitle.length > 140
                        ? step3Styles.charCountWarning
                        : ''
                  }`}
                >
                  {newItemTitle.length}/150 (min 5)
                </span>
              </div>

              {/* Description */}
              <div className={step3Styles.modalField}>
                <label className={`${step3Styles.modalLabel} ${step3Styles.modalLabelRequired}`}>
                  Description
                </label>
                <textarea
                  className={step3Styles.modalTextarea}
                  value={newItemDescription}
                  onChange={e => setNewItemDescription(e.target.value)}
                  placeholder="Enter a brief description of what this item will cover..."
                  maxLength={500}
                />
                <span
                  className={`${step3Styles.charCount} ${
                    newItemDescription.length < 10
                      ? step3Styles.charCountWarning
                      : newItemDescription.length > 480
                        ? step3Styles.charCountWarning
                        : ''
                  }`}
                >
                  {newItemDescription.length}/500 (min 10)
                </span>
              </div>

              {/* Notes (optional) */}
              <div className={step3Styles.modalField}>
                <label className={step3Styles.modalLabel}>Notes (optional)</label>
                <textarea
                  className={step3Styles.modalTextarea}
                  value={newItemNotes}
                  onChange={e => setNewItemNotes(e.target.value)}
                  placeholder="Any additional notes for content generation..."
                  maxLength={200}
                />
              </div>
            </div>

            <div className={step3Styles.modalFooter}>
              <button
                className={step3Styles.modalCancelButton}
                onClick={() => setAddItemModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className={step3Styles.modalSubmitButton}
                onClick={handleAddItem}
                disabled={newItemTitle.trim().length < 5 || newItemDescription.trim().length < 10}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </NewsletterLayout>
  )
}
