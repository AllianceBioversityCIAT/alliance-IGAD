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
  priority_areas: Array<{
    priority: string
    alignment: string
    explanation: string
  }>
}

export interface SectionNeedingElaboration {
  section: string
  reason: string
  suggestions: string[]
}

export interface ConceptAnalysis {
  fit_assessment: FitAssessment
  strong_aspects: string[]
  sections_needing_elaboration: SectionNeedingElaboration[]
  strategic_verdict: string
}

// Structure Workplan Analysis Types
export interface StructureWorkplanAnalysis {
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
