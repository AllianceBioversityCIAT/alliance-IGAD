import { useNavigate, useLocation } from 'react-router-dom'
import styles from '../pages/proposalWriter.module.css'

interface ProposalSecondaryNavbarProps {
  proposalCode?: string
  isLoading?: boolean
}

export function ProposalSecondaryNavbar({
  proposalCode,
  isLoading = false,
}: ProposalSecondaryNavbarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handlePromptManagerClick = () => {
    // Extract current route and determine section
    const currentPath = location.pathname
    const section = 'proposal_writer' // Default section for proposal writer

    // Navigate to prompt manager with context
    navigate(`/admin/prompt-manager?from=${encodeURIComponent(currentPath)}&section=${section}`)
  }

  return (
    <div className={styles.secondaryNavbar}>
      <div className={styles.secondaryNavbarContent}>
        <div className={styles.breadcrumb}>
          <span>Proposal Writer</span>
          {isLoading ? (
            <span className={styles.proposalCodeSkeleton}></span>
          ) : proposalCode ? (
            <span className={styles.proposalCode}>
              <span className={styles.proposalCodeDivider}>•</span>
              {proposalCode}
            </span>
          ) : null}
        </div>
        <div className={styles.navbarButtons}>
          <button className={styles.promptManagerButton} onClick={handlePromptManagerClick}>
            Prompt Manager
          </button>
          <button className={styles.saveAndCloseButton} disabled={true}>
            Save and close
          </button>
        </div>
      </div>
    </div>
  )
}
