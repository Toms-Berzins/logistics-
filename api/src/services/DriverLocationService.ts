import { databaseConfig } from '../config/database';
import trackingRedis, { REDIS_KEYS, TTL } from '../config/redisTracking';
import { postgisUtils } from '../utils/postgis';
import { 
  Driver, 
  LocationUpdate, 
  GeofenceEvent, 
  ETACalculation, 
  LocationBatch,
  GeoPoint 
} from '../models/Driver';
import { Geofence } from '../models/Zone';
import { EventEmitter } from 'events';

export interface LocationServiceOptions {
  enableGeofencing?: boolean;
  enableETACalculation?: boolean;
  locationRetentionHours?: number;
  batchProcessingEnabled?: boolean;
}

export interface GeofenceCheckResult {
  events: GeofenceEvent[];
  currentZones: string[];
  zoneChanges: {
    entered: string[];
    exited: string[];
  };
}

export interface LocationProcessingResult {
  locationUpdate: LocationUpdate;
  geofenceEvents: GeofenceEvent[];
  eta?: ETACalculation;
  processingTimeMs: number;
}

export class DriverLocationService extends EventEmitter {
  private options: LocationServiceOptions;
  private locationHistory = new Map<string, LocationUpdate[]>();
  private currentZones = new Map<string, Set<string>>(); // driverId -> Set of zone IDs
  private processingQueue = new Set<string>(); // Track drivers being processed

  constructor(options: LocationServiceOptions = {}) {
    super();
    this.options = {
      enableGeofencing: true,
      enableETACalculation: true,
      locationRetentionHours: 24,
      batchProcessingEnabled: true,
      ...options
    };
  }

  /**
   * Update driver location with geofencing and ETA calculation
   */
  async updateDriverLocation(
    driverId: string,
    location: GeoPoint,
    heading?: number,
    speed?: number,
    metadata?: {
      accuracy?: number;
      altitude?: number;
      batteryLevel?: number;
      provider?: 'GPS' | 'NETWORK' | 'PASSIVE';
      satellites?: number;
    }
  ): Promise<LocationProcessingResult> {
    const startTime = Date.now();

    // Prevent concurrent processing for same driver
    if (this.processingQueue.has(driverId)) {
      throw new Error(`Location update already in progress for driver ${driverId}`);
    }

    this.processingQueue.add(driverId);

    try {
      // Validate input
      this.validateLocation(location);
      
      // Get previous location for movement detection
      const previousLocation = await this.getLastLocation(driverId);
      const isMoving = this.detectMovement(location, previousLocation || undefined, speed);

      // Create location update record
      const locationUpdate: LocationUpdate = {
        id: `loc_${Date.now()}_${driverId}`,
        driverId,
        location,
        heading,
        speed,
        accuracy: metadata?.accuracy,
        altitude: metadata?.altitude,
        batteryLevel: metadata?.batteryLevel,
        isMoving,
        recordedAt: new Date(),
        createdAt: new Date(),
        provider: metadata?.provider,
        satellites: metadata?.satellites
      };

      // Store in database and Redis
      await Promise.all([
        this.storeLocationInDatabase(locationUpdate),
        this.storeLocationInRedis(locationUpdate),
        this.updateLocationHistory(locationUpdate)
      ]);

      // Geofencing check
      let geofenceEvents: GeofenceEvent[] = [];
      if (this.options.enableGeofencing) {
        const geofenceResult = await this.checkGeofences(driverId, location, previousLocation?.location);
        geofenceEvents = geofenceResult.events;
        
        // Update current zones tracking
        this.currentZones.set(driverId, new Set(geofenceResult.currentZones));
        
        // Emit events for zone changes
        if (geofenceResult.zoneChanges.entered.length > 0) {
          this.emit('zonesEntered', {
            driverId,
            zones: geofenceResult.zoneChanges.entered,
            location,
            timestamp: new Date()
          });
        }
        
        if (geofenceResult.zoneChanges.exited.length > 0) {
          this.emit('zonesExited', {
            driverId,
            zones: geofenceResult.zoneChanges.exited,
            location,
            timestamp: new Date()
          });
        }
      }

      // Calculate ETA if requested
      let eta: ETACalculation | undefined;
      if (this.options.enableETACalculation) {
        eta = await this.calculateETA(driverId, location);
      }

      const processingTimeMs = Date.now() - startTime;

      // Emit location update event
      this.emit('locationUpdated', {
        driverId,
        location: locationUpdate,
        geofenceEvents,
        eta,
        processingTimeMs
      });

      // Check for performance warnings
      if (processingTimeMs > 50) {
        console.warn(`Slow location processing: ${processingTimeMs}ms for driver ${driverId}`);
      }

      return {
        locationUpdate,
        geofenceEvents,
        eta,
        processingTimeMs
      };

    } finally {
      this.processingQueue.delete(driverId);
    }
  }

