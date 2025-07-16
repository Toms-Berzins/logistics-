import { Server, Socket } from 'socket.io';
import { driverTrackingService, DriverLocation, DriverStatus } from '../services/driverTracking';
import trackingRedis, { REDIS_KEYS } from '../config/redisTracking';

export interface DriverSocketData {
  driverId?: string;
  companyId?: string;
  userType?: 'driver' | 'dispatcher' | 'admin';
  userId?: string;
}

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  timestamp?: string;
  batchUpdates?: LocationUpdatePayload[];
}

export interface StatusUpdatePayload {
  isOnline: boolean;
  isAvailable: boolean;
  currentJobId?: string;
  batteryLevel?: number;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'offline';
}

export class DriverEventHandler {
  private io: Server;
  private connectedDrivers = new Map<string, Socket>();
  private dispatcherRooms = new Map<string, Set<string>>(); // companyId -> socketIds

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      // Authentication and room joining
      socket.on('authenticate', this.handleAuthentication.bind(this, socket));
      
      // Driver events
      socket.on('driver:location_update', this.handleLocationUpdate.bind(this, socket));
      socket.on('driver:batch_location_update', this.handleBatchLocationUpdate.bind(this, socket));
      socket.on('driver:status_update', this.handleStatusUpdate.bind(this, socket));
      socket.on('driver:route_start', this.handleRouteStart.bind(this, socket));
      socket.on('driver:route_complete', this.handleRouteComplete.bind(this, socket));
      
      // Dispatcher events
      socket.on('dispatcher:join_company', this.handleDispatcherJoin.bind(this, socket));
      socket.on('dispatcher:track_driver', this.handleTrackDriver.bind(this, socket));
      socket.on('dispatcher:get_nearby_drivers', this.handleGetNearbyDrivers.bind(this, socket));
      
