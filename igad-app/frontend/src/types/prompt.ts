export enum ProposalSection {
  // Main sections
  PROPOSAL_WRITER = 'proposal_writer',
  NEWSLETTER_GENERATOR = 'newsletter_generator',
  // Legacy sections for backward compatibility
  PROBLEM_STATEMENT = 'problem_statement',
  OBJECTIVES = 'objectives',
  METHODOLOGY = 'methodology',
  BUDGET = 'budget',
  THEORY_OF_CHANGE = 'theory_of_change',
  LITERATURE_REVIEW = 'literature_review',
  TIMELINE = 'timeline',
  RISK_ASSESSMENT = 'risk_assessment',
  SUSTAINABILITY = 'sustainability',
  MONITORING_EVALUATION = 'monitoring_evaluation',
  EXECUTIVE_SUMMARY = 'executive_summary',
  APPENDICES = 'appendices'
}

export const SECTION_LABELS: Record<ProposalSection, string> = {
  // Main sections
  [ProposalSection.PROPOSAL_WRITER]: 'Proposal Writer',
  [ProposalSection.NEWSLETTER_GENERATOR]: 'Newsletter Generator',
  // Legacy sections
  [ProposalSection.PROBLEM_STATEMENT]: 'Problem Statement',
  [ProposalSection.OBJECTIVES]: 'Objectives',
  [ProposalSection.METHODOLOGY]: 'Methodology',
  [ProposalSection.BUDGET]: 'Budget',
  [ProposalSection.THEORY_OF_CHANGE]: 'Theory of Change',
  [ProposalSection.LITERATURE_REVIEW]: 'Literature Review',
  [ProposalSection.TIMELINE]: 'Timeline',
  [ProposalSection.RISK_ASSESSMENT]: 'Risk Assessment',
  [ProposalSection.SUSTAINABILITY]: 'Sustainability',
  [ProposalSection.MONITORING_EVALUATION]: 'Monitoring & Evaluation',
  [ProposalSection.EXECUTIVE_SUMMARY]: 'Executive Summary',
  [ProposalSection.APPENDICES]: 'Appendices'
}

export interface PromptContext {
  persona?: string
  tone?: string
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
  route?: string // e.g., "/proposal-writer/step-1"
  tags: string[]
  version: number
  status: 'draft' | 'published'
  system_prompt: string
  user_prompt_template: string
  few_shot?: FewShotExample[]
  context?: PromptContext
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
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
  route?: string
  tags?: string[]
  system_prompt: string
  user_prompt_template: string
  few_shot?: FewShotExample[]
  context?: PromptContext
}

export interface UpdatePromptRequest extends Partial<CreatePromptRequest> {
  version?: number
}
