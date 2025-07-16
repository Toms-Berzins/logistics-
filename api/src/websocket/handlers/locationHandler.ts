import { Server, Socket } from 'socket.io';
import { DriverTrackingService } from '../../services/tracking/DriverTrackingService';
import { ILocationUpdate, IGeofenceEvent, GeoPoint, LocationMetadata } from '../../types/spatial.types';
import { BaseHandler } from './baseHandler';

export class LocationHandler extends BaseHandler {
  private driverTrackingService: DriverTrackingService;
  private activeDrivers: Map<string, string> = new Map(); // socketId -> driverId
  private driverSockets: Map<string, string> = new Map(); // driverId -> socketId
  private dispatcherRooms: Map<string, Set<string>> = new Map(); // zoneId -> Set<socketId>

  constructor(io: Server, driverTrackingService: DriverTrackingService) {
    super(io);
    this.driverTrackingService = driverTrackingService;
    this.setupEventListeners();
  }

  protected setupEventListeners(): void {
    // Listen to driver tracking service events
    this.driverTrackingService.on('location:update', this.handleLocationUpdate.bind(this));
    this.driverTrackingService.on('geofence:enter', this.handleGeofenceEnter.bind(this));
    this.driverTrackingService.on('geofence:exit', this.handleGeofenceExit.bind(this));
    this.driverTrackingService.on('driver:online', this.handleDriverOnline.bind(this));
    this.driverTrackingService.on('driver:offline', this.handleDriverOffline.bind(this));
  }

  /**
   * Handle new socket connection
   */
  public handleConnection(socket: Socket): void {
    console.log(`New connection: ${socket.id}`);

    // Driver connection events
    socket.on('driver:register', (data) => this.handleDriverRegister(socket, data));
    socket.on('driver:location', (data) => this.handleDriverLocationUpdate(socket, data));
    socket.on('driver:status', (data) => this.handleDriverStatusUpdate(socket, data));
    socket.on('driver:unregister', () => this.handleDriverUnregister(socket));

    // Dispatcher connection events
    socket.on('dispatcher:register', (data) => this.handleDispatcherRegister(socket, data));
    socket.on('dispatcher:track_driver', (data) => this.handleTrackDriver(socket, data));
    socket.on('dispatcher:track_zone', (data) => this.handleTrackZone(socket, data));
    socket.on('dispatcher:nearby_drivers', (data) => this.handleNearbyDrivers(socket, data));

    // Connection management
    socket.on('disconnect', () => this.handleDisconnect(socket));
    socket.on('ping', () => socket.emit('pong'));
  }

  /**
   * Register driver and join appropriate rooms
   */
  private async handleDriverRegister(socket: Socket, data: {
    driverId: string;
    companyId: string;
    location: GeoPoint;
    metadata: LocationMetadata;
  }): Promise<void> {
    try {
      const { driverId, companyId, location, metadata } = data;

      // Validate input
      if (!driverId || !companyId || !location || !metadata) {
        socket.emit('error', { message: 'Missing required driver registration data' });
        return;
      }

      // Join driver-specific room
      await socket.join(`driver:${driverId}`);

      // Join company-wide room
      await socket.join(`company:${companyId}`);

      // Store mapping
      this.activeDrivers.set(socket.id, driverId);
      this.driverSockets.set(driverId, socket.id);

      // Set driver online in tracking service
      await this.driverTrackingService.setDriverOnline(driverId, location, metadata);

      // Confirm registration
      socket.emit('driver:registered', {
        driverId,
        timestamp: new Date(),
        message: 'Driver registered successfully'
      });

      console.log(`Driver ${driverId} registered with socket ${socket.id}`);

    } catch (error) {
      console.error('Error registering driver:', error);
      socket.emit('error', { message: 'Failed to register driver' });
    }
  }

