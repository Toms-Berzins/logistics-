import React, { useState, useCallback } from 'react'
import { 
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { JobRecord, Driver, DragDropResult } from '../types/jobs'

interface UseJobDragDropProps {
  jobs: JobRecord[]
  drivers: Driver[]
  onAssignDriver: (jobId: string, driverId: string) => Promise<DragDropResult>
  onReassignDriver: (jobId: string, newDriverId: string, oldDriverId: string) => Promise<DragDropResult>
}

interface DraggedItem {
  type: 'driver' | 'job'
  id: string
  data: Driver | JobRecord
}

export function useJobDragDrop({
  jobs,
  drivers,
  onAssignDriver,
  onReassignDriver
}: UseJobDragDropProps) {
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, string>>(new Map())

  // Sensors for better accessibility and performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags on click
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const activeData = active.data.current

    if (activeData) {
      setDraggedItem({
        type: activeData.type,
        id: active.id as string,
        data: activeData.item
      })
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    
    setDraggedItem(null)

    if (!over || !active.data.current || !over.data.current) {
      return
    }

    const draggedType = active.data.current.type
    const dropZoneType = over.data.current.type
    const draggedId = active.id as string
    const dropZoneId = over.id as string

    // Handle driver dragged onto job row
    if (draggedType === 'driver' && dropZoneType === 'job') {
      await handleDriverToJobAssignment(draggedId, dropZoneId)
    }

    // Handle job dragged onto driver
    if (draggedType === 'job' && dropZoneType === 'driver') {
      await handleJobToDriverAssignment(draggedId, dropZoneId)
    }
  }, [jobs, drivers, onAssignDriver, onReassignDriver])

  const handleDriverToJobAssignment = async (driverId: string, jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    const driver = drivers.find(d => d.id === driverId)

    if (!job || !driver) return

    // Check if driver is available
    if (driver.status !== 'available') {
      // Show error - driver not available
      return
    }

    setIsLoading(true)

    try {
      // Optimistic update
      setOptimisticUpdates(prev => new Map(prev).set(jobId, driverId))

      let result: DragDropResult

      if (job.assignedDriver) {
        // Reassignment
        result = await onReassignDriver(jobId, driverId, job.assignedDriver.id)
      } else {
        // New assignment
        result = await onAssignDriver(jobId, driverId)
      }

      if (!result.success) {
        // Rollback optimistic update
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev)
          newMap.delete(jobId)
          return newMap
        })
        
        // Show error message
        console.error('Assignment failed:', result.error)
      } else {
        // Clear optimistic update (server will send real update)
        setOptimisticUpdates(prev => {
          const newMap = new Map(prev)
          newMap.delete(jobId)
          return newMap
        })
      }
    } catch (error) {
      // Rollback optimistic update
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev)
        newMap.delete(jobId)
        return newMap
      })
      console.error('Assignment error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJobToDriverAssignment = async (jobId: string, driverId: string) => {
    // Similar logic but reversed
    await handleDriverToJobAssignment(driverId, jobId)
  }

  // Get optimistically updated job data
  const getJobWithOptimisticUpdate = useCallback((job: JobRecord): JobRecord => {
    const optimisticDriverId = optimisticUpdates.get(job.id)
    if (optimisticDriverId) {
      const optimisticDriver = drivers.find(d => d.id === optimisticDriverId)
      if (optimisticDriver) {
        return {
          ...job,
          assignedDriver: optimisticDriver,
          status: 'assigned' as const
        }
      }
    }
    return job
  }, [optimisticUpdates, drivers])

  return {
    draggedItem,
    isLoading,
    sensors,
    handleDragStart,
    handleDragEnd,
    getJobWithOptimisticUpdate,
    DndContext
  }
}

// Helper component for draggable driver badges
export function DraggableDriverBadge({ 
  driver, 
  children 
}: { 
  driver: Driver
  children: React.ReactNode 
}): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: driver.id,
    data: {
      type: 'driver',
      item: driver
    }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 z-50' : ''
      }`}
      role="button"
      tabIndex={0}
      aria-label={`Drag ${driver.name} to assign to job`}
    >
      {children}
    </div>
  )
}

// Helper component for droppable job rows
export function DroppableJobRow({
  job,
  children,
  isOver
}: {
  job: JobRecord
  children: React.ReactNode
  isOver?: boolean
}) {
  const { setNodeRef } = useDroppable({
    id: job.id,
    data: {
      type: 'job',
      item: job
    }
  })

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors duration-200 ${
        isOver ? 'bg-blue-50 border-blue-200' : ''
      }`}
      data-job-id={job.id}
    >
      {children}
    </div>
  )
}