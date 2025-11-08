import { AlertTriangle, X } from 'lucide-react'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <div className={`${styles.icon} ${styles[variant]}`}>
            <AlertTriangle size={24} />
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
          <button onClick={onCancel} className={styles.cancelButton}>
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`${styles.confirmButton} ${styles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
