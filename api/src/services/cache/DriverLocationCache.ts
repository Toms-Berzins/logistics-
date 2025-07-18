import { redisClient } from '../../config/redis';
import { IDriverLocation, ProximityQuery } from '../../types/spatial.types';
import { performance } from 'perf_hooks';

export class DriverLocationCache {
  private redis: typeof redisClient;
  private readonly LOCATION_TTL = 60; // 60 seconds
  private readonly GEOSPATIAL_KEY_PREFIX = 'drivers:location:';
  private readonly DRIVER_DATA_KEY_PREFIX = 'driver:data:';
  private readonly ZONE_DRIVERS_KEY_PREFIX = 'zone:drivers:';
  private readonly PERFORMANCE_KEY = 'location:performance';

  constructor() {
    this.redis = redisClient;
  }

  /**
   * Update driver location in Redis with geospatial indexing
   */
  async updateDriverLocation(driverLocation: IDriverLocation): Promise<void> {
    const startTime = performance.now();

    try {
      const pipeline = this.redis.multi();
      const { driverId, companyId, location, metadata, isOnline, lastSeen, currentZoneId, status } = driverLocation;

      // Store in geospatial index for proximity queries
      const geoKey = `${this.GEOSPATIAL_KEY_PREFIX}${companyId}`;
      pipeline.geoAdd(geoKey, { member: driverId, longitude: location.longitude, latitude: location.latitude });
      pipeline.expire(geoKey, this.LOCATION_TTL);

      // Store detailed driver data
      const driverDataKey = `${this.DRIVER_DATA_KEY_PREFIX}${driverId}`;
      const driverData = {
        driverId,
        companyId,
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        altitude: location.altitude?.toString() || '0',
        accuracy: metadata.accuracy.toString(),
        heading: metadata.heading?.toString() || '0',
        speed: metadata.speed?.toString() || '0',
        batteryLevel: metadata.batteryLevel?.toString() || '100',
        timestamp: metadata.timestamp.toISOString(),
        provider: metadata.provider,
        satellites: metadata.satellites?.toString() || '0',
        hdop: metadata.hdop?.toString() || '0',
        pdop: metadata.pdop?.toString() || '0',
        isOnline: isOnline.toString(),
        lastSeen: lastSeen.toISOString(),
        currentZoneId: currentZoneId || '',
        status
      };

      pipeline.hSet(driverDataKey, driverData);
      pipeline.expire(driverDataKey, this.LOCATION_TTL);

      // Update zone membership if driver is in a zone
      if (currentZoneId) {
        const zoneDriversKey = `${this.ZONE_DRIVERS_KEY_PREFIX}${currentZoneId}`;
        pipeline.sAdd(zoneDriversKey, driverId);
        pipeline.expire(zoneDriversKey, this.LOCATION_TTL);
      }

      // Track performance metrics
      const processingTime = performance.now() - startTime;
      pipeline.lPush(this.PERFORMANCE_KEY, JSON.stringify({
        type: 'location_update',
        processingTime,
        timestamp: new Date().toISOString()
      }));
      pipeline.lTrim(this.PERFORMANCE_KEY, 0, 999); // Keep last 1000 entries

      await pipeline.exec();

    } catch (error) {
      console.error(`Error updating driver location in cache: ${error}`);
      throw error;
    }
  }

  /**
   * Get driver location from cache
   */
  async getDriverLocation(driverId: string): Promise<IDriverLocation | null> {
    try {
      const driverDataKey = `${this.DRIVER_DATA_KEY_PREFIX}${driverId}`;
      const driverData = await this.redis.hGetAll(driverDataKey);

      if (!driverData || !driverData.driverId) {
        return null;
      }

      return {
        driverId: driverData.driverId,
        companyId: driverData.companyId,
        location: {
          latitude: parseFloat(driverData.latitude),
          longitude: parseFloat(driverData.longitude),
          altitude: driverData.altitude ? parseFloat(driverData.altitude) : undefined
        },
        metadata: {
          accuracy: parseFloat(driverData.accuracy),
          heading: driverData.heading ? parseFloat(driverData.heading) : undefined,
          speed: driverData.speed ? parseFloat(driverData.speed) : undefined,
          batteryLevel: driverData.batteryLevel ? parseInt(driverData.batteryLevel) : undefined,
          timestamp: new Date(driverData.timestamp),
          provider: driverData.provider as 'GPS' | 'NETWORK' | 'PASSIVE',
          satellites: driverData.satellites ? parseInt(driverData.satellites) : undefined,
          hdop: driverData.hdop ? parseFloat(driverData.hdop) : undefined,
          pdop: driverData.pdop ? parseFloat(driverData.pdop) : undefined
        },
        isOnline: driverData.isOnline === 'true',
        lastSeen: new Date(driverData.lastSeen),
        currentZoneId: driverData.currentZoneId || undefined,
        status: driverData.status as 'available' | 'busy' | 'offline' | 'break'
      };

    } catch (error) {
      console.error(`Error getting driver location from cache: ${error}`);
      return null;
    }
  }

  /**
   * Find drivers within radius using Redis GEORADIUS
   */
  async findDriversNearby(companyId: string, query: ProximityQuery): Promise<IDriverLocation[]> {
    try {
      const geoKey = `${this.GEOSPATIAL_KEY_PREFIX}${companyId}`;
      const { center, radiusMeters, limit = 50, unit = 'm' } = query;

      // Use GEORADIUS to find nearby drivers
      const nearbyDriverIds = await this.redis.geoRadius(
        geoKey,
        { longitude: center.longitude, latitude: center.latitude },
        radiusMeters,
        unit
      );

      if (!nearbyDriverIds || nearbyDriverIds.length === 0) {
        return [];
      }

      // Get detailed information for each nearby driver
      const pipeline = this.redis.multi();
      const driverIds: string[] = [];

      for (const item of nearbyDriverIds) {
        if (Array.isArray(item) && item.length >= 1) {
          const driverId = item[0];
          driverIds.push(driverId);
          pipeline.hGetAll(`${this.DRIVER_DATA_KEY_PREFIX}${driverId}`);
        }
      }

      const results = await pipeline.exec();
      const drivers: IDriverLocation[] = [];

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result && Array.isArray(result) && result[1]) {
          const driverData = result[1] as unknown as Record<string, string>;
          // const _nearbyData = nearbyDriverIds[i] as unknown[];

          if (driverData.driverId) {
            drivers.push({
              driverId: driverData.driverId,
              companyId: driverData.companyId,
              location: {
                latitude: parseFloat(driverData.latitude),
                longitude: parseFloat(driverData.longitude),
                altitude: driverData.altitude ? parseFloat(driverData.altitude) : undefined
              },
              metadata: {
                accuracy: parseFloat(driverData.accuracy),
                heading: driverData.heading ? parseFloat(driverData.heading) : undefined,
                speed: driverData.speed ? parseFloat(driverData.speed) : undefined,
                batteryLevel: driverData.batteryLevel ? parseInt(driverData.batteryLevel) : undefined,
                timestamp: new Date(driverData.timestamp),
                provider: driverData.provider as 'GPS' | 'NETWORK' | 'PASSIVE',
                satellites: driverData.satellites ? parseInt(driverData.satellites) : undefined,
                hdop: driverData.hdop ? parseFloat(driverData.hdop) : undefined,
                pdop: driverData.pdop ? parseFloat(driverData.pdop) : undefined
              },
              isOnline: driverData.isOnline === 'true',
              lastSeen: new Date(driverData.lastSeen),
              currentZoneId: driverData.currentZoneId || undefined,
              status: driverData.status as 'available' | 'busy' | 'offline' | 'break'
            });
          }
        }
      }

      return drivers;

    } catch (error) {
      console.error(`Error finding nearby drivers: ${error}`);
      return [];
    }
  }

  /**
   * Get all drivers in a specific zone
   */
  async getDriversInZone(zoneId: string): Promise<string[]> {
    try {
      const zoneDriversKey = `${this.ZONE_DRIVERS_KEY_PREFIX}${zoneId}`;
      const driverIds = await this.redis.sMembers(zoneDriversKey);
      return driverIds;
    } catch (error) {
      console.error(`Error getting drivers in zone: ${error}`);
      return [];
    }
  }

  /**
   * Remove driver from cache (when offline)
   */
  async removeDriver(driverId: string, companyId: string): Promise<void> {
    try {
      const pipeline = this.redis.multi();

      // Remove from geospatial index
      const geoKey = `${this.GEOSPATIAL_KEY_PREFIX}${companyId}`;
      pipeline.zRem(geoKey, driverId);

      // Remove driver data
      const driverDataKey = `${this.DRIVER_DATA_KEY_PREFIX}${driverId}`;
      pipeline.del(driverDataKey);

      // Remove from all zone memberships
      const keys = await this.redis.keys(`${this.ZONE_DRIVERS_KEY_PREFIX}*`);
      for (const key of keys) {
        pipeline.sRem(key, driverId);
      }

      await pipeline.exec();
    } catch (error) {
      console.error(`Error removing driver from cache: ${error}`);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<unknown[]> {
    try {
      const metrics = await this.redis.lRange(this.PERFORMANCE_KEY, 0, 99);
      return metrics.map((metric: string) => JSON.parse(metric));
    } catch (error) {
      console.error(`Error getting performance metrics: ${error}`);
      return [];
    }
  }

  /**
   * Clear all location data for a company
   */
  async clearCompanyLocations(companyId: string): Promise<void> {
    try {
      const geoKey = `${this.GEOSPATIAL_KEY_PREFIX}${companyId}`;
      await this.redis.del(geoKey);
    } catch (error) {
      console.error(`Error clearing company locations: ${error}`);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalDrivers: number;
    activeCompanies: number;
    totalZones: number;
    memoryUsage: number;
  }> {
    try {
      const driverKeys = await this.redis.keys(`${this.DRIVER_DATA_KEY_PREFIX}*`);
      const companyKeys = await this.redis.keys(`${this.GEOSPATIAL_KEY_PREFIX}*`);
      const zoneKeys = await this.redis.keys(`${this.ZONE_DRIVERS_KEY_PREFIX}*`);

      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return {
        totalDrivers: driverKeys.length,
        activeCompanies: companyKeys.length,
        totalZones: zoneKeys.length,
        memoryUsage
      };
    } catch (error) {
      console.error(`Error getting cache stats: ${error}`);
      return {
        totalDrivers: 0,
        activeCompanies: 0,
        totalZones: 0,
        memoryUsage: 0
      };
    }
  }
}
