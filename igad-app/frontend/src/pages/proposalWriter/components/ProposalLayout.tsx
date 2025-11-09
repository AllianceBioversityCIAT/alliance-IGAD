import React from 'react'
import { ProposalSecondaryNavbar } from './ProposalSecondaryNavbar'
import { ProposalSidebar } from './ProposalSidebar'
import styles from '../proposalWriter.module.css'

interface ProposalLayoutProps {
  currentStep: number
  completedSteps: number[]
  children: React.ReactNode
  navigationButtons: React.ReactNode
}

export function ProposalLayout({
  currentStep,
  completedSteps,
  children,
  navigationButtons,
}: ProposalLayoutProps) {
  return (
    <>
      <ProposalSecondaryNavbar />
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
