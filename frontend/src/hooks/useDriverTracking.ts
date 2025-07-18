import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  timestamp: string;
  companyId: string;
}

export interface DriverStatus {
  driverId: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentJobId?: string;
  lastLocationUpdate: string;
  batteryLevel?: number;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
}

export interface TrackingOptions {
  companyId: string;
  userType: 'driver' | 'dispatcher' | 'admin';
  driverId?: string;
  userId: string;
  autoReconnect?: boolean;
  locationSmoothingEnabled?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  timestamp?: string;
}

interface UseDriverTrackingReturn {
  // Connection state
  isConnected: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  
  // Driver locations
  driverLocations: Map<string, DriverLocation>;
  driverStatuses: Map<string, DriverStatus>;
  
  // Methods
  updateLocation: (location: LocationUpdate) => Promise<void>;
  batchUpdateLocations: (locations: LocationUpdate[]) => Promise<void>;
  updateStatus: (status: Partial<DriverStatus>) => Promise<void>;
  trackDriver: (driverId: string) => void;
  getNearbyDrivers: (lat: number, lng: number, radius: number) => Promise<DriverLocation[]>;
  
  // Mobile features
  enableBatching: () => void;
  disableBatching: () => void;
  isBatchingEnabled: boolean;
  pendingUpdatesCount: number;
  
  // Error handling
  lastError: Error | null;
  clearError: () => void;
}

