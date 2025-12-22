/**
 * Global Toast Manager
 *
 * Provides toast notifications that can be called from anywhere,
 * including non-React contexts like API interceptors.
 *
 * Usage:
 * - From React components: Use useToast() hook (preferred)
 * - From non-React code: Use globalToast.showError(), etc.
 */

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title: string
  message?: string
  duration?: number
  action?: ToastAction
}

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastHandler {
  show: (type: ToastType, options: ToastOptions) => void
}

// Global reference to the toast handler (set by ToastProvider)
let toastHandler: ToastHandler | null = null

/**
 * Register the toast handler from ToastProvider
 * Called internally by ToastProvider on mount
 */
export function registerToastHandler(handler: ToastHandler) {
  toastHandler = handler
}

/**
 * Unregister the toast handler
 * Called internally by ToastProvider on unmount
 */
export function unregisterToastHandler() {
  toastHandler = null
}

/**
 * Global toast manager for use outside React components
 */
export const globalToast = {
  /**
   * Show a success toast
   */
  showSuccess(title: string, message?: string, duration = 4000) {
    if (toastHandler) {
      toastHandler.show('success', { title, message, duration })
    } else {
      // Removed console.log
    }
  },

  /**
   * Show an error toast (stays until dismissed)
   */
  showError(title: string, message?: string, action?: ToastAction) {
    if (toastHandler) {
      toastHandler.show('error', { title, message, duration: 0, action })
    } else {
      // Removed console.error
    }
  },

  /**
   * Show a warning toast
   */
  showWarning(title: string, message?: string, duration = 7000) {
    if (toastHandler) {
      toastHandler.show('warning', { title, message, duration })
    } else {
      // Removed console.warn
    }
  },

  /**
   * Show an info toast
   */
  showInfo(title: string, message?: string, duration = 5000) {
    if (toastHandler) {
      toastHandler.show('info', { title, message, duration })
    } else {
      // Removed console.info
    }
  },
}

/**
 * Parse API error responses into user-friendly messages
 */
export function parseApiError(error: unknown): { title: string; message: string } {
  // Default error
  let title = 'Error'
  let message = 'An unexpected error occurred. Please try again.'

  if (!error) {
    return { title, message }
  }

  // Axios error with response
  const err = error as {
    response?: { status?: number; data?: { detail?: unknown; message?: string; error?: string } }
    request?: unknown
    message?: string
  }
  if (err.response) {
    const status = err.response.status
    const data = err.response.data

    // Extract message from response
    if (data?.detail) {
      message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
    } else if (data?.message) {
      message = data.message
    } else if (data?.error) {
      message = data.error
    }

    // Set title based on status code
    switch (status) {
      case 400:
        title = 'Invalid Request'
        break
      case 401:
        title = 'Authentication Required'
        message = 'Please log in to continue.'
        break
      case 403:
        title = 'Access Denied'
        message = 'You do not have permission to perform this action.'
        break
      case 404:
        title = 'Not Found'
        message = 'The requested resource was not found.'
        break
      case 408:
        title = 'Request Timeout'
        message = 'The request took too long. Please try again.'
        break
      case 413:
        title = 'File Too Large'
        message = 'The uploaded file exceeds the size limit.'
        break
      case 422:
        title = 'Validation Error'
        break
      case 429:
        title = 'Too Many Requests'
        message = 'Please wait a moment before trying again.'
        break
      case 500:
        title = 'Server Error'
        message = 'Something went wrong on our end. Please try again later.'
        break
      case 502:
      case 503:
      case 504:
        title = 'Service Unavailable'
        message = 'The service is temporarily unavailable. Please try again later.'
        break
      default:
        title = `Error (${status})`
    }

    // Special handling for Bedrock/AI errors
    if (message.toLowerCase().includes('token') || message.toLowerCase().includes('throttl')) {
      title = 'AI Service Limit'
      message = 'The AI service has reached its capacity. Please try again in a few minutes.'
    }

    if (message.toLowerCase().includes('bedrock') || message.toLowerCase().includes('model')) {
      title = 'AI Processing Error'
    }
  } else if (err.request) {
    // Request was made but no response received
    title = 'Network Error'
    message = 'Unable to connect to the server. Please check your internet connection.'
  } else if (err.message) {
    // Error setting up the request
    message = err.message

    if (err.message.toLowerCase().includes('timeout')) {
      title = 'Request Timeout'
      message = 'The request took too long. Please try again.'
    } else if (err.message.toLowerCase().includes('network')) {
      title = 'Network Error'
    }
  }

  // Truncate very long messages
  if (message.length > 200) {
    message = message.substring(0, 197) + '...'
  }

  return { title, message }
}

export default globalToast
