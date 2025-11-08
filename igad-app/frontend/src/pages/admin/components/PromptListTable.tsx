import { useState } from 'react'
import { Edit, Trash2, Eye, Copy, CheckCircle, Clock, MoreVertical } from 'lucide-react'
import { SECTION_LABELS, type Prompt } from '../../../types/prompt'
import { PromptStatusBadge } from './PromptStatusBadge'
import styles from './PromptListTable.module.css'

interface PromptListTableProps {
  prompts: Prompt[]
  isLoading: boolean
  onEdit: (promptId: string) => void
  onPublish: (id: string, version: number) => void
  onDelete: (id: string, version?: number) => void
}

export function PromptListTable({ 
  prompts, 
  isLoading, 
  onEdit, 
  onPublish, 
  onDelete 
}: PromptListTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

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
        // TODO: Implement clone functionality
        console.log('Clone prompt:', promptId)
        break
      case 'delete':
        if (window.confirm('Are you sure you want to delete this prompt?')) {
          onDelete(promptId)
        }
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
            <th className={styles.tableHeader}>Version</th>
            <th className={styles.tableHeader}>Status</th>
            <th className={styles.tableHeader}>Updated</th>
            <th className={styles.tableHeader}>Actions</th>
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
                <span className={styles.version}>v{prompt.version}</span>
              </td>
              <td className={styles.tableCell}>
                <PromptStatusBadge status={prompt.status} />
              </td>
              <td className={styles.tableCell}>
                <div className={styles.dateCell}>
                  <span className={styles.date}>{formatDate(prompt.updated_at)}</span>
                  <span className={styles.author}>by {prompt.updated_by}</span>
                </div>
              </td>
              <td className={styles.tableCell}>
                <div className={styles.actionsCell}>
                  <button
                    onClick={() => onEdit(prompt.id)}
                    className={styles.actionButton}
                    title="Edit prompt"
                  >
                    <Edit size={16} />
                  </button>
                  
                  <div className={styles.dropdownContainer}>
                    <button
                      onClick={() => setActiveDropdown(
                        activeDropdown === prompt.id ? null : prompt.id
                      )}
                      className={styles.actionButton}
                      title="More actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                    
                    {activeDropdown === prompt.id && (
                      <div className={styles.dropdown}>
                        <button
                          onClick={() => handleActionClick(prompt.id, 'edit', prompt)}
                          className={styles.dropdownItem}
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        
                        {prompt.status === 'draft' && (
                          <button
                            onClick={() => handleActionClick(prompt.id, 'publish', prompt)}
                            className={styles.dropdownItem}
                          >
                            <CheckCircle size={14} />
                            Publish
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleActionClick(prompt.id, 'clone', prompt)}
                          className={styles.dropdownItem}
                        >
                          <Copy size={14} />
                          Clone
                        </button>
                        
                        <button
                          onClick={() => handleActionClick(prompt.id, 'delete', prompt)}
                          className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
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
