/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

/**
 * Check if the current environment supports reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check if the current environment supports high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-contrast: high)').matches
}

/**
 * Check if the current environment prefers dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21 (higher is better contrast)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16) / 255
    const g = parseInt(hex.substr(2, 2), 16) / 255
    const b = parseInt(hex.substr(4, 2), 16) / 255

    // Calculate relative luminance
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
  }

  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if a color combination meets WCAG contrast requirements
 */
export function meetsContrastRequirements(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  const ratio = calculateContrastRatio(foreground, background)
  
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7
  }
  
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}

/**
 * Generate accessible focus ring styles based on user preferences
 */
export function getFocusStyles(): string {
  const baseStyles = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
  
  if (prefersHighContrast()) {
    return `${baseStyles} focus-visible:outline-neutral-900`
  }
  
  return `${baseStyles} focus-visible:outline-primary-600`
}

/**
 * Generate ARIA attributes for screen readers
 */
export function getAriaAttributes(options: {
  label?: string
  labelledBy?: string
  describedBy?: string
  expanded?: boolean
  selected?: boolean
  disabled?: boolean
  hidden?: boolean
  live?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  busy?: boolean
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  invalid?: boolean
  required?: boolean
  readonly?: boolean
  multiline?: boolean
  autocomplete?: string
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  controls?: string
  owns?: string
  flowTo?: string
  level?: number
  posInSet?: number
  setSize?: number
  role?: string
}) {
  const attributes: Record<string, string | number | boolean | undefined> = {}
  
  if (options.label) attributes['aria-label'] = options.label
  if (options.labelledBy) attributes['aria-labelledby'] = options.labelledBy
  if (options.describedBy) attributes['aria-describedby'] = options.describedBy
  if (options.expanded !== undefined) attributes['aria-expanded'] = options.expanded
  if (options.selected !== undefined) attributes['aria-selected'] = options.selected
  if (options.disabled !== undefined) attributes['aria-disabled'] = options.disabled
  if (options.hidden !== undefined) attributes['aria-hidden'] = options.hidden
  if (options.live) attributes['aria-live'] = options.live
  if (options.atomic !== undefined) attributes['aria-atomic'] = options.atomic
  if (options.busy !== undefined) attributes['aria-busy'] = options.busy
  if (options.current !== undefined) attributes['aria-current'] = options.current
  if (options.invalid !== undefined) attributes['aria-invalid'] = options.invalid
  if (options.required !== undefined) attributes['aria-required'] = options.required
  if (options.readonly !== undefined) attributes['aria-readonly'] = options.readonly
  if (options.multiline !== undefined) attributes['aria-multiline'] = options.multiline
  if (options.autocomplete) attributes['aria-autocomplete'] = options.autocomplete
  if (options.hasPopup !== undefined) attributes['aria-haspopup'] = options.hasPopup
  if (options.controls) attributes['aria-controls'] = options.controls
  if (options.owns) attributes['aria-owns'] = options.owns
  if (options.flowTo) attributes['aria-flowto'] = options.flowTo
  if (options.level) attributes['aria-level'] = options.level
  if (options.posInSet) attributes['aria-posinset'] = options.posInSet
  if (options.setSize) attributes['aria-setsize'] = options.setSize
  if (options.role) attributes['role'] = options.role
  
  return attributes
}

/**
 * Create a live region for dynamic content announcements
 */
export function createLiveRegion(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  if (typeof window === 'undefined') return
  
  const liveRegion = document.createElement('div')
  liveRegion.setAttribute('aria-live', priority)
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.className = 'sr-only'
  liveRegion.textContent = message
  
  document.body.appendChild(liveRegion)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(liveRegion)
  }, 1000)
}

/**
 * Announce status changes to screen readers
 */
export function announceStatus(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  createLiveRegion(message, priority)
}

/**
 * Generate skip link for keyboard navigation
 * Note: This would be used in JSX, but we're keeping it as a reference
 */
export function createSkipLinkProps(href: string): { href: string; className: string } {
  return {
    href,
    className: "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
  }
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') {
    return false
  }
  
  if (element.hasAttribute('tabindex')) {
    return parseInt(element.getAttribute('tabindex') || '0') >= 0
  }
  
  const focusableElements = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[contenteditable]',
    '[tabindex]'
  ]
  
  return focusableElements.some(selector => element.matches(selector))
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[contenteditable]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ')
  
  return Array.from(container.querySelectorAll(focusableSelector))
    .filter(el => isFocusable(el as HTMLElement)) as HTMLElement[]
}

/**
 * Trap focus within a container (for modals, etc.)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container)
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }
  }
  
  container.addEventListener('keydown', handleKeyDown)
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Auto-focus management for single-page applications
 */
export function manageFocus(newContent: HTMLElement, announcement?: string): void {
  // Find the main heading or first focusable element
  const mainHeading = newContent.querySelector('h1, h2, [role="heading"][aria-level="1"], [role="heading"][aria-level="2"]') as HTMLElement
  const firstFocusable = getFocusableElements(newContent)[0]
  
  const targetElement = mainHeading || firstFocusable
  
  if (targetElement) {
    // Add tabindex if not naturally focusable
    if (!isFocusable(targetElement)) {
      targetElement.setAttribute('tabindex', '-1')
    }
    
    targetElement.focus()
    
    // Remove tabindex after focus if it was added
    if (targetElement.getAttribute('tabindex') === '-1' && !targetElement.hasAttribute('data-permanent-tabindex')) {
      targetElement.removeAttribute('tabindex')
    }
  }
  
  // Announce the change
  if (announcement) {
    announceStatus(announcement)
  }
}

/**
 * Keyboard navigation handler
 */
export function handleKeyboardNavigation(
  e: KeyboardEvent,
  options: {
    onEnter?: () => void
    onSpace?: () => void
    onEscape?: () => void
    onArrowUp?: () => void
    onArrowDown?: () => void
    onArrowLeft?: () => void
    onArrowRight?: () => void
    onHome?: () => void
    onEnd?: () => void
    preventDefault?: boolean
  }
): void {
  const { preventDefault = true, ...handlers } = options
  
  switch (e.key) {
    case 'Enter':
      if (handlers.onEnter) {
        if (preventDefault) e.preventDefault()
        handlers.onEnter()
      }
      break
    case ' ':
    case 'Space':
      if (handlers.onSpace) {
        if (preventDefault) e.preventDefault()
        handlers.onSpace()
      }
      break
    case 'Escape':
      if (handlers.onEscape) {
        if (preventDefault) e.preventDefault()
        handlers.onEscape()
      }
      break
    case 'ArrowUp':
      if (handlers.onArrowUp) {
        if (preventDefault) e.preventDefault()
        handlers.onArrowUp()
      }
      break
    case 'ArrowDown':
      if (handlers.onArrowDown) {
        if (preventDefault) e.preventDefault()
        handlers.onArrowDown()
      }
      break
    case 'ArrowLeft':
      if (handlers.onArrowLeft) {
        if (preventDefault) e.preventDefault()
        handlers.onArrowLeft()
      }
      break
    case 'ArrowRight':
      if (handlers.onArrowRight) {
        if (preventDefault) e.preventDefault()
        handlers.onArrowRight()
      }
      break
    case 'Home':
      if (handlers.onHome) {
        if (preventDefault) e.preventDefault()
        handlers.onHome()
      }
      break
    case 'End':
      if (handlers.onEnd) {
        if (preventDefault) e.preventDefault()
        handlers.onEnd()
      }
      break
  }
}