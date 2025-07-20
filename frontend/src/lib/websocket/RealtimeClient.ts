import { EventEmitter } from 'events';
import { ConnectionManager } from './ConnectionManager';
import { EventRouter } from './EventRouter';
import { OptimisticUpdatesManager } from './OptimisticUpdates';
import { 
  ConnectionConfig, 
  ConnectionState, 
  ConnectionQuality, 
  RealtimeMessage,
  RealtimeError,
  ConnectionHealth,
  EventSubscription,
  OptimisticUpdate,
  RateLimit
} from './types';

export class RealtimeClient extends EventEmitter {
  private connectionManager: ConnectionManager;
  private eventRouter: EventRouter;
  private optimisticUpdates: OptimisticUpdatesManager;
  private isInitialized = false;

  constructor(config: ConnectionConfig) {
    super();
    
    this.connectionManager = new ConnectionManager(config);
    this.eventRouter = new EventRouter();
    this.optimisticUpdates = new OptimisticUpdatesManager();
    
    this.setupEventForwarding();
    this.isInitialized = true;
  }

  // Connection Management
  public async connect(): Promise<void> {
    return this.connectionManager.connect();
  }

  public disconnect(): void {
    this.connectionManager.disconnect();
  }

  public getConnectionState(): ConnectionState {
    return this.connectionManager.getHealth().state;
  }

  public getConnectionQuality(): ConnectionQuality {
    return this.connectionManager.getHealth().quality;
  }

  public getHealth(): ConnectionHealth {
    return this.connectionManager.getHealth();
  }

  // Messaging
  public async send<T>(
    type: string, 
    data: T, 
    options?: { 
      priority?: 'high' | 'medium' | 'low';
      optimistic?: {
        id: string;
        rollback: () => void;
        timeout?: number;
      };
    }
  ): Promise<void> {
    // Handle optimistic updates
    if (options?.optimistic) {
      const { id, rollback, timeout } = options.optimistic;
      
      this.optimisticUpdates.create(
        id,
        data,
        rollback,
        () => {}, // Confirm will be called when server responds
        timeout
      );
    }

    try {
      await this.connectionManager.send(type, data, { priority: options?.priority });
      
      // Confirm optimistic update on successful send
      if (options?.optimistic) {
        this.optimisticUpdates.confirm(options.optimistic.id);
      }
    } catch (error) {
      // Rollback optimistic update on failure
      if (options?.optimistic) {
        this.optimisticUpdates.rollback(options.optimistic.id);
      }
      throw error;
    }
  }

  // Event Subscriptions
  public subscribe(
    eventType: string,
    callback: (data: unknown) => void,
    options?: {
      priority?: 'high' | 'medium' | 'low';
      throttle?: number;
      debounce?: number;
    }
  ): string {
    return this.eventRouter.subscribe(eventType, callback, options);
  }

  public unsubscribe(subscriptionId: string): boolean {
    return this.eventRouter.unsubscribe(subscriptionId);
  }

  public unsubscribeFromEvent(eventType: string): number {
    return this.eventRouter.unsubscribeFromEvent(eventType);
  }

  public unsubscribeAll(): number {
    return this.eventRouter.unsubscribeAll();
  }

  // Optimistic Updates
  public createOptimisticUpdate<T>(
    id: string,
    data: T,
    rollback: () => void,
    confirm: () => void,
    timeout?: number
  ): OptimisticUpdate<T> {
    return this.optimisticUpdates.create(id, data, rollback, confirm, timeout);
  }

  public confirmOptimisticUpdate(id: string): boolean {
    return this.optimisticUpdates.confirm(id);
  }

  public rollbackOptimisticUpdate(id: string): boolean {
    return this.optimisticUpdates.rollback(id);
  }

  public getPendingOptimisticUpdates(): OptimisticUpdate[] {
    return this.optimisticUpdates.getAll();
  }

  public clearOptimisticUpdates(): void {
    this.optimisticUpdates.clear();
  }

  // Rate Limiting
  public setRateLimit(eventType: string, rateLimit: RateLimit): void {
    this.eventRouter.setRateLimit(eventType, rateLimit);
  }

  public removeRateLimit(eventType: string): boolean {
    return this.eventRouter.removeRateLimit(eventType);
  }

  // Statistics and Monitoring
  public getStats() {
    const health = this.getHealth();
    const queueStatus = this.connectionManager.getQueueStatus();
    
    return {
      connection: health,
      queue: queueStatus,
      subscriptions: {
        total: this.eventRouter.getSubscriptionCount(),
        byEventType: this.eventRouter.getEventTypes().reduce((acc, eventType) => {
          acc[eventType] = this.eventRouter.getSubscriptionCount(eventType);
          return acc;
        }, {} as Record<string, number>)
      },
      optimisticUpdates: {
        pending: this.optimisticUpdates.getPendingCount(),
        oldest: this.optimisticUpdates.getOldestUpdate()
      }
    };
  }

  // Utility Methods
  public retryFailedMessages(): void {
    this.connectionManager.retryFailedMessages();
  }

  public clearMessageQueue(): void {
    this.connectionManager.clearQueue();
  }

  public cleanup(): void {
    this.disconnect();
    this.eventRouter.cleanup();
    this.optimisticUpdates.clear();
    this.removeAllListeners();
  }

  // Event Forwarding Setup
  private setupEventForwarding(): void {
    // Forward connection events
    this.connectionManager.on('connection:state_change', (state) => {
      this.emit('connection:state_change', state);
    });

    this.connectionManager.on('connection:quality_change', (quality) => {
      this.emit('connection:quality_change', quality);
    });

    this.connectionManager.on('connection:error', (error) => {
      this.emit('connection:error', error);
    });

    // Route incoming messages
    this.connectionManager.on('message:received', (message) => {
      this.emit('message:received', message);
      this.eventRouter.route(message);
    });

    this.connectionManager.on('message:sent', (message) => {
      this.emit('message:sent', message);
    });

    this.connectionManager.on('message:failed', (message, error) => {
      this.emit('message:failed', message, error);
    });

    // Forward optimistic update events
    this.optimisticUpdates.on('optimistic:confirmed', (update) => {
      this.emit('optimistic:confirmed', update);
    });

    this.optimisticUpdates.on('optimistic:rollback', (update) => {
      this.emit('optimistic:rollback', update);
    });

    this.optimisticUpdates.on('optimistic:timeout', (update) => {
      this.emit('optimistic:timeout', update);
    });

    // Forward router events
    this.eventRouter.on('rate_limit_exceeded', (data) => {
      this.emit('rate_limit_exceeded', data);
    });

    this.eventRouter.on('callback_error', (data) => {
      this.emit('callback_error', data);
    });
  }

  // High-level convenience methods for specific use cases

  // Job Updates
  public subscribeToJobUpdates(
    callback: (data: { jobId: string; status: string; driverId?: string }) => void,
    options?: { throttle?: number }
  ): string {
    return this.subscribe('job:status_update', callback, options);
  }

  public subscribeToJobAssignments(
    callback: (data: { jobId: string; driverId: string }) => void
  ): string {
    return this.subscribe('job:assigned', callback);
  }

  // Driver Location Updates
  public subscribeToDriverLocations(
    callback: (data: { driverId: string; location: { latitude: number; longitude: number } }) => void,
    options?: { throttle?: number }
  ): string {
    return this.subscribe('driver:location_update', callback, options);
  }

  public subscribeToDriverAvailability(
    callback: (data: { driverId: string; isAvailable: boolean }) => void
  ): string {
    return this.subscribe('driver:availability_change', callback);
  }

  // Optimistic Job Operations
  public async updateJobStatusOptimistically(
    jobId: string,
    newStatus: string,
    currentData: unknown,
    rollbackData: unknown
  ): Promise<void> {
    let isRolledBack = false;
    
    const rollback = () => {
      if (!isRolledBack) {
        // Apply rollback logic here
        this.emit('job:optimistic_rollback', { jobId, data: rollbackData });
        isRolledBack = true;
      }
    };

    await this.send('job:update_status', { jobId, status: newStatus }, {
      optimistic: {
        id: `job_status_${jobId}`,
        rollback,
        timeout: 10000
      }
    });
  }

  public async assignJobOptimistically(
    jobId: string,
    driverId: string,
    rollbackData: unknown
  ): Promise<void> {
    let isRolledBack = false;
    
    const rollback = () => {
      if (!isRolledBack) {
        this.emit('job:assignment_rollback', { jobId, data: rollbackData });
        isRolledBack = true;
      }
    };

    await this.send('job:assign', { jobId, driverId }, {
      optimistic: {
        id: `job_assign_${jobId}`,
        rollback,
        timeout: 15000
      }
    });
  }
}