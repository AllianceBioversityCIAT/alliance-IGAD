import { Edit, Trash2, Copy, Power, PowerOff, FileText } from 'lucide-react'
import { SECTION_LABELS, type Prompt } from '@/types/prompt'
import styles from './PromptCardsView.module.css'

interface PromptCardsViewProps {
  prompts: Prompt[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onClone: (id: string) => void
  onToggleActive: (id: string) => void
  onPreview: (id: string) => void
  onTemplate?: (prompt: Prompt) => void
}

export function PromptCardsView({
  prompts,
  onEdit,
  onDelete,
  onClone,
  onToggleActive,
  onPreview: _onPreview,
  onTemplate,
}: PromptCardsViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const groupedPrompts = prompts.reduce(
    (acc, prompt) => {
      const section = prompt.section
      if (!acc[section]) {
        acc[section] = []
      }
      acc[section].push(prompt)
      return acc
    },
    {} as Record<string, Prompt[]>
  )

  return (
    <div className={styles.container}>
      {Object.entries(groupedPrompts).map(([section, sectionPrompts]) => (
        <div key={section} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              {SECTION_LABELS[section as keyof typeof SECTION_LABELS]}
            </h3>
            <span className={styles.sectionCount}>
              {sectionPrompts.length} prompt{sectionPrompts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className={styles.cardsGrid}>
            {sectionPrompts.map(prompt => (
              <div key={prompt.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <h4>{prompt.name}</h4>
                    <div
                      className={`${styles.statusBadge} ${prompt.is_active ? styles.active : styles.inactive}`}
                    >
                      {prompt.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      onClick={() => onEdit(prompt.id)}
                      className={styles.actionButton}
                      title="Edit prompt"
                    >
                      <Edit size={14} />
                    </button>

                    {onTemplate && (
                      <button
                        onClick={() => onTemplate(prompt)}
                        className={styles.actionButton}
                        title="View template"
                      >
                        <FileText size={14} />
                      </button>
                    )}

                    <button
                      onClick={() => onToggleActive(prompt.id)}
                      className={styles.actionButton}
                      title={prompt.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {prompt.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>

                    <button
                      onClick={() => onClone(prompt.id)}
                      className={styles.actionButton}
                      title="Clone prompt"
                    >
                      <Copy size={14} />
                    </button>

                    <button
                      onClick={() => onDelete(prompt.id)}
                      className={styles.actionButton}
                      title="Delete prompt"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.cardRoute}>
                    <span className={styles.routeLabel}>Route:</span>
                    <code className={styles.routeValue}>{prompt.route || 'No route'}</code>
                  </div>

                  <div className={styles.cardPreview}>
                    <p>{prompt.system_prompt.substring(0, 120)}...</p>
                  </div>

                  {prompt.tags && prompt.tags.length > 0 && (
                    <div className={styles.cardTags}>
                      {prompt.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                      {prompt.tags.length > 3 && (
                        <span className={styles.tagMore}>+{prompt.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.updateInfo}>
                    Updated {formatDate(prompt.updated_at)} by {prompt.updated_by}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
