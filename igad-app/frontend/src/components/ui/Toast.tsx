import { useEffect } from 'react'
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react'
import styles from './Toast.module.css'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastProps {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  onClose: (id: string) => void
}

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  useEffect(() => {
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
    <div className={`${styles.toast} ${styles[type]}`}>
      <div className={styles.content}>
        <div className={styles.icon}>{getIcon()}</div>
        <div className={styles.text}>
          <div className={styles.title}>{title}</div>
          {message && <div className={styles.message}>{message}</div>}
        </div>
      </div>
      <button onClick={() => onClose(id)} className={styles.closeButton}>
        <X size={16} />
      </button>
    </div>
  )
}
