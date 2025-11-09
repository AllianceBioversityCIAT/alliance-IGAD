import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ToastProvider } from '@/components/ui/ToastContainer'
import { LoginPage } from '@/pages/LoginPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'
import { HomePage } from '@/pages/HomePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProposalWriterPage } from '@/pages/proposalWriter/ProposalWriterPage'
import { NewsletterGeneratorPage } from '@/pages/NewsletterGeneratorPage'
import { PromptManagerPage } from '@/pages/admin/PromptManagerPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminRoute } from '@/components/AdminRoute'
import { PublicRoute } from '@/components/PublicRoute'
import CognitoTest from '@/components/CognitoTest'
import '@/styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          } />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/test-cognito" element={<CognitoTest />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="proposal-writer" element={<ProposalWriterPage />} />
            <Route path="proposal-writer/:stepId" element={<ProposalWriterPage />} />
            <Route path="newsletter-generator" element={<NewsletterGeneratorPage />} />
            <Route path="admin/prompt-manager" element={
              <AdminRoute>
                <PromptManagerPage />
              </AdminRoute>
            } />
            <Route path="admin/settings" element={
              <AdminRoute>
                <SettingsPage />
              </AdminRoute>
            } />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
