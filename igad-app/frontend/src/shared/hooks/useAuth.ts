import { useState, useEffect } from 'react'
import { authService, UserInfo } from '@/shared/services/authService'

export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = authService.isAuthenticated()
      setIsAuthenticated(authenticated)

      if (authenticated) {
        try {
          const userInfo = await authService.getCurrentUser()
          setUser(userInfo)
        } catch (error) {
          setIsAuthenticated(false)
          setUser(null)
        }
      }
      setLoading(false)
    }

    // Listen for storage changes (login/logout in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      // When access_token changes (login or logout in another tab)
      if (e.key === 'access_token') {
        if (e.newValue) {
          // User logged in on another tab - reload user data
          console.log('🔄 User logged in on another tab, reloading session...')
          loadUser()
        } else {
          // User logged out on another tab
          console.log('🚪 User logged out on another tab, clearing session...')
          setUser(null)
          setIsAuthenticated(false)
          // Redirect to login if on a protected page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
          }
        }
      }
    }

    // Listen for custom auth events (same tab)
    const handleAuthEvent = ((e: CustomEvent) => {
      if (e.detail.type === 'login') {
        console.log('🔑 Login event detected, reloading user...')
        loadUser()
      } else if (e.detail.type === 'logout') {
        console.log('🚪 Logout event detected')
        setUser(null)
        setIsAuthenticated(false)
      }
    }) as EventListener

    loadUser()

    // Add listeners
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
