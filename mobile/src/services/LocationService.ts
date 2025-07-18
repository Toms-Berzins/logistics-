import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Go Spatial Service Integration
interface GoSpatialClient {
  baseUrl: string;
  timeout: number;
}

interface GeofenceData {
  id: string;
  name: string;
  geometry: {
    type: 'Polygon' | 'Circle';
    coordinates: number[][];
    radius?: number; // for circle type
  };
  properties: {
    alertOnEntry: boolean;
    alertOnExit: boolean;
    driverId?: string;
  };
}

interface RouteOptimizationRequest {
  origin: LocationData;
  destinations: LocationData[];
  vehicle: {
    type: 'van' | 'truck' | 'motorcycle';
    capacity: number;
    restrictions?: string[];
  };
  preferences: {
    optimizeFor: 'time' | 'distance' | 'fuel';
    avoidTolls: boolean;
    avoidHighways: boolean;
  };
}

interface RouteOptimizationResponse {
  optimizedRoute: {
    waypoints: LocationData[];
    totalDistance: number; // meters
    totalDuration: number; // seconds
    estimatedFuel: number; // liters
  };
  performance: {
    calculationTime: number; // milliseconds
    spatialQueries: number;
  };
}

interface SpatialAnalysisRequest {
  driverId: string;
  location: LocationData;
  analysisType: 'geofence_check' | 'route_deviation' | 'delivery_zone' | 'traffic_analysis';
  parameters?: Record<string, any>;
}

