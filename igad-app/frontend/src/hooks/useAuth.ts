import { useState, useEffect } from 'react';
import { authService, UserInfo } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (authService.isAuthenticated()) {
        try {
          const userInfo = await authService.getCurrentUser();
          setUser(userInfo);
        } catch (error) {
          console.error('Failed to load user:', error);
        }
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  return {
    user,
    loading,
    isAuthenticated: authService.isAuthenticated(),
    logout: authService.logout.bind(authService)
  };
};
