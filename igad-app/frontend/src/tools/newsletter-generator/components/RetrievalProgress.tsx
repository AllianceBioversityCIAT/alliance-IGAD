/**
 * RetrievalProgress
 *
 * Shows the status of content retrieval from Knowledge Base.
 * Displays spinner during processing, success/error states with actions.
 */

import { CheckCircle, XCircle, Loader2, FileText, RefreshCw } from 'lucide-react'
import styles from './RetrievalProgress.module.css'

interface RetrievalProgressProps {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunksRetrieved: number
  error?: string
  onRetry?: () => void
}

export function RetrievalProgress({
  status,
  chunksRetrieved,
  error,
  onRetry,
}: RetrievalProgressProps) {
  if (status === 'pending') {
    return (
      <div className={styles.retrievalProgress}>
        <div className={`${styles.statusIcon} ${styles.statusPending}`}>
          <FileText size={20} />
        </div>
        <div className={styles.statusContent}>
          <span className={styles.statusText}>Ready to retrieve content</span>
          <span className={styles.statusHint}>
            Select topics above and click &ldquo;Retrieve Content&rdquo; to get started
          </span>
        </div>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className={styles.retrievalProgress}>
        <div className={`${styles.statusIcon} ${styles.statusProcessing}`}>
          <Loader2 size={20} className={styles.spinner} />
        </div>
        <div className={styles.statusContent}>
          <span className={styles.statusText}>Retrieving content from Knowledge Base...</span>
          <span className={styles.statusHint}>This usually takes a few seconds</span>
        </div>
      </div>
    )
  }

  if (status === 'completed') {
    return (
      <div className={styles.retrievalProgress}>
        <div className={`${styles.statusIcon} ${styles.statusCompleted}`}>
          <CheckCircle size={20} />
        </div>
        <div className={styles.statusContent}>
          <span className={styles.statusText}>
            Retrieved {chunksRetrieved} content chunk{chunksRetrieved !== 1 ? 's' : ''}
          </span>
          <span className={styles.statusHint}>Content is ready for outline generation</span>
        </div>
        {onRetry && (
          <button className={styles.retryButton} onClick={onRetry} title="Re-retrieve content">
            <RefreshCw size={14} />
            Re-retrieve
          </button>
        )}
      </div>
    )
  }

  // Failed status
  return (
    <div className={styles.retrievalProgress}>
      <div className={`${styles.statusIcon} ${styles.statusFailed}`}>
        <XCircle size={20} />
      </div>
      <div className={styles.statusContent}>
        <span className={styles.statusText}>Content retrieval failed</span>
        <span className={styles.statusError}>
          {error || 'An unexpected error occurred. Please try again.'}
        </span>
      </div>
      {onRetry && (
        <button className={styles.retryButtonPrimary} onClick={onRetry}>
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  )
}
