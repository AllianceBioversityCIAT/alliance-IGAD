import { AlertTriangle, Trash2, X } from 'lucide-react'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) {return null}

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <Trash2 size={24} className={styles.dangerIcon} />
      case 'warning':
        return <AlertTriangle size={24} className={styles.warningIcon} />
      default:
        return <AlertTriangle size={24} className={styles.infoIcon} />
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div className={styles.iconContainer}>
            {getIcon()}
          </div>
          <button onClick={onCancel} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.message}>{message}</p>
        </div>

        <div className={styles.actions}>
          <button
            onClick={onCancel}
            className={styles.cancelButton}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`${styles.confirmButton} ${styles[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
