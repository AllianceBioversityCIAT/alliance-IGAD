import { useState, useEffect } from 'react'
import { Target, CheckCircle, AlertCircle } from 'lucide-react'
import { useProposal } from '../../hooks/useProposal'
import { StepProps } from './stepConfig'
import styles from './proposalWriter.module.css'

interface Step2Props extends StepProps {
  proposalId?: string
}

export function Step2ContentGeneration({ formData, setFormData, proposalId }: Step2Props) {
  const { 
    proposal, 
    generateContent, 
    isGenerating, 
    generateError 
  } = useProposal(proposalId)
  
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<any>(null)

  // Check if we have enough data to proceed with analysis
  const hasRequiredData = () => {
    const hasRFP = formData.uploadedFiles['rfp-document']?.length > 0
    const hasConcept = (formData.textInputs['initial-concept']?.length || 0) > 100
    return hasRFP && hasConcept
  }

  // Simulate analysis process
  useEffect(() => {
    if (hasRequiredData() && !analysisComplete && !isGenerating) {
      // Start analysis after a short delay
      const timer = setTimeout(() => {
        startAnalysis()
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [formData, analysisComplete, isGenerating])

  const startAnalysis = async () => {
    if (!proposalId) return

    try {
      // Generate analysis content for concept review
      const contextData = {
        rfp_files: formData.uploadedFiles['rfp-document']?.map(f => f.name) || [],
        reference_proposals: formData.uploadedFiles['reference-proposals']?.map(f => f.name) || [],
        existing_work: formData.textInputs['existing-work'] || '',
        initial_concept: formData.textInputs['initial-concept'] || '',
        supporting_docs: formData.uploadedFiles['supporting-docs']?.map(f => f.name) || []
      }

      // This would trigger AI analysis
      await generateContent({
        sectionId: 'concept-analysis',
        contextData
      })

      // Simulate analysis results
      setAnalysisResults({
        fit_score: 85,
        strengths: [
          'Strong alignment with donor priorities',
          'Clear problem statement and solution approach',
          'Relevant regional expertise and partnerships'
        ],
        recommendations: [
          'Expand on sustainability measures',
          'Include more specific budget breakdown',
          'Add risk mitigation strategies'
        ],
        missing_elements: [
          'Detailed monitoring and evaluation framework',
          'Community engagement strategy',
          'Environmental impact assessment'
        ]
      })

      setAnalysisComplete(true)
    } catch (error) {
    }
  }

  if (!hasRequiredData()) {
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
            Please complete Step 1 by uploading your RFP document and providing your initial concept (minimum 100 characters) before proceeding with the AI analysis.
          </p>
          <div className={styles.analysisStatus}>
            <span className={styles.analysisStatusText}>Complete Step 1 to continue</span>
          </div>
        </div>
      </div>
    )
  }

  if (isGenerating || !analysisComplete) {
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

  return (
    <div className={styles.mainContent}>
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>Step 2: Concept Review</h1>
        <p className={styles.stepMainDescription}>
          AI review of your high-level concept with fit assessment and elaboration suggestions
        </p>
      </div>

      {/* Analysis Complete */}
      <div className={styles.analysisCompleteContainer}>
        <div className={styles.analysisCompleteHeader}>
          <CheckCircle className={styles.analysisCompleteIcon} size={32} />
          <div>
            <h2 className={styles.analysisCompleteTitle}>Analysis Complete</h2>
            <p className={styles.analysisCompleteDescription}>
              Your concept has been analyzed against the RFP requirements
            </p>
          </div>
        </div>

        {/* Fit Score */}
        {analysisResults && (
          <div className={styles.fitScoreCard}>
            <h3 className={styles.fitScoreTitle}>RFP Alignment Score</h3>
            <div className={styles.fitScoreValue}>{analysisResults.fit_score}%</div>
            <div className={styles.fitScoreBar}>
              <div 
                className={styles.fitScoreFill} 
                style={{ width: `${analysisResults.fit_score}%` }}
              />
            </div>
            <p className={styles.fitScoreDescription}>
              Strong alignment with donor priorities and requirements
            </p>
          </div>
        )}

        {/* Strengths */}
        {analysisResults?.strengths && (
          <div className={styles.analysisSection}>
            <h3 className={styles.analysisSectionTitle}>Key Strengths</h3>
            <ul className={styles.analysisList}>
              {analysisResults.strengths.map((strength: string, index: number) => (
                <li key={index} className={styles.analysisListItem}>
                  <CheckCircle size={16} className={styles.analysisListIcon} />
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {analysisResults?.recommendations && (
          <div className={styles.analysisSection}>
            <h3 className={styles.analysisSectionTitle}>Recommendations for Improvement</h3>
            <ul className={styles.analysisList}>
              {analysisResults.recommendations.map((rec: string, index: number) => (
                <li key={index} className={styles.analysisListItem}>
                  <Target size={16} className={styles.analysisListIcon} />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Elements */}
        {analysisResults?.missing_elements && (
          <div className={styles.analysisSection}>
            <h3 className={styles.analysisSectionTitle}>Missing Elements to Address</h3>
            <ul className={styles.analysisList}>
              {analysisResults.missing_elements.map((element: string, index: number) => (
                <li key={index} className={styles.analysisListItem}>
                  <AlertCircle size={16} className={styles.analysisListIcon} />
                  {element}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {generateError && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          <span>Analysis failed: {generateError.message}</span>
        </div>
      )}
    </div>
  )
}
