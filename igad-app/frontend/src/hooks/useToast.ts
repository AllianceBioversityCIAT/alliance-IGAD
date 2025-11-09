import { useState, useCallback } from 'react'
import type { ToastProps } from '../components/ui/Toast'

type ToastType = 'success' | 'error' | 'info'

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) => {
      const id = Math.random().toString(36).substr(2, 9)
      const toast: ToastProps = {
        id,
        type,
        title,
        message,
        duration,
        onClose: removeToast,
      }

      setToasts(prev => [...prev, toast])
      return id
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback(
    (title: string, message?: string) => addToast('success', title, message),
    [addToast]
  )

  const error = useCallback(
    (title: string, message?: string) => addToast('error', title, message),
    [addToast]
  )

  const info = useCallback(
    (title: string, message?: string) => addToast('info', title, message),
    [addToast]
  )

  const warning = useCallback(
    (title: string, message?: string) => addToast('warning', title, message),
    [addToast]
  )

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  }
}
