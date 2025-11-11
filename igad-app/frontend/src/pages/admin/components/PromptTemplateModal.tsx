import { X, FileText } from 'lucide-react'
import { Prompt } from '../../../types/prompt'
import styles from './PromptTemplateModal.module.css'

interface PromptTemplateModalProps {
  prompt: Prompt | null
  isOpen: boolean
  onClose: () => void
}

export function PromptTemplateModal({ prompt, isOpen, onClose }: PromptTemplateModalProps) {
  if (!isOpen || !prompt) return null

  // Extract variables from prompt templates
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{([^}]+)\}/g) || []
    return [...new Set(matches.map(match => match.slice(1, -1)))]
  }

  const systemVariables = extractVariables(prompt.system_prompt)
  const userVariables = extractVariables(prompt.user_prompt_template)
  const allVariables = [...new Set([...systemVariables, ...userVariables])]

  // Replace variables with placeholder values for template view
  const getTemplateView = (text: string) => {
    let result = text
    allVariables.forEach(variable => {
      const placeholder = `{${variable}}`
      const exampleValue = `[${variable.replace(/_/g, ' ').toUpperCase()}]`
      result = result.replace(new RegExp(`\\{${variable}\\}`, 'g'), exampleValue)
    })
    return result
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <FileText className={styles.icon} />
            <div>
              <h2 className={styles.title}>Template View</h2>
              <p className={styles.subtitle}>{prompt.name}</p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          {allVariables.length > 0 && (
            <div className={styles.variablesSection}>
              <h3 className={styles.sectionTitle}>Available Variables</h3>
              <div className={styles.variablesList}>
                {allVariables.map(variable => (
                  <span key={variable} className={styles.variable}>
                    {`{${variable}}`}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.promptSection}>
            <h3 className={styles.sectionTitle}>System Prompt Template</h3>
            <div className={styles.promptContent}>
              <pre className={styles.promptText}>
                {getTemplateView(prompt.system_prompt)}
              </pre>
            </div>
          </div>

          <div className={styles.promptSection}>
            <h3 className={styles.sectionTitle}>User Prompt Template</h3>
            <div className={styles.promptContent}>
              <pre className={styles.promptText}>
                {getTemplateView(prompt.user_prompt_template)}
              </pre>
            </div>
          </div>

          {prompt.output_format && (
            <div className={styles.promptSection}>
              <h3 className={styles.sectionTitle}>Expected Output Format</h3>
              <div className={styles.promptContent}>
                <pre className={styles.promptText}>
                  {prompt.output_format}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
