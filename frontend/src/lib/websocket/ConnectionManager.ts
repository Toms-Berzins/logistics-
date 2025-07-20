import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { 
  ConnectionConfig, 
  ConnectionState, 
  ConnectionQuality, 
  RealtimeMessage, 
  RealtimeError,
  ConnectionHealth,
  MessageQueue,
  EventHandlers
} from './types';

export class ConnectionManager extends EventEmitter {
  private socket: Socket | null = null;
  private config: Required<ConnectionConfig>;
  private state: ConnectionState = 'disconnected';
  private quality: ConnectionQuality = 'offline';
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private latency = 0;
  private connectTime = 0;
  private messageQueue: MessageQueue;
  private messagesSent = 0;
  private messagesReceived = 0;
  private lastActivity = new Date().toISOString();

  constructor(config: ConnectionConfig) {
    super();
    
    this.config = {
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
      batchInterval: 100,
      ...config
    };

    this.messageQueue = {
      pending: [],
      failed: [],
      maxSize: this.config.messageQueueSize,
      retryPolicy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2
      }
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  // Public Methods

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === 'connected' || this.state === 'connecting') {
        resolve();
        return;
      }

      this.setState('connecting');
      this.connectTime = Date.now();

      try {
        this.socket = io(this.config.url, {
          transports: ['websocket', 'polling'],
          timeout: this.config.pingTimeout,
          forceNew: true,
          autoConnect: false,
          reconnection: false // We handle reconnection manually
        });

        this.setupSocketListeners(resolve, reject);
        this.socket.connect();

      } catch (error) {
        const realtimeError = this.createError(
          'CONNECTION_FAILED',
          `Failed to create socket connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        );
        this.handleError(realtimeError);
        reject(realtimeError);
      }
    });
  }

  public disconnect(): void {
    this.config.reconnectEnabled = false;
    this.clearReconnectTimeout();
    this.clearPingInterval();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.setState('disconnected');
    this.setQuality('offline');
  }

  public send<T>(type: string, data: T, options?: { priority?: 'high' | 'medium' | 'low' }): Promise<void> {
    return new Promise((resolve, reject) => {
      const message: RealtimeMessage<T> = {
        type,
        data,
        timestamp: new Date().toISOString(),
        messageId: this.generateMessageId(),
        retryCount: 0
      };

      if (this.state !== 'connected' || !this.socket) {
        // Queue message for later sending
        this.queueMessage(message);
        resolve();
        return;
      }

      try {
        this.socket.emit(type, data, (acknowledgment?: { success: boolean; error?: string }) => {
          if (acknowledgment?.success === false) {
            const error = this.createError(
              'MESSAGE_FAILED',
              acknowledgment.error || 'Message failed to send',
              true
            );
            this.emit('message:failed', message, error);
            reject(error);
          } else {
            this.messagesSent++;
            this.updateActivity();
            this.emit('message:sent', message);
            resolve();
          }
        });
      } catch (error) {
        const realtimeError = this.createError(
          'SEND_ERROR',
          `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        );
        this.emit('message:failed', message, realtimeError);
        reject(realtimeError);
      }
    });
  }

  public getHealth(): ConnectionHealth {
    return {
      state: this.state,
      quality: this.quality,
      latency: this.latency,
      uptime: this.connectTime ? Date.now() - this.connectTime : 0,
      reconnectCount: this.reconnectAttempts,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      lastActivity: this.lastActivity
    };
  }

  public getQueueStatus() {
    return {
      pending: this.messageQueue.pending.length,
      failed: this.messageQueue.failed.length,
      maxSize: this.messageQueue.maxSize
    };
  }

  public retryFailedMessages(): void {
    const failedMessages = [...this.messageQueue.failed];
    this.messageQueue.failed = [];
    
    failedMessages.forEach(message => {
      this.queueMessage(message);
    });
    
    this.processQueue();
  }

  public clearQueue(): void {
    this.messageQueue.pending = [];
    this.messageQueue.failed = [];
  }

  // Private Methods

  private setupSocketListeners(resolve: () => void, reject: (error: RealtimeError) => void): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.setState('connected');
      this.setQuality('excellent');
      this.reconnectAttempts = 0;
      this.clearReconnectTimeout();
      this.startPingInterval();
      this.processQueue();
      resolve();
    });

    this.socket.on('disconnect', (reason: string) => {
      this.setState('disconnected');
      this.setQuality('offline');
      this.clearPingInterval();
      
      if (this.config.reconnectEnabled && reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      const realtimeError = this.createError(
        'CONNECTION_ERROR',
        `Connection error: ${error.message}`,
        true
      );
      this.handleError(realtimeError);
      
      if (this.state === 'connecting') {
        reject(realtimeError);
      }
      
      if (this.config.reconnectEnabled) {
        this.scheduleReconnect();
      }
    });

    this.socket.on('pong', () => {
      const now = Date.now();
      this.latency = now - this.lastPingTime;
      this.updateConnectionQuality();
      this.updateActivity();
    });

    // Handle incoming messages
    this.socket.onAny((eventType: string, data: unknown) => {
      if (['connect', 'disconnect', 'connect_error', 'pong'].includes(eventType)) {
        return; // Skip internal events
      }

      const message: RealtimeMessage = {
        type: eventType,
        data,
        timestamp: new Date().toISOString(),
        messageId: this.generateMessageId()
      };

      this.messagesReceived++;
      this.updateActivity();
      this.emit('message:received', message);
    });
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.emit('connection:state_change', newState);
    }
  }

  private setQuality(newQuality: ConnectionQuality): void {
    if (this.quality !== newQuality) {
      this.quality = newQuality;
      this.emit('connection:quality_change', newQuality);
    }
  }

  private updateConnectionQuality(): void {
    let newQuality: ConnectionQuality;
    
    if (this.state !== 'connected') {
      newQuality = 'offline';
    } else if (this.latency < 100) {
      newQuality = 'excellent';
    } else if (this.latency < 500) {
      newQuality = 'good';
    } else {
      newQuality = 'poor';
    }
    
    this.setQuality(newQuality);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      const error = this.createError(
        'MAX_RECONNECT_ATTEMPTS',
        'Maximum reconnection attempts reached',
        false
      );
      this.handleError(error);
      return;
    }

    this.setState('reconnecting');
    this.clearReconnectTimeout();

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.reconnectBackoffFactor, this.reconnectAttempts),
      this.config.maxReconnectInterval
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.warn('Reconnection attempt failed:', error);
      });
    }, delay);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startPingInterval(): void {
    this.clearPingInterval();
    
    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.lastPingTime = Date.now();
        this.socket.emit('ping');
      }
    }, this.config.pingInterval);
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private queueMessage(message: RealtimeMessage): void {
    if (this.messageQueue.pending.length >= this.messageQueue.maxSize) {
      // Remove oldest message to make room
      this.messageQueue.pending.shift();
    }
    
    this.messageQueue.pending.push(message);
  }

  private async processQueue(): Promise<void> {
    if (this.state !== 'connected' || this.messageQueue.pending.length === 0) {
      return;
    }

    const messagesToProcess = [...this.messageQueue.pending];
    this.messageQueue.pending = [];

    for (const message of messagesToProcess) {
      try {
        await this.send(message.type, message.data);
      } catch (error) {
        message.retryCount = (message.retryCount || 0) + 1;
        
        if (message.retryCount < this.messageQueue.retryPolicy.maxRetries) {
          // Add back to pending queue for retry
          this.queueMessage(message);
        } else {
          // Move to failed queue
          this.messageQueue.failed.push(message);
        }
      }
    }
  }

  private handleError(error: RealtimeError): void {
    this.emit('connection:error', error);
  }

  private createError(code: string, message: string, retryable: boolean): RealtimeError {
    return {
      code,
      message,
      timestamp: new Date().toISOString(),
      retryable
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateActivity(): void {
    this.lastActivity = new Date().toISOString();
  }

  // Event Emitter Type Safety
  public on<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.on(event, listener);
  }

  public emit<K extends keyof EventHandlers>(event: K, ...args: Parameters<EventHandlers[K]>): boolean {
    return super.emit(event, ...args);
  }

  public off<K extends keyof EventHandlers>(event: K, listener: EventHandlers[K]): this {
    return super.off(event, listener);
  }
}