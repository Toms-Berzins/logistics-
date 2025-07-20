'use client'

import React, { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { Badge } from '../ui'
import { useRealtimeConnection, useRealtimeStats, useRealtimeErrors } from '../../context/RealtimeProvider'
import { ConnectionState, ConnectionQuality } from '../../lib/websocket'

export interface ConnectionStatusProps {
  isConnected?: boolean
  connectionQuality?: ConnectionQuality
  lastError?: { message: string; timestamp: Date }
  onRetry?: () => void
  className?: string
  showDetails?: boolean
  useContext?: boolean // Whether to use the realtime context or props
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected: propIsConnected,
  connectionQuality: propConnectionQuality,
  lastError: propLastError,
  onRetry: propOnRetry,
  className,
  showDetails = false,
  useContext = true,
}) => {
  const [isRetrying, setIsRetrying] = useState(false)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())

  // Use context if enabled, otherwise use props
  const contextConnection = useContext ? (() => {
    try {
      return useRealtimeConnection()
    } catch {
      return null
    }
  })() : null
  
  const contextStats = useContext ? (() => {
    try {
      return useRealtimeStats()
    } catch {
      return null
    }
  })() : null
  
  const contextErrors = useContext ? (() => {
    try {
      return useRealtimeErrors()
    } catch {
      return null
    }
  })() : null

  const isConnected = useContext && contextConnection ? contextConnection.isConnected : propIsConnected ?? false
  const connectionQuality = useContext && contextConnection ? contextConnection.connectionQuality : propConnectionQuality ?? 'offline'
  const lastError = useContext && contextErrors ? contextErrors.lastError : propLastError
  const onRetry = useContext && contextConnection ? contextConnection.reconnect : propOnRetry

  useEffect(() => {
    if (isConnected) {
      setLastUpdateTime(new Date())
    }
  }, [isConnected])

  const handleRetry = async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true)
      try {
        await onRetry()
      } finally {
        setIsRetrying(false)
      }
    }
  }

  const getStatusConfig = () => {
    if (!isConnected) {
      return {
        variant: 'error' as const,
        label: 'Disconnected',
        icon: (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ),
        pulse: false,
      }
    }

    switch (connectionQuality) {
      case 'excellent':
        return {
          variant: 'success' as const,
          label: 'Excellent',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586l5.293-5.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          pulse: false,
        }
      case 'good':
        return {
          variant: 'success' as const,
          label: 'Good',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          ),
          pulse: false,
        }
      case 'poor':
        return {
          variant: 'warning' as const,
          label: 'Poor',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          pulse: true,
        }
      default:
        return {
          variant: 'neutral' as const,
          label: 'Unknown',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          ),
          pulse: false,
        }
    }
  }

  const statusConfig = getStatusConfig()

  const formatLastUpdate = () => {
    if (!isConnected) return 'Never'
    const now = new Date()
    const diff = now.getTime() - lastUpdateTime.getTime()
    const seconds = Math.floor(diff / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge 
        variant={statusConfig.variant}
        pulse={statusConfig.pulse}
        dot
        className="select-none"
      >
        <span className="flex items-center gap-1">
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </Badge>

      {showDetails && (
        <div className="flex flex-col text-xs text-neutral-500">
          <span>Last update: {formatLastUpdate()}</span>
          {contextStats?.stats && (
            <div className="flex flex-col gap-1 mt-1">
              <span>Uptime: {Math.floor(contextStats.stats.uptime / 1000)}s</span>
              <span>Messages: {contextStats.stats.messagesSent}/{contextStats.stats.messagesReceived}</span>
              {contextStats.stats.pendingOptimisticUpdates > 0 && (
                <span className="text-warning-600">
                  Pending: {contextStats.stats.pendingOptimisticUpdates}
                </span>
              )}
              {contextStats.stats.queuedMessages > 0 && (
                <span className="text-warning-600">
                  Queued: {contextStats.stats.queuedMessages}
                </span>
              )}
            </div>
          )}
          {lastError && (
            <span className="text-error-600">
              Error: {lastError.message}
            </span>
          )}
        </div>
      )}

      {!isConnected && onRetry && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className={cn(
            'px-2 py-1 text-xs font-medium rounded',
            'bg-primary-600 text-white hover:bg-primary-700',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1'
          )}
        >
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
    </div>
  )
}

export const ConnectionIndicator: React.FC<{
  isConnected: boolean
  className?: string
}> = ({ isConnected, className }) => (
  <div className={cn('flex items-center gap-2', className)}>
    <div 
      className={cn(
        'w-2 h-2 rounded-full',
        isConnected ? 'bg-success-500' : 'bg-error-500',
        isConnected && 'animate-pulse-soft'
      )}
    />
    <span className="text-sm font-medium">
      {isConnected ? 'Connected' : 'Disconnected'}
    </span>
  </div>
)

export default ConnectionStatus