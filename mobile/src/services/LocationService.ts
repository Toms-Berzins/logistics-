import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface LocationMetadata {
  batteryLevel: number;
  provider: 'GPS' | 'NETWORK' | 'PASSIVE';
  satellites?: number;
  hdop?: number;
  pdop?: number;
}

interface LocationUpdate {
  driverId: string;
  location: LocationData;
  metadata: LocationMetadata;
  offline: boolean;
  retryCount: number;
}

interface LocationServiceConfig {
  highAccuracyRadius: number; // meters
  lowAccuracyInterval: number; // milliseconds
  highAccuracyInterval: number; // milliseconds
  batteryThreshold: number; // percentage
  maxOfflineQueue: number;
  retryInterval: number; // milliseconds
  maxRetryAttempts: number;
}

export class LocationService extends EventEmitter {
  private config: LocationServiceConfig;
  private watchId: number | null = null;
  private isTracking = false;
  private driverId: string;
  private currentAccuracy: 'high' | 'low' = 'low';
  private deliveryLocations: LocationData[] = [];
  private offlineQueue: LocationUpdate[] = [];
  private isOnline = false;
  private lastLocationUpdate: number = 0;
  private batteryLevel = 100;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(driverId: string, config?: Partial<LocationServiceConfig>) {
    super();
    this.driverId = driverId;
    this.config = {
      highAccuracyRadius: 500, // 500 meters
      lowAccuracyInterval: 30000, // 30 seconds
      highAccuracyInterval: 5000, // 5 seconds
      batteryThreshold: 20, // 20%
      maxOfflineQueue: 1000,
      retryInterval: 10000, // 10 seconds
      maxRetryAttempts: 5,
      ...config
    };

    this.setupBatteryMonitoring();
    this.loadOfflineQueue();
    this.setupNetworkMonitoring();
  }

