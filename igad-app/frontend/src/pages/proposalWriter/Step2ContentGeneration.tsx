import { AlertCircle } from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'
import RFPAnalysisResults from './components/RFPAnalysisResults'

interface Step2Props extends StepProps {
  proposalId?: string
  rfpAnalysis?: any
}

export function Step2ContentGeneration({ formData, setFormData: _setFormData, proposalId, rfpAnalysis }: Step2Props) {
  // Check if we should show "Missing Required Information"
  // Only show if no RFP has been uploaded (rfpAnalysis doesn't exist)
  if (!rfpAnalysis) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.stepHeader}>
          <h1 className={styles.stepMainTitle}>Step 2: Concept Review</h1>
          <p className={styles.stepMainDescription}>
            AI review of your high-level concept with fit assessment and elaboration suggestions
          </p>
        </div>

        <div className={styles.analysisContainer}>
          <div className={styles.analysisIcon}>
            <AlertCircle size={64} />
          </div>
          <h2 className={styles.analysisTitle}>Missing Required Information</h2>
          <p className={styles.analysisDescription}>
            Please complete Step 1 by uploading your RFP document and clicking "Analyze & Continue"
            to proceed with the AI analysis.
          </p>
          <div className={styles.analysisStatus}>
            <span className={styles.analysisStatusText}>Complete Step 1 to continue</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.mainContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>Step 2: Concept Review</h1>
        <p className={styles.stepMainDescription}>
          AI review of your high-level concept with fit assessment and elaboration suggestions
        </p>
      </div>

      {/* RFP Analysis Results - Main Content */}
      {rfpAnalysis && (
        <div className={styles.uploadSection}>
          <RFPAnalysisResults analysis={rfpAnalysis} />
        </div>
      )}

      {/* TODO: Concept Analysis - Coming Soon */}
      {/* This section will show after we implement concept analysis
      <div className={styles.analysisCompleteContainer}>
        <div className={styles.analysisCompleteHeader}>
          <CheckCircle className={styles.analysisCompleteIcon} size={32} />
          <div>
            <h2 className={styles.analysisCompleteTitle}>Concept Analysis</h2>
            <p className={styles.analysisCompleteDescription}>
              Review how your concept aligns with the RFP requirements
            </p>
          </div>
        </div>
      </div>
      */}
    </div>
  )
}
