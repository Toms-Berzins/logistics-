import React, { useState, useEffect, useCallback } from 'react'
import { cn } from '../../lib/utils'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PWAInstallPromptProps {
  className?: string
  onInstall?: () => void
  onDismiss?: () => void
  autoShow?: boolean
  showAfterDelay?: number
  persistDismissal?: boolean
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  className,
  onInstall,
  onDismiss,
  autoShow = true,
  showAfterDelay = 3000,
  persistDismissal = true
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | 'unknown'>('unknown')
  const [installInstructions, setInstallInstructions] = useState<string>('')

  // Detection logic
  useEffect(() => {
    detectPlatform()
    checkIfInstalled()
    
    if (persistDismissal && localStorage.getItem('pwa-install-dismissed')) {
      return
    }

    // Android Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      if (autoShow) {
        setTimeout(() => setShowPrompt(true), showAfterDelay)
      }
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      onInstall?.()
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [autoShow, showAfterDelay, persistDismissal, onInstall])

  const detectPlatform = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
    const isAndroid = /android/.test(userAgent)
    const isDesktop = !isIOS && !isAndroid

    if (isIOS) {
      setPlatform('ios')
      setInstallInstructions('Tap the Share button and then "Add to Home Screen"')
    } else if (isAndroid) {
      setPlatform('android')
      setInstallInstructions('Tap "Add to Home Screen" in your browser menu')
    } else if (isDesktop) {
      setPlatform('desktop')
      setInstallInstructions('Click the install button in your address bar')
    } else {
      setPlatform('unknown')
      setInstallInstructions('Add this app to your home screen for quick access')
    }
  }, [])

  const checkIfInstalled = useCallback(() => {
    // Check if running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://')
    
    setIsInstalled(isStandalone)
  }, [])

  const handleInstallClick = useCallback(async () => {
    if (deferredPrompt) {
      // Android Chrome
      deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        onInstall?.()
      } else {
        onDismiss?.()
      }
      
      setDeferredPrompt(null)
      setShowPrompt(false)
    } else if (platform === 'ios') {
      // iOS Safari - show instructions
      setShowPrompt(true)
    } else if (platform === 'android') {
      // Android other browsers - show instructions
      setShowPrompt(true)
    }
  }, [deferredPrompt, platform, onInstall, onDismiss])

  const handleDismiss = useCallback(() => {
    setShowPrompt(false)
    
    if (persistDismissal) {
      localStorage.setItem('pwa-install-dismissed', 'true')
    }
    
    onDismiss?.()
  }, [persistDismissal, onDismiss])

  // Don't show if already installed
  if (isInstalled) {
    return null
  }

  return (
    <>
      {/* Install Button - always available */}
      <InstallButton
        onClick={handleInstallClick}
        platform={platform}
        className={className}
        available={!!deferredPrompt || platform === 'ios'}
      />

      {/* Modal Prompt */}
      {showPrompt && (
        <InstallModal
          platform={platform}
          instructions={installInstructions}
          onInstall={handleInstallClick}
          onDismiss={handleDismiss}
          deferredPrompt={deferredPrompt}
        />
      )}
    </>
  )
}

// Install button component
interface InstallButtonProps {
  onClick: () => void
  platform: string
  className?: string
  available: boolean
}

const InstallButton: React.FC<InstallButtonProps> = ({
  onClick,
  platform,
  className,
  available
}) => {
  if (!available) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-4 py-2 text-sm font-medium',
        'bg-blue-600 hover:bg-blue-700 text-white rounded-lg',
        'transition-colors duration-200',
        'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      aria-label="Install app"
    >
      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Install App
    </button>
  )
}

// Install modal component
interface InstallModalProps {
  platform: string
  instructions: string
  onInstall: () => void
  onDismiss: () => void
  deferredPrompt: BeforeInstallPromptEvent | null
}

const InstallModal: React.FC<InstallModalProps> = ({
  platform,
  instructions,
  onInstall,
  onDismiss,
  deferredPrompt
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Install Logistics App
          </h3>
          <button
            onClick={onDismiss}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* App Icon and Description */}
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Logistics Operations</h4>
            <p className="text-sm text-gray-600">Fast, reliable, works offline</p>
          </div>
        </div>

        {/* Platform-specific instructions */}
        {platform === 'ios' && (
          <IOSInstallInstructions />
        )}

        {platform === 'android' && !deferredPrompt && (
          <AndroidInstallInstructions />
        )}

        {/* Instructions text */}
        <p className="text-sm text-gray-600 mb-6">{instructions}</p>

        {/* Action buttons */}
        <div className="flex space-x-3">
          {deferredPrompt ? (
            <button
              onClick={onInstall}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
            >
              Install Now
            </button>
          ) : (
            <button
              onClick={onDismiss}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
            >
              Got it
            </button>
          )}
          
          <button
            onClick={onDismiss}
            className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
          >
            Maybe later
          </button>
        </div>

        {/* Benefits */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <h5 className="text-sm font-medium text-gray-900 mb-3">Benefits of installing:</h5>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Works offline - access jobs without internet
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Faster loading and app-like experience
            </li>
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Push notifications for new job assignments
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// iOS-specific install instructions
const IOSInstallInstructions: React.FC = () => (
  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-blue-600">1</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600">
          Tap the <strong>Share</strong> button
        </p>
        <div className="mt-1">
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
        </div>
      </div>
    </div>
    
    <div className="flex items-start space-x-3 mt-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-blue-600">2</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600">
          Select <strong>"Add to Home Screen"</strong>
        </p>
      </div>
    </div>
  </div>
)

// Android-specific install instructions
const AndroidInstallInstructions: React.FC = () => (
  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-green-600">1</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600">
          Tap the <strong>menu</strong> button (⋮)
        </p>
      </div>
    </div>
    
    <div className="flex items-start space-x-3 mt-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <span className="text-sm font-semibold text-green-600">2</span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-600">
          Select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>
        </p>
      </div>
    </div>
  </div>
)

// Hook for PWA install detection
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://')
    
    setIsInstalled(isStandalone)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false

    deferredPrompt.prompt()
    const result = await deferredPrompt.userChoice
    
    setDeferredPrompt(null)
    setCanInstall(false)
    
    return result.outcome === 'accepted'
  }, [deferredPrompt])

  return {
    canInstall,
    isInstalled,
    install
  }
}