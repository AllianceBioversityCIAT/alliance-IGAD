import { useState, useEffect } from 'react'
import { X, Wand2, FileText, Settings, ArrowRight, ArrowLeft, Check, Tag, History, Lightbulb } from 'lucide-react'
import { ProposalSection, SECTION_LABELS } from '@/types/prompt'
import styles from './CreatePromptModal.module.css'

interface CreatePromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  isLoading?: boolean
  mode?: 'create' | 'edit'
  initialData?: any
  onHistory?: () => void
  contextData?: {
    fromRoute?: string
    defaultSection?: ProposalSection
  }
}

const STEP_TITLES = {
  1: 'Basic Information',
  2: 'AI Configuration',
  3: 'Review & Create',
}

const SECTION_DESCRIPTIONS = {
  [ProposalSection.PROPOSAL_WRITER]: 'AI-powered proposal writing assistant for comprehensive project proposals',
  [ProposalSection.NEWSLETTER_GENERATOR]: 'Generate engaging newsletters and communication materials',
  [ProposalSection.EXECUTIVE_SUMMARY]:
    'Create compelling executive summaries that capture key project highlights',
  [ProposalSection.PROJECT_DESCRIPTION]:
    'Generate detailed project descriptions with clear objectives and scope',
  [ProposalSection.METHODOLOGY]:
    'Develop comprehensive methodologies and implementation approaches',
  [ProposalSection.BUDGET]: 'Structure budget breakdowns and financial planning sections',
  [ProposalSection.TIMELINE]: 'Create project timelines with milestones and deliverables',
  [ProposalSection.TEAM]: 'Generate team descriptions and role assignments',
  [ProposalSection.IMPACT]: 'Articulate project impact and expected outcomes',
  [ProposalSection.SUSTAINABILITY]: 'Develop sustainability plans and long-term strategies',
  [ProposalSection.PROBLEM_STATEMENT]: 'Define and articulate the core problem being addressed',
  [ProposalSection.OBJECTIVES]: 'Establish clear, measurable project objectives',
  [ProposalSection.THEORY_OF_CHANGE]: 'Develop logical frameworks and theory of change models',
  [ProposalSection.LITERATURE_REVIEW]: 'Conduct comprehensive literature reviews and research analysis',
  [ProposalSection.RISK_ASSESSMENT]: 'Identify and analyze potential project risks and mitigation strategies',
  [ProposalSection.MONITORING_EVALUATION]: 'Design monitoring and evaluation frameworks',
  [ProposalSection.APPENDICES]: 'Generate supporting documentation and appendices',
}

