import { CheckCircle } from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'

export function Step3StructureValidation({
  formData: _formData,
  setFormData: _setFormData,
}: StepProps) {
  return (
    <div className={styles.wizardContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Structure & Validation</h2>
        <p className={styles.stepDescription}>
          Organize and validate the generated content structure.
        </p>
      </div>
      <div className={styles.stepContent}>
        <div className={styles.placeholderContent}>
          <CheckCircle size={64} />
          <h3>Structure Validation</h3>
          <p>This step will organize and validate your proposal structure.</p>
        </div>
      </div>
    </div>
  )
}
