export interface GeoPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface LocationMetadata {
  accuracy: number;
  heading?: number;
  speed?: number;
  batteryLevel?: number;
  timestamp: Date;
  provider: 'GPS' | 'NETWORK' | 'PASSIVE';
  satellites?: number;
  hdop?: number;
  pdop?: number;
}

export interface IDriverLocation {
  driverId: string;
  companyId: string;
  location: GeoPoint;
  metadata: LocationMetadata;
  isOnline: boolean;
  lastSeen: Date;
  currentZoneId?: string;
  currentJobId?: string;
  status: 'available' | 'busy' | 'offline' | 'break';
}

export interface ILocationUpdate {
  driverId: string;
  location: GeoPoint;
  metadata: LocationMetadata;
  previousLocation?: GeoPoint;
  distanceTraveled?: number;
  timeSinceLastUpdate?: number;
}

export interface IGeofenceEvent {
  id: string;
  driverId: string;
  zoneId: string;
  eventType: 'enter' | 'exit' | 'dwell';
  location: GeoPoint;
  timestamp: Date;
  metadata: {
    previousZoneId?: string;
    dwellTime?: number;
    entrySpeed?: number;
    exitSpeed?: number;
  };
}

export interface GeofenceZone {
  id: string;
  name: string;
  companyId: string;
  boundary: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  alertOnEntry: boolean;
  alertOnExit: boolean;
  alertOnDwell: boolean;
  dwellTimeMinutes: number;
  priority: number;
  isActive: boolean;
}

export interface ProximityQuery {
  center: GeoPoint;
  radiusMeters: number;
  limit?: number;
  unit?: 'km' | 'mi' | 'm' | 'ft';
}

export interface SpatialIndex {
  indexName: string;
  tableName: string;
  columnName: string;
  indexType: 'GIST' | 'SPGIST' | 'BTREE';
  spatialFunction: 'ST_Contains' | 'ST_Distance' | 'ST_Intersects' | 'ST_DWithin';
}

export interface LocationPerformanceMetrics {
  updateLatency: number;
  processingTime: number;
  cacheHitRate: number;
  activeConnections: number;
  locationsPerSecond: number;
  geofenceChecksPerSecond: number;
  errorRate: number;
  timestamp: Date;
}
