import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useTouchGestures } from '../../hooks/touch/useTouchGestures'
import { cn } from '../../lib/utils'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  badge?: number
  isActive?: boolean
  disabled?: boolean
}

interface TouchNavigationDrawerProps {
  items: NavigationItem[]
  isOpen: boolean
  onToggle: (open: boolean) => void
  onItemClick?: (item: NavigationItem) => void
  side?: 'left' | 'right'
  width?: number
  enableGestures?: boolean
  showOverlay?: boolean
  className?: string
  children?: React.ReactNode
}

export const TouchNavigationDrawer: React.FC<TouchNavigationDrawerProps> = ({
  items,
  isOpen,
  onToggle,
  onItemClick,
  side = 'left',
  width = 280,
  enableGestures = true,
  showOverlay = true,
  className,
  children
}) => {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)
  const drawerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Edge swipe detection
  const detectEdgeSwipe = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    const edgeThreshold = 20 // pixels from edge
    
    if (side === 'left') {
      return touch.clientX <= edgeThreshold
    } else {
      return touch.clientX >= window.innerWidth - edgeThreshold
    }
  }, [side])

  // Touch gesture handling for drawer
  const { ref: gestureRef } = useTouchGestures({
    enableHapticFeedback: true,
    swipe: {
      minDistance: 50,
      maxTime: 500,
      onSwipeLeft: () => {
        if (side === 'left' && isOpen) {
          onToggle(false)
        } else if (side === 'right' && !isOpen) {
          onToggle(true)
        }
      },
      onSwipeRight: () => {
        if (side === 'left' && !isOpen) {
          onToggle(true)
        } else if (side === 'right' && isOpen) {
          onToggle(false)
        }
      }
    }
  })

  // Custom touch handling for smooth drawer dragging
  useEffect(() => {
    if (!enableGestures) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      setTouchStartX(touch.clientX)

      // Only start drag if touching the drawer when open, or near edge when closed
      if (isOpen) {
        if (drawerRef.current?.contains(e.target as Node)) {
          setIsDragging(true)
        }
      } else {
        if (detectEdgeSwipe(e)) {
          setIsDragging(true)
          e.preventDefault()
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartX
      let offset = 0

      if (side === 'left') {
        if (isOpen) {
          // Dragging to close
          offset = Math.min(0, deltaX)
        } else {
          // Dragging to open
          offset = Math.max(-width, -width + deltaX)
        }
      } else {
        // Right side logic
        if (isOpen) {
          offset = Math.max(0, deltaX)
        } else {
          offset = Math.min(width, width - deltaX)
        }
      }

      setDragOffset(offset)
      e.preventDefault()
    }

    const handleTouchEnd = () => {
      if (!isDragging) return

      const threshold = width * 0.3 // 30% of drawer width
      
      if (side === 'left') {
        if (isOpen) {
          // Close if dragged more than threshold to the left
          if (dragOffset < -threshold) {
            onToggle(false)
          }
        } else {
          // Open if dragged more than threshold from the left edge
          if (dragOffset > -width + threshold) {
            onToggle(true)
          }
        }
      } else {
        if (isOpen) {
          if (dragOffset > threshold) {
            onToggle(false)
          }
        } else {
          if (dragOffset < width - threshold) {
            onToggle(true)
          }
        }
      }

      setIsDragging(false)
      setDragOffset(0)
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enableGestures, isDragging, isOpen, touchStartX, dragOffset, width, side, onToggle, detectEdgeSwipe])

  // Calculate transform based on state
  const getTransform = useCallback(() => {
    const baseTransform = isOpen ? 0 : (side === 'left' ? -width : width)
    const currentTransform = baseTransform + dragOffset
    
    return `translateX(${currentTransform}px)`
  }, [isOpen, dragOffset, width, side])

  // Handle item click
  const handleItemClick = useCallback((item: NavigationItem) => {
    if (item.disabled) return
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }

    if (item.onClick) {
      item.onClick()
    }
    
    onItemClick?.(item)
    
    // Close drawer after selection on mobile
    if (window.innerWidth < 768) {
      onToggle(false)
    }
  }, [onItemClick, onToggle])

  // Handle overlay click
  const handleOverlayClick = useCallback(() => {
    onToggle(false)
  }, [onToggle])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'Escape':
          onToggle(false)
          break
        case 'Tab':
          // Trap focus within drawer
          const focusableElements = drawerRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
            
            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                e.preventDefault()
                lastElement.focus()
              }
            } else {
              if (document.activeElement === lastElement) {
                e.preventDefault()
                firstElement.focus()
              }
            }
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onToggle])

  return (
    <>
      {/* Overlay */}
      {showOverlay && isOpen && (
        <div
          ref={overlayRef}
          className={cn(
            'fixed inset-0 bg-black bg-opacity-50 z-40',
            'transition-opacity duration-300',
            isDragging ? 'transition-none' : ''
          )}
          onClick={handleOverlayClick}
          style={{
            opacity: isDragging ? Math.max(0, 1 + dragOffset / width) : 1
          }}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed top-0 bottom-0 z-50',
          'bg-white shadow-xl border-gray-200',
          'flex flex-col touch-manipulation',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
          isDragging ? 'transition-none' : 'transition-transform duration-300 ease-out',
          className
        )}
        style={{
          width: `${width}px`,
          transform: getTransform()
        }}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 min-h-[64px]">
          <h2 className="text-lg font-semibold text-gray-900">
            Logistics Hub
          </h2>
          
          {/* Close button - 44px touch target */}
          <button
            onClick={() => onToggle(false)}
            className={cn(
              'w-11 h-11 flex items-center justify-center',
              'rounded-full hover:bg-gray-100 active:bg-gray-200',
              'transition-colors duration-150 touch-manipulation'
            )}
            aria-label="Close navigation"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={cn(
                    // Base styles with 44px minimum touch target
                    'w-full min-h-[44px] px-3 py-2 rounded-lg',
                    'flex items-center space-x-3 text-left',
                    'transition-colors duration-150 touch-manipulation',
                    
                    // Interactive states
                    'hover:bg-gray-50 active:bg-gray-100',
                    'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    
                    // Active state
                    item.isActive && 'bg-blue-50 text-blue-700 border border-blue-200',
                    
                    // Disabled state
                    item.disabled && 'opacity-50 cursor-not-allowed',
                    
                    // Default state
                    !item.isActive && !item.disabled && 'text-gray-700 hover:text-gray-900'
                  )}
                  aria-current={item.isActive ? 'page' : undefined}
                >
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 w-6 h-6',
                    item.isActive ? 'text-blue-600' : 'text-gray-400'
                  )}>
                    {item.icon}
                  </div>
                  
                  {/* Label */}
                  <span className="flex-1 font-medium text-sm">
                    {item.label}
                  </span>
                  
                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <span className={cn(
                      'flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full',
                      'bg-red-100 text-red-800 min-w-[20px] text-center'
                    )}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        {children && (
          <div className="p-4 border-t border-gray-200">
            {children}
          </div>
        )}

        {/* Drag indicator */}
        {enableGestures && (
          <div className={cn(
            'absolute top-1/2 -translate-y-1/2 w-1 h-12 bg-gray-300 rounded',
            side === 'left' ? '-right-2' : '-left-2'
          )} />
        )}
      </div>
    </>
  )
}

// Hook for navigation drawer state management
export function useNavigationDrawer(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen)

  const toggle = useCallback((open?: boolean) => {
    setIsOpen(prev => open !== undefined ? open : !prev)
  }, [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return {
    isOpen,
    toggle,
    open,
    close
  }
}

// Floating action button for opening drawer
interface DrawerToggleButtonProps {
  onClick: () => void
  isOpen: boolean
  className?: string
  side?: 'left' | 'right'
}

export const DrawerToggleButton: React.FC<DrawerToggleButtonProps> = ({
  onClick,
  isOpen,
  className,
  side = 'left'
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        // Base FAB styles with 56px touch target
        'fixed bottom-6 w-14 h-14 rounded-full shadow-lg',
        'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
        'text-white transition-all duration-200',
        'flex items-center justify-center touch-manipulation',
        'focus:ring-4 focus:ring-blue-300 focus:ring-offset-2',
        'z-30',
        
        // Position based on side
        side === 'left' ? 'left-6' : 'right-6',
        
        // Hide when drawer is open
        isOpen && 'scale-0 opacity-0',
        
        className
      )}
      aria-label={`${isOpen ? 'Close' : 'Open'} navigation menu`}
    >
      <svg 
        className={cn(
          'w-6 h-6 transition-transform duration-200',
          isOpen && 'rotate-45'
        )} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 6h16M4 12h16M4 18h16" 
        />
      </svg>
    </button>
  )
}

// Bottom sheet variant for mobile
interface BottomSheetNavigationProps {
  items: NavigationItem[]
  isOpen: boolean
  onToggle: (open: boolean) => void
  onItemClick?: (item: NavigationItem) => void
  className?: string
}

export const BottomSheetNavigation: React.FC<BottomSheetNavigationProps> = ({
  items,
  isOpen,
  onToggle,
  onItemClick,
  className
}) => {
  const { ref: gestureRef } = useTouchGestures({
    swipe: {
      minDistance: 50,
      maxTime: 500,
      onSwipeDown: () => onToggle(false)
    }
  })

  const handleItemClick = useCallback((item: NavigationItem) => {
    if (item.disabled) return
    
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }

    onItemClick?.(item)
    onToggle(false)
  }, [onItemClick, onToggle])

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => onToggle(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={gestureRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'bg-white rounded-t-2xl shadow-xl',
          'transform transition-transform duration-300 ease-out',
          'max-h-[80vh] overflow-hidden',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          className
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={cn(
                  'p-4 rounded-xl border-2 min-h-[80px]',
                  'flex flex-col items-center justify-center space-y-2',
                  'transition-all duration-150 touch-manipulation',
                  
                  item.isActive
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="w-6 h-6">
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-center">
                  {item.label}
                </span>
                {item.badge && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}