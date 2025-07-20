import { useRef, useCallback, useEffect, useState } from 'react'

interface TouchPoint {
  x: number
  y: number
  timestamp: number
}

interface SwipeGestureConfig {
  minDistance: number
  maxTime: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface LongPressConfig {
  duration: number
  onLongPress?: (event: TouchEvent) => void
  onLongPressStart?: () => void
  onLongPressEnd?: () => void
}

interface PinchGestureConfig {
  onPinchStart?: (scale: number) => void
  onPinchMove?: (scale: number, delta: number) => void
  onPinchEnd?: (scale: number) => void
  minScale?: number
  maxScale?: number
}

interface TouchGestureOptions {
  swipe?: SwipeGestureConfig
  longPress?: LongPressConfig
  pinch?: PinchGestureConfig
  enableHapticFeedback?: boolean
  preventDefault?: boolean
}

interface TouchGestureState {
  isLongPressing: boolean
  isPinching: boolean
  currentScale: number
  lastSwipeDirection: 'left' | 'right' | 'up' | 'down' | null
}

export function useTouchGestures(options: TouchGestureOptions = {}) {
  const elementRef = useRef<HTMLElement>(null)
  const touchStartRef = useRef<TouchPoint | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const initialPinchDistance = useRef<number>(0)
  const lastPinchScale = useRef<number>(1)
  
  const [state, setState] = useState<TouchGestureState>({
    isLongPressing: false,
    isPinching: false,
    currentScale: 1,
    lastSwipeDirection: null
  })

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!options.enableHapticFeedback) return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [30],
        heavy: [50, 20, 50]
      }
      navigator.vibrate(patterns[type])
    }
  }, [options.enableHapticFeedback])

  // Calculate distance between two touch points
  const getDistance = useCallback((touches: TouchList): number => {
    if (touches.length < 2) return 0
    
    const touch1 = touches[0]
    const touch2 = touches[1]
    
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    )
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (options.preventDefault) {
      event.preventDefault()
    }

    const touch = event.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    }

    // Multi-touch for pinch
    if (event.touches.length === 2) {
      initialPinchDistance.current = getDistance(event.touches)
      setState(prev => ({ ...prev, isPinching: true }))
      options.pinch?.onPinchStart?.(1)
      return
    }

    // Single touch - start long press timer
    if (options.longPress && event.touches.length === 1) {
      longPressTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, isLongPressing: true }))
        options.longPress?.onLongPressStart?.()
        triggerHapticFeedback('medium')
        options.longPress?.onLongPress?.(event)
      }, options.longPress.duration)
    }
  }, [options, getDistance, triggerHapticFeedback])

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (options.preventDefault) {
      event.preventDefault()
    }

    // Handle pinch gesture
    if (event.touches.length === 2 && state.isPinching) {
      const currentDistance = getDistance(event.touches)
      const scale = currentDistance / initialPinchDistance.current
      const delta = scale - lastPinchScale.current
      
      // Apply scale constraints
      const constrainedScale = Math.min(
        Math.max(scale, options.pinch?.minScale || 0.5),
        options.pinch?.maxScale || 3
      )
      
      setState(prev => ({ ...prev, currentScale: constrainedScale }))
      options.pinch?.onPinchMove?.(constrainedScale, delta)
      lastPinchScale.current = scale
      return
    }

    // Cancel long press if finger moves too much during single touch
    if (event.touches.length === 1 && touchStartRef.current && longPressTimerRef.current) {
      const touch = event.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
      
      // Cancel long press if moved more than 10px
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }, [state.isPinching, getDistance, options.pinch])

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (options.preventDefault) {
      event.preventDefault()
    }

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Handle pinch end
    if (state.isPinching) {
      setState(prev => ({ ...prev, isPinching: false }))
      options.pinch?.onPinchEnd?.(state.currentScale)
      lastPinchScale.current = 1
      return
    }

    // Handle long press end
    if (state.isLongPressing) {
      setState(prev => ({ ...prev, isLongPressing: false }))
      options.longPress?.onLongPressEnd?.()
      return
    }

    // Handle swipe gesture
    if (!touchStartRef.current || !options.swipe || event.touches.length > 0) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaTime = Date.now() - touchStartRef.current.timestamp
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Check if swipe meets criteria
    if (
      distance >= options.swipe.minDistance &&
      deltaTime <= options.swipe.maxTime
    ) {
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          setState(prev => ({ ...prev, lastSwipeDirection: 'right' }))
          triggerHapticFeedback('light')
          options.swipe.onSwipeRight?.()
        } else {
          setState(prev => ({ ...prev, lastSwipeDirection: 'left' }))
          triggerHapticFeedback('light')
          options.swipe.onSwipeLeft?.()
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          setState(prev => ({ ...prev, lastSwipeDirection: 'down' }))
          triggerHapticFeedback('light')
          options.swipe.onSwipeDown?.()
        } else {
          setState(prev => ({ ...prev, lastSwipeDirection: 'up' }))
          triggerHapticFeedback('light')
          options.swipe.onSwipeUp?.()
        }
      }
    }

    touchStartRef.current = null
  }, [state, options, triggerHapticFeedback])

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('touchstart', handleTouchStart, { passive: !options.preventDefault })
    element.addEventListener('touchmove', handleTouchMove, { passive: !options.preventDefault })
    element.addEventListener('touchend', handleTouchEnd, { passive: !options.preventDefault })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, options.preventDefault])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  return {
    ref: elementRef,
    state,
    triggerHapticFeedback
  }
}

// Specialized hook for job card gestures
export function useJobCardGestures({
  onComplete,
  onViewDetails,
  onAssign,
  onReassign,
  enableHapticFeedback = true
}: {
  onComplete?: () => void
  onViewDetails?: () => void
  onAssign?: () => void
  onReassign?: () => void
  enableHapticFeedback?: boolean
}) {
  return useTouchGestures({
    enableHapticFeedback,
    swipe: {
      minDistance: 80,
      maxTime: 500,
      onSwipeRight: onComplete,
      onSwipeLeft: onViewDetails
    },
    longPress: {
      duration: 600,
      onLongPress: () => {
        // Show context menu for assign/reassign
        if (onAssign) onAssign()
        else if (onReassign) onReassign()
      }
    }
  })
}

// Hook for map gestures
export function useMapGestures({
  onZoomIn,
  onZoomOut,
  onRecenter,
  enableHapticFeedback = true
}: {
  onZoomIn?: (scale: number) => void
  onZoomOut?: (scale: number) => void
  onRecenter?: () => void
  enableHapticFeedback?: boolean
}) {
  return useTouchGestures({
    enableHapticFeedback,
    pinch: {
      minScale: 0.5,
      maxScale: 3,
      onPinchMove: (scale) => {
        if (scale > 1) onZoomIn?.(scale)
        else onZoomOut?.(scale)
      }
    },
    longPress: {
      duration: 800,
      onLongPress: onRecenter
    }
  })
}