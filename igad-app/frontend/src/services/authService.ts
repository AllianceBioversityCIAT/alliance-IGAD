const API_BASE_URL = 'http://localhost:8000';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  requires_password_change?: boolean;
  session?: string;
  username?: string;
  message?: string;
}

export interface AuthError {
  detail: string;
}

export interface UserInfo {
  user_id: string;
  email: string;
  username: string;
  role: string;
  is_admin: boolean;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error: AuthError = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    return response.json();
  }

  setToken(token: string, rememberMe: boolean = false): void {
    if (rememberMe) {
      localStorage.setItem('access_token', token);
      localStorage.setItem('remember_me', 'true');
    } else {
      sessionStorage.setItem('access_token', token);
      localStorage.removeItem('remember_me');
    }
  }

  getToken(): string | null {
    return localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
  }

  removeToken(): void {
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    
    // Only remove email if remember me was not checked
    const rememberMe = localStorage.getItem('remember_me');
    if (!rememberMe) {
      localStorage.removeItem('user_email');
    }
    sessionStorage.removeItem('user_email');
    // Don't remove remember_me flag so email persists
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  setUserEmail(email: string, rememberMe: boolean = false): void {
    if (rememberMe) {
      localStorage.setItem('user_email', email);
    } else {
      sessionStorage.setItem('user_email', email);
    }
  }

  getUserEmail(): string | null {
    return localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
  }

  async getCurrentUser(): Promise<UserInfo | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
        }
        return null;
      }

      return response.json();
    } catch (error) {
      return null;
    }
  }

  async completePasswordChange(username: string, session: string, newPassword: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/complete-password-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        username, 
        session, 
        new_password: newPassword 
      }),
    });

    if (!response.ok) {
      const error: AuthError = await response.json();
      throw new Error(error.detail || 'Password change failed');
    }

    return response.json();
  }

  async forgotPassword(username: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to send reset code');
    }

    return data;
  }

  async resetPassword(username: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, code, new_password: newPassword }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to reset password');
    }

    return data;
  }

  logout(): void {
    this.removeToken();
    window.location.href = '/login';
  }
}

export const authService = new AuthService();
