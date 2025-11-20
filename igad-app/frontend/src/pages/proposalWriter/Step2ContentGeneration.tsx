import { AlertCircle } from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'

interface Step2Props extends StepProps {
  proposalId?: string
  rfpAnalysis?: any
}

export function Step2ContentGeneration({ formData, setFormData: _setFormData, proposalId, rfpAnalysis }: Step2Props) {
  // Extract rfp_analysis data safely
  const analysisData = rfpAnalysis?.rfp_analysis || rfpAnalysis
  
  console.log('🔍 Step2 - analysisData:', analysisData)
  
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

      {/* RFP Analysis Results - Show complete AI response */}
      {analysisData && (
        <div className={styles.uploadSection}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 p-6 border-b border-gray-200">
              <div className="w-6 h-6 text-green-600">✓</div>
              <h3 className="text-xl font-semibold text-gray-900">
                RFP Analysis Complete
              </h3>
            </div>
            
            <div className="p-6 bg-gray-900 overflow-auto max-h-[600px]" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              <pre className="text-sm text-green-400 font-mono leading-relaxed whitespace-pre-wrap">
                {JSON.stringify(analysisData, null, 2)}
              </pre>
            </div>
          </div>
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
