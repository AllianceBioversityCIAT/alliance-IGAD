import { Download } from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'

export function Step5FinalExport({ formData: _formData, setFormData: _setFormData }: StepProps) {
  return (
    <div className={styles.wizardContainer}>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>Final Export</h2>
        <p className={styles.stepDescription}>Export your completed proposal in various formats.</p>
      </div>
      <div className={styles.stepContent}>
        <div className={styles.placeholderContent}>
          <Download size={64} />
          <h3>Export Options</h3>
          <p>This step will provide export options for your completed proposal.</p>
        </div>
      </div>
    </div>
  )
}