export const useDriverTracking = (options: TrackingOptions): UseDriverTrackingReturn => {
  const {
    companyId,
    userType,
    driverId,
    userId,
    autoReconnect = true,
    locationSmoothingEnabled = true,
    maxReconnectAttempts = 10,
    reconnectInterval = 5000,
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('offline');
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocation>>(new Map());
  const [driverStatuses, setDriverStatuses] = useState<Map<string, DriverStatus>>(new Map());
  const [lastError, setLastError] = useState<Error | null>(null);
  const [isBatchingEnabled, setIsBatchingEnabled] = useState(false);
  const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pendingUpdatesRef = useRef<LocationUpdate[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationRef = useRef<LocationUpdate | null>(null);
  const smoothingBufferRef = useRef<LocationUpdate[]>([]);

  // Connection management
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: autoReconnect,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: reconnectInterval,
      timeout: 10000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setConnectionQuality('excellent');
      reconnectAttemptsRef.current = 0;
      
      // Authenticate
      socket.emit('authenticate', {
        companyId,
        userType,
        driverId,
        userId,
      });
    });

    socket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      setLastError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      setConnectionQuality('offline');
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, manually reconnect
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      setConnectionQuality('offline');
      setLastError(new Error(`Connection failed: ${error.message}`));
      
      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        setLastError(new Error('Failed to reconnect after maximum attempts'));
      }
    });

    // Driver tracking events
    socket.on('driver:location_updated', (data: DriverLocation) => {
      updateDriverLocation(data);
    });

    socket.on('driver:status_updated', (data: DriverStatus) => {
      setDriverStatuses(prev => new Map(prev.set(data.driverId, data)));
    });

    socket.on('driver:online', (data: { driverId: string; timestamp: string }) => {
      setDriverStatuses(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.driverId);
        if (existing) {
          newMap.set(data.driverId, {
            ...existing,
            isOnline: true,
            lastLocationUpdate: data.timestamp,
          });
        }
        return newMap;
      });
    });

    socket.on('driver:offline', (data: { driverId: string; timestamp: string }) => {
      setDriverStatuses(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(data.driverId);
        if (existing) {
          newMap.set(data.driverId, {
            ...existing,
            isOnline: false,
            connectionQuality: 'offline',
            lastLocationUpdate: data.timestamp,
          });
        }
        return newMap;
      });
    });

    socket.on('active_drivers', (data: { drivers: string[] }) => {
      // Request locations for all active drivers
      data.drivers.forEach(driverId => {
        socket.emit('dispatcher:track_driver', { driverId });
      });
    });

    socket.on('driver_location', (data: DriverLocation) => {
      updateDriverLocation(data);
    });

    socket.on('nearby_drivers', (data: { drivers: DriverLocation[] }) => {
      data.drivers.forEach(driver => updateDriverLocation(driver));
    });

    socket.on('error', (error: Error | { message?: string }) => {
      console.error('Socket error:', error);
      setLastError(new Error(error.message || 'Socket error occurred'));
    });

    // Ping/pong for connection quality monitoring
    socket.on('pong', () => {
      const now = Date.now();
      const pingTime = now - ((socket as Socket & { lastPingTime?: number }).lastPingTime || 0);
      
      if (pingTime < 100) {
        setConnectionQuality('excellent');
      } else if (pingTime < 500) {
        setConnectionQuality('good');
      } else {
        setConnectionQuality('poor');
      }
    });

    socketRef.current = socket;
    socket.connect();
  }, [companyId, userType, driverId, userId, autoReconnect, maxReconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setConnectionQuality('offline');
  }, []);

  // Location smoothing
  const smoothLocation = useCallback((newLocation: LocationUpdate): LocationUpdate => {
    if (!locationSmoothingEnabled || !lastLocationRef.current) {
      return newLocation;
    }

    const lastLoc = lastLocationRef.current;
    const timeDiff = new Date().getTime() - new Date(lastLoc.timestamp || 0).getTime();
    
    // If time difference is too large, don't smooth
    if (timeDiff > 30000) { // 30 seconds
      return newLocation;
    }

    // Simple linear interpolation for smooth movement
    const alpha = Math.min(timeDiff / 5000, 1); // Smooth over 5 seconds
    
    return {
      ...newLocation,
      latitude: lastLoc.latitude + (newLocation.latitude - lastLoc.latitude) * alpha,
      longitude: lastLoc.longitude + (newLocation.longitude - lastLoc.longitude) * alpha,
    };
  }, [locationSmoothingEnabled]);

  const updateDriverLocation = useCallback((location: DriverLocation) => {
    setDriverLocations(prev => {
      const newMap = new Map(prev);
      
      // Apply smoothing if enabled and this is not the first location
      const existingLocation = newMap.get(location.driverId);
      let finalLocation = location;
      
      if (locationSmoothingEnabled && existingLocation) {
        const timeDiff = new Date(location.timestamp).getTime() - new Date(existingLocation.timestamp).getTime();
        
        // Only smooth if updates are frequent (less than 10 seconds apart)
        if (timeDiff < 10000 && timeDiff > 0) {
          smoothingBufferRef.current.push(location);
          
          // Keep only recent locations in buffer
          smoothingBufferRef.current = smoothingBufferRef.current
            .filter(loc => new Date(location.timestamp).getTime() - new Date(loc.timestamp || 0).getTime() < 30000)
            .slice(-5); // Keep last 5 locations
          
          // Average the locations for smoothing
          if (smoothingBufferRef.current.length > 1) {
            const avgLat = smoothingBufferRef.current.reduce((sum, loc) => sum + loc.latitude, 0) / smoothingBufferRef.current.length;
            const avgLng = smoothingBufferRef.current.reduce((sum, loc) => sum + loc.longitude, 0) / smoothingBufferRef.current.length;
            
            finalLocation = {
              ...location,
              latitude: avgLat,
              longitude: avgLng,
            };
          }
        }
      }
      
      newMap.set(location.driverId, finalLocation);
      return newMap;
    });
  }, [locationSmoothingEnabled]);

  // Location update methods
  const updateLocation = useCallback(async (location: LocationUpdate): Promise<void> => {
    if (!socketRef.current?.connected) {
      throw new Error('Not connected to server');
    }

    if (!driverId) {
      throw new Error('Driver ID required for location updates');
    }

    const locationWithTimestamp = {
      ...location,
      timestamp: location.timestamp || new Date().toISOString(),
    };

    if (isBatchingEnabled) {
      // Add to pending updates for batch processing
      pendingUpdatesRef.current.push(locationWithTimestamp);
      setPendingUpdatesCount(pendingUpdatesRef.current.length);
      
      // Set timeout to send batch if not already set
      if (!batchTimeoutRef.current) {
        batchTimeoutRef.current = setTimeout(() => {
          flushPendingUpdates();
        }, 5000); // Batch for 5 seconds
      }
      
      return;
    }

    // Apply smoothing
    const smoothedLocation = smoothLocation(locationWithTimestamp);
    lastLocationRef.current = smoothedLocation;

    // Send immediately
    socketRef.current.emit('driver:location_update', smoothedLocation);
  }, [driverId, isBatchingEnabled, smoothLocation]);

  const batchUpdateLocations = useCallback(async (locations: LocationUpdate[]): Promise<void> => {
    if (!socketRef.current?.connected) {
      throw new Error('Not connected to server');
    }

    if (!driverId) {
      throw new Error('Driver ID required for location updates');
    }

    const updatesWithTimestamp = locations.map(loc => ({
      ...loc,
      timestamp: loc.timestamp || new Date().toISOString(),
    }));

    socketRef.current.emit('driver:batch_location_update', {
      updates: updatesWithTimestamp,
    });
  }, [driverId]);

  const flushPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length > 0) {
      batchUpdateLocations(pendingUpdatesRef.current);
      pendingUpdatesRef.current = [];
      setPendingUpdatesCount(0);
    }
    
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, [batchUpdateLocations]);

  const updateStatus = useCallback(async (status: Partial<DriverStatus>): Promise<void> => {
    if (!socketRef.current?.connected) {
      throw new Error('Not connected to server');
    }

    if (!driverId) {
      throw new Error('Driver ID required for status updates');
    }

    const fullStatus = {
      isOnline: true,
      isAvailable: true,
      ...status,
    };

    socketRef.current.emit('driver:status_update', fullStatus);
  }, [driverId]);

  const trackDriver = useCallback((targetDriverId: string) => {
    if (!socketRef.current?.connected) return;
    
    socketRef.current.emit('dispatcher:track_driver', { driverId: targetDriverId });
  }, []);

  const getNearbyDrivers = useCallback(async (lat: number, lng: number, radius: number): Promise<DriverLocation[]> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      socketRef.current.once('nearby_drivers', (data: { drivers: DriverLocation[] }) => {
        clearTimeout(timeout);
        resolve(data.drivers);
      });

      socketRef.current.emit('dispatcher:get_nearby_drivers', {
        latitude: lat,
        longitude: lng,
        radius,
      });
    });
  }, []);

  // Batching controls
  const enableBatching = useCallback(() => {
    setIsBatchingEnabled(true);
  }, []);

  const disableBatching = useCallback(() => {
    setIsBatchingEnabled(false);
    flushPendingUpdates();
  }, [flushPendingUpdates]);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Connection quality monitoring
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (socketRef.current?.connected) {
        (socketRef.current as Socket & { lastPingTime?: number }).lastPingTime = Date.now();
        socketRef.current.emit('ping');
      }
    }, 5000); // Ping every 5 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  // Auto-flush batched updates on unmount or when batching is disabled
  useEffect(() => {
    return () => {
      flushPendingUpdates();
    };
  }, [flushPendingUpdates]);

  // Initialize connection
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionQuality,
    driverLocations,
    driverStatuses,
    updateLocation,
    batchUpdateLocations,
    updateStatus,
    trackDriver,
    getNearbyDrivers,
    enableBatching,
    disableBatching,
    isBatchingEnabled,
    pendingUpdatesCount,
    lastError,
    clearError,
  };
};