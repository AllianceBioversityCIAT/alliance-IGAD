import { CheckCircle, X } from 'lucide-react'
import styles from './SuccessNotification.module.css'

interface SuccessNotificationProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  details?: string
}

export function SuccessNotification({
  isOpen,
  onClose,
  title,
  message,
  details,
}: SuccessNotificationProps) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.notification} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className={styles.iconWrapper}>
          <CheckCircle className={styles.icon} size={48} />
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>

        {details && <p className={styles.details}>{details}</p>}

        <button className={styles.button} onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  )
}
