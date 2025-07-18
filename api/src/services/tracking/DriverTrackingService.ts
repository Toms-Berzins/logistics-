import { DriverLocationCache } from '../cache/DriverLocationCache';
import { databaseConfig } from '../../config/database';
import { IDriverLocation, ILocationUpdate, IGeofenceEvent, GeoPoint, LocationMetadata, ProximityQuery } from '../../types/spatial.types';
import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

export class DriverTrackingService extends EventEmitter {
  private locationCache: DriverLocationCache;
  private performanceMetrics: Map<string, number> = new Map();

  constructor(locationCache: DriverLocationCache) {
    super();
    this.locationCache = locationCache;
    this.setupPerformanceTracking();
  }

  /**
   * Update driver location with geofence checking and broadcasting
   */
  async updateLocation(driverId: string, location: GeoPoint, metadata: LocationMetadata): Promise<void> {
    const startTime = performance.now();

    try {
      // Get previous location for distance/speed calculations
      const previousLocation = (await this.locationCache.getDriverLocation(driverId)) || undefined;

      // Calculate distance traveled and time elapsed
      const distanceTraveled = previousLocation ?
        this.calculateDistance(previousLocation.location, location) : 0;
      const timeSinceLastUpdate = previousLocation ?
        Date.now() - previousLocation.lastSeen.getTime() : 0;

      // Get driver's company ID from database
      const companyId = await this.getDriverCompanyId(driverId);
      if (!companyId) {
        throw new Error(`Driver ${driverId} not found`);
      }

      // Detect current zone using PostGIS
      const currentZoneId = (await this.detectCurrentZone(location, companyId)) || undefined;

      // Check for geofence events
      const geofenceEvents = await this.checkGeofenceEvents(
        driverId,
        location,
        previousLocation?.location,
        currentZoneId,
        previousLocation?.currentZoneId
      );

      // Create updated driver location
      const updatedLocation: IDriverLocation = {
        driverId,
        companyId,
        location,
        metadata,
        isOnline: true,
        lastSeen: new Date(),
        currentZoneId,
        currentJobId: previousLocation?.currentJobId,
        status: this.determineDriverStatus(metadata, previousLocation)
      };

      // Store in database for persistence
      await this.storeLocationInDatabase(updatedLocation);

      // Update cache for real-time access
      await this.locationCache.updateDriverLocation(updatedLocation);

      // Create location update event
      const locationUpdate: ILocationUpdate = {
        driverId,
        location,
        metadata,
        previousLocation: previousLocation?.location,
        distanceTraveled,
        timeSinceLastUpdate
      };

      // Emit events for real-time broadcasting
      this.emit('location:update', locationUpdate);

      // Emit geofence events
      for (const geofenceEvent of geofenceEvents) {
        this.emit(`geofence:${geofenceEvent.eventType}`, geofenceEvent);
      }

      // Track performance metrics
      const processingTime = performance.now() - startTime;
      this.trackPerformanceMetric('location_update_time', processingTime);

      // Log performance warning if slow
      if (processingTime > 100) {
        console.warn(`Slow location update: ${processingTime}ms for driver ${driverId}`);
      }

    } catch (error) {
      console.error(`Error updating location for driver ${driverId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('error', { driverId, error: errorMessage });
      throw error;
    }
  }

  /**
   * Batch update multiple locations for efficiency
   */
  async batchUpdateLocations(updates: Array<{
    driverId: string;
    location: GeoPoint;
    metadata: LocationMetadata;
  }>): Promise<void> {
    const startTime = performance.now();

    try {
      const promises = updates.map(update =>
        this.updateLocation(update.driverId, update.location, update.metadata)
      );

      await Promise.all(promises);

      const processingTime = performance.now() - startTime;
      this.trackPerformanceMetric('batch_update_time', processingTime);

    } catch (error) {
      console.error('Error in batch location update:', error);
      throw error;
    }
  }

  /**
   * Set driver online status
   */
  async setDriverOnline(driverId: string, location: GeoPoint, metadata: LocationMetadata): Promise<void> {
    try {
      await this.updateLocation(driverId, location, metadata);
      this.emit('driver:online', { driverId, location, timestamp: new Date() });
    } catch (error) {
      console.error(`Error setting driver online: ${error}`);
      throw error;
    }
  }

  /**
   * Set driver offline status
   */
  async setDriverOffline(driverId: string): Promise<void> {
    try {
      const driverLocation = await this.locationCache.getDriverLocation(driverId);
      if (!driverLocation) {
        return;
      }

      // Update status in database
      await this.updateDriverStatus(driverId, 'offline');

      // Remove from cache
      await this.locationCache.removeDriver(driverId, driverLocation.companyId);

      this.emit('driver:offline', { driverId, timestamp: new Date() });
    } catch (error) {
      console.error(`Error setting driver offline: ${error}`);
      throw error;
    }
  }

  /**
   * Get driver's current location
   */
  async getDriverLocation(driverId: string): Promise<IDriverLocation | null> {
    try {
      return await this.locationCache.getDriverLocation(driverId);
    } catch (error) {
      console.error(`Error getting driver location: ${error}`);
      return null;
    }
  }

  /**
   * Find drivers near a location
   */
  async findNearbyDrivers(companyId: string, query: ProximityQuery): Promise<IDriverLocation[]> {
    try {
      return await this.locationCache.findDriversNearby(companyId, query);
    } catch (error) {
      console.error(`Error finding nearby drivers: ${error}`);
      return [];
    }
  }

  /**
   * Get all drivers in a zone
   */
  async getDriversInZone(zoneId: string): Promise<IDriverLocation[]> {
    try {
      const driverIds = await this.locationCache.getDriversInZone(zoneId);
      const drivers = await Promise.all(
        driverIds.map(driverId => this.locationCache.getDriverLocation(driverId))
      );
      return drivers.filter(driver => driver !== null) as IDriverLocation[];
    } catch (error) {
      console.error(`Error getting drivers in zone: ${error}`);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): Record<string, number> {
    return Object.fromEntries(this.performanceMetrics);
  }

  // Private helper methods

  private async getDriverCompanyId(driverId: string): Promise<string | null> {
    try {
      const client = await databaseConfig.connect();
      const result = await client.query(
        'SELECT company_id FROM drivers WHERE id = $1',
        [driverId]
      );
      client.release();

      return result.rows[0]?.company_id || null;
    } catch (error) {
      console.error(`Error getting driver company ID: ${error}`);
      return null;
    }
  }

  private async detectCurrentZone(location: GeoPoint, companyId: string): Promise<string | null> {
    try {
      const client = await databaseConfig.connect();
      const result = await client.query(`
        SELECT id FROM geofence_zones 
        WHERE company_id = $1 
        AND is_active = true
        AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326))
        ORDER BY priority DESC
        LIMIT 1
      `, [companyId, location.longitude, location.latitude]);

      client.release();
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error(`Error detecting current zone: ${error}`);
      return null;
    }
  }

  private async checkGeofenceEvents(
    driverId: string,
    currentLocation: GeoPoint,
    previousLocation?: GeoPoint,
    currentZoneId?: string,
    previousZoneId?: string
  ): Promise<IGeofenceEvent[]> {
    const events: IGeofenceEvent[] = [];

    try {
      // Zone entry event
      if (currentZoneId && currentZoneId !== previousZoneId) {
        const entryEvent: IGeofenceEvent = {
          id: `${driverId}_${currentZoneId}_entry_${Date.now()}`,
          driverId,
          zoneId: currentZoneId,
          eventType: 'enter',
          location: currentLocation,
          timestamp: new Date(),
          metadata: {
            previousZoneId,
            entrySpeed: this.calculateSpeed(previousLocation, currentLocation)
          }
        };
        events.push(entryEvent);
      }

      // Zone exit event
      if (previousZoneId && previousZoneId !== currentZoneId) {
        const exitEvent: IGeofenceEvent = {
          id: `${driverId}_${previousZoneId}_exit_${Date.now()}`,
          driverId,
          zoneId: previousZoneId,
          eventType: 'exit',
          location: currentLocation,
          timestamp: new Date(),
          metadata: {
            exitSpeed: this.calculateSpeed(previousLocation, currentLocation)
          }
        };
        events.push(exitEvent);
      }

      // Store events in database
      if (events.length > 0) {
        await this.storeGeofenceEvents(events);
      }

      return events;
    } catch (error) {
      console.error(`Error checking geofence events: ${error}`);
      return [];
    }
  }

  private async storeLocationInDatabase(location: IDriverLocation): Promise<void> {
    try {
      const client = await databaseConfig.connect();
      await client.query(`
        INSERT INTO driver_locations (
          driver_id, company_id, location, accuracy, heading, speed, 
          battery_level, timestamp, provider, satellites, hdop, pdop,
          is_online, current_zone_id, status
        ) VALUES (
          $1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, 
          $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
        ON CONFLICT (driver_id) DO UPDATE SET
          location = EXCLUDED.location,
          accuracy = EXCLUDED.accuracy,
          heading = EXCLUDED.heading,
          speed = EXCLUDED.speed,
          battery_level = EXCLUDED.battery_level,
          timestamp = EXCLUDED.timestamp,
          provider = EXCLUDED.provider,
          satellites = EXCLUDED.satellites,
          hdop = EXCLUDED.hdop,
          pdop = EXCLUDED.pdop,
          is_online = EXCLUDED.is_online,
          current_zone_id = EXCLUDED.current_zone_id,
          status = EXCLUDED.status,
          updated_at = NOW()
      `, [
        location.driverId,
        location.companyId,
        location.location.longitude,
        location.location.latitude,
        location.metadata.accuracy,
        location.metadata.heading,
        location.metadata.speed,
        location.metadata.batteryLevel,
        location.metadata.timestamp,
        location.metadata.provider,
        location.metadata.satellites,
        location.metadata.hdop,
        location.metadata.pdop,
        location.isOnline,
        location.currentZoneId,
        location.status
      ]);
      client.release();
    } catch (error) {
      console.error(`Error storing location in database: ${error}`);
      throw error;
    }
  }

  private async storeGeofenceEvents(events: IGeofenceEvent[]): Promise<void> {
    try {
      const client = await databaseConfig.connect();

      for (const event of events) {
        await client.query(`
          INSERT INTO geofence_events (
            id, driver_id, zone_id, event_type, location, timestamp, metadata
          ) VALUES (
            $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326), $7, $8
          )
        `, [
          event.id,
          event.driverId,
          event.zoneId,
          event.eventType,
          event.location.longitude,
          event.location.latitude,
          event.timestamp,
          JSON.stringify(event.metadata)
        ]);
      }

      client.release();
    } catch (error) {
      console.error(`Error storing geofence events: ${error}`);
      throw error;
    }
  }

  private async updateDriverStatus(driverId: string, status: string): Promise<void> {
    try {
      const client = await databaseConfig.connect();
      await client.query(
        'UPDATE driver_locations SET status = $1, updated_at = NOW() WHERE driver_id = $2',
        [status, driverId]
      );
      client.release();
    } catch (error) {
      console.error(`Error updating driver status: ${error}`);
      throw error;
    }
  }

  private calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = point1.latitude * Math.PI / 180;
    const φ2 = point2.latitude * Math.PI / 180;
    const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
    const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private calculateSpeed(previousLocation?: GeoPoint, currentLocation?: GeoPoint): number | undefined {
    if (!previousLocation || !currentLocation) return undefined;

    const distance = this.calculateDistance(previousLocation, currentLocation);
    const timeDiff = 1; // Assuming 1 second for demo, should use actual timestamp diff

    return distance / timeDiff; // meters per second
  }

  private determineDriverStatus(metadata: LocationMetadata, previousLocation?: IDriverLocation): 'available' | 'busy' | 'offline' | 'break' {
    if (!metadata.speed || metadata.speed < 0.5) {
      return 'available'; // Stationary or very slow
    }

    if (previousLocation?.currentJobId) {
      return 'busy'; // Has active job
    }

    return 'available';
  }

  private setupPerformanceTracking(): void {
    setInterval(() => {
      this.performanceMetrics.clear();
    }, 60000); // Clear metrics every minute
  }

  private trackPerformanceMetric(name: string, value: number): void {
    const current = this.performanceMetrics.get(name) || 0;
    this.performanceMetrics.set(name, current + value);
  }
}
