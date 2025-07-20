import { useState, useEffect, useCallback } from 'react'

// Tailwind-compatible breakpoints
const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

type Breakpoint = keyof typeof breakpoints
type ResponsiveValue<T> = Partial<Record<Breakpoint, T>>

interface ResponsiveState {
  width: number
  height: number
  breakpoint: Breakpoint
  isTouch: boolean
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  orientation: 'portrait' | 'landscape'
  pixelRatio: number
}

export function useResponsiveBreakpoints() {
  const [state, setState] = useState<ResponsiveState>(() => 
    getInitialState()
  )

  const updateState = useCallback(() => {
    setState(getCurrentState())
  }, [])

  useEffect(() => {
    updateState()

    // Listen for resize events
    window.addEventListener('resize', updateState)
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      // Delay to ensure dimensions are updated
      setTimeout(updateState, 100)
    })

    return () => {
      window.removeEventListener('resize', updateState)
      window.removeEventListener('orientationchange', updateState)
    }
  }, [updateState])

  return state
}

function getInitialState(): ResponsiveState {
  if (typeof window === 'undefined') {
    return {
      width: 1024,
      height: 768,
      breakpoint: 'lg',
      isTouch: false,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      orientation: 'landscape',
      pixelRatio: 1
    }
  }

  return getCurrentState()
}

function getCurrentState(): ResponsiveState {
  const width = window.innerWidth
  const height = window.innerHeight
  const breakpoint = getBreakpoint(width)
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const pixelRatio = window.devicePixelRatio || 1
  const orientation = width > height ? 'landscape' : 'portrait'

  // Device categorization
  const isMobile = width < breakpoints.md
  const isTablet = width >= breakpoints.md && width < breakpoints.lg
  const isDesktop = width >= breakpoints.lg

  return {
    width,
    height,
    breakpoint,
    isTouch,
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    pixelRatio
  }
}

function getBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints['2xl']) return '2xl'
  if (width >= breakpoints.xl) return 'xl'
  if (width >= breakpoints.lg) return 'lg'
  if (width >= breakpoints.md) return 'md'
  if (width >= breakpoints.sm) return 'sm'
  return 'xs'
}

// Hook for responsive values
export function useResponsiveValue<T>(values: ResponsiveValue<T>, fallback: T): T {
  const { breakpoint } = useResponsiveBreakpoints()
  
  // Find the appropriate value by checking breakpoints from largest to smallest
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = breakpointOrder.indexOf(breakpoint)
  
  // Look for a value at the current breakpoint or smaller
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i]
    if (values[bp] !== undefined) {
      return values[bp]!
    }
  }
  
  return fallback
}

// Hook for media queries
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    
    mediaQuery.addEventListener('change', handler)
    setMatches(mediaQuery.matches)
    
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Hook for detecting specific device characteristics
export function useDeviceDetection() {
  const responsive = useResponsiveBreakpoints()
  
  const isIOS = useCallback(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  }, [])
  
  const isAndroid = useCallback(() => {
    return /Android/.test(navigator.userAgent)
  }, [])
  
  const isSafari = useCallback(() => {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  }, [])
  
  const isChrome = useCallback(() => {
    return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
  }, [])
  
  const isPWA = useCallback(() => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone ||
           document.referrer.includes('android-app://')
  }, [])
  
  const hasNotchOrDynamicIsland = useCallback(() => {
    // Check for iPhone X and newer with safe area insets
    const safeAreaTop = getComputedStyle(document.documentElement)
      .getPropertyValue('env(safe-area-inset-top)')
    return safeAreaTop !== '' && safeAreaTop !== '0px'
  }, [])

  const supportsTouchForcePress = useCallback(() => {
    return 'ontouchforcechange' in window
  }, [])

  const supportsHapticFeedback = useCallback(() => {
    return 'vibrate' in navigator
  }, [])

  return {
    ...responsive,
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isSafari: isSafari(),
    isChrome: isChrome(),
    isPWA: isPWA(),
    hasNotchOrDynamicIsland: hasNotchOrDynamicIsland(),
    supportsTouchForcePress: supportsTouchForcePress(),
    supportsHapticFeedback: supportsHapticFeedback()
  }
}

// Hook for responsive component variants
export function useResponsiveComponent<T extends Record<string, any>>(
  variants: ResponsiveValue<T>,
  defaultVariant: T
): T {
  return useResponsiveValue(variants, defaultVariant)
}

// Performance-aware responsive images hook
export function useResponsiveImage(
  sources: ResponsiveValue<string>,
  fallback: string
) {
  const responsive = useResponsiveBreakpoints()
  const imageUrl = useResponsiveValue(sources, fallback)
  
  // Optimize for high DPI displays
  const optimizedUrl = responsive.pixelRatio > 1 
    ? imageUrl.replace(/\.([^.]+)$/, '@2x.$1')
    : imageUrl
  
  return {
    src: optimizedUrl,
    srcSet: generateSrcSet(sources, responsive.pixelRatio),
    loading: responsive.isMobile ? 'lazy' as const : 'eager' as const
  }
}

function generateSrcSet(sources: ResponsiveValue<string>, pixelRatio: number): string {
  const entries = Object.entries(sources)
    .filter(([_, url]) => url)
    .map(([breakpoint, url]) => {
      const width = breakpoints[breakpoint as Breakpoint]
      const density = pixelRatio > 1 ? '2x' : '1x'
      return `${url} ${width}w, ${url.replace(/\.([^.]+)$/, '@2x.$1')} ${width * 2}w`
    })
  
  return entries.join(', ')
}

// CSS-in-JS responsive utilities
export function createResponsiveStyles<T>(
  property: string,
  values: ResponsiveValue<T>
): React.CSSProperties {
  const responsive = useResponsiveBreakpoints()
  const value = useResponsiveValue(values, values.xs || values.sm || values.md)
  
  return {
    [property]: value
  } as React.CSSProperties
}

// Hook for container queries simulation
export function useContainerQuery(elementRef: React.RefObject<HTMLElement>) {
  const [containerWidth, setContainerWidth] = useState(0)
  
  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    
    observer.observe(element)
    return () => observer.disconnect()
  }, [elementRef])
  
  return {
    containerWidth,
    containerBreakpoint: getBreakpoint(containerWidth),
    isNarrow: containerWidth < 400,
    isWide: containerWidth > 800
  }
}

// Safe area utilities for notched devices
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  })

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement)
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)')) || 0,
        right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)')) || 0,
        bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
        left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)')) || 0
      })
    }

    updateSafeArea()
    
    // Update on orientation change
    window.addEventListener('orientationchange', updateSafeArea)
    return () => window.removeEventListener('orientationchange', updateSafeArea)
  }, [])

  return safeArea
}

// Touch-friendly spacing calculator
export function useTouchSpacing() {
  const { isMobile, isTouch } = useResponsiveBreakpoints()
  
  const getMinTouchTarget = useCallback(() => {
    // WCAG 2.1 AAA recommends 44x44px minimum
    return isMobile || isTouch ? 44 : 32
  }, [isMobile, isTouch])
  
  const getTouchPadding = useCallback(() => {
    return isMobile || isTouch ? 12 : 8
  }, [isMobile, isTouch])
  
  const getTouchSpacing = useCallback(() => {
    return isMobile || isTouch ? 16 : 12
  }, [isMobile, isTouch])

  return {
    minTouchTarget: getMinTouchTarget(),
    touchPadding: getTouchPadding(),
    touchSpacing: getTouchSpacing()
  }
}