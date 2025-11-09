import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'
import styles from './ConfirmationModal.module.css'

interface ConfirmationModalProps {
  isOpen: boolean
  type?: 'success' | 'warning' | 'info' | 'error'
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  onClose: () => void
  showCancel?: boolean
}

export function ConfirmationModal({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  onClose,
  showCancel = false
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={48} className={styles.successIcon} />
      case 'warning':
        return <AlertTriangle size={48} className={styles.warningIcon} />
      case 'error':
        return <AlertTriangle size={48} className={styles.errorIcon} />
      case 'info':
      default:
        return <Info size={48} className={styles.infoIcon} />
    }
  }

  const handleConfirm = () => {
    onConfirm?.()
    onClose()
  }

  const handleCancel = () => {
    onCancel?.()
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className={styles.closeButton}>
          <X size={20} />
        </button>
        
        <div className={styles.content}>
          <div className={styles.iconContainer}>
            {getIcon()}
          </div>
          
          <h3 className={styles.title}>{title}</h3>
          
          {message && (
            <p className={styles.message}>{message}</p>
          )}
        </div>
        
        <div className={styles.actions}>
          {showCancel && (
            <button 
              onClick={handleCancel}
              className={styles.cancelButton}
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={handleConfirm}
            className={`${styles.confirmButton} ${styles[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
