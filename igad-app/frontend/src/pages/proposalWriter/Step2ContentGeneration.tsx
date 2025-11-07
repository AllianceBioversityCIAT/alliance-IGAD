import { Edit } from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'

export function Step2ContentGeneration({ formData, setFormData }: StepProps) {
  return (
    <div className={styles.wizardContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Content Generation</h2>
        <p className={styles.stepDescription}>
          AI-powered content generation based on your uploaded documents and inputs.
        </p>
      </div>
      <div className={styles.stepContent}>
        <div className={styles.placeholderContent}>
          <Edit size={64} />
          <h3>Content Generation in Progress</h3>
          <p>This step will generate proposal content using AI based on your inputs.</p>
        </div>
      </div>
    </div>
  )
}
