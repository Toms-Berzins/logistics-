import { useState, useEffect, useCallback, useRef } from 'react'

interface PushNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  actions?: NotificationAction[]
  requireInteraction?: boolean
  silent?: boolean
  vibrate?: number[]
}

interface NotificationPermissionState {
  permission: NotificationPermission
  supported: boolean
  canRequest: boolean
}

interface UsePushNotificationsOptions {
  vapidKey?: string
  serviceWorkerPath?: string
  onSubscription?: (subscription: PushSubscription) => void
  onNotificationClick?: (data: any) => void
  onPermissionChange?: (permission: NotificationPermission) => void
  autoSubscribe?: boolean
}

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const {
    vapidKey,
    serviceWorkerPath = '/service-worker.js',
    onSubscription,
    onNotificationClick,
    onPermissionChange,
    autoSubscribe = false
  } = options

  const [permissionState, setPermissionState] = useState<NotificationPermissionState>({
    permission: 'default',
    supported: false,
    canRequest: false
  })
  
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isSubscribing, setIsSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const serviceWorkerRegistration = useRef<ServiceWorkerRegistration | null>(null)

  // Initialize on mount
  useEffect(() => {
    initializePushNotifications()
  }, [])

  // Auto-subscribe if enabled and permission granted
  useEffect(() => {
    if (autoSubscribe && permissionState.permission === 'granted' && !subscription) {
      subscribeToPush()
    }
  }, [autoSubscribe, permissionState.permission, subscription])

  const initializePushNotifications = useCallback(async () => {
    try {
      // Check browser support
      const supported = 'Notification' in window && 
                       'serviceWorker' in navigator && 
                       'PushManager' in window

      if (!supported) {
        setPermissionState(prev => ({ ...prev, supported: false }))
        return
      }

      // Get current permission
      const permission = Notification.permission
      const canRequest = permission === 'default'

      setPermissionState({
        permission,
        supported: true,
        canRequest
      })

      // Register service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register(serviceWorkerPath)
        serviceWorkerRegistration.current = registration

        // Check for existing subscription
        const existingSubscription = await registration.pushManager.getSubscription()
        if (existingSubscription) {
          setSubscription(existingSubscription)
          onSubscription?.(existingSubscription)
        }

        // Listen for notification clicks
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
      }
    } catch (err) {
      setError(`Failed to initialize push notifications: ${(err as Error).message}`)
    }
  }, [serviceWorkerPath, onSubscription])

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, data } = event.data

    if (type === 'NOTIFICATION_CLICKED') {
      onNotificationClick?.(data)
    }
  }, [onNotificationClick])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!permissionState.supported) {
      throw new Error('Push notifications not supported')
    }

    if (permissionState.permission === 'granted') {
      return 'granted'
    }

    try {
      const permission = await Notification.requestPermission()
      
      setPermissionState(prev => ({
        ...prev,
        permission,
        canRequest: permission === 'default'
      }))

      onPermissionChange?.(permission)
      
      return permission
    } catch (err) {
      setError(`Failed to request permission: ${(err as Error).message}`)
      throw err
    }
  }, [permissionState, onPermissionChange])

  const subscribeToPush = useCallback(async (): Promise<PushSubscription | null> => {
    if (!serviceWorkerRegistration.current) {
      throw new Error('Service worker not registered')
    }

    if (permissionState.permission !== 'granted') {
      const permission = await requestPermission()
      if (permission !== 'granted') {
        throw new Error('Permission denied')
      }
    }

    setIsSubscribing(true)
    setError(null)

    try {
      const subscriptionOptions: PushSubscriptionOptions = {
        userVisibleOnly: true
      }

      if (vapidKey) {
        subscriptionOptions.applicationServerKey = urlBase64ToUint8Array(vapidKey)
      }

      const pushSubscription = await serviceWorkerRegistration.current.pushManager.subscribe(subscriptionOptions)
      
      setSubscription(pushSubscription)
      onSubscription?.(pushSubscription)
      
      return pushSubscription
    } catch (err) {
      const errorMessage = `Failed to subscribe to push notifications: ${(err as Error).message}`
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsSubscribing(false)
    }
  }, [permissionState.permission, requestPermission, vapidKey, onSubscription])

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      return true
    }

    try {
      const result = await subscription.unsubscribe()
      if (result) {
        setSubscription(null)
      }
      return result
    } catch (err) {
      setError(`Failed to unsubscribe: ${(err as Error).message}`)
      return false
    }
  }, [subscription])

  const showNotification = useCallback(async (options: PushNotificationOptions) => {
    if (!serviceWorkerRegistration.current) {
      throw new Error('Service worker not registered')
    }

    if (permissionState.permission !== 'granted') {
      throw new Error('Permission not granted')
    }

    const notificationOptions: NotificationOptions = {
      body: options.body,
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/badge-72x72.png',
      tag: options.tag,
      data: options.data,
      actions: options.actions,
      requireInteraction: options.requireInteraction,
      silent: options.silent,
      vibrate: options.vibrate || [100, 50, 100]
    }

    return serviceWorkerRegistration.current.showNotification(options.title, notificationOptions)
  }, [permissionState.permission])

  // Job-specific notification helpers
  const notifyJobAssigned = useCallback(async (jobId: string, customerName: string, driverName: string) => {
    return showNotification({
      title: 'New Job Assigned',
      body: `Job for ${customerName} assigned to ${driverName}`,
      tag: `job-assigned-${jobId}`,
      data: { type: 'job_assigned', jobId, customerName, driverName },
      actions: [
        { action: 'view', title: 'View Job', icon: '/icons/view-action.png' },
        { action: 'navigate', title: 'Navigate', icon: '/icons/navigate-action.png' }
      ],
      requireInteraction: true
    })
  }, [showNotification])

  const notifyJobCompleted = useCallback(async (jobId: string, customerName: string) => {
    return showNotification({
      title: 'Job Completed',
      body: `Delivery to ${customerName} completed successfully`,
      tag: `job-completed-${jobId}`,
      data: { type: 'job_completed', jobId, customerName },
      vibrate: [100, 50, 100, 50, 100]
    })
  }, [showNotification])

  const notifyJobDelayed = useCallback(async (jobId: string, customerName: string, reason: string) => {
    return showNotification({
      title: 'Job Delayed',
      body: `Delivery to ${customerName} is delayed: ${reason}`,
      tag: `job-delayed-${jobId}`,
      data: { type: 'job_delayed', jobId, customerName, reason },
      actions: [
        { action: 'reschedule', title: 'Reschedule', icon: '/icons/reschedule-action.png' },
        { action: 'contact', title: 'Contact Customer', icon: '/icons/contact-action.png' }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    })
  }, [showNotification])

  const notifyNewJobAvailable = useCallback(async (jobId: string, customerName: string, priority: 'low' | 'medium' | 'high' | 'urgent') => {
    const vibrationPattern = priority === 'urgent' ? [300, 100, 300, 100, 300] : [100, 50, 100]
    
    return showNotification({
      title: `New ${priority === 'urgent' ? 'Urgent ' : ''}Job Available`,
      body: `Delivery job for ${customerName} needs assignment`,
      tag: `new-job-${jobId}`,
      data: { type: 'new_job', jobId, customerName, priority },
      actions: [
        { action: 'assign', title: 'Assign Driver', icon: '/icons/assign-action.png' },
        { action: 'view', title: 'View Details', icon: '/icons/view-action.png' }
      ],
      requireInteraction: priority === 'urgent',
      vibrate: vibrationPattern
    })
  }, [showNotification])

  // Batch notifications for multiple jobs
  const notifyBatchUpdate = useCallback(async (jobs: Array<{ id: string; customer: string; status: string }>) => {
    return showNotification({
      title: 'Multiple Jobs Updated',
      body: `${jobs.length} jobs have been updated`,
      tag: 'batch-update',
      data: { type: 'batch_update', jobs },
      actions: [
        { action: 'view_all', title: 'View All', icon: '/icons/view-all-action.png' }
      ]
    })
  }, [showNotification])

  return {
    // State
    permissionState,
    subscription,
    isSubscribing,
    error,
    isSubscribed: !!subscription,

    // Actions
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    showNotification,

    // Job-specific notifications
    notifyJobAssigned,
    notifyJobCompleted,
    notifyJobDelayed,
    notifyNewJobAvailable,
    notifyBatchUpdate
  }
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Hook for notification analytics
export function useNotificationAnalytics() {
  const [stats, setStats] = useState({
    sent: 0,
    clicked: 0,
    dismissed: 0,
    clickRate: 0
  })

  const trackNotificationSent = useCallback(() => {
    setStats(prev => ({
      ...prev,
      sent: prev.sent + 1
    }))
  }, [])

  const trackNotificationClicked = useCallback(() => {
    setStats(prev => {
      const clicked = prev.clicked + 1
      return {
        ...prev,
        clicked,
        clickRate: prev.sent > 0 ? (clicked / prev.sent) * 100 : 0
      }
    })
  }, [])

  const trackNotificationDismissed = useCallback(() => {
    setStats(prev => ({
      ...prev,
      dismissed: prev.dismissed + 1
    }))
  }, [])

  return {
    stats,
    trackNotificationSent,
    trackNotificationClicked,
    trackNotificationDismissed
  }
}

// Context for managing push notifications across the app
import { createContext, useContext } from 'react'

interface PushNotificationContextValue {
  permissionState: NotificationPermissionState
  subscription: PushSubscription | null
  subscribeToPush: () => Promise<PushSubscription | null>
  unsubscribeFromPush: () => Promise<boolean>
  notifyJobAssigned: (jobId: string, customerName: string, driverName: string) => Promise<void>
  notifyJobCompleted: (jobId: string, customerName: string) => Promise<void>
  notifyJobDelayed: (jobId: string, customerName: string, reason: string) => Promise<void>
  notifyNewJobAvailable: (jobId: string, customerName: string, priority: 'low' | 'medium' | 'high' | 'urgent') => Promise<void>
}

const PushNotificationContext = createContext<PushNotificationContextValue | null>(null)

export const usePushNotificationContext = () => {
  const context = useContext(PushNotificationContext)
  if (!context) {
    throw new Error('usePushNotificationContext must be used within PushNotificationProvider')
  }
  return context
}

export const PushNotificationProvider: React.FC<{ 
  children: React.ReactNode
  vapidKey?: string 
}> = ({ children, vapidKey }) => {
  const pushNotifications = usePushNotifications({ vapidKey, autoSubscribe: true })

  return (
    <PushNotificationContext.Provider value={pushNotifications}>
      {children}
    </PushNotificationContext.Provider>
  )
}