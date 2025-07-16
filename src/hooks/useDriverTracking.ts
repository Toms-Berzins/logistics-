import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

// Types
interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface LocationMetadata {
  batteryLevel: number;
  provider: 'GPS' | 'NETWORK' | 'PASSIVE';
  satellites?: number;
  hdop?: number;
  pdop?: number;
}

interface IDriverLocation {
  driverId: string;
  companyId: string;
  location: GeoPoint;
  metadata: LocationMetadata;
  isOnline: boolean;
  lastSeen: Date;
  currentZoneId?: string;
  currentJobId?: string;
  status: 'available' | 'busy' | 'offline' | 'break';
  heading?: number;
  speed?: number;
}

interface ILocationUpdate {
  driverId: string;
  location: GeoPoint;
  metadata: LocationMetadata;
  timestamp: Date;
  zoneId?: string;
}

interface IGeofenceEvent {
  driverId: string;
  zoneId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: GeoPoint;
  timestamp: Date;
}

interface UseDriverTrackingOptions {
  companyId: string;
  wsUrl?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  onLocationUpdate?: (update: ILocationUpdate) => void;
  onDriverOnline?: (event: { driverId: string; location: GeoPoint; timestamp: Date }) => void;
  onDriverOffline?: (event: { driverId: string; timestamp: Date }) => void;
  onGeofenceEvent?: (event: IGeofenceEvent) => void;
  onConnectionChange?: (status: 'connecting' | 'connected' | 'disconnected') => void;
}

interface UseDriverTrackingReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  drivers: Map<string, IDriverLocation>;
  geofenceEvents: IGeofenceEvent[];
  connect: () => void;
  disconnect: () => void;
  trackDriver: (driverId: string) => void;
  trackZone: (zoneId: string) => void;
  findNearbyDrivers: (location: GeoPoint, radius?: number) => void;
  registerDispatcher: (dispatcherId: string, zones: string[]) => void;
  getDriverLocation: (driverId: string) => IDriverLocation | undefined;
  clearEvents: () => void;
  sendLocationUpdate: (driverId: string, location: GeoPoint, metadata: LocationMetadata) => void;
  updateDriverStatus: (driverId: string, status: 'available' | 'busy' | 'break', jobId?: string) => void;
}

