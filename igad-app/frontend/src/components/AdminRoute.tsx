import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'
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
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
