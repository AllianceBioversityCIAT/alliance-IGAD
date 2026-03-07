import { lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/shared/components/ui/ToastContainer'
import { LoginPage } from '@/tools/auth/pages/LoginPage'
import { ForgotPasswordPage } from '@/tools/auth/pages/ForgotPasswordPage'
import { ChangePasswordPage } from '@/tools/auth/pages/ChangePasswordPage'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { GuidePage } from '@/pages/GuidePage'
import { Layout } from '@/shared/components/Layout'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { AdminRoute } from '@/shared/components/AdminRoute'
import { PublicRoute } from '@/shared/components/PublicRoute'
import '@/styles/globals.css'

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage }))
)
const ProposalWriterPage = lazy(() =>
  import('@/tools/proposal-writer/pages/ProposalWriterPage').then(m => ({
    default: m.ProposalWriterPage,
  }))
)
const NewsletterGeneratorPage = lazy(() =>
  import('@/tools/newsletter-generator/pages/NewsletterGeneratorPage').then(m => ({
    default: m.NewsletterGeneratorPage,
  }))
)
const Step1Configuration = lazy(() =>
  import('@/tools/newsletter-generator/pages/Step1Configuration').then(m => ({
    default: m.Step1Configuration,
  }))
)
const Step2ContentPlanning = lazy(() =>
  import('@/tools/newsletter-generator/pages/Step2ContentPlanning').then(m => ({
    default: m.Step2ContentPlanning,
  }))
)
const Step3OutlineReview = lazy(() =>
  import('@/tools/newsletter-generator/pages/Step3OutlineReview').then(m => ({
    default: m.Step3OutlineReview,
  }))
)
const Step4DraftPreview = lazy(() =>
  import('@/tools/newsletter-generator/pages/Step4DraftPreview').then(m => ({
    default: m.Step4DraftPreview,
  }))
)
const PromptManagerPage = lazy(() =>
  import('@/tools/admin/pages/PromptManagerPage').then(m => ({
    default: m.PromptManagerPage,
  }))
)
const PromptEditorPage = lazy(() =>
  import('@/tools/admin/pages/PromptEditorPage').then(m => ({
    default: m.PromptEditorPage,
  }))
)
const SettingsPage = lazy(() =>
  import('@/tools/admin/pages/SettingsPage').then(m => ({ default: m.SettingsPage }))
)

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
            <Route path="/guide" element={<GuidePage />} />
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
              {/* Newsletter Generator Routes */}
              <Route path="newsletter-generator" element={<NewsletterGeneratorPage />}>
                <Route path=":newsletterCode/step-1" element={<Step1Configuration />} />
                <Route path=":newsletterCode/step-2" element={<Step2ContentPlanning />} />
                <Route path=":newsletterCode/step-3" element={<Step3OutlineReview />} />
                <Route path=":newsletterCode/step-4" element={<Step4DraftPreview />} />
              </Route>
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
