import { useState } from 'react'
import { X, Mail, Key, Send, Loader2 } from 'lucide-react'
import { userService } from '@/tools/admin/services/userService'
import styles from './CreateUserModal.module.css'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated: () => void
}

export function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    temporary_password: '',
    send_email: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const userData = {
        username: formData.email, // Use email as username
        email: formData.email,
        temporary_password: formData.temporary_password,
        send_email: formData.send_email,
      }
      const result = await userService.createUser(userData)
      if (result.success) {
        onUserCreated()
        onClose()
        setFormData({
          email: '',
          temporary_password: '',
          send_email: true,
        })
      } else {
        setError('Failed to create user')
      }
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to create user')
    } finally {
      setIsLoading(false)
    }
  }

  const generatePassword = () => {
    // Generate password that meets Cognito policy: uppercase, lowercase, numbers, 8+ chars
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*'

    let password = ''
    // Ensure at least one of each required type
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
    password += numbers.charAt(Math.floor(Math.random() * numbers.length))

    // Fill the rest randomly
    const allChars = uppercase + lowercase + numbers + symbols
    for (let i = 3; i < 12; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length))
    }

    // Shuffle the password
    password = password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('')

    setFormData(prev => ({ ...prev, temporary_password: password }))
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingContent}>
              <Loader2 size={48} className={styles.spinnerLarge} />
              <p>Creating user...</p>
            </div>
          </div>
        )}

        <div className={styles.header}>
          <h2 className={styles.title}>Create New User</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label className={styles.label}>
              <Mail size={16} />
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e =>
                setFormData(prev => ({ ...prev, email: e.target.value.toLowerCase() }))
              }
              className={styles.input}
              placeholder="Enter email address"
              required
            />
            <p className={styles.hint}>Email will be used as the username</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              <Key size={16} />
              Temporary Password
            </label>
            <div className={styles.passwordField}>
              <input
                type="text"
                value={formData.temporary_password}
                onChange={e =>
                  setFormData(prev => ({ ...prev, temporary_password: e.target.value }))
                }
                className={styles.input}
                placeholder="Enter temporary password"
                required
              />
              <button type="button" onClick={generatePassword} className={styles.generateButton}>
                Generate
              </button>
            </div>
            <p className={styles.hint}>
              Must contain: uppercase, lowercase, numbers (8+ characters)
            </p>
          </div>

          <div className={styles.checkboxField}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.send_email}
                onChange={e => setFormData(prev => ({ ...prev, send_email: e.target.checked }))}
                className={styles.checkbox}
              />
              <Send size={16} />
              Send welcome email to user
            </label>
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
            <button type="submit" className={styles.createButton} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
