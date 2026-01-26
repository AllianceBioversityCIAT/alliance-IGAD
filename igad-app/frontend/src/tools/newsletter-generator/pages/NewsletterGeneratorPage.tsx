import { useEffect } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useNewsletter } from '../hooks/useNewsletter'

/**
 * NewsletterGeneratorPage - Main wrapper/router for newsletter generator
 *
 * This component handles:
 * 1. Creating a new newsletter when accessing /newsletter-generator (no code)
 * 2. Routing to step pages when a newsletterCode is present
 */
export function NewsletterGeneratorPage() {
  const { newsletterCode } = useParams<{ newsletterCode?: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const { createNewsletter, isLoading } = useNewsletter({})

  // If no newsletter code, create a new newsletter
  useEffect(() => {
    // Only create if we're at the base route /newsletter-generator
    const isBaseRoute =
      location.pathname === '/newsletter-generator' || location.pathname === '/newsletter-generator/'

    if (isBaseRoute && !newsletterCode && !isLoading) {
      createNewsletter()
    }
  }, [newsletterCode, location.pathname, createNewsletter, isLoading])

  // If we have a newsletter code but no step, redirect to step-1
  useEffect(() => {
    if (newsletterCode) {
      const hasStep = location.pathname.includes('/step-')
      if (!hasStep) {
        navigate(`/newsletter-generator/${newsletterCode}/step-1`, { replace: true })
      }
    }
  }, [newsletterCode, location.pathname, navigate])

  // Show loading while creating newsletter
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 65px)',
          gap: '16px',
        }}
      >
        <Loader2
          size={40}
          style={{
            color: '#016630',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: '#6B7280', fontSize: '14px' }}>Creating your newsletter...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Render child routes (Step1, Step2, etc.)
  return <Outlet />
}
