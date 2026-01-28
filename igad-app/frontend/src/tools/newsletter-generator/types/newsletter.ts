/**
 * Newsletter Types
 */

// Schedule Rule for publishing
export interface ScheduleRule {
  intervalType: 'days' | 'weeks' | 'months'
  intervalAmount: number
  weekdays?: number[] // [0-6] where 0=Sunday
  dayOfMonth?: number // 1-31 (for monthly)
  hour: number // 0-23 (24-hour for storage)
  minute: number // 0, 15, 30, 45
}

export interface PublishingSchedule {
  conceptualFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom'
  scheduleRules: ScheduleRule[]
}

// Preset schedule configurations
export const SCHEDULE_PRESETS: Record<string, ScheduleRule> = {
  daily: {
    intervalType: 'days',
    intervalAmount: 1,
    weekdays: [1, 2, 3, 4, 5], // Mon-Fri
    hour: 9,
    minute: 0,
  },
  weekly: {
    intervalType: 'weeks',
    intervalAmount: 1,
    weekdays: [1], // Monday
    hour: 9,
    minute: 0,
  },
  monthly: {
    intervalType: 'months',
    intervalAmount: 1,
    dayOfMonth: 1, // 1st of month
    hour: 9,
    minute: 0,
  },
  quarterly: {
    intervalType: 'months',
    intervalAmount: 3,
    dayOfMonth: 1, // 1st of month
    hour: 9,
    minute: 0,
  },
}

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
  schedule?: PublishingSchedule // New publishing schedule
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
  schedule?: PublishingSchedule // Publishing schedule configuration
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
    description:
      'Formal, data-driven content with technical terminology. Best for researchers and specialists.',
    example:
      'Our regression analysis indicates a statistically significant correlation (p<0.05)...',
    aiInstruction:
      'Write in formal academic/research tone. Use domain-specific terminology, cite methodologies, present data-driven conclusions. Assume expert readership.',
  },
  {
    value: 'industry_insight',
    label: 'Industry Insight',
    description:
      'Professional business tone balancing accuracy with clarity. Best for decision-makers.',
    example: 'Three key trends are reshaping the agricultural landscape this quarter...',
    aiInstruction:
      'Write in professional business tone. Balance technical accuracy with clarity. Use industry terms but explain implications. Think Harvard Business Review style.',
  },
  {
    value: 'friendly_summary',
    label: 'Friendly Summary',
    description:
      'Conversational and accessible language with simplified concepts. Best for general audiences.',
    example:
      'Think of climate-smart agriculture as farming that works with nature, not against it...',
    aiInstruction:
      'Write conversationally as if explaining to a curious colleague. Simplify complex ideas, use analogies, maintain enthusiasm without sacrificing accuracy.',
  },
] as const

