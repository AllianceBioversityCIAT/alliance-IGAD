import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NewsletterSecondaryNavbar } from './NewsletterSecondaryNavbar'
import { NewsletterSidebar } from './NewsletterSidebar'
import { newsletterService } from '../services/newsletterService'
import { useToast } from '@/shared/components/ui/ToastContainer'
import styles from '../pages/newsletterGenerator.module.css'

interface NewsletterLayoutProps {
  currentStep: number
  completedSteps: number[]
  children: React.ReactNode
  navigationButtons: React.ReactNode
  newsletterCode?: string
  newsletterId?: string
  newsletterStatus?: 'draft' | 'processing' | 'completed' | 'exported'
  isLoadingNewsletter?: boolean
  isLoadingStepData?: boolean
  onNavigateAway?: () => void
  /** Step from which invalidation occurred (null if no invalidation) */
  lastModifiedStep?: number | null
}

export function NewsletterLayout({
  currentStep,
  completedSteps,
  children,
  navigationButtons,
  newsletterCode,
  newsletterId,
  newsletterStatus = 'draft',
  isLoadingNewsletter = false,
  isLoadingStepData = false,
  onNavigateAway,
  lastModifiedStep = null,
}: NewsletterLayoutProps) {
  const navigate = useNavigate()
  const { showSuccess, showError } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  // Intercept navigation to other pages
  useEffect(() => {
    const handleNavClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]')

      if (link && link instanceof HTMLAnchorElement) {
        const href = link.getAttribute('href')

        // Ignore blob URLs (file downloads) and data URLs
        if (href && (href.startsWith('blob:') || href.startsWith('data:'))) {
          return
        }

        // Check if navigating away from newsletter generator
        if (href && !href.startsWith('/newsletter-generator') && onNavigateAway) {
          e.preventDefault()
          onNavigateAway()
        }
      }
    }

    document.addEventListener('click', handleNavClick, true)
    return () => document.removeEventListener('click', handleNavClick, true)
  }, [onNavigateAway])

  const handleSaveAndClose = async () => {
    if (!newsletterCode || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      // Update newsletter with current timestamp - keeps existing status
      await newsletterService.updateNewsletter(newsletterCode, {
        current_step: currentStep,
      })

      showSuccess('Newsletter saved successfully', 'Your progress has been saved.')

      // Navigate to dashboard after short delay to show success message
      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    } catch (error) {
      showError('Failed to save newsletter', 'Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <>
      <NewsletterSecondaryNavbar
        newsletterCode={newsletterCode}
        newsletterStatus={newsletterStatus}
        isLoading={isLoadingNewsletter}
        onSaveAndClose={newsletterId ? handleSaveAndClose : undefined}
        isSaving={isSaving}
      />
      <div className={styles.newsletterGeneratorContainer}>
        <NewsletterSidebar
          currentStep={currentStep}
          completedSteps={completedSteps}
          isLoading={isLoadingStepData}
          lastModifiedStep={lastModifiedStep}
        />
        <div className={styles.contentArea}>
          {children}
          <div className={styles.navigationButtons}>
            <div className={styles.navButtonLeft}>
              {navigationButtons && React.Children.toArray(navigationButtons)[0]}
            </div>
            <div className={styles.stepIndicatorNav}>Step {currentStep} of 4</div>
            <div className={styles.navButtonRight}>
              {navigationButtons && React.Children.toArray(navigationButtons)[1]}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