      // Connection management
      socket.on('ping', () => socket.emit('pong'));
      socket.on('disconnect', this.handleDisconnect.bind(this, socket));
    });
  }

  private async handleAuthentication(socket: Socket, data: DriverSocketData) {
    try {
      if (!data.userId || !data.companyId || !data.userType) {
        socket.emit('error', { message: 'Invalid authentication data' });
        return;
      }

      // Store user data in socket
      socket.data = data;
      
      if (data.userType === 'driver' && data.driverId) {
        // Join driver to their personal room
        await socket.join(`driver:${data.driverId}`);
        
        // Join company room for company-wide broadcasts
        await socket.join(`company:${data.companyId}`);
        
        // Track connected driver
        this.connectedDrivers.set(data.driverId, socket);
        
        // Mark driver as online
        await driverTrackingService.updateDriverStatus({
          driverId: data.driverId,
          isOnline: true,
          isAvailable: true,
          lastLocationUpdate: new Date(),
          connectionQuality: 'excellent',
        });
        
        // Notify dispatchers
        this.broadcastToDispatchers(data.companyId, 'driver:online', {
          driverId: data.driverId,
          timestamp: new Date().toISOString(),
        });
        
        console.log(`Driver ${data.driverId} authenticated and online`);
        
      } else if (data.userType === 'dispatcher' || data.userType === 'admin') {
        // Join dispatcher rooms
        await socket.join(`dispatchers:${data.companyId}`);
        await socket.join(`company:${data.companyId}`);
        
        // Track dispatcher in company room
        if (!this.dispatcherRooms.has(data.companyId)) {
          this.dispatcherRooms.set(data.companyId, new Set());
        }
        this.dispatcherRooms.get(data.companyId)!.add(socket.id);
        
        // Send current active drivers
        const activeDrivers = await driverTrackingService.getActiveDrivers(data.companyId);
        socket.emit('active_drivers', { drivers: activeDrivers });
        
        console.log(`Dispatcher ${data.userId} joined company ${data.companyId}`);
      }
      
      socket.emit('authenticated', { success: true, userType: data.userType });
      
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  }

  private async handleLocationUpdate(socket: Socket, payload: LocationUpdatePayload) {
    try {
      const driverData = socket.data as DriverSocketData;
      
      if (!driverData.driverId || !driverData.companyId) {
        socket.emit('error', { message: 'Driver not authenticated' });
        return;
      }

      const location: DriverLocation = {
        driverId: driverData.driverId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        accuracy: payload.accuracy,
        speed: payload.speed,
        heading: payload.heading,
        altitude: payload.altitude,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        companyId: driverData.companyId,
      };

      // Update location in service
      await driverTrackingService.updateDriverLocation(location);

      // Broadcast to dispatchers in real-time
      this.broadcastToDispatchers(driverData.companyId, 'driver:location_updated', {
        driverId: driverData.driverId,
        ...location,
        timestamp: location.timestamp.toISOString(),
      });

      // Confirm to driver
      socket.emit('location_updated', { 
        success: true, 
        timestamp: location.timestamp.toISOString(),
      });

      // Update connection quality based on response time
      this.updateConnectionQuality(socket, driverData.driverId);

    } catch (error) {
      console.error('Location update error:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  }

  private async handleBatchLocationUpdate(socket: Socket, payload: { updates: LocationUpdatePayload[] }) {
    try {
      const driverData = socket.data as DriverSocketData;
      
      if (!driverData.driverId || !driverData.companyId) {
        socket.emit('error', { message: 'Driver not authenticated' });
        return;
      }

      const locations: DriverLocation[] = payload.updates.map(update => ({
        driverId: driverData.driverId!,
        latitude: update.latitude,
        longitude: update.longitude,
        accuracy: update.accuracy,
        speed: update.speed,
        heading: update.heading,
        altitude: update.altitude,
        timestamp: update.timestamp ? new Date(update.timestamp) : new Date(),
        companyId: driverData.companyId!,
      }));

      // Batch update locations
      await driverTrackingService.batchUpdateLocations(locations);

      // Broadcast only the latest location to dispatchers
      const latestLocation = locations[locations.length - 1];
      this.broadcastToDispatchers(driverData.companyId, 'driver:location_updated', {
        driverId: driverData.driverId,
        ...latestLocation,
        timestamp: latestLocation.timestamp.toISOString(),
        batchCount: locations.length,
      });

      socket.emit('batch_locations_updated', { 
        success: true, 
        count: locations.length,
        latestTimestamp: latestLocation.timestamp.toISOString(),
      });

    } catch (error) {
      console.error('Batch location update error:', error);
      socket.emit('error', { message: 'Failed to update batch locations' });
    }
  }

  private async handleStatusUpdate(socket: Socket, payload: StatusUpdatePayload) {
    try {
      const driverData = socket.data as DriverSocketData;
      
      if (!driverData.driverId) {
        socket.emit('error', { message: 'Driver not authenticated' });
        return;
      }

      const status: DriverStatus = {
        driverId: driverData.driverId,
        isOnline: payload.isOnline,
        isAvailable: payload.isAvailable,
        currentJobId: payload.currentJobId,
        lastLocationUpdate: new Date(),
        batteryLevel: payload.batteryLevel,
        connectionQuality: payload.connectionQuality || 'good',
      };

      await driverTrackingService.updateDriverStatus(status);

      // Broadcast status change to dispatchers
      this.broadcastToDispatchers(driverData.companyId!, 'driver:status_updated', {
        driverId: driverData.driverId,
        ...status,
        lastLocationUpdate: status.lastLocationUpdate.toISOString(),
      });

      socket.emit('status_updated', { success: true });

    } catch (error) {
      console.error('Status update error:', error);
      socket.emit('error', { message: 'Failed to update status' });
    }
  }

  private handleRouteStart(socket: Socket, payload: { jobId: string; estimatedDuration: number }) {
    const driverData = socket.data as DriverSocketData;
    
    if (!driverData.driverId) {
      socket.emit('error', { message: 'Driver not authenticated' });
      return;
    }

    // Broadcast route start to dispatchers
    this.broadcastToDispatchers(driverData.companyId!, 'driver:route_started', {
      driverId: driverData.driverId,
      jobId: payload.jobId,
      estimatedDuration: payload.estimatedDuration,
      timestamp: new Date().toISOString(),
    });

    socket.emit('route_started', { success: true });
  }

  private handleRouteComplete(socket: Socket, payload: { jobId: string; finalLocation: { lat: number; lng: number } }) {
    const driverData = socket.data as DriverSocketData;
    
    if (!driverData.driverId) {
      socket.emit('error', { message: 'Driver not authenticated' });
      return;
    }

    // Broadcast route completion to dispatchers
    this.broadcastToDispatchers(driverData.companyId!, 'driver:route_completed', {
      driverId: driverData.driverId,
      jobId: payload.jobId,
      finalLocation: payload.finalLocation,
      timestamp: new Date().toISOString(),
    });

    socket.emit('route_completed', { success: true });
  }

  private handleDispatcherJoin(socket: Socket, payload: { companyId: string }) {
    // Already handled in authentication, but can be used for additional dispatcher-specific setup
    socket.emit('dispatcher_joined', { 
      companyId: payload.companyId,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleTrackDriver(socket: Socket, payload: { driverId: string }) {
    try {
      const dispatcherData = socket.data as DriverSocketData;
      
      const location = await driverTrackingService.getDriverLocation(payload.driverId);
      
      if (location) {
        socket.emit('driver_location', {
          driverId: payload.driverId,
          ...location,
          timestamp: location.timestamp.toISOString(),
        });
      } else {
        socket.emit('driver_not_found', { driverId: payload.driverId });
      }

    } catch (error) {
      console.error('Track driver error:', error);
      socket.emit('error', { message: 'Failed to track driver' });
    }
  }

  private async handleGetNearbyDrivers(socket: Socket, payload: { 
    latitude: number; 
    longitude: number; 
    radius: number;
    limit?: number;
  }) {
    try {
      const dispatcherData = socket.data as DriverSocketData;
      
      if (!dispatcherData.companyId) {
        socket.emit('error', { message: 'Dispatcher not authenticated' });
        return;
      }

      const nearbyDrivers = await driverTrackingService.getNearbyDrivers({
        latitude: payload.latitude,
        longitude: payload.longitude,
        radiusKm: payload.radius,
        companyId: dispatcherData.companyId,
        limit: payload.limit || 20,
      });

      socket.emit('nearby_drivers', {
        drivers: nearbyDrivers.map(driver => ({
          ...driver,
          timestamp: driver.timestamp.toISOString(),
        })),
        searchLocation: {
          latitude: payload.latitude,
          longitude: payload.longitude,
          radius: payload.radius,
        },
      });

    } catch (error) {
      console.error('Get nearby drivers error:', error);
      socket.emit('error', { message: 'Failed to get nearby drivers' });
    }
  }

  private async handleDisconnect(socket: Socket) {
    const driverData = socket.data as DriverSocketData;
    
    if (driverData?.driverId) {
      // Remove from connected drivers
      this.connectedDrivers.delete(driverData.driverId);
      
      // Mark driver as offline after a grace period
      setTimeout(async () => {
        // Check if driver reconnected
        if (!this.connectedDrivers.has(driverData.driverId!)) {
          await driverTrackingService.updateDriverStatus({
            driverId: driverData.driverId!,
            isOnline: false,
            isAvailable: false,
            lastLocationUpdate: new Date(),
            connectionQuality: 'offline',
          });
          
          // Notify dispatchers
          this.broadcastToDispatchers(driverData.companyId!, 'driver:offline', {
            driverId: driverData.driverId,
            timestamp: new Date().toISOString(),
          });
        }
      }, 30000); // 30 second grace period
      
      console.log(`Driver ${driverData.driverId} disconnected`);
      
    } else if (driverData?.companyId && (driverData.userType === 'dispatcher' || driverData.userType === 'admin')) {
      // Remove dispatcher from company room tracking
      const companyRoom = this.dispatcherRooms.get(driverData.companyId);
      if (companyRoom) {
        companyRoom.delete(socket.id);
        if (companyRoom.size === 0) {
          this.dispatcherRooms.delete(driverData.companyId);
        }
      }
      
      console.log(`Dispatcher ${driverData.userId} disconnected from company ${driverData.companyId}`);
    }
  }

  private broadcastToDispatchers(companyId: string, event: string, data: any) {
    this.io.to(`dispatchers:${companyId}`).emit(event, data);
  }

  private async updateConnectionQuality(socket: Socket, driverId: string) {
    const startTime = socket.data.lastPingTime || Date.now();
    const responseTime = Date.now() - startTime;
    
    let quality: 'excellent' | 'good' | 'poor' | 'offline';
    
    if (responseTime < 100) {
      quality = 'excellent';
    } else if (responseTime < 500) {
      quality = 'good';
    } else {
      quality = 'poor';
    }
    
    // Update connection quality in Redis
    await trackingRedis.hset(
      REDIS_KEYS.DRIVER_STATUS(driverId),
      'connectionQuality', quality,
      'lastResponseTime', responseTime.toString()
    );
  }

  // Public methods for external use

  public async broadcastLocationUpdate(driverId: string, location: DriverLocation) {
    this.io.to(`driver:${driverId}`).emit('location_broadcast', {
      ...location,
      timestamp: location.timestamp.toISOString(),
    });
  }

  public async notifyJobAssignment(driverId: string, jobData: any) {
    this.io.to(`driver:${driverId}`).emit('job_assigned', jobData);
  }

  public getConnectedDriversCount(): number {
    return this.connectedDrivers.size;
  }

  public getActiveCompanies(): string[] {
    return Array.from(this.dispatcherRooms.keys());
  }
}

export default DriverEventHandler;