import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const LOCATION_TASK_NAME = 'background-location-task';

interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

interface LocationQueue {
  locations: LocationPoint[];
  lastSync: string;
}

export class LocationService {
  private driverId: string;
  private isTracking: boolean = false;
  private locationQueue: LocationPoint[] = [];
  private lastSyncTime: Date = new Date();
  private syncInterval: NodeJS.Timeout | null = null;
  private baseUrl: string;

  constructor(driverId: string) {
    this.driverId = driverId;
    this.baseUrl = 'http://localhost:3001'; // API base URL
    this.setupBackgroundTask();
  }

  private setupBackgroundTask(): void {
    // Background tasks will be set up when needed
    console.log('Background task setup placeholder');
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground location permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.warn('Foreground location permission denied');
        return false;
      }

      // Request background location permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied');
        // Still allow foreground tracking
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  async startTracking(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        console.warn('Location services are disabled');
        return false;
      }

      // For demo purposes, we'll simulate location tracking
      console.log('Location tracking would start here');

      this.isTracking = true;
      this.startSyncInterval();
      
      console.log('Location tracking started');
      return true;
    } catch (error) {
      console.error('Error starting location tracking:', error);
      return false;
    }
  }

  async stopTracking(): Promise<void> {
    try {
      if (this.isTracking) {
        console.log('Location tracking would stop here');
        this.isTracking = false;
        this.stopSyncInterval();
        
        // Sync any remaining locations
        await this.syncLocations();
        
        console.log('Location tracking stopped');
      }
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  private handleLocationUpdate(locations: Location.LocationObject[]): void {
    const processedLocations = locations.map(location => ({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy || 0,
      timestamp: new Date(location.timestamp).toISOString(),
      speed: location.coords.speed || undefined,
      heading: location.coords.heading || undefined,
    }));

    this.locationQueue.push(...processedLocations);
    
    // Auto-sync if queue gets too large
    if (this.locationQueue.length >= 10) {
      this.syncLocations();
    }
  }

  private startSyncInterval(): void {
    this.syncInterval = setInterval(() => {
      this.syncLocations();
    }, 60000); // Sync every minute
  }

  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async syncLocations(): Promise<void> {
    if (this.locationQueue.length === 0) {
      return;
    }

    try {
      const locationsToSync = [...this.locationQueue];
      this.locationQueue = [];

      // In a real app, this would send to your API
      console.log(`Syncing ${locationsToSync.length} locations for driver ${this.driverId}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store sync data locally for offline recovery
      await this.storeLocationQueue({
        locations: [],
        lastSync: new Date().toISOString()
      });

      this.lastSyncTime = new Date();
      console.log('Locations synced successfully');
    } catch (error) {
      console.error('Error syncing locations:', error);
      
      // Re-add locations to queue for retry
      this.locationQueue.unshift(...this.locationQueue);
      
      // Store failed locations for offline recovery
      await this.storeLocationQueue({
        locations: this.locationQueue,
        lastSync: this.lastSyncTime.toISOString()
      });
    }
  }

  private async storeLocationQueue(queue: LocationQueue): Promise<void> {
    try {
      const queueData = JSON.stringify(queue);
      await SecureStore.setItemAsync(`location_queue_${this.driverId}`, queueData);
    } catch (error) {
      console.error('Error storing location queue:', error);
    }
  }

  private async loadLocationQueue(): Promise<LocationQueue | null> {
    try {
      const queueData = await SecureStore.getItemAsync(`location_queue_${this.driverId}`);
      if (queueData) {
        return JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading location queue:', error);
    }
    return null;
  }

  async getCurrentLocation(): Promise<LocationPoint | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: new Date(location.timestamp).toISOString(),
        speed: location.coords.speed || undefined,
        heading: location.coords.heading || undefined,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  async getLocationHistory(): Promise<LocationPoint[]> {
    const queue = await this.loadLocationQueue();
    return queue?.locations || [];
  }

  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  getQueueSize(): number {
    return this.locationQueue.length;
  }

  getLastSyncTime(): Date {
    return this.lastSyncTime;
  }

  // Geofencing methods (simplified for demo)
  async checkGeofence(latitude: number, longitude: number, radius: number): Promise<boolean> {
    const currentLocation = await this.getCurrentLocation();
    if (!currentLocation) {
      return false;
    }

    const distance = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      latitude,
      longitude
    );

    return distance <= radius;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}