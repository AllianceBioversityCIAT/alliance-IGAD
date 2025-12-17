import { Edit, Trash2, Copy, Power, PowerOff, FileText } from 'lucide-react'
import { SECTION_LABELS, type Prompt } from '@/types/prompt'
import styles from './PromptListTable.module.css'

interface PromptListTableProps {
  prompts: Prompt[]
  isLoading: boolean
  onEdit: (promptId: string) => void
  onDelete: (id: string, version?: number) => void
  onClone: (prompt: Prompt) => void
  onToggleActive: (id: string) => void
  onTemplate?: (prompt: Prompt) => void
}

export function PromptListTable({
  prompts,
  isLoading,
  onEdit,
  onDelete,
  onClone,
  onToggleActive,
  onTemplate,
}: PromptListTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleActionClick = (promptId: string, action: string, prompt: Prompt) => {
    switch (action) {
      case 'edit':
        onEdit(promptId)
        break
      case 'clone':
        onClone(prompt)
        break
      case 'toggle-active':
        onToggleActive(promptId)
        break
      case 'template':
        if (onTemplate) {
          onTemplate(prompt)
        }
        break
      case 'delete':
        onDelete(promptId)
        break
    }
  }

  if (isLoading) {
    return (
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.tableHeader}>Name</th>
              <th className={styles.tableHeader}>Section</th>
              <th className={styles.tableHeader}>Sub-section</th>
              <th className={styles.tableHeader}>Categories</th>
              <th className={styles.tableHeader}>Route</th>
              <th className={styles.tableHeader}>Status</th>
              <th className={styles.tableHeader}>Updated</th>
              <th className={`${styles.tableHeader} ${styles.actionsHeader}`}>Actions</th>
              <th className={styles.tableHeader}>Comments</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className={styles.tableRow}>
                <td className={styles.tableCell}>
                  <div className={styles.nameCell}>
                    <div
                      className={styles.skeleton}
                      style={{ width: '180px', height: '16px', marginBottom: '8px' }}
                    ></div>
                    <div className={styles.tags}>
                      <div
                        className={styles.skeleton}
                        style={{ width: '60px', height: '20px', borderRadius: '10px' }}
                      ></div>
                      <div
                        className={styles.skeleton}
                        style={{ width: '50px', height: '20px', borderRadius: '10px' }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className={styles.tableCell}>
                  <div className={styles.skeleton} style={{ width: '120px', height: '16px' }}></div>
                </td>
                <td className={styles.tableCell}>
                  <div className={styles.skeleton} style={{ width: '80px', height: '16px' }}></div>
                </td>
                <td className={styles.tableCell}>
                  <div className={styles.skeleton} style={{ width: '100px', height: '16px' }}></div>
                </td>
                <td className={styles.tableCell}>
                  <div
                    className={styles.skeleton}
                    style={{ width: '140px', height: '16px', borderRadius: '4px' }}
                  ></div>
                </td>
                <td className={styles.tableCell}>
                  <div
                    className={styles.skeleton}
                    style={{ width: '60px', height: '24px', borderRadius: '12px' }}
                  ></div>
                </td>
                <td className={styles.tableCell}>
                  <div className={styles.dateCell}>
                    <div
                      className={styles.skeleton}
                      style={{ width: '100px', height: '14px', marginBottom: '4px' }}
                    ></div>
                    <div
                      className={styles.skeleton}
                      style={{ width: '80px', height: '12px' }}
                    ></div>
                  </div>
                </td>
                <td className={styles.tableCell}>
                  <div className={styles.actionsCell}>
                    <div className={styles.primaryActions}>
                      <div
                        className={styles.skeleton}
                        style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                      ></div>
                      <div
                        className={styles.skeleton}
                        style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                      ></div>
                      <div
                        className={styles.skeleton}
                        style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                      ></div>
                      <div
                        className={styles.skeleton}
                        style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                      ></div>
                      <div
                        className={styles.skeleton}
                        style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                      ></div>
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
            <th className={styles.tableHeader}>Sub-section</th>
            <th className={styles.tableHeader}>Categories</th>
            <th className={styles.tableHeader}>Route</th>
            <th className={styles.tableHeader}>Status</th>
            <th className={styles.tableHeader}>Updated</th>
            <th className={`${styles.tableHeader} ${styles.actionsHeader}`}>Actions</th>
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {prompts.map((prompt, _index) => (
            <tr key={`${prompt.id}-${prompt.version}`} className={styles.tableRow}>
              <td className={styles.tableCell}>
                <div className={styles.nameCell}>
                  <span className={styles.promptName}>{prompt.name}</span>
                  {prompt.tags.length > 0 && (
                    <div className={styles.tags}>
                      {prompt.tags.slice(0, 2).map(tag => (
                        <span key={tag} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                      {prompt.tags.length > 2 && (
                        <span className={styles.tagMore}>+{prompt.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td className={styles.tableCell}>
                <span className={styles.sectionLabel}>{SECTION_LABELS[prompt.section]}</span>
              </td>
              <td className={styles.tableCell}>
                {prompt.sub_section ? (
                  <code className={styles.subSectionCode}>{prompt.sub_section}</code>
                ) : (
                  <span className={styles.noSubSection}>—</span>
                )}
              </td>
              <td className={styles.tableCell}>
                {prompt.categories && prompt.categories.length > 0 ? (
                  <div className={styles.categories}>
                    {prompt.categories.slice(0, 2).map(category => (
                      <span key={category} className={styles.category}>
                        {category}
                      </span>
                    ))}
                    {prompt.categories.length > 2 && (
                      <span className={styles.categoryMore}>+{prompt.categories.length - 2}</span>
                    )}
                  </div>
                ) : (
                  <span className={styles.noCategories}>—</span>
                )}
              </td>
              <td className={styles.tableCell}>
                {prompt.route ? (
                  <code className={styles.routeCode}>{prompt.route}</code>
                ) : (
                  <span className={styles.noRoute}>—</span>
                )}
              </td>
              <td className={styles.tableCell}>
                <div
                  className={`${styles.activeBadge} ${prompt.is_active ? styles.active : styles.inactive}`}
                >
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
                  <div className={styles.primaryActions}>
                    <button
                      onClick={() => onEdit(prompt.id)}
                      className={`${styles.actionButton} ${styles.editButton}`}
                      title={`Edit "${prompt.name}"`}
                    >
                      <Edit size={14} />
                    </button>

                    {onTemplate && (
                      <button
                        onClick={() => handleActionClick(prompt.id, 'template', prompt)}
                        className={`${styles.actionButton} ${styles.templateButton}`}
                        title={`View template for "${prompt.name}"`}
                      >
                        <FileText size={14} />
                      </button>
                    )}

                    <button
                      onClick={() => handleActionClick(prompt.id, 'toggle-active', prompt)}
                      className={`${styles.actionButton} ${prompt.is_active ? styles.deactivateButton : styles.activateButton}`}
                      title={
                        prompt.is_active
                          ? `Deactivate "${prompt.name}"`
                          : `Activate "${prompt.name}"`
                      }
                    >
                      {prompt.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>

                    <button
                      onClick={() => handleActionClick(prompt.id, 'clone', prompt)}
                      className={`${styles.actionButton} ${styles.cloneButton}`}
                      title={`Create a copy of "${prompt.name}"`}
                    >
                      <Copy size={14} />
                    </button>

                    <button
                      onClick={() => handleActionClick(prompt.id, 'delete', prompt)}
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      title={`Permanently delete "${prompt.name}" - this cannot be undone`}
                    >
                      <Trash2 size={14} />
                    </button>
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
