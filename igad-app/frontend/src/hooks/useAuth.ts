import { useState, useEffect } from 'react';
import { authService, UserInfo } from '../services/authService';

export const useAuth = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        try {
          const userInfo = await authService.getCurrentUser();
          setUser(userInfo);
        } catch (error) {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setLoading(false);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        if (e.newValue) {
          loadUser();
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    loadUser();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated,
    logout: authService.logout.bind(authService)
  };
};
