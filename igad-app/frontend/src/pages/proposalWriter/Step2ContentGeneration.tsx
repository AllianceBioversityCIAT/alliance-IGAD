import { Target } from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'

export function Step2ContentGeneration({ formData, setFormData }: StepProps) {
  return (
    <div className={styles.mainContent}>
      {/* Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>Step 2: Concept Review</h1>
        <p className={styles.stepMainDescription}>
          AI review of your high-level concept with fit assessment and elaboration suggestions
        </p>
      </div>

      {/* Analysis Content */}
      <div className={styles.analysisContainer}>
        <div className={styles.analysisIcon}>
          <Target size={64} />
        </div>
        <h2 className={styles.analysisTitle}>Analyzing Your Concept</h2>
        <p className={styles.analysisDescription}>
          Our AI is reviewing your initial concept to provide comprehensive feedback on alignment, strengths, and areas for development.
        </p>
        <div className={styles.analysisStatus}>
          <div className={styles.loadingDot}></div>
          <span className={styles.analysisStatusText}>Analyzing concept...</span>
        </div>
      </div>
    </div>
  )
}
