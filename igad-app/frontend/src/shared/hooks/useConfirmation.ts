import { useState } from 'react'

interface ConfirmationOptions {
  type?: 'success' | 'warning' | 'info' | 'error'
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

export function useConfirmation() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: '',
    type: 'info',
  })
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = (opts: ConfirmationOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setOptions(opts)
      setResolvePromise(() => resolve)
      setIsOpen(true)
    })
  }

  const handleConfirm = () => {
    resolvePromise?.(true)
    setIsOpen(false)
    setResolvePromise(null)
  }

  const handleCancel = () => {
    resolvePromise?.(false)
    setIsOpen(false)
    setResolvePromise(null)
  }

  const handleClose = () => {
    resolvePromise?.(false)
    setIsOpen(false)
    setResolvePromise(null)
  }

  // Convenience methods
  const showSuccess = (title: string, message?: string) => {
    return confirm({
      type: 'success',
      title,
      message,
      confirmText: 'OK',
    })
  }

  const showError = (title: string, message?: string) => {
    return confirm({
      type: 'error',
      title,
      message,
      confirmText: 'OK',
    })
  }

  const showWarning = (title: string, message?: string, showCancel = true) => {
    return confirm({
      type: 'warning',
      title,
      message,
      confirmText: 'Continue',
      cancelText: 'Cancel',
      showCancel,
    })
  }

  const showInfo = (title: string, message?: string) => {
    return confirm({
      type: 'info',
      title,
      message,
      confirmText: 'OK',
    })
  }

  return {
    isOpen,
    options,
    handleConfirm,
    handleCancel,
    handleClose,
    confirm,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}
