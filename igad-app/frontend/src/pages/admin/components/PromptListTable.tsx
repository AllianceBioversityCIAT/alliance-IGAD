import { useState, useEffect } from 'react'
import { Edit, Trash2, Copy, CheckCircle, MoreVertical, Power, PowerOff, Eye, MessageCircle } from 'lucide-react'
import { SECTION_LABELS, type Prompt } from '../../../types/prompt'
import styles from './PromptListTable.module.css'

interface PromptListTableProps {
  prompts: Prompt[]
  isLoading: boolean
  onEdit: (promptId: string) => void
  onPublish: (id: string, version: number) => void
  onDelete: (id: string, version?: number) => void
  onClone: (prompt: Prompt) => void
  onToggleActive: (id: string) => void
  onComments?: (id: string) => void
}

export function PromptListTable({ 
  prompts, 
  isLoading, 
  onEdit, 
  onPublish, 
  onDelete,
  onClone,
  onToggleActive,
  onComments
}: PromptListTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown) {
        setActiveDropdown(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [activeDropdown])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleActionClick = (promptId: string, action: string, prompt: Prompt) => {
    setActiveDropdown(null)
    
    switch (action) {
      case 'edit':
        onEdit(promptId)
        break
      case 'publish':
        if (prompt.status === 'draft') {
          onPublish(promptId, prompt.version)
        }
        break
      case 'clone':
        onClone(prompt)
        break
      case 'toggle-active':
        onToggleActive(promptId)
        break
      case 'comments':
        if (onComments) {
          onComments(promptId)
        }
        break
      case 'delete':
        onDelete(promptId)
        break
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Loading prompts...</p>
      </div>
    )
  }

  if (prompts.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <Edit size={48} />
        </div>
        <h3 className={styles.emptyTitle}>No prompts found</h3>
        <p className={styles.emptyDescription}>
          Create your first prompt to get started with AI-powered content generation.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead className={styles.tableHead}>
          <tr>
            <th className={styles.tableHeader}>Name</th>
            <th className={styles.tableHeader}>Section</th>
            <th className={styles.tableHeader}>Route</th>
            <th className={styles.tableHeader}>Status</th>
            <th className={styles.tableHeader}>Updated</th>
            <th className={`${styles.tableHeader} ${styles.actionsHeader}`}>Actions</th>
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {prompts.map((prompt) => (
            <tr key={`${prompt.id}-${prompt.version}`} className={styles.tableRow}>
              <td className={styles.tableCell}>
                <div className={styles.nameCell}>
                  <span className={styles.promptName}>{prompt.name}</span>
                  {prompt.tags.length > 0 && (
                    <div className={styles.tags}>
                      {prompt.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                      {prompt.tags.length > 2 && (
                        <span className={styles.tagMore}>
                          +{prompt.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td className={styles.tableCell}>
                <span className={styles.sectionLabel}>
                  {SECTION_LABELS[prompt.section]}
                </span>
              </td>
              <td className={styles.tableCell}>
                {prompt.route ? (
                  <code className={styles.routeCode}>{prompt.route}</code>
                ) : (
                  <span className={styles.noRoute}>—</span>
                )}
              </td>
              <td className={styles.tableCell}>
                <div className={`${styles.activeBadge} ${prompt.is_active ? styles.active : styles.inactive}`}>
                  {prompt.is_active ? 'Active' : 'Inactive'}
                </div>
              </td>
              <td className={styles.tableCell}>
                <div className={styles.dateCell}>
                  <span className={styles.date}>{formatDate(prompt.updated_at)}</span>
                  <span className={styles.author}>by {prompt.updated_by}</span>
                </div>
              </td>
              <td className={styles.tableCell}>
                <div className={styles.actionsCell}>
                  {/* Primary Actions - Always Visible */}
                  <div className={styles.primaryActions}>
                    <button
                      onClick={() => onEdit(prompt.id)}
                      className={`${styles.actionButton} ${styles.editButton}`}
                      title={`Edit "${prompt.name}"`}
                    >
                      <Edit size={14} />
                    </button>
                    
                    <button
                      onClick={() => handleActionClick(prompt.id, 'toggle-active', prompt)}
                      className={`${styles.actionButton} ${prompt.is_active ? styles.deactivateButton : styles.activateButton}`}
                      title={prompt.is_active ? `Deactivate "${prompt.name}"` : `Activate "${prompt.name}"`}
                    >
                      {prompt.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                  </div>

                  {/* Secondary Actions - Dropdown */}
                  <div className={styles.dropdownContainer}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveDropdown(
                          activeDropdown === prompt.id ? null : prompt.id
                        )
                      }}
                      className={`${styles.actionButton} ${styles.moreButton}`}
                      title="More actions"
                    >
                      <MoreVertical size={14} />
                    </button>
                    
                    {activeDropdown === prompt.id && (
                      <div className={styles.dropdown}>
                        {prompt.status === 'draft' && (
                          <button
                            onClick={() => handleActionClick(prompt.id, 'publish', prompt)}
                            className={styles.dropdownItem}
                            title={`Publish "${prompt.name}" to make it available for use`}
                          >
                            <CheckCircle size={14} />
                            Publish
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleActionClick(prompt.id, 'clone', prompt)}
                          className={styles.dropdownItem}
                          title={`Create a copy of "${prompt.name}"`}
                        >
                          <Copy size={14} />
                          Clone
                        </button>
                        
                        {onComments && (
                          <button
                            onClick={() => handleActionClick(prompt.id, 'comments', prompt)}
                            className={styles.dropdownItem}
                            title={`View comments for "${prompt.name}"`}
                          >
                            <MessageCircle size={14} />
                            Comments
                          </button>
                        )}
                        
                        <div className={styles.dropdownDivider}></div>
                        
                        <button
                          onClick={() => handleActionClick(prompt.id, 'delete', prompt)}
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                          title={`Permanently delete "${prompt.name}" - this cannot be undone`}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
