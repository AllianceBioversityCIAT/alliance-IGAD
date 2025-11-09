import { CheckCircle } from 'lucide-react'
import { stepConfig } from '../stepConfig'
import styles from '../proposalWriter.module.css'

interface ProposalSidebarProps {
  currentStep: number
  completedSteps: number[]
}

export function ProposalSidebar({ currentStep, completedSteps }: ProposalSidebarProps) {
  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        {/* Progress Header */}
        <div className={styles.progressHeader}>
          <div className={styles.progressInfo}>
            <h3 className={styles.progressTitle}>Proposal Progress</h3>
            <span className={styles.progressPercentage}>20%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '20%' }} />
          </div>
          <p className={styles.progressText}>Step {currentStep} of 5</p>
        </div>

        {/* Steps List */}
        <div className={styles.stepsList}>
          {stepConfig.map((step, index) => {
            const StepIcon = step.icon
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
