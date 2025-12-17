import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, FileEdit, Clock, Eye, Archive } from 'lucide-react'
import styles from '../pages/proposalWriter.module.css'

type ProposalStatus = 'draft' | 'in_progress' | 'review' | 'completed' | 'archived'

interface ProposalSecondaryNavbarProps {
  proposalCode?: string
  proposalStatus?: ProposalStatus
  isLoading?: boolean
  onSaveAndClose?: () => void
  isSaving?: boolean
}

// Status badge configuration
const STATUS_CONFIG: Record<
  ProposalStatus,
  {
    label: string
    className: string
    icon: typeof CheckCircle
  }
> = {
  draft: {
    label: 'Draft',
    className: 'statusBadgeDraft',
    icon: FileEdit,
  },
  in_progress: {
    label: 'In Progress',
    className: 'statusBadgeInProgress',
    icon: Clock,
  },
  review: {
    label: 'Review',
    className: 'statusBadgeReview',
    icon: Eye,
  },
  completed: {
    label: 'Completed',
    className: 'statusBadgeCompleted',
    icon: CheckCircle,
  },
  archived: {
    label: 'Archived',
    className: 'statusBadgeArchived',
    icon: Archive,
  },
}

export function ProposalSecondaryNavbar({
  proposalCode,
  proposalStatus = 'draft',
  isLoading = false,
  onSaveAndClose,
  isSaving = false,
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

  const handleSaveAndClose = () => {
    if (onSaveAndClose && !isSaving) {
      onSaveAndClose()
    }
  }

  // Button is disabled if: loading, no callback provided, currently saving, or no proposal exists
  const isSaveDisabled = isLoading || !onSaveAndClose || isSaving || !proposalCode

  // Get status badge config
  const statusConfig = STATUS_CONFIG[proposalStatus] || STATUS_CONFIG.draft
  const StatusIcon = statusConfig.icon

  return (
    <div className={styles.secondaryNavbar}>
      <div className={styles.secondaryNavbarContent}>
        <div className={styles.breadcrumb}>
          <span>Proposal Writer</span>
          {isLoading ? (
            <span className={styles.proposalCodeSkeleton}></span>
          ) : proposalCode ? (
            <>
              <span className={styles.proposalCode}>
                <span className={styles.proposalCodeDivider}>•</span>
                {proposalCode}
              </span>
              <span className={`${styles.statusBadge} ${styles[statusConfig.className]}`}>
                <StatusIcon size={12} />
                {statusConfig.label}
              </span>
            </>
          ) : null}
        </div>
        <div className={styles.navbarButtons}>
          <button className={styles.promptManagerButton} onClick={handlePromptManagerClick}>
            Prompt Manager
          </button>
          <button
            className={styles.saveAndCloseButton}
            disabled={isSaveDisabled}
            onClick={handleSaveAndClose}
          >
            {isSaving ? (
              <>
                <span className={styles.buttonSpinner}></span>
                Saving...
              </>
            ) : (
              'Save and close'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
