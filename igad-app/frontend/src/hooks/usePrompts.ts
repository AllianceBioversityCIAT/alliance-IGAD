import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { promptService } from '../services/promptService'
import type {
  Prompt,
  CreatePromptRequest,
  UpdatePromptRequest,
  PromptPreviewRequest,
  ProposalSection
} from '../types/prompt'

interface UsePromptsFilters {
  section?: ProposalSection
  status?: 'draft' | 'published'
  tag?: string
  search?: string
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
    refetch
  } = useQuery(
    ['prompts', filters, currentPage],
    () => promptService.listPrompts({
      ...filters,
      limit,
      offset: currentPage * limit
    }),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Create prompt mutation
  const createMutation = useMutation(
    (data: CreatePromptRequest) => promptService.createPrompt(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompts'])
      },
    }
  )

  // Update prompt mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: UpdatePromptRequest }) =>
      promptService.updatePrompt(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompts'])
      },
    }
  )

  // Publish prompt mutation
  const publishMutation = useMutation(
    ({ id, version }: { id: string; version: number }) =>
      promptService.publishPrompt(id, version),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompts'])
      },
    }
  )

  // Delete prompt mutation
  const deleteMutation = useMutation(
    ({ id, version }: { id: string; version?: number }) =>
      promptService.deletePrompt(id, version),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['prompts'])
      },
    }
  )

  // Preview prompt mutation
  const previewMutation = useMutation(
    (data: PromptPreviewRequest) => promptService.previewPrompt(data)
  )

  return {
    // Data
    prompts: promptsData?.prompts || [],
    total: promptsData?.total || 0,
    hasMore: promptsData?.has_more || false,
    currentPage,
    
    // Loading states
    isLoading,
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isPublishing: publishMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
    isPreviewing: previewMutation.isLoading,
    
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
    previewPrompt: previewMutation.mutateAsync,
    refetch,
    
    // Pagination
    setCurrentPage,
    nextPage: () => setCurrentPage(prev => prev + 1),
    prevPage: () => setCurrentPage(prev => Math.max(0, prev - 1)),
  }
}

export function usePrompt(id: string, version?: number | 'latest') {
  return useQuery(
    ['prompt', id, version],
    () => promptService.getPrompt(id, version),
    {
      enabled: !!id,
      staleTime: 5 * 60 * 1000,
    }
  )
}

export function usePromptBySection(section: ProposalSection) {
  return useQuery(
    ['prompt-by-section', section],
    () => promptService.getPromptBySection(section),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes cache for runtime
    }
  )
}
