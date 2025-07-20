import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '../../lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  pullDistance?: number
  snapBackDuration?: number
  refreshThreshold?: number
  enabled?: boolean
  className?: string
  refreshingText?: string
  pullText?: string
  releaseText?: string
  loadingComponent?: React.ReactNode
}

type RefreshState = 'idle' | 'pulling' | 'release' | 'refreshing'

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  pullDistance = 80,
  snapBackDuration = 300,
  refreshThreshold = 60,
  enabled = true,
  className,
  refreshingText = 'Refreshing...',
  pullText = 'Pull to refresh',
  releaseText = 'Release to refresh',
  loadingComponent
}) => {
  const [refreshState, setRefreshState] = useState<RefreshState>('idle')
  const [pullY, setPullY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isRefreshing = useRef(false)

  // Check if we can pull to refresh (at top of container)
  const canPullToRefresh = useCallback(() => {
    if (!enabled || !containerRef.current) return false
    
    const container = containerRef.current
    return container.scrollTop === 0
  }, [enabled])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!canPullToRefresh() || isRefreshing.current) return
    
    startY.current = e.touches[0].clientY
    currentY.current = startY.current
    setIsDragging(true)
  }, [canPullToRefresh])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !canPullToRefresh() || isRefreshing.current) return
    
    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - startY.current
    
    // Only handle downward pulls
    if (deltaY > 0) {
      e.preventDefault()
      
      // Apply resistance curve for natural feel
      const resistance = Math.max(0, 1 - (deltaY / (pullDistance * 2)))
      const adjustedDeltaY = deltaY * resistance
      
      setPullY(Math.min(adjustedDeltaY, pullDistance))
      
      // Update refresh state based on pull distance
      if (adjustedDeltaY >= refreshThreshold) {
        setRefreshState('release')
        
        // Haptic feedback when reaching threshold
        if ('vibrate' in navigator) {
          navigator.vibrate(10)
        }
      } else {
        setRefreshState('pulling')
      }
    }
  }, [isDragging, canPullToRefresh, pullDistance, refreshThreshold])

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isDragging) return
    
    setIsDragging(false)
    
    if (refreshState === 'release' && !isRefreshing.current) {
      // Trigger refresh
      setRefreshState('refreshing')
      isRefreshing.current = true
      
      // Haptic feedback for refresh
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 25, 50])
      }
      
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        isRefreshing.current = false
        setRefreshState('idle')
        
        // Smooth snap back animation
        setPullY(0)
      }
    } else {
      // Snap back to idle
      setRefreshState('idle')
      setPullY(0)
    }
  }, [isDragging, refreshState, onRefresh])

  // Set up touch event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enabled])

  // Calculate refresh indicator rotation
  const refreshIndicatorRotation = (pullY / refreshThreshold) * 180

  return (
    <div 
      ref={containerRef}
      className={cn(
        'relative overflow-auto touch-manipulation',
        className
      )}
      style={{
        transform: `translateY(${pullY}px)`,
        transition: isDragging ? 'none' : `transform ${snapBackDuration}ms ease-out`
      }}
    >
      {/* Pull to refresh indicator */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'text-gray-600 text-sm font-medium',
          'transition-opacity duration-200',
          pullY > 0 ? 'opacity-100' : 'opacity-0'
        )}
        style={{
          height: `${pullDistance}px`,
          transform: `translateY(-${pullDistance - pullY}px)`
        }}
      >
        {refreshState === 'refreshing' ? (
          <div className="flex items-center space-x-2">
            {loadingComponent || (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            )}
            <span>{refreshingText}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            {/* Refresh arrow icon */}
            <svg
              className={cn(
                'w-5 h-5 transition-transform duration-200',
                refreshState === 'release' ? 'text-blue-600' : 'text-gray-400'
              )}
              style={{
                transform: `rotate(${refreshIndicatorRotation}deg)`
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            
            <span className={cn(
              'transition-colors duration-200',
              refreshState === 'release' ? 'text-blue-600' : 'text-gray-600'
            )}>
              {refreshState === 'release' ? releaseText : pullText}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        {children}
      </div>
    </div>
  )
}

// Hook for programmatic refresh control
export function usePullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()

  const triggerRefresh = useCallback(async (refreshFn: () => Promise<void>) => {
    if (isRefreshing) return

    setIsRefreshing(true)
    
    try {
      await refreshFn()
    } catch (error) {
      console.error('Manual refresh failed:', error)
    } finally {
      // Ensure minimum refresh duration for UX
      refreshTimeoutRef.current = setTimeout(() => {
        setIsRefreshing(false)
      }, 500)
    }
  }, [isRefreshing])

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  return {
    isRefreshing,
    triggerRefresh
  }
}

// Enhanced pull-to-refresh with additional gestures
interface EnhancedPullToRefreshProps extends PullToRefreshProps {
  onSwipeDown?: () => void
  onSwipeUp?: () => void
  enableSwipeGestures?: boolean
}

export const EnhancedPullToRefresh: React.FC<EnhancedPullToRefreshProps> = ({
  onSwipeDown,
  onSwipeUp,
  enableSwipeGestures = false,
  ...pullToRefreshProps
}) => {
  const [swipeState, setSwipeState] = useState<'idle' | 'swipe-up' | 'swipe-down'>('idle')
  const swipeThreshold = 100

  const handleTouchStart = useRef({ y: 0, timestamp: 0 })

  const handleSwipeGestures = useCallback((e: TouchEvent) => {
    if (!enableSwipeGestures) return

    if (e.type === 'touchstart') {
      handleTouchStart.current = {
        y: e.touches[0].clientY,
        timestamp: Date.now()
      }
    } else if (e.type === 'touchend') {
      const deltaY = e.changedTouches[0].clientY - handleTouchStart.current.y
      const deltaTime = Date.now() - handleTouchStart.current.timestamp
      const velocity = Math.abs(deltaY) / deltaTime

      // Fast swipe gestures
      if (Math.abs(deltaY) > swipeThreshold && velocity > 0.5) {
        if (deltaY > 0) {
          setSwipeState('swipe-down')
          onSwipeDown?.()
          setTimeout(() => setSwipeState('idle'), 200)
        } else {
          setSwipeState('swipe-up')
          onSwipeUp?.()
          setTimeout(() => setSwipeState('idle'), 200)
        }

        // Haptic feedback for swipes
        if ('vibrate' in navigator) {
          navigator.vibrate(30)
        }
      }
    }
  }, [enableSwipeGestures, onSwipeDown, onSwipeUp])

  return (
    <div
      onTouchStart={handleSwipeGestures}
      onTouchEnd={handleSwipeGestures}
      className={cn(
        swipeState === 'swipe-up' && 'transform -translate-y-1 transition-transform duration-200',
        swipeState === 'swipe-down' && 'transform translate-y-1 transition-transform duration-200'
      )}
    >
      <PullToRefresh {...pullToRefreshProps} />
    </div>
  )
}