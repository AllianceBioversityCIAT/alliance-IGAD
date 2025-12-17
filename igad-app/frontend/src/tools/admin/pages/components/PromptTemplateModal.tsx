import { X, FileText, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prompt } from '@/types/prompt'
import styles from './PromptTemplateModal.module.css'

interface PromptTemplateModalProps {
  prompt: Prompt | null
  isOpen: boolean
  onClose: () => void
}

export function PromptTemplateModal({ prompt, isOpen, onClose }: PromptTemplateModalProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  if (!isOpen || !prompt) {
    return null
  }

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
      const exampleValue = `[${variable.replace(/_/g, ' ').toUpperCase()}]`
      result = result.replace(new RegExp(`\\{${variable}\\}`, 'g'), exampleValue)
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
      // Removed console.error
    }
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
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>System Prompt Template</h3>
              <button
                onClick={() => copyToClipboard(getTemplateView(prompt.system_prompt), 'system')}
                className={styles.copyButton}
                title="Copy to clipboard"
              >
                {copiedSection === 'system' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div className={styles.promptContent}>
              <ReactMarkdown className={styles.markdownContent}>
                {getTemplateView(prompt.system_prompt)}
              </ReactMarkdown>
            </div>
          </div>

          <div className={styles.promptSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>User Prompt Template</h3>
              <button
                onClick={() =>
                  copyToClipboard(getTemplateView(prompt.user_prompt_template), 'user')
                }
                className={styles.copyButton}
                title="Copy to clipboard"
              >
                {copiedSection === 'user' ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div className={styles.promptContent}>
              <ReactMarkdown className={styles.markdownContent}>
                {getTemplateView(prompt.user_prompt_template)}
              </ReactMarkdown>
            </div>
          </div>

          {prompt.output_format && (
            <div className={styles.promptSection}>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Expected Output Format</h3>
                <button
                  onClick={() => copyToClipboard(prompt.output_format, 'output')}
                  className={styles.copyButton}
                  title="Copy to clipboard"
                >
                  {copiedSection === 'output' ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className={styles.promptContent}>
                <ReactMarkdown className={styles.markdownContent}>
                  {prompt.output_format}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
