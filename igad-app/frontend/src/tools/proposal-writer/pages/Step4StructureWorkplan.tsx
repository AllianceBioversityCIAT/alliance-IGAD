import { useState, useEffect } from 'react'
import { Layers, Check, ChevronDown, ChevronUp } from 'lucide-react'
import styles from './step4-structure.module.css'
import step2Styles from './step2.module.css'
import { StepProps } from './stepConfig'

interface Section {
  section: string
  description: string
  priority: 'Critical' | 'Recommended' | 'Optional'
  suggestions: string[]
}

interface Step4Props extends StepProps {
  proposalId?: string
  structureWorkplanAnalysis?: {
    narrative_overview?: string
    proposal_mandatory?: ProposalSection[]
    proposal_outline?: ProposalSection[]
    hcd_notes?: { note: string }[]
  }
  onGenerateTemplate?: (selectedSections: string[], userComments: { [key: string]: string }) => void
}

interface ProposalSection {
  section_title: string
  recommended_word_count: string
  purpose: string
  content_guidance: string
  guiding_questions: string[]
}

const PRIORITY_COLORS = {
  Critical: { bg: '#FFE2E2', border: '#FFC9C9', text: '#9F0712' },
  Recommended: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  Optional: { bg: '#E0E7FF', border: '#C7D2FE', text: '#193CB8' },
}

const PROPOSAL_SECTIONS: Section[] = [
  {
    section: 'Executive Summary',
    description:
      'A concise overview of the entire proposal, highlighting the problem, proposed solution, expected outcomes, and budget. This section should be written last but appears first.',
    priority: 'Critical',
    suggestions: [
      'Keep it to 1-2 pages maximum',
      'Write in clear, compelling language accessible to non-technical readers',
      'Include key metrics: target beneficiaries, budget, timeline',
      'Emphasize alignment with donor priorities',
    ],
  },
  {
    section: 'Problem Statement',
    description:
      'A clear articulation of the development challenge or issue that the project will address, supported by evidence and data.',
    priority: 'Critical',
    suggestions: [
      'Use recent, credible data and statistics',
      'Demonstrate understanding of root causes, not just symptoms',
      'Show how this problem affects target beneficiaries',
      'Reference relevant studies, reports, or assessments',
    ],
  },
  {
    section: 'Theory of Change',
    description:
      'A logical framework showing how your activities will lead to outputs, outcomes, and ultimately impact. Explains the causal pathway from inputs to long-term change.',
    priority: 'Critical',
    suggestions: [
      'Include a visual diagram if possible',
      'Clearly articulate assumptions',
      'Show both short-term and long-term changes',
      'Link directly to the problem statement',
    ],
  },
  {
    section: 'Project Objectives',
    description:
      'Specific, measurable, achievable, relevant, and time-bound (SMART) objectives that define what the project will accomplish.',
    priority: 'Critical',
    suggestions: [
      'Make objectives SMART (Specific, Measurable, Achievable, Relevant, Time-bound)',
      'Limit to 3-5 main objectives',
      'Align with donor strategic goals',
      'Include both process and outcome objectives',
    ],
  },
  {
    section: 'Implementation Methodology',
    description:
      'Detailed description of the approaches, strategies, and activities that will be used to achieve the project objectives.',
    priority: 'Critical',
    suggestions: [
      'Describe specific activities under each objective',
      'Explain why chosen approaches are appropriate',
      'Address any innovative or evidence-based methodologies',
      'Show how activities are sequenced and interrelated',
    ],
  },
  {
    section: 'Workplan and Timeline',
    description:
      'A detailed schedule showing when activities will be implemented, key milestones, and responsible parties.',
    priority: 'Critical',
    suggestions: [
      'Use a Gantt chart or clear table format',
      'Break down by quarters or months',
      'Include milestones and deliverables',
      'Show dependencies between activities',
    ],
  },
  {
    section: 'Monitoring, Evaluation & Learning',
    description:
      'Framework for tracking progress, measuring results, and using data for adaptive management and learning.',
    priority: 'Critical',
    suggestions: [
      'Define clear indicators for each objective',
      'Describe data collection methods and frequency',
      'Explain how findings will inform project adaptation',
      'Include baseline and target values',
    ],
  },
  {
    section: 'Gender and Social Inclusion',
    description:
      'Analysis of how the project will promote gender equality and address the needs of marginalized or vulnerable groups.',
    priority: 'Recommended',
    suggestions: [
      'Conduct gender and inclusion analysis',
      'Set specific targets for women and marginalized groups',
      'Address potential barriers to participation',
      'Show how activities will be gender-responsive',
    ],
  },
  {
    section: 'Sustainability Plan',
    description:
      'Strategy for ensuring that project benefits continue after donor funding ends, including financial, institutional, and community ownership aspects.',
    priority: 'Recommended',
    suggestions: [
      'Address financial sustainability (revenue models, cost recovery)',
      'Describe capacity building for local partners',
      'Explain community ownership strategies',
      'Show linkages to government systems or policies',
    ],
  },
  {
    section: 'Budget and Budget Narrative',
    description:
      'Detailed budget breakdown by line item and activity, with narrative justification explaining costs and their necessity.',
    priority: 'Critical',
    suggestions: [
      'Align budget categories with donor requirements',
      'Provide detailed narrative for major cost items',
      'Show cost-sharing or co-funding if applicable',
      'Ensure costs are realistic and well-justified',
    ],
  },
  {
    section: 'Organizational Capacity',
    description:
      "Demonstration of your organization's ability to successfully implement the project, including relevant experience, expertise, and resources.",
    priority: 'Recommended',
    suggestions: [
      'Highlight relevant past projects and results',
      'Describe key staff qualifications and experience',
      'Mention partnerships and local presence',
      'Address any capacity gaps and mitigation strategies',
    ],
  },
  {
    section: 'Risk Management',
    description:
      'Identification of potential risks to project success and mitigation strategies to address them.',
    priority: 'Recommended',
    suggestions: [
      'Categorize risks (political, operational, financial, environmental)',
      'Assess likelihood and impact of each risk',
      'Provide specific mitigation strategies',
      'Include contingency plans for critical risks',
    ],
  },
]

