/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope

// Take control of all pages under this SW's scope immediately,
// instead of waiting for reload/navigation.
clientsClaim()

// Clean up any previous precache.
cleanupOutdatedCaches()

// Precache and route the app shell and static assets
precacheAndRoute(self.__WB_MANIFEST)

// Cache strategies for different types of requests

// 1. API requests - Network first with fallback to cache
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
)

// 2. Job data - Stale while revalidate for quick loading
registerRoute(
  ({ url }) => url.pathname.includes('/jobs') || url.pathname.includes('/drivers'),
  new StaleWhileRevalidate({
    cacheName: 'jobs-data-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 30, // 30 minutes
      }),
    ],
  })
)

// 3. Static assets - Cache first
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'worker',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// 4. Images - Cache first with fallback
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// Background sync for job updates
interface SyncJobData {
  jobId: string
  action: 'update' | 'assign' | 'complete'
  data: any
  timestamp: number
}

let jobSyncQueue: SyncJobData[] = []

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'job-sync') {
    event.waitUntil(syncJobUpdates())
  }
})

async function syncJobUpdates() {
  // Get queued job updates from IndexedDB
  const queue = await getJobSyncQueue()
  
  for (const job of queue) {
    try {
      await syncSingleJob(job)
      await removeFromSyncQueue(job)
    } catch (error) {
      console.error('Failed to sync job:', job.jobId, error)
      // Keep in queue for retry
    }
  }
}

async function syncSingleJob(job: SyncJobData) {
  const response = await fetch('/api/jobs/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(job)
  })
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`)
  }
  
  // Notify all clients about successful sync
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({
      type: 'JOB_SYNCED',
      data: job
    })
  })
}

// IndexedDB operations for offline queue
async function openJobSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('JobSyncDB', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('jobId', 'jobId', { unique: false })
      }
    }
  })
}

async function addToSyncQueue(job: SyncJobData) {
  const db = await openJobSyncDB()
  const transaction = db.transaction(['syncQueue'], 'readwrite')
  const store = transaction.objectStore('syncQueue')
  await store.add(job)
}

async function getJobSyncQueue(): Promise<SyncJobData[]> {
  const db = await openJobSyncDB()
  const transaction = db.transaction(['syncQueue'], 'readonly')
  const store = transaction.objectStore('syncQueue')
  const request = store.getAll()
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function removeFromSyncQueue(job: SyncJobData) {
  const db = await openJobSyncDB()
  const transaction = db.transaction(['syncQueue'], 'readwrite')
  const store = transaction.objectStore('syncQueue')
  
  // Find and delete the job entry
  const index = store.index('jobId')
  const request = index.openCursor(IDBKeyRange.only(job.jobId))
  
  return new Promise<void>((resolve, reject) => {
    request.onsuccess = () => {
      const cursor = request.result
      if (cursor) {
        cursor.delete()
        resolve()
      } else {
        resolve()
      }
    }
    request.onerror = () => reject(request.error)
  })
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'QUEUE_JOB_UPDATE':
      queueJobUpdate(data)
      break
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status)
      })
      break
  }
})

async function queueJobUpdate(jobData: SyncJobData) {
  await addToSyncQueue(jobData)
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    try {
      await syncSingleJob(jobData)
      await removeFromSyncQueue(jobData)
    } catch (error) {
      // Will be retried on next sync event
      console.log('Immediate sync failed, queued for background sync')
    }
  }
  
  // Register for background sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready
    await registration.sync.register('job-sync')
  }
}

async function getCacheStatus() {
  const cacheNames = await caches.keys()
  const status = {
    caches: cacheNames.length,
    queuedJobs: (await getJobSyncQueue()).length,
    isOnline: navigator.onLine
  }
  return status
}

// Push notifications for job assignments
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const options: NotificationOptions = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'View Job',
        icon: '/icons/view-action.png'
      },
      {
        action: 'accept',
        title: 'Accept',
        icon: '/icons/accept-action.png'
      }
    ],
    requireInteraction: true,
    tag: 'job-notification'
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const action = event.action
  const data = event.notification.data
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.focus()
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action,
            data
          })
          return
        }
      }
      
      // Open new window
      const url = action === 'view' 
        ? `/dashboard/jobs/${data.jobId}`
        : '/dashboard/jobs'
        
      return clients.openWindow(url)
    })
  )
})

// Handle install and activate events
self.addEventListener('install', (event) => {
  console.log('Service Worker installing')
  // Skip waiting to activate immediately
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating')
  // Claim all clients immediately
  event.waitUntil(clients.claim())
})

// Export for TypeScript
export {};