import { databaseConfig } from '../config/database';
import trackingRedis, { REDIS_KEYS, TTL } from '../config/redisTracking';

export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  timestamp: Date;
  companyId: string;
}

export interface NearbyDriversQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  companyId?: string;
  limit?: number;
  excludeDriverIds?: string[];
}

export interface DriverStatus {
  driverId: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentJobId?: string;
  lastLocationUpdate: Date;
  batteryLevel?: number;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
}

export class DriverTrackingService {

  /**
   * Update driver location in both Redis cache and PostGIS database
   */
  async updateDriverLocation(location: DriverLocation): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate location data
      this.validateLocation(location);

      // Prepare Redis data structure
      const redisData = {
        lat: location.latitude.toString(),
        lng: location.longitude.toString(),
        accuracy: location.accuracy?.toString() || '0',
        speed: location.speed?.toString() || '0',
        heading: location.heading?.toString() || '0',
        altitude: location.altitude?.toString() || '0',
        timestamp: location.timestamp.toISOString(),
        companyId: location.companyId,
        lastUpdate: Date.now().toString()
      };

      // Use Redis pipeline for atomic operations
      const pipeline = trackingRedis.pipeline();

      // Store in Redis with TTL
      pipeline.hmset(REDIS_KEYS.DRIVER_LOCATION(location.driverId), redisData);
      pipeline.expire(REDIS_KEYS.DRIVER_LOCATION(location.driverId), TTL.DRIVER_LOCATION);

      // Add to active drivers set
      pipeline.sadd(REDIS_KEYS.ACTIVE_DRIVERS, location.driverId);
      pipeline.expire(REDIS_KEYS.ACTIVE_DRIVERS, TTL.DRIVER_LOCATION);

      // Add to company drivers set
      pipeline.sadd(REDIS_KEYS.COMPANY_DRIVERS(location.companyId), location.driverId);

      // Execute Redis operations
      await pipeline.exec();

      // Asynchronously update PostGIS database
      this.updateDatabaseLocation(location).catch(err => {
        console.error('Failed to update database location:', err);
      });

      // Clear nearby cache for this area
      this.invalidateNearbyCache(location.latitude, location.longitude);