export function Step4StructureWorkplan({
  proposalId,
  structureWorkplanAnalysis,
  onGenerateTemplate,
}: Step4Props) {
  // Combine mandatory and outline sections
  const allSections = [
    ...(structureWorkplanAnalysis?.proposal_mandatory || []),
    ...(structureWorkplanAnalysis?.proposal_outline || [])
  ]

  const [selectedSections, setSelectedSections] = useState<string[]>(() => {
    // Select all mandatory sections by default
    return structureWorkplanAnalysis?.proposal_mandatory?.map(s => s.section_title) || []
  })
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [userComments, setUserComments] = useState<{ [key: string]: string }>({})

  const toggleSection = (sectionName: string) => {
    setSelectedSections(prev =>
      prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName]
    )
  }

  const toggleExpansion = (sectionName: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionName) ? prev.filter(s => s !== sectionName) : [...prev, sectionName]
    )
  }

  const handleCommentChange = (sectionName: string, comment: string) => {
    setUserComments(prev => ({ ...prev, [sectionName]: comment }))
  }

  const handleGenerateTemplate = () => {
    if (onGenerateTemplate) {
      onGenerateTemplate(selectedSections, userComments)
    }
  }

  const totalSections = allSections.length
  const reviewedCount = Object.keys(userComments).filter(key => userComments[key].trim()).length

  // Show loading state if no analysis yet
  if (!structureWorkplanAnalysis) {
    return (
      <div className={styles.mainContent}>
        <div className={styles.stepHeader}>
          <h1 className={styles.stepMainTitle}>
            Step 3: Structure & Workplan
            <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeProposal}`}>
              Proposal
            </span>
          </h1>
          <p className={styles.stepMainDescription}>
            Loading proposal structure and workplan...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.mainContent}>
      {/* Page Header */}
      <div className={styles.stepHeader}>
        <h1 className={styles.stepMainTitle}>
          Step 3: Structure & Workplan
          <span className={`${styles.stepPhaseBadge} ${styles.stepPhaseBadgeProposal}`}>
            Proposal
          </span>
        </h1>
        <p className={styles.stepMainDescription}>
          {structureWorkplanAnalysis.narrative_overview || 'Review the proposed structure for your proposal.'}
        </p>
      </div>

      <div className={step2Styles.step2Container}>
        {/* Sections Card */}
        <div className={step2Styles.sectionsCard}>
          <div className={step2Styles.sectionsCardInner}>
            <div className={step2Styles.sectionHeader}>
              <Layers className={step2Styles.sectionIcon} size={24} />
              <div>
                <h2 className={step2Styles.sectionTitle}>Proposal Sections</h2>
                <p className={step2Styles.sectionSubtitle}>
                  Review the proposed structure. Mandatory sections are pre-selected.
                </p>
              </div>
            </div>

            <div className={step2Styles.selectionCount}>
              <strong>{selectedSections.length}</strong> sections selected •{' '}
              <strong>{reviewedCount}</strong> of {totalSections} sections reviewed
            </div>

            <div className={step2Styles.sectionsList}>
              {allSections.map((section, index) => {
                const isSelected = selectedSections.includes(section.section_title)
                const isExpanded = expandedSections.includes(section.section_title)
                const isMandatory = structureWorkplanAnalysis?.proposal_mandatory?.some(
                  s => s.section_title === section.section_title
                )

                return (
                  <div key={index} className={step2Styles.sectionItem}>
                    <div className={step2Styles.sectionItemHeader}>
                      <div className={step2Styles.sectionItemHeaderLeft}>
                        <div
                          className={`${step2Styles.checkbox} ${isSelected ? step2Styles.checkboxChecked : ''}`}
                          onClick={() => toggleSection(section.section_title)}
                        >
                          {isSelected && <Check size={14} color="white" />}
                        </div>
                        <div className={step2Styles.sectionItemInfo}>
                          <h3 className={step2Styles.sectionItemTitle}>{section.section_title}</h3>
                          {isMandatory && (
                            <span
                              className={step2Styles.badge}
                              style={{
                                backgroundColor: '#FFE2E2',
                                border: '1px solid #FFC9C9',
                                color: '#9F0712',
                              }}
                            >
                              Mandatory
                            </span>
                          )}
                          {section.recommended_word_count && (
                            <span
                              className={step2Styles.badge}
                              style={{
                                backgroundColor: '#F3F4F6',
                                border: '1px solid #E5E7EB',
                                color: '#6B7280',
                              }}
                            >
                              {section.recommended_word_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className={step2Styles.expandButton}
                        onClick={() => toggleExpansion(section.section_title)}
                      >
                        {isExpanded ? 'See less' : 'See more'}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className={step2Styles.sectionItemContent}>
                        {section.purpose && (
                          <div className={step2Styles.detailsSection}>
                            <h4 className={step2Styles.subsectionTitle}>Purpose</h4>
                            <p className={step2Styles.subsectionText}>{section.purpose}</p>
                          </div>
                        )}

                        {section.content_guidance && (
                          <div className={step2Styles.detailsSection}>
                            <h4 className={step2Styles.subsectionTitle}>Content Guidance</h4>
                            <p className={step2Styles.subsectionText}>{section.content_guidance}</p>
                          </div>
                        )}

                        {section.guiding_questions && section.guiding_questions.length > 0 && (
                          <div className={step2Styles.suggestionsSection}>
                            <h4 className={step2Styles.subsectionTitle}>Guiding Questions</h4>
                            <ul className={step2Styles.suggestionsList}>
                              {section.guiding_questions.map((question, idx) => (
                                <li key={idx}>{question}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className={step2Styles.commentsSection}>
                          <h4 className={step2Styles.subsectionTitle}>
                            Your comments for this section
                          </h4>
                          <textarea
                            className={step2Styles.commentTextarea}
                            placeholder="Add specific guidance, data points, or context for this section..."
                            value={userComments[section.section_title] || ''}
                            onChange={e => handleCommentChange(section.section_title, e.target.value)}
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

        {/* Generate Template Section */}
        <div className={step2Styles.card}>
          <div className={step2Styles.sectionHeader}>
            <Layers className={step2Styles.sectionIcon} size={20} />
            <div>
              <h3 className={step2Styles.sectionTitle}>Generate Proposal Template</h3>
              <p className={step2Styles.sectionSubtitle}>
                Create a customized Word template with instructions and suggested content based on
                your RFP
              </p>
            </div>
          </div>
          <button
            className={styles.generateButton}
            onClick={() => {
              if (onGenerateTemplate) {
                onGenerateTemplate(selectedSections, userComments)
              }
            }}
            disabled={selectedSections.length === 0}
          >
            <Layers size={16} />
            Generate Template
          </button>
        </div>
      </div>
    </div>
  )
}

export default Step4StructureWorkplan
