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
  tone_professional: number // Legacy
  tone_technical: number // Legacy
  tone_preset: string // New semantic preset
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
  tone_professional: number // Legacy - kept for backward compatibility
  tone_technical: number // Legacy - kept for backward compatibility
  tone_preset?: string // New semantic preset
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

// Writing Tone Presets - Clear semantic options for user and AI
export const TONE_OPTIONS = [
  {
    value: 'expert_analysis',
    label: 'Expert Analysis',
    description: 'Formal, data-driven content with technical terminology. Best for researchers and specialists.',
    example: 'Our regression analysis indicates a statistically significant correlation (p<0.05)...',
    aiInstruction: 'Write in formal academic/research tone. Use domain-specific terminology, cite methodologies, present data-driven conclusions. Assume expert readership.',
  },
  {
    value: 'industry_insight',
    label: 'Industry Insight',
    description: 'Professional business tone balancing accuracy with clarity. Best for decision-makers.',
    example: 'Three key trends are reshaping the agricultural landscape this quarter...',
    aiInstruction: 'Write in professional business tone. Balance technical accuracy with clarity. Use industry terms but explain implications. Think Harvard Business Review style.',
  },
  {
    value: 'friendly_summary',
    label: 'Friendly Summary',
    description: 'Conversational and accessible language with simplified concepts. Best for general audiences.',
    example: 'Think of climate-smart agriculture as farming that works with nature, not against it...',
    aiInstruction: 'Write conversationally as if explaining to a curious colleague. Simplify complex ideas, use analogies, maintain enthusiasm without sacrificing accuracy.',
  },
] as const

// Content Length Options - With concrete expectations
export const LENGTH_OPTIONS = [
  {
    value: 'quick_read',
    label: 'Quick Read',
    description: '2-3 min read • 400-600 words',
    detail: 'Perfect for daily digests and morning briefings. 3-4 focused paragraphs with key points.',
    wordRange: [400, 600],
    readingTime: '2-3 min',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: '5-7 min read • 1,000-1,500 words',
    detail: 'Ideal for weekly insights and trend analysis. Multiple sections with subheadings.',
    wordRange: [1000, 1500],
    readingTime: '5-7 min',
  },
  {
    value: 'deep_dive',
    label: 'Deep Dive',
    description: '10-15 min read • 2,500-3,500 words',
    detail: 'Comprehensive guides and monthly reports. Long-form with sections, data, and examples.',
    wordRange: [2500, 3500],
    readingTime: '10-15 min',
  },
] as const

// Publishing Frequency Options - With content strategy context
export const FREQUENCY_OPTIONS = [
  {
    value: 'daily',
    label: 'Daily Pulse',
    description: 'Quick updates and breaking developments',
    detail: 'Focus on immediacy: what changed today, actionable tips, trending topics.',
    contentFocus: 'Breaking updates, quick wins, tips',
    recommendedLength: 'quick_read',
    recommendedTone: 'friendly_summary',
  },
  {
    value: 'weekly',
    label: 'Weekly Digest',
    description: 'Curated highlights and emerging trends',
    detail: 'Synthesize the week\'s key developments into themes, identify patterns.',
    contentFocus: 'Trend analysis, curated highlights',
    recommendedLength: 'standard',
    recommendedTone: 'industry_insight',
  },
  {
    value: 'monthly',
    label: 'Monthly Review',
    description: 'Comprehensive analysis and strategic insights',
    detail: 'Analyze long-term patterns, include data analysis, strategic recommendations.',
    contentFocus: 'Comprehensive analysis, strategy',
    recommendedLength: 'deep_dive',
    recommendedTone: 'industry_insight',
  },
  {
    value: 'quarterly',
    label: 'Quarterly Report',
    description: 'Big picture trends and forecasts',
    detail: 'Evaluate major trends, compare periods, forecast future developments.',
    contentFocus: 'Long-term trends, forecasts',
    recommendedLength: 'deep_dive',
    recommendedTone: 'expert_analysis',
  },
] as const

// Default values
export const DEFAULT_NEWSLETTER_CONFIG: NewsletterConfig = {
  target_audience: [],
  tone_professional: 50, // Legacy - kept for backward compatibility
  tone_technical: 50, // Legacy - kept for backward compatibility
  tone_preset: 'industry_insight', // New semantic preset
  format_type: 'email',
  length_preference: 'standard',
  frequency: 'weekly',
  geographic_focus: '',
}
