import { useState, useEffect } from 'react'
import { X, Wand2, FileText, Settings, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { ProposalSection, SECTION_LABELS } from '../../../types/prompt'
import styles from './CreatePromptModal.module.css'

interface CreatePromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => Promise<void>
  isLoading?: boolean
  mode?: 'create' | 'edit'
  initialData?: any
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
}

export function CreatePromptModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  mode = 'create',
  initialData = null,
  contextData = {},
}: CreatePromptModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    section: ProposalSection.EXECUTIVE_SUMMARY,
    route: '',
    system_prompt: '',
    user_prompt_template: '',
    tags: [] as string[],
  })

  // Load initial data when editing or from context
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name || '',
        section: initialData.section || ProposalSection.EXECUTIVE_SUMMARY,
        route: initialData.route || '',
        system_prompt: initialData.system_prompt || '',
        user_prompt_template: initialData.user_prompt_template || '',
        tags: initialData.tags || [],
      })
    } else if (mode === 'create') {
      // Reset form for create mode, but use context data if available
      setFormData({
        name: '',
        section: contextData.defaultSection || ProposalSection.EXECUTIVE_SUMMARY,
        route: contextData.fromRoute || '',
        system_prompt: '',
        user_prompt_template: '',
        tags: [],
      })
    }
  }, [mode, initialData, contextData, isOpen])

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
        section: ProposalSection.EXECUTIVE_SUMMARY,
        route: '',
        system_prompt: '',
        user_prompt_template: '',
        tags: [],
      })
      setCurrentStep(1)
    } catch (error) {
      // Error handling is done in parent component
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
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
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
                  {Object.entries(SECTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
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
            </div>
          )}

          {currentStep === 2 && (
            <div className={styles.stepContent}>
              <div className={styles.stepHeader}>
                <Settings size={20} className={styles.stepIcon} />
                <h3>Configure the AI behavior</h3>
                <p>Define how the AI should behave and what template it should follow.</p>
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
