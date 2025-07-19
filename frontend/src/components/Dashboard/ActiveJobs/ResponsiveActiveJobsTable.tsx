import React, { useState, useEffect, useMemo } from 'react'
import { ActiveJobsTable } from './ActiveJobsTable'
import { MobileJobList } from './MobileJobCard'
import { useJobWebSocket } from '../../../hooks/useJobWebSocket'
import { 
  JobRecord, 
  Driver, 
  JobFilters, 
  DragDropResult,
  JobUpdate 
} from '../../../types/jobs'
import { DndContext } from '@dnd-kit/core'
import { cn } from '../../../lib/utils'

interface ResponsiveActiveJobsTableProps {
  jobs: JobRecord[]
  drivers: Driver[]
  onJobClick?: (job: JobRecord) => void
  onJobDoubleClick?: (job: JobRecord) => void
  onAssignDriver: (jobId: string, driverId: string) => Promise<DragDropResult>
  onReassignDriver: (jobId: string, newDriverId: string, oldDriverId: string) => Promise<DragDropResult>
  onJobUpdate?: (update: JobUpdate) => void
  filters?: JobFilters
  onFiltersChange?: (filters: JobFilters) => void
  loading?: boolean
  className?: string
  enableWebSocket?: boolean
  websocketUrl?: string
  autoRefreshInterval?: number
  height?: number
  rowHeight?: number
}

export const ResponsiveActiveJobsTable: React.FC<ResponsiveActiveJobsTableProps> = ({
  jobs: initialJobs,
  drivers,
  onJobClick,
  onJobDoubleClick,
  onAssignDriver,
  onReassignDriver,
  onJobUpdate,
  filters,
  onFiltersChange,
  loading = false,
  className,
  enableWebSocket = true,
  websocketUrl,
  autoRefreshInterval = 30000,
  height = 600,
  rowHeight = 72
}) => {
  const [jobs, setJobs] = useState<JobRecord[]>(initialJobs)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'mobile'>('table')
  const [isMobile, setIsMobile] = useState(false)

  // Detect screen size and set view mode
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768 // Tailwind md breakpoint
      setIsMobile(mobile)
      setViewMode(mobile ? 'mobile' : 'table')
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Update jobs when props change
  useEffect(() => {
    setJobs(initialJobs)
  }, [initialJobs])

  // WebSocket for real-time updates
  const handleJobUpdate = (update: JobUpdate) => {
    setJobs(currentJobs => {
      const updatedJobs = currentJobs.map(job => {
        if (job.id === update.id) {
          return {
            ...job,
            [update.field]: update.value,
            updatedAt: update.timestamp
          }
        }
        return job
      })
      return updatedJobs
    })
    
    onJobUpdate?.(update)
    
    // Announce update to screen readers
    const announcement = `Job ${update.id} ${update.field} updated to ${update.value}`
    announceToScreenReader(announcement)
  }

  const handleJobCreated = (newJob: JobRecord) => {
    setJobs(currentJobs => [newJob, ...currentJobs])
    announceToScreenReader(`New job ${newJob.id} created for ${newJob.customer}`)
  }

  const handleJobDeleted = (jobId: string) => {
    setJobs(currentJobs => currentJobs.filter(job => job.id !== jobId))
    announceToScreenReader(`Job ${jobId} has been removed`)
  }

  const handleJobAssigned = (updatedJob: JobRecord) => {
    setJobs(currentJobs => 
      currentJobs.map(job => job.id === updatedJob.id ? updatedJob : job)
    )
    announceToScreenReader(
      `Job ${updatedJob.id} assigned to ${updatedJob.assignedDriver?.name || 'driver'}`
    )
  }

  const handleJobReassigned = (updatedJob: JobRecord) => {
    setJobs(currentJobs => 
      currentJobs.map(job => job.id === updatedJob.id ? updatedJob : job)
    )
    announceToScreenReader(
      `Job ${updatedJob.id} reassigned to ${updatedJob.assignedDriver?.name || 'driver'}`
    )
  }

  const { isConnected: websocketConnected } = useJobWebSocket({
    url: websocketUrl,
    enabled: enableWebSocket,
    onJobUpdate: handleJobUpdate,
    onJobCreated: handleJobCreated,
    onJobDeleted: handleJobDeleted,
    onJobAssigned: handleJobAssigned,
    onJobReassigned: handleJobReassigned
  })

  // Announce updates to screen readers
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  // Filter jobs based on responsive considerations
  const responsiveJobs = useMemo(() => {
    if (isMobile) {
      // On mobile, prioritize urgent/high priority jobs
      return [...jobs].sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
    }
    return jobs
  }, [jobs, isMobile])

  // Handle responsive drag and drop
  const handleResponsiveAssignDriver = async (jobId: string, driverId: string) => {
    try {
      const result = await onAssignDriver(jobId, driverId)
      
      if (result.success) {
        // Show success feedback appropriate for the view mode
        if (isMobile) {
          // Mobile haptic feedback or toast
          if ('vibrate' in navigator) {
            navigator.vibrate(100)
          }
        }
      }
      
      return result
    } catch (error) {
      console.error('Assignment failed:', error)
      return { jobId, driverId, success: false, error: 'Assignment failed' }
    }
  }

  const handleResponsiveReassignDriver = async (
    jobId: string, 
    newDriverId: string, 
    oldDriverId: string
  ) => {
    try {
      const result = await onReassignDriver(jobId, newDriverId, oldDriverId)
      
      if (result.success && isMobile) {
        // Mobile feedback
        if ('vibrate' in navigator) {
          navigator.vibrate(100)
        }
      }
      
      return result
    } catch (error) {
      console.error('Reassignment failed:', error)
      return { jobId, driverId: newDriverId, success: false, error: 'Reassignment failed' }
    }
  }

  // Common props for both views
  const commonProps = {
    jobs: responsiveJobs,
    onJobClick,
    onJobDoubleClick,
    selectedJobIds,
    onSelectionChange: setSelectedJobIds,
    loading
  }

  // Render mobile view
  if (viewMode === 'mobile' || isMobile) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Mobile Header */}
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Active Jobs ({responsiveJobs.length})
            </h2>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={cn(
                'w-2 h-2 rounded-full',
                websocketConnected ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="text-sm text-gray-600">
                {websocketConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Mobile Search */}
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          {/* Quick Filters for Mobile */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {['pending', 'assigned', 'in-transit', 'delayed'].map(status => (
              <button
                key={status}
                className="flex-shrink-0 px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50"
                onClick={() => {
                  const newFilters = {
                    ...filters,
                    status: filters?.status?.includes(status as JobRecord['status']) 
                      ? filters.status.filter(s => s !== status)
                      : [...(filters?.status || []), status as JobRecord['status']]
                  }
                  onFiltersChange?.(newFilters)
                }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Job List */}
        <MobileJobList {...commonProps} />

        {/* Mobile Bulk Actions */}
        {selectedJobIds.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {selectedJobIds.length} selected
              </span>
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                  Assign
                </button>
                <button 
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
                  onClick={() => setSelectedJobIds([])}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Render desktop table view
  return (
    <div className={cn('space-y-4', className)}>
      {/* Desktop Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Active Jobs ({responsiveJobs.length})
        </h2>
        
        {/* View Toggle (for testing) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'mobile' : 'table')}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            {viewMode === 'table' ? 'Mobile View' : 'Table View'}
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <ActiveJobsTable
        {...commonProps}
        drivers={drivers}
        height={height}
        rowHeight={rowHeight}
        onAssignDriver={handleResponsiveAssignDriver}
        onReassignDriver={handleResponsiveReassignDriver}
        filters={filters}
        onFiltersChange={onFiltersChange}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        websocketConnected={websocketConnected}
        autoRefreshInterval={autoRefreshInterval}
      />
    </div>
  )
}