import { useState, useEffect } from 'react'
import { X, Save, Eye, Loader2, Settings, FileText, HelpCircle, Layout, History, Clock, User } from 'lucide-react'
import { usePrompt } from '../../../hooks/usePrompts'
import { ProposalSection, SECTION_LABELS, type CreatePromptRequest, type UpdatePromptRequest } from '../../../types/prompt'
import styles from './PromptEditorDrawer.module.css'

// Simple History Component for Drawer
function HistoryContent({ promptId }: { promptId: string }) {
  const [history, setHistory] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [promptId])

  const fetchHistory = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/admin/prompts/${promptId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'create': return 'Created'
      case 'update': return 'Updated'
      case 'activate': return 'Activated'
      case 'deactivate': return 'Deactivated'
      default: return type
    }
  }

  if (isLoading) {
    return <div className={styles.historyLoading}>Loading history...</div>
  }

  if (!history || history.changes.length === 0) {
    return (
      <div className={styles.historyEmpty}>
        <p>No changes recorded yet</p>
      </div>
    )
  }

  return (
    <div className={styles.historyList}>
      {history.changes.slice(0, 5).map((change: any) => (
        <div key={change.id} className={styles.historyItem}>
          <div className={styles.historyItemHeader}>
            <span className={styles.historyChangeType}>
              {getChangeTypeLabel(change.change_type)}
            </span>
            <span className={styles.historyDate}>
              <Clock size={12} />
              {formatDate(change.created_at)}
            </span>
          </div>
          <div className={styles.historyAuthor}>
            <User size={12} />
            {change.author_name}
          </div>
          {change.comment && (
            <div className={styles.historyComment}>
              {change.comment}
            </div>
          )}
        </div>
      ))}
      {history.changes.length > 5 && (
        <div className={styles.historyMore}>
          +{history.changes.length - 5} more changes
        </div>
      )}
    </div>
  )
}

interface PromptEditorDrawerProps {
  mode: 'create' | 'edit'
  promptId?: string | null
  onClose: () => void
  onSave: (data: any) => void
  isLoading?: boolean
  contextData?: {
    fromRoute?: string
    defaultSection?: ProposalSection
  }
}