export const useDriverTracking = (options: UseDriverTrackingOptions): UseDriverTrackingReturn => {
  const {
    companyId,
    wsUrl = process.env.REACT_APP_WS_URL || 'http://localhost:3001',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
    onLocationUpdate,
    onDriverOnline,
    onDriverOffline,
    onGeofenceEvent,
    onConnectionChange
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [drivers, setDrivers] = useState<Map<string, IDriverLocation>>(new Map());
  const [geofenceEvents, setGeofenceEvents] = useState<IGeofenceEvent[]>([]);
  
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Connection status derived state
  const isConnected = connectionStatus === 'connected';

  // Clear reconnect timeout on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Handle connection status changes
  useEffect(() => {
    onConnectionChange?.(connectionStatus);
  }, [connectionStatus, onConnectionChange]);

  // Connect to Socket.io server
  const connect = useCallback(() => {
    if (socket?.connected) return;

    const newSocket = io(wsUrl, {
      auth: {
        token: localStorage.getItem('auth_token') || 'valid-token'
      },
      transports: ['websocket', 'polling'],
      forceNew: true
    });

    setSocket(newSocket);
    setConnectionStatus('connecting');

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to Socket.io server');
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from Socket.io server:', reason);
      setConnectionStatus('disconnected');
      
      // Attempt reconnection if it wasn't manual
      if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < reconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${reconnectAttempts})...`);
          connect();
        }, reconnectDelay);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('disconnected');
    });

    // Location update handler
    newSocket.on('location:update', (data: ILocationUpdate) => {
      setDrivers(prev => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        
        if (existing) {
          updated.set(data.driverId, {
            ...existing,
            location: data.location,
            metadata: data.metadata,
            lastSeen: new Date(data.timestamp)
          });
        } else {
          // Create new driver entry from location update
          updated.set(data.driverId, {
            driverId: data.driverId,
            companyId,
            location: data.location,
            metadata: data.metadata,
            isOnline: true,
            lastSeen: new Date(data.timestamp),
            status: 'available'
          });
        }
        
        return updated;
      });

      // Invalidate React Query cache
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      
      onLocationUpdate?.(data);
    });

    // Driver online/offline handlers
    newSocket.on('driver:online', (data: { driverId: string; location: GeoPoint; timestamp: Date }) => {
      setDrivers(prev => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        
        if (existing) {
          updated.set(data.driverId, {
            ...existing,
            isOnline: true,
            location: data.location,
            lastSeen: new Date(data.timestamp)
          });
        }
        
        return updated;
      });
      
      onDriverOnline?.(data);
    });

    newSocket.on('driver:offline', (data: { driverId: string; timestamp: Date }) => {
      setDrivers(prev => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        
        if (existing) {
          updated.set(data.driverId, {
            ...existing,
            isOnline: false,
            lastSeen: new Date(data.timestamp)
          });
        }
        
        return updated;
      });
      
      onDriverOffline?.(data);
    });

    // Geofence event handlers
    newSocket.on('geofence:enter', (event: IGeofenceEvent) => {
      setGeofenceEvents(prev => [...prev.slice(-99), event]); // Keep last 100 events
      onGeofenceEvent?.(event);
    });

    newSocket.on('geofence:exit', (event: IGeofenceEvent) => {
      setGeofenceEvents(prev => [...prev.slice(-99), event]);
      onGeofenceEvent?.(event);
    });

    // Driver status changes
    newSocket.on('driver:status_changed', (data: {
      driverId: string;
      status: 'available' | 'busy' | 'break';
      jobId?: string;
      timestamp: Date;
    }) => {
      setDrivers(prev => {
        const updated = new Map(prev);
        const existing = updated.get(data.driverId);
        
        if (existing) {
          updated.set(data.driverId, {
            ...existing,
            status: data.status,
            currentJobId: data.jobId,
            lastSeen: new Date(data.timestamp)
          });
        }
        
        return updated;
      });
    });

    // Nearby drivers response
    newSocket.on('nearby:drivers', (data: {
      location: GeoPoint;
      radiusMeters: number;
      drivers: IDriverLocation[];
      count: number;
      timestamp: Date;
    }) => {
      // Update local state with nearby drivers
      setDrivers(prev => {
        const updated = new Map(prev);
        data.drivers.forEach(driver => {
          updated.set(driver.driverId, driver);
        });
        return updated;
      });
    });

    // Zone drivers response
    newSocket.on('zone:drivers', (data: {
      zoneId: string;
      drivers: IDriverLocation[];
      timestamp: Date;
    }) => {
      // Update local state with zone drivers
      setDrivers(prev => {
        const updated = new Map(prev);
        data.drivers.forEach(driver => {
          updated.set(driver.driverId, driver);
        });
        return updated;
      });
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    return newSocket;
  }, [wsUrl, companyId, reconnectAttempts, reconnectDelay, onLocationUpdate, onDriverOnline, onDriverOffline, onGeofenceEvent, queryClient]);

  // Disconnect from Socket.io server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    setConnectionStatus('disconnected');
  }, [socket]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Track specific driver
  const trackDriver = useCallback((driverId: string) => {
    if (socket?.connected) {
      socket.emit('dispatcher:track_driver', { driverId });
    }
  }, [socket]);

  // Track specific zone
  const trackZone = useCallback((zoneId: string) => {
    if (socket?.connected) {
      socket.emit('dispatcher:track_zone', { zoneId });
    }
  }, [socket]);

  // Find nearby drivers
  const findNearbyDrivers = useCallback((location: GeoPoint, radius: number = 1000) => {
    if (socket?.connected) {
      socket.emit('dispatcher:nearby_drivers', {
        companyId,
        location,
        radiusMeters: radius,
        limit: 50
      });
    }
  }, [socket, companyId]);

  // Register as dispatcher
  const registerDispatcher = useCallback((dispatcherId: string, zones: string[]) => {
    if (socket?.connected) {
      socket.emit('dispatcher:register', {
        dispatcherId,
        companyId,
        zones
      });
    }
  }, [socket, companyId]);

  // Get driver location
  const getDriverLocation = useCallback((driverId: string) => {
    return drivers.get(driverId);
  }, [drivers]);

  // Clear events
  const clearEvents = useCallback(() => {
    setGeofenceEvents([]);
  }, []);

  // Send location update (for driver clients)
  const sendLocationUpdate = useCallback((driverId: string, location: GeoPoint, metadata: LocationMetadata) => {
    if (socket?.connected) {
      socket.emit('driver:location', {
        driverId,
        location,
        metadata
      });
    }
  }, [socket]);

  // Update driver status (for driver clients)
  const updateDriverStatus = useCallback((driverId: string, status: 'available' | 'busy' | 'break', jobId?: string) => {
    if (socket?.connected) {
      socket.emit('driver:status', {
        driverId,
        status,
        jobId
      });
    }
  }, [socket]);

  return {
    socket,
    isConnected,
    connectionStatus,
    drivers,
    geofenceEvents,
    connect,
    disconnect,
    trackDriver,
    trackZone,
    findNearbyDrivers,
    registerDispatcher,
    getDriverLocation,
    clearEvents,
    sendLocationUpdate,
    updateDriverStatus
  };
};

export default useDriverTracking;