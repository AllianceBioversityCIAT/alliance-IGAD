import { useAuth } from './useAuth';

export const useAdmin = () => {
  const { user, loading } = useAuth();
  
  const isAdmin = user?.is_admin || false;
  
  return {
    isAdmin,
    loading,
    requireAdmin: () => {
      if (!isAdmin) {
        throw new Error('Admin access required');
      }
    }
  };
};
