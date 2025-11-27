import { Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { Spinner } from '@/shared/components/ui/Spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()

  // Show minimal loading spinner while checking authentication
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: '#ffffff',
        }}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  // Only redirect if definitively not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
