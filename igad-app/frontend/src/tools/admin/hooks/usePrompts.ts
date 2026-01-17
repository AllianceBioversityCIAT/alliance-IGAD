import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { promptService } from '@/tools/admin/services/promptService'
import type {
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptPreviewRequest,
  ProposalSection,
} from '@/types/prompt'

interface UsePromptsFilters {
  section?: ProposalSection
  status?: 'draft' | 'published'
  tag?: string
  search?: string
  route?: string
  is_active?: boolean
}

export function usePrompts(filters?: UsePromptsFilters) {
  const queryClient = useQueryClient()
  const [currentPage, setCurrentPage] = useState(0)
  const limit = 20

  // List prompts query
  const {
    data: promptsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['prompts', filters, currentPage],
    queryFn: () =>
      promptService.listPrompts({
        ...filters,
        limit,
        offset: currentPage * limit,
      }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Create prompt mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePromptRequest) => promptService.createPrompt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })

  // Update prompt mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePromptRequest }) =>
      promptService.updatePrompt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })

  // Publish prompt mutation
  const publishMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      promptService.publishPrompt(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })

  // Delete prompt mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version?: number }) =>
      promptService.deletePrompt(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => promptService.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })

  // Preview prompt mutation
  const previewMutation = useMutation({
    mutationFn: (data: PromptPreviewRequest) => promptService.previewPrompt(data),
  })

  return {
    // Data
    prompts: promptsData?.prompts || [],
    total: promptsData?.total || 0,
    hasMore: promptsData?.has_more || false,
    currentPage,

    // Loading states
    isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isPublishing: publishMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPreviewing: previewMutation.isPending,
    isTogglingActive: toggleActiveMutation.isPending,

    // Error states
    error,
    createError: createMutation.error,
    updateError: updateMutation.error,
    publishError: publishMutation.error,
    deleteError: deleteMutation.error,
    previewError: previewMutation.error,

    // Preview data
    previewData: previewMutation.data,

    // Actions
    createPrompt: createMutation.mutateAsync,
    updatePrompt: updateMutation.mutateAsync,
    publishPrompt: publishMutation.mutateAsync,
    deletePrompt: deleteMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    previewPrompt: previewMutation.mutateAsync,
    refetch,

    // Pagination
    setCurrentPage,
    nextPage: () => setCurrentPage(prev => prev + 1),
    prevPage: () => setCurrentPage(prev => Math.max(0, prev - 1)),
  }
}

export function usePrompt(id: string, version?: number | 'latest') {
  return useQuery({
    queryKey: ['prompt', id, version],
    queryFn: () => promptService.getPrompt(id, version),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePromptBySection(section: ProposalSection) {
  return useQuery({
    queryKey: ['prompt-by-section', section],
    queryFn: () => promptService.getPromptBySection(section),
    staleTime: 2 * 60 * 1000, // 2 minutes cache for runtime
  })
}