export function CreatePromptModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  mode = 'create',
  initialData = null,
  onHistory,
  contextData = {},
}: CreatePromptModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [tagInput, setTagInput] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    section: ProposalSection.PROPOSAL_WRITER,
    route: '',
    system_prompt: '',
    user_prompt_template: '',
    tags: [] as string[],
    tone: '',
    output_format: '',
  })

  // Load initial data when editing or from context
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name || '',
        section: initialData.section || ProposalSection.PROPOSAL_WRITER,
        route: initialData.route || '',
        system_prompt: initialData.system_prompt || '',
        user_prompt_template: initialData.user_prompt_template || '',
        tags: initialData.tags || [],
        tone: initialData.tone || '',
        output_format: initialData.output_format || '',
      })
    } else if (mode === 'create') {
      // Reset form for create mode, but use context data if available
      setFormData({
        name: '',
        section: contextData.defaultSection || ProposalSection.PROPOSAL_WRITER,
        route: contextData.fromRoute || '',
        system_prompt: '',
        user_prompt_template: '',
        tags: [],
        tone: '',
        output_format: '',
      })
    }
  }, [mode, initialData, contextData.defaultSection, contextData.fromRoute, isOpen])

  if (!isOpen) {
    return null
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      await onSave(formData)
      // Reset form
      setFormData({
        name: '',
        section: ProposalSection.PROPOSAL_WRITER,
        route: '',
        system_prompt: '',
        user_prompt_template: '',
        tags: [],
        tone: '',
        output_format: '',
      })
      setTagInput('')
      setCurrentStep(1)
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
      setTagInput('')
    }
  }

  const handleLoadExample = () => {
    setFormData(prev => ({
      ...prev,
      system_prompt: 'You are an expert proposal writer specializing in development projects. You create clear, compelling, and professional content that follows international standards and best practices. Your writing is concise, well-structured, and tailored to the specific requirements of each section.',
      user_prompt_template: 'Create a comprehensive {{section_type}} for a {{project_type}} project in {{region}} with a budget of {{budget}}. The project focuses on {{focus_area}} and targets {{target_population}}.\n\nKey requirements:\n- Duration: {{duration}}\n- Main objectives: {{objectives}}\n- Expected outcomes: {{outcomes}}\n\nPlease ensure the content is professional, evidence-based, and follows international development standards.',
      tone: 'Professional, authoritative, and engaging',
      output_format: 'Well-structured document with clear headings, bullet points where appropriate, and logical flow. Include specific examples and quantifiable metrics when possible.'
    }))
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
  }

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() && formData.route.trim()
      case 2:
        return formData.system_prompt.trim() && formData.user_prompt_template.trim()
      case 3:
        return true
      default:
        return false
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <Wand2 size={24} />
            </div>
            <div>
              <h2 className={styles.title}>
                {mode === 'create' ? 'Create New AI Prompt' : 'Edit AI Prompt'}
              </h2>
              <p className={styles.subtitle}>
                Step {currentStep} of 3: {STEP_TITLES[currentStep as keyof typeof STEP_TITLES]}
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            {onHistory && mode === 'edit' && (
              <button onClick={onHistory} className={styles.historyButton} title="View change history">
                <History size={18} />
              </button>
            )}
            <button onClick={onClose} className={styles.closeButton}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${(currentStep / 3) * 100}%` }} />
          </div>
          <div className={styles.progressSteps}>
            {[1, 2, 3].map(step => (
              <div
                key={step}
                className={`${styles.progressStep} ${
                  step <= currentStep ? styles.progressStepActive : ''
                }`}
              >
                {step < currentStep ? <Check size={12} /> : step}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <FileText size={20} className={styles.stepIcon} />
                <h3>Configure your prompt</h3>
                <p>Give your AI prompt a clear name and specify where it will be used.</p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Prompt Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={styles.input}
                  placeholder="e.g., Executive Summary Generator"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Section Type *</label>
                <select
                  value={formData.section}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, section: e.target.value as ProposalSection }))
                  }
                  className={styles.select}
                >
                  <option value={ProposalSection.PROPOSAL_WRITER}>
                    {SECTION_LABELS[ProposalSection.PROPOSAL_WRITER]}
                  </option>
                  <option value={ProposalSection.NEWSLETTER_GENERATOR}>
                    {SECTION_LABELS[ProposalSection.NEWSLETTER_GENERATOR]}
                  </option>
                </select>
                {SECTION_DESCRIPTIONS[formData.section] && (
                  <p className={styles.sectionDescription}>
                    {SECTION_DESCRIPTIONS[formData.section]}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Route *</label>
                <input
                  type="text"
                  value={formData.route}
                  onChange={e => setFormData(prev => ({ ...prev, route: e.target.value }))}
                  className={styles.input}
                  placeholder="e.g., /proposals/executive-summary"
                />
                <p className={styles.helpText}>
                  The URL route where this prompt will be available in the application.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tags</label>
                <div className={styles.tagInputContainer}>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyPress={handleTagKeyPress}
                    className={styles.input}
                    placeholder="Add tags (press Enter to add)"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className={styles.addTagButton}
                    disabled={!tagInput.trim()}
                  >
                    <Tag size={16} />
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className={styles.tagsContainer}>
                    {formData.tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className={styles.removeTagButton}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className={styles.helpText}>
                  Add tags to help categorize and search for this prompt.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <Settings size={20} className={styles.stepIcon} />
                <h3>Configure the AI behavior</h3>
                <p>Define how the AI should behave and what template it should follow.</p>
              </div>

              <div className={styles.exampleSection}>
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className={styles.exampleButton}
                >
                  <Lightbulb size={16} />
                  Load Example Template
                </button>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>AI Role & Behavior *</label>
                <textarea
                  value={formData.system_prompt}
                  onChange={e => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                  className={styles.textarea}
                  rows={4}
                  placeholder="You are an expert proposal writer specializing in development projects. You create clear, compelling, and professional content..."
                />
                <p className={styles.helpText}>
                  Define the AI's role, expertise, and how it should approach the task.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Content Template *</label>
                <textarea
                  value={formData.user_prompt_template}
                  onChange={e =>
                    setFormData(prev => ({ ...prev, user_prompt_template: e.target.value }))
                  }
                  className={styles.textarea}
                  rows={6}
                  placeholder="Create a comprehensive executive summary for a {{project_type}} project in {{region}} with a budget of {{budget}}..."
                />
                <p className={styles.helpText}>
                  Use <code>{'{{variable_name}}'}</code> for dynamic content that users will
                  provide.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Tone</label>
                <input
                  type="text"
                  value={formData.tone}
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    tone: e.target.value
                  }))}
                  className={styles.input}
                  placeholder="Professional and informative"
                  maxLength={500}
                />
                <p className={styles.helpText}>
                  Define the tone and style for the AI's responses (optional).
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Output Format</label>
                <textarea
                  value={formData.output_format}
                  onChange={e => setFormData(prev => ({ 
                    ...prev, 
                    output_format: e.target.value
                  }))}
                  className={styles.textarea}
                  rows={3}
                  placeholder="Specify the desired format for the AI's output (optional)..."
                />
                <p className={styles.helpText}>
                  Specify the desired format for the AI's output (optional).
                </p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <Check size={20} className={styles.stepIcon} />
                <h3>Review your prompt</h3>
                <p>Make sure everything looks good before creating your AI prompt.</p>
              </div>

              <div className={styles.reviewCard}>
                <h4>Prompt Details</h4>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Name:</span>
                  <span>{formData.name}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Section:</span>
                  <span>{SECTION_LABELS[formData.section]}</span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Route:</span>
                  <span>{formData.route}</span>
                </div>
                {formData.tags.length > 0 && (
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Tags:</span>
                    <div className={styles.reviewTags}>
                      {formData.tags.map((tag, index) => (
                        <span key={index} className={styles.reviewTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.reviewCard}>
                <h4>AI Configuration</h4>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Role:</span>
                  <span className={styles.reviewPreview}>
                    {formData.system_prompt.substring(0, 100)}...
                  </span>
                </div>
                <div className={styles.reviewItem}>
                  <span className={styles.reviewLabel}>Template:</span>
                  <span className={styles.reviewPreview}>
                    {formData.user_prompt_template.substring(0, 100)}...
                  </span>
                </div>
                {formData.tone && (
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Tone:</span>
                    <span>{formData.tone}</span>
                  </div>
                )}
                {formData.output_format && (
                  <div className={styles.reviewItem}>
                    <span className={styles.reviewLabel}>Output Format:</span>
                    <span>{formData.output_format}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerActions}>
            {currentStep > 1 && (
              <button onClick={handlePrevious} className={styles.secondaryButton}>
                <ArrowLeft size={16} />
                Previous
              </button>
            )}

            <div className={styles.spacer} />

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className={styles.primaryButton}
                disabled={!isStepValid()}
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className={styles.primaryButton}
                disabled={isLoading || !isStepValid()}
              >
                {isLoading
                  ? mode === 'create'
                    ? 'Creating...'
                    : 'Updating...'
                  : mode === 'create'
                    ? 'Create Prompt'
                    : 'Update Prompt'}
                <Wand2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
