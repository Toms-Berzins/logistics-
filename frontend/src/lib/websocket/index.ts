// Main exports
export { RealtimeClient } from './RealtimeClient';
export { ConnectionManager } from './ConnectionManager';
export { EventRouter } from './EventRouter';
export { OptimisticUpdatesManager } from './OptimisticUpdates';

// Type exports
export type {
  ConnectionConfig,
  ConnectionState,
  ConnectionQuality,
  RealtimeMessage,
  RealtimeError,
  ConnectionHealth,
  EventSubscription,
  OptimisticUpdate,
  RateLimit,
  MessageQueue,
  EventHandlers,
  BaseEvent,
  JobEvent,
  DriverLocationEvent,
  DriverAvailabilityEvent
} from './types';

// Default configuration
export const DEFAULT_CONFIG: Partial<ConnectionConfig> = {
  autoConnect: true,
  reconnectEnabled: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
  reconnectBackoffFactor: 1.5,
  pingInterval: 5000,
  pingTimeout: 10000,
  messageQueueSize: 1000,
  batchingEnabled: false,
  batchSize: 10,
  batchInterval: 100
};

// Factory function for creating a realtime client
export function createRealtimeClient(config: ConnectionConfig): RealtimeClient {
  const fullConfig = {
    ...DEFAULT_CONFIG,
    ...config
  } as ConnectionConfig;
  
  return new RealtimeClient(fullConfig);
}