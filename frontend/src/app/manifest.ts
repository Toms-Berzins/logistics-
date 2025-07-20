import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LogiTrack - Logistics Platform',
    short_name: 'LogiTrack',
    description: 'Real-time driver location tracking and dispatch management system with advanced analytics',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1E40AF',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
        purpose: 'any'
      }
    ],
    categories: ['business', 'productivity', 'utilities'],
    orientation: 'portrait-primary',
    prefer_related_applications: false,
    scope: '/',
    lang: 'en-US'
  }
}