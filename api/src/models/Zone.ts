export interface Zone {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  boundary: GeoJSON.MultiPolygon;
  priority: number;
  zoneType: 'standard' | 'express' | 'premium' | 'restricted';
  serviceLevel: 'normal' | 'express' | 'same_day';

  // Pricing
  baseDeliveryFee?: number;
  perMileRate?: number;
  minimumOrder?: number;
  maximumDistanceKm?: number;

  // Time restrictions
  activeHours?: TimeRestriction;
  timezone: string;

  // Statistics
  areaSqKm: number;
  estimatedAddresses?: number;
  avgDeliveryTimeMinutes?: number;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Geofence {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  boundary: GeoJSON.Polygon;
  fenceType: 'delivery_zone' | 'restricted_area' | 'depot' | 'customer_location' | 'traffic_zone';
  priority: number;

  // Alert configuration
  alertOnEntry: boolean;
  alertOnExit: boolean;
  alertOnDwell: boolean;
  dwellTimeMinutes: number;

  // Time-based restrictions
  activeHours?: TimeRestriction;
  timezone: string;

  metadata?: Record<string, any>;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeRestriction {
  monday?: TimeWindow[];
  tuesday?: TimeWindow[];
  wednesday?: TimeWindow[];
  thursday?: TimeWindow[];
  friday?: TimeWindow[];
  saturday?: TimeWindow[];
  sunday?: TimeWindow[];
}

export interface TimeWindow {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface ZonePricing {
  id: string;
  zoneId: string;
  vehicleType?: string;
  weightClass?: string;
  dayOfWeek?: number; // 0=Sunday, 6=Saturday
  hourOfDay?: number; // 0-23

  baseFee: number;
  perMileRate?: number;
  perMinuteRate?: number;
  surgeMultiplier: number;

  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface ZoneMetadata {
  description?: string;
  serviceLevel?: string;
  maxVehicleSize?: string;
  specialInstructions?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  restrictions?: {
    noWeekends?: boolean;
    noEvenings?: boolean;
    requiresEscort?: boolean;
  };
  customFields?: Record<string, any>;
}

export interface ZoneContainmentResult {
  zones: Zone[];
  point: GeoJSON.Point;
  containedIn: string[]; // Zone IDs
  nearbyZones?: {
    zoneId: string;
    distanceMeters: number;
  }[];
}

export interface ZoneOperation {
  operation: 'union' | 'intersection' | 'difference';
  zones: string[]; // Zone IDs
  result: GeoJSON.MultiPolygon;
  areaSqKm: number;
}

export interface ZoneStatistics {
  zoneId: string;
  areaSqKm: number;
  perimeterKm: number;
  estimatedAddresses: number;
  actualDeliveries: number;
  averageDeliveryTime: number;
  successRate: number;
  revenueGenerated: number;
  costPerDelivery: number;
  profitMargin: number;
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

export interface ZoneImportRequest {
  format: 'kml' | 'geojson' | 'shapefile';
  fileData: Buffer | string;
  defaultMetadata?: ZoneMetadata;
  validateGeometry: boolean;
  mergeOverlapping: boolean;
}

export interface ZoneImportResult {
  totalZones: number;
  successfulImports: number;
  failedImports: number;
  errors: {
    zoneIndex: number;
    error: string;
    details?: any;
  }[];
  importedZoneIds: string[];
  warnings: string[];
}

export interface ZoneCoverageAnalysis {
  totalArea: number;
  coveredArea: number;
  uncoveredArea: number;
  overlapArea: number;
  gapAreas: GeoJSON.MultiPolygon[];
  overlapRegions: GeoJSON.MultiPolygon[];
  coveragePercentage: number;
}