export function PromptEditorDrawer({ 
  mode, 
  promptId, 
  onClose, 
  onSave, 
  isLoading = false, 
  contextData 
}: PromptEditorDrawerProps) {
  const { data: existingPrompt } = usePrompt(promptId || '', 'latest')
  const [showPreview, setShowPreview] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Predefined templates
  const templates = {
    proposal_writer: [
      {
        name: 'Problem Statement Generator',
        system_prompt: 'You are an expert development proposal writer specializing in African regional projects. Focus on identifying clear, evidence-based problems that require intervention.',
        user_prompt_template: 'Generate a compelling problem statement for a {{project_type}} project in {{region}}. The problem should address {{key_challenge}} and demonstrate the need for {{intervention_type}}. Include relevant statistics and context specific to {{region}}.'
      },
      {
        name: 'Objectives Creator',
        system_prompt: 'You are a strategic planning expert for development projects. Create SMART objectives that are specific, measurable, achievable, relevant, and time-bound.',
        user_prompt_template: 'Create {{number_of_objectives}} SMART objectives for a {{project_type}} project in {{region}} with a {{timeline}} timeline and {{budget_range}} budget. Focus on {{primary_outcome}} as the main goal.'
      }
    ],
    newsletter_generator: [
      {
        name: 'Newsletter Article Writer',
        system_prompt: 'You are a professional newsletter writer for IGAD Innovation Hub. Write engaging, informative content that highlights achievements and innovations in regional development.',
        user_prompt_template: 'Write a newsletter article about {{topic}} for {{target_audience}}. The article should be {{tone}} in tone, approximately {{word_count}} words, and highlight {{key_points}}.'
      }
    ]
  }

  const applyTemplate = (template: any) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      system_prompt: template.system_prompt,
      user_prompt_template: template.user_prompt_template
    }))
    setShowTemplates(false)
  }
  
  const [formData, setFormData] = useState({
    name: '',
    section: contextData?.defaultSection || ProposalSection.PROPOSAL_WRITER,
    route: contextData?.fromRoute || '',
    tags: [] as string[],
    system_prompt: '',
    user_prompt_template: '',
    is_active: true,
    context: {
      persona: '',
      tone: '',
      constraints: '',
      guardrails: ''
    }
  })

  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (mode === 'edit' && existingPrompt) {
      setFormData({
        name: existingPrompt.name,
        section: existingPrompt.section,
        route: existingPrompt.route || '',
        tags: existingPrompt.tags,
        system_prompt: existingPrompt.system_prompt,
        user_prompt_template: existingPrompt.user_prompt_template,
        is_active: existingPrompt.is_active,
        context: {
          persona: existingPrompt.context?.persona || '',
          tone: existingPrompt.context?.tone || '',
          constraints: existingPrompt.context?.constraints || '',
          guardrails: existingPrompt.context?.guardrails || ''
        }
      })
    }
  }, [mode, existingPrompt])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate business rule: only one active prompt per section-route combination
    if (formData.is_active && formData.section && formData.route) {
      // This validation should be handled by the backend, but we can show a warning
      const warningMessage = `Warning: Only one active prompt is allowed per section-route combination. If another prompt exists for "${formData.section}" + "${formData.route}", it will be deactivated.`
      if (!confirm(warningMessage)) {
        return
      }
    }
    
    const submitData = {
      ...formData,
      context: Object.keys(formData.context).some(key => 
        formData.context[key as keyof typeof formData.context]
      ) ? formData.context : undefined
    }

    onSave(submitData)
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}
          </h2>
          <div className={styles.headerActions}>
            {mode === 'create' && (
              <button 
                type="button" 
                onClick={() => setShowTemplates(!showTemplates)}
                className={styles.templateButton}
              >
                <Layout size={16} />
                Templates
              </button>
            )}
            {mode === 'edit' && promptId && (
              <button 
                type="button" 
                onClick={() => setShowHistory(!showHistory)}
                className={styles.historyButton}
              >
                <History size={16} />
                History
              </button>
            )}
            <div className={styles.headerToggle}>
              <label className={styles.headerToggleLabel}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className={styles.toggleInput}
                />
                <span className={styles.headerToggleSlider}></span>
                <span className={styles.headerToggleText}>
                  {formData.is_active ? 'Active' : 'Inactive'}
                </span>
              </label>
            </div>
            <button onClick={onClose} className={styles.closeButton}>
              <X size={20} />
            </button>
          </div>
        </div>

        {showTemplates && (
          <div className={styles.templatesSection}>
            <h3 className={styles.templatesTitle}>Choose a Template</h3>
            <div className={styles.templatesList}>
              {templates[formData.section as keyof typeof templates]?.map((template, index) => (
                <div key={index} className={styles.templateCard} onClick={() => applyTemplate(template)}>
                  <h4>{template.name}</h4>
                  <p>{template.system_prompt.substring(0, 100)}...</p>
                </div>
              )) || (
                <p className={styles.noTemplates}>No templates available for this section</p>
              )}
            </div>
          </div>
        )}

        {showHistory && mode === 'edit' && promptId && (
          <div className={styles.historySection}>
            <h3 className={styles.historyTitle}>Change History</h3>
            <HistoryContent promptId={promptId} />
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={styles.input}
              required
              placeholder="Enter prompt name..."
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Section</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value as ProposalSection }))}
                className={styles.select}
                required
              >
                <option value={ProposalSection.PROPOSAL_WRITER}>
                  {SECTION_LABELS[ProposalSection.PROPOSAL_WRITER]}
                </option>
                <option value={ProposalSection.NEWSLETTER_GENERATOR}>
                  {SECTION_LABELS[ProposalSection.NEWSLETTER_GENERATOR]}
                </option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Route</label>
              <input
                type="text"
                value={formData.route}
                onChange={(e) => setFormData(prev => ({ ...prev, route: e.target.value }))}
                className={styles.input}
                placeholder="/proposal-writer/step-1"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Tags</label>
            <div className={styles.tagContainer}>
              <div className={styles.tagInput}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className={styles.input}
                  placeholder="Add tag..."
                />
                <button type="button" onClick={handleAddTag} className={styles.addTagButton}>
                  Add
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className={styles.tags}>
                  {formData.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className={styles.removeTag}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelWithIcon}>
              <label className={styles.label}>
                <Settings size={16} className={styles.labelIcon} />
                System Prompt
              </label>
              <div className={styles.helpTooltip}>
                <HelpCircle size={14} className={styles.helpIcon} />
                <div className={styles.tooltipContent}>
                  Defines the AI's role, personality, and behavior. Example: "You are an expert proposal writer specializing in African development projects..."
                </div>
              </div>
            </div>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
              className={styles.textarea}
              rows={6}
              required
              placeholder="Enter the system prompt that defines the AI's role and behavior..."
            />
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelWithIcon}>
              <label className={styles.label}>
                <FileText size={16} className={styles.labelIcon} />
                User Prompt Template
              </label>
              <div className={styles.helpTooltip}>
                <HelpCircle size={14} className={styles.helpIcon} />
                <div className={styles.tooltipContent}>
                  Template with variables for dynamic content. Use {'{variable_name}'} for placeholders. Example: "Create a {'{section_type}'} for {'{project_type}'} in {'{region}'}..."
                </div>
              </div>
            </div>
            <textarea
              value={formData.user_prompt_template}
              onChange={(e) => setFormData(prev => ({ ...prev, user_prompt_template: e.target.value }))}
              className={styles.textarea}
              rows={8}
              required
              placeholder="Enter the user prompt template with variables like {{variable_name}}..."
            />
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button 
              type="button" 
              onClick={() => setShowPreview(!showPreview)}
              className={styles.previewButton}
            >
              <Eye size={16} />
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className={styles.spinning} />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {mode === 'create' ? 'Create Prompt' : 'Update Prompt'}
                </>
              )}
            </button>
          </div>
        </form>

        {showPreview && (
          <div className={styles.previewSection}>
            <h3 className={styles.previewTitle}>Preview</h3>
            <div className={styles.previewContent}>
              <div className={styles.previewBlock}>
                <h4>System Prompt:</h4>
                <div className={styles.previewText}>{formData.system_prompt || 'No system prompt defined'}</div>
              </div>
              <div className={styles.previewBlock}>
                <h4>User Template:</h4>
                <div className={styles.previewText}>{formData.user_prompt_template || 'No user template defined'}</div>
              </div>
              <div className={styles.previewBlock}>
                <h4>Example with Variables:</h4>
                <div className={styles.previewExample}>
                  {formData.user_prompt_template
                    .replace(/\{\{project_type\}\}/g, 'Agricultural Development')
                    .replace(/\{\{region\}\}/g, 'East Africa')
                    .replace(/\{\{budget\}\}/g, '$500,000')
                    .replace(/\{\{timeline\}\}/g, '24 months')
                    || 'No template to preview'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
