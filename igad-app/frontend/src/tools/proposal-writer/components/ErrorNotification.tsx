import { AlertCircle, X } from 'lucide-react'
import styles from './ErrorNotification.module.css'

interface ErrorNotificationProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  error?: string
}

export function ErrorNotification({
  isOpen,
  onClose,
  title,
  message,
  error,
}: ErrorNotificationProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.notification} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className={styles.iconWrapper}>
          <AlertCircle className={styles.icon} size={48} />
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>

        {error && (
          <div className={styles.errorBox}>
            <p className={styles.errorLabel}>Error Details:</p>
            <p className={styles.errorText}>{error}</p>
          </div>
        )}

        <button className={styles.button} onClick={onClose}>
          Try Again
        </button>
      </div>
    </div>
  )
}