  /**
   * Start location tracking with battery optimization
   */
  async startTracking(): Promise<void> {
    if (this.isTracking) return;

    try {
      // Request location permissions
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        throw new Error('Location permission denied');
      }

      this.isTracking = true;
      this.startLocationUpdates();
      this.startRetryTimer();

      this.emit('tracking:started');
      console.log('Location tracking started');

    } catch (error) {
      console.error('Error starting location tracking:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop location tracking
   */
  async stopTracking(): Promise<void> {
    if (!this.isTracking) return;

    this.isTracking = false;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    // Save any remaining offline queue
    await this.saveOfflineQueue();

    this.emit('tracking:stopped');
    console.log('Location tracking stopped');
  }

  /**
   * Set delivery locations for high accuracy tracking
   */
  setDeliveryLocations(locations: LocationData[]): void {
    this.deliveryLocations = locations;
    this.updateAccuracyMode();
  }

  /**
   * Add a delivery location
   */
  addDeliveryLocation(location: LocationData): void {
    this.deliveryLocations.push(location);
    this.updateAccuracyMode();
  }

  /**
   * Remove a delivery location
   */
  removeDeliveryLocation(index: number): void {
    this.deliveryLocations.splice(index, 1);
    this.updateAccuracyMode();
  }

  /**
   * Get current tracking status
   */
  getStatus(): {
    isTracking: boolean;
    accuracy: 'high' | 'low';
    isOnline: boolean;
    offlineQueueSize: number;
    lastUpdate: number;
    batteryLevel: number;
  } {
    return {
      isTracking: this.isTracking,
      accuracy: this.currentAccuracy,
      isOnline: this.isOnline,
      offlineQueueSize: this.offlineQueue.length,
      lastUpdate: this.lastLocationUpdate,
      batteryLevel: this.batteryLevel
    };
  }

  /**
   * Force sync offline queue
   */
  async syncOfflineQueue(): Promise<void> {
    if (!this.isOnline || this.offlineQueue.length === 0) return;

    const queueToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    try {
      for (const update of queueToProcess) {
        await this.sendLocationUpdate(update);
      }

      await this.saveOfflineQueue();
      this.emit('sync:completed', { synced: queueToProcess.length });

    } catch (error) {
      // Add failed items back to queue
      this.offlineQueue.unshift(...queueToProcess);
      this.emit('sync:failed', error);
      throw error;
    }
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    this.offlineQueue = [];
    await this.saveOfflineQueue();
    this.emit('queue:cleared');
  }

  // Private methods

  private async requestLocationPermission(): Promise<boolean> {
    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      // Request permission (simplified for demo)
      const permissionResult = await navigator.permissions.query({ name: 'geolocation' });
      return permissionResult.state === 'granted';

    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  private startLocationUpdates(): void {
    const options: PositionOptions = {
      enableHighAccuracy: this.currentAccuracy === 'high',
      timeout: 10000,
      maximumAge: this.currentAccuracy === 'high' ? 1000 : 30000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handleLocationUpdate(position),
      (error) => this.handleLocationError(error),
      options
    );
  }

  private async handleLocationUpdate(position: GeolocationPosition): Promise<void> {
    try {
      const { coords, timestamp } = position;
      
      const locationData: LocationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude || undefined,
        accuracy: coords.accuracy,
        heading: coords.heading || undefined,
        speed: coords.speed || undefined,
        timestamp
      };

      const metadata: LocationMetadata = {
        batteryLevel: this.batteryLevel,
        provider: this.determineProvider(coords.accuracy),
        satellites: undefined, // Not available in web API
        hdop: undefined,
        pdop: undefined
      };

      const update: LocationUpdate = {
        driverId: this.driverId,
        location: locationData,
        metadata,
        offline: !this.isOnline,
        retryCount: 0
      };

      this.lastLocationUpdate = timestamp;
      this.updateAccuracyMode();

      if (this.isOnline) {
        await this.sendLocationUpdate(update);
      } else {
        this.queueOfflineUpdate(update);
      }

      this.emit('location:updated', locationData);

    } catch (error) {
      console.error('Error handling location update:', error);
      this.emit('error', error);
    }
  }

  private handleLocationError(error: GeolocationPositionError): void {
    console.error('Location error:', error);
    
    let errorMessage = 'Location error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location timeout';
        break;
    }

    this.emit('error', new Error(errorMessage));
  }

  private updateAccuracyMode(): void {
    if (this.batteryLevel < this.config.batteryThreshold) {
      this.currentAccuracy = 'low';
      return;
    }

    // Check if near any delivery locations
    const isNearDelivery = this.deliveryLocations.some(delivery => {
      // Would need current location to calculate, simplified for demo
      return false;
    });

    const newAccuracy = isNearDelivery ? 'high' : 'low';
    
    if (newAccuracy !== this.currentAccuracy) {
      this.currentAccuracy = newAccuracy;
      this.emit('accuracy:changed', newAccuracy);
      
      // Restart location updates with new accuracy
      if (this.isTracking) {
        if (this.watchId !== null) {
          navigator.geolocation.clearWatch(this.watchId);
        }
        this.startLocationUpdates();
      }
    }
  }

  private async sendLocationUpdate(update: LocationUpdate): Promise<void> {
    try {
      // Simulate sending to server
      const response = await fetch('/api/drivers/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.emit('location:sent', update);

    } catch (error) {
      console.error('Error sending location update:', error);
      
      // Add to offline queue if not already offline
      if (!update.offline) {
        update.offline = true;
        update.retryCount = 0;
        this.queueOfflineUpdate(update);
      }
      
      throw error;
    }
  }

  private queueOfflineUpdate(update: LocationUpdate): void {
    // Remove oldest items if queue is full
    while (this.offlineQueue.length >= this.config.maxOfflineQueue) {
      this.offlineQueue.shift();
    }

    this.offlineQueue.push(update);
    this.saveOfflineQueue();
    this.emit('queue:added', update);
  }

  private startRetryTimer(): void {
    if (this.retryTimer) return;

    this.retryTimer = setInterval(async () => {
      if (this.isOnline && this.offlineQueue.length > 0) {
        try {
          await this.syncOfflineQueue();
        } catch (error) {
          console.error('Error syncing offline queue:', error);
        }
      }
    }, this.config.retryInterval);
  }

  private async loadOfflineQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(`location_queue_${this.driverId}`);
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }

  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `location_queue_${this.driverId}`,
        JSON.stringify(this.offlineQueue)
      );
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  private setupBatteryMonitoring(): void {
    // Simulate battery monitoring (would use actual battery API)
    const updateBattery = () => {
      // Simulate battery drain
      this.batteryLevel = Math.max(0, this.batteryLevel - 0.1);
      this.emit('battery:changed', this.batteryLevel);
      
      if (this.batteryLevel < this.config.batteryThreshold) {
        this.updateAccuracyMode();
      }
    };

    setInterval(updateBattery, 60000); // Update every minute
  }

  private setupNetworkMonitoring(): void {
    const updateOnlineStatus = () => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (this.isOnline !== wasOnline) {
        this.emit('network:changed', this.isOnline);
        
        if (this.isOnline) {
          this.emit('network:online');
          // Try to sync offline queue
          this.syncOfflineQueue().catch(error => {
            console.error('Error syncing on reconnect:', error);
          });
        } else {
          this.emit('network:offline');
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  }

  private determineProvider(accuracy: number): 'GPS' | 'NETWORK' | 'PASSIVE' {
    if (accuracy < 10) return 'GPS';
    if (accuracy < 100) return 'NETWORK';
    return 'PASSIVE';
  }

  private calculateDistance(point1: LocationData, point2: LocationData): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}

// Factory function for creating location service
export function createLocationService(
  driverId: string,
  config?: Partial<LocationServiceConfig>
): LocationService {
  return new LocationService(driverId, config);
}

// Default export
export default LocationService;