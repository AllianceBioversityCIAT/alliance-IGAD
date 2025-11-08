import { ProposalSection, SECTION_LABELS } from '../../../types/prompt'
import styles from './PromptFilters.module.css'

interface PromptFiltersProps {
  filters: {
    section?: ProposalSection
    status?: 'draft' | 'published'
    tag?: string
    search?: string
  }
  onChange: (filters: any) => void
}

export function PromptFilters({ filters, onChange }: PromptFiltersProps) {
  const handleSectionChange = (section: string) => {
    onChange({
      ...filters,
      section: section === 'all' ? undefined : section as ProposalSection
    })
  }

  const handleStatusChange = (status: string) => {
    onChange({
      ...filters,
      status: status === 'all' ? undefined : status as 'draft' | 'published'
    })
  }

  const handleTagChange = (tag: string) => {
    onChange({
      ...filters,
      tag: tag.trim() || undefined
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.filterGroup}>
        <label className={styles.label}>Section</label>
        <select
          value={filters.section || 'all'}
          onChange={(e) => handleSectionChange(e.target.value)}
          className={styles.select}
        >
          <option value="all">All Sections</option>
          {Object.entries(SECTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.label}>Status</label>
        <select
          value={filters.status || 'all'}
          onChange={(e) => handleStatusChange(e.target.value)}
          className={styles.select}
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.label}>Tag</label>
        <input
          type="text"
          placeholder="Filter by tag..."
          value={filters.tag || ''}
          onChange={(e) => handleTagChange(e.target.value)}
          className={styles.input}
        />
      </div>
    </div>
  )
}
