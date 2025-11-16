import { X, AlertCircle } from 'lucide-react'
import styles from './ErrorModal.module.css'

interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  details?: string
}

export function ErrorModal({ isOpen, onClose, title, message, details }: ErrorModalProps) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.iconTitle}>
            <AlertCircle className={styles.icon} />
            <h2 className={styles.title}>{title}</h2>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>
        
        <div className={styles.content}>
          <p className={styles.message}>{message}</p>
          {details && (
            <div className={styles.details}>
              <p className={styles.detailsLabel}>Details:</p>
              <p className={styles.detailsText}>{details}</p>
            </div>
          )}
        </div>
        
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.okButton}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
