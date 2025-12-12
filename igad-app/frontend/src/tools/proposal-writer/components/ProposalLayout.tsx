import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProposalSecondaryNavbar } from './ProposalSecondaryNavbar'
import { ProposalSidebar } from './ProposalSidebar'
import { proposalService } from '../services/proposalService'
import { useToast } from '@/shared/components/ui/ToastContainer'
import styles from '../pages/proposalWriter.module.css'

interface ProposalLayoutProps {
  currentStep: number
  completedSteps: number[]
  children: React.ReactNode
  navigationButtons: React.ReactNode
  proposalCode?: string
  proposalId?: string
  proposalStatus?: 'draft' | 'in_progress' | 'review' | 'completed' | 'archived'
  isLoadingProposal?: boolean
  isLoadingStepData?: boolean
  onNavigateAway?: () => void
}

export function ProposalLayout({
  currentStep,
  completedSteps,
  children,
  navigationButtons,
  proposalCode,
  proposalId,
  proposalStatus = 'draft',
  isLoadingProposal = false,
  isLoadingStepData = false,
  onNavigateAway,
}: ProposalLayoutProps) {
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

        // Check if navigating away from proposal writer
        if (href && !href.startsWith('/proposal-writer') && onNavigateAway) {
          e.preventDefault()
          onNavigateAway()
        }
      }
    }

    document.addEventListener('click', handleNavClick, true)
    return () => document.removeEventListener('click', handleNavClick, true)
  }, [onNavigateAway])

  const handleSaveAndClose = async () => {
    if (!proposalId || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      // Update proposal with current timestamp - keeps existing status
      await proposalService.updateProposal(proposalId, {
        updated_at: new Date().toISOString(),
      })

      showSuccess('Proposal saved successfully', 'Your progress has been saved.')

      // Navigate to dashboard after short delay to show success message
      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    } catch (error) {
      console.error('Failed to save proposal:', error)
      showError('Failed to save proposal', 'Please try again.')
      setIsSaving(false)
    }
  }

  return (
    <>
      <ProposalSecondaryNavbar
        proposalCode={proposalCode}
        proposalStatus={proposalStatus}
        isLoading={isLoadingProposal}
        onSaveAndClose={proposalId ? handleSaveAndClose : undefined}
        isSaving={isSaving}
      />
      <div className={styles.proposalWriterContainer}>
        <ProposalSidebar currentStep={currentStep} completedSteps={completedSteps} isLoading={isLoadingStepData} />
        <div className={styles.contentArea}>
          {children}
          <div className={styles.navigationButtons}>
            <div className={styles.navButtonLeft}>
              {navigationButtons && React.Children.toArray(navigationButtons)[0]}
            </div>
            <div className={styles.stepIndicator}>Step {currentStep} of 4</div>
            <div className={styles.navButtonRight}>
              {navigationButtons && React.Children.toArray(navigationButtons)[1]}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
