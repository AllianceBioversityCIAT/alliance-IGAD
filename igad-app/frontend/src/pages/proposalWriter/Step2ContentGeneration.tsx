import { useState, useEffect } from 'react'
import { Target, CheckCircle, Layers, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { StepProps } from './stepConfig'
import styles from './step2.module.css'

interface FitAssessment {
  alignment_level: string
  justification: string
  confidence: string
}

interface SectionNeedingElaboration {
  section: string
  issue: string
  priority: 'Critical' | 'Recommended' | 'Optional'
}

interface ConceptAnalysis {
  fit_assessment: FitAssessment
  strong_aspects: string[]
  sections_needing_elaboration: SectionNeedingElaboration[]
  strategic_verdict: string
}

interface Step2Props extends StepProps {
  proposalId?: string
  conceptAnalysis?: ConceptAnalysis
  onConceptEvaluationChange?: (data: {
    selectedSections: string[]
    userComments: { [key: string]: string }
  }) => void
}

const ALIGNMENT_COLORS = {
  'Very strong alignment': { bg: '#DCFCE7', border: '#B9F8CF', text: '#016630' },
  'Strong alignment': { bg: '#DCFCE7', border: '#B9F8CF', text: '#016630' },
  'Moderate alignment': { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  'Partial alignment with potential for improvement': { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  'Weak alignment': { bg: '#FFE2E2', border: '#FFC9C9', text: '#9F0712' }
}

const PRIORITY_COLORS = {
  'Critical': { bg: '#FFE2E2', border: '#FFC9C9', text: '#9F0712' },
  'Recommended': { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  'Optional': { bg: '#E0E7FF', border: '#C7D2FE', text: '#193CB8' }
}

export function Step2ContentGeneration({ conceptAnalysis: rawConceptAnalysis, onConceptEvaluationChange }: Step2Props) {
  // Unwrap concept_analysis if it comes wrapped from backend
  const conceptAnalysis = rawConceptAnalysis?.concept_analysis || rawConceptAnalysis
  
  console.log('🔍 Step 2 - Raw Concept Analysis:', rawConceptAnalysis)
  console.log('🔍 Step 2 - Unwrapped Concept Analysis:', conceptAnalysis)
  
  // Initialize selected sections (Critical checked by default)
  const [selectedSections, setSelectedSections] = useState<string[]>(() => {
    if (!conceptAnalysis?.sections_needing_elaboration) return []
    return conceptAnalysis.sections_needing_elaboration
      .filter(s => s.priority === 'Critical')
      .map(s => s.section)
  })
  
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [userComments, setUserComments] = useState<{ [key: string]: string }>({})

  // Notify parent of state changes
  useEffect(() => {
    if (onConceptEvaluationChange) {
      onConceptEvaluationChange({
        selectedSections,
        userComments
      })
    }
  }, [selectedSections, userComments, onConceptEvaluationChange])

  if (!conceptAnalysis || !conceptAnalysis.fit_assessment) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.stepHeader}>
          <h1 className={styles.stepMainTitle}>Step 2: Concept Review</h1>
          <p className={styles.stepMainDescription}>
            AI review of your high-level concept with fit assessment and elaboration suggestions
          </p>
        </div>
        <div className={styles.emptyState}>
          <p>Complete Step 1 to see your concept analysis</p>
        </div>
      </div>
    )
  }

  const { fit_assessment, strong_aspects, sections_needing_elaboration, strategic_verdict } = conceptAnalysis

  const toggleSection = (sectionName: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    )
  }

  const toggleExpansion = (sectionName: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    )
  }

  const handleCommentChange = (sectionName: string, comment: string) => {
    setUserComments(prev => ({ ...prev, [sectionName]: comment }))
  }

  const alignmentColor = ALIGNMENT_COLORS[fit_assessment.alignment_level as keyof typeof ALIGNMENT_COLORS] || ALIGNMENT_COLORS['Moderate alignment']

  return (
    <div className={styles.mainContent}>
      {/* Page Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>Step 2: Concept Review</h1>
        <p className={styles.stepMainDescription}>
          AI review of your high-level concept with fit assessment and elaboration suggestions
        </p>
      </div>

      <div className={styles.step2Container}>
        {/* Fit Assessment Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.sectionHeader}>
              <Target className={styles.sectionIcon} size={24} />
              <div>
                <h2 className={styles.sectionTitle}>Fit Assessment</h2>
                <p className={styles.sectionSubtitle}>Overall alignment with donor priorities and RFP requirements</p>
              </div>
            </div>
            <span
              className={styles.badge}
              style={{
                backgroundColor: alignmentColor.bg,
                border: `1px solid ${alignmentColor.border}`,
                color: alignmentColor.text
              }}
            >
              {fit_assessment.alignment_level}
            </span>
          </div>
          <div className={styles.fitAssessmentContent}>
            <p className={styles.justificationText}>{fit_assessment.justification}</p>
          </div>
        </div>

        {/* Strong Aspects Card */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <CheckCircle className={styles.sectionIcon} size={24} />
            <div>
              <h2 className={styles.sectionTitle}>Strong Aspects of Your Proposal</h2>
              <p className={styles.sectionSubtitle}>Key strengths identified in your initial concept</p>
            </div>
          </div>
          <div className={styles.strongAspectsList}>
            {strong_aspects.map((aspect, index) => (
              <div key={index} className={styles.strongAspectItem}>
                <Check className={styles.checkIcon} size={16} />
                <span className={styles.aspectText}>{aspect}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sections Needing Elaboration Card */}
        <div className={styles.sectionsCard}>
          <div className={styles.sectionsCardInner}>
            <div className={styles.sectionHeader}>
              <Layers className={styles.sectionIcon} size={24} />
              <div>
                <h2 className={styles.sectionTitle}>Sections Needing Elaboration</h2>
                <p className={styles.sectionSubtitle}>
                  Select the sections you'd like to include in the updated concept document. Selected sections will be automatically generated and included in your updated concept document in the next step. Comments will provide additional context to guide AI generation.
                </p>
              </div>
            </div>

            <div className={styles.selectionCount}>
              <strong>{selectedSections.length}</strong> sections selected
            </div>

            <div className={styles.sectionsList}>
              {sections_needing_elaboration.map((section, index) => {
                const isSelected = selectedSections.includes(section.section)
                const isExpanded = expandedSections.includes(section.section)
                const priorityColor = PRIORITY_COLORS[section.priority]

                return (
                  <div key={index} className={styles.sectionItem}>
                    <div className={styles.sectionItemHeader}>
                      <div className={styles.sectionItemHeaderLeft}>
                        <div
                          className={`${styles.checkbox} ${isSelected ? styles.checkboxChecked : ''}`}
                          onClick={() => toggleSection(section.section)}
                        >
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                        <div className={styles.sectionItemInfo}>
                          <h3 className={styles.sectionItemTitle}>{section.section}</h3>
                          <span
                            className={styles.badge}
                            style={{
                              backgroundColor: priorityColor.bg,
                              border: `1px solid ${priorityColor.border}`,
                              color: priorityColor.text
                            }}
                          >
                            {section.priority}
                          </span>
                        </div>
                      </div>
                      <button
                        className={styles.expandButton}
                        onClick={() => toggleExpansion(section.section)}
                      >
                        {isExpanded ? 'See less' : 'See more'}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className={styles.sectionItemContent}>
                        <div className={styles.detailsSection}>
                          <h4 className={styles.subsectionTitle}>Details and Guidance</h4>
                          <p className={styles.subsectionText}>{section.issue}</p>
                        </div>

                        <div className={styles.suggestionsSection}>
                          <h4 className={styles.subsectionTitle}>Suggestions</h4>
                          <ul className={styles.suggestionsList}>
                            <li>Start with the end (impact) and work backwards</li>
                            <li>List key assumptions that must hold true</li>
                            <li>Reference evidence for why your approach will work</li>
                          </ul>
                        </div>

                        <div className={styles.commentsSection}>
                          <h4 className={styles.subsectionTitle}>Your comments for this section</h4>
                          <textarea
                            className={styles.commentTextarea}
                            placeholder="Add specific guidance, data points, or context for this section..."
                            value={userComments[section.section] || ''}
                            onChange={(e) => handleCommentChange(section.section, e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Strategic Verdict (if needed) */}
        {strategic_verdict && (
          <div className={styles.verdictBox}>
            <p className={styles.verdictText}>{strategic_verdict}</p>
          </div>
        )}
      </div>
    </div>
  )
}
