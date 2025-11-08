import { useState } from 'react'
import { Plus, Settings, Search, Filter } from 'lucide-react'
import { usePrompts } from '../../hooks/usePrompts'
import { useToast } from '../../hooks/useToast'
import { PromptListTable } from './components/PromptListTable'
import { PromptEditorDrawer } from './components/PromptEditorDrawer'
import { PromptFilters } from './components/PromptFilters'
import { ToastContainer } from '../../components/ui/ToastContainer'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import type { ProposalSection, Prompt } from '../../types/prompt'
import styles from './PromptManagerPage.module.css'

interface PromptManagerFilters {
  section?: ProposalSection
  status?: 'draft' | 'published'
  tag?: string
  search?: string
}

export function PromptManagerPage() {
  const [filters, setFilters] = useState<PromptManagerFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  })

  const toast = useToast()

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
    createPrompt,
    updatePrompt,
    publishPrompt,
    deletePrompt,
    setCurrentPage,
    nextPage,
    prevPage
  } = usePrompts(filters)

  const handleCreateNew = () => {
    setSelectedPromptId(null)
    setEditorMode('create')
    setIsEditorOpen(true)
  }

  const handleEditPrompt = (promptId: string) => {
    setSelectedPromptId(promptId)
    setEditorMode('edit')
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
    setSelectedPromptId(null)
  }

  const handleFiltersChange = (newFilters: PromptManagerFilters) => {
    setFilters(newFilters)
    setCurrentPage(0) // Reset to first page when filters change
  }

  const handleSavePrompt = async (data: any) => {
    try {
      if (editorMode === 'create') {
        await createPrompt(data)
        toast.success('Prompt created successfully', `"${data.name}" has been created and saved as draft.`)
      } else if (selectedPromptId) {
        await updatePrompt({ id: selectedPromptId, data })
        toast.success('Prompt updated successfully', `"${data.name}" has been updated.`)
      }
      setIsEditorOpen(false)
      setSelectedPromptId(null)
    } catch (error: any) {
      toast.error('Failed to save prompt', error.message || 'Please try again.')
    }
  }

  const handlePublishPrompt = async (id: string, version: number) => {
    try {
      await publishPrompt({ id, version })
      toast.success('Prompt published successfully', 'The prompt is now available for use.')
    } catch (error: any) {
      toast.error('Failed to publish prompt', error.message || 'Please try again.')
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
          toast.success('Prompt deleted successfully', 'The prompt has been permanently removed.')
          setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        } catch (error: any) {
          toast.error('Failed to delete prompt', error.message || 'Please try again.')
        }
      }
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
        context: prompt.context || {}
      }
      await createPrompt(clonedData)
      toast.success('Prompt cloned successfully', `"${clonedData.name}" has been created as a draft.`)
    } catch (error: any) {
      toast.error('Failed to clone prompt', error.message || 'Please try again.')
    }
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
        
        <button 
          onClick={handleCreateNew}
          className={styles.createButton}
        >
          <Plus size={16} />
          Create Prompt
        </button>
      </div>

      {/* Filters Bar */}
      <div className={styles.filtersBar}>
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search prompts..."
            value={filters.search || ''}
            onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value })}
            className={styles.searchInput}
          />
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
          <PromptFilters
            filters={filters}
            onChange={handleFiltersChange}
          />
        </div>
      )}

      {/* Results Summary */}
      <div className={styles.resultsInfo}>
        <span className={styles.resultsCount}>
          {total} prompt{total !== 1 ? 's' : ''} found
        </span>
        {Object.keys(filters).some(key => filters[key as keyof PromptManagerFilters]) && (
          <button
            onClick={() => handleFiltersChange({})}
            className={styles.clearFilters}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <PromptListTable
          prompts={prompts}
          isLoading={isLoading}
          onEdit={handleEditPrompt}
          onPublish={handlePublishPrompt}
          onDelete={handleDeletePrompt}
          onClone={handleClonePrompt}
        />

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
            
            <span className={styles.paginationInfo}>
              Page {currentPage + 1}
            </span>
            
            <button
              onClick={nextPage}
              disabled={!hasMore}
              className={styles.paginationButton}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Editor Drawer */}
      {isEditorOpen && (
        <PromptEditorDrawer
          mode={editorMode}
          promptId={selectedPromptId}
          onClose={handleCloseEditor}
          onSave={handleSavePrompt}
          isLoading={isCreating || isUpdating}
        />
      )}

      {/* Loading Overlay */}
      {(isCreating || isUpdating || isPublishing || isDeleting) && (
        <LoadingSpinner 
          overlay 
          text={
            isCreating ? 'Creating prompt...' :
            isUpdating ? 'Updating prompt...' :
            isPublishing ? 'Publishing prompt...' :
            isDeleting ? 'Deleting prompt...' : 'Processing...'
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  )
}
