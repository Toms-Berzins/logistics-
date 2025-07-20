import React, { useState, useCallback } from 'react'
import { JobRecord, Driver } from '../../types/jobs'
import { JobStatusBadge, JobPriorityBadge } from '../Dashboard/ActiveJobs/JobStatusBadge'
import { useJobCardGestures } from '../../hooks/touch/useTouchGestures'
import { cn } from '../../lib/utils'
import { format } from 'date-fns'

interface TouchJobCardProps {
  job: JobRecord
  onComplete?: () => void
  onViewDetails?: () => void
  onAssign?: () => void
  onReassign?: () => void
  isSelected?: boolean
  onSelectionChange?: (selected: boolean) => void
  className?: string
  enableGestures?: boolean
  showGestureHints?: boolean
}

export const TouchJobCard: React.FC<TouchJobCardProps> = ({
  job,
  onComplete,
  onViewDetails,
  onAssign,
  onReassign,
  isSelected = false,
  onSelectionChange,
  className,
  enableGestures = true,
  showGestureHints = true
}) => {
  const [isPressed, setIsPressed] = useState(false)
  const [gestureState, setGestureState] = useState<'idle' | 'swipe-right' | 'swipe-left' | 'long-press'>('idle')

  // Touch gesture handling
  const { ref, state } = useJobCardGestures({
    onComplete: () => {
      setGestureState('swipe-right')
      setTimeout(() => {
        onComplete?.()
        setGestureState('idle')
      }, 150)
    },
    onViewDetails: () => {
      setGestureState('swipe-left')
      setTimeout(() => {
        onViewDetails?.()
        setGestureState('idle')
      }, 150)
    },
    onAssign: () => {
      setGestureState('long-press')
      setTimeout(() => {
        if (job.assignedDriver) {
          onReassign?.()
        } else {
          onAssign?.()
        }
        setGestureState('idle')
      }, 150)
    },
    enableHapticFeedback: enableGestures
  })

  const handleCardClick = useCallback(() => {
    onViewDetails?.()
  }, [onViewDetails])

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSelectionChange?.(e.target.checked)
  }, [onSelectionChange])

  // Touch event handlers for visual feedback
  const handleTouchStart = useCallback(() => {
    if (enableGestures) {
      setIsPressed(true)
    }
  }, [enableGestures])

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false)
  }, [])

  return (
    <div
      ref={enableGestures ? ref : undefined}
      className={cn(
        // Base card styles with 44px minimum touch target
        'relative bg-white border border-gray-200 rounded-lg shadow-sm',
        'p-4 min-h-[120px] transition-all duration-200',
        
        // Touch feedback
        isPressed && 'scale-95 shadow-md',
        
        // Selection state
        isSelected && 'ring-2 ring-blue-500 bg-blue-50',
        
        // Priority visual indicators
        job.priority === 'urgent' && 'border-l-4 border-l-red-500',
        job.priority === 'high' && 'border-l-4 border-l-orange-500',
        
        // Gesture state visual feedback
        gestureState === 'swipe-right' && 'transform translate-x-4 bg-green-50',
        gestureState === 'swipe-left' && 'transform -translate-x-4 bg-blue-50',
        gestureState === 'long-press' && 'scale-105 shadow-lg bg-purple-50',
        
        // Interactive states
        'cursor-pointer active:scale-95 touch-manipulation',
        
        className
      )}
      onClick={handleCardClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="button"
      tabIndex={0}
      aria-label={`Job ${job.id} for ${job.customer}. Status: ${job.status}. ${job.assignedDriver ? `Assigned to ${job.assignedDriver.name}` : 'Unassigned'}. Swipe right to complete, swipe left for details, long press to ${job.assignedDriver ? 'reassign' : 'assign'}.`}
      data-testid="touch-job-card"
    >
      {/* Gesture indicators */}
      {showGestureHints && enableGestures && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Swipe right indicator */}
          <div className={cn(
            'absolute left-0 top-0 h-full w-1 bg-green-500 rounded-l-lg',
            'transition-opacity duration-200',
            gestureState === 'swipe-right' ? 'opacity-100' : 'opacity-0'
          )} />
          
          {/* Swipe left indicator */}
          <div className={cn(
            'absolute right-0 top-0 h-full w-1 bg-blue-500 rounded-r-lg',
            'transition-opacity duration-200',
            gestureState === 'swipe-left' ? 'opacity-100' : 'opacity-0'
          )} />
          
          {/* Long press indicator */}
          <div className={cn(
            'absolute inset-0 border-2 border-purple-500 rounded-lg',
            'transition-opacity duration-200',
            gestureState === 'long-press' ? 'opacity-100' : 'opacity-0'
          )} />
        </div>
      )}

      {/* Card header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* 44px touch target checkbox */}
          <div className="w-11 h-11 flex items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
              aria-label={`Select job ${job.id}`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-mono text-sm font-medium text-gray-900 truncate">
                {job.id}
              </span>
              <JobPriorityBadge priority={job.priority} size="sm" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {job.customer}
            </h3>
          </div>
        </div>
        
        <JobStatusBadge 
          status={job.status} 
          size="sm"
          pulse={job.status === 'in-transit'}
        />
      </div>

      {/* Location information */}
      <div className="space-y-3 mb-3">
        {/* Pickup */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-1" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">Pickup</p>
            <p className="text-sm text-gray-600 truncate">{job.pickup.address}</p>
            {job.pickup.scheduledTime && (
              <p className="text-xs text-gray-500">
                {format(new Date(job.pickup.scheduledTime), 'MMM d, HH:mm')}
              </p>
            )}
          </div>
        </div>

        {/* Dropoff */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-1" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">Delivery</p>
            <p className="text-sm text-gray-600 truncate">{job.dropoff.address}</p>
            {job.dropoff.scheduledTime && (
              <p className="text-xs text-gray-500">
                {format(new Date(job.dropoff.scheduledTime), 'MMM d, HH:mm')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Driver and timing info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Driver:</span>
          {job.assignedDriver ? (
            <div className="flex items-center space-x-2 px-2 py-1 bg-gray-100 rounded-full">
              <div className={cn(
                'w-2 h-2 rounded-full',
                job.assignedDriver.status === 'available' && 'bg-green-500',
                job.assignedDriver.status === 'busy' && 'bg-yellow-500',
                job.assignedDriver.status === 'offline' && 'bg-red-500',
                job.assignedDriver.status === 'en-route' && 'bg-blue-500'
              )} />
              <span className="text-sm font-medium text-gray-900 truncate max-w-24">
                {job.assignedDriver.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-gray-400 italic">Unassigned</span>
          )}
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {job.estimatedTime.duration}m
          </p>
          <p className="text-xs text-gray-500">ETA</p>
        </div>
      </div>

      {/* Gesture hints at bottom */}
      {showGestureHints && enableGestures && (
        <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <span>→</span>
            <span>Complete</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <span>Hold</span>
            <span>{job.assignedDriver ? 'Reassign' : 'Assign'}</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <span>Details</span>
            <span>←</span>
          </div>
        </div>
      )}

      {/* Touch state indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs text-gray-400">
          {state.isLongPressing && '⏳'}
          {state.lastSwipeDirection && `↗${state.lastSwipeDirection}`}
        </div>
      )}
    </div>
  )
}

// Quick action buttons for mobile
interface QuickActionsProps {
  job: JobRecord
  onComplete?: () => void
  onAssign?: () => void
  onViewDetails?: () => void
  className?: string
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  job,
  onComplete,
  onAssign,
  onViewDetails,
  className
}) => {
  return (
    <div className={cn('flex space-x-2', className)}>
      {/* Complete button - 44px touch target */}
      {job.status !== 'delivered' && (
        <button
          onClick={onComplete}
          className={cn(
            'flex-1 min-h-[44px] px-4 py-2',
            'bg-green-600 hover:bg-green-700 active:bg-green-800',
            'text-white font-medium rounded-lg',
            'transition-colors duration-150',
            'touch-manipulation focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
          )}
          aria-label={`Mark job ${job.id} as complete`}
        >
          Complete
        </button>
      )}

      {/* Assign/Reassign button */}
      {!job.assignedDriver ? (
        <button
          onClick={onAssign}
          className={cn(
            'flex-1 min-h-[44px] px-4 py-2',
            'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
            'text-white font-medium rounded-lg',
            'transition-colors duration-150',
            'touch-manipulation focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
          aria-label={`Assign driver to job ${job.id}`}
        >
          Assign
        </button>
      ) : (
        <button
          onClick={onAssign}
          className={cn(
            'flex-1 min-h-[44px] px-4 py-2',
            'bg-orange-600 hover:bg-orange-700 active:bg-orange-800',
            'text-white font-medium rounded-lg',
            'transition-colors duration-150',
            'touch-manipulation focus:ring-2 focus:ring-orange-500 focus:ring-offset-2'
          )}
          aria-label={`Reassign job ${job.id} to different driver`}
        >
          Reassign
        </button>
      )}

      {/* Details button */}
      <button
        onClick={onViewDetails}
        className={cn(
          'min-h-[44px] min-w-[44px] px-3',
          'bg-gray-600 hover:bg-gray-700 active:bg-gray-800',
          'text-white font-medium rounded-lg',
          'transition-colors duration-150',
          'touch-manipulation focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
        )}
        aria-label={`View details for job ${job.id}`}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  )
}