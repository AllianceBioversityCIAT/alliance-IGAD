import { useState, useEffect } from 'react'
import { History, Clock, User, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import styles from './HistoryPanel.module.css'

interface PromptChange {
  id: string
  prompt_id: string
  version: number
  change_type: string
  changes: Record<string, { old: any; new: any }>
  comment?: string
  author: string
  author_name: string
  created_at: string
}

interface PromptHistory {
  prompt_id: string
  changes: PromptChange[]
  total: number
}

interface HistoryPanelProps {
  promptId: string
  isOpen: boolean
  onClose: () => void
}

export function HistoryPanel({ promptId, isOpen, onClose }: HistoryPanelProps) {
  const [history, setHistory] = useState<PromptHistory | null>(null)
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && promptId) {
      fetchHistory()
    }
  }, [isOpen, promptId])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/admin/prompts/${promptId}/history`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpanded = (changeId: string) => {
    const newExpanded = new Set(expandedChanges)
    if (newExpanded.has(changeId)) {
      newExpanded.delete(changeId)
    } else {
      newExpanded.add(changeId)
    }
    setExpandedChanges(newExpanded)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'create':
        return 'Created'
      case 'update':
        return 'Updated'
      case 'activate':
        return 'Activated'
      case 'deactivate':
        return 'Deactivated'
      default:
        return type
    }
  }

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'create':
        return styles.typeCreate
      case 'update':
        return styles.typeUpdate
      case 'activate':
        return styles.typeActivate
      case 'deactivate':
        return styles.typeDeactivate
      default:
        return styles.typeDefault
    }
  }

  const renderFieldChange = (field: string, change: { old: any; new: any }) => {
    const fieldLabels: Record<string, string> = {
      name: 'Name',
      system_prompt: 'System Prompt',
      user_prompt_template: 'User Prompt Template',
      route: 'Route',
      tags: 'Tags',
      is_active: 'Status',
    }

    const formatValue = (value: any) => {
      if (value === null || value === undefined) {
        return 'None'
      }
      if (typeof value === 'boolean') {
        return value ? 'Active' : 'Inactive'
      }
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      if (typeof value === 'string' && value.length > 100) {
        return value.substring(0, 100) + '...'
      }
      return String(value)
    }

    return (
      <div key={field} className={styles.fieldChange}>
        <div className={styles.fieldName}>{fieldLabels[field] || field}</div>
        <div className={styles.fieldDiff}>
          <div className={styles.oldValue}>
            <span className={styles.diffLabel}>Before:</span>
            <span className={styles.diffValue}>{formatValue(change.old)}</span>
          </div>
          <div className={styles.newValue}>
            <span className={styles.diffLabel}>After:</span>
            <span className={styles.diffValue}>{formatValue(change.new)}</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            <History size={20} />
            Change History
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loading}>Loading history...</div>
          ) : !history || history.changes.length === 0 ? (
            <div className={styles.emptyState}>
              <History size={48} />
              <p>No changes recorded</p>
              <span>Changes will appear here as the prompt is modified</span>
            </div>
          ) : (
            <div className={styles.changesList}>
              {history.changes.map(change => (
                <div key={change.id} className={styles.changeItem}>
                  <div className={styles.changeHeader}>
                    <div className={styles.changeInfo}>
                      <span
                        className={`${styles.changeType} ${getChangeTypeColor(change.change_type)}`}
                      >
                        {getChangeTypeLabel(change.change_type)}
                      </span>
                      <div className={styles.changeAuthor}>
                        <User size={14} />
                        {change.author_name}
                      </div>
                      <div className={styles.changeDate}>
                        <Clock size={14} />
                        {formatDate(change.created_at)}
                      </div>
                    </div>

                    {Object.keys(change.changes).length > 0 && (
                      <button
                        onClick={() => toggleExpanded(change.id)}
                        className={styles.expandButton}
                      >
                        {expandedChanges.has(change.id) ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                        {Object.keys(change.changes).length} field
                        {Object.keys(change.changes).length !== 1 ? 's' : ''} changed
                      </button>
                    )}
                  </div>

                  {change.comment && (
                    <div className={styles.changeComment}>
                      <MessageSquare size={14} />
                      {change.comment}
                    </div>
                  )}

                  {expandedChanges.has(change.id) && (
                    <div className={styles.changeDetails}>
                      {Object.entries(change.changes).map(([field, fieldChange]) =>
                        renderFieldChange(field, fieldChange)
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
