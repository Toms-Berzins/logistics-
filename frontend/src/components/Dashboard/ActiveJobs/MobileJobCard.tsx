import React from 'react'
import { JobRecord, Driver } from '../../../types/jobs'
import { JobStatusBadge, JobPriorityBadge } from './JobStatusBadge'
import { DraggableDriverBadge, DroppableJobRow } from '../../../hooks/useJobDragDrop'
import { cn } from '../../../lib/utils'
import { format } from 'date-fns'

interface MobileJobCardProps {
  job: JobRecord
  onJobClick?: (job: JobRecord) => void
  onJobDoubleClick?: (job: JobRecord) => void
  isSelected?: boolean
  onSelectionChange?: (selected: boolean) => void
  className?: string
}

export const MobileJobCard: React.FC<MobileJobCardProps> = ({
  job,
  onJobClick,
  onJobDoubleClick,
  isSelected = false,
  onSelectionChange,
  className
}) => {
  const handleCardClick = () => {
    onJobClick?.(job)
  }

  const handleCardDoubleClick = () => {
    onJobDoubleClick?.(job)
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSelectionChange?.(e.target.checked)
  }

  // Swipe actions for mobile
  const handleSwipeLeft = () => {
    // Quick assign action
    console.log('Swipe left - Quick assign:', job.id)
  }

  const handleSwipeRight = () => {
    // Mark as completed action
    console.log('Swipe right - Mark completed:', job.id)
  }

  return (
    <DroppableJobRow job={job}>
      <div
        className={cn(
          'bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3',
          'active:bg-gray-50 transition-colors cursor-pointer',
          isSelected && 'ring-2 ring-blue-500 bg-blue-50',
          job.priority === 'urgent' && 'border-l-4 border-l-red-500',
          job.priority === 'high' && 'border-l-4 border-l-orange-500',
          className
        )}
        onClick={handleCardClick}
        onDoubleClick={handleCardDoubleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleCardClick()
          }
        }}
        aria-label={`Job ${job.id} for ${job.customer}, status ${job.status}${job.assignedDriver ? `, assigned to ${job.assignedDriver.name}` : ''}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-label={`Select job ${job.id}`}
              onClick={(e) => e.stopPropagation()}
            />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-medium text-gray-900">
                  {job.id}
                </span>
                <JobPriorityBadge priority={job.priority} size="sm" />
              </div>
              <p className="text-lg font-semibold text-gray-900 truncate">
                {job.customer}
              </p>
            </div>
          </div>
          
          <JobStatusBadge 
            status={job.status} 
            size="sm"
            pulse={job.status === 'in-transit'}
          />
        </div>

        {/* Locations */}
        <div className="space-y-2">
          {/* Pickup */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
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
            <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
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

        {/* Driver Assignment */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Driver:</span>
            {job.assignedDriver ? (
              <DraggableDriverBadge driver={job.assignedDriver}>
                <div className="flex items-center space-x-2 px-2 py-1 bg-gray-100 rounded text-sm">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    job.assignedDriver.status === 'available' && 'bg-green-500',
                    job.assignedDriver.status === 'busy' && 'bg-yellow-500',
                    job.assignedDriver.status === 'offline' && 'bg-red-500',
                    job.assignedDriver.status === 'en-route' && 'bg-blue-500'
                  )} />
                  <span className="font-medium text-gray-900">
                    {job.assignedDriver.name}
                  </span>
                </div>
              </DraggableDriverBadge>
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

        {/* Package Info */}
        {job.packageInfo && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              {job.packageInfo.weight && (
                <span className="px-2 py-1 bg-gray-100 rounded">
                  {job.packageInfo.weight}kg
                </span>
              )}
              {job.packageInfo.dimensions && (
                <span className="px-2 py-1 bg-gray-100 rounded">
                  {job.packageInfo.dimensions}
                </span>
              )}
              {job.packageInfo.specialHandling?.map((handling, index) => (
                <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
                  {handling}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Swipe Indicators */}
        <div className="flex justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <span>← Swipe for quick assign</span>
          </div>
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <span>Swipe for complete →</span>
          </div>
        </div>
      </div>
    </DroppableJobRow>
  )
}

// Mobile job list container
interface MobileJobListProps {
  jobs: JobRecord[]
  onJobClick?: (job: JobRecord) => void
  onJobDoubleClick?: (job: JobRecord) => void
  selectedJobIds?: string[]
  onSelectionChange?: (jobIds: string[]) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export const MobileJobList: React.FC<MobileJobListProps> = ({
  jobs,
  onJobClick,
  onJobDoubleClick,
  selectedJobIds = [],
  onSelectionChange,
  loading = false,
  emptyMessage = 'No jobs found',
  className
}) => {
  const handleSelectionChange = (jobId: string, selected: boolean) => {
    if (selected) {
      onSelectionChange?.([...selectedJobIds, jobId])
    } else {
      onSelectionChange?.(selectedJobIds.filter(id => id !== jobId))
    }
  }

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {jobs.map((job) => (
        <MobileJobCard
          key={job.id}
          job={job}
          onJobClick={onJobClick}
          onJobDoubleClick={onJobDoubleClick}
          isSelected={selectedJobIds.includes(job.id)}
          onSelectionChange={(selected) => handleSelectionChange(job.id, selected)}
        />
      ))}
    </div>
  )
}