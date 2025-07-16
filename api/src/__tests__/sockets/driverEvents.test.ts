import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import Client from 'socket.io-client';
import DriverEventHandler from '../../sockets/driverEvents';
import { driverTrackingService } from '../../services/driverTracking';

// Mock the driver tracking service
jest.mock('../../services/driverTracking');
const mockDriverTrackingService = driverTrackingService as jest.Mocked<typeof driverTrackingService>;

describe('DriverEventHandler', () => {
  let httpServer: any;
  let io: SocketIOServer;
  let driverEventHandler: DriverEventHandler;
  let clientSocket: any;
  let driverSocket: any;
  let dispatcherSocket: any;

  beforeAll((done) => {
    httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: "http://localhost",
        methods: ["GET", "POST"]
      }
    });
    
    driverEventHandler = new DriverEventHandler(io);
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      
      // Create test clients
      clientSocket = Client(`http://localhost:${port}`);
      driverSocket = Client(`http://localhost:${port}`);
      dispatcherSocket = Client(`http://localhost:${port}`);
      
      // Wait for all connections
      let connectedCount = 0;
      const onConnect = () => {
        connectedCount++;
        if (connectedCount === 3) {
          done();
        }
      };
      
      clientSocket.on('connect', onConnect);
      driverSocket.on('connect', onConnect);
      dispatcherSocket.on('connect', onConnect);
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
    clientSocket.close();
    driverSocket.close();
    dispatcherSocket.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock service methods
    mockDriverTrackingService.updateDriverLocation.mockResolvedValue();
    mockDriverTrackingService.updateDriverStatus.mockResolvedValue();
    mockDriverTrackingService.getDriverLocation.mockResolvedValue(null);
    mockDriverTrackingService.getActiveDrivers.mockResolvedValue([]);
    mockDriverTrackingService.getNearbyDrivers.mockResolvedValue([]);
    mockDriverTrackingService.batchUpdateLocations.mockResolvedValue();
  });

  describe('Authentication', () => {
    it('should authenticate driver successfully', (done) => {
      driverSocket.emit('authenticate', {
        userId: 'user-123',
        companyId: 'company-456',
        userType: 'driver',
        driverId: 'driver-789',
      });

      driverSocket.on('authenticated', (data: any) => {
        expect(data.success).toBe(true);
        expect(data.userType).toBe('driver');
        done();
      });
    });

    it('should authenticate dispatcher successfully', (done) => {
      mockDriverTrackingService.getActiveDrivers.mockResolvedValue(['driver-1', 'driver-2']);

      dispatcherSocket.emit('authenticate', {
        userId: 'user-456',
        companyId: 'company-456',
        userType: 'dispatcher',
      });

      dispatcherSocket.on('authenticated', (data: any) => {
        expect(data.success).toBe(true);
        expect(data.userType).toBe('dispatcher');
        done();
      });

      dispatcherSocket.on('active_drivers', (data: any) => {
        expect(data.drivers).toEqual(['driver-1', 'driver-2']);
      });
    });

    it('should reject invalid authentication', (done) => {
      clientSocket.emit('authenticate', {
        // Missing required fields
        userId: 'user-123',
      });

      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('Invalid authentication data');
        done();
      });
    });
  });

  describe('Location Updates', () => {
    beforeEach((done) => {
      // Authenticate driver first
      driverSocket.emit('authenticate', {
        userId: 'user-123',
        companyId: 'company-456',
        userType: 'driver',
        driverId: 'driver-789',
      });

      driverSocket.on('authenticated', () => {
        done();
      });
    });

    it('should handle single location update', (done) => {
      const locationUpdate = {
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 10,
        speed: 25,
        heading: 180,
        timestamp: new Date().toISOString(),
      };

      driverSocket.emit('driver:location_update', locationUpdate);

      driverSocket.on('location_updated', (response: any) => {
        expect(response.success).toBe(true);
        expect(response.timestamp).toBeDefined();
        expect(mockDriverTrackingService.updateDriverLocation).toHaveBeenCalledWith(
          expect.objectContaining({
            driverId: 'driver-789',
            latitude: 40.7128,
            longitude: -74.0060,
            companyId: 'company-456',
          })
        );
        done();
      });
    });

    it('should handle batch location updates', (done) => {
      const batchUpdates = [
        {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date().toISOString(),
        },
        {
          latitude: 40.7130,
          longitude: -74.0058,
          timestamp: new Date().toISOString(),
        },
      ];

      driverSocket.emit('driver:batch_location_update', {
        updates: batchUpdates,
      });

      driverSocket.on('batch_locations_updated', (response: any) => {
        expect(response.success).toBe(true);
        expect(response.count).toBe(2);
        expect(mockDriverTrackingService.batchUpdateLocations).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              driverId: 'driver-789',
              latitude: 40.7128,
              longitude: -74.0060,
            }),
            expect.objectContaining({
              driverId: 'driver-789',
              latitude: 40.7130,
              longitude: -74.0058,
            }),
          ])
        );
        done();
      });
    });

    it('should broadcast location updates to dispatchers', (done) => {
      // Authenticate dispatcher
      dispatcherSocket.emit('authenticate', {
        userId: 'dispatcher-123',
        companyId: 'company-456',
        userType: 'dispatcher',
      });

      dispatcherSocket.on('authenticated', () => {
        // Now send location update from driver
        driverSocket.emit('driver:location_update', {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date().toISOString(),
        });
      });

      dispatcherSocket.on('driver:location_updated', (data: any) => {
        expect(data.driverId).toBe('driver-789');
        expect(data.latitude).toBe(40.7128);
        expect(data.longitude).toBe(-74.0060);
        done();
      });
    });

    it('should reject location updates from unauthenticated drivers', (done) => {
      clientSocket.emit('driver:location_update', {
        latitude: 40.7128,
        longitude: -74.0060,
      });

      clientSocket.on('error', (error: any) => {
        expect(error.message).toBe('Driver not authenticated');
        done();
      });
    });
  });

  describe('Status Updates', () => {
    beforeEach((done) => {
      driverSocket.emit('authenticate', {
        userId: 'user-123',
        companyId: 'company-456',
        userType: 'driver',
        driverId: 'driver-789',
      });

      driverSocket.on('authenticated', () => {
        done();
      });
    });

    it('should handle driver status updates', (done) => {
      const statusUpdate = {
        isOnline: true,
        isAvailable: false,
        currentJobId: 'job-123',
        batteryLevel: 75,
        connectionQuality: 'good' as const,
      };

      driverSocket.emit('driver:status_update', statusUpdate);

      driverSocket.on('status_updated', (response: any) => {
        expect(response.success).toBe(true);
        expect(mockDriverTrackingService.updateDriverStatus).toHaveBeenCalledWith(
          expect.objectContaining({
            driverId: 'driver-789',
            isOnline: true,
            isAvailable: false,
            currentJobId: 'job-123',
            batteryLevel: 75,
            connectionQuality: 'good',
          })
        );
        done();
      });
    });

    it('should broadcast status updates to dispatchers', (done) => {
      dispatcherSocket.emit('authenticate', {
        userId: 'dispatcher-123',
        companyId: 'company-456',
        userType: 'dispatcher',
      });

      dispatcherSocket.on('authenticated', () => {
        driverSocket.emit('driver:status_update', {
          isOnline: true,
          isAvailable: false,
          currentJobId: 'job-123',
        });
      });

      dispatcherSocket.on('driver:status_updated', (data: any) => {
        expect(data.driverId).toBe('driver-789');
        expect(data.isOnline).toBe(true);
        expect(data.isAvailable).toBe(false);
        expect(data.currentJobId).toBe('job-123');
        done();
      });
    });
  });

  describe('Dispatcher Operations', () => {
    beforeEach((done) => {
      dispatcherSocket.emit('authenticate', {
        userId: 'dispatcher-123',
        companyId: 'company-456',
        userType: 'dispatcher',
      });

      dispatcherSocket.on('authenticated', () => {
        done();
      });
    });

    it('should handle track driver requests', (done) => {
      const mockLocation = {
        driverId: 'driver-123',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date(),
        companyId: 'company-456',
      };

      mockDriverTrackingService.getDriverLocation.mockResolvedValue(mockLocation);

      dispatcherSocket.emit('dispatcher:track_driver', {
        driverId: 'driver-123',
      });

      dispatcherSocket.on('driver_location', (data: any) => {
        expect(data.driverId).toBe('driver-123');
        expect(data.latitude).toBe(40.7128);
        expect(data.longitude).toBe(-74.0060);
        done();
      });
    });

    it('should handle nearby drivers requests', (done) => {
      const mockNearbyDrivers = [
        {
          driverId: 'driver-1',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(),
          companyId: 'company-456',
        },
        {
          driverId: 'driver-2',
          latitude: 40.7130,
          longitude: -74.0058,
          timestamp: new Date(),
          companyId: 'company-456',
        },
      ];

      mockDriverTrackingService.getNearbyDrivers.mockResolvedValue(mockNearbyDrivers);

      dispatcherSocket.emit('dispatcher:get_nearby_drivers', {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 5,
      });

      dispatcherSocket.on('nearby_drivers', (data: any) => {
        expect(data.drivers).toHaveLength(2);
        expect(data.searchLocation.latitude).toBe(40.7128);
        expect(data.searchLocation.longitude).toBe(-74.0060);
        expect(data.searchLocation.radius).toBe(5);
        done();
      });
    });

    it('should return driver not found for invalid driver ID', (done) => {
      mockDriverTrackingService.getDriverLocation.mockResolvedValue(null);

      dispatcherSocket.emit('dispatcher:track_driver', {
        driverId: 'invalid-driver',
      });

      dispatcherSocket.on('driver_not_found', (data: any) => {
        expect(data.driverId).toBe('invalid-driver');
        done();
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle driver disconnect gracefully', (done) => {
      const testDriverSocket = Client(`http://localhost:${(httpServer.address() as any).port}`);

      testDriverSocket.on('connect', () => {
        testDriverSocket.emit('authenticate', {
          userId: 'test-user',
          companyId: 'company-456',
          userType: 'driver',
          driverId: 'test-driver',
        });
      });

      testDriverSocket.on('authenticated', () => {
        // Disconnect the driver
        testDriverSocket.disconnect();
        
        // Wait for grace period and check if status was updated
        setTimeout(() => {
          expect(mockDriverTrackingService.updateDriverStatus).toHaveBeenCalledWith(
            expect.objectContaining({
              driverId: 'test-driver',
              isOnline: false,
              isAvailable: false,
              connectionQuality: 'offline',
            })
          );
          done();
        }, 35000); // 35 seconds to account for 30 second grace period
      });
    });

    it('should track connected drivers count', () => {
      const count = driverEventHandler.getConnectedDriversCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should track active companies', () => {
      const companies = driverEventHandler.getActiveCompanies();
      expect(Array.isArray(companies)).toBe(true);
    });
  });

  describe('Real-time Broadcasting', () => {
    it('should broadcast route start to dispatchers', (done) => {
      // Authenticate both driver and dispatcher
      Promise.all([
        new Promise((resolve) => {
          driverSocket.emit('authenticate', {
            userId: 'driver-user',
            companyId: 'company-456',
            userType: 'driver',
            driverId: 'driver-789',
          });
          driverSocket.on('authenticated', resolve);
        }),
        new Promise((resolve) => {
          dispatcherSocket.emit('authenticate', {
            userId: 'dispatcher-user',
            companyId: 'company-456',
            userType: 'dispatcher',
          });
          dispatcherSocket.on('authenticated', resolve);
        }),
      ]).then(() => {
        driverSocket.emit('driver:route_start', {
          jobId: 'job-123',
          estimatedDuration: 1800, // 30 minutes
        });
      });

      dispatcherSocket.on('driver:route_started', (data: any) => {
        expect(data.driverId).toBe('driver-789');
        expect(data.jobId).toBe('job-123');
        expect(data.estimatedDuration).toBe(1800);
        done();
      });
    });

    it('should broadcast route completion to dispatchers', (done) => {
      Promise.all([
        new Promise((resolve) => {
          driverSocket.emit('authenticate', {
            userId: 'driver-user',
            companyId: 'company-456',
            userType: 'driver',
            driverId: 'driver-789',
          });
          driverSocket.on('authenticated', resolve);
        }),
        new Promise((resolve) => {
          dispatcherSocket.emit('authenticate', {
            userId: 'dispatcher-user',
            companyId: 'company-456',
            userType: 'dispatcher',
          });
          dispatcherSocket.on('authenticated', resolve);
        }),
      ]).then(() => {
        driverSocket.emit('driver:route_complete', {
          jobId: 'job-123',
          finalLocation: { lat: 40.7128, lng: -74.0060 },
        });
      });

      dispatcherSocket.on('driver:route_completed', (data: any) => {
        expect(data.driverId).toBe('driver-789');
        expect(data.jobId).toBe('job-123');
        expect(data.finalLocation).toEqual({ lat: 40.7128, lng: -74.0060 });
        done();
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple simultaneous location updates', (done) => {
      const updateCount = 10;
      let completedUpdates = 0;

      driverSocket.emit('authenticate', {
        userId: 'perf-user',
        companyId: 'company-456',
        userType: 'driver',
        driverId: 'perf-driver',
      });

      driverSocket.on('authenticated', () => {
        // Send multiple location updates
        for (let i = 0; i < updateCount; i++) {
          driverSocket.emit('driver:location_update', {
            latitude: 40.7128 + i * 0.001,
            longitude: -74.0060 + i * 0.001,
            timestamp: new Date().toISOString(),
          });
        }
      });

      driverSocket.on('location_updated', () => {
        completedUpdates++;
        if (completedUpdates === updateCount) {
          expect(mockDriverTrackingService.updateDriverLocation).toHaveBeenCalledTimes(updateCount);
          done();
        }
      });
    });

    it('should respond to location updates within latency target', (done) => {
      driverSocket.emit('authenticate', {
        userId: 'latency-user',
        companyId: 'company-456',
        userType: 'driver',
        driverId: 'latency-driver',
      });

      driverSocket.on('authenticated', () => {
        const startTime = Date.now();
        
        driverSocket.emit('driver:location_update', {
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date().toISOString(),
        });

        driverSocket.on('location_updated', () => {
          const endTime = Date.now();
          const latency = endTime - startTime;
          
          // Should respond within 100ms for performance target
          expect(latency).toBeLessThan(100);
          done();
        });
      });
    });
  });
});