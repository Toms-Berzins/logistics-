'use client'

import { useState, useEffect, useCallback } from 'react'
import { announceStatus, prefersReducedMotion, prefersHighContrast, prefersDarkMode } from '../lib/accessibility'

interface AccessibilityPreferences {
  reducedMotion: boolean
  highContrast: boolean
  darkMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  screenReader: boolean
}

export function useAccessibility() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reducedMotion: false,
    highContrast: false,
    darkMode: false,
    fontSize: 'medium',
    screenReader: false,
  })

  const [isClient, setIsClient] = useState(false)

  // Detect client-side to avoid hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Update preferences based on system settings
  useEffect(() => {
    if (!isClient) return

    const updatePreferences = () => {
      setPreferences(prev => ({
        ...prev,
        reducedMotion: prefersReducedMotion(),
        highContrast: prefersHighContrast(),
        darkMode: prefersDarkMode(),
        screenReader: detectScreenReader(),
      }))
    }

    updatePreferences()

    // Listen for preference changes
    const mediaQueries = [
      { query: '(prefers-reduced-motion: reduce)', key: 'reducedMotion' as const },
      { query: '(prefers-contrast: high)', key: 'highContrast' as const },
      { query: '(prefers-color-scheme: dark)', key: 'darkMode' as const },
    ]

    const listeners = mediaQueries.map(({ query, key }) => {
      const mediaQuery = window.matchMedia(query)
      const listener = (e: MediaQueryListEvent) => {
        setPreferences(prev => ({ ...prev, [key]: e.matches }))
      }
      mediaQuery.addEventListener('change', listener)
      return { mediaQuery, listener }
    })

    return () => {
      listeners.forEach(({ mediaQuery, listener }) => {
        mediaQuery.removeEventListener('change', listener)
      })
    }
  }, [isClient])

  // Detect screen reader usage
  const detectScreenReader = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    
    // Check for common screen reader indicators
    const indicators = [
      navigator.userAgent.includes('JAWS'),
      navigator.userAgent.includes('NVDA'),
      navigator.userAgent.includes('DRAGON'),
      navigator.userAgent.includes('VoiceOver'),
      // Check for aria-live regions (indicating screen reader usage)
      document.querySelector('[aria-live]') !== null,
      // Check for high contrast mode (often used with screen readers)
      prefersHighContrast(),
    ]

    return indicators.some(Boolean)
  }, [])

  // Announce messages to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (preferences.screenReader || detectScreenReader()) {
      announceStatus(message, priority)
    }
  }, [preferences.screenReader, detectScreenReader])

  // Get appropriate animation classes based on preferences
  const getAnimationClass = useCallback((animationClass: string, fallback: string = '') => {
    if (preferences.reducedMotion) {
      return fallback
    }
    return animationClass
  }, [preferences.reducedMotion])

  // Get appropriate focus styles
  const getFocusClass = useCallback(() => {
    if (preferences.highContrast) {
      return 'focus-visible:outline-4 focus-visible:outline-neutral-900 focus-visible:outline-offset-2'
    }
    return 'focus-visible:outline-2 focus-visible:outline-primary-600 focus-visible:outline-offset-2'
  }, [preferences.highContrast])

  // Get appropriate font size classes
  const getFontSizeClass = useCallback(() => {
    switch (preferences.fontSize) {
      case 'small':
        return 'text-sm'
      case 'large':
        return 'text-lg'
      default:
        return 'text-base'
    }
  }, [preferences.fontSize])

  // Update font size preference
  const setFontSize = useCallback((size: 'small' | 'medium' | 'large') => {
    setPreferences(prev => ({ ...prev, fontSize: size }))
    announce(`Font size changed to ${size}`)
  }, [announce])

  // Check if user prefers reduced motion
  const shouldReduceMotion = useCallback(() => {
    return preferences.reducedMotion
  }, [preferences.reducedMotion])

  // Check if user prefers high contrast
  const shouldUseHighContrast = useCallback(() => {
    return preferences.highContrast
  }, [preferences.highContrast])

  // Check if user prefers dark mode
  const shouldUseDarkMode = useCallback(() => {
    return preferences.darkMode
  }, [preferences.darkMode])

  // Generate accessible IDs
  const generateId = useCallback((prefix: string = 'accessible') => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Keyboard navigation helper
  const handleKeyboardNavigation = useCallback((
    event: React.KeyboardEvent,
    handlers: {
      onEnter?: () => void
      onSpace?: () => void
      onEscape?: () => void
      onArrowUp?: () => void
      onArrowDown?: () => void
      onArrowLeft?: () => void
      onArrowRight?: () => void
    }
  ) => {
    switch (event.key) {
      case 'Enter':
        if (handlers.onEnter) {
          event.preventDefault()
          handlers.onEnter()
        }
        break
      case ' ':
        if (handlers.onSpace) {
          event.preventDefault()
          handlers.onSpace()
        }
        break
      case 'Escape':
        if (handlers.onEscape) {
          event.preventDefault()
          handlers.onEscape()
        }
        break
      case 'ArrowUp':
        if (handlers.onArrowUp) {
          event.preventDefault()
          handlers.onArrowUp()
        }
        break
      case 'ArrowDown':
        if (handlers.onArrowDown) {
          event.preventDefault()
          handlers.onArrowDown()
        }
        break
      case 'ArrowLeft':
        if (handlers.onArrowLeft) {
          event.preventDefault()
          handlers.onArrowLeft()
        }
        break
      case 'ArrowRight':
        if (handlers.onArrowRight) {
          event.preventDefault()
          handlers.onArrowRight()
        }
        break
    }
  }, [])

  return {
    preferences,
    isClient,
    announce,
    getAnimationClass,
    getFocusClass,
    getFontSizeClass,
    setFontSize,
    shouldReduceMotion,
    shouldUseHighContrast,
    shouldUseDarkMode,
    generateId,
    handleKeyboardNavigation,
  }
}