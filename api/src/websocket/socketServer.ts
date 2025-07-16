import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { LocationHandler } from './handlers/locationHandler';
import { DriverTrackingService } from '../services/tracking/DriverTrackingService';
import { DriverLocationCache } from '../services/cache/DriverLocationCache';
import { RedisClient } from '../services/redis/RedisClient';
import { createServer } from 'http';
import { Express } from 'express';

export class SocketServer {
  private io: Server;
  private locationHandler: LocationHandler;
  private driverTrackingService: DriverTrackingService;
  private redisClient: RedisClient;

  constructor(
    app: Express,
    redisClient: RedisClient,
    port: number = 3001
  ) {
    this.redisClient = redisClient;

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io server
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Set up Redis adapter for horizontal scaling
    this.setupRedisAdapter();

    // Initialize services
    const locationCache = new DriverLocationCache(redisClient);
    this.driverTrackingService = new DriverTrackingService(locationCache);
    this.locationHandler = new LocationHandler(this.io, this.driverTrackingService);

    // Setup connection handling
    this.setupConnectionHandling();

    // Start server
    httpServer.listen(port, () => {
      console.log(`Socket.io server listening on port ${port}`);
    });
  }

  private async setupRedisAdapter(): Promise<void> {
    try {
      const pubClient = this.redisClient.getClient();
      const subClient = pubClient.duplicate();

      await subClient.connect();

      this.io.adapter(createAdapter(pubClient, subClient));
      console.log('Redis adapter configured for Socket.io');
    } catch (error) {
      console.error('Failed to setup Redis adapter:', error);
    }
  }

  private setupConnectionHandling(): void {
    // Connection middleware for authentication
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Validate token here (simplified for demo)
      if (token === 'valid-token') {
        next();
      } else {
        next(new Error('Invalid token'));
      }
    });

    // Handle new connections
    this.io.on('connection', (socket: Socket) => {
      console.log(`New client connected: ${socket.id}`);

      // Delegate to location handler
      this.locationHandler.handleConnection(socket);

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      });
    });

    // Handle server errors
    this.io.on('error', (error) => {
      console.error('Socket.io server error:', error);
    });
  }

  /**
   * Broadcast message to all clients
   */
  public broadcast(event: string, data: unknown): void {
    this.io.emit(event, data);
  }

  /**
   * Send message to specific room
   */
  public sendToRoom(room: string, event: string, data: unknown): void {
    this.io.to(room).emit(event, data);
  }

  /**
   * Send message to specific socket
   */
  public sendToSocket(socketId: string, event: string, data: unknown): void {
    this.io.to(socketId).emit(event, data);
  }

  /**
   * Get server statistics
   */
  public getStats(): {
    totalConnections: number;
    activeDrivers: number;
    activeDispatchers: number;
    uptime: number;
    } {
    const locationStats = this.locationHandler.getStats();

    return {
      totalConnections: this.io.engine.clientsCount,
      activeDrivers: locationStats.activeDrivers,
      activeDispatchers: locationStats.activeDispatchers,
      uptime: process.uptime()
    };
  }

  /**
   * Get driver tracking service
   */
  public getDriverTrackingService(): DriverTrackingService {
    return this.driverTrackingService;
  }

  /**
   * Close server
   */
  public close(): void {
    this.io.close();
  }
}
