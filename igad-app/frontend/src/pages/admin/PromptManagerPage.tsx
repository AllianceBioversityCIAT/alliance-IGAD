import { useState } from 'react'
import { Plus, Settings, Search, Filter } from 'lucide-react'
import { usePrompts } from '../../hooks/usePrompts'
import { PromptListTable } from './components/PromptListTable'
import { PromptEditorDrawer } from './components/PromptEditorDrawer'
import { PromptFilters } from './components/PromptFilters'
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

  const {
    prompts,
    total,
    hasMore,
    currentPage,
    isLoading,
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
        console.log('Prompt created successfully')
      } else if (selectedPromptId) {
        await updatePrompt({ id: selectedPromptId, data })
        console.log('Prompt updated successfully')
      }
      setIsEditorOpen(false)
      setSelectedPromptId(null)
    } catch (error) {
      console.error('Failed to save prompt:', error)
    }
  }

  const handlePublishPrompt = async (id: string, version: number) => {
    try {
      await publishPrompt({ id, version })
      console.log('Prompt published successfully')
    } catch (error) {
      console.error('Failed to publish prompt:', error)
    }
  }

  const handleClonePrompt = async (prompt: Prompt) => {
    try {
      const clonedData = {
        name: `CLONE - ${prompt.name}`,
        section: prompt.section,
        route: prompt.route ? `${prompt.route}-clone` : '',
        tags: [...prompt.tags, 'cloned'],
        system_prompt: prompt.system_prompt,
        user_prompt_template: prompt.user_prompt_template,
        few_shot: prompt.few_shot || [],
        context: prompt.context || {}
      }
      await createPrompt(clonedData)
      console.log('Prompt cloned successfully')
    } catch (error) {
      console.error('Failed to clone prompt:', error)
    }
  }

  const handleDeletePrompt = async (id: string, version?: number) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      try {
        await deletePrompt({ id, version })
        console.log('Prompt deleted successfully')
      } catch (error) {
        console.error('Failed to delete prompt:', error)
      }
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
        />
      )}
    </div>
  )
}
