import { CheckCircle, Clock } from 'lucide-react'
import styles from './PromptStatusBadge.module.css'

interface PromptStatusBadgeProps {
  status: 'draft' | 'published'
}

export function PromptStatusBadge({ status }: PromptStatusBadgeProps) {
  const isDraft = status === 'draft'

  return (
    <div className={`${styles.badge} ${isDraft ? styles.draft : styles.published}`}>
      {isDraft ? <Clock size={12} /> : <CheckCircle size={12} />}
      <span className={styles.text}>{isDraft ? 'Draft' : 'Published'}</span>
    </div>
  )
}
