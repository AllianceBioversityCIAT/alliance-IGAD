/**
 * NovelEditor
 *
 * Notion-style WYSIWYG editor with AI-powered autocompletions.
 * Built on Novel.sh (Tiptap + Vercel AI SDK)
 *
 * Features:
 * - Slash commands (/) for formatting
 * - Rich text editing (headings, lists, links, etc.)
 * - Real-time content updates
 */

import { useCallback, useMemo } from 'react'
import { EditorRoot, EditorContent, type JSONContent } from 'novel'
import styles from './NovelEditor.module.css'

interface NovelEditorProps {
  content: string
  onChange: (content: string, html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

// Convert markdown-ish content to ProseMirror JSON for Novel
function contentToJSON(content: string): JSONContent {
  if (!content || content.trim() === '') {
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    }
  }

  // Split content into paragraphs and convert to ProseMirror format
  const paragraphs = content.split('\n\n').filter(p => p.trim())

  const docContent = paragraphs.map(paragraph => {
    const trimmed = paragraph.trim()

    // Handle headers
    if (trimmed.startsWith('### ')) {
      return {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: trimmed.slice(4) }],
      }
    }
    if (trimmed.startsWith('## ')) {
      return {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: trimmed.slice(3) }],
      }
    }
    if (trimmed.startsWith('# ')) {
      return {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: trimmed.slice(2) }],
      }
    }

    // Handle bullet lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = trimmed
        .split('\n')
        .filter(line => line.trim().startsWith('- ') || line.trim().startsWith('* '))
      return {
        type: 'bulletList',
        content: items.map(item => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: item.slice(2).trim() }],
            },
          ],
        })),
      }
    }

    // Regular paragraph
    return {
      type: 'paragraph',
      content: trimmed ? [{ type: 'text', text: trimmed }] : [],
    }
  })

  return {
    type: 'doc',
    content: docContent.length > 0 ? docContent : [{ type: 'paragraph', content: [] }],
  }
}

// Convert ProseMirror JSON back to markdown-ish text
function jsonToMarkdown(json: JSONContent): string {
  if (!json || !json.content) {
    return ''
  }

  const processNode = (node: JSONContent): string => {
    if (!node) {
      return ''
    }

    switch (node.type) {
      case 'doc':
        return (node.content || []).map(processNode).join('\n\n')

      case 'heading': {
        const level = node.attrs?.level || 1
        const prefix = '#'.repeat(level) + ' '
        const text = (node.content || []).map(processNode).join('')
        return prefix + text
      }

      case 'paragraph':
        return (node.content || []).map(processNode).join('')

      case 'bulletList':
        return (node.content || []).map(item => '- ' + processNode(item).trim()).join('\n')

      case 'orderedList':
        return (node.content || [])
          .map((item, i) => `${i + 1}. ` + processNode(item).trim())
          .join('\n')

      case 'listItem':
        return (node.content || []).map(processNode).join('')

      case 'blockquote':
        return '> ' + (node.content || []).map(processNode).join('\n> ')

      case 'codeBlock':
        return '```\n' + (node.content || []).map(processNode).join('') + '\n```'

      case 'horizontalRule':
        return '---'

      case 'text': {
        let text = node.text || ''
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === 'bold') {
              text = `**${text}**`
            }
            if (mark.type === 'italic') {
              text = `*${text}*`
            }
            if (mark.type === 'link') {
              text = `[${text}](${mark.attrs?.href || ''})`
            }
            if (mark.type === 'code') {
              text = `\`${text}\``
            }
          }
        }
        return text
      }

      case 'hardBreak':
        return '\n'

      default:
        return (node.content || []).map(processNode).join('')
    }
  }

  return processNode(json)
}

// Convert JSON to HTML
function jsonToHTML(json: JSONContent): string {
  if (!json || !json.content) {
    return ''
  }

  const processNode = (node: JSONContent): string => {
    if (!node) {
      return ''
    }

    switch (node.type) {
      case 'doc':
        return (node.content || []).map(processNode).join('')

      case 'heading': {
        const level = node.attrs?.level || 1
        const text = (node.content || []).map(processNode).join('')
        return `<h${level}>${text}</h${level}>`
      }

      case 'paragraph': {
        const text = (node.content || []).map(processNode).join('')
        return `<p>${text}</p>`
      }

      case 'bulletList':
        return `<ul>${(node.content || []).map(processNode).join('')}</ul>`

      case 'orderedList':
        return `<ol>${(node.content || []).map(processNode).join('')}</ol>`

      case 'listItem': {
        const text = (node.content || []).map(processNode).join('')
        return `<li>${text}</li>`
      }

      case 'blockquote': {
        const text = (node.content || []).map(processNode).join('')
        return `<blockquote>${text}</blockquote>`
      }

      case 'codeBlock': {
        const text = (node.content || []).map(processNode).join('')
        return `<pre><code>${text}</code></pre>`
      }

      case 'horizontalRule':
        return '<hr />'

      case 'text': {
        let text = node.text || ''
        // Escape HTML
        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === 'bold') {
              text = `<strong>${text}</strong>`
            }
            if (mark.type === 'italic') {
              text = `<em>${text}</em>`
            }
            if (mark.type === 'link') {
              text = `<a href="${mark.attrs?.href || ''}" target="_blank">${text}</a>`
            }
            if (mark.type === 'code') {
              text = `<code>${text}</code>`
            }
          }
        }
        return text
      }

      case 'hardBreak':
        return '<br />'

      default:
        return (node.content || []).map(processNode).join('')
    }
  }

  return processNode(json)
}

export function NovelEditor({
  content,
  onChange,
  placeholder = 'Start writing... Use "/" for commands',
  editable = true,
  className = '',
}: NovelEditorProps) {
  // Memoize initial content conversion
  const initialContent = useMemo(() => contentToJSON(content), [])

  // Handle editor updates
  const handleUpdate = useCallback(
    ({ editor }: { editor: { getJSON: () => JSONContent } }) => {
      const json = editor.getJSON()
      const markdown = jsonToMarkdown(json)
      const html = jsonToHTML(json)
      onChange(markdown, html)
    },
    [onChange]
  )

  return (
    <div className={`${styles.editorContainer} ${className}`}>
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          onUpdate={handleUpdate}
          editable={editable}
          className={styles.novelEditor}
          editorProps={{
            attributes: {
              class: styles.editorContent,
              'data-placeholder': placeholder,
            },
          }}
        />
      </EditorRoot>
      <div className={styles.editorHint}>
        <span className={styles.hintItem}>
          <kbd>/</kbd> Commands
        </span>
        <span className={styles.hintItem}>
          <kbd>**text**</kbd> Bold
        </span>
        <span className={styles.hintItem}>
          <kbd>*text*</kbd> Italic
        </span>
      </div>
    </div>
  )
}

export default NovelEditor