      const processingTime = Date.now() - startTime;
      if (processingTime > 50) {
        console.warn(`Slow location update: ${processingTime}ms for driver ${location.driverId}`);
      }

    } catch (error) {
      console.error('Error updating driver location:', error);
      throw new Error('Failed to update driver location');
    }
  }

  /**
   * Get driver's current location from Redis (fast) or database (fallback)
   */
  async getDriverLocation(driverId: string): Promise<DriverLocation | null> {
    try {
      // Try Redis first
      const redisData = await trackingRedis.hgetall(REDIS_KEYS.DRIVER_LOCATION(driverId));

      if (redisData && redisData.lat && redisData.lng) {
        return {
          driverId,
          latitude: parseFloat(redisData.lat),
          longitude: parseFloat(redisData.lng),
          accuracy: redisData.accuracy ? parseFloat(redisData.accuracy) : undefined,
          speed: redisData.speed ? parseFloat(redisData.speed) : undefined,
          heading: redisData.heading ? parseFloat(redisData.heading) : undefined,
          altitude: redisData.altitude ? parseFloat(redisData.altitude) : undefined,
          timestamp: new Date(redisData.timestamp),
          companyId: redisData.companyId
        };
      }

      // Fallback to database
      return await this.getDatabaseLocation(driverId);

    } catch (error) {
      console.error('Error getting driver location:', error);
      return null;
    }
  }

  /**
   * Find nearby drivers using PostGIS spatial queries with Redis caching
   */
  async getNearbyDrivers(query: NearbyDriversQuery): Promise<DriverLocation[]> {
    const { latitude, longitude, radiusKm, companyId, limit = 50, excludeDriverIds = [] } = query;

    try {
      // Check cache first
      const cacheKey = REDIS_KEYS.NEARBY_DRIVERS(latitude, longitude, radiusKm);
      const cached = await trackingRedis.get(cacheKey);

      if (cached) {
        const results: DriverLocation[] = JSON.parse(cached);
        return this.filterNearbyResults(results, { companyId, limit, excludeDriverIds });
      }

      // Query database with PostGIS
      const client = await databaseConfig.connect();

      try {
        let query = `
          SELECT 
            d.id as driver_id,
            d.company_id,
            ST_X(dl.location) as longitude,
            ST_Y(dl.location) as latitude,
            dl.accuracy,
            dl.speed,
            dl.heading,
            dl.altitude,
            dl.recorded_at as timestamp,
            ST_Distance(
              dl.location::geography,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
            ) as distance_meters
          FROM driver_locations dl
          JOIN drivers d ON d.id = dl.driver_id
          WHERE dl.recorded_at > NOW() - INTERVAL '10 minutes'
            AND ST_DWithin(
              dl.location::geography,
              ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
              $3
            )
        `;

        const params: any[] = [longitude, latitude, radiusKm * 1000]; // Convert km to meters
        let paramIndex = 4;

        if (companyId) {
          query += ` AND d.company_id = $${paramIndex}`;
          params.push(companyId);
          paramIndex++;
        }

        if (excludeDriverIds.length > 0) {
          query += ` AND d.id NOT IN (${excludeDriverIds.map((_, i) => `$${paramIndex + i}`).join(',')})`;
          params.push(...excludeDriverIds);
        }

        query += `
          ORDER BY distance_meters ASC
          LIMIT $${params.length + 1}
        `;
        params.push(limit);

        const result = await client.query(query, params);

        const drivers: DriverLocation[] = result.rows.map(row => ({
          driverId: row.driver_id,
          latitude: row.latitude,
          longitude: row.longitude,
          accuracy: row.accuracy,
          speed: row.speed,
          heading: row.heading,
          altitude: row.altitude,
          timestamp: new Date(row.timestamp),
          companyId: row.company_id
        }));

        // Cache results for 30 seconds
        await trackingRedis.setex(cacheKey, TTL.NEARBY_CACHE, JSON.stringify(drivers));

        return drivers;

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error finding nearby drivers:', error);
      throw new Error('Failed to find nearby drivers');
    }
  }

  /**
   * Update driver status (online/offline, available, etc.)
   */
  async updateDriverStatus(status: DriverStatus): Promise<void> {
    const redisData = {
      isOnline: status.isOnline.toString(),
      isAvailable: status.isAvailable.toString(),
      currentJobId: status.currentJobId || '',
      lastLocationUpdate: status.lastLocationUpdate.toISOString(),
      batteryLevel: status.batteryLevel?.toString() || '',
      connectionQuality: status.connectionQuality || 'good',
      updatedAt: Date.now().toString()
    };

    await trackingRedis.hmset(REDIS_KEYS.DRIVER_STATUS(status.driverId), redisData);
    await trackingRedis.expire(REDIS_KEYS.DRIVER_STATUS(status.driverId), TTL.DRIVER_STATUS);

    if (!status.isOnline) {
      // Remove from active drivers set
      await trackingRedis.srem(REDIS_KEYS.ACTIVE_DRIVERS, status.driverId);
    }
  }

  /**
   * Get all active drivers for a company
   */
  async getActiveDrivers(companyId: string): Promise<string[]> {
    const driverIds = await trackingRedis.smembers(REDIS_KEYS.COMPANY_DRIVERS(companyId));

    // Filter to only include drivers with recent location updates
    const activeDrivers: string[] = [];
    const pipeline = trackingRedis.pipeline();

    driverIds.forEach(driverId => {
      pipeline.hget(REDIS_KEYS.DRIVER_LOCATION(driverId), 'timestamp');
    });

    const results = await pipeline.exec();
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

    results?.forEach((result, index) => {
      if (result && result[1]) {
        const timestamp = new Date(result[1] as string).getTime();
        if (timestamp > fiveMinutesAgo) {
          activeDrivers.push(driverIds[index]);
        }
      }
    });

    return activeDrivers;
  }

  /**
   * Batch update multiple driver locations (for mobile apps with poor connectivity)
   */
  async batchUpdateLocations(locations: DriverLocation[]): Promise<void> {
    if (locations.length === 0) return;

    const pipeline = trackingRedis.pipeline();

    // Process all locations in batch
    for (const location of locations) {
      try {
        this.validateLocation(location);

        const redisData = {
          lat: location.latitude.toString(),
          lng: location.longitude.toString(),
          accuracy: location.accuracy?.toString() || '0',
          speed: location.speed?.toString() || '0',
          heading: location.heading?.toString() || '0',
          altitude: location.altitude?.toString() || '0',
          timestamp: location.timestamp.toISOString(),
          companyId: location.companyId,
          lastUpdate: Date.now().toString()
        };

        pipeline.hmset(REDIS_KEYS.DRIVER_LOCATION(location.driverId), redisData);
        pipeline.expire(REDIS_KEYS.DRIVER_LOCATION(location.driverId), TTL.DRIVER_LOCATION);
        pipeline.sadd(REDIS_KEYS.ACTIVE_DRIVERS, location.driverId);
        pipeline.sadd(REDIS_KEYS.COMPANY_DRIVERS(location.companyId), location.driverId);

      } catch (error) {
        console.error(`Invalid location data for driver ${location.driverId}:`, error);
      }
    }

    // Execute all Redis operations
    await pipeline.exec();

    // Asynchronously update database
    this.batchUpdateDatabase(locations).catch(err => {
      console.error('Failed to batch update database:', err);
    });
  }

  // Private helper methods

  private validateLocation(location: DriverLocation): void {
    if (!location.driverId || !location.companyId) {
      throw new Error('Driver ID and Company ID are required');
    }

    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }

    if (location.latitude < -90 || location.latitude > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }

    if (location.longitude < -180 || location.longitude > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }

    if (location.accuracy && (location.accuracy < 0 || location.accuracy > 10000)) {
      throw new Error('Accuracy must be between 0 and 10000 meters');
    }
  }

  private async updateDatabaseLocation(location: DriverLocation): Promise<void> {
    const client = await databaseConfig.connect();

    try {
      await client.query(`
        INSERT INTO driver_locations (
          driver_id, location, accuracy, speed, heading, altitude, recorded_at
        ) VALUES (
          $1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8
        )
      `, [
        location.driverId,
        location.longitude,
        location.latitude,
        location.accuracy,
        location.speed,
        location.heading,
        location.altitude,
        location.timestamp
      ]);

      // Update driver's current location
      await client.query(`
        UPDATE drivers 
        SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326), 
            updated_at = NOW()
        WHERE id = $3
      `, [location.longitude, location.latitude, location.driverId]);

    } finally {
      client.release();
    }
  }

  private async getDatabaseLocation(driverId: string): Promise<DriverLocation | null> {
    const client = await databaseConfig.connect();

    try {
      const result = await client.query(`
        SELECT 
          dl.driver_id,
          d.company_id,
          ST_X(dl.location) as longitude,
          ST_Y(dl.location) as latitude,
          dl.accuracy,
          dl.speed,
          dl.heading,
          dl.altitude,
          dl.recorded_at as timestamp
        FROM driver_locations dl
        JOIN drivers d ON d.id = dl.driver_id
        WHERE dl.driver_id = $1
        ORDER BY dl.recorded_at DESC
        LIMIT 1
      `, [driverId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        driverId: row.driver_id,
        latitude: row.latitude,
        longitude: row.longitude,
        accuracy: row.accuracy,
        speed: row.speed,
        heading: row.heading,
        altitude: row.altitude,
        timestamp: new Date(row.timestamp),
        companyId: row.company_id
      };

    } finally {
      client.release();
    }
  }

  private async batchUpdateDatabase(locations: DriverLocation[]): Promise<void> {
    if (locations.length === 0) return;

    const client = await databaseConfig.connect();

    try {
      await client.query('BEGIN');

      for (const location of locations) {
        await client.query(`
          INSERT INTO driver_locations (
            driver_id, location, accuracy, speed, heading, altitude, recorded_at
          ) VALUES (
            $1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4, $5, $6, $7, $8
          )
        `, [
          location.driverId,
          location.longitude,
          location.latitude,
          location.accuracy,
          location.speed,
          location.heading,
          location.altitude,
          location.timestamp
        ]);
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private filterNearbyResults(
    results: DriverLocation[],
    filters: { companyId?: string; limit: number; excludeDriverIds: string[] }
  ): DriverLocation[] {
    let filtered = results;

    if (filters.companyId) {
      filtered = filtered.filter(d => d.companyId === filters.companyId);
    }

    if (filters.excludeDriverIds.length > 0) {
      filtered = filtered.filter(d => !filters.excludeDriverIds.includes(d.driverId));
    }

    return filtered.slice(0, filters.limit);
  }

  private invalidateNearbyCache(lat: number, lng: number): void {
    // Clear cache in a 10km radius around the location
    const radiuses = [1, 2, 5, 10, 20];
    const latOffsets = [-0.1, -0.05, 0, 0.05, 0.1];
    const lngOffsets = [-0.1, -0.05, 0, 0.05, 0.1];

    const pipeline = trackingRedis.pipeline();

    radiuses.forEach(radius => {
      latOffsets.forEach(latOffset => {
        lngOffsets.forEach(lngOffset => {
          const cacheKey = REDIS_KEYS.NEARBY_DRIVERS(
            lat + latOffset,
            lng + lngOffset,
            radius
          );
          pipeline.del(cacheKey);
        });
      });
    });

    pipeline.exec().catch(err => {
      console.error('Error invalidating nearby cache:', err);
    });
  }
}

export const driverTrackingService = new DriverTrackingService();
