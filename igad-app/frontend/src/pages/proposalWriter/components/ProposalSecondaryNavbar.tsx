import { BarChart3 } from 'lucide-react'
import styles from '../proposalWriter.module.css'

export function ProposalSecondaryNavbar() {
  return (
    <div className={styles.secondaryNavbar}>
      <div className={styles.secondaryNavbarContent}>
        <div className={styles.breadcrumb}>
          <BarChart3 size={11} />
          <span>Proposal Writer</span>
        </div>
        <button className={styles.promptManagerButton}>
          Prompt Manager
        </button>
      </div>
    </div>
  )
}
