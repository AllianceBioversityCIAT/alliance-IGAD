import { useState, useEffect } from 'react'

/**
 * useResponsiveIconSize Hook
 *
 * Returns the appropriate icon size based on current screen width.
 * Uses mobile-first responsive breakpoints:
 * - Mobile (< 640px): 24px
 * - Tablet (640px - 1023px): 28px
 * - Desktop (>= 1024px): 32px
 *
 * @returns {number} Icon size in pixels
 *
 * @example
 * const iconSize = useResponsiveIconSize()
 * <Edit size={iconSize} />
 */
export function useResponsiveIconSize(): number {
  const [iconSize, setIconSize] = useState<number>(() => {
    // Initialize based on current window width (SSR-safe)
    if (typeof window === 'undefined') return 24

    const width = window.innerWidth
    if (width >= 1024) return 32
    if (width >= 640) return 28
    return 24
  })

  useEffect(() => {
    // Update icon size on window resize
    const updateIconSize = () => {
      const width = window.innerWidth

      if (width >= 1024) {
        setIconSize(32)
      } else if (width >= 640) {
        setIconSize(28)
      } else {
        setIconSize(24)
      }
    }

    // Debounce resize events for performance
    let timeoutId: NodeJS.Timeout
    const debouncedUpdate = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateIconSize, 150)
    }

    window.addEventListener('resize', debouncedUpdate)

    // Cleanup
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', debouncedUpdate)
    }
  }, [])

  return iconSize
}
