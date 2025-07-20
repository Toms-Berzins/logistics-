import { RealtimeClient } from './RealtimeClient';
import { ConnectionConfig } from './types';

interface PerformanceMetrics {
  connectionTime: number;
  messageLatency: {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: {
    messagesPerSecond: number;
    bytesPerSecond: number;
  };
  reliability: {
    messagesSent: number;
    messagesReceived: number;
    messagesLost: number;
    successRate: number;
  };
  reconnection: {
    attempts: number;
    totalDowntime: number;
    averageReconnectTime: number;
  };
}

interface TestConfig {
  duration: number; // Test duration in ms
  messageInterval: number; // Interval between messages in ms
  messageSize: number; // Size of test messages in bytes
  connectionInterruptions: number; // Number of forced disconnections
  concurrentSubscriptions: number; // Number of concurrent subscriptions
}

export class PerformanceTester {
  private client: RealtimeClient;
  private metrics: Partial<PerformanceMetrics> = {};
  private testStartTime = 0;
  private latencies: number[] = [];
  private messagesSent = 0;
  private messagesReceived = 0;
  private bytesSent = 0;
  private bytesReceived = 0;
  private reconnectTimes: number[] = [];
  private totalDowntime = 0;
  private lastDisconnectTime = 0;

  constructor(config: ConnectionConfig) {
    this.client = new RealtimeClient(config);
    this.setupMetricsCollection();
  }

  private setupMetricsCollection(): void {
    this.client.on('connection:state_change', (state) => {
      if (state === 'disconnected' && this.lastDisconnectTime === 0) {
        this.lastDisconnectTime = Date.now();
      } else if (state === 'connected' && this.lastDisconnectTime > 0) {
        const reconnectTime = Date.now() - this.lastDisconnectTime;
        this.reconnectTimes.push(reconnectTime);
        this.totalDowntime += reconnectTime;
        this.lastDisconnectTime = 0;
      }
    });

    this.client.on('message:sent', () => {
      this.messagesSent++;
    });

    this.client.on('message:received', () => {
      this.messagesReceived++;
    });
  }

  public async runPerformanceTest(config: TestConfig): Promise<PerformanceMetrics> {
    console.log('Starting performance test...', config);
    
    this.resetMetrics();
    this.testStartTime = Date.now();

    // Connect and measure connection time
    const connectionStart = Date.now();
    await this.client.connect();
    const connectionTime = Date.now() - connectionStart;

    // Set up test subscriptions
    this.setupTestSubscriptions(config.concurrentSubscriptions);

    // Run the test
    await this.runTest(config);

    // Calculate final metrics
    const finalMetrics = this.calculateMetrics(config, connectionTime);
    
    // Cleanup
    this.client.disconnect();
    
    return finalMetrics;
  }

  private resetMetrics(): void {
    this.latencies = [];
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.bytesSent = 0;
    this.bytesReceived = 0;
    this.reconnectTimes = [];
    this.totalDowntime = 0;
    this.lastDisconnectTime = 0;
  }

  private setupTestSubscriptions(count: number): void {
    for (let i = 0; i < count; i++) {
      this.client.subscribe(`test:event_${i}`, (data: unknown) => {
        // Measure latency if this is a test message
        if (typeof data === 'object' && data && 'timestamp' in data) {
          const latency = Date.now() - (data as any).timestamp;
          this.latencies.push(latency);
        }
        
        // Estimate bytes received
        this.bytesReceived += JSON.stringify(data).length;
      });
    }
  }

  private async runTest(config: TestConfig): Promise<void> {
    const endTime = this.testStartTime + config.duration;
    let messageCounter = 0;
    
    // Schedule connection interruptions
    this.scheduleConnectionInterruptions(config);

    // Send messages at specified interval
    const messageInterval = setInterval(async () => {
      if (Date.now() >= endTime) {
        clearInterval(messageInterval);
        return;
      }

      const testMessage = {
        id: messageCounter++,
        timestamp: Date.now(),
        data: this.generateTestData(config.messageSize)
      };

      try {
        await this.client.send('test:message', testMessage);
        this.bytesSent += JSON.stringify(testMessage).length;
      } catch (error) {
        console.warn('Failed to send test message:', error);
      }
    }, config.messageInterval);

    // Wait for test completion
    await new Promise(resolve => {
      setTimeout(resolve, config.duration);
    });

    clearInterval(messageInterval);
  }