  /**
   * Handle driver location updates
   */
  private async handleDriverLocationUpdate(socket: Socket, data: {
    driverId: string;
    location: GeoPoint;
    metadata: LocationMetadata;
  }): Promise<void> {
    try {
      const { driverId, location, metadata } = data;

      // Validate driver ownership
      const registeredDriverId = this.activeDrivers.get(socket.id);
      if (registeredDriverId !== driverId) {
        socket.emit('error', { message: 'Unauthorized location update' });
        return;
      }

      // Update location in tracking service
      await this.driverTrackingService.updateLocation(driverId, location, metadata);

      // Acknowledge update
      socket.emit('location:updated', {
        driverId,
        timestamp: new Date(),
        status: 'success'
      });

    } catch (error) {
      console.error('Error updating driver location:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  }

  /**
   * Handle driver status updates
   */
  private async handleDriverStatusUpdate(socket: Socket, data: {
    driverId: string;
    status: 'available' | 'busy' | 'break';
    jobId?: string;
  }): Promise<void> {
    try {
      const { driverId, status, jobId } = data;

      // Validate driver ownership
      const registeredDriverId = this.activeDrivers.get(socket.id);
      if (registeredDriverId !== driverId) {
        socket.emit('error', { message: 'Unauthorized status update' });
        return;
      }

      // Get current location
      const currentLocation = await this.driverTrackingService.getDriverLocation(driverId);
      if (!currentLocation) {
        socket.emit('error', { message: 'Driver location not found' });
        return;
      }

      // Update status (would typically update in database)
      currentLocation.status = status;
      currentLocation.currentJobId = jobId;

      // Broadcast status update
      this.io.to(`driver:${driverId}`).emit('driver:status_changed', {
        driverId,
        status,
        jobId,
        timestamp: new Date()
      });

      // Acknowledge update
      socket.emit('status:updated', {
        driverId,
        status,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error updating driver status:', error);
      socket.emit('error', { message: 'Failed to update status' });
    }
  }

  /**
   * Unregister driver
   */
  private async handleDriverUnregister(socket: Socket): Promise<void> {
    try {
      const driverId = this.activeDrivers.get(socket.id);
      if (!driverId) return;

      // Set driver offline
      await this.driverTrackingService.setDriverOffline(driverId);

      // Clean up mappings
      this.activeDrivers.delete(socket.id);
      this.driverSockets.delete(driverId);

      // Leave rooms
      socket.leave(`driver:${driverId}`);

      console.log(`Driver ${driverId} unregistered from socket ${socket.id}`);

    } catch (error) {
      console.error('Error unregistering driver:', error);
    }
  }

  /**
   * Register dispatcher and join zone rooms
   */
  private async handleDispatcherRegister(socket: Socket, data: {
    dispatcherId: string;
    companyId: string;
    zones: string[];
  }): Promise<void> {
    try {
      const { dispatcherId, companyId, zones } = data;

      // Join company-wide room
      await socket.join(`company:${companyId}`);

      // Join dispatcher-specific room
      await socket.join(`dispatcher:${dispatcherId}`);

      // Join zone rooms
      for (const zoneId of zones) {
        await socket.join(`zone:${zoneId}`);

        // Track dispatcher in zone
        if (!this.dispatcherRooms.has(zoneId)) {
          this.dispatcherRooms.set(zoneId, new Set());
        }
        this.dispatcherRooms.get(zoneId)!.add(socket.id);
      }

      // Send initial driver locations for tracked zones
      for (const zoneId of zones) {
        const driversInZone = await this.driverTrackingService.getDriversInZone(zoneId);
        socket.emit('zone:drivers', {
          zoneId,
          drivers: driversInZone,
          timestamp: new Date()
        });
      }

      socket.emit('dispatcher:registered', {
        dispatcherId,
        zones,
        timestamp: new Date()
      });

      console.log(`Dispatcher ${dispatcherId} registered for zones: ${zones.join(', ')}`);

    } catch (error) {
      console.error('Error registering dispatcher:', error);
      socket.emit('error', { message: 'Failed to register dispatcher' });
    }
  }

  /**
   * Handle track specific driver request
   */
  private async handleTrackDriver(socket: Socket, data: { driverId: string }): Promise<void> {
    try {
      const { driverId } = data;

      // Get current driver location
      const driverLocation = await this.driverTrackingService.getDriverLocation(driverId);

      if (driverLocation) {
        socket.emit('driver:location', {
          driverId,
          location: driverLocation,
          timestamp: new Date()
        });
      } else {
        socket.emit('driver:not_found', { driverId });
      }

    } catch (error) {
      console.error('Error tracking driver:', error);
      socket.emit('error', { message: 'Failed to track driver' });
    }
  }

  /**
   * Handle track zone request
   */
  private async handleTrackZone(socket: Socket, data: { zoneId: string }): Promise<void> {
    try {
      const { zoneId } = data;

      // Join zone room
      await socket.join(`zone:${zoneId}`);

      // Get drivers in zone
      const driversInZone = await this.driverTrackingService.getDriversInZone(zoneId);

      socket.emit('zone:drivers', {
        zoneId,
        drivers: driversInZone,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error tracking zone:', error);
      socket.emit('error', { message: 'Failed to track zone' });
    }
  }

  /**
   * Handle nearby drivers request
   */
  private async handleNearbyDrivers(socket: Socket, data: {
    companyId: string;
    location: GeoPoint;
    radiusMeters: number;
    limit?: number;
  }): Promise<void> {
    try {
      const { companyId, location, radiusMeters, limit = 50 } = data;

      const nearbyDrivers = await this.driverTrackingService.findNearbyDrivers(companyId, {
        center: location,
        radiusMeters,
        limit
      });

      socket.emit('nearby:drivers', {
        location,
        radiusMeters,
        drivers: nearbyDrivers,
        count: nearbyDrivers.length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error finding nearby drivers:', error);
      socket.emit('error', { message: 'Failed to find nearby drivers' });
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`Socket disconnected: ${socket.id}`);

    // Clean up driver if registered
    const driverId = this.activeDrivers.get(socket.id);
    if (driverId) {
      this.handleDriverUnregister(socket);
    }

    // Clean up dispatcher room memberships
    for (const [zoneId, dispatchers] of this.dispatcherRooms) {
      dispatchers.delete(socket.id);
      if (dispatchers.size === 0) {
        this.dispatcherRooms.delete(zoneId);
      }
    }
  }

  // Event handlers for tracking service events

  /**
   * Broadcast location update to relevant rooms
   */
  private handleLocationUpdate(locationUpdate: ILocationUpdate): void {
    const { driverId, location, metadata } = locationUpdate;

    // Broadcast to driver's room
    this.io.to(`driver:${driverId}`).emit('location:update', {
      driverId,
      location,
      metadata,
      timestamp: new Date()
    });

    // Broadcast to relevant zone rooms
    this.driverTrackingService.getDriverLocation(driverId)
      .then(driverLocation => {
        if (driverLocation?.currentZoneId) {
          this.io.to(`zone:${driverLocation.currentZoneId}`).emit('location:update', {
            driverId,
            location,
            metadata,
            zoneId: driverLocation.currentZoneId,
            timestamp: new Date()
          });
        }
      })
      .catch(error => console.error('Error broadcasting location update:', error));
  }

  /**
   * Handle geofence enter event
   */
  private handleGeofenceEnter(event: IGeofenceEvent): void {
    const { driverId, zoneId, location, timestamp } = event;

    // Broadcast to zone room
    this.io.to(`zone:${zoneId}`).emit('geofence:enter', {
      driverId,
      zoneId,
      location,
      timestamp
    });

    // Broadcast to driver
    this.io.to(`driver:${driverId}`).emit('geofence:enter', {
      zoneId,
      location,
      timestamp
    });
  }

  /**
   * Handle geofence exit event
   */
  private handleGeofenceExit(event: IGeofenceEvent): void {
    const { driverId, zoneId, location, timestamp } = event;

    // Broadcast to zone room
    this.io.to(`zone:${zoneId}`).emit('geofence:exit', {
      driverId,
      zoneId,
      location,
      timestamp
    });

    // Broadcast to driver
    this.io.to(`driver:${driverId}`).emit('geofence:exit', {
      zoneId,
      location,
      timestamp
    });
  }

  /**
   * Handle driver online event
   */
  private handleDriverOnline(event: { driverId: string; location: GeoPoint; timestamp: Date }): void {
    const { driverId, location, timestamp } = event;

    this.io.emit('driver:online', {
      driverId,
      location,
      timestamp
    });
  }

  /**
   * Handle driver offline event
   */
  private handleDriverOffline(event: { driverId: string; timestamp: Date }): void {
    const { driverId, timestamp } = event;

    this.io.emit('driver:offline', {
      driverId,
      timestamp
    });
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    activeDrivers: number;
    activeDispatchers: number;
    totalConnections: number;
    } {
    return {
      activeDrivers: this.activeDrivers.size,
      activeDispatchers: this.dispatcherRooms.size,
      totalConnections: this.io.engine.clientsCount
    };
  }
}
