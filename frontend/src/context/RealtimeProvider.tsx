'use client';

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { RealtimeClient, createRealtimeClient, ConnectionState, ConnectionQuality, ConnectionHealth } from '../lib/websocket';

// Context Types
interface RealtimeContextValue {
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  connectionQuality: ConnectionQuality;
  health: ConnectionHealth | null;
  
  // Client instance
  client: RealtimeClient | null;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Statistics
  stats: {
    messagesSent: number;
    messagesReceived: number;
    reconnectCount: number;
    uptime: number;
    pendingOptimisticUpdates: number;
    queuedMessages: number;
  } | null;
  
  // Error state
  lastError: Error | null;
  clearError: () => void;
}

interface RealtimeProviderProps {
  children: ReactNode;
  url?: string;
  autoConnect?: boolean;
  companyId?: string;
  userId?: string;
  userType?: 'driver' | 'dispatcher' | 'admin';
  onConnectionStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

// Context Creation
const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// Provider Component
export function RealtimeProvider({
  children,
  url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3001',
  autoConnect = true,
  companyId,
  userId,
  userType = 'dispatcher',
  onConnectionStateChange,
  onError
}: RealtimeProviderProps) {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('offline');
  const [health, setHealth] = useState<ConnectionHealth | null>(null);
  const [stats, setStats] = useState<RealtimeContextValue['stats']>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  // Refs
  const clientRef = useRef<RealtimeClient | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize client
  useEffect(() => {
    if (!url) return;

    const client = createRealtimeClient({
      url,
      autoConnect: false, // We'll control connection manually
      reconnectEnabled: true,
      maxReconnectAttempts: 10,
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      reconnectBackoffFactor: 1.5,
      pingInterval: 5000,
      pingTimeout: 10000,
      messageQueueSize: 1000
    });

    clientRef.current = client;

    // Setup event listeners
    setupEventListeners(client);

    // Auto-connect if enabled
    if (autoConnect) {
      connect();
    }

    // Start periodic health checks
    startHealthMonitoring();

    return () => {
      cleanup();
    };
  }, [url, autoConnect]);

  // Setup event listeners
  const setupEventListeners = (client: RealtimeClient) => {
    client.on('connection:state_change', (state: ConnectionState) => {
      setConnectionState(state);
      setIsConnected(state === 'connected');
      onConnectionStateChange?.(state);
      
      // Update health immediately on state change
      updateHealth();
    });

    client.on('connection:quality_change', (quality: ConnectionQuality) => {
      setConnectionQuality(quality);
    });

    client.on('connection:error', (error: { message: string }) => {
      const clientError = new Error(error.message);
      setLastError(clientError);
      onError?.(clientError);
    });

    client.on('message:received', () => {
      updateStats();
    });

    client.on('message:sent', () => {
      updateStats();
    });

    client.on('optimistic:timeout', (update) => {
      console.warn('Optimistic update timed out:', update.id);
      updateStats();
    });

    client.on('optimistic:rollback', (update) => {
      console.info('Optimistic update rolled back:', update.id);
      updateStats();
    });

    client.on('rate_limit_exceeded', ({ eventType }) => {
      console.warn('Rate limit exceeded for event type:', eventType);
    });

    client.on('callback_error', ({ subscription, error }) => {
      console.error('Subscription callback error:', { subscriptionId: subscription.id, error });
    });
  };

  // Connection management functions
  const connect = async (): Promise<void> => {
    if (!clientRef.current) {
      throw new Error('Realtime client not initialized');
    }

    try {
      setLastError(null);
      await clientRef.current.connect();
      
      // Authenticate after connection
      if (companyId && userId) {
        await clientRef.current.send('authenticate', {
          companyId,
          userId,
          userType
        });
      }
      
    } catch (error) {
      const connectError = error instanceof Error ? error : new Error('Connection failed');
      setLastError(connectError);
      throw connectError;
    }
  };

  const disconnect = (): void => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  };

  const reconnect = async (): Promise<void> => {
    disconnect();
    // Wait a moment before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connect();
  };

  // Health monitoring
  const updateHealth = () => {
    if (clientRef.current) {
      const currentHealth = clientRef.current.getHealth();
      setHealth(currentHealth);
    }
  };

  const updateStats = () => {
    if (clientRef.current) {
      const clientStats = clientRef.current.getStats();
      setStats({
        messagesSent: clientStats.connection.messagesSent,
        messagesReceived: clientStats.connection.messagesReceived,
        reconnectCount: clientStats.connection.reconnectCount,
        uptime: clientStats.connection.uptime,
        pendingOptimisticUpdates: clientStats.optimisticUpdates.pending,
        queuedMessages: clientStats.queue.pending + clientStats.queue.failed
      });
    }
  };

  const startHealthMonitoring = () => {
    // Update health every 5 seconds
    healthCheckIntervalRef.current = setInterval(() => {
      updateHealth();
    }, 5000);

    // Update stats every 2 seconds
    statsIntervalRef.current = setInterval(() => {
      updateStats();
    }, 2000);
  };

  const cleanup = () => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    
    if (clientRef.current) {
      clientRef.current.cleanup();
      clientRef.current = null;
    }
  };

  const clearError = () => {
    setLastError(null);
  };

  // Context value
  const contextValue: RealtimeContextValue = {
    isConnected,
    connectionState,
    connectionQuality,
    health,
    client: clientRef.current,
    connect,
    disconnect,
    reconnect,
    stats,
    lastError,
    clearError
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

// Hook to use the context
export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  
  if (!context) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider');
  }
  
  return context;
}

// High-level hooks for specific use cases
export function useRealtimeConnection() {
  const { isConnected, connectionState, connectionQuality, health, connect, disconnect, reconnect } = useRealtimeContext();
  
  return {
    isConnected,
    connectionState,
    connectionQuality,
    health,
    connect,
    disconnect,
    reconnect
  };
}

export function useRealtimeStats() {
  const { stats, health } = useRealtimeContext();
  
  return {
    stats,
    health,
    isHealthy: health?.state === 'connected' && health?.quality !== 'poor'
  };
}

export function useRealtimeErrors() {
  const { lastError, clearError } = useRealtimeContext();
  
  return {
    lastError,
    clearError,
    hasError: !!lastError
  };
}