interface SpatialAnalysisResponse {
  result: {
    withinGeofence: boolean;
    geofenceId?: string;
    distanceToRoute?: number;
    estimatedDelay?: number;
    nearbyDeliveries?: LocationData[];
    trafficLevel?: 'low' | 'moderate' | 'high' | 'severe';
  };
  performance: {
    queryTime: number; // milliseconds
    spatialIndexUsed: boolean;
  };
}

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
  // Go Spatial Service Configuration
  goSpatialService: {
    enabled: boolean;
    baseUrl: string;
    timeout: number;
    maxRetries: number;
    performanceTarget: number; // milliseconds
  };
  // Real-time geospatial features
  geofencing: {
    enabled: boolean;
    checkInterval: number; // milliseconds
    bufferDistance: number; // meters
  };
  routeOptimization: {
    enabled: boolean;
    autoOptimize: boolean;
    recalculateThreshold: number; // meters deviation
  };
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
  // Go Spatial Service Integration
  private goSpatialClient: GoSpatialClient;
  private geofences: GeofenceData[] = [];
  private currentRoute: RouteOptimizationResponse | null = null;
  private spatialAnalysisTimer: NodeJS.Timeout | null = null;
  private wsConnection: WebSocket | null = null;

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
      // Go Spatial Service defaults
      goSpatialService: {
        enabled: true,
        baseUrl: process.env.REACT_NATIVE_GO_SPATIAL_URL || 'http://localhost:8080',
        timeout: 5000,
        maxRetries: 3,
        performanceTarget: 50 // 50ms target
      },
      geofencing: {
        enabled: true,
        checkInterval: 10000, // 10 seconds
        bufferDistance: 50 // 50 meters
      },
      routeOptimization: {
        enabled: true,
        autoOptimize: true,
        recalculateThreshold: 100 // 100 meters
      },
      ...config
    };

    // Initialize Go Spatial Client
    this.goSpatialClient = {
      baseUrl: this.config.goSpatialService.baseUrl,
      timeout: this.config.goSpatialService.timeout
    };

    this.setupBatteryMonitoring();
    this.loadOfflineQueue();
    this.setupNetworkMonitoring();
    this.initializeGoSpatialConnection();
    this.loadGeofences();
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
      this.startSpatialAnalysis();
      this.connectToSpatialWebSocket();

      this.emit('tracking:started');
      console.log('Location tracking started with Go spatial service integration');

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

    if (this.spatialAnalysisTimer) {
      clearInterval(this.spatialAnalysisTimer);
      this.spatialAnalysisTimer = null;
    }

    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
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

  /**
   * Get optimized route using Go spatial service
   */
  async getOptimizedRoute(request: RouteOptimizationRequest): Promise<RouteOptimizationResponse | null> {
    if (!this.config.goSpatialService.enabled) {
      console.warn('Go spatial service disabled');
      return null;
    }

    try {
      const startTime = Date.now();
      const response = await this.callGoSpatialAPI('/api/route/optimize', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (response.ok) {
        const result: RouteOptimizationResponse = await response.json();
        const responseTime = Date.now() - startTime;
        
        // Emit performance metrics
        this.emit('spatial:performance', {
          operation: 'route_optimization',
          responseTime,
          target: this.config.goSpatialService.performanceTarget,
          withinTarget: responseTime <= this.config.goSpatialService.performanceTarget
        });

        this.currentRoute = result;
        this.emit('route:optimized', result);
        return result;
      } else {
        throw new Error(`Go spatial service error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting optimized route:', error);
      this.emit('spatial:error', { operation: 'route_optimization', error });
      return null;
    }
  }

  /**
   * Perform real-time spatial analysis
   */
  async performSpatialAnalysis(request: SpatialAnalysisRequest): Promise<SpatialAnalysisResponse | null> {
    if (!this.config.goSpatialService.enabled) return null;

    try {
      const startTime = Date.now();
      const response = await this.callGoSpatialAPI('/api/spatial/analyze', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (response.ok) {
        const result: SpatialAnalysisResponse = await response.json();
        const responseTime = Date.now() - startTime;
        
        // Emit performance metrics
        this.emit('spatial:performance', {
          operation: 'spatial_analysis',
          responseTime,
          target: this.config.goSpatialService.performanceTarget,
          withinTarget: responseTime <= this.config.goSpatialService.performanceTarget
        });

        // Handle geofence alerts
        if (request.analysisType === 'geofence_check' && result.result.withinGeofence) {
          this.emit('geofence:entered', {
            geofenceId: result.result.geofenceId,
            location: request.location,
            timestamp: Date.now()
          });
        }

        return result;
      } else {
        throw new Error(`Go spatial service error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error performing spatial analysis:', error);
      this.emit('spatial:error', { operation: 'spatial_analysis', error });
      return null;
    }
  }

  /**
   * Load geofences from Go spatial service
   */
  async loadGeofences(): Promise<void> {
    if (!this.config.goSpatialService.enabled) return;

    try {
      const response = await this.callGoSpatialAPI('/api/geofences', {
        method: 'GET'
      });

      if (response.ok) {
        const geofences: GeofenceData[] = await response.json();
        this.geofences = geofences;
        this.emit('geofences:loaded', geofences);
        console.log(`Loaded ${geofences.length} geofences from Go spatial service`);
      }
    } catch (error) {
      console.error('Error loading geofences:', error);
      this.emit('spatial:error', { operation: 'load_geofences', error });
    }
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

  // Go Spatial Service Integration Methods

  private async initializeGoSpatialConnection(): Promise<void> {
    if (!this.config.goSpatialService.enabled) return;

    try {
      // Test connection to Go spatial service
      const response = await this.callGoSpatialAPI('/health', { method: 'GET' });
      if (response.ok) {
        const health = await response.json();
        console.log('Go spatial service connected:', health);
        this.emit('spatial:connected', health);
      } else {
        throw new Error('Go spatial service health check failed');
      }
    } catch (error) {
      console.error('Failed to connect to Go spatial service:', error);
      this.emit('spatial:error', { operation: 'connection', error });
      // Fallback to local processing
      this.config.goSpatialService.enabled = false;
    }
  }

  private async callGoSpatialAPI(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.goSpatialClient.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await this.getAuthToken()}`,
      'X-Driver-ID': this.driverId
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      signal: AbortSignal.timeout(this.goSpatialClient.timeout)
    };

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.goSpatialService.maxRetries; attempt++) {
      try {
        const response = await fetch(url, requestOptions);
        return response;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Go spatial API attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.goSpatialService.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError || new Error('All Go spatial API attempts failed');
  }

  private async getAuthToken(): Promise<string> {
    try {
      return await AsyncStorage.getItem('driver_token') || '';
    } catch (error) {
      console.error('Error getting auth token:', error);
      return '';
    }
  }

  private startSpatialAnalysis(): void {
    if (!this.config.goSpatialService.enabled || !this.config.geofencing.enabled) return;

    this.spatialAnalysisTimer = setInterval(async () => {
      if (this.isTracking && this.lastLocationUpdate > 0) {
        try {
          // Get current location from last update
          const lastLocation = this.getCurrentLocation();
          if (!lastLocation) return;

          // Perform geofence check
          await this.performSpatialAnalysis({
            driverId: this.driverId,
            location: lastLocation,
            analysisType: 'geofence_check'
          });

          // Check route deviation if route exists
          if (this.currentRoute) {
            await this.performSpatialAnalysis({
              driverId: this.driverId,
              location: lastLocation,
              analysisType: 'route_deviation',
              parameters: {
                expectedRoute: this.currentRoute.optimizedRoute.waypoints
              }
            });
          }
        } catch (error) {
          console.error('Error in spatial analysis:', error);
        }
      }
    }, this.config.geofencing.checkInterval);
  }

  private connectToSpatialWebSocket(): void {
    if (!this.config.goSpatialService.enabled) return;

    try {
      const wsUrl = this.goSpatialClient.baseUrl.replace('http', 'ws') + '/ws/spatial';
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('Connected to Go spatial WebSocket');
        this.emit('spatial:ws_connected');
        
        // Subscribe to driver-specific events
        this.wsConnection?.send(JSON.stringify({
          type: 'subscribe',
          driverId: this.driverId
        }));
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleSpatialWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('Go spatial WebSocket disconnected');
        this.emit('spatial:ws_disconnected');
        
        // Attempt reconnection after delay
        setTimeout(() => {
          if (this.isTracking) {
            this.connectToSpatialWebSocket();
          }
        }, 5000);
      };

      this.wsConnection.onerror = (error) => {
        console.error('Go spatial WebSocket error:', error);
        this.emit('spatial:ws_error', error);
      };
    } catch (error) {
      console.error('Error connecting to spatial WebSocket:', error);
    }
  }

  private handleSpatialWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'geofence_alert':
        this.emit('geofence:alert', data.payload);
        break;
      case 'route_update':
        this.emit('route:updated', data.payload);
        break;
      case 'traffic_alert':
        this.emit('traffic:alert', data.payload);
        break;
      case 'performance_metrics':
        this.emit('spatial:metrics', data.payload);
        break;
      default:
        console.log('Unknown spatial WebSocket message:', data);
    }
  }

  private getCurrentLocation(): LocationData | null {
    // This would return the most recent location
    // For now, return null as a placeholder
    return null;
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