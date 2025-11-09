import { ProposalSection, SECTION_LABELS } from '../../../types/prompt'
import styles from './PromptFilters.module.css'

interface PromptFiltersProps {
  filters: {
    section?: ProposalSection
    tag?: string
    search?: string
    route?: string
    is_active?: boolean
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

  const handleActiveChange = (active: string) => {
    onChange({
      ...filters,
      is_active: active === 'all' ? undefined : active === 'true'
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
        <label className={styles.label}>Route</label>
        <input
          type="text"
          placeholder="Filter by route..."
          value={filters.route || ''}
          onChange={(e) => handleRouteChange(e.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.label}>Active Status</label>
        <select
          value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
          onChange={(e) => handleActiveChange(e.target.value)}
          className={styles.select}
        >
          <option value="all">All</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
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
