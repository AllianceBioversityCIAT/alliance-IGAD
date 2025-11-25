import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAdmin } from '@/tools/admin/hooks/useAdmin'
import { LoadingScreen } from './LoadingScreen'

interface AdminRouteProps {
  children: React.ReactNode
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { isAdmin, loading } = useAdmin()

  // Show loading screen while checking admin status
  if (loading) {
    return <LoadingScreen />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
