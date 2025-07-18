'use client'

import React, { useState } from 'react'
import { cn } from '../../lib/utils'
import { Button, Card } from '../ui'

interface TouchMapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  onToggle3D?: () => void
  onToggleTraffic?: () => void
  show3D?: boolean
  showTraffic?: boolean
  className?: string
}

const TouchMapControls: React.FC<TouchMapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggle3D,
  onToggleTraffic,
  show3D = false,
  showTraffic = false,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  const handleLongPress = (callback: () => void) => {
    const timer = setTimeout(() => {
      callback()
      // Add haptic feedback if available
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(50)
      }
    }, 500)
    setLongPressTimer(timer)
  }

  const handlePressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  const ZoomControls = () => (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomIn}
        className="touch-target bg-white/90 backdrop-blur-sm"
        onTouchStart={() => handleLongPress(onZoomIn)}
        onTouchEnd={handlePressEnd}
        onMouseDown={() => handleLongPress(onZoomIn)}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onZoomOut}
        className="touch-target bg-white/90 backdrop-blur-sm"
        onTouchStart={() => handleLongPress(onZoomOut)}
        onTouchEnd={handlePressEnd}
        onMouseDown={() => handleLongPress(onZoomOut)}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </Button>
    </div>
  )

  const ExpandedControls = () => (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onResetView}
        className="touch-target bg-white/90 backdrop-blur-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </Button>
      
      {onToggle3D && (
        <Button
          variant={show3D ? "primary" : "outline"}
          size="sm"
          onClick={onToggle3D}
          className="touch-target bg-white/90 backdrop-blur-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </Button>
      )}
      
      {onToggleTraffic && (
        <Button
          variant={showTraffic ? "primary" : "outline"}
          size="sm"
          onClick={onToggleTraffic}
          className="touch-target bg-white/90 backdrop-blur-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </Button>
      )}
    </div>
  )

  return (
    <div className={cn(
      'fixed right-4 top-1/2 -translate-y-1/2 z-40',
      'flex flex-col gap-2',
      'md:hidden', // Hide on desktop, use default map controls
      className
    )}>
      <Card padding="sm" className="bg-white/95 backdrop-blur-sm">
        <ZoomControls />
      </Card>
      
      <Card padding="sm" className="bg-white/95 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="touch-target"
        >
          <svg 
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </Card>
      
      {isExpanded && (
        <Card padding="sm" className="bg-white/95 backdrop-blur-sm animate-slide-in">
          <ExpandedControls />
        </Card>
      )}
    </div>
  )
}

export const TouchGestureIndicator: React.FC<{
  gesture: 'pan' | 'pinch' | 'rotate' | null
  className?: string
}> = ({ gesture, className }) => {
  if (!gesture) return null

  const gestureConfig = {
    pan: {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
        </svg>
      ),
      label: 'Pan to move',
    },
    pinch: {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
        </svg>
      ),
      label: 'Pinch to zoom',
    },
    rotate: {
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      label: 'Rotate to turn',
    },
  }

  const config = gestureConfig[gesture]

  return (
    <div className={cn(
      'fixed top-4 left-1/2 -translate-x-1/2 z-50',
      'flex items-center gap-2',
      'bg-neutral-900/90 text-white rounded-lg px-3 py-2',
      'animate-fade-in',
      className
    )}>
      {config.icon}
      <span className="text-sm font-medium">
        {config.label}
      </span>
    </div>
  )
}

export default TouchMapControls