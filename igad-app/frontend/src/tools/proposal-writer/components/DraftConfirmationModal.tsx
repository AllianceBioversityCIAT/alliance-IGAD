import { AlertTriangle, Save, Trash2, ArrowLeft } from 'lucide-react'
import styles from './DraftConfirmationModal.module.css'

interface DraftConfirmationModalProps {
  isOpen: boolean
  proposalCode?: string
  onSaveAndClose: () => void
  onKeepDraft: () => void
  onDeleteDraft: () => void
  isSaving?: boolean
  isDeleting?: boolean
}

export function DraftConfirmationModal({
  isOpen,
  proposalCode,
  onSaveAndClose,
  onKeepDraft,
  onDeleteDraft,
  isSaving = false,
  isDeleting = false,
}: DraftConfirmationModalProps) {
  if (!isOpen) {
    return null
  }

  const isDisabled = isSaving || isDeleting

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
            <Save size={16} className={styles.infoIcon} />
            <span className={styles.infoText}>
              <strong>Save and Close:</strong> Save your progress and go to Dashboard
            </span>
          </div>
          <div className={styles.infoItem}>
            <ArrowLeft size={16} className={styles.infoIcon} />
            <span className={styles.infoText}>
              <strong>Keep Draft & Continue:</strong> Stay and continue working
            </span>
          </div>
          <div className={styles.infoItem}>
            <Trash2 size={16} className={styles.infoIconDanger} />
            <span className={styles.infoText}>
              <strong>Delete Draft:</strong> All progress will be permanently lost
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            className={styles.buttonDanger}
            onClick={onDeleteDraft}
            disabled={isDisabled}
          >
            {isDeleting ? 'Deleting...' : 'Delete Draft'}
          </button>
          <button
            className={styles.buttonSecondary}
            onClick={onKeepDraft}
            disabled={isDisabled}
          >
            Keep Draft & Continue
          </button>
          <button
            className={styles.buttonPrimary}
            onClick={onSaveAndClose}
            disabled={isDisabled}
          >
            {isSaving ? 'Saving...' : 'Save and Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
