import { Eye } from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'

export function Step4ReviewRefinement({ formData, setFormData }: StepProps) {
  return (
    <div className={styles.wizardContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Review & Refinement</h2>
        <p className={styles.stepDescription}>
          Review the generated proposal and make final refinements.
        </p>
      </div>
      <div className={styles.stepContent}>
        <div className={styles.placeholderContent}>
          <Eye size={64} />
          <h3>Proposal Review</h3>
          <p>This step will allow you to review and refine your proposal.</p>
        </div>
      </div>
    </div>
  )
}
