import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  newsletterService,
  NewsletterConfig,
  UpdateNewsletterRequest,
} from '../services/newsletterService'
import { useToast } from '@/shared/components/ui/ToastContainer'

interface UseNewsletterOptions {
  newsletterCode?: string
  autoSaveDelay?: number
}

interface UseNewsletterReturn {
  newsletter: NewsletterConfig | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  updateConfig: (updates: UpdateNewsletterRequest) => void
  createNewsletter: (title?: string) => Promise<NewsletterConfig | null>
  refreshNewsletter: () => Promise<void>
}

export function useNewsletter({
  newsletterCode,
  autoSaveDelay = 500,
}: UseNewsletterOptions): UseNewsletterReturn {
  const navigate = useNavigate()
  const { showError } = useToast()

  const [newsletter, setNewsletter] = useState<NewsletterConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ref to store pending updates for debouncing
  const pendingUpdates = useRef<UpdateNewsletterRequest>({})
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch newsletter data
  const fetchNewsletter = useCallback(async () => {
    if (!newsletterCode) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await newsletterService.getNewsletter(newsletterCode)
      setNewsletter(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load newsletter'
      setError(message)
      showError('Error loading newsletter', message)
    } finally {
      setIsLoading(false)
    }
  }, [newsletterCode, showError])

  // Load newsletter on mount or code change
  useEffect(() => {
    if (newsletterCode) {
      fetchNewsletter()
    }
  }, [newsletterCode, fetchNewsletter])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Save pending updates to backend
  const savePendingUpdates = useCallback(async () => {
    if (!newsletterCode || Object.keys(pendingUpdates.current).length === 0) {
      return
    }

    const updates = { ...pendingUpdates.current }
    pendingUpdates.current = {}

    setIsSaving(true)

    try {
      await newsletterService.updateNewsletter(newsletterCode, updates)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes'
      showError('Auto-save failed', message)
      // Restore pending updates on failure
      pendingUpdates.current = { ...pendingUpdates.current, ...updates }
    } finally {
      setIsSaving(false)
    }
  }, [newsletterCode, showError])

  // Update config with debounced auto-save
  const updateConfig = useCallback(
    (updates: UpdateNewsletterRequest) => {
      // Update local state immediately for responsiveness
      setNewsletter(prev => {
        if (!prev) {
          return prev
        }
        return {
          ...prev,
          ...updates,
        }
      })

      // Merge into pending updates
      pendingUpdates.current = {
        ...pendingUpdates.current,
        ...updates,
      }

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        savePendingUpdates()
      }, autoSaveDelay)
    },
    [autoSaveDelay, savePendingUpdates]
  )

  // Create a new newsletter
  const createNewsletter = useCallback(
    async (title?: string): Promise<NewsletterConfig | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const newNewsletter = await newsletterService.createNewsletter({ title })
        setNewsletter(newNewsletter)

        // Navigate to the new newsletter's step 1
        navigate(`/newsletter-generator/${newNewsletter.newsletterCode}/step-1`)

        return newNewsletter
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create newsletter'
        setError(message)
        showError('Error creating newsletter', message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [navigate, showError]
  )

  // Refresh newsletter data
  const refreshNewsletter = useCallback(async () => {
    await fetchNewsletter()
  }, [fetchNewsletter])

  return {
    newsletter,
    isLoading,
    isSaving,
    error,
    updateConfig,
    createNewsletter,
    refreshNewsletter,
  }
}
