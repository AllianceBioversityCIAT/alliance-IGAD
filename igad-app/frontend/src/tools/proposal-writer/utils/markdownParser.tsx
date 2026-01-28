/**
 * Formats inline markdown (bold, italic, code) to HTML strings
 * Used for dangerouslySetInnerHTML
 */
export const formatInlineMarkdown = (text: string): string => {
  let formatted = text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')
  return formatted
}

/**
 * Parses markdown string into React Elements using a provided CSS module object for styling.
 * Supports: Headers (H1-H4), Lists, Paragraphs, Tables.
 *
 * @param markdown The markdown string to parse
 * @param styles The CSS module object containing class names
 * @returns Array of JSX Elements
 */
export const parseMarkdownToReact = (
  markdown: string,
  styles: Record<string, string>
): JSX.Element[] => {
  if (!markdown) {
    return []
  }

  const lines = markdown.split('\n')
  const elements: JSX.Element[] = []
  let currentList: string[] = []
  let currentParagraph: string[] = []
  let currentTable: string[][] = []
  let tableHeaders: string[] = []
  let inTable = false

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className={styles.markdownList}>
          {currentList.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
          ))}
        </ul>
      )
      currentList = []
    }
  }

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ')
      if (text.trim()) {
        elements.push(
          <p
            key={`p-${elements.length}`}
            className={styles.markdownParagraph}
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }}
          />
        )
      }
      currentParagraph = []
    }
  }

  const flushTable = () => {
    if (tableHeaders.length > 0 || currentTable.length > 0) {
      elements.push(
        <div key={`table-wrapper-${elements.length}`} className={styles.tableWrapper}>
          <table className={styles.markdownTable}>
            {tableHeaders.length > 0 && (
              <thead>
                <tr>
                  {tableHeaders.map((header, i) => (
                    <th
                      key={i}
                      dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(header.trim()) }}
                    />
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {currentTable.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell.trim()) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableHeaders = []
      currentTable = []
      inTable = false
    }
  }

  // Check if a line is a table row (starts and ends with |, or has | separators)
  const isTableRow = (line: string): boolean => {
    const trimmed = line.trim()
    return trimmed.includes('|') && (trimmed.startsWith('|') || trimmed.split('|').length >= 2)
  }

  // Check if a line is the separator row (| --- | --- |)
  const isTableSeparator = (line: string): boolean => {
    const trimmed = line.trim()
    return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(trimmed)
  }

  // Parse table row into cells
  const parseTableRow = (line: string): string[] => {
    return line
      .split('|')
      .map(cell => cell.trim())
      .filter((_, index, arr) => {
        // Remove empty first/last cells from | at beginning/end
        if (index === 0 && arr[0] === '') {
          return false
        }
        if (index === arr.length - 1 && arr[arr.length - 1] === '') {
          return false
        }
        return true
      })
  }

  lines.forEach((line, index) => {
    // Check for table rows
    if (isTableRow(line)) {
      flushList()
      flushParagraph()

      if (isTableSeparator(line)) {
        // This is the separator row, skip it (headers already captured)
        inTable = true
        return
      }

      if (!inTable && tableHeaders.length === 0) {
        // First row of table = headers
        tableHeaders = parseTableRow(line)
      } else {
        // Data row
        inTable = true
        currentTable.push(parseTableRow(line))
      }
      return
    }

    // If we were in a table and hit a non-table line, flush the table
    if (inTable || tableHeaders.length > 0) {
      flushTable()
    }

    if (line.startsWith('#### ')) {
      flushList()
      flushParagraph()
      elements.push(
        <h4 key={`h4-${index}`} className={styles.markdownH4}>
          {line.substring(5)}
        </h4>
      )
    } else if (line.startsWith('### ')) {
      flushList()
      flushParagraph()
      elements.push(
        <h3 key={`h3-${index}`} className={styles.markdownH3}>
          {line.substring(4)}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      flushList()
      flushParagraph()
      elements.push(
        <h2 key={`h2-${index}`} className={styles.markdownH2}>
          {line.substring(3)}
        </h2>
      )
    } else if (line.startsWith('# ')) {
      flushList()
      flushParagraph()
      elements.push(
        <h1 key={`h1-${index}`} className={styles.markdownH1}>
          {line.substring(2)}
        </h1>
      )
    } else if (line.match(/^[*-]\s+/)) {
      flushParagraph()
      currentList.push(line.replace(/^[*-]\s+/, ''))
    } else if (line.trim() === '') {
      flushList()
      flushParagraph()
    } else {
      flushList()
      currentParagraph.push(line)
    }
  })

  flushTable()
  flushList()
  flushParagraph()

  return elements
}
