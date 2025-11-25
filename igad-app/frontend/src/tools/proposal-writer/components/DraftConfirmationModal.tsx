import { AlertTriangle } from 'lucide-react'
import styles from './DraftConfirmationModal.module.css'

interface DraftConfirmationModalProps {
  isOpen: boolean
  proposalCode?: string
  onKeepDraft: () => void
  onDeleteDraft: () => void
  isDeleting?: boolean
}

export function DraftConfirmationModal({
  isOpen,
  proposalCode,
  onKeepDraft,
  onDeleteDraft,
  isDeleting = false,
}: DraftConfirmationModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Icon */}
        <div className={styles.iconContainer}>
          <AlertTriangle className={styles.icon} size={48} />
        </div>

        {/* Title */}
        <h2 className={styles.title}>You have an unsaved draft</h2>

        {/* Description */}
        <p className={styles.description}>
          You're about to leave the Proposal Writer. What would you like to do with your draft{' '}
          {proposalCode && <span className={styles.proposalCode}>{proposalCode}</span>}?
        </p>

        {/* Information Box */}
        <div className={styles.infoBox}>
          <div className={styles.infoItem}>
            <div className={styles.infoDot}></div>
            <span className={styles.infoText}>
              <strong>Keep Draft:</strong> You can continue working on it later
            </span>
          </div>
          <div className={styles.infoItem}>
            <div className={styles.infoDot}></div>
            <span className={styles.infoText}>
              <strong>Delete Draft:</strong> All progress will be permanently lost
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.buttonSecondary} onClick={onDeleteDraft} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Draft'}
          </button>
          <button className={styles.buttonPrimary} onClick={onKeepDraft} disabled={isDeleting}>
            Keep Draft & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
