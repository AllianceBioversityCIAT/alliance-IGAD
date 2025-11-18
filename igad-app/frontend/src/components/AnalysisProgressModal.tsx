import React from 'react'
import styles from './AnalysisProgressModal.module.css'

interface AnalysisProgressModalProps {
  isOpen: boolean
}

const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({ isOpen }) => {
  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
        </div>
        <h2 className={styles.title}>Analyzing RFP Document</h2>
        <p className={styles.description}>
          Our AI is extracting text, creating embeddings, and analyzing your RFP document. 
          This may take 1-2 minutes.
        </p>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepIcon}>1</div>
            <div className={styles.stepText}>Extracting text from PDF</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepIcon}>2</div>
            <div className={styles.stepText}>Creating semantic embeddings</div>
          </div>
          <div className={styles.step}>
            <div className={styles.stepIcon}>3</div>
            <div className={styles.stepText}>Analyzing requirements with AI</div>
          </div>
        </div>
        <p className={styles.note}>Please don't close this window</p>
      </div>
    </div>
  )
}

export default AnalysisProgressModal
