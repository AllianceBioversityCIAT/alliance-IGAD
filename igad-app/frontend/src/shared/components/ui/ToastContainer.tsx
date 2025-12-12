import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Toast, ToastProps, ToastAction } from './Toast'
import { registerToastHandler, unregisterToastHandler } from '../../services/globalToast'
import styles from './ToastContainer.module.css'

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => void
  showSuccess: (title: string, message?: string, duration?: number) => void
  showError: (title: string, message?: string, action?: ToastAction) => void
  showInfo: (title: string, message?: string, duration?: number) => void
  showWarning: (title: string, message?: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: removeToast,
    }
    setToasts(prev => [...prev, newToast])
  }

  // Register global toast handler for non-React contexts (e.g., API interceptors)
  useEffect(() => {
    registerToastHandler({
      show: (type, options) => {
        showToast({
          type,
          title: options.title,
          message: options.message,
          duration: options.duration,
          action: options.action,
        })
      },
    })

    return () => {
      unregisterToastHandler()
    }
  }, [])

  const showSuccess = (title: string, message?: string, duration = 4000) => {
    showToast({ type: 'success', title, message, duration })
  }

  const showError = (title: string, message?: string, action?: ToastAction) => {
    // Errors stay until dismissed (duration: 0)
    showToast({ type: 'error', title, message, duration: 0, action })
  }

  const showInfo = (title: string, message?: string, duration = 5000) => {
    showToast({ type: 'info', title, message, duration })
  }

  const showWarning = (title: string, message?: string, duration = 7000) => {
    showToast({ type: 'warning', title, message, duration })
  }

  return (
    <ToastContext.Provider
      value={{ showToast, showSuccess, showError, showInfo, showWarning }}
    >
      {children}
      <div className={styles.container} aria-live="polite" aria-atomic="false">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
