const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface TokenData {
  access_token: string
  refresh_token?: string
  expires_in: number
}

class TokenManager {
  private refreshTimer: NodeJS.Timeout | null = null
  private isRefreshing = false
  private refreshPromise: Promise<boolean> | null = null

  constructor() {
    this.init()
  }

  init(): void {
    // Setup automatic refresh on app start
    this.setupAutoRefresh()
    
    // Check if token needs immediate refresh
    const token = this.getAccessToken()
    if (token && this.isTokenExpiringSoon(token)) {
      this.refreshTokens()
    }
  }

  private setupAutoRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    // Set up refresh every 23 hours (tokens last 24 hours)
    this.refreshTimer = setInterval(() => {
      this.refreshTokens()
    }, 23 * 60 * 60 * 1000) // 23 hours
  }

  async refreshTokens(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing) {
      return this.refreshPromise || Promise.resolve(false)
    }

    this.isRefreshing = true
    this.refreshPromise = this.performTokenRefresh()

    try {
      const result = await this.refreshPromise
      return result
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) {
        console.warn('No refresh token available')
        return false
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      })

      if (!response.ok) {
        console.error('Token refresh failed:', response.status)
        this.handleRefreshFailure()
        return false
      }

      const tokenData: TokenData = await response.json()
      
      // Update stored tokens
      this.setAccessToken(tokenData.access_token)
      if (tokenData.refresh_token) {
        this.setRefreshToken(tokenData.refresh_token)
      }

      console.log('Tokens refreshed successfully')
      return true

    } catch (error) {
      console.error('Token refresh error:', error)
      this.handleRefreshFailure()
      return false
    }
  }

  private handleRefreshFailure(): void {
    // Clear all tokens and redirect to login
    this.clearTokens()
    window.location.href = '/login'
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
  }

  setAccessToken(token: string): void {
    const rememberMe = localStorage.getItem('remember_me') === 'true'
    if (rememberMe) {
      localStorage.setItem('access_token', token)
    } else {
      sessionStorage.setItem('access_token', token)
    }
  }

  setRefreshToken(token: string): void {
    const rememberMe = localStorage.getItem('remember_me') === 'true'
    if (rememberMe) {
      localStorage.setItem('refresh_token', token)
    } else {
      sessionStorage.setItem('refresh_token', token)
    }
  }

  setTokens(accessToken: string, refreshToken?: string, rememberMe: boolean = false): void {
    if (rememberMe) {
      localStorage.setItem('access_token', accessToken)
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
      }
      localStorage.setItem('remember_me', 'true')
    } else {
      sessionStorage.setItem('access_token', accessToken)
      if (refreshToken) {
        sessionStorage.setItem('refresh_token', refreshToken)
      }
      localStorage.removeItem('remember_me')
    }
  }

  clearTokens(): void {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    
    // Clear refresh timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expirationTime = payload.exp * 1000
      const currentTime = Date.now()
      const timeUntilExpiry = expirationTime - currentTime
      
      // Refresh if expires in less than 1 hour
      return timeUntilExpiry < 60 * 60 * 1000
    } catch (error) {
      console.error('Error parsing token:', error)
      return true // Assume expired if can't parse
    }
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken()
    if (!token) return false
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expirationTime = payload.exp * 1000
      return Date.now() < expirationTime
    } catch {
      return false
    }
  }

  // Method to handle token refresh on API call failure
  async handleTokenRefreshOnDemand(): Promise<string | null> {
    const success = await this.refreshTokens()
    return success ? this.getAccessToken() : null
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}

// Export singleton instance
export const tokenManager = new TokenManager()
