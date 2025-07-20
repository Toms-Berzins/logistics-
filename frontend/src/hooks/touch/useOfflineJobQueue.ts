import { useState, useCallback, useEffect, useRef } from 'react'
import { JobRecord, JobUpdate, DragDropResult } from '../../types/jobs'

interface QueuedAction {
  id: string
  type: 'update' | 'assign' | 'complete' | 'create' | 'reassign'
  jobId: string
  data: any
  timestamp: number
  retryCount: number
  optimisticUpdate?: Partial<JobRecord>
}

interface OfflineJobQueueState {
  queue: QueuedAction[]
  isOnline: boolean
  isSyncing: boolean
  failedActions: QueuedAction[]
  successfulSyncs: number
  failedSyncs: number
}

interface UseOfflineJobQueueOptions {
  maxRetries?: number
  retryDelay?: number
  batchSize?: number
  enableOptimisticUpdates?: boolean
  onSyncSuccess?: (action: QueuedAction) => void
  onSyncFailure?: (action: QueuedAction, error: Error) => void
  onQueueChange?: (queue: QueuedAction[]) => void
}

const STORAGE_KEY = 'logistics-offline-queue'
const QUEUE_METADATA_KEY = 'logistics-queue-metadata'

export function useOfflineJobQueue(options: UseOfflineJobQueueOptions = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    batchSize = 5,
    enableOptimisticUpdates = true,
    onSyncSuccess,
    onSyncFailure,
    onQueueChange
  } = options

  const [state, setState] = useState<OfflineJobQueueState>({
    queue: [],
    isOnline: navigator.onLine,
    isSyncing: false,
    failedActions: [],
    successfulSyncs: 0,
    failedSyncs: 0
  })

  const syncTimeoutRef = useRef<NodeJS.Timeout>()
  const serviceWorkerRef = useRef<ServiceWorker | null>(null)

  // Load queue from localStorage on mount
  useEffect(() => {
    loadQueueFromStorage()
    loadMetadataFromStorage()
  }, [])

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    saveQueueToStorage(state.queue)
    saveMetadataToStorage({
      successfulSyncs: state.successfulSyncs,
      failedSyncs: state.failedSyncs,
      lastSync: Date.now()
    })
    onQueueChange?.(state.queue)
  }, [state.queue, state.successfulSyncs, state.failedSyncs, onQueueChange])

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }))
      // Automatically try to sync when coming back online
      syncQueue()
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Service worker communication
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        serviceWorkerRef.current = registration.active
        
        // Listen for sync messages from service worker
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
      })
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [])

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, data } = event.data

    switch (type) {
      case 'JOB_SYNCED':
        handleSyncSuccess(data)
        break
      case 'SYNC_FAILED':
        handleSyncFailure(data.action, new Error(data.error))
        break
    }
  }, [])

  // Load queue from localStorage
  const loadQueueFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const queue = JSON.parse(stored) as QueuedAction[]
        setState(prev => ({ ...prev, queue }))
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
    }
  }, [])

  // Save queue to localStorage
  const saveQueueToStorage = useCallback((queue: QueuedAction[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }, [])

  // Load metadata from localStorage
  const loadMetadataFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(QUEUE_METADATA_KEY)
      if (stored) {
        const metadata = JSON.parse(stored)
        setState(prev => ({
          ...prev,
          successfulSyncs: metadata.successfulSyncs || 0,
          failedSyncs: metadata.failedSyncs || 0
        }))
      }
    } catch (error) {
      console.error('Failed to load queue metadata:', error)
    }
  }, [])

  // Save metadata to localStorage
  const saveMetadataToStorage = useCallback((metadata: any) => {
    try {
      localStorage.setItem(QUEUE_METADATA_KEY, JSON.stringify(metadata))
    } catch (error) {
      console.error('Failed to save queue metadata:', error)
    }
  }, [])

  // Add action to queue
  const queueAction = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${action.type}-${action.jobId}-${Date.now()}`,
      timestamp: Date.now(),
      retryCount: 0
    }

    setState(prev => ({
      ...prev,
      queue: [...prev.queue, queuedAction]
    }))

    // Try immediate sync if online
    if (state.isOnline) {
      syncQueue()
    }

    // Register for background sync if available
    if (serviceWorkerRef.current) {
      serviceWorkerRef.current.postMessage({
        type: 'QUEUE_JOB_UPDATE',
        data: queuedAction
      })
    }

    return queuedAction.id
  }, [state.isOnline])

  // Remove action from queue
  const removeFromQueue = useCallback((actionId: string) => {
    setState(prev => ({
      ...prev,
      queue: prev.queue.filter(action => action.id !== actionId)
    }))
  }, [])

  // Sync queue with server
  const syncQueue = useCallback(async () => {
    if (state.isSyncing || !state.isOnline || state.queue.length === 0) {
      return
    }

    setState(prev => ({ ...prev, isSyncing: true }))

    // Process queue in batches
    const batch = state.queue.slice(0, batchSize)
    
    for (const action of batch) {
      try {
        await syncSingleAction(action)
        handleSyncSuccess(action)
      } catch (error) {
        handleSyncFailure(action, error as Error)
      }
    }

    setState(prev => ({ ...prev, isSyncing: false }))

    // Continue with next batch if more items exist
    if (state.queue.length > batchSize) {
      syncTimeoutRef.current = setTimeout(syncQueue, 100)
    }
  }, [state.isSyncing, state.isOnline, state.queue, batchSize])

  // Sync individual action
  const syncSingleAction = useCallback(async (action: QueuedAction): Promise<void> => {
    const { type, jobId, data } = action

    let endpoint = '/api/jobs'
    let method = 'POST'
    let body = data

    switch (type) {
      case 'update':
        endpoint = `/api/jobs/${jobId}`
        method = 'PATCH'
        break
      case 'assign':
        endpoint = `/api/jobs/${jobId}/assign`
        method = 'POST'
        break
      case 'reassign':
        endpoint = `/api/jobs/${jobId}/reassign`
        method = 'POST'
        break
      case 'complete':
        endpoint = `/api/jobs/${jobId}/complete`
        method = 'POST'
        break
      case 'create':
        endpoint = '/api/jobs'
        method = 'POST'
        break
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }, [])

  // Handle successful sync
  const handleSyncSuccess = useCallback((action: QueuedAction) => {
    removeFromQueue(action.id)
    setState(prev => ({
      ...prev,
      successfulSyncs: prev.successfulSyncs + 1,
      failedActions: prev.failedActions.filter(a => a.id !== action.id)
    }))
    onSyncSuccess?.(action)
  }, [removeFromQueue, onSyncSuccess])

  // Handle sync failure
  const handleSyncFailure = useCallback((action: QueuedAction, error: Error) => {
    setState(prev => {
      const updatedAction = { ...action, retryCount: action.retryCount + 1 }
      
      if (updatedAction.retryCount >= maxRetries) {
        // Move to failed actions after max retries
        return {
          ...prev,
          queue: prev.queue.filter(a => a.id !== action.id),
          failedActions: [...prev.failedActions, updatedAction],
          failedSyncs: prev.failedSyncs + 1
        }
      } else {
        // Update retry count and schedule retry
        const updatedQueue = prev.queue.map(a => 
          a.id === action.id ? updatedAction : a
        )
        
        // Schedule retry with exponential backoff
        const delay = retryDelay * Math.pow(2, updatedAction.retryCount)
        setTimeout(() => {
          if (state.isOnline) {
            syncQueue()
          }
        }, delay)
        
        return { ...prev, queue: updatedQueue }
      }
    })
    
    onSyncFailure?.(action, error)
  }, [maxRetries, retryDelay, state.isOnline, syncQueue, onSyncFailure])

  // Public API methods
  const updateJob = useCallback(async (jobId: string, updates: Partial<JobRecord>): Promise<DragDropResult> => {
    const actionId = queueAction({
      type: 'update',
      jobId,
      data: updates,
      optimisticUpdate: enableOptimisticUpdates ? updates : undefined
    })

    if (state.isOnline) {
      try {
        await syncQueue()
        return { jobId, driverId: '', success: true }
      } catch (error) {
        return { jobId, driverId: '', success: false, error: (error as Error).message }
      }
    }

    return { jobId, driverId: '', success: true } // Optimistic success for offline
  }, [queueAction, enableOptimisticUpdates, state.isOnline, syncQueue])

  const assignDriver = useCallback(async (jobId: string, driverId: string): Promise<DragDropResult> => {
    const actionId = queueAction({
      type: 'assign',
      jobId,
      data: { driverId },
      optimisticUpdate: enableOptimisticUpdates ? { assignedDriver: { id: driverId } as any } : undefined
    })

    if (state.isOnline) {
      try {
        await syncQueue()
        return { jobId, driverId, success: true }
      } catch (error) {
        return { jobId, driverId, success: false, error: (error as Error).message }
      }
    }

    return { jobId, driverId, success: true }
  }, [queueAction, enableOptimisticUpdates, state.isOnline, syncQueue])

  const completeJob = useCallback(async (jobId: string): Promise<DragDropResult> => {
    const actionId = queueAction({
      type: 'complete',
      jobId,
      data: {},
      optimisticUpdate: enableOptimisticUpdates ? { status: 'delivered' as const } : undefined
    })

    if (state.isOnline) {
      try {
        await syncQueue()
        return { jobId, driverId: '', success: true }
      } catch (error) {
        return { jobId, driverId: '', success: false, error: (error as Error).message }
      }
    }

    return { jobId, driverId: '', success: true }
  }, [queueAction, enableOptimisticUpdates, state.isOnline, syncQueue])

  // Manual sync trigger
  const forceSyncQueue = useCallback(() => {
    if (state.isOnline) {
      syncQueue()
    }
  }, [state.isOnline, syncQueue])

  // Retry failed actions
  const retryFailedActions = useCallback(() => {
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, ...prev.failedActions.map(action => ({ ...action, retryCount: 0 }))],
      failedActions: []
    }))
    
    if (state.isOnline) {
      syncQueue()
    }
  }, [state.isOnline, syncQueue])

  // Clear all queued actions
  const clearQueue = useCallback(() => {
    setState(prev => ({
      ...prev,
      queue: [],
      failedActions: []
    }))
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    queue: state.queue,
    failedActions: state.failedActions,
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    queueSize: state.queue.length,
    failedCount: state.failedActions.length,
    stats: {
      successful: state.successfulSyncs,
      failed: state.failedSyncs,
      pending: state.queue.length
    },

    // Actions
    updateJob,
    assignDriver,
    completeJob,
    forceSyncQueue,
    retryFailedActions,
    clearQueue
  }
}