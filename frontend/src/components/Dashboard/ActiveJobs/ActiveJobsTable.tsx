import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { ColumnDef, SortingState, ColumnFiltersState } from '@tanstack/react-table'
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core'
import { VirtualizedTable } from '../../Table/VirtualizedTable'
import { JobStatusBadge, JobPriorityBadge } from './JobStatusBadge'
import { 
  JobRecord, 
  Driver, 
  JobFilters, 
  DragDropResult,
  JobUpdate 
} from '../../../types/jobs'
import { 
  useJobDragDrop, 
  DraggableDriverBadge, 
  DroppableJobRow 
} from '../../../hooks/useJobDragDrop'
import { cn } from '../../../lib/utils'
import { formatDistanceToNow, format } from 'date-fns'

interface ActiveJobsTableProps {
  jobs: JobRecord[]
  drivers: Driver[]
  height?: number
  rowHeight?: number
  className?: string
  onJobClick?: (job: JobRecord) => void
  onJobDoubleClick?: (job: JobRecord) => void
  onAssignDriver: (jobId: string, driverId: string) => Promise<DragDropResult>
  onReassignDriver: (jobId: string, newDriverId: string, oldDriverId: string) => Promise<DragDropResult>
  onJobUpdate?: (update: JobUpdate) => void
  filters?: JobFilters
  onFiltersChange?: (filters: JobFilters) => void
  loading?: boolean
  searchTerm?: string
  onSearchTermChange?: (term: string) => void
  selectedJobIds?: string[]
  onSelectionChange?: (jobIds: string[]) => void
  websocketConnected?: boolean
  autoRefreshInterval?: number
}

