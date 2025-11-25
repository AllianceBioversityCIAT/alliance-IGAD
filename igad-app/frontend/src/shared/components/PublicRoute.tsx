import { Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { LoadingScreen } from '@/shared/components/LoadingScreen'

interface PublicRouteProps {
  children: React.ReactNode
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
