import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ProposalSecondaryNavbar } from './ProposalSecondaryNavbar'
import { ProposalSidebar } from './ProposalSidebar'
import styles from '../pages/proposalWriter.module.css'

interface ProposalLayoutProps {
  currentStep: number
  completedSteps: number[]
  children: React.ReactNode
  navigationButtons: React.ReactNode
  proposalCode?: string
  isLoadingProposal?: boolean
  onNavigateAway?: () => void
}

export function ProposalLayout({
  currentStep,
  completedSteps,
  children,
  navigationButtons,
  proposalCode,
  isLoadingProposal = false,
  onNavigateAway,
}: ProposalLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()

  // Intercept navigation to other pages
  useEffect(() => {
    const handleNavClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]')

      if (link && link instanceof HTMLAnchorElement) {
        const href = link.getAttribute('href')

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

  return (
    <>
      <ProposalSecondaryNavbar proposalCode={proposalCode} isLoading={isLoadingProposal} />
      <div className={styles.proposalWriterContainer}>
        <ProposalSidebar currentStep={currentStep} completedSteps={completedSteps} />
        <div className={styles.contentArea}>
          {children}
          <div className={styles.navigationButtons}>
            <div className={styles.navButtonLeft}>
              {navigationButtons && React.Children.toArray(navigationButtons)[0]}
            </div>
            <div className={styles.stepIndicator}>Step {currentStep} of 5</div>
            <div className={styles.navButtonRight}>
              {navigationButtons && React.Children.toArray(navigationButtons)[1]}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
