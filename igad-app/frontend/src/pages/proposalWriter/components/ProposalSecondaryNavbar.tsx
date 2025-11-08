import { BarChart3 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from '../proposalWriter.module.css'

export function ProposalSecondaryNavbar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handlePromptManagerClick = () => {
    // Extract current route and determine section
    const currentPath = location.pathname
    const section = 'proposal_writer' // Default section for proposal writer
    
    // Navigate to prompt manager with context
    navigate(`/admin/prompts?from=${encodeURIComponent(currentPath)}&section=${section}`)
  }

  return (
    <div className={styles.secondaryNavbar}>
      <div className={styles.secondaryNavbarContent}>
        <div className={styles.breadcrumb}>
          <BarChart3 size={11} />
          <span>Proposal Writer</span>
        </div>
        <button 
          className={styles.promptManagerButton}
          onClick={handlePromptManagerClick}
        >
          Prompt Manager
        </button>
      </div>
    </div>
  )
}
