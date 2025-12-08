import { useEffect } from 'react'
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react'
import styles from './Toast.module.css'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastProps {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: ToastAction
  onClose: (id: string) => void
}

export function Toast({ id, type, title, message, duration = 5000, action, onClose }: ToastProps) {
  useEffect(() => {
    // Don't auto-dismiss if duration is 0 (for errors that should stay until dismissed)
    if (duration === 0) {
      return
    }

    const timer = setTimeout(() => {
      onClose(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />
      case 'error':
        return <AlertCircle size={20} />
      case 'info':
        return <Info size={20} />
      case 'warning':
        return <AlertTriangle size={20} />
    }
  }

  return (
    <div
      className={`${styles.toast} ${styles[type]}`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className={styles.content}>
        <div className={styles.icon} aria-hidden="true">
          {getIcon()}
        </div>
        <div className={styles.text}>
          <div className={styles.title}>{title}</div>
          {message && <div className={styles.message}>{message}</div>}
          {action && (
            <button
              onClick={() => {
                action.onClick()
                onClose(id)
              }}
              className={styles.actionButton}
              aria-label={action.label}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => onClose(id)}
        className={styles.closeButton}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}
