export enum ProposalSection {
  // Main sections
  PROPOSAL_WRITER = 'proposal_writer',
  NEWSLETTER_GENERATOR = 'newsletter_generator',
  // Legacy sections for backward compatibility
  PROBLEM_STATEMENT = 'problem_statement',
  PROJECT_DESCRIPTION = 'project_description',
  OBJECTIVES = 'objectives',
  METHODOLOGY = 'methodology',
  BUDGET = 'budget',
  TEAM = 'team',
  IMPACT = 'impact',
  THEORY_OF_CHANGE = 'theory_of_change',
  LITERATURE_REVIEW = 'literature_review',
  TIMELINE = 'timeline',
  RISK_ASSESSMENT = 'risk_assessment',
  SUSTAINABILITY = 'sustainability',
  MONITORING_EVALUATION = 'monitoring_evaluation',
  EXECUTIVE_SUMMARY = 'executive_summary',
  APPENDICES = 'appendices',
}

export const SECTION_LABELS: Record<ProposalSection, string> = {
  // Main sections
  [ProposalSection.PROPOSAL_WRITER]: 'Proposal Writer',
  [ProposalSection.NEWSLETTER_GENERATOR]: 'Newsletter Generator',
  // Legacy sections
  [ProposalSection.PROBLEM_STATEMENT]: 'Problem Statement',
  [ProposalSection.PROJECT_DESCRIPTION]: 'Project Description',
  [ProposalSection.OBJECTIVES]: 'Objectives',
  [ProposalSection.METHODOLOGY]: 'Methodology',
  [ProposalSection.BUDGET]: 'Budget',
  [ProposalSection.TEAM]: 'Team',
  [ProposalSection.IMPACT]: 'Impact',
  [ProposalSection.THEORY_OF_CHANGE]: 'Theory of Change',
  [ProposalSection.LITERATURE_REVIEW]: 'Literature Review',
  [ProposalSection.TIMELINE]: 'Timeline',
  [ProposalSection.RISK_ASSESSMENT]: 'Risk Assessment',
  [ProposalSection.SUSTAINABILITY]: 'Sustainability',
  [ProposalSection.MONITORING_EVALUATION]: 'Monitoring & Evaluation',
  [ProposalSection.EXECUTIVE_SUMMARY]: 'Executive Summary',
  [ProposalSection.APPENDICES]: 'Appendices',
}

// Predefined categories for prompt usage
export const PROMPT_CATEGORIES = [
  'RFP / Call for Proposals',
  'Reference Proposals',
  'Existing Work & Experience',
  'Initial Concept',
  'Direction',
  'Technical Approach',
  'Budget Planning',
  'Risk Management',
  'Impact Assessment',
  'Stakeholder Analysis',
  'Literature Review',
  'Methodology Design',
  'Timeline Planning',
  'Sustainability Planning',
  'Monitoring & Evaluation',
] as const

export type PromptCategory = (typeof PROMPT_CATEGORIES)[number]

export interface PromptContext {
  persona?: string
  sources?: string[]
  constraints?: string
  guardrails?: string
}

export interface FewShotExample {
  input: string
  output: string
}

export interface Prompt {
  id: string
  name: string
  section: ProposalSection
  sub_section?: string // e.g., "step-1", "step-2"
  route?: string // e.g., "/proposal-writer/step-1"
  categories: string[] // e.g., ["RFP / Call for Proposals", "Reference Proposals"]
  tags: string[]
  version: number
  is_active: boolean
  system_prompt: string
  user_prompt_template: string
  tone?: string
  output_format?: string
  few_shot?: FewShotExample[]
  context?: PromptContext
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  comments_count?: number // Number of comments on this prompt
}

export interface PromptListResponse {
  prompts: Prompt[]
  total: number
  has_more: boolean
}

export interface PromptPreviewRequest {
  system_prompt: string
  user_prompt_template: string
  variables?: Record<string, string>
  context?: PromptContext
}

export interface PromptPreviewResponse {
  output: string
  tokens_used: number
  processing_time: number
}

export interface CreatePromptRequest {
  name: string
  section: ProposalSection
  sub_section?: string
  route?: string
  categories?: string[]
  tags?: string[]
  system_prompt: string
  user_prompt_template: string
  tone?: string
  output_format?: string
  few_shot?: FewShotExample[]
  context?: PromptContext
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  version?: number
}
