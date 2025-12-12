import axios, { AxiosError } from 'axios'
import { tokenManager } from './tokenManager'
import { globalToast, parseApiError } from './globalToast'

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000, // 30 seconds for AI operations
  headers: {
    'Content-Type': 'application/json',
  },
})

// Track URLs that should suppress global error toasts (handled locally)
const suppressedErrorUrls = new Set<string>()

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  config => {
    // Add auth token if available
    const token = tokenManager.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and automatic token refresh
apiClient.interceptors.response.use(
  response => {
    return response
  },
  async error => {
    const originalRequest = error.config
    const requestUrl = originalRequest?.url || ''

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Attempt to refresh token
        const newToken = await tokenManager.handleTokenRefreshOnDemand()

        if (newToken) {
          // Update the authorization header and retry the request
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
        } else {
          // Refresh failed, redirect to login
          tokenManager.clearTokens()
          window.location.href = '/login'
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        tokenManager.clearTokens()
        window.location.href = '/login'
      }
    }

    // Show toast notification for errors (unless suppressed)
    const shouldShowToast = !originalRequest?._suppressErrorToast &&
                           !suppressedErrorUrls.has(requestUrl) &&
                           error.response?.status !== 401 // Don't show toast for auth errors

    if (shouldShowToast) {
      const { title, message } = parseApiError(error)
      globalToast.showError(title, message)
    }

    return Promise.reject(error)
  }
)

/**
 * Suppress error toast for a specific request
 * Use when you want to handle errors locally in the component
 *
 * @example
 * apiClient.get('/api/data', { _suppressErrorToast: true })
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    _suppressErrorToast?: boolean
  }
}

/**
 * Helper to suppress error toasts for specific URLs temporarily
 * Useful for batch operations where you want to handle errors collectively
 */
export function suppressErrorToastFor(url: string) {
  suppressedErrorUrls.add(url)
  // Auto-remove after 30 seconds
  setTimeout(() => suppressedErrorUrls.delete(url), 30000)
}

/**
 * Re-enable error toasts for a URL
 */
export function enableErrorToastFor(url: string) {
  suppressedErrorUrls.delete(url)
}
