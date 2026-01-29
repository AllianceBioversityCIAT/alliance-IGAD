/**
 * useStepCompletion Hook
 *
 * Provides step completion utilities for multi-step workflows.
 * Uses backend-computed completion data to ensure persistence across
 * page refreshes, browser changes, and device changes.
 */

import { useMemo } from 'react'

export interface StepCompletionResult {
  /** Array of completed step numbers */
  completedSteps: number[]
  /** Check if a specific step is complete */
  isStepComplete: (step: number) => boolean
  /** Get progress percentage (0-100) */
  getProgress: () => number
  /** Get count of completed steps */
  completedCount: number
}

/**
 * Hook to manage step completion state for multi-step workflows.
 *
 * @param completedSteps - Array of completed step numbers from backend
 * @param totalSteps - Total number of steps in the workflow
 * @returns Step completion utilities
 *
 * @example
 * ```tsx
 * const { completedSteps, isStepComplete, getProgress } = useStepCompletion(
 *   newsletter?.completed_steps ?? [],
 *   4
 * )
 *
 * // Check if step 2 is complete
 * const step2Done = isStepComplete(2)
 *
 * // Get progress percentage
 * const progressPercent = getProgress() // e.g., 50
 * ```
 */
export function useStepCompletion(
  completedSteps: number[] = [],
  totalSteps: number
): StepCompletionResult {
  const result = useMemo(() => {
    const isStepComplete = (step: number): boolean => {
      return completedSteps.includes(step)
    }

    const getProgress = (): number => {
      if (totalSteps === 0) {
        return 0
      }
      return Math.round((completedSteps.length / totalSteps) * 100)
    }

    return {
      completedSteps,
      isStepComplete,
      getProgress,
      completedCount: completedSteps.length,
    }
  }, [completedSteps, totalSteps])

  return result
}

/**
 * Compute completed steps from current_step (fallback for older data).
 *
 * This provides backward compatibility when backend doesn't return
 * completed_steps field. Should only be used as a fallback.
 *
 * @param currentStep - Current step number from backend
 * @returns Array of completed step numbers
 */
export function computeCompletedStepsFromCurrentStep(currentStep: number): number[] {
  const completed: number[] = []
  for (let i = 1; i < currentStep; i++) {
    completed.push(i)
  }
  return completed
}

/**
 * Merge backend-computed and locally-computed completion.
 *
 * Prefers backend-computed steps but falls back to current_step
 * calculation if backend data is not available.
 *
 * @param backendCompletedSteps - Completed steps from backend (may be undefined)
 * @param currentStep - Current step number from backend
 * @returns Array of completed step numbers
 */
export function getEffectiveCompletedSteps(
  backendCompletedSteps: number[] | undefined,
  currentStep: number
): number[] {
  // Prefer backend-computed steps if available
  if (backendCompletedSteps && backendCompletedSteps.length > 0) {
    return backendCompletedSteps
  }

  // Fallback to computing from current_step
  return computeCompletedStepsFromCurrentStep(currentStep)
}
