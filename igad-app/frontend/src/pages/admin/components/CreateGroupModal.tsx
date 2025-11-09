import { useState } from 'react'
import { X, Shield, FileText, Hash } from 'lucide-react'
import { userService } from '../../../services/userService'
import styles from './CreateGroupModal.module.css'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onGroupCreated: () => void
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    precedence: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const groupData = {
        name: formData.name,
        description: formData.description,
        ...(formData.precedence && { precedence: parseInt(formData.precedence) })
      }

      const result = await userService.createGroup(groupData)
      if (result.success) {
        onGroupCreated()
        onClose()
        setFormData({ name: '', description: '', precedence: '' })
      } else {
        setError('Failed to create group')
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create group')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) {return null}

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Group</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>
              <Shield size={16} />
              Group Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={styles.input}
              placeholder="Enter group name"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <FileText size={16} />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className={styles.textarea}
              placeholder="Enter group description"
              rows={3}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Hash size={16} />
              Precedence (Optional)
            </label>
            <input
              type="number"
              value={formData.precedence}
              onChange={(e) => setFormData(prev => ({ ...prev, precedence: e.target.value }))}
              className={styles.input}
              placeholder="Enter precedence number"
              min="0"
            />
            <p className={styles.hint}>Lower numbers have higher precedence</p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createButton}
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
