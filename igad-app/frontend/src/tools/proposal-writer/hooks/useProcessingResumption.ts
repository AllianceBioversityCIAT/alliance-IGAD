import { useState, useEffect, useRef, useCallback } from 'react'
import { proposalService, AllProcessingStatus, OperationStatus } from '../services/proposalService'
import type {
  RFPAnalysis,
  ConceptAnalysis,
  ConceptDocument,
  StructureWorkplanAnalysis,
  DraftFeedbackAnalysis,
} from '../types/analysis'

// Polling configuration
const MAX_POLLING_ATTEMPTS = 100 // ~5 minutes max

/** Dynamic polling interval with exponential backoff */
const getPollingInterval = (attempts: number): number => {
  if (attempts < 5) return 2000   // First 5 polls: every 2s
  if (attempts < 10) return 3000  // Next 5 polls: every 3s
  return 5000                      // After 10 polls: every 5s
}

// Operation names for display
const OPERATION_NAMES: Record<keyof AllProcessingStatus, string> = {
  step1_rfp: 'RFP Analysis',
  step1_reference: 'Reference Proposals Analysis',
  step1_concept: 'Concept Analysis',
  step2_concept_document: 'Concept Document Generation',
  step3_structure: 'Structure Analysis',
  step3_ai_template: 'AI Proposal Template',
  step4_draft_feedback: 'Draft Feedback Analysis',
}

export interface UseProcessingResumptionOptions {
  proposalId: string | undefined
  enabled: boolean // Only activate when proposal is loaded

  // Callbacks when operations complete
  onRfpAnalysisComplete?: (data: RFPAnalysis) => void
  onReferenceAnalysisComplete?: (data: unknown) => void
  onConceptAnalysisComplete?: (data: ConceptAnalysis) => void
  onConceptDocumentComplete?: (data: ConceptDocument) => void
  onStructureAnalysisComplete?: (data: StructureWorkplanAnalysis) => void
  onAiTemplateComplete?: (data: unknown) => void
  onDraftFeedbackComplete?: (data: DraftFeedbackAnalysis) => void

  // Callback when an operation fails
  onOperationError?: (operationName: string, error: string) => void

  // Callback when an operation that was processing completes successfully after resumption
  onOperationResumed?: (operationName: string) => void
}

export interface UseProcessingResumptionResult {
  /** True while checking initial status */
  isCheckingStatus: boolean
  /** List of operation names currently being polled */
  resumingOperations: string[]
  /** True if any operations are being resumed */
  isResuming: boolean
  /** Manually trigger status check */
  checkAndResumeOperations: () => Promise<void>
}

type PollingState = {
  timeoutId: NodeJS.Timeout
  attempts: number
}

