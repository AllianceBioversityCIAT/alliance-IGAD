import React from 'react'
import styles from './AnalysisProgressModal.module.css'

interface AnalysisProgressModalProps {
  isOpen: boolean
  progress?: {
    step: number
    total: number
    message: string
  } | null
}

const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({ isOpen, progress }) => {
  if (!isOpen) return null

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
          Our AI is analyzing your RFP and initial concept to provide strategic insights.
          This may take 1-3 minutes.
        </p>
        {progress && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(progress.step / progress.total) * 100}%` }} />
          </div>
        )}
        <div className={styles.steps}>
          <div className={`${styles.step} ${progress && progress.step >= 1 ? styles.stepActive : ''}`}>
            <div className={styles.stepIcon}>1</div>
            <div className={styles.stepText}>Analyzing RFP Document</div>
          </div>
          <div className={`${styles.step} ${progress && progress.step >= 2 ? styles.stepActive : ''}`}>
            <div className={styles.stepIcon}>2</div>
            <div className={styles.stepText}>Analyzing Initial Concept</div>
          </div>
        </div>
        <p className={styles.note}>
          {progress ? `Step ${progress.step} of ${progress.total}` : 'Please don\'t close this window'}
        </p>
      </div>
    </div>
  )
}

export default AnalysisProgressModal
