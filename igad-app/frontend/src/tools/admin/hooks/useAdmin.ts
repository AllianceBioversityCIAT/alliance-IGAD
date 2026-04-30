import { useAuth } from '@/shared/hooks/useAuth'

export const useAdmin = () => {
  const { user, loading, isAuthenticated } = useAuth()

  // useAuth skips its loading flag when a valid JWT is present, but the user
  // object is still being fetched in the background. Treat that window as
  // loading so AdminRoute doesn't redirect before is_admin is known.
  const adminLoading = loading || (isAuthenticated && !user)
  const isAdmin = user?.is_admin || false

  return {
    isAdmin,
    loading: adminLoading,
    requireAdmin: () => {
      if (!isAdmin) {
        throw new Error('Admin access required')
      }
    },
  }
}