export function useProcessingResumption(
  options: UseProcessingResumptionOptions
): UseProcessingResumptionResult {
  const {
    proposalId,
    enabled,
    onRfpAnalysisComplete,
    onReferenceAnalysisComplete,
    onConceptAnalysisComplete,
    onConceptDocumentComplete,
    onStructureAnalysisComplete,
    onAiTemplateComplete,
    onDraftFeedbackComplete,
    onOperationError,
    onOperationResumed,
  } = options

  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [resumingOperations, setResumingOperations] = useState<string[]>([])

  // Track active polling intervals
  const pollingStatesRef = useRef<Map<keyof AllProcessingStatus, PollingState>>(new Map())
  const hasCheckedRef = useRef(false)

  // Clean up a specific polling timeout
  const stopPolling = useCallback((operationKey: keyof AllProcessingStatus) => {
    const state = pollingStatesRef.current.get(operationKey)
    if (state) {
      clearTimeout(state.timeoutId)
      pollingStatesRef.current.delete(operationKey)
    }
    setResumingOperations(prev => prev.filter(op => op !== OPERATION_NAMES[operationKey]))
  }, [])

  // Clean up all polling timeouts
  const stopAllPolling = useCallback(() => {
    pollingStatesRef.current.forEach(state => {
      clearTimeout(state.timeoutId)
    })
    pollingStatesRef.current.clear()
    setResumingOperations([])
  }, [])

  // Get the status check function for a specific operation
  const getStatusChecker = useCallback(
    (operationKey: keyof AllProcessingStatus) => {
      if (!proposalId) {
        return null
      }

      switch (operationKey) {
        case 'step1_rfp':
          return async () => {
            const status = await proposalService.getStep1Status(proposalId)
            return {
              status: status.rfp_analysis?.status || 'not_started',
              data: status.rfp_analysis?.data,
              error: status.rfp_analysis?.error,
            } as OperationStatus
          }
        case 'step1_reference':
          return async () => {
            const status = await proposalService.getStep2Status(proposalId)
            return {
              status: status.reference_proposals_analysis?.status || 'not_started',
              data: status.reference_proposals_analysis?.data,
              error: status.reference_proposals_analysis?.error,
            } as OperationStatus
          }
        case 'step1_concept':
          return async () => {
            const status = await proposalService.getConceptStatus(proposalId)
            return {
              status: status.status || 'not_started',
              data: status.concept_analysis,
              error: status.error,
            } as OperationStatus
          }
        case 'step2_concept_document':
          return async () => {
            const status = await proposalService.getConceptDocumentStatus(proposalId)
            return {
              status: status.status || 'not_started',
              data: status.concept_document,
              error: status.error,
            } as OperationStatus
          }
        case 'step3_structure':
          return async () => {
            const status = await proposalService.getStructureWorkplanStatus(proposalId)
            return {
              status: status.status || 'not_started',
              data: status.data,
              error: status.error,
            } as OperationStatus
          }
        case 'step3_ai_template':
          return async () => {
            const status = await proposalService.getProposalTemplateStatus(proposalId)
            return {
              status: status.status || 'not_started',
              data: status.data,
              error: status.error,
            } as OperationStatus
          }
        case 'step4_draft_feedback':
          return async () => {
            const status = await proposalService.getDraftFeedbackStatus(proposalId)
            return {
              status: status.status || 'not_started',
              data: status.data,
              error: status.error,
            } as OperationStatus
          }
        default:
          return null
      }
    },
    [proposalId]
  )

  // Handle completion callback for an operation
  const handleOperationComplete = useCallback(
    (operationKey: keyof AllProcessingStatus, data: unknown) => {
      switch (operationKey) {
        case 'step1_rfp':
          onRfpAnalysisComplete?.(data as RFPAnalysis)
          break
        case 'step1_reference':
          onReferenceAnalysisComplete?.(data)
          break
        case 'step1_concept':
          onConceptAnalysisComplete?.(data as ConceptAnalysis)
          break
        case 'step2_concept_document':
          onConceptDocumentComplete?.(data as ConceptDocument)
          break
        case 'step3_structure':
          onStructureAnalysisComplete?.(data as StructureWorkplanAnalysis)
          break
        case 'step3_ai_template':
          onAiTemplateComplete?.(data)
          break
        case 'step4_draft_feedback':
          onDraftFeedbackComplete?.(data as DraftFeedbackAnalysis)
          break
      }
      onOperationResumed?.(OPERATION_NAMES[operationKey])
    },
    [
      onRfpAnalysisComplete,
      onReferenceAnalysisComplete,
      onConceptAnalysisComplete,
      onConceptDocumentComplete,
      onStructureAnalysisComplete,
      onAiTemplateComplete,
      onDraftFeedbackComplete,
      onOperationResumed,
    ]
  )

  // Start polling for a specific operation
  const startPolling = useCallback(
    (operationKey: keyof AllProcessingStatus) => {
      // Don't start if already polling
      if (pollingStatesRef.current.has(operationKey)) {
        return
      }

      const statusChecker = getStatusChecker(operationKey)
      if (!statusChecker) {
        return
      }

      const operationName = OPERATION_NAMES[operationKey]
      setResumingOperations(prev => [...prev, operationName])

      const poll = async () => {
        const state = pollingStatesRef.current.get(operationKey)
        if (!state) {
          return
        }

        state.attempts++

        // Check for timeout
        if (state.attempts >= MAX_POLLING_ATTEMPTS) {
          stopPolling(operationKey)
          onOperationError?.(operationName, 'Operation timed out after 5 minutes')
          return
        }

        try {
          const status = await statusChecker()

          if (status.status === 'completed' && status.data) {
            stopPolling(operationKey)
            handleOperationComplete(operationKey, status.data)
            return
          } else if (status.status === 'failed') {
            stopPolling(operationKey)
            onOperationError?.(operationName, status.error || 'Operation failed')
            return
          }
          // If still processing, schedule next poll with dynamic interval
        } catch {
          // Network error - continue polling, it might recover
        }

        const nextInterval = getPollingInterval(state.attempts)
        state.timeoutId = setTimeout(poll, nextInterval)
      }

      // Start first poll after initial interval
      const timeoutId = setTimeout(poll, getPollingInterval(0))
      pollingStatesRef.current.set(operationKey, { timeoutId, attempts: 0 })
    },
    [getStatusChecker, handleOperationComplete, onOperationError, stopPolling]
  )

  // Check all processing status and start polling for in-progress operations
  const checkAndResumeOperations = useCallback(async () => {
    if (!proposalId || !enabled) {
      return
    }

    setIsCheckingStatus(true)

    try {
      const allStatus = await proposalService.getAllProcessingStatus(proposalId)

      // Check each operation
      const operationKeys = Object.keys(allStatus) as (keyof AllProcessingStatus)[]

      for (const key of operationKeys) {
        const status = allStatus[key]

        if (status.status === 'processing') {
          // Operation is in progress - start polling
          // This is the ONLY case where we need to resume and show toasts
          startPolling(key)
        }
        // NOTE: We intentionally don't call callbacks for 'completed' or 'failed' operations
        // The parent component already loads completed data from localStorage/DynamoDB
        // We only need to resume polling for operations that are actually still processing
      }
    } catch {
      // Failed to check status - silently ignore
    } finally {
      setIsCheckingStatus(false)
    }
  }, [proposalId, enabled, startPolling])

  // Check status on mount (only once per proposal)
  useEffect(() => {
    if (!proposalId || !enabled || hasCheckedRef.current) {
      return
    }

    hasCheckedRef.current = true
    checkAndResumeOperations()

    return () => {
      stopAllPolling()
    }
  }, [proposalId, enabled, checkAndResumeOperations, stopAllPolling])

  // Reset hasCheckedRef when proposalId changes
  useEffect(() => {
    hasCheckedRef.current = false
    stopAllPolling()
  }, [proposalId, stopAllPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPolling()
    }
  }, [stopAllPolling])

  return {
    isCheckingStatus,
    resumingOperations,
    isResuming: resumingOperations.length > 0,
    checkAndResumeOperations,
  }
}
