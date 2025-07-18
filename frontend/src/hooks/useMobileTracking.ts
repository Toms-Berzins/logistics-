import { useState, useEffect, useRef, useCallback } from 'react';
import { useDriverTracking, LocationUpdate } from './useDriverTracking';

// Extended Navigator types for mobile APIs
interface NavigatorConnection {
  type?: string;
  downlink?: number;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
  rtt?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface ExtendedNavigator extends Navigator {
  connection?: NavigatorConnection;
  mozConnection?: NavigatorConnection;
  webkitConnection?: NavigatorConnection;
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  }>;
}

export interface MobileTrackingOptions {
  companyId: string;
  driverId: string;
  userId: string;
  
  // Batching options
  batchSize?: number;
  batchTimeoutMs?: number;
  maxBatchSize?: number;
  
  // Connection quality adaptation
  adaptToBandwidth?: boolean;
  lowBandwidthThreshold?: number; // KB/s
  
  // Offline support
  enableOfflineQueue?: boolean;
  maxOfflineUpdates?: number;
  
  // Battery optimization
  enableBatteryOptimization?: boolean;
  lowBatteryThreshold?: number; // percentage
  
  // Movement detection
  enableMovementDetection?: boolean;
  movementThreshold?: number; // meters
  staticUpdateInterval?: number; // ms when not moving
  movingUpdateInterval?: number; // ms when moving
}

export interface NetworkInfo {
  isOnline: boolean;
  connectionType?: string;
  downlink?: number; // Mbps
  effectiveType?: string;
  rtt?: number; // ms
}

export interface BatteryInfo {
  level?: number;
  charging?: boolean;
  chargingTime?: number;
  dischargingTime?: number;
}

export interface LocationQueueStats {
  queuedUpdates: number;
  lastBatchSent: Date | null;
  totalUpdatesSent: number;
  failedUpdates: number;
  averageBatchSize: number;
}

interface UseMobileTrackingReturn {
  // Location methods
  queueLocationUpdate: (location: LocationUpdate) => void;
  forceFlushQueue: () => Promise<void>;
  
  // Status
  isTracking: boolean;
  isMoving: boolean;
  networkInfo: NetworkInfo;
  batteryInfo: BatteryInfo;
  queueStats: LocationQueueStats;
  
  // Controls
  startTracking: () => void;
  stopTracking: () => void;
  enableOfflineMode: () => void;
  disableOfflineMode: () => void;
  
  // Error handling
  lastError: Error | null;
  clearError: () => void;
}

