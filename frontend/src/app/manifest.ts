import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Logistics Dispatch Platform',
    short_name: 'LogiDispatch',
    description: 'Real-time driver location tracking and dispatch management system',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1E40AF',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ],
    categories: ['business', 'productivity', 'utilities'],
    screenshots: [
      {
        src: '/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide'
      },
      {
        src: '/screenshot-mobile.png',
        sizes: '390x844',
        type: 'image/png',
        form_factor: 'narrow'
      }
    ],
    orientation: 'portrait-primary',
    prefer_related_applications: false,
    scope: '/',
    launch_handler: {
      client_mode: 'navigate-existing'
    },
    share_target: {
      action: '/share-target/',
      method: 'POST',
      params: {
        title: 'title',
        text: 'text',
        url: 'url'
      }
    }
  }
}