import { useState, useEffect } from 'react'
import { Plus, Settings, Search, Filter, ArrowLeft, Info, Grid, List } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { usePrompts } from '@/tools/admin/hooks/usePrompts'
import { useToast } from '@/shared/components/ui/ToastContainer'
import { PromptListTable } from './components/PromptListTable'
import { PromptCardsView } from './components/PromptCardsView'
import { ConfirmationModal } from '@/shared/components/ui/ConfirmationModal'
import { useConfirmation } from '@/shared/hooks/useConfirmation'
import { PromptFilters } from './components/PromptFilters'
import { CommentsPanel } from './components/CommentsPanel'
import { PromptTemplateModal } from './components/PromptTemplateModal'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import { LoadingSpinner } from '@/shared/components/ui/LoadingSpinner'
import type { ProposalSection, Prompt } from '@/types/prompt'
import styles from './PromptManagerPage.module.css'

interface PromptManagerFilters {
  section?: ProposalSection
  sub_section?: string
  category?: string
  status?: 'draft' | 'published'
  tag?: string
  search?: string
  route?: string
  is_active?: boolean
}

export function PromptManagerPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<PromptManagerFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  // Removed unused selectedPromptId state
  const [commentsPromptId, setCommentsPromptId] = useState<string | null>(null)
  const [templatePrompt, setTemplatePrompt] = useState<Prompt | null>(null)
  const [contextData, setContextData] = useState<{
    fromRoute?: string
    defaultSection?: ProposalSection
  }>({})
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const confirmation = useConfirmation()
  const { showSuccess, showError } = useToast()

  // Capture context from URL parameters and auto-filter
  useEffect(() => {
    const fromRoute = searchParams.get('from')
    const section = searchParams.get('section')

    if (fromRoute || section) {
      setContextData({
        fromRoute: fromRoute || undefined,
        defaultSection: (section as ProposalSection) || undefined,
      })

      // Auto-filter by section if provided
      if (section) {
        setFilters(prev => ({
          ...prev,
          section: section as ProposalSection,
        }))
        setShowFilters(true) // Show filters to make it visible
      }
    }
  }, [searchParams])

  const {
    prompts,
    total,
    hasMore,
    currentPage,
    isLoading,
    isCreating,
    isUpdating,
    isPublishing,
    isDeleting,
    isTogglingActive,
    createPrompt,
    publishPrompt,
    deletePrompt,
    toggleActive,
    setCurrentPage,
    nextPage,
    prevPage,
  } = usePrompts(filters)

  const handleCreateNew = () => {
    // Preserve URL parameters when creating new prompt
    const currentParams = new URLSearchParams(window.location.search)
    const fromRoute = currentParams.get('from')
    const section = currentParams.get('section')

    let createUrl = '/admin/prompt-manager/create'
    if (fromRoute && section) {
      createUrl += `?from=${encodeURIComponent(fromRoute)}&section=${encodeURIComponent(section)}`
    }

    navigate(createUrl)
  }

  const handleEditPrompt = (promptId: string) => {
    navigate(`/admin/prompt-manager/edit/${promptId}`)
  }

  const handleFiltersChange = (newFilters: PromptManagerFilters) => {
    setFilters(newFilters)
    setCurrentPage(0) // Reset to first page when filters change
  }

  const handlePublishPrompt = async (id: string, version: number) => {
    try {
      await publishPrompt({ id, version })
      showSuccess('Prompt published successfully', 'The prompt is now available for use.')
    } catch (error: unknown) {
      const err = error as { message?: string }
      showError('Failed to publish prompt', err.message || 'Please try again.')
    }
  }

  const handleDeletePrompt = (id: string, version?: number) => {
    const prompt = prompts.find(p => p.id === id)
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Prompt',
      message: `Are you sure you want to delete "${prompt?.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deletePrompt({ id, version })
          showSuccess('Prompt deleted successfully', 'The prompt has been permanently removed.')
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error: unknown) {
          const err = error as { message?: string }
          showError('Failed to delete prompt', err.message || 'Please try again.')
        }
      },
    })
  }

  const handleClonePrompt = async (prompt: Prompt) => {
    try {
      const clonedData = {
        name: `Copy of ${prompt.name}`,
        section: prompt.section,
        route: prompt.route ? `${prompt.route}-copy` : '',
        tags: [...prompt.tags, 'cloned'],
        system_prompt: prompt.system_prompt,
        user_prompt_template: prompt.user_prompt_template,
        few_shot: prompt.few_shot || [],
        context: prompt.context || {},
      }
      await createPrompt(clonedData)
      showSuccess('Prompt cloned successfully', `"${clonedData.name}" has been created as a draft.`)
    } catch (error: unknown) {
      const err = error as { message?: string }
      showError('Failed to clone prompt', err.message || 'Please try again.')
    }
  }

  const handleToggleActive = async (id: string) => {
    try {
      const prompt = prompts.find(p => p.id === id)
      await toggleActive(id)
      showSuccess(
        `Prompt ${prompt?.is_active ? 'deactivated' : 'activated'} successfully`,
        `"${prompt?.name}" is now ${prompt?.is_active ? 'inactive' : 'active'}.`
      )
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: unknown } } }
      const errorMessage =
        typeof err.response?.data?.detail === 'string'
          ? error.response.data.detail
          : error.message || 'Please try again.'
      if (errorMessage.includes('already active')) {
        showError(
          'Cannot activate prompt',
          'Only one prompt can be active per section and route combination. Please deactivate the existing prompt first.'
        )
      } else {
        showError('Failed to toggle prompt status', errorMessage)
      }
    }
  }

  const handleTemplateView = (prompt: Prompt) => {
    setTemplatePrompt(prompt)
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleSection}>
            <Settings className={styles.titleIcon} />
            <h1 className={styles.title}>Prompt Manager</h1>
          </div>
          <p className={styles.subtitle}>
            Manage AI prompts for different sections of the proposal writer
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.viewToggle}>
            <button
              onClick={() => setViewMode('table')}
              className={`${styles.viewButton} ${viewMode === 'table' ? styles.active : ''}`}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
            >
              <Grid size={16} />
            </button>
          </div>

          <button onClick={handleCreateNew} className={styles.createButton}>
            <Plus size={16} />
            Create Prompt
          </button>
        </div>
      </div>

      {/* Context Banner */}
      {contextData.fromRoute && (
        <div className={styles.filtersBarWrapper}>
          <div className={styles.filtersBarContent}>
            <div className={styles.contextBanner}>
              <div className={styles.contextContent}>
                <Info className={styles.contextIcon} />
                <div className={styles.contextText}>
                  <span className={styles.contextTitle}>Managing prompts from:</span>
                  <code className={styles.contextRoute}>{contextData.fromRoute}</code>
                  {contextData.defaultSection && (
                    <span className={styles.contextSection}>
                      • Section: {contextData.defaultSection.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(contextData.fromRoute!)}
                className={styles.backButton}
              >
                <ArrowLeft size={16} />
                Back to{' '}
                {contextData.fromRoute?.includes('proposal-writer') ? 'Proposal Writer' : 'Source'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Card */}
      <div className={styles.filtersBarWrapper}>
        <div className={styles.filtersBarContent}>
          <div className={styles.filtersCard}>
            <div className={styles.filtersBar}>
              <div className={styles.searchContainer}>
                <Search className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search prompts..."
                  value={filters.search || ''}
                  onChange={e => handleFiltersChange({ ...filters, search: e.target.value })}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.resultsInfo}>
                <span className={styles.resultsCount}>
                  {total} prompt{total !== 1 ? 's' : ''} found
                </span>
                {Object.keys(filters).some(key => filters[key as keyof PromptManagerFilters]) && (
                  <button onClick={() => handleFiltersChange({})} className={styles.clearFilters}>
                    Clear filters
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`${styles.filterButton} ${showFilters ? styles.filterButtonActive : ''}`}
              >
                <Filter size={16} />
                Filters
              </button>
            </div>

            {/* Expandable Filters */}
            {showFilters && (
              <div className={styles.filtersPanel}>
                <PromptFilters filters={filters} onChange={handleFiltersChange} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.contentWrapper}>
          {viewMode === 'table' ? (
            <PromptListTable
              prompts={prompts}
              isLoading={isLoading}
              onEdit={handleEditPrompt}
              onPublish={handlePublishPrompt}
              onDelete={handleDeletePrompt}
              onClone={handleClonePrompt}
              onToggleActive={handleToggleActive}
              onComments={id => setCommentsPromptId(id)}
              onTemplate={handleTemplateView}
            />
          ) : (
            <PromptCardsView
              prompts={prompts}
              onEdit={handleEditPrompt}
              onDelete={handleDeletePrompt}
              onClone={handleClonePrompt}
              onToggleActive={handleToggleActive}
              onPreview={_id => {}}
              onTemplate={handleTemplateView}
            />
          )}

          {/* Pagination */}
          {(hasMore || currentPage > 0) && (
            <div className={styles.pagination}>
              <button
                onClick={prevPage}
                disabled={currentPage === 0}
                className={styles.paginationButton}
              >
                Previous
              </button>

              <span className={styles.paginationInfo}>Page {currentPage + 1}</span>

              <button onClick={nextPage} disabled={!hasMore} className={styles.paginationButton}>
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        type={confirmation.options.type}
        title={confirmation.options.title}
        message={confirmation.options.message}
        confirmText={confirmation.options.confirmText}
        cancelText={confirmation.options.cancelText}
        showCancel={confirmation.options.showCancel}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
        onClose={confirmation.handleClose}
      />

      {/* Loading Overlay */}
      {(isCreating || isUpdating || isPublishing || isDeleting || isTogglingActive) && (
        <LoadingSpinner
          overlay
          text={
            isCreating
              ? 'Creating prompt...'
              : isUpdating
                ? 'Updating prompt...'
                : isPublishing
                  ? 'Publishing prompt...'
                  : isDeleting
                    ? 'Deleting prompt...'
                    : isTogglingActive
                      ? 'Updating status...'
                      : 'Processing...'
          }
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant="danger"
        confirmText="Delete"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Comments Panel */}
      <CommentsPanel
        promptId={commentsPromptId || ''}
        isOpen={!!commentsPromptId}
        onClose={() => setCommentsPromptId(null)}
      />

      {/* Template Modal */}
      <PromptTemplateModal
        prompt={templatePrompt}
        isOpen={!!templatePrompt}
        onClose={() => setTemplatePrompt(null)}
      />
    </div>
  )
}
