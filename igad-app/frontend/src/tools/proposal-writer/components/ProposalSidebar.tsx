import { CheckCircle, AlertCircle } from 'lucide-react'
import { stepConfig } from '../pages/stepConfig'
import styles from '../pages/proposalWriter.module.css'

interface ProposalSidebarProps {
  currentStep: number
  completedSteps: number[]
  isLoading?: boolean
  /** Step from which invalidation occurred (null if no invalidation) */
  lastModifiedStep?: number | null
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
  lastModifiedStep = null,
}: ProposalSidebarProps) {
  // Show skeleton while loading
  if (isLoading) {
    return <SidebarSkeleton />
  }
  // Calculate progress percentage based on completed steps
  const totalSteps = stepConfig.length
  const progressPercentage = Math.round((completedSteps.length / totalSteps) * 100)

  /**
   * Determine if a step needs recalculation (was invalidated)
   * A step needs recalculation if:
   * - lastModifiedStep is set (some invalidation occurred)
   * - The step number is greater than the lastModifiedStep
   * - The step is not currently completed
   */
  const needsRecalculation = (stepId: number): boolean => {
    if (lastModifiedStep === null) {
      return false
    }
    return stepId > lastModifiedStep && !completedSteps.includes(stepId)
  }

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
            const isInvalidated = needsRecalculation(step.id)

            // Determine circle style - invalidated takes precedence over pending
            const getCircleStyle = () => {
              if (isActive) {
                return styles.stepCircleActive
              }
              if (isCompleted) {
                return styles.stepCircleCompleted
              }
              if (isInvalidated) {
                return styles.stepCircleInvalidated
              }
              return styles.stepCirclePending
            }

            // Determine what to render inside the circle
            const renderCircleContent = () => {
              if (isCompleted) {
                return <CheckCircle size={16} />
              }
              if (isInvalidated) {
                return <AlertCircle size={16} />
              }
              return step.id
            }

            return (
              <div key={step.id} className={styles.sidebarStep}>
                <div className={styles.stepIndicator}>
                  <div className={`${styles.stepCircle} ${getCircleStyle()}`}>
                    {renderCircleContent()}
                  </div>
                  {index < stepConfig.length - 1 && (
                    <div
                      className={`${styles.stepLine} ${
                        isCompleted
                          ? styles.stepLineCompleted
                          : isInvalidated
                            ? styles.stepLineInvalidated
                            : styles.stepLinePending
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
                          : isInvalidated
                            ? styles.sidebarStepTitleInvalidated
                            : styles.sidebarStepTitlePending
                    }`}
                  >
                    {step.title}
                  </span>
                  {isInvalidated && <span className={styles.invalidatedHint}>Needs update</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
