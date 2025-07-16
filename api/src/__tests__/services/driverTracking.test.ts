import { DriverTrackingService, DriverLocation, DriverStatus } from '../../services/driverTracking';
import trackingRedis, { REDIS_KEYS, TTL } from '../../config/redisTracking';
import { databaseConfig } from '../../config/database';

// Mock dependencies
jest.mock('../../config/redisTracking');
jest.mock('../../config/database');

const mockRedis = trackingRedis as jest.Mocked<typeof trackingRedis>;
const mockDatabase = databaseConfig as jest.Mocked<typeof databaseConfig>;

describe('DriverTrackingService', () => {
  let service: DriverTrackingService;
  let mockClient: any;

  beforeEach(() => {
    service = new DriverTrackingService();

    // Reset mocks
    jest.clearAllMocks();

    // Mock Redis pipeline
    const mockPipeline = {
      hmset: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      sadd: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    };
    mockRedis.pipeline = jest.fn().mockReturnValue(mockPipeline);
    mockRedis.hgetall = jest.fn();
    mockRedis.smembers = jest.fn();
    mockRedis.setex = jest.fn();

    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockDatabase.connect = jest.fn().mockResolvedValue(mockClient);
  });

  describe('updateDriverLocation', () => {
    const validLocation: DriverLocation = {
      driverId: 'driver-123',
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
      speed: 25,
      heading: 180,
      altitude: 100,
      timestamp: new Date('2024-01-01T12:00:00Z'),
      companyId: 'company-456'
    };

    it('should successfully update driver location in Redis', async () => {
      await service.updateDriverLocation(validLocation);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      const pipeline = mockRedis.pipeline();
      expect(pipeline.hmset).toHaveBeenCalledWith(
        REDIS_KEYS.DRIVER_LOCATION(validLocation.driverId),
        expect.objectContaining({
          lat: '40.7128',
          lng: '-74.006',
          accuracy: '10',
          speed: '25',
          heading: '180',
          altitude: '100',
          companyId: 'company-456'
        })
      );
      expect(pipeline.expire).toHaveBeenCalledWith(
        REDIS_KEYS.DRIVER_LOCATION(validLocation.driverId),
        TTL.DRIVER_LOCATION
      );
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('should validate location data', async () => {
      const invalidLocation = {
        ...validLocation,
        latitude: 100 // Invalid latitude
      };

      await expect(service.updateDriverLocation(invalidLocation))
        .rejects.toThrow('Latitude must be between -90 and 90');
    });

    it('should handle Redis errors gracefully', async () => {
      const mockPipeline = {
        hmset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        sadd: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis error'))
      };
      mockRedis.pipeline = jest.fn().mockReturnValue(mockPipeline);

      await expect(service.updateDriverLocation(validLocation))
        .rejects.toThrow('Failed to update driver location');
    });

    it('should handle missing required fields', async () => {
      const locationMissingDriverId = {
        ...validLocation,
        driverId: ''
      };

      await expect(service.updateDriverLocation(locationMissingDriverId))
        .rejects.toThrow('Driver ID and Company ID are required');
    });

    it('should validate coordinate ranges', async () => {
      const tests = [
        { latitude: -91, shouldFail: true, error: 'Latitude must be between -90 and 90' },
        { latitude: 91, shouldFail: true, error: 'Latitude must be between -90 and 90' },
        { longitude: -181, shouldFail: true, error: 'Longitude must be between -180 and 180' },
        { longitude: 181, shouldFail: true, error: 'Longitude must be between -180 and 180' },
        { accuracy: -1, shouldFail: true, error: 'Accuracy must be between 0 and 10000 meters' },
        { accuracy: 10001, shouldFail: true, error: 'Accuracy must be between 0 and 10000 meters' }
      ];

      for (const test of tests) {
        const testLocation = { ...validLocation, ...test };

        if (test.shouldFail) {
          await expect(service.updateDriverLocation(testLocation))
            .rejects.toThrow(test.error);
        }
      }
    });
  });

  describe('getDriverLocation', () => {
    it('should return location from Redis when available', async () => {
      const redisData = {
        lat: '40.7128',
        lng: '-74.006',
        accuracy: '10',
        speed: '25',
        heading: '180',
        altitude: '100',
        timestamp: '2024-01-01T12:00:00.000Z',
        companyId: 'company-456'
      };

      mockRedis.hgetall.mockResolvedValue(redisData);

      const result = await service.getDriverLocation('driver-123');

      expect(result).toEqual({
        driverId: 'driver-123',
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        speed: 25,
        heading: 180,
        altitude: 100,
        timestamp: new Date('2024-01-01T12:00:00.000Z'),
        companyId: 'company-456'
      });
    });

    it('should fallback to database when Redis has no data', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const dbResult = {
        rows: [{
          driver_id: 'driver-123',
          company_id: 'company-456',
          longitude: -74.006,
          latitude: 40.7128,
          accuracy: 10,
          speed: 25,
          heading: 180,
          altitude: 100,
          timestamp: new Date('2024-01-01T12:00:00Z')
        }]
      };
      mockClient.query.mockResolvedValue(dbResult);

      const result = await service.getDriverLocation('driver-123');

      expect(result).toBeTruthy();
      expect(result?.latitude).toBe(40.7128);
      expect(result?.longitude).toBe(-74.006);
    });

    it('should return null when no data found', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await service.getDriverLocation('driver-123');

      expect(result).toBeNull();
    });
  });

  describe('getNearbyDrivers', () => {
    it('should return cached results when available', async () => {
      const cachedDrivers = [
        {
          driverId: 'driver-1',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(),
          companyId: 'company-456'
        }
      ];

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedDrivers));

      const result = await service.getNearbyDrivers({
        latitude: 40.7128,
        longitude: -74.0060,
        radiusKm: 5,
        companyId: 'company-456'
      });

      expect(result).toEqual(cachedDrivers);
      expect(mockClient.query).not.toHaveBeenCalled();
    });

    it('should query database and cache results when no cache', async () => {
      mockRedis.get.mockResolvedValue(null);

      const dbResult = {
        rows: [{
          driver_id: 'driver-1',
          company_id: 'company-456',
          longitude: -74.006,
          latitude: 40.7128,
          accuracy: 10,
          speed: 25,
          heading: 180,
          altitude: 100,
          timestamp: new Date('2024-01-01T12:00:00Z'),
          distance_meters: 1000
        }]
      };
      mockClient.query.mockResolvedValue(dbResult);

      const result = await service.getNearbyDrivers({
        latitude: 40.7128,
        longitude: -74.0060,
        radiusKm: 5,
        companyId: 'company-456'
      });

      expect(result).toHaveLength(1);
      expect(result[0].driverId).toBe('driver-1');
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should handle spatial query parameters correctly', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockClient.query.mockResolvedValue({ rows: [] });

      await service.getNearbyDrivers({
        latitude: 40.7128,
        longitude: -74.0060,
        radiusKm: 5,
        companyId: 'company-456',
        limit: 10,
        excludeDriverIds: ['driver-exclude']
      });

      const queryCall = mockClient.query.mock.calls[0];
      const [query, params] = queryCall;

      expect(query).toContain('ST_DWithin');
      expect(query).toContain('ST_SetSRID');
      expect(params).toContain(-74.0060); // longitude
      expect(params).toContain(40.7128); // latitude
      expect(params).toContain(5000); // radius in meters
      expect(params).toContain('company-456');
      expect(params).toContain('driver-exclude');
      expect(params).toContain(10); // limit
    });
  });

  describe('updateDriverStatus', () => {
    const validStatus: DriverStatus = {
      driverId: 'driver-123',
      isOnline: true,
      isAvailable: true,
      currentJobId: 'job-456',
      lastLocationUpdate: new Date('2024-01-01T12:00:00Z'),
      batteryLevel: 85,
      connectionQuality: 'good'
    };

    it('should update driver status in Redis', async () => {
      await service.updateDriverStatus(validStatus);

      expect(mockRedis.hmset).toHaveBeenCalledWith(
        REDIS_KEYS.DRIVER_STATUS(validStatus.driverId),
        expect.objectContaining({
          isOnline: 'true',
          isAvailable: 'true',
          currentJobId: 'job-456',
          batteryLevel: '85',
          connectionQuality: 'good'
        })
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(
        REDIS_KEYS.DRIVER_STATUS(validStatus.driverId),
        TTL.DRIVER_STATUS
      );
    });

    it('should remove offline drivers from active set', async () => {
      const offlineStatus = { ...validStatus, isOnline: false };

      await service.updateDriverStatus(offlineStatus);

      expect(mockRedis.srem).toHaveBeenCalledWith(
        REDIS_KEYS.ACTIVE_DRIVERS,
        validStatus.driverId
      );
    });
  });

  describe('batchUpdateLocations', () => {
    it('should handle empty batch gracefully', async () => {
      await service.batchUpdateLocations([]);

      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should process multiple locations in batch', async () => {
      const locations: DriverLocation[] = [
        {
          driverId: 'driver-1',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(),
          companyId: 'company-456'
        },
        {
          driverId: 'driver-2',
          latitude: 40.7589,
          longitude: -73.9851,
          timestamp: new Date(),
          companyId: 'company-456'
        }
      ];

      await service.batchUpdateLocations(locations);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      const pipeline = mockRedis.pipeline();

      // Should have called hmset for each location
      expect(pipeline.hmset).toHaveBeenCalledTimes(2);
      expect(pipeline.expire).toHaveBeenCalledTimes(2);
      expect(pipeline.sadd).toHaveBeenCalledTimes(4); // 2 for active drivers, 2 for company drivers
    });

    it('should skip invalid locations in batch', async () => {
      const locations = [
        {
          driverId: 'driver-1',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(),
          companyId: 'company-456'
        },
        {
          driverId: '', // Invalid - missing driver ID
          latitude: 40.7589,
          longitude: -73.9851,
          timestamp: new Date(),
          companyId: 'company-456'
        }
      ];

      await service.batchUpdateLocations(locations);

      const pipeline = mockRedis.pipeline();
      // Should only process valid location
      expect(pipeline.hmset).toHaveBeenCalledTimes(1);
    });
  });

  describe('getActiveDrivers', () => {
    it('should return drivers with recent location updates', async () => {
      const driverIds = ['driver-1', 'driver-2', 'driver-3'];
      mockRedis.smembers.mockResolvedValue(driverIds);

      const mockPipeline = {
        hget: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, new Date(Date.now() - 2 * 60 * 1000).toISOString()], // 2 minutes ago - active
          [null, new Date(Date.now() - 10 * 60 * 1000).toISOString()], // 10 minutes ago - inactive
          [null, new Date().toISOString()] // now - active
        ])
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.getActiveDrivers('company-456');

      expect(result).toEqual(['driver-1', 'driver-3']);
    });

    it('should handle empty driver list', async () => {
      mockRedis.smembers.mockResolvedValue([]);

      const result = await service.getActiveDrivers('company-456');

      expect(result).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should complete location update within performance target', async () => {
      const location: DriverLocation = {
        driverId: 'driver-123',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(),
        companyId: 'company-456'
      };

      const startTime = Date.now();
      await service.updateDriverLocation(location);
      const endTime = Date.now();

      // Should complete within 100ms for performance target
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle concurrent location updates', async () => {
      const locations = Array.from({ length: 10 }, (_, i) => ({
        driverId: `driver-${i}`,
        latitude: 40.7128 + i * 0.001,
        longitude: -74.0060 + i * 0.001,
        timestamp: new Date(),
        companyId: 'company-456'
      }));

      const promises = locations.map(location => service.updateDriverLocation(location));

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle large batch updates efficiently', async () => {
      const locations = Array.from({ length: 100 }, (_, i) => ({
        driverId: `driver-${i}`,
        latitude: 40.7128 + i * 0.001,
        longitude: -74.0060 + i * 0.001,
        timestamp: new Date(),
        companyId: 'company-456'
      }));

      const startTime = Date.now();
      await service.batchUpdateLocations(locations);
      const endTime = Date.now();

      // Should handle 100 locations within reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection failures', async () => {
      mockRedis.pipeline.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });

      const location: DriverLocation = {
        driverId: 'driver-123',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(),
        companyId: 'company-456'
      };

      await expect(service.updateDriverLocation(location))
        .rejects.toThrow('Failed to update driver location');
    });

    it('should handle database connection failures gracefully', async () => {
      mockRedis.hgetall.mockResolvedValue({});
      mockDatabase.connect.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getDriverLocation('driver-123');

      expect(result).toBeNull();
    });
  });
});
