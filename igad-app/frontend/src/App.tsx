import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/shared/components/ui/ToastContainer'
import { LoginPage } from '@/tools/auth/pages/LoginPage'
import { ForgotPasswordPage } from '@/tools/auth/pages/ForgotPasswordPage'
import { ChangePasswordPage } from '@/tools/auth/pages/ChangePasswordPage'
import { HomePage } from '@/pages/HomePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProposalWriterPage } from '@/tools/proposal-writer/pages/ProposalWriterPage'
import { NewsletterGeneratorPage } from '@/tools/newsletter-generator/pages/NewsletterGeneratorPage'
import { PromptManagerPage } from '@/tools/admin/pages/PromptManagerPage'
import { PromptEditorPage } from '@/tools/admin/pages/PromptEditorPage'
import { SettingsPage } from '@/tools/admin/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Layout } from '@/shared/components/Layout'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { AdminRoute } from '@/shared/components/AdminRoute'
import { PublicRoute } from '@/shared/components/PublicRoute'
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
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              }
            />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="proposal-writer" element={<ProposalWriterPage />} />
              <Route path="proposal-writer/:stepId" element={<ProposalWriterPage />} />
              <Route path="newsletter-generator" element={<NewsletterGeneratorPage />} />
              <Route
                path="admin/prompt-manager"
                element={
                  <AdminRoute>
                    <PromptManagerPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/prompt-manager/create"
                element={
                  <AdminRoute>
                    <PromptEditorPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/prompt-manager/edit/:id"
                element={
                  <AdminRoute>
                    <PromptEditorPage />
                  </AdminRoute>
                }
              />
              <Route
                path="admin/settings"
                element={
                  <AdminRoute>
                    <SettingsPage />
                  </AdminRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
