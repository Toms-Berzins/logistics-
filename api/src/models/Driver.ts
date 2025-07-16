export interface Driver {
  id: string;
  userId: string;
  companyId: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: Date;
  vehicleType: string;
  vehiclePlate: string;
  vehicleCapacityWeight: number;
  vehicleCapacityVolume: number;
  isAvailable: boolean;
  currentLocation?: GeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationUpdate {
  id: string;
  driverId: string;
  location: GeoPoint;
  heading?: number; // Direction in degrees (0-360)
  speed?: number; // Speed in m/s
  accuracy?: number; // GPS accuracy in meters
  altitude?: number; // Altitude in meters
  batteryLevel?: number; // Battery percentage
  isMoving: boolean;
  recordedAt: Date;
  createdAt: Date;
  
  // GPS metadata
  provider?: 'GPS' | 'NETWORK' | 'PASSIVE';
  satellites?: number;
  hdop?: number; // Horizontal dilution of precision
  pdop?: number; // Position dilution of precision
}

export interface GeofenceEvent {
  id: string;
  driverId: string;
  geofenceId: string;
  eventType: 'entry' | 'exit' | 'dwell_start' | 'dwell_end';
  location: GeoPoint;
  heading?: number;
  speed?: number;
  eventTime: Date;
  dwellDurationSeconds?: number;
  processed: boolean;
  alertSent: boolean;
  createdAt: Date;
}

export interface RouteSegment {
  id: string;
  routeId: string;
  driverId: string;
  segmentOrder: number;
  trajectory: GeoJSON.LineString;
  startLocation: GeoPoint;
  endLocation: GeoPoint;
  startedAt: Date;
  completedAt: Date;
  distanceMeters: number;
  durationSeconds: number;
  averageSpeed: number; // m/s
  maxSpeed: number;
  idleTimeSeconds: number;
  trafficDelaySeconds: number;
  segmentType: 'pickup' | 'delivery' | 'transit' | 'return';
  roadType: 'highway' | 'arterial' | 'local' | 'residential';
  createdAt: Date;
}

export interface DriverStatus {
  driverId: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentJobId?: string;
  lastLocationUpdate: Date;
  batteryLevel?: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  currentZones: string[]; // IDs of zones driver is currently in
}

export interface ETACalculation {
  driverId: string;
  destinationLocation: GeoPoint;
  estimatedArrivalTime: Date;
  estimatedDurationMinutes: number;
  distanceKm: number;
  confidence: number; // 0-1 based on historical accuracy
  factors: {
    traffic: number; // Traffic delay factor
    weather?: number; // Weather impact factor
    driverBehavior: number; // Driver speed/behavior factor
    timeOfDay: number; // Time-based factor
  };
  calculatedAt: Date;
}

export interface LocationBatch {
  driverId: string;
  locations: Omit<LocationUpdate, 'id' | 'driverId' | 'createdAt'>[];
  batchId: string;
  submittedAt: Date;
  processedAt?: Date;
  offlineQueuedAt?: Date; // For offline scenarios
}