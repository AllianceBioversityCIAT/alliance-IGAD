import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, FileEdit, Clock, Download } from 'lucide-react'
import styles from '../pages/newsletterGenerator.module.css'

type NewsletterStatus = 'draft' | 'processing' | 'completed' | 'exported'

interface NewsletterSecondaryNavbarProps {
  newsletterCode?: string
  newsletterStatus?: NewsletterStatus
  isLoading?: boolean
  onSaveAndClose?: () => void
  isSaving?: boolean
}

// Status badge configuration
const STATUS_CONFIG: Record<
  NewsletterStatus,
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
  processing: {
    label: 'Processing',
    className: 'statusBadgeProcessing',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    className: 'statusBadgeCompleted',
    icon: CheckCircle,
  },
  exported: {
    label: 'Exported',
    className: 'statusBadgeExported',
    icon: Download,
  },
}

export function NewsletterSecondaryNavbar({
  newsletterCode,
  newsletterStatus = 'draft',
  isLoading = false,
  onSaveAndClose,
  isSaving = false,
}: NewsletterSecondaryNavbarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handlePromptManagerClick = () => {
    // Extract current route and determine section
    const currentPath = location.pathname
    const section = 'newsletter_generator' // Section for newsletter generator

    // Navigate to prompt manager with context
    navigate(`/admin/prompt-manager?from=${encodeURIComponent(currentPath)}&section=${section}`)
  }

  const handleSaveAndClose = () => {
    if (onSaveAndClose && !isSaving) {
      onSaveAndClose()
    }
  }

  // Button is disabled if: loading, no callback provided, currently saving, or no newsletter exists
  const isSaveDisabled = isLoading || !onSaveAndClose || isSaving || !newsletterCode

  // Get status badge config
  const statusConfig = STATUS_CONFIG[newsletterStatus] || STATUS_CONFIG.draft
  const StatusIcon = statusConfig.icon

  return (
    <div className={styles.secondaryNavbar}>
      <div className={styles.secondaryNavbarContent}>
        <div className={styles.breadcrumb}>
          <span>Newsletter Generator</span>
          {isLoading ? (
            <span className={styles.newsletterCodeSkeleton}></span>
          ) : newsletterCode ? (
            <>
              <span className={styles.newsletterCode}>
                <span className={styles.newsletterCodeDivider}>•</span>
                {newsletterCode}
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