// Content Length Options - With concrete expectations
export const LENGTH_OPTIONS = [
  {
    value: 'quick_read',
    label: 'Quick Read',
    description: '2-3 min read • 400-600 words',
    detail:
      'Perfect for daily digests and morning briefings. 3-4 focused paragraphs with key points.',
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
    detail:
      'Comprehensive guides and monthly reports. Long-form with sections, data, and examples.',
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
    detail: "Synthesize the week's key developments into themes, identify patterns.",
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
  schedule: {
    conceptualFrequency: 'weekly',
    scheduleRules: [SCHEDULE_PRESETS.weekly],
  },
  geographic_focus: '',
}

// ==================== STEP 2: CONTENT PLANNING ====================

// Information Type Categories
export type InformationCategory = 'news' | 'insights' | 'opportunities' | 'resources'

// Information Type definition
export interface InformationType {
  id: string
  name: string
  category: InformationCategory
  description: string
  audienceRelevance: Record<string, number> // 0-1 relevance score per audience
}

// All available information types for newsletter content
export const INFORMATION_TYPES: InformationType[] = [
  // NEWS (Blue badges)
  {
    id: 'breaking_news',
    name: 'Breaking News & Updates',
    category: 'news',
    description: 'Recent news and updates from IGAD region',
    audienceRelevance: {
      myself: 0.5,
      researchers: 0.6,
      policy_makers: 0.9,
      development_partners: 0.8,
      ag_tech_industry: 0.7,
      field_staff: 0.5,
      farmers: 0.4,
    },
  },
  {
    id: 'policy_updates',
    name: 'Policy Updates',
    category: 'news',
    description: 'Policy changes and regulations',
    audienceRelevance: {
      myself: 0.5,
      researchers: 0.7,
      policy_makers: 1.0,
      development_partners: 0.9,
      ag_tech_industry: 0.6,
      field_staff: 0.4,
      farmers: 0.3,
    },
  },
  {
    id: 'food_security',
    name: 'Food Security Updates',
    category: 'news',
    description: 'Food security and nutrition information',
    audienceRelevance: {
      myself: 0.6,
      researchers: 0.8,
      policy_makers: 0.9,
      development_partners: 0.9,
      ag_tech_industry: 0.5,
      field_staff: 0.7,
      farmers: 0.8,
    },
  },

  // INSIGHTS (Purple badges)
  {
    id: 'research_findings',
    name: 'Research Findings',
    category: 'insights',
    description: 'Scientific research results and studies',
    audienceRelevance: {
      myself: 0.6,
      researchers: 1.0,
      policy_makers: 0.7,
      development_partners: 0.6,
      ag_tech_industry: 0.8,
      field_staff: 0.3,
      farmers: 0.2,
    },
  },
  {
    id: 'technology_innovation',
    name: 'Technology & Innovation Spotlight',
    category: 'insights',
    description: 'Agricultural technology and digital farming',
    audienceRelevance: {
      myself: 0.6,
      researchers: 0.8,
      policy_makers: 0.5,
      development_partners: 0.6,
      ag_tech_industry: 1.0,
      field_staff: 0.6,
      farmers: 0.7,
    },
  },
  {
    id: 'climate_smart',
    name: 'Climate-Smart Agriculture',
    category: 'insights',
    description: 'Climate adaptation and sustainable practices',
    audienceRelevance: {
      myself: 0.7,
      researchers: 0.9,
      policy_makers: 0.8,
      development_partners: 0.8,
      ag_tech_industry: 0.7,
      field_staff: 0.8,
      farmers: 0.9,
    },
  },
  {
    id: 'market_access',
    name: 'Market Access & Trade',
    category: 'insights',
    description: 'Trade and market information',
    audienceRelevance: {
      myself: 0.5,
      researchers: 0.5,
      policy_makers: 0.8,
      development_partners: 0.7,
      ag_tech_industry: 0.9,
      field_staff: 0.6,
      farmers: 0.8,
    },
  },
  {
    id: 'project_updates',
    name: 'Project Updates & Success Stories',
    category: 'insights',
    description: 'Project progress and impact stories',
    audienceRelevance: {
      myself: 0.5,
      researchers: 0.5,
      policy_makers: 0.6,
      development_partners: 1.0,
      ag_tech_industry: 0.5,
      field_staff: 0.7,
      farmers: 0.6,
    },
  },
  {
    id: 'livestock',
    name: 'Livestock & Animal Health',
    category: 'insights',
    description: 'Livestock and veterinary information',
    audienceRelevance: {
      myself: 0.5,
      researchers: 0.7,
      policy_makers: 0.5,
      development_partners: 0.5,
      ag_tech_industry: 0.4,
      field_staff: 0.9,
      farmers: 1.0,
    },
  },

  // OPPORTUNITIES (Yellow badges)
  {
    id: 'funding',
    name: 'Funding Opportunities',
    category: 'opportunities',
    description: 'Grants and funding for projects',
    audienceRelevance: {
      myself: 0.6,
      researchers: 0.9,
      policy_makers: 0.5,
      development_partners: 1.0,
      ag_tech_industry: 0.7,
      field_staff: 0.4,
      farmers: 0.3,
    },
  },
  {
    id: 'events',
    name: 'Events & Conferences',
    category: 'opportunities',
    description: 'Workshops, conferences, and meetings',
    audienceRelevance: {
      myself: 0.5,
      researchers: 0.8,
      policy_makers: 0.7,
      development_partners: 0.8,
      ag_tech_industry: 0.6,
      field_staff: 0.5,
      farmers: 0.3,
    },
  },

  // RESOURCES (Green badges)
  {
    id: 'publications',
    name: 'Publications & Resources',
    category: 'resources',
    description: 'Reports, documents, and guides',
    audienceRelevance: {
      myself: 0.5,
      researchers: 1.0,
      policy_makers: 0.8,
      development_partners: 0.7,
      ag_tech_industry: 0.5,
      field_staff: 0.4,
      farmers: 0.2,
    },
  },
]

// Category display configuration
export const CATEGORY_CONFIG: Record<
  InformationCategory,
  { label: string; color: string; bgColor: string }
> = {
  news: { label: 'News', color: '#3b82f6', bgColor: '#dbeafe' },
  insights: { label: 'Insights', color: '#8b5cf6', bgColor: '#ede9fe' },
  opportunities: { label: 'Opportunities', color: '#f59e0b', bgColor: '#fef3c7' },
  resources: { label: 'Resources', color: '#10b981', bgColor: '#d1fae5' },
}

// Retrieved content chunk
export interface RetrievedChunk {
  chunk_id: string
  topic_id: string
  content: string
  score: number
  source_url?: string
  source_metadata?: Record<string, unknown>
}

// Retrieval configuration (captured at retrieval time)
export interface RetrievalConfig {
  tone_preset: string
  frequency: string
  length_preference: string
  target_audience: string[]
  geographic_focus: string
  max_chunks: number
  days_back: number
}

// Topics data (Step 2 state)
export interface TopicsData {
  selected_types: string[]
  retrieval_status: 'pending' | 'processing' | 'completed' | 'failed'
  retrieval_config?: RetrievalConfig
  retrieved_content: RetrievedChunk[]
  total_chunks_retrieved: number
  retrieval_started_at?: string
  retrieval_completed_at?: string
  retrieval_error?: string
}

// Relevance level for display
export type RelevanceLevel = 'high' | 'medium' | 'low'

// Helper function to calculate relevance level
export function getRelevanceLevel(
  topic: InformationType,
  targetAudiences: string[]
): RelevanceLevel {
  if (targetAudiences.length === 0) {
    return 'medium'
  }

  const avgRelevance =
    targetAudiences.reduce((sum, aud) => sum + (topic.audienceRelevance[aud] || 0), 0) /
    targetAudiences.length

  if (avgRelevance >= 0.8) {
    return 'high'
  }
  if (avgRelevance >= 0.5) {
    return 'medium'
  }
  return 'low'
}

// Helper function to get recommended topics for audience
export function getRecommendedTopics(targetAudiences: string[], limit = 5): string[] {
  if (targetAudiences.length === 0) {
    return []
  }

  const recommendations: { id: string; score: number }[] = []

  INFORMATION_TYPES.forEach(topic => {
    const avgRelevance =
      targetAudiences.reduce((sum, aud) => sum + (topic.audienceRelevance[aud] || 0), 0) /
      targetAudiences.length

    if (avgRelevance >= 0.8) {
      recommendations.push({ id: topic.id, score: avgRelevance })
    }
  })

  // Sort by score descending and return top N
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.id)
}

