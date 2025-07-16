import trackingRedis from '../config/redisTracking';

export interface PerformanceMetrics {
  timestamp: Date;
  redisLatency: number;
  databaseLatency: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  activeConnections: number;
  locationUpdatesPerSecond: number;
  errorRate: number;
}

export interface PerformanceThresholds {
  redisLatencyMs: number;
  databaseLatencyMs: number;
  memoryUsageMB: number;
  cpuUsagePercent: number;
  errorRatePercent: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private locationUpdateCount = 0;
  private errorCount = 0;
  private totalRequests = 0;
  private startTime = Date.now();
  
  private thresholds: PerformanceThresholds = {
    redisLatencyMs: 10,
    databaseLatencyMs: 50,
    memoryUsageMB: 100,
    cpuUsagePercent: 80,
    errorRatePercent: 5,
  };

  // Track Redis performance
  async measureRedisLatency(): Promise<number> {
    const start = Date.now();
    try {
      await trackingRedis.ping();
      return Date.now() - start;
    } catch (error) {
      console.error('Redis ping failed:', error);
      return -1;
    }
  }

  // Track database performance (mock implementation)
  async measureDatabaseLatency(): Promise<number> {
    const start = Date.now();
    try {
      // This would be a simple query like SELECT 1
      // For now, return a mock value
      await new Promise(resolve => setTimeout(resolve, 1));
      return Date.now() - start;
    } catch (error) {
      console.error('Database ping failed:', error);
      return -1;
    }
  }

  // Get current CPU usage (approximation)
  getCurrentCpuUsage(): number {
    const usage = process.cpuUsage();
    const totalUsage = usage.user + usage.system;
    // Convert to percentage (this is a simplified calculation)
    return (totalUsage / 1000000) % 100;
  }

  // Record a location update
  recordLocationUpdate(): void {
    this.locationUpdateCount++;
    this.totalRequests++;
  }

  // Record an error
  recordError(): void {
    this.errorCount++;
    this.totalRequests++;
  }

  // Calculate location updates per second
  getLocationUpdatesPerSecond(): number {
    const timeElapsed = (Date.now() - this.startTime) / 1000;
    return this.locationUpdateCount / timeElapsed;
  }

  // Calculate error rate
  getErrorRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.errorCount / this.totalRequests) * 100;
  }

  // Collect current metrics
  async collectMetrics(): Promise<PerformanceMetrics> {
    const [redisLatency, databaseLatency] = await Promise.all([
      this.measureRedisLatency(),
      this.measureDatabaseLatency(),
    ]);

    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      redisLatency,
      databaseLatency,
      memoryUsage: process.memoryUsage(),
      cpuUsage: this.getCurrentCpuUsage(),
      activeConnections: 0, // Would be populated by connection tracking
      locationUpdatesPerSecond: this.getLocationUpdatesPerSecond(),
      errorRate: this.getErrorRate(),
    };

    // Store metrics (keep last 100 entries)
    this.metrics.push(metrics);
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    return metrics;
  }

  // Check if performance is within thresholds
  checkThresholds(metrics: PerformanceMetrics): string[] {
    const violations: string[] = [];

    if (metrics.redisLatency > this.thresholds.redisLatencyMs) {
      violations.push(`Redis latency too high: ${metrics.redisLatency}ms > ${this.thresholds.redisLatencyMs}ms`);
    }

    if (metrics.databaseLatency > this.thresholds.databaseLatencyMs) {
      violations.push(`Database latency too high: ${metrics.databaseLatency}ms > ${this.thresholds.databaseLatencyMs}ms`);
    }

    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > this.thresholds.memoryUsageMB) {
      violations.push(`Memory usage too high: ${memoryUsageMB.toFixed(2)}MB > ${this.thresholds.memoryUsageMB}MB`);
    }

    if (metrics.cpuUsage > this.thresholds.cpuUsagePercent) {
      violations.push(`CPU usage too high: ${metrics.cpuUsage.toFixed(2)}% > ${this.thresholds.cpuUsagePercent}%`);
    }

    if (metrics.errorRate > this.thresholds.errorRatePercent) {
      violations.push(`Error rate too high: ${metrics.errorRate.toFixed(2)}% > ${this.thresholds.errorRatePercent}%`);
    }

    return violations;
  }

  // Get performance summary
  getPerformanceSummary(): any {
    if (this.metrics.length === 0) {
      return { message: 'No metrics collected yet' };
    }

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const avgRedisLatency = this.metrics.reduce((sum, m) => sum + m.redisLatency, 0) / this.metrics.length;
    const avgDatabaseLatency = this.metrics.reduce((sum, m) => sum + m.databaseLatency, 0) / this.metrics.length;

    return {
      current: {
        timestamp: latestMetrics.timestamp,
        redisLatency: `${latestMetrics.redisLatency}ms`,
        databaseLatency: `${latestMetrics.databaseLatency}ms`,
        memoryUsage: `${(latestMetrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        cpuUsage: `${latestMetrics.cpuUsage.toFixed(2)}%`,
        locationUpdatesPerSecond: latestMetrics.locationUpdatesPerSecond.toFixed(2),
        errorRate: `${latestMetrics.errorRate.toFixed(2)}%`,
      },
      averages: {
        redisLatency: `${avgRedisLatency.toFixed(2)}ms`,
        databaseLatency: `${avgDatabaseLatency.toFixed(2)}ms`,
      },
      thresholds: this.thresholds,
      violations: this.checkThresholds(latestMetrics),
      totalMetricsCollected: this.metrics.length,
    };
  }

  // Start monitoring (collect metrics every 30 seconds)
  startMonitoring(): void {
    const collectInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        const violations = this.checkThresholds(metrics);
        
        if (violations.length > 0) {
          console.warn('Performance threshold violations:', violations);
        }
        
        // Log performance summary every 5 minutes
        if (this.metrics.length % 10 === 0) {
          console.log('Performance Summary:', this.getPerformanceSummary());
        }
        
      } catch (error) {
        console.error('Error collecting performance metrics:', error);
      }
    }, 30000); // 30 seconds

    // Cleanup on process exit
    process.on('SIGINT', () => {
      clearInterval(collectInterval);
      console.log('Performance monitoring stopped');
    });

    console.log('Performance monitoring started');
  }

  // Reset counters
  reset(): void {
    this.locationUpdateCount = 0;
    this.errorCount = 0;
    this.totalRequests = 0;
    this.startTime = Date.now();
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();