export enum ProposalSection {
  PROPOSAL_WRITER = 'proposal_writer',
  NEWSLETTER_GENERATOR = 'newsletter_generator'
}

export const SECTION_LABELS: Record<ProposalSection, string> = {
  [ProposalSection.PROPOSAL_WRITER]: 'Proposal Writer',
  [ProposalSection.NEWSLETTER_GENERATOR]: 'Newsletter Generator'
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