// ==================== STEP 3: OUTLINE REVIEW ====================

// Outline item (single content item in a section)
export interface OutlineItem {
  id: string
  section_id: string
  title: string
  description: string
  content_sources: string[] // chunk_ids from Step 2 retrieved_content
  order: number
  is_custom: boolean
  is_editable: boolean
  user_notes?: string
}

// Outline section (group of items)
export interface OutlineSection {
  id: string
  name: string
  order: number
  items: OutlineItem[]
}

// Generation config snapshot
export interface OutlineGenerationConfig {
  tone_preset: string
  length_preference: string
  target_audience: string[]
}

// User modification tracking
export interface OutlineUserModifications {
  items_added: number
  items_removed: number
  items_edited: number
}

// Full outline data (Step 3 state)
export interface OutlineData {
  sections: OutlineSection[]
  outline_status: 'pending' | 'processing' | 'completed' | 'failed'
  outline_error?: string
  generated_at?: string
  generation_config?: OutlineGenerationConfig
  user_modifications: OutlineUserModifications
  updated_at?: string
}

// Default sections for newsletter outline
export const DEFAULT_OUTLINE_SECTIONS: Omit<OutlineSection, 'items'>[] = [
  { id: 'section-intro', name: 'Introduction', order: 1 },
  { id: 'section-main', name: 'Main Content', order: 2 },
  { id: 'section-updates', name: 'Updates & News', order: 3 },
  { id: 'section-opportunities', name: 'Opportunities', order: 4 },
  { id: 'section-resources', name: 'Resources', order: 5 },
  { id: 'section-conclusion', name: 'Conclusion', order: 6 },
]

// Item counts by length preference
export const OUTLINE_ITEM_COUNTS: Record<string, Record<string, number>> = {
  quick_read: {
    'section-intro': 1,
    'section-main': 2,
    'section-updates': 1,
    'section-conclusion': 1,
  },
  standard: {
    'section-intro': 1,
    'section-main': 4,
    'section-updates': 2,
    'section-conclusion': 1,
  },
  deep_dive: {
    'section-intro': 1,
    'section-main': 6,
    'section-updates': 3,
    'section-conclusion': 1,
  },
}
