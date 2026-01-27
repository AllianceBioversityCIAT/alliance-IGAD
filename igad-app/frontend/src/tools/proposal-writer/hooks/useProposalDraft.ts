import { useEffect, useCallback } from 'react'
import type { RFPAnalysis } from '../types/analysis'

const DRAFT_KEYS = {
  PROPOSAL_ID: 'draft_proposal_id',
  PROPOSAL_CODE: 'draft_proposal_code',
  FORM_DATA: 'draft_form_data',
  RFP_ANALYSIS: 'draft_rfp_analysis',
}

export function useProposalDraft() {
  // Save proposal ID
  const saveProposalId = (id: string) => {
    localStorage.setItem(DRAFT_KEYS.PROPOSAL_ID, id)
  }

  // Save proposal code
  const saveProposalCode = (code: string) => {
    localStorage.setItem(DRAFT_KEYS.PROPOSAL_CODE, code)
  }

  // Save form data
  const saveFormData = (data: {
    uploadedFiles: Record<string, (File | string)[]>
    textInputs: Record<string, string>
  }) => {
    localStorage.setItem(DRAFT_KEYS.FORM_DATA, JSON.stringify(data))
  }

  // Save RFP analysis
  const saveRfpAnalysis = (analysis: RFPAnalysis | null) => {
    localStorage.setItem(DRAFT_KEYS.RFP_ANALYSIS, JSON.stringify(analysis))
  }

  // Load all draft data
  const loadDraft = useCallback(() => {
    const proposalId = localStorage.getItem(DRAFT_KEYS.PROPOSAL_ID)
    const proposalCode = localStorage.getItem(DRAFT_KEYS.PROPOSAL_CODE)
    const formDataStr = localStorage.getItem(DRAFT_KEYS.FORM_DATA)
    const rfpAnalysisStr = localStorage.getItem(DRAFT_KEYS.RFP_ANALYSIS)

    let formData = null
    let rfpAnalysis = null

    try {
      if (formDataStr) {
        formData = JSON.parse(formDataStr)
      }
      if (rfpAnalysisStr) {
        rfpAnalysis = JSON.parse(rfpAnalysisStr)
      }
    } catch (e) {
      // Removed console.error
    }

    return {
      proposalId: proposalId || undefined,
      proposalCode: proposalCode || undefined,
      formData,
      rfpAnalysis,
    }
  }, [])

  // Clear all draft data
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEYS.PROPOSAL_ID)
    localStorage.removeItem(DRAFT_KEYS.PROPOSAL_CODE)
    localStorage.removeItem(DRAFT_KEYS.FORM_DATA)
    localStorage.removeItem(DRAFT_KEYS.RFP_ANALYSIS)
  }

  // Check if draft exists
  const hasDraft = () => {
    return !!localStorage.getItem(DRAFT_KEYS.PROPOSAL_ID)
  }

  return {
    saveProposalId,
    saveProposalCode,
    saveFormData,
    saveRfpAnalysis,
    loadDraft,
    clearDraft,
    hasDraft,
  }
}

// Also clear draft when user logs out
export function useClearDraftOnLogout() {
  const { clearDraft } = useProposalDraft()

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // If auth token is removed, clear draft
      if (e.key === 'authToken' && !e.newValue) {
        clearDraft()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [clearDraft])
}