export const ActiveJobsTable: React.FC<ActiveJobsTableProps> = ({
  jobs,
  drivers,
  height = 600,
  rowHeight = 72,
  className,
  onJobClick,
  onJobDoubleClick,
  onAssignDriver,
  onReassignDriver,
  onJobUpdate,
  filters,
  onFiltersChange,
  loading = false,
  searchTerm = '',
  onSearchTermChange,
  selectedJobIds = [],
  onSelectionChange,
  websocketConnected = false,
  autoRefreshInterval = 30000
}) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Drag and drop functionality
  const {
    draggedItem,
    isLoading: isDragLoading,
    sensors,
    handleDragStart,
    handleDragEnd,
    getJobWithOptimisticUpdate,
    DndContext: DragContext
  } = useJobDragDrop({
    jobs,
    drivers,
    onAssignDriver,
    onReassignDriver
  })

  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Filter and process jobs data
  const processedJobs = useMemo(() => {
    let filteredJobs = jobs.map(getJobWithOptimisticUpdate)

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase()
      filteredJobs = filteredJobs.filter(job =>
        job.id.toLowerCase().includes(searchLower) ||
        job.customer.toLowerCase().includes(searchLower) ||
        job.pickup.address.toLowerCase().includes(searchLower) ||
        job.dropoff.address.toLowerCase().includes(searchLower) ||
        job.assignedDriver?.name.toLowerCase().includes(searchLower)
      )
    }

    // Apply status filters
    if (filters?.status?.length) {
      filteredJobs = filteredJobs.filter(job => filters.status!.includes(job.status))
    }

    // Apply priority filters
    if (filters?.priority?.length) {
      filteredJobs = filteredJobs.filter(job => filters.priority!.includes(job.priority))
    }

    // Apply driver filters
    if (filters?.assignedDriver?.length) {
      filteredJobs = filteredJobs.filter(job => 
        job.assignedDriver && filters.assignedDriver!.includes(job.assignedDriver.id)
      )
    }

    return filteredJobs
  }, [jobs, getJobWithOptimisticUpdate, debouncedSearchTerm, filters])

  // Table columns definition
  const columns = useMemo<ColumnDef<JobRecord>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
          aria-label="Select all jobs"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          aria-label={`Select job ${row.original.id}`}
        />
      ),
      size: 50,
      enableSorting: false,
    },
    {
      accessorKey: 'id',
      header: 'Job ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm font-medium">
          {getValue<string>()}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900">
          {getValue<string>()}
        </span>
      ),
      size: 150,
    },
    {
      accessorKey: 'pickup.address',
      header: 'Pickup',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {row.original.pickup.address}
          </div>
          {row.original.pickup.scheduledTime && (
            <div className="text-xs text-gray-500">
              {format(new Date(row.original.pickup.scheduledTime), 'HH:mm')}
            </div>
          )}
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'dropoff.address',
      header: 'Delivery',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {row.original.dropoff.address}
          </div>
          {row.original.dropoff.scheduledTime && (
            <div className="text-xs text-gray-500">
              {format(new Date(row.original.dropoff.scheduledTime), 'HH:mm')}
            </div>
          )}
        </div>
      ),
      size: 200,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue, row }) => (
        <JobStatusBadge 
          status={getValue<JobRecord['status']>()} 
          pulse={row.original.status === 'in-transit'}
        />
      ),
      size: 120,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ getValue }) => (
        <JobPriorityBadge priority={getValue<JobRecord['priority']>()} />
      ),
      size: 100,
    },
    {
      accessorKey: 'assignedDriver',
      header: 'Driver',
      cell: ({ getValue, row }) => {
        const driver = getValue<Driver | null>()
        
        if (!driver) {
          return (
            <DroppableJobRowCell job={row.original}>
              <span className="text-gray-400 italic">Unassigned</span>
            </DroppableJobRowCell>
          )
        }

        return (
          <DroppableJobRowCell job={row.original}>
            <DraggableDriverBadge driver={driver}>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  driver.status === 'available' && 'bg-green-500',
                  driver.status === 'busy' && 'bg-yellow-500',
                  driver.status === 'offline' && 'bg-red-500',
                  driver.status === 'en-route' && 'bg-blue-500'
                )} />
                <span className="text-sm font-medium text-gray-900">
                  {driver.name}
                </span>
              </div>
            </DraggableDriverBadge>
          </DroppableJobRowCell>
        )
      },
      size: 150,
      enableSorting: false,
    },
    {
      accessorKey: 'estimatedTime.duration',
      header: 'ETA',
      cell: ({ getValue, row }) => {
        const duration = getValue<number>()
        const createdAt = new Date(row.original.createdAt)
        
        return (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900">
              {duration}m
            </div>
            <div className="text-xs text-gray-500">
              {formatDistanceToNow(createdAt, { addSuffix: true })}
            </div>
          </div>
        )
      },
      size: 100,
    },
  ], [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when table is focused
      if (!tableRef.current?.contains(document.activeElement)) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'd':
            e.preventDefault()
            // Dispatch selected jobs
            if (selectedJobIds.length > 0) {
              console.log('Dispatching jobs:', selectedJobIds)
            }
            break
          case 'r':
            e.preventDefault()
            // Reassign selected jobs
            if (selectedJobIds.length > 0) {
              console.log('Reassigning jobs:', selectedJobIds)
            }
            break
        }
      } else if (e.key === ' ') {
        e.preventDefault()
        // Show details for focused row
        if (focusedRowIndex >= 0 && processedJobs[focusedRowIndex]) {
          onJobClick?.(processedJobs[focusedRowIndex])
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedJobIds, focusedRowIndex, processedJobs, onJobClick])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshInterval) return

    const timer = setInterval(() => {
      // Trigger refresh - this would typically call an API
      console.log('Auto-refreshing jobs data')
    }, autoRefreshInterval)

    return () => clearInterval(timer)
  }, [autoRefreshInterval])

  const handleRowClick = useCallback((job: JobRecord) => {
    onJobClick?.(job)
  }, [onJobClick])

  const handleRowDoubleClick = useCallback((job: JobRecord) => {
    onJobDoubleClick?.(job)
  }, [onJobDoubleClick])

  const getRowClassName = useCallback((job: JobRecord, index: number) => {
    return cn(
      'transition-colors duration-200',
      selectedJobIds.includes(job.id) && 'bg-blue-50 border-blue-200',
      job.priority === 'urgent' && 'border-l-4 border-l-red-500',
      job.priority === 'high' && 'border-l-4 border-l-orange-500',
      focusedRowIndex === index && 'ring-2 ring-blue-500 ring-opacity-50'
    )
  }, [selectedJobIds, focusedRowIndex])

  return (
    <div ref={tableRef} className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search jobs, customers, addresses, or drivers..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange?.(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Search jobs"
          />
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            websocketConnected ? 'bg-green-500' : 'bg-red-500'
          )} />
          <span className="text-sm text-gray-600">
            {websocketConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Live Region for Status Updates */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {isDragLoading && 'Updating job assignment...'}
      </div>

      {/* Table */}
      <DragContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <VirtualizedTable
          data={processedJobs}
          columns={columns}
          height={height}
          rowHeight={rowHeight}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          onRowClick={handleRowClick}
          onRowDoubleClick={handleRowDoubleClick}
          getRowId={(row) => row.id}
          loading={loading}
          emptyMessage={
            debouncedSearchTerm || filters?.status?.length || filters?.priority?.length
              ? 'No jobs match your search criteria'
              : 'No active jobs found'
          }
          rowClassName={getRowClassName}
          stickyHeader
        />

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedItem && draggedItem.type === 'driver' && (
            <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm font-medium">
                  {(draggedItem.data as Driver).name}
                </span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DragContext>

      {/* Bulk Actions */}
      {selectedJobIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedJobIds.length} job{selectedJobIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              onClick={() => console.log('Bulk dispatch:', selectedJobIds)}
            >
              Dispatch Selected
            </button>
            <button
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              onClick={() => onSelectionChange?.([])}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper component for droppable cells
const DroppableJobRowCell: React.FC<{
  job: JobRecord
  children: React.ReactNode
}> = ({ job, children }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `job-${job.id}`,
    data: {
      type: 'job',
      item: job
    }
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'w-full transition-colors duration-200',
        isOver && 'bg-blue-100 rounded'
      )}
    >
      {children}
    </div>
  )
}