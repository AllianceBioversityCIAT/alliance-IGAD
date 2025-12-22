import { ProposalSection, SECTION_LABELS, PROMPT_CATEGORIES } from '@/types/prompt'
import styles from './PromptFilters.module.css'

interface PromptFiltersProps {
  filters: {
    section?: ProposalSection
    sub_section?: string
    category?: string
    tag?: string
    search?: string
    route?: string
    is_active?: boolean
  }
  onChange: (filters: {
    section?: ProposalSection | string
    sub_section?: string
    category?: string
    tag?: string
    search?: string
    route?: string
    is_active?: boolean
  }) => void
}

export function PromptFilters({ filters, onChange }: PromptFiltersProps) {
  const handleSectionChange = (section: string) => {
    onChange({
      ...filters,
      section: section === 'all' ? undefined : (section as ProposalSection),
    })
  }

  const handleActiveChange = (active: string) => {
    onChange({
      ...filters,
      is_active: active === 'all' ? undefined : active === 'true',
    })
  }

  const handleSearchChange = (search: string) => {
    onChange({
      ...filters,
      search: search || undefined,
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.filterGroup}>
        <label className={styles.label}>Search</label>
        <input
          type="text"
          placeholder="Search in name, content, route, tags..."
          value={filters.search || ''}
          onChange={e => handleSearchChange(e.target.value)}
          className={styles.input}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.label}>Section</label>
        <select
          value={filters.section || 'all'}
          onChange={e => handleSectionChange(e.target.value)}
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
        <label className={styles.label}>Sub-section</label>
        <input
          type="text"
          placeholder="Filter by sub-section..."
          value={filters.sub_section || ''}
          onChange={e => onChange({ ...filters, sub_section: e.target.value || undefined })}
          className={styles.input}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.label}>Category</label>
        <select
          value={filters.category || 'all'}
          onChange={e =>
            onChange({
              ...filters,
              category: e.target.value === 'all' ? undefined : e.target.value,
            })
          }
          className={styles.select}
        >
          <option value="all">All Categories</option>
          {PROMPT_CATEGORIES.map(category => (
            <option key={category} value={category}>
              {category}
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
          onChange={e => onChange({ ...filters, route: e.target.value })}
          className={styles.input}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.label}>Active Status</label>
        <select
          value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
          onChange={e => handleActiveChange(e.target.value)}
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
          onChange={e => onChange({ ...filters, tag: e.target.value })}
          className={styles.input}
        />
      </div>
    </div>
  )
}
