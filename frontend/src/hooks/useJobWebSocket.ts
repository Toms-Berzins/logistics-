import { useEffect, useCallback, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { JobRecord, JobUpdate } from '../types/jobs'

interface JobWebSocketEvents {
  'job-status-update': (update: JobUpdate) => void
  'job-assigned': (job: JobRecord) => void
  'job-reassigned': (job: JobRecord) => void
  'job-created': (job: JobRecord) => void
  'job-deleted': (jobId: string) => void
  'driver-location-update': (update: { driverId: string; location: [number, number]; timestamp: string }) => void
}

interface UseJobWebSocketProps {
  url?: string
  enabled?: boolean
  onJobUpdate?: (update: JobUpdate) => void
  onJobCreated?: (job: JobRecord) => void
  onJobDeleted?: (jobId: string) => void
  onJobAssigned?: (job: JobRecord) => void
  onJobReassigned?: (job: JobRecord) => void
  onDriverLocationUpdate?: (update: { driverId: string; location: [number, number]; timestamp: string }) => void
  reconnectAttempts?: number
  reconnectDelay?: number
}

export function useJobWebSocket({
  url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
  enabled = true,
  onJobUpdate,
  onJobCreated,
  onJobDeleted,
  onJobAssigned,
  onJobReassigned,
  onDriverLocationUpdate,
  reconnectAttempts = 5,
  reconnectDelay = 3000
}: UseJobWebSocketProps = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [reconnectCount, setReconnectCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!enabled || socketRef.current?.connected) return

    try {
      const socket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: false, // We'll handle reconnection manually
      })

      socket.on('connect', () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setReconnectCount(0)
        
        // Join job updates room
        socket.emit('join-room', 'job-updates')
      })

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason)
        setIsConnected(false)
        
        // Auto-reconnect unless manually disconnected
        if (reason !== 'io client disconnect' && reconnectCount < reconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting... attempt ${reconnectCount + 1}`)
            setReconnectCount(prev => prev + 1)
            connect()
          }, reconnectDelay)
        }
      })

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error)
        setIsConnected(false)
      })

      // Job event listeners
      socket.on('job-status-update', (update: JobUpdate) => {
        console.log('Job status update received:', update)
        setLastUpdate(new Date())
        onJobUpdate?.(update)
      })

      socket.on('job-assigned', (job: JobRecord) => {
        console.log('Job assigned:', job.id)
        setLastUpdate(new Date())
        onJobAssigned?.(job)
      })

      socket.on('job-reassigned', (job: JobRecord) => {
        console.log('Job reassigned:', job.id)
        setLastUpdate(new Date())
        onJobReassigned?.(job)
      })

      socket.on('job-created', (job: JobRecord) => {
        console.log('Job created:', job.id)
        setLastUpdate(new Date())
        onJobCreated?.(job)
      })

      socket.on('job-deleted', (jobId: string) => {
        console.log('Job deleted:', jobId)
        setLastUpdate(new Date())
        onJobDeleted?.(jobId)
      })

      socket.on('driver-location-update', (update: { driverId: string; location: [number, number]; timestamp: string }) => {
        onDriverLocationUpdate?.(update)
      })

      socketRef.current = socket
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setIsConnected(false)
    }
  }, [
    url,
    enabled,
    reconnectCount,
    reconnectAttempts,
    reconnectDelay,
    onJobUpdate,
    onJobCreated,
    onJobDeleted,
    onJobAssigned,
    onJobReassigned,
    onDriverLocationUpdate
  ])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    
    setIsConnected(false)
    setReconnectCount(0)
  }, [])

  const emit = useCallback(<T extends keyof JobWebSocketEvents>(
    event: T,
    data: Parameters<JobWebSocketEvents[T]>[0]
  ) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('Cannot emit event: WebSocket not connected')
    }
  }, [])

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    reconnectCount,
    lastUpdate,
    connect,
    disconnect,
    emit,
    socket: socketRef.current
  }
}

// Custom hook for specific job updates
export function useJobStatusUpdates(
  onJobUpdate: (update: JobUpdate) => void,
  options?: Omit<UseJobWebSocketProps, 'onJobUpdate'>
) {
  const [updates, setUpdates] = useState<JobUpdate[]>([])
  const [latestUpdate, setLatestUpdate] = useState<JobUpdate | null>(null)

  const handleJobUpdate = useCallback((update: JobUpdate) => {
    setUpdates(prev => [update, ...prev.slice(0, 99)]) // Keep last 100 updates
    setLatestUpdate(update)
    onJobUpdate(update)
  }, [onJobUpdate])

  const websocket = useJobWebSocket({
    ...options,
    onJobUpdate: handleJobUpdate
  })

  return {
    ...websocket,
    updates,
    latestUpdate,
    clearUpdates: () => setUpdates([])
  }
}