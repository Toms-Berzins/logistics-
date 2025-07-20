// WebSocket Event Types
export interface BaseEvent {
  timestamp: string;
  eventId: string;
}

export interface JobEvent extends BaseEvent {
  jobId: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  driverId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface DriverLocationEvent extends BaseEvent {
  driverId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  };
  status: 'available' | 'busy' | 'offline';
}

export interface DriverAvailabilityEvent extends BaseEvent {
  driverId: string;
  isAvailable: boolean;
  currentJobId?: string;
}

// WebSocket Connection States
export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type ConnectionQuality = 
  | 'excellent'  // < 100ms latency
  | 'good'      // 100-500ms latency
  | 'poor'      // > 500ms latency
  | 'offline';  // No connection

// Message Types
export interface RealtimeMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: string;
  messageId: string;
  retryCount?: number;
}

export interface OptimisticUpdate<T = unknown> {
  id: string;
  data: T;
  timestamp: string;
  rollback: () => void;
  confirm: () => void;
  timeout: number;
}

// Subscription Types
export interface EventSubscription {
  id: string;
  eventType: string;
  callback: (data: unknown) => void;
  options?: {
    priority?: 'high' | 'medium' | 'low';
    throttle?: number;
    debounce?: number;
  };
}

// Connection Configuration
export interface ConnectionConfig {
  url: string;
  autoConnect?: boolean;
  reconnectEnabled?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  reconnectBackoffFactor?: number;
  pingInterval?: number;
  pingTimeout?: number;
  messageQueueSize?: number;
  batchingEnabled?: boolean;
  batchSize?: number;
  batchInterval?: number;
}

// Rate Limiting
export interface RateLimit {
  maxRequests: number;
  windowMs: number;
  burst?: number;
}

// Error Types
export interface RealtimeError {
  code: string;
  message: string;
  timestamp: string;
  retryable: boolean;
  context?: Record<string, unknown>;
}

// Health Check
export interface ConnectionHealth {
  state: ConnectionState;
  quality: ConnectionQuality;
  latency: number;
  uptime: number;
  reconnectCount: number;
  lastError?: RealtimeError;
  messagesSent: number;
  messagesReceived: number;
  lastActivity: string;
}

// Event Handlers
export interface EventHandlers {
  'connection:state_change': (state: ConnectionState) => void;
  'connection:quality_change': (quality: ConnectionQuality) => void;
  'connection:error': (error: RealtimeError) => void;
  'message:received': (message: RealtimeMessage) => void;
  'message:sent': (message: RealtimeMessage) => void;
  'message:failed': (message: RealtimeMessage, error: RealtimeError) => void;
  'optimistic:timeout': (update: OptimisticUpdate) => void;
  'optimistic:confirmed': (update: OptimisticUpdate) => void;
  'optimistic:rollback': (update: OptimisticUpdate) => void;
}

// Queue Types
export interface MessageQueue {
  pending: RealtimeMessage[];
  failed: RealtimeMessage[];
  maxSize: number;
  retryPolicy: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
}