  /**
   * Batch process multiple location updates
   */
  async processBatchLocationUpdates(
    batch: LocationBatch
  ): Promise<LocationProcessingResult[]> {
    if (!this.options.batchProcessingEnabled) {
      throw new Error('Batch processing is disabled');
    }

    const results: LocationProcessingResult[] = [];
    const { driverId, locations } = batch;

    // Sort locations by timestamp to process in order
    const sortedLocations = locations.sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    for (const locationData of sortedLocations) {
      try {
        const result = await this.updateDriverLocation(
          driverId,
          locationData.location,
          locationData.heading,
          locationData.speed,
          {
            accuracy: locationData.accuracy,
            altitude: locationData.altitude,
            batteryLevel: locationData.batteryLevel,
            provider: locationData.provider,
            satellites: locationData.satellites
          }
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to process location in batch for driver ${driverId}:`, error);
        // Continue processing remaining locations
      }
    }

    // Update batch processing metadata
    await this.updateBatchMetadata(batch, results);

    return results;
  }

  /**
   * Get driver's location history
   */
  async getLocationHistory(
    driverId: string,
    startTime?: Date,
    endTime?: Date,
    limit: number = 1000
  ): Promise<LocationUpdate[]> {
    const client = await databaseConfig.connect();
    
    try {
      let query = `
        SELECT 
          id,
          driver_id,
          ST_Y(location) as latitude,
          ST_X(location) as longitude,
          heading,
          speed,
          accuracy,
          altitude,
          battery_level,
          is_moving,
          recorded_at,
          created_at,
          provider,
          satellites,
          hdop,
          pdop
        FROM driver_location_history
        WHERE driver_id = $1
      `;
      
      const params: any[] = [driverId];
      let paramIndex = 2;
      
      if (startTime) {
        query += ` AND recorded_at >= $${paramIndex}`;
        params.push(startTime);
        paramIndex++;
      }
      
      if (endTime) {
        query += ` AND recorded_at <= $${paramIndex}`;
        params.push(endTime);
        paramIndex++;
      }
      
      query += ` ORDER BY recorded_at DESC LIMIT $${paramIndex}`;
      params.push(limit);
      
      const result = await client.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        driverId: row.driver_id,
        location: {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude)
        },
        heading: row.heading ? parseFloat(row.heading) : undefined,
        speed: row.speed ? parseFloat(row.speed) : undefined,
        accuracy: row.accuracy ? parseFloat(row.accuracy) : undefined,
        altitude: row.altitude ? parseFloat(row.altitude) : undefined,
        batteryLevel: row.battery_level,
        isMoving: row.is_moving,
        recordedAt: new Date(row.recorded_at),
        createdAt: new Date(row.created_at),
        provider: row.provider,
        satellites: row.satellites,
        hdop: row.hdop ? parseFloat(row.hdop) : undefined,
        pdop: row.pdop ? parseFloat(row.pdop) : undefined
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get current driver locations from Redis
   */
  async getCurrentLocations(companyId: string): Promise<Map<string, LocationUpdate>> {
    const driverIds = await trackingRedis.smembers(REDIS_KEYS.COMPANY_DRIVERS(companyId));
    const locations = new Map<string, LocationUpdate>();
    
    if (driverIds.length === 0) return locations;
    
    const pipeline = trackingRedis.pipeline();
    driverIds.forEach(driverId => {
      pipeline.hgetall(REDIS_KEYS.DRIVER_LOCATION(driverId));
    });
    
    const results = await pipeline.exec();
    
    results?.forEach((result, index) => {
      if (result && result[1]) {
        const data = result[1] as Record<string, string>;
        if (data.lat && data.lng) {
          const driverId = driverIds[index];
          locations.set(driverId, {
            id: `current_${driverId}`,
            driverId,
            location: {
              latitude: parseFloat(data.lat),
              longitude: parseFloat(data.lng)
            },
            heading: data.heading ? parseFloat(data.heading) : undefined,
            speed: data.speed ? parseFloat(data.speed) : undefined,
            accuracy: data.accuracy ? parseFloat(data.accuracy) : undefined,
            altitude: data.altitude ? parseFloat(data.altitude) : undefined,
            batteryLevel: data.batteryLevel ? parseInt(data.batteryLevel) : undefined,
            isMoving: data.isMoving === 'true',
            recordedAt: new Date(data.timestamp),
            createdAt: new Date(data.lastUpdate),
            provider: data.provider as any
          });
        }
      }
    });
    
    return locations;
  }

  /**
   * Clean up old location history
   */
  async cleanupOldLocations(): Promise<number> {
    const retentionHours = this.options.locationRetentionHours || 24;
    const cutoffTime = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
    
    const client = await databaseConfig.connect();
    
    try {
      const result = await client.query(
        'DELETE FROM driver_location_history WHERE recorded_at < $1',
        [cutoffTime]
      );
      
      const deletedCount = result.rowCount || 0;
      
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old location records`);
      }
      
      return deletedCount;
    } finally {
      client.release();
    }
  }

  // Private helper methods

  private validateLocation(location: GeoPoint): void {
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }
    
    if (location.latitude < -90 || location.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }
    
    if (location.longitude < -180 || location.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }
  }

  private detectMovement(
    currentLocation: GeoPoint,
    previousLocation?: LocationUpdate,
    speed?: number
  ): boolean {
    // If we have speed data and it's above threshold, consider moving
    if (speed !== undefined && speed > 0.5) { // 0.5 m/s = ~1.8 km/h
      return true;
    }
    
    // If no previous location, assume stationary
    if (!previousLocation) {
      return false;
    }
    
    // Calculate distance moved
    const distance = this.calculateDistance(
      currentLocation,
      previousLocation.location
    );
    
    // Consider moving if moved more than 10 meters
    return distance > 10;
  }

  private calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371e3; // Earth's radius in meters
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

  private async getLastLocation(driverId: string): Promise<LocationUpdate | null> {
    // Try Redis first for speed
    const redisData = await trackingRedis.hgetall(REDIS_KEYS.DRIVER_LOCATION(driverId));
    
    if (redisData && redisData.lat && redisData.lng) {
      return {
        id: `redis_${driverId}`,
        driverId,
        location: {
          latitude: parseFloat(redisData.lat),
          longitude: parseFloat(redisData.lng)
        },
        heading: redisData.heading ? parseFloat(redisData.heading) : undefined,
        speed: redisData.speed ? parseFloat(redisData.speed) : undefined,
        isMoving: redisData.isMoving === 'true',
        recordedAt: new Date(redisData.timestamp),
        createdAt: new Date(redisData.lastUpdate)
      };
    }
    
    // Fallback to database
    const history = await this.getLocationHistory(driverId, undefined, undefined, 1);
    return history.length > 0 ? history[0] : null;
  }

  private async storeLocationInDatabase(location: LocationUpdate): Promise<void> {
    const client = await databaseConfig.connect();
    
    try {
      await client.query(`
        INSERT INTO driver_location_history (
          driver_id, location, heading, speed, accuracy, altitude, 
          battery_level, is_moving, recorded_at, provider, satellites
        ) VALUES (
          $1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, 
          $8, $9, $10, $11, $12
        )
      `, [
        location.driverId,
        location.location.longitude,
        location.location.latitude,
        location.heading,
        location.speed,
        location.accuracy,
        location.altitude,
        location.batteryLevel,
        location.isMoving,
        location.recordedAt,
        location.provider,
        location.satellites
      ]);
    } finally {
      client.release();
    }
  }

  private async storeLocationInRedis(location: LocationUpdate): Promise<void> {
    const redisData = {
      lat: location.location.latitude.toString(),
      lng: location.location.longitude.toString(),
      heading: location.heading?.toString() || '',
      speed: location.speed?.toString() || '',
      accuracy: location.accuracy?.toString() || '',
      altitude: location.altitude?.toString() || '',
      batteryLevel: location.batteryLevel?.toString() || '',
      isMoving: location.isMoving.toString(),
      timestamp: location.recordedAt.toISOString(),
      lastUpdate: Date.now().toString(),
      provider: location.provider || ''
    };

    const pipeline = trackingRedis.pipeline();
    pipeline.hmset(REDIS_KEYS.DRIVER_LOCATION(location.driverId), redisData);
    pipeline.expire(REDIS_KEYS.DRIVER_LOCATION(location.driverId), TTL.DRIVER_LOCATION);
    
    // Add to Redis Streams for history
    pipeline.xadd(
      `location_stream:${location.driverId}`,
      'MAXLEN', '~', 1000, // Keep approximately last 1000 entries
      '*',
      'lat', redisData.lat,
      'lng', redisData.lng,
      'heading', redisData.heading,
      'speed', redisData.speed,
      'timestamp', redisData.timestamp
    );
    
    await pipeline.exec();
  }

  private updateLocationHistory(location: LocationUpdate): void {
    const driverId = location.driverId;
    
    if (!this.locationHistory.has(driverId)) {
      this.locationHistory.set(driverId, []);
    }
    
    const history = this.locationHistory.get(driverId)!;
    history.unshift(location);
    
    // Keep only recent history in memory (last 50 entries)
    if (history.length > 50) {
      history.splice(50);
    }
  }

  private async checkGeofences(
    driverId: string,
    currentLocation: GeoPoint,
    previousLocation?: GeoPoint
  ): Promise<GeofenceCheckResult> {
    // Get active geofences
    const geofences = await this.getActiveGeofences(driverId);
    
    // Find current zones
    const currentZones: string[] = [];
    const events: GeofenceEvent[] = [];
    
    for (const geofence of geofences) {
      const isCurrentlyInside = await postgisUtils.pointInPolygon(
        currentLocation,
        postgisUtils.geoJSONToWKT(geofence.boundary)
      );
      
      if (isCurrentlyInside) {
        currentZones.push(geofence.id);
      }
      
      // Check for zone transitions if we have previous location
      if (previousLocation) {
        const wasPreviouslyInside = await postgisUtils.pointInPolygon(
          previousLocation,
          postgisUtils.geoJSONToWKT(geofence.boundary)
        );
        
        // Entry event
        if (isCurrentlyInside && !wasPreviouslyInside && geofence.alertOnEntry) {
          const event: GeofenceEvent = {
            id: `event_${Date.now()}_${driverId}_${geofence.id}`,
            driverId,
            geofenceId: geofence.id,
            eventType: 'entry',
            location: currentLocation,
            eventTime: new Date(),
            processed: false,
            alertSent: false,
            createdAt: new Date()
          };
          
          events.push(event);
        }
        
        // Exit event
        if (!isCurrentlyInside && wasPreviouslyInside && geofence.alertOnExit) {
          const event: GeofenceEvent = {
            id: `event_${Date.now()}_${driverId}_${geofence.id}`,
            driverId,
            geofenceId: geofence.id,
            eventType: 'exit',
            location: currentLocation,
            eventTime: new Date(),
            processed: false,
            alertSent: false,
            createdAt: new Date()
          };
          
          events.push(event);
        }
      }
    }
    
    // Store events in database
    if (events.length > 0) {
      await this.storeGeofenceEvents(events);
    }
    
    // Calculate zone changes
    const previousZones = this.currentZones.get(driverId) || new Set();
    const currentZonesSet = new Set(currentZones);
    
    const entered = currentZones.filter(zone => !previousZones.has(zone));
    const exited = Array.from(previousZones).filter(zone => !currentZonesSet.has(zone));
    
    return {
      events,
      currentZones,
      zoneChanges: { entered, exited }
    };
  }

  private async getActiveGeofences(driverId: string): Promise<Geofence[]> {
    // This would typically be cached in Redis for performance
    const cacheKey = `geofences:driver:${driverId}`;
    const cached = await trackingRedis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const client = await databaseConfig.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          g.id,
          g.company_id,
          g.name,
          g.description,
          ST_AsGeoJSON(g.boundary) as boundary,
          g.fence_type,
          g.priority,
          g.alert_on_entry,
          g.alert_on_exit,
          g.alert_on_dwell,
          g.dwell_time_minutes,
          g.active_hours,
          g.timezone,
          g.metadata
        FROM geofences g
        JOIN drivers d ON d.company_id = g.company_id
        WHERE d.id = $1 AND g.is_active = true
        ORDER BY g.priority DESC
      `, [driverId]);
      
      const geofences: Geofence[] = result.rows.map(row => ({
        id: row.id,
        companyId: row.company_id,
        name: row.name,
        description: row.description,
        boundary: JSON.parse(row.boundary),
        fenceType: row.fence_type,
        priority: row.priority,
        alertOnEntry: row.alert_on_entry,
        alertOnExit: row.alert_on_exit,
        alertOnDwell: row.alert_on_dwell,
        dwellTimeMinutes: row.dwell_time_minutes,
        activeHours: row.active_hours,
        timezone: row.timezone,
        metadata: row.metadata,
        isActive: true,
        createdBy: '',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // Cache for 5 minutes
      await trackingRedis.setex(cacheKey, 300, JSON.stringify(geofences));
      
      return geofences;
    } finally {
      client.release();
    }
  }

  private async storeGeofenceEvents(events: GeofenceEvent[]): Promise<void> {
    if (events.length === 0) return;
    
    const client = await databaseConfig.connect();
    
    try {
      const query = `
        INSERT INTO geofence_events (
          driver_id, geofence_id, event_type, location, 
          heading, speed, event_time, processed, alert_sent
        ) VALUES ${events.map((_, i) => {
          const base = i * 8;
          return `($${base + 1}, $${base + 2}, $${base + 3}, ST_SetSRID(ST_MakePoint($${base + 4}, $${base + 5}), 4326), $${base + 6}, $${base + 7}, $${base + 8})`;
        }).join(', ')}
      `;
      
      const params: any[] = [];
      events.forEach(event => {
        params.push(
          event.driverId,
          event.geofenceId,
          event.eventType,
          event.location.longitude,
          event.location.latitude,
          event.heading,
          event.speed,
          event.eventTime
        );
      });
      
      await client.query(query, params);
    } finally {
      client.release();
    }
  }

  private async calculateETA(driverId: string, currentLocation: GeoPoint): Promise<ETACalculation | undefined> {
    // This is a placeholder for ETA calculation
    // In production, this would integrate with routing services and historical data
    
    // Get driver's current job/destination
    const destination = await this.getDriverDestination(driverId);
    if (!destination) return undefined;
    
    const distance = this.calculateDistance(currentLocation, destination);
    const historicalSpeed = await this.getHistoricalAverageSpeed(driverId);
    
    const estimatedDurationMinutes = Math.ceil(distance / (historicalSpeed * 60)); // Convert m/s to m/min
    const estimatedArrivalTime = new Date(Date.now() + estimatedDurationMinutes * 60 * 1000);
    
    return {
      driverId,
      destinationLocation: destination,
      estimatedArrivalTime,
      estimatedDurationMinutes,
      distanceKm: distance / 1000,
      confidence: 0.8, // Would be calculated based on historical accuracy
      factors: {
        traffic: 1.0,
        driverBehavior: 1.0,
        timeOfDay: 1.0
      },
      calculatedAt: new Date()
    };
  }

  private async getDriverDestination(driverId: string): Promise<GeoPoint | null> {
    // Placeholder - would get from current job/route
    return null;
  }

  private async getHistoricalAverageSpeed(driverId: string): Promise<number> {
    // Placeholder - would calculate from historical data
    return 15; // 15 m/s default
  }

  private async updateBatchMetadata(batch: LocationBatch, results: LocationProcessingResult[]): Promise<void> {
    // Store batch processing metadata for analytics
    const successCount = results.filter(r => r.locationUpdate).length;
    const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTimeMs, 0) / results.length;
    
    await trackingRedis.hset(
      `batch:${batch.batchId}`,
      'processed_at', Date.now().toString(),
      'success_count', successCount.toString(),
      'total_count', batch.locations.length.toString(),
      'avg_processing_time', avgProcessingTime.toString()
    );
    
    // Expire batch metadata after 24 hours
    await trackingRedis.expire(`batch:${batch.batchId}`, 86400);
  }
}

export const driverLocationService = new DriverLocationService();