  private scheduleConnectionInterruptions(config: TestConfig): void {
    if (config.connectionInterruptions === 0) return;

    const intervalBetweenInterruptions = config.duration / config.connectionInterruptions;
    
    for (let i = 0; i < config.connectionInterruptions; i++) {
      setTimeout(() => {
        console.log(`Simulating connection interruption ${i + 1}`);
        this.client.disconnect();
        
        // Reconnect after a short delay
        setTimeout(() => {
          this.client.connect().catch(error => {
            console.error('Reconnection failed:', error);
          });
        }, 1000 + Math.random() * 2000); // 1-3 second delay
      }, intervalBetweenInterruptions * (i + 1));
    }
  }

  private generateTestData(sizeBytes: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < sizeBytes; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  private calculateMetrics(config: TestConfig, connectionTime: number): PerformanceMetrics {
    const testDuration = Date.now() - this.testStartTime;
    const testDurationSeconds = testDuration / 1000;

    // Calculate latency metrics
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const latencyMetrics = {
      min: sortedLatencies[0] || 0,
      max: sortedLatencies[sortedLatencies.length - 1] || 0,
      avg: sortedLatencies.length > 0 ? 
        sortedLatencies.reduce((sum, lat) => sum + lat, 0) / sortedLatencies.length : 0,
      p95: sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0,
      p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0
    };

    // Calculate throughput
    const throughputMetrics = {
      messagesPerSecond: this.messagesSent / testDurationSeconds,
      bytesPerSecond: this.bytesSent / testDurationSeconds
    };

    // Calculate reliability
    const reliabilityMetrics = {
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      messagesLost: this.messagesSent - this.messagesReceived,
      successRate: this.messagesSent > 0 ? this.messagesReceived / this.messagesSent : 0
    };

    // Calculate reconnection metrics
    const reconnectionMetrics = {
      attempts: this.reconnectTimes.length,
      totalDowntime: this.totalDowntime,
      averageReconnectTime: this.reconnectTimes.length > 0 ?
        this.reconnectTimes.reduce((sum, time) => sum + time, 0) / this.reconnectTimes.length : 0
    };

    return {
      connectionTime,
      messageLatency: latencyMetrics,
      throughput: throughputMetrics,
      reliability: reliabilityMetrics,
      reconnection: reconnectionMetrics
    };
  }

  // Utility method for quick performance checks
  public static async quickTest(url: string): Promise<{
    connectionTime: number;
    pingLatency: number;
    isHealthy: boolean;
  }> {
    const client = new RealtimeClient({ url, autoConnect: false });
    
    try {
      // Test connection time
      const connectionStart = Date.now();
      await client.connect();
      const connectionTime = Date.now() - connectionStart;

      // Test ping latency
      const pingStart = Date.now();
      await client.send('ping', {});
      const pingLatency = Date.now() - pingStart;

      client.disconnect();

      return {
        connectionTime,
        pingLatency,
        isHealthy: connectionTime < 5000 && pingLatency < 1000
      };
    } catch (error) {
      client.disconnect();
      throw error;
    }
  }

  // Stress test with multiple concurrent clients
  public static async stressTest(config: {
    url: string;
    clientCount: number;
    messagesPerClient: number;
    duration: number;
  }): Promise<{
    successfulConnections: number;
    totalMessages: number;
    averageLatency: number;
    errorRate: number;
  }> {
    const clients: RealtimeClient[] = [];
    const results = {
      successfulConnections: 0,
      totalMessages: 0,
      latencies: [] as number[],
      errors: 0
    };

    console.log(`Starting stress test with ${config.clientCount} clients...`);

    // Create and connect clients
    const connectionPromises = Array.from({ length: config.clientCount }, async (_, index) => {
      const client = new RealtimeClient({ 
        url: config.url, 
        autoConnect: false,
        reconnectEnabled: false
      });
      
      clients.push(client);

      try {
        await client.connect();
        results.successfulConnections++;

        // Set up message tracking
        client.on('message:received', () => {
          results.totalMessages++;
        });

        return client;
      } catch (error) {
        results.errors++;
        console.error(`Client ${index} failed to connect:`, error);
        return null;
      }
    });

    const connectedClients = (await Promise.all(connectionPromises))
      .filter((client): client is RealtimeClient => client !== null);

    // Send messages from each client
    const messagePromises = connectedClients.map(async (client, index) => {
      for (let i = 0; i < config.messagesPerClient; i++) {
        try {
          const start = Date.now();
          await client.send('stress:test', { clientId: index, messageId: i });
          results.latencies.push(Date.now() - start);
        } catch (error) {
          results.errors++;
        }
        
        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    // Wait for all messages to be sent or timeout
    await Promise.race([
      Promise.all(messagePromises),
      new Promise(resolve => setTimeout(resolve, config.duration))
    ]);

    // Cleanup
    clients.forEach(client => client.disconnect());

    return {
      successfulConnections: results.successfulConnections,
      totalMessages: results.totalMessages,
      averageLatency: results.latencies.length > 0 ?
        results.latencies.reduce((sum, lat) => sum + lat, 0) / results.latencies.length : 0,
      errorRate: results.errors / (config.clientCount * config.messagesPerClient)
    };
  }
}

// Performance testing utilities
export const performanceUtils = {
  // Test target: <100ms update propagation
  async testUpdatePropagation(client: RealtimeClient): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      
      client.subscribe('test:propagation', () => {
        resolve(Date.now() - start);
      });
      
      client.send('test:propagation', { timestamp: start });
    });
  },

  // Test target: 99.9% message delivery
  async testMessageDelivery(client: RealtimeClient, messageCount = 1000): Promise<number> {
    let received = 0;
    
    return new Promise((resolve) => {
      client.subscribe('test:delivery', () => {
        received++;
        if (received === messageCount) {
          resolve(received / messageCount);
        }
      });
      
      // Send messages
      for (let i = 0; i < messageCount; i++) {
        client.send('test:delivery', { id: i });
      }
      
      // Timeout after 30 seconds
      setTimeout(() => resolve(received / messageCount), 30000);
    });
  },

  // Test target: <16ms UI update response (optimistic updates)
  measureOptimisticUpdateTime(): number {
    const start = performance.now();
    
    // Simulate optimistic UI update
    const element = document.createElement('div');
    element.textContent = 'Updated';
    document.body.appendChild(element);
    
    // Trigger reflow/repaint
    element.offsetHeight;
    
    document.body.removeChild(element);
    return performance.now() - start;
  },

  // Benchmark different throttling strategies
  async benchmarkThrottling(client: RealtimeClient): Promise<{
    noThrottle: number;
    throttle100ms: number;
    throttle500ms: number;
    throttle1000ms: number;
  }> {
    const results = {
      noThrottle: 0,
      throttle100ms: 0,
      throttle500ms: 0,
      throttle1000ms: 0
    };

    const testThrottle = async (throttleMs: number): Promise<number> => {
      let updateCount = 0;
      const start = Date.now();
      
      const subscription = client.subscribe('test:throttle', () => {
        updateCount++;
      }, { throttle: throttleMs });
      
      // Send 100 messages rapidly
      for (let i = 0; i < 100; i++) {
        await client.send('test:throttle', { id: i });
      }
      
      // Wait for throttled updates to complete
      await new Promise(resolve => setTimeout(resolve, Math.max(throttleMs * 2, 2000)));
      
      client.unsubscribe(subscription);
      return updateCount;
    };

    results.noThrottle = await testThrottle(0);
    results.throttle100ms = await testThrottle(100);
    results.throttle500ms = await testThrottle(500);
    results.throttle1000ms = await testThrottle(1000);

    return results;
  }
};