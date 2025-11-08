import { useState, useEffect } from 'react'
import { X, Save, Eye, Loader2 } from 'lucide-react'
import { usePrompt } from '../../../hooks/usePrompts'
import { ProposalSection, SECTION_LABELS, type CreatePromptRequest, type UpdatePromptRequest } from '../../../types/prompt'
import styles from './PromptEditorDrawer.module.css'

interface PromptEditorDrawerProps {
  mode: 'create' | 'edit'
  promptId?: string | null
  onClose: () => void
  onSave: (data: any) => void
  isLoading?: boolean
}

export function PromptEditorDrawer({ mode, promptId, onClose, onSave, isLoading = false }: PromptEditorDrawerProps) {
  const { data: existingPrompt } = usePrompt(promptId || '', 'latest')
  
  const [formData, setFormData] = useState({
    name: '',
    section: ProposalSection.PROPOSAL_WRITER,
    route: '',
    tags: [] as string[],
    system_prompt: '',
    user_prompt_template: '',
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
    <div className={styles.overlay}>
      <div className={styles.drawer}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}
          </h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Name *</label>
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
              <label className={styles.label}>Section *</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value as ProposalSection }))}
                className={styles.select}
                required
              >
                {Object.entries(SECTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
            <label className={styles.label}>System Prompt *</label>
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
            <label className={styles.label}>User Prompt Template *</label>
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
      </div>
    </div>
  )
}
