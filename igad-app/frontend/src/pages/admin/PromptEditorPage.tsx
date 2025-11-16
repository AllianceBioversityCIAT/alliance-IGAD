import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, Eye, EyeOff, History, FileText, Copy, Check, X, Plus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { usePrompts } from '../../hooks/usePrompts'
import { useToast } from '../../components/ui/ToastContainer'
import { ProposalSection, SECTION_LABELS, PROMPT_CATEGORIES, type Prompt } from '../../types/prompt'
import styles from './PromptEditorPage.module.css'

export function PromptEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = !!id
  const { showSuccess, showError } = useToast()
  const { createPrompt, updatePrompt, isCreating, isUpdating } = usePrompts()

  const [showPreview, setShowPreview] = useState(true) // Always show preview
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(!isEdit) // Show for new prompts only
  const [isLoading, setIsLoading] = useState(isEdit) // Loading state for edit mode
  const [showHistory, setShowHistory] = useState(false)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState(false)
  
  // Extract URL parameters for auto-population
  const searchParams = new URLSearchParams(location.search)
  const fromRoute = searchParams.get('from')
  const urlSection = searchParams.get('section') as ProposalSection
  
  // Auto-populate initial form data from URL parameters
  const getInitialFormData = () => {
    const baseData = {
      name: '',
      section: 'proposal_writer' as ProposalSection,
      sub_section: '',
      route: '',
      categories: [] as string[],
      tags: [] as string[],
      system_prompt: '',
      user_prompt_template: '',
      output_format: 'Clear and structured response',
      tone: 'Professional and informative',
      few_shot: [],
      context: {}
    }

    // If coming from a specific route, auto-populate fields
    if (!isEdit && fromRoute && urlSection) {
      // Extract sub-section from route (e.g., "/proposal-writer/step-1" -> "step-1")
      const routeParts = fromRoute.split('/')
      const subSection = routeParts[routeParts.length - 1] // Get last part
      
      return {
        ...baseData,
        section: urlSection,
        sub_section: subSection,
        route: fromRoute
      }
    }

    return baseData
  }

  const [formData, setFormData] = useState(getInitialFormData())

  useEffect(() => {
    if (isEdit && id) {
      fetchPrompt(id)
    }
  }, [id, isEdit])

  const fetchPrompt = async (promptId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/prompts/${promptId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPrompt(data)
        setFormData({
          name: data.name,
          section: data.section,
          sub_section: data.sub_section || '',
          route: data.route || '',
          categories: Array.isArray(data.categories) ? data.categories : [],
          tags: Array.isArray(data.tags) ? data.tags : [],
          system_prompt: data.system_prompt,
          user_prompt_template: data.user_prompt_template,
          output_format: data.output_format || 'Clear and structured response',
          tone: data.tone || 'Professional and informative',
          few_shot: data.few_shot || [],
          context: data.context || {}
        })
      }
    } catch (error) {
      showError('Failed to load prompt', 'Please try again.')
    }
  }

  const handleSave = async () => {
    try {
      if (isEdit && id) {
        await updatePrompt({ id, data: formData })
        showSuccess('Prompt updated successfully')
      } else {
        await createPrompt(formData)
        showSuccess('Prompt created successfully')
      }
      navigate('/admin/prompt-manager')
    } catch (error: any) {
      showError('Failed to save prompt', error.message || 'Please try again.')
    }
  }

  const handleCancel = () => {
    navigate('/admin/prompt-manager')
  }

  const extractVariables = (text: string): string[] => {
    // Extract both single {variable} and double {{variable}} patterns
    const singleBraces = text.match(/\{([^{}]+)\}/g) || []
    const doubleBraces = text.match(/\{\{([^{}]+)\}\}/g) || []
    
    const singleVars = singleBraces.map(match => match.slice(1, -1))
    const doubleVars = doubleBraces.map(match => match.slice(2, -2))
    
    return [...new Set([...singleVars, ...doubleVars])]
  }

  const getPreviewText = (text: string) => {
    let result = text
    
    // Handle category variables (double braces)
    if (formData.categories.length > 0) {
      // Handle individual category variables using actual category names
      formData.categories.forEach((category) => {
        const variableName = category.toLowerCase().replace(/\s+/g, '_')
        const variablePattern = new RegExp(`\\{\\{${variableName}\\}\\}`, 'g')
        result = result.replace(variablePattern, `[${category}]`)
      })
      
      // Handle legacy category_1, category_2 format for backward compatibility
      formData.categories.forEach((category, index) => {
        const variablePattern = new RegExp(`\\{\\{category_${index + 1}\\}\\}`, 'g')
        result = result.replace(variablePattern, `[${category}]`)
      })
      
      // Handle all categories variable
      result = result.replace(/\{\{categories\}\}/g, `[${formData.categories.join(', ')}]`)
    }
    
    // Handle regular variables (single braces)
    const variables = result.match(/\{([^{}]+)\}/g) || []
    variables.forEach(variable => {
      const varName = variable.slice(1, -1)
      const exampleValue = `[${varName.replace(/_/g, ' ').toUpperCase()}]`
      result = result.replace(new RegExp(`\\{${varName}\\}`, 'g'), exampleValue)
    })
    
    return result
  }

  // Copy to clipboard function
  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedSection(section)
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Copy entire preview as markdown
  const copyAllAsMarkdown = async () => {
    const systemContent = getPreviewText(formData.system_prompt)
    const userContent = getPreviewText(formData.user_prompt_template)
    const outputContent = formData.output_format

    let markdownContent = ''
    
    if (systemContent) {
      markdownContent += `# System Role\n\n${systemContent}\n\n`
    }
    
    if (userContent) {
      markdownContent += `# User Instructions\n\n${userContent}\n\n`
    }
    
    if (outputContent) {
      markdownContent += `# Expected Output Format\n\n${outputContent}\n\n`
    }

    try {
      await navigator.clipboard.writeText(markdownContent.trim())
      setCopiedSection('all')
      setTimeout(() => setCopiedSection(null), 2000)
    } catch (err) {
      console.error('Failed to copy markdown: ', err)
    }
  }

  // Template examples
  const promptTemplates = {
    blank: {
      name: 'Blank Template',
      system_prompt: '',
      user_prompt_template: '',
      output_format: ''
    },
    sprint_planner: {
      name: 'Sprint Planning Assistant',
      system_prompt: `# Sprint Planning Expert

You are an experienced Agile project manager and sprint planning expert with 10+ years of experience in software development and project management. You specialize in creating detailed, actionable sprint plans that follow industry best practices.

## Your Role
- Break down complex projects into manageable sprint goals
- Create clear user stories with acceptance criteria
- Estimate effort and identify dependencies
- Ensure deliverables are realistic and achievable

## Guidelines
- Follow Agile/Scrum methodology
- Use clear, professional language
- Focus on actionable outcomes
- Consider team capacity and constraints`,
      user_prompt_template: `Create a detailed sprint plan for: **{project_name}**

## Project Details
- **Duration**: {sprint_duration}
- **Team Size**: {team_size}
- **Priority**: {priority_level}
- **Key Requirements**: {requirements}

Please provide a comprehensive sprint plan including goals, user stories, tasks, and timeline.`,
      output_format: `# Sprint {sprint_number}: {project_name}

## Sprint Goal
[Clear, concise goal statement]

## Key Objectives
- [Objective 1]
- [Objective 2]
- [Objective 3]

## User Stories / Tasks
### [Category Name]
- **Story ID**: As a [user type], I need [functionality] so that [benefit]
  - Acceptance criteria
  - Estimated effort
  - Dependencies

## Timeline
- **Week 1**: [Milestones]
- **Week 2**: [Milestones]

## Risks & Mitigation
- [Risk]: [Mitigation strategy]`
    },
    technical_writer: {
      name: 'Technical Documentation Writer',
      system_prompt: `# Technical Documentation Expert

You are a senior technical writer with expertise in creating clear, comprehensive documentation for software projects, APIs, and technical processes. You excel at translating complex technical concepts into accessible, well-structured documentation.

## Your Expertise
- API documentation and developer guides
- User manuals and tutorials
- Technical specifications and architecture docs
- Process documentation and runbooks

## Writing Standards
- Use clear, concise language
- Follow documentation best practices
- Include practical examples
- Structure content logically with proper headings`,
      user_prompt_template: `Create comprehensive technical documentation for: **{project_name}**

## Documentation Requirements
- **Type**: {doc_type}
- **Audience**: {target_audience}
- **Scope**: {scope}
- **Technical Stack**: {tech_stack}

Please provide detailed documentation that covers all essential aspects.`,
      output_format: `# {project_name} Documentation

## Overview
[Brief description and purpose]

## Getting Started
### Prerequisites
- [Requirement 1]
- [Requirement 2]

### Installation
\`\`\`bash
# Installation commands
\`\`\`

## Usage
### Basic Usage
[Step-by-step instructions]

### Advanced Features
[Detailed feature explanations]

## API Reference
[If applicable]

## Examples
[Practical examples with code]

## Troubleshooting
[Common issues and solutions]`
    }
  }

  // Inject template into form
  const injectTemplate = (templateKey: string) => {
    const template = promptTemplates[templateKey as keyof typeof promptTemplates]
    if (template) {
      setFormData({
        ...formData,
        system_prompt: template.system_prompt,
        user_prompt_template: template.user_prompt_template,
        output_format: template.output_format
      })
      setShowTemplateSelector(false)
    }
  }

  const allVariables = [
    ...extractVariables(formData.system_prompt),
    ...extractVariables(formData.user_prompt_template)
  ].filter((v, i, arr) => arr.indexOf(v) === i)

  const handleAddCustomCategory = () => {
    if (customCategory.trim() && !formData.categories.includes(customCategory.trim())) {
      setFormData({
        ...formData,
        categories: [...formData.categories, customCategory.trim()]
      })
      setCustomCategory('')
      setShowCustomCategoryInput(false)
    }
  }

  const handleRemoveCategory = (categoryToRemove: string) => {
    setFormData({
      ...formData,
      categories: formData.categories.filter(c => c !== categoryToRemove)
    })
  }

  const insertCategoryVariable = (field: 'system_prompt' | 'user_prompt_template', variable: string) => {
    const textarea = document.querySelector(`textarea[name="${field}"]`) as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentValue = formData[field]
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end)
      
      setFormData({ ...formData, [field]: newValue })
      
      // Restore cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={handleCancel} className={styles.backButton}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className={styles.title}>
              {isEdit ? 'Edit Prompt' : 'Create New Prompt'}
            </h1>
            <div className={styles.breadcrumb}>
              <span onClick={() => navigate('/admin/prompt-manager')} className={styles.breadcrumbLink}>
                Prompt Manager
              </span>
              <span className={styles.breadcrumbSeparator}>/</span>
              <span>{isEdit ? 'Edit' : 'Create'}</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {isEdit && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`${styles.actionButton} ${showHistory ? styles.active : ''}`}
            >
              <History size={16} />
              History
            </button>
          )}

          <button onClick={handleCancel} className={styles.cancelButton}>
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isCreating || isUpdating}
            className={styles.saveButton}
          >
            <Save size={16} />
            {isCreating || isUpdating ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.content}>
        <div className={styles.editorSection}>
          {/* Template Selector - Only for new prompts */}
          {showTemplateSelector && (
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Start with a Template</h3>
              <p className={styles.templateDescription}>
                Choose a template to get started quickly, or select "Blank Template" to start from scratch.
              </p>
              <div className={styles.templateGrid}>
                {Object.entries(promptTemplates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => injectTemplate(key)}
                    className={styles.templateCard}
                  >
                    <h4>{template.name}</h4>
                    <p>{key === 'blank' ? 'Start with empty fields' : 
                       key === 'sprint_planner' ? 'Create detailed sprint plans and user stories' :
                       'Generate comprehensive technical documentation'}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Basic Information</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={styles.input}
                  placeholder="Enter prompt name"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Section *</label>
                <select
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value as ProposalSection })}
                  className={styles.select}
                >
                  {Object.entries(SECTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sub-section</label>
                <input
                  type="text"
                  value={formData.sub_section}
                  onChange={(e) => setFormData({ ...formData, sub_section: e.target.value })}
                  className={styles.input}
                  placeholder="e.g., step-1, step-2"
                />
                <small className={styles.fieldHint}>
                  Organize prompts within sections (e.g., "step-1", "step-2")
                </small>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Route</label>
                <input
                  type="text"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  className={styles.input}
                  placeholder="Optional route identifier"
                />
              </div>
            </div>

            {/* Categories Section */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Categories</label>
              <div className={styles.categoriesContainer}>
                {/* Selected Categories */}
                {formData.categories.length > 0 && (
                  <div className={styles.selectedCategories}>
                    {formData.categories.map((category) => (
                      <span key={category} className={styles.selectedCategory}>
                        {category}
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(category)}
                          className={styles.removeCategoryButton}
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Predefined Categories */}
                <div className={styles.categoriesGrid}>
                  {PROMPT_CATEGORIES.map((category) => (
                    <label key={category} className={styles.categoryCheckbox}>
                      <input
                        type="checkbox"
                        checked={formData.categories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              categories: [...formData.categories, category]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              categories: formData.categories.filter(c => c !== category)
                            })
                          }
                        }}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>

                {/* Custom Category Input */}
                {showCustomCategoryInput ? (
                  <div className={styles.customCategoryInput}>
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category name"
                      className={styles.input}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddCustomCategory()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      className={styles.addCategoryButton}
                      disabled={!customCategory.trim()}
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomCategoryInput(false)
                        setCustomCategory('')
                      }}
                      className={styles.cancelCategoryButton}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomCategoryInput(true)}
                    className={styles.addCustomCategoryButton}
                  >
                    <Plus size={16} />
                    Add Custom Category
                  </button>
                )}

                <small className={styles.fieldHint}>
                  Select categories where this prompt can be used. Categories can be injected as variables using {`{{category_1}}`}, {`{{category_2}}`}, or {`{{categories}}`}.
                </small>
              </div>
            </div>
          </div>

          {/* Prompts */}
          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>System Role *</h3>
              {formData.categories.length > 0 && (
                <div className={styles.categoryInjectors}>
                  <span className={styles.injectorLabel}>Insert:</span>
                  {formData.categories.map((category, index) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => insertCategoryVariable('system_prompt', `{{${category.toLowerCase().replace(/\s+/g, '_')}}}`)}
                      className={styles.injectorButton}
                      title={`Insert: ${category}`}
                    >
                      {category}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => insertCategoryVariable('system_prompt', '{{categories}}')}
                    className={styles.injectorButton}
                    title={`Insert all: ${formData.categories.join(', ')}`}
                  >
                    All Categories
                  </button>
                </div>
              )}
            </div>
            <textarea
              name="system_prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              className={styles.textareaLarge}
              rows={10}
              placeholder="Define the AI's role, personality, and behavior. Example: You are an expert proposal writer with 15 years of experience in international development projects..."
            />
          </div>

          <div className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>User Instructions *</h3>
              {formData.categories.length > 0 && (
                <div className={styles.categoryInjectors}>
                  <span className={styles.injectorLabel}>Insert:</span>
                  {formData.categories.map((category, index) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => insertCategoryVariable('user_prompt_template', `{{${category.toLowerCase().replace(/\s+/g, '_')}}}`)}
                      className={styles.injectorButton}
                      title={`Insert: ${category}`}
                    >
                      {category}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => insertCategoryVariable('user_prompt_template', '{{categories}}')}
                    className={styles.injectorButton}
                    title={`Insert all: ${formData.categories.join(', ')}`}
                  >
                    All Categories
                  </button>
                </div>
              )}
            </div>
            <textarea
              name="user_prompt_template"
              value={formData.user_prompt_template}
              onChange={(e) => setFormData({ ...formData, user_prompt_template: e.target.value })}
              className={styles.textareaLarge}
              rows={10}
              placeholder="Instructions for the user's request with variables like {project_name}, {budget}, {timeline}. Example: Create a comprehensive proposal for {project_name} with a budget of {budget}..."
            />
          </div>

          <div className={styles.formSection}>
            <h3 className={styles.sectionTitle}>Expected Output Format</h3>
            <textarea
              value={formData.output_format}
              onChange={(e) => setFormData({ ...formData, output_format: e.target.value })}
              className={styles.textareaLarge}
              rows={6}
              placeholder="Describe the expected output structure, format, and style. Example: Provide a structured response with: 1. Executive Summary, 2. Technical Approach, 3. Budget Breakdown..."
            />
          </div>

          {/* Variables */}
          {allVariables.length > 0 && (
            <div className={styles.formSection}>
              <h3 className={styles.sectionTitle}>Detected Variables</h3>
              <div className={styles.variablesList}>
                {allVariables.map(variable => (
                  <span key={variable} className={styles.variable}>
                    {`{${variable}}`}
                  </span>
                ))}
              </div>
              <small className={styles.fieldHint}>
                <strong>Note:</strong> Category variables ({'{{category_1}}'}, {'{{category_2}}'}, {'{{categories}}'}) will be replaced with actual category names when the prompt is retrieved from the backend.
              </small>
            </div>
          )}
        </div>

        {/* Preview Panel - Always visible */}
        <div className={styles.previewSection}>
          <div className={styles.previewSectionHeader}>
            <h3 className={styles.sectionTitle}>
              <FileText size={16} />
              Live Preview
            </h3>
            <button 
              onClick={copyAllAsMarkdown}
              className={styles.copyAllButton}
              title="Copy entire preview as Markdown"
            >
              {copiedSection === 'all' ? <Check size={16} /> : <Copy size={16} />}
              Copy All MD
            </button>
          </div>
          
          <div className={styles.previewContent}>
            <div className={styles.previewBlock}>
              <div className={styles.previewHeader}>
                <h4>System Role</h4>
                <button 
                  onClick={() => copyToClipboard(getPreviewText(formData.system_prompt), 'system')}
                  className={styles.copyButton}
                  title="Copy to clipboard"
                >
                  {copiedSection === 'system' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className={styles.markdownContent}>
                <ReactMarkdown>
                  {getPreviewText(formData.system_prompt) || '*No content yet*'}
                </ReactMarkdown>
              </div>
            </div>

            <div className={styles.previewBlock}>
              <div className={styles.previewHeader}>
                <h4>User Instructions</h4>
                <button 
                  onClick={() => copyToClipboard(getPreviewText(formData.user_prompt_template), 'user')}
                  className={styles.copyButton}
                  title="Copy to clipboard"
                >
                  {copiedSection === 'user' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className={styles.markdownContent}>
                <ReactMarkdown>
                  {getPreviewText(formData.user_prompt_template) || '*No content yet*'}
                </ReactMarkdown>
              </div>
            </div>

            {formData.output_format && (
              <div className={styles.previewBlock}>
                <div className={styles.previewHeader}>
                  <h4>Expected Output Format</h4>
                  <button 
                    onClick={() => copyToClipboard(formData.output_format, 'output')}
                    className={styles.copyButton}
                    title="Copy to clipboard"
                  >
                    {copiedSection === 'output' ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                <div className={styles.markdownContent}>
                  <ReactMarkdown>
                    {formData.output_format}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className={styles.historyOverlay} onClick={() => setShowHistory(false)}>
          <div className={styles.historyModal} onClick={e => e.stopPropagation()}>
            <div className={styles.historyHeader}>
              <h3>Prompt History</h3>
              <button onClick={() => setShowHistory(false)} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.historyContent}>
              <div className={styles.historyItem}>
                <div className={styles.historyItemHeader}>
                  <span className={styles.historyDate}>Current Version</span>
                  <span className={styles.historyStatus}>Active</span>
                </div>
                <div className={styles.historyItemContent}>
                  <p><strong>Name:</strong> {formData.name || 'Untitled'}</p>
                  <p><strong>Section:</strong> {formData.section}</p>
                  <p><strong>Last Modified:</strong> Just now</p>
                </div>
              </div>
              <div className={styles.historyPlaceholder}>
                <p>Previous versions will appear here once the prompt is saved and modified.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
