import Redis from 'ioredis';

// Enhanced Redis client specifically for tracking operations
export const trackingRedis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  // Enable pipeline for batch operations
  enableAutoPipelining: true,
  // Connection pool settings
  family: 4,
  keepAlive: 10000, // 10 seconds in ms, previously 'true'
  // Performance optimizations
  commandTimeout: 5000,
  connectTimeout: 10000,
});

// Redis key patterns for driver tracking
export const REDIS_KEYS = {
  DRIVER_LOCATION: (driverId: string) => `driver:location:${driverId}`,
  DRIVER_STATUS: (driverId: string) => `driver:status:${driverId}`,
  DRIVER_ROUTE: (driverId: string) => `driver:route:${driverId}`,
  NEARBY_DRIVERS: (lat: number, lng: number, radius: number) => 
    `nearby:${lat.toFixed(6)}:${lng.toFixed(6)}:${radius}`,
  ACTIVE_DRIVERS: 'drivers:active',
  COMPANY_DRIVERS: (companyId: string) => `company:${companyId}:drivers`,
} as const;

// Redis TTL constants (in seconds)
export const TTL = {
  DRIVER_LOCATION: 300, // 5 minutes
  DRIVER_STATUS: 600, // 10 minutes
  NEARBY_CACHE: 30, // 30 seconds
  ROUTE_CACHE: 1800, // 30 minutes
} as const;

// Event listeners for Redis
trackingRedis.on('connect', () => {
  console.log('✅ Tracking Redis connected');
});

trackingRedis.on('ready', () => {
  console.log('✅ Tracking Redis ready');
});

trackingRedis.on('error', (err) => {
  console.error('❌ Tracking Redis error:', err);
});

trackingRedis.on('close', () => {
  console.log('⚠️ Tracking Redis connection closed');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await trackingRedis.quit();
});

export default trackingRedis;