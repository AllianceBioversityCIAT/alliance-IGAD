import React from 'react'
import styles from './AnalysisProgressModal.module.css'

interface AnalysisProgressModalProps {
  isOpen: boolean
  progress?: {
    step: number
    total: number
    message: string
    description?: string  // Custom description
    steps?: string[]      // Custom step labels
  } | null
}

const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({ isOpen, progress }) => {
  if (!isOpen) return null

  // Default values for Step 1 (RFP Analysis)
  const defaultDescription = 'Our AI is analyzing your RFP and initial concept to provide strategic insights. This may take 1-3 minutes.'
  const defaultSteps = ['Analyzing RFP Document', 'Analyzing Initial Concept']
  
  const description = progress?.description || defaultDescription
  const steps = progress?.steps || defaultSteps

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
        </div>
        <h2 className={styles.title}>
          {progress ? progress.message : 'Analyzing Your Proposal'}
        </h2>
        <p className={styles.description}>
          {description}
        </p>
        {progress && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(progress.step / progress.total) * 100}%` }} />
          </div>
        )}
        <div className={styles.steps}>
          {steps.map((stepText, index) => (
            <div key={index} className={`${styles.step} ${progress && progress.step >= index + 1 ? styles.stepActive : ''}`}>
              <div className={styles.stepIcon}>{index + 1}</div>
              <div className={styles.stepText}>{stepText}</div>
            </div>
          ))}
        </div>
        <p className={styles.note}>
          {progress ? `Step ${progress.step} of ${progress.total}` : 'Please don\'t close this window'}
        </p>
      </div>
    </div>
  )
}

export default AnalysisProgressModal
