import { CheckCircle } from 'lucide-react'
import { stepConfig } from '../pages/stepConfig'
import styles from '../pages/proposalWriter.module.css'

interface ProposalSidebarProps {
  currentStep: number
  completedSteps: number[]
  isLoading?: boolean
}

/**
 * Skeleton component for sidebar loading state
 */
function SidebarSkeleton() {
  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        {/* Progress Header Skeleton */}
        <div className={styles.progressHeader}>
          <div className={styles.progressInfo}>
            <div className={`${styles.skeleton} ${styles.skeletonProgressTitle}`}></div>
            <div className={`${styles.skeleton} ${styles.skeletonProgressPercent}`}></div>
          </div>
          <div className={`${styles.skeleton} ${styles.skeletonProgressBar}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonStepText}`}></div>
        </div>

        {/* Steps List Skeleton */}
        <div className={styles.stepsList}>
          {[1, 2, 3, 4].map((step, index) => (
            <div key={step} className={styles.sidebarStep}>
              <div className={styles.stepIndicator}>
                <div className={`${styles.skeleton} ${styles.skeletonStepCircle}`}></div>
                {index < 3 && (
                  <div className={`${styles.skeleton} ${styles.skeletonStepLine}`}></div>
                )}
              </div>
              <div className={styles.stepContent}>
                <div className={`${styles.skeleton} ${styles.skeletonStepTitle}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProposalSidebar({
  currentStep,
  completedSteps,
  isLoading = false,
}: ProposalSidebarProps) {
  // Show skeleton while loading
  if (isLoading) {
    return <SidebarSkeleton />
  }
  // Calculate progress percentage based on completed steps
  const totalSteps = stepConfig.length
  const progressPercentage = Math.round((completedSteps.length / totalSteps) * 100)

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        {/* Progress Header */}
        <div className={styles.progressHeader}>
          <div className={styles.progressInfo}>
            <h3 className={styles.progressTitle}>Proposal Progress</h3>
            <span className={styles.progressPercentage}>{progressPercentage}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPercentage}%` }} />
          </div>
          <p className={styles.progressText}>
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {/* Steps List */}
        <div className={styles.stepsList}>
          {stepConfig.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id)
            const isActive = step.id === currentStep

            return (
              <div key={step.id} className={styles.sidebarStep}>
                <div className={styles.stepIndicator}>
                  <div
                    className={`${styles.stepCircle} ${
                      isActive
                        ? styles.stepCircleActive
                        : isCompleted
                          ? styles.stepCircleCompleted
                          : styles.stepCirclePending
                    }`}
                  >
                    {isCompleted ? <CheckCircle size={16} /> : step.id}
                  </div>
                  {index < stepConfig.length - 1 && (
                    <div
                      className={`${styles.stepLine} ${
                        isCompleted ? styles.stepLineCompleted : styles.stepLinePending
                      }`}
                    />
                  )}
                </div>
                <div className={styles.stepContent}>
                  <span
                    className={`${styles.sidebarStepTitle} ${
                      isActive
                        ? styles.sidebarStepTitleActive
                        : isCompleted
                          ? styles.sidebarStepTitleCompleted
                          : styles.sidebarStepTitlePending
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
