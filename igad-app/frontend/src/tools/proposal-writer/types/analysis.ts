// ============================================================================
// ANALYSIS TYPES
// ============================================================================
// Shared types for all analysis results used in the proposal writer

// RFP Analysis Types
export interface RFPAnalysisSummary {
  title: string
  donor: string
  deadline: string
  budget_range: string
  key_focus: string
}

export interface RFPAnalysisExtractedData {
  geographic_scope: string[]
  target_beneficiaries: string
  deliverables: string[]
  mandatory_requirements: string[]
  evaluation_criteria: string
}

export interface RFPAnalysis {
  summary: RFPAnalysisSummary
  extracted_data: RFPAnalysisExtractedData
}

// Concept Analysis Types
export interface FitAssessment {
  alignment_level: string
  justification: string
  confidence: string
  // Legacy support if needed, but Step2 uses justification/confidence
  priority_areas?: Array<{
    priority: string
    alignment: string
    explanation: string
  }>
}

export interface SectionNeedingElaboration {
  section: string
  issue: string // Used in Step2
  reason?: string // Legacy?
  priority: 'Critical' | 'Recommended' | 'Optional'
  suggestions?: string[]
  selected?: boolean
  user_comment?: string
}

export interface ConceptAnalysis {
  fit_assessment: FitAssessment
  strong_aspects: string[]
  sections_needing_elaboration: SectionNeedingElaboration[]
  strategic_verdict: string
}

// Structure Workplan Analysis Types
export interface ProposalSection {
  section_title: string
  recommended_word_count: string
  purpose: string
  content_guidance: string
  guiding_questions: string[]
}

export interface StructureWorkplanAnalysis {
  narrative_overview?: string
  proposal_mandatory?: ProposalSection[]
  proposal_outline?: ProposalSection[]
  hcd_notes?: { note: string }[]
  sections?: Array<{
    id: string
    title: string
    description?: string
    guidance?: string
    questions?: string[]
  }>
  workplan?: {
    phases?: Array<{
      phase: string
      tasks: string[]
      timeline?: string
    }>
  }
  [key: string]: unknown // Allow for additional dynamic properties
}

// Draft Feedback Analysis Types
export interface DraftFeedbackAnalysis {
  overall_assessment?: {
    overall_tag?: string
    overall_summary?: string
    key_strengths?: string[]
    key_issues?: string[]
    global_suggestions?: string[]
  }
  section_feedback?: Array<{
    section_title: string
    tag: string // 'Excellent' | 'Good' | 'Needs improvement'
    ai_feedback: string
    suggestions: string[]
  }>
  summary_stats?: {
    excellent_count: number
    good_count: number
    needs_improvement_count: number
  }
}

// Reference Proposals Analysis Types
export interface ReferenceProposalsAnalysis {
  common_patterns?: Record<string, unknown>
  donor_preferences?: Record<string, unknown>
  winning_strategies?: string[]
  [key: string]: unknown // Allow for additional dynamic properties
}

// Concept Document Types
export interface ConceptDocument {
  sections?: Array<{
    title: string
    content: string
  }>
  // Add other properties that might be present
  generated_concept_document?: string
  content?: string
  document?: string
  [key: string]: unknown // Allow for additional dynamic properties
}

// Proposal Template Types
export interface ProposalTemplate {
  sections?: Array<{
    id: string
    title: string
    content?: string
  }>
  [key: string]: unknown // Allow for additional dynamic properties
}
