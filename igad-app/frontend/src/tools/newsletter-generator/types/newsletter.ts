/**
 * Newsletter Types
 */

export interface Newsletter {
  id: string
  newsletterCode: string
  title: string
  status: NewsletterStatus
  user_id: string

  // Step 1 fields
  target_audience: string[]
  tone_professional: number
  tone_technical: number
  format_type: string
  length_preference: string
  frequency: string
  geographic_focus: string
  example_files?: string[]

  current_step: number
  created_at: string
  updated_at: string
}

export type NewsletterStatus = 'draft' | 'processing' | 'completed' | 'exported'

export interface NewsletterConfig {
  target_audience: string[]
  tone_professional: number
  tone_technical: number
  format_type: string
  length_preference: string
  frequency: string
  geographic_focus: string
}

// Step 1 Options
export const AUDIENCE_OPTIONS = [
  { id: 'myself', label: 'Myself' },
  { id: 'researchers', label: 'Researchers' },
  { id: 'development_partners', label: 'Development partners' },
  { id: 'policy_makers', label: 'Policy makers' },
  { id: 'ag_tech_industry', label: 'Ag-tech industry' },
  { id: 'field_staff', label: 'Field staff' },
  { id: 'farmers', label: 'Farmers' },
] as const

export const FORMAT_OPTIONS = [
  { value: 'email', label: 'Email Newsletter' },
  { value: 'pdf', label: 'PDF Document' },
  { value: 'web', label: 'Web Article' },
  { value: 'html', label: 'HTML Email' },
] as const

export const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'long', label: 'Long' },
] as const

export const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
] as const

// Default values
export const DEFAULT_NEWSLETTER_CONFIG: NewsletterConfig = {
  target_audience: [],
  tone_professional: 50,
  tone_technical: 50,
  format_type: 'email',
  length_preference: 'mixed',
  frequency: 'weekly',
  geographic_focus: '',
}
