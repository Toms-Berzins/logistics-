'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useRealtimeConnection, useRealtimeStats, useRealtimeErrors } from '../../context/RealtimeProvider';
import { ConnectionState, ConnectionQuality } from '../../lib/websocket';

interface RealtimeMonitorProps {
  className?: string;
  showAdvanced?: boolean;
}

export function RealtimeMonitor({ className, showAdvanced = false }: RealtimeMonitorProps) {
  const { isConnected, connectionState, connectionQuality, health, reconnect } = useRealtimeConnection();
  const { stats, isHealthy } = useRealtimeStats();
  const { lastError, clearError, hasError } = useRealtimeErrors();
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const getConnectionStateColor = (state: ConnectionState) => {
    switch (state) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'reconnecting': return 'text-orange-600';
      case 'disconnected': return 'text-gray-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getQualityBadgeVariant = (quality: ConnectionQuality) => {
    switch (quality) {
      case 'excellent': return 'success' as const;
      case 'good': return 'success' as const;
      case 'poor': return 'warning' as const;
      case 'offline': return 'error' as const;
      default: return 'neutral' as const;
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Real-time Connection</h3>
          <div className="flex items-center gap-2">
            {/* Connection State */}
            <Badge variant={isConnected ? 'success' : 'error'} className="capitalize">
              <span className={cn('w-2 h-2 rounded-full mr-2', {
                'bg-green-500 animate-pulse': isConnected,
                'bg-red-500': !isConnected
              })} />
              {connectionState}
            </Badge>

            {/* Quality Badge */}
            <Badge variant={getQualityBadgeVariant(connectionQuality)}>
              {connectionQuality.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Error Display */}
        {hasError && lastError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Connection Error</p>
                <p className="text-sm text-red-600 mt-1">{lastError.message}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearError}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Basic Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.messagesSent}</div>
              <div className="text-sm text-gray-600">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.messagesReceived}</div>
              <div className="text-sm text-gray-600">Received</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatDuration(stats.uptime)}</div>
              <div className="text-sm text-gray-600">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.reconnectCount}</div>
              <div className="text-sm text-gray-600">Reconnects</div>
            </div>
          </div>
        )}

        {/* Advanced Stats */}
        {showAdvanced && stats && health && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-medium text-gray-900">Advanced Metrics</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Latency:</span>
                  <span className={cn('font-medium', {
                    'text-green-600': health.latency < 100,
                    'text-yellow-600': health.latency < 500,
                    'text-red-600': health.latency >= 500
                  })}>
                    {health.latency}ms
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Updates:</span>
                  <span className={cn('font-medium', {
                    'text-gray-600': stats.pendingOptimisticUpdates === 0,
                    'text-yellow-600': stats.pendingOptimisticUpdates > 0
                  })}>
                    {stats.pendingOptimisticUpdates}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Queued Messages:</span>
                  <span className={cn('font-medium', {
                    'text-gray-600': stats.queuedMessages === 0,
                    'text-orange-600': stats.queuedMessages > 0
                  })}>
                    {stats.queuedMessages}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Activity:</span>
                  <span className="font-medium text-gray-900">
                    {formatTimestamp(health.lastActivity)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Health Status:</span>
                  <Badge variant={isHealthy ? 'success' : 'warning'} size="sm">
                    {isHealthy ? 'Healthy' : 'Degraded'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-600">
            {isConnected ? (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Connected and healthy
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                Disconnected
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {!isConnected && (
              <Button
                onClick={handleReconnect}
                disabled={isReconnecting}
                size="sm"
                variant="primary"
              >
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </Button>
            )}
            
            {hasError && (
              <Button
                onClick={clearError}
                size="sm"
                variant="ghost"
              >
                Clear Error
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Compact version for dashboard headers
export function RealtimeStatusIndicator({ className }: { className?: string }) {
  const { isConnected, connectionQuality } = useRealtimeConnection();
  const { hasError } = useRealtimeErrors();

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn('w-3 h-3 rounded-full', {
          'bg-green-500 animate-pulse': isConnected && !hasError,
          'bg-yellow-500': isConnected && hasError,
          'bg-red-500': !isConnected
        })}
      />
      <span className="text-sm font-medium">
        {isConnected ? (
          <span className={cn({
            'text-green-600': connectionQuality === 'excellent',
            'text-yellow-600': connectionQuality === 'good',
            'text-orange-600': connectionQuality === 'poor'
          })}>
            Live
          </span>
        ) : (
          <span className="text-red-600">Offline</span>
        )}
      </span>
    </div>
  );
}

// Activity feed component
export function RealtimeActivityFeed({ className, maxItems = 50 }: { 
  className?: string; 
  maxItems?: number; 
}) {
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'success';
  }>>([]);

  const { connectionState } = useRealtimeConnection();
  const { lastError } = useRealtimeErrors();

  // Track connection state changes
  useEffect(() => {
    const activity = {
      id: `conn_${Date.now()}`,
      type: 'connection',
      message: `Connection state changed to ${connectionState}`,
      timestamp: new Date().toISOString(),
      level: connectionState === 'connected' ? 'success' as const : 
             connectionState === 'error' ? 'error' as const : 'info' as const
    };

    setActivities(prev => [activity, ...prev.slice(0, maxItems - 1)]);
  }, [connectionState, maxItems]);

  // Track errors
  useEffect(() => {
    if (lastError) {
      const activity = {
        id: `error_${Date.now()}`,
        type: 'error',
        message: lastError.message,
        timestamp: new Date().toISOString(),
        level: 'error' as const
      };

      setActivities(prev => [activity, ...prev.slice(0, maxItems - 1)]);
    }
  }, [lastError, maxItems]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className={cn('p-4', className)}>
      <h4 className="font-medium text-gray-900 mb-3">Activity Feed</h4>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 text-sm">
              <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', {
                'bg-green-500': activity.level === 'success',
                'bg-yellow-500': activity.level === 'warning',
                'bg-red-500': activity.level === 'error',
                'bg-blue-500': activity.level === 'info'
              })} />
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium', getLevelColor(activity.level))}>
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500">
                  {formatTimestamp(activity.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}