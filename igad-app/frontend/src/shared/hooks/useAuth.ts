import { useState, useEffect } from 'react'
import { authService, UserInfo } from '@/shared/services/authService'

export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null)
  // If a valid (non-expired) JWT exists, assume authenticated immediately
  // This avoids showing a loading spinner while /me validates in background
  const hasValidToken = authService.isAuthenticated()
  const [loading, setLoading] = useState(!hasValidToken)
  const [isAuthenticated, setIsAuthenticated] = useState(hasValidToken)

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)

      if (authenticated) {
        try {
          const userInfo = await authService.getCurrentUser()
          setUser(userInfo)
          if (!userInfo) {
            // Token was valid locally but server rejected it
            setIsAuthenticated(false)
          }
        } catch (error) {
          setIsAuthenticated(false)
          setUser(null)
        }
      }
      setLoading(false)
    }

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        if (e.newValue) {
          loadUser()
        } else {
          setUser(null)
          setIsAuthenticated(false)
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
      }
    }

    // Listen for custom auth events (same tab)
    const handleAuthEvent = ((e: CustomEvent) => {
      if (e.detail.type === 'login') {
        loadUser()
      } else if (e.detail.type === 'logout') {
        setUser(null)
        setIsAuthenticated(false)
      }
    }) as EventListener

    loadUser()

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('auth-change', handleAuthEvent)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('auth-change', handleAuthEvent)
    }
  }, [])

  return {
    user,
    loading,
    isAuthenticated,
    logout: authService.logout.bind(authService),
  }
}
