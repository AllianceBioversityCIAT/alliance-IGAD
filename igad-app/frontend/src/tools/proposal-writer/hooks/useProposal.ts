import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { proposalService, Proposal } from '@/tools/proposal-writer/services/proposalService'

export function useProposal(proposalId?: string) {
  const queryClient = useQueryClient()

  // Get single proposal
  const {
    data: proposal,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: () => proposalService.getProposal(proposalId!),
    enabled: !!proposalId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update proposal mutation
  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Proposal>) =>
      proposalService.updateProposal(proposalId!, updates),
    onSuccess: updatedProposal => {
      queryClient.setQueryData(['proposal', proposalId], updatedProposal)
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })

  // Generate content mutation
  const generateContentMutation = useMutation({
    mutationFn: ({
      sectionId,
      contextData,
    }: {
      sectionId: string
      contextData?: Record<string, unknown>
    }) => proposalService.generateSectionContent(proposalId!, sectionId, contextData),
    onSuccess: () => {
      refetch() // Refresh proposal data after content generation
    },
  })

  // Improve content mutation
  const improveContentMutation = useMutation({
    mutationFn: ({ sectionId, improvementType }: { sectionId: string; improvementType?: string }) =>
      proposalService.improveSectionContent(proposalId!, sectionId, improvementType),
    onSuccess: () => {
      refetch() // Refresh proposal data after content improvement
    },
  })

  // Generate summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: () => proposalService.generateExecutiveSummary(proposalId!),
    onSuccess: () => {
      refetch() // Refresh proposal data after summary generation
    },
  })

  // Update form data
  const updateFormData = async (formData: {
    uploadedFiles?: Record<string, (File | string)[]>
    textInputs?: Record<string, string>
  }) => {
    if (!proposalId) {
      return
    }

    const updatedProposal = await proposalService.updateFormData(proposalId, formData)
    queryClient.setQueryData(['proposal', proposalId], updatedProposal)
    return updatedProposal
  }

  return {
    proposal,
    isLoading,
    error,
    refetch,
    updateProposal: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    generateContent: generateContentMutation.mutate,
    isGenerating: generateContentMutation.isPending,
    generateError: generateContentMutation.error,
    improveContent: improveContentMutation.mutate,
    isImproving: improveContentMutation.isPending,
    improveError: improveContentMutation.error,
    generateSummary: generateSummaryMutation.mutate,
    isGeneratingSummary: generateSummaryMutation.isPending,
    summaryError: generateSummaryMutation.error,
    updateFormData,
  }
}

export function useProposals() {
  const queryClient = useQueryClient()

  // List all proposals
  const {
    data: proposals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['proposals'],
    queryFn: proposalService.listProposals,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Create proposal mutation
  const createMutation = useMutation({
    mutationFn: proposalService.createProposal,
    onSuccess: newProposal => {
      queryClient.setQueryData(['proposals'], (old: Proposal[] = []) => [
        newProposal,
        ...old,
      ])
      queryClient.setQueryData(['proposal', newProposal.id], newProposal)
    },
  })

  // Delete proposal mutation
  const deleteMutation = useMutation({
    mutationFn: proposalService.deleteProposal,
    onSuccess: (_, proposalId) => {
      queryClient.setQueryData(['proposals'], (old: Proposal[] = []) =>
        old.filter(p => p.id !== proposalId)
      )
      queryClient.removeQueries({ queryKey: ['proposal', proposalId] })
    },
  })

  return {
    proposals,
    isLoading,
    error,
    refetch,
    createProposal: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    deleteProposal: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
  }
}

export function useProposalSuggestions(proposalId?: string) {
  const {
    data: suggestions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['proposal-suggestions', proposalId],
    queryFn: () => proposalService.getSuggestions(proposalId!),
    enabled: !!proposalId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })

  return {
    suggestions,
    isLoading,
    error,
    refetch,
  }
}