export const useMobileTracking = (options: MobileTrackingOptions): UseMobileTrackingReturn => {
  const {
    companyId,
    driverId,
    userId,
    batchSize = 5,
    batchTimeoutMs = 10000,
    maxBatchSize = 20,
    adaptToBandwidth = true,
    // lowBandwidthThreshold = 50, // 50 KB/s
    enableOfflineQueue = true,
    maxOfflineUpdates = 100,
    enableBatteryOptimization = true,
    lowBatteryThreshold = 20,
    enableMovementDetection = true,
    movementThreshold = 10, // 10 meters
    staticUpdateInterval = 30000, // 30 seconds
    // movingUpdateInterval = 5000, // 5 seconds
  } = options;

  // State
  const [isTracking, setIsTracking] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ isOnline: navigator.onLine });
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({});
  const [queueStats, setQueueStats] = useState<LocationQueueStats>({
    queuedUpdates: 0,
    lastBatchSent: null,
    totalUpdatesSent: 0,
    failedUpdates: 0,
    averageBatchSize: 0,
  });
  const [lastError, setLastError] = useState<Error | null>(null);

  // Refs
  const locationQueueRef = useRef<LocationUpdate[]>([]);
  const offlineQueueRef = useRef<LocationUpdate[]>([]);
  const lastLocationRef = useRef<LocationUpdate | null>(null);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const batchSizesRef = useRef<number[]>([]);

  // Driver tracking hook with batching enabled
  const {
    // isConnected,
    // connectionQuality,
    batchUpdateLocations,
    enableBatching,
    disableBatching,
    // isBatchingEnabled,
  } = useDriverTracking({
    companyId,
    userType: 'driver',
    driverId,
    userId,
    autoReconnect: true,
  });

  // Network monitoring
  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection = (navigator as ExtendedNavigator).connection || 
                        (navigator as ExtendedNavigator).mozConnection || 
                        (navigator as ExtendedNavigator).webkitConnection;
      
      setNetworkInfo({
        isOnline: navigator.onLine,
        connectionType: connection?.type,
        downlink: connection?.downlink,
        effectiveType: connection?.effectiveType,
        rtt: connection?.rtt,
      });
    };

    const handleOnline = () => {
      updateNetworkInfo();
      if (enableOfflineQueue) {
        flushOfflineQueue();
      }
    };

    const handleOffline = () => {
      updateNetworkInfo();
    };

    updateNetworkInfo();
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as ExtendedNavigator).connection;
    if (connection) {
      connection.addEventListener?.('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener?.('change', updateNetworkInfo);
      }
    };
  }, [enableOfflineQueue]);

  // Battery monitoring
  useEffect(() => {
    const updateBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as ExtendedNavigator).getBattery?.();
          if (!battery) return;
          
          const updateBatteryState = () => {
            setBatteryInfo({
              level: Math.round(battery.level * 100),
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime,
            });
          };

          updateBatteryState();
          
          battery.addEventListener('chargingchange', updateBatteryState);
          battery.addEventListener('levelchange', updateBatteryState);
          
          return () => {
            battery.removeEventListener('chargingchange', updateBatteryState);
            battery.removeEventListener('levelchange', updateBatteryState);
          };
        } catch (error) {
          console.warn('Battery API not available:', error);
        }
      }
    };

    updateBatteryInfo();
  }, []);

  // Movement detection
  const detectMovement = useCallback((newLocation: LocationUpdate, lastLocation: LocationUpdate): boolean => {
    if (!enableMovementDetection || !lastLocation) return true;

    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    return distance > movementThreshold;
  }, [enableMovementDetection, movementThreshold]);

  // Calculate distance between two points in meters
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Adaptive batch size based on network conditions
  const getAdaptiveBatchSize = useCallback((): number => {
    if (!adaptToBandwidth) return batchSize;

    const connection = (navigator as ExtendedNavigator).connection;
    if (!connection) return batchSize;

    // Adjust batch size based on connection quality
    switch (connection.effectiveType) {
      case 'slow-2g':
        return Math.max(1, Math.floor(batchSize * 0.3));
      case '2g':
        return Math.max(1, Math.floor(batchSize * 0.5));
      case '3g':
        return Math.max(1, Math.floor(batchSize * 0.8));
      case '4g':
      default:
        return batchSize;
    }
  }, [adaptToBandwidth, batchSize]);

  // Queue location update
  const queueLocationUpdate = useCallback((location: LocationUpdate) => {
    try {
      // Add timestamp if not provided
      const locationWithTimestamp = {
        ...location,
        timestamp: location.timestamp || new Date().toISOString(),
      };

      // Check for movement
      if (lastLocationRef.current) {
        const moving = detectMovement(locationWithTimestamp, lastLocationRef.current);
        setIsMoving(moving);
      }

      lastLocationRef.current = locationWithTimestamp;

      // If offline, queue for later
      if (!networkInfo.isOnline && enableOfflineQueue) {
        if (offlineQueueRef.current.length < maxOfflineUpdates) {
          offlineQueueRef.current.push(locationWithTimestamp);
        } else {
          // Remove oldest update to make room
          offlineQueueRef.current.shift();
          offlineQueueRef.current.push(locationWithTimestamp);
        }
        return;
      }

      // Battery optimization - reduce frequency when battery is low
      if (enableBatteryOptimization && batteryInfo.level && 
          batteryInfo.level < lowBatteryThreshold && !batteryInfo.charging) {
        
        // Only queue if significant movement or time has passed
        if (lastLocationRef.current) {
          const timeDiff = new Date(locationWithTimestamp.timestamp).getTime() - 
                          new Date(lastLocationRef.current.timestamp || 0).getTime();
          
          if (timeDiff < staticUpdateInterval * 2) {
            const distance = calculateDistance(
              lastLocationRef.current.latitude,
              lastLocationRef.current.longitude,
              locationWithTimestamp.latitude,
              locationWithTimestamp.longitude
            );
            
            if (distance < movementThreshold * 2) {
              return; // Skip this update to save battery
            }
          }
        }
      }

      // Add to queue
      locationQueueRef.current.push(locationWithTimestamp);
      
      setQueueStats(prev => ({
        ...prev,
        queuedUpdates: locationQueueRef.current.length,
      }));

      // Check if we should flush
      const adaptiveBatchSize = getAdaptiveBatchSize();
      if (locationQueueRef.current.length >= adaptiveBatchSize) {
        flushLocationQueue();
      } else if (!batchTimeoutRef.current) {
        // Set timeout for batch flush
        batchTimeoutRef.current = setTimeout(() => {
          flushLocationQueue();
        }, batchTimeoutMs);
      }

    } catch (error) {
      console.error('Error queuing location update:', error);
      setLastError(error as Error);
    }
  }, [
    networkInfo.isOnline,
    enableOfflineQueue,
    maxOfflineUpdates,
    enableBatteryOptimization,
    batteryInfo,
    lowBatteryThreshold,
    staticUpdateInterval,
    movementThreshold,
    getAdaptiveBatchSize,
    batchTimeoutMs,
    detectMovement,
  ]);

  // Flush location queue
  const flushLocationQueue = useCallback(async () => {
    if (locationQueueRef.current.length === 0) return;

    try {
      const batch = locationQueueRef.current.splice(0, maxBatchSize);
      
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }

      await batchUpdateLocations(batch);

      // Update statistics
      batchSizesRef.current.push(batch.length);
      if (batchSizesRef.current.length > 10) {
        batchSizesRef.current.shift();
      }

      const averageBatchSize = batchSizesRef.current.reduce((a, b) => a + b, 0) / batchSizesRef.current.length;

      setQueueStats(prev => ({
        ...prev,
        queuedUpdates: locationQueueRef.current.length,
        lastBatchSent: new Date(),
        totalUpdatesSent: prev.totalUpdatesSent + batch.length,
        averageBatchSize,
      }));

      setLastError(null);

    } catch (error) {
      console.error('Error flushing location queue:', error);
      setLastError(error as Error);
      
      setQueueStats(prev => ({
        ...prev,
        failedUpdates: prev.failedUpdates + 1,
      }));
    }
  }, [maxBatchSize, batchUpdateLocations]);

  // Flush offline queue when coming back online
  const flushOfflineQueue = useCallback(async () => {
    if (offlineQueueRef.current.length === 0) return;

    try {
      const batch = offlineQueueRef.current.splice(0);
      await batchUpdateLocations(batch);
      
      console.log(`Flushed ${batch.length} offline location updates`);
      
    } catch (error) {
      console.error('Error flushing offline queue:', error);
      // Put updates back in queue
      offlineQueueRef.current.unshift(...offlineQueueRef.current);
    }
  }, [batchUpdateLocations]);

  // Force flush queue
  const forceFlushQueue = useCallback(async () => {
    await flushLocationQueue();
    if (enableOfflineQueue) {
      await flushOfflineQueue();
    }
  }, [flushLocationQueue, flushOfflineQueue, enableOfflineQueue]);

  // Start tracking with geolocation
  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setLastError(new Error('Geolocation not supported'));
      return;
    }

    setIsTracking(true);
    enableBatching();

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000,
    };

    const successCallback = (position: GeolocationPosition) => {
      const location: LocationUpdate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
        altitude: position.coords.altitude || undefined,
        timestamp: new Date().toISOString(),
      };

      queueLocationUpdate(location);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      console.error('Geolocation error:', error);
      setLastError(new Error(`Geolocation error: ${error.message}`));
    };

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      options
    );

  }, [enableBatching, queueLocationUpdate]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    disableBatching();

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    // Flush any remaining updates
    forceFlushQueue();
  }, [disableBatching, forceFlushQueue]);

  // Enable/disable offline mode
  const enableOfflineMode = useCallback(() => {
    // Offline mode is controlled by enableOfflineQueue option
    console.log('Offline mode enabled');
  }, []);

  const disableOfflineMode = useCallback(() => {
    // Clear offline queue
    offlineQueueRef.current = [];
    console.log('Offline mode disabled, queue cleared');
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    queueLocationUpdate,
    forceFlushQueue,
    isTracking,
    isMoving,
    networkInfo,
    batteryInfo,
    queueStats,
    startTracking,
    stopTracking,
    enableOfflineMode,
    disableOfflineMode,
    lastError,
    clearError,
  };
};