import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { DriverLocation, SocketDriverUpdate, ConnectionStatus } from '../types/driver';

interface UseSocketDriverLocationsOptions {
  companyId: string;
  updateInterval?: number;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  onLocationUpdate?: (driver: DriverLocation) => void;
  onConnectionChange?: (status: ConnectionStatus) => void;
  onError?: (error: Error) => void;
}

interface UseSocketDriverLocationsReturn {
  drivers: Map<string, DriverLocation>;
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  requestDriverUpdate: (driverId: string) => void;
  clearDrivers: () => void;
}

export const useSocketDriverLocations = ({
  companyId,
  updateInterval = 10000, // 10 seconds
  reconnectDelay = 1000,
  maxReconnectAttempts = 5,
  onLocationUpdate,
  onConnectionChange,
  onError,
}: UseSocketDriverLocationsOptions): UseSocketDriverLocationsReturn => {
  const [drivers, setDrivers] = useState<Map<string, DriverLocation>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastUpdate: new Date(),
    reconnectAttempts: 0,
    latency: 0,
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const latencyStartRef = useRef<number>(0);

  const updateConnectionStatus = useCallback((updates: Partial<ConnectionStatus>) => {
    setConnectionStatus(prev => {
      const newStatus = { ...prev, ...updates };
      onConnectionChange?.(newStatus);
      return newStatus;
    });
  }, [onConnectionChange]);

  const handleLocationUpdate = useCallback((update: SocketDriverUpdate) => {
    const now = new Date();
    
    setDrivers(prevDrivers => {
      const newDrivers = new Map(prevDrivers);
      const existingDriver = newDrivers.get(update.driverId);
      
      if (existingDriver) {
        const updatedDriver: DriverLocation = {
          ...existingDriver,
          ...update.data,
          lastUpdate: update.timestamp || now,
        };
        newDrivers.set(update.driverId, updatedDriver);
        onLocationUpdate?.(updatedDriver);
      } else if (update.data.id) {
        // New driver
        const newDriver = update.data as DriverLocation;
        newDrivers.set(update.driverId, {
          ...newDriver,
          lastUpdate: update.timestamp || now,
        });
        onLocationUpdate?.(newDriver);
      }
      
      return newDrivers;
    });

    updateConnectionStatus({ lastUpdate: now });
  }, [onLocationUpdate, updateConnectionStatus]);

  const handleDriverDisconnect = useCallback((driverId: string) => {
    setDrivers(prevDrivers => {
      const newDrivers = new Map(prevDrivers);
      const driver = newDrivers.get(driverId);
      
      if (driver) {
        newDrivers.set(driverId, {
          ...driver,
          status: 'offline',
          lastUpdate: new Date(),
        });
      }
      
      return newDrivers;
    });
  }, []);

  const handleBulkLocationUpdate = useCallback((driversData: DriverLocation[]) => {
    const now = new Date();
    
    setDrivers(prevDrivers => {
      const newDrivers = new Map(prevDrivers);
      
      driversData.forEach(driver => {
        newDrivers.set(driver.id, {
          ...driver,
          lastUpdate: now,
        });
      });
      
      return newDrivers;
    });

    updateConnectionStatus({ lastUpdate: now });
  }, [updateConnectionStatus]);

  const handlePong = useCallback(() => {
    const latency = Date.now() - latencyStartRef.current;
    updateConnectionStatus({ latency });
  }, [updateConnectionStatus]);

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:3001', {
        transports: ['websocket'],
        timeout: 5000,
        query: { companyId },
      });

      socket.on('connect', () => {
        console.log('Socket connected for driver tracking');
        updateConnectionStatus({
          isConnected: true,
          reconnectAttempts: 0,
        });
        
        // Join company room for location updates
        socket.emit('join-company', companyId);
        
        // Request initial driver data
        socket.emit('request-drivers', companyId);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        updateConnectionStatus({ isConnected: false });
        
        // Auto-reconnect unless manually disconnected
        if (reason !== 'io client disconnect' && 
            connectionStatus.reconnectAttempts < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, connectionStatus.reconnectAttempts);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            updateConnectionStatus(prev => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));
            connectSocket();
          }, delay);
        }
      });

      socket.on('driver-location-update', handleLocationUpdate);
      socket.on('driver-disconnect', handleDriverDisconnect);
      socket.on('drivers-bulk-update', handleBulkLocationUpdate);
      socket.on('pong', handlePong);

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        onError?.(error);
        updateConnectionStatus({ isConnected: false });
      });

      socketRef.current = socket;

      // Setup ping interval for latency measurement
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          latencyStartRef.current = Date.now();
          socket.emit('ping');
        }
      }, 30000); // Every 30 seconds

      socket.on('disconnect', () => {
        clearInterval(pingInterval);
      });

    } catch (error) {
      console.error('Failed to create socket connection:', error);
      onError?.(error as Error);
    }
  }, [
    companyId,
    connectionStatus.reconnectAttempts,
    maxReconnectAttempts,
    reconnectDelay,
    updateConnectionStatus,
    handleLocationUpdate,
    handleDriverDisconnect,
    handleBulkLocationUpdate,
    handlePong,
    onError,
  ]);

  const disconnectSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    updateConnectionStatus({
      isConnected: false,
      reconnectAttempts: 0,
    });
  }, [updateConnectionStatus]);

  const subscribe = useCallback(() => {
    connectSocket();
  }, [connectSocket]);

  const unsubscribe = useCallback(() => {
    disconnectSocket();
  }, [disconnectSocket]);

  const requestDriverUpdate = useCallback((driverId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request-driver-update', { driverId, companyId });
    }
  }, [companyId]);

  const clearDrivers = useCallback(() => {
    setDrivers(new Map());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, [disconnectSocket]);

  // Auto-subscribe on mount
  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  return {
    drivers,
    connectionStatus,
    isConnected: connectionStatus.isConnected,
    subscribe,
    unsubscribe,
    requestDriverUpdate,
    clearDrivers,
  };
};