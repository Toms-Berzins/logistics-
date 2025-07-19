import { redisClient } from '../config/redis';
import { databaseConfig } from '../config/database';
import { SubscriptionUsageLog, GeoPoint } from '../models/Subscription';
import { StripeService } from './StripeService';

export class UsageTrackingService {
  private stripeService: StripeService;

  constructor() {
    this.stripeService = new StripeService();
  }

  /**
   * Track a usage event and update Redis counters
   */
  async trackUsage(
    organizationId: string,
    eventType: string,
    eventDetails: Record<string, any>,
    location?: GeoPoint,
    userId?: string
  ): Promise<{ success: boolean; withinLimits: boolean; currentUsage?: any }> {
    try {
      // Validate usage limits first
      const withinLimits = await this.stripeService.validateUsageLimits(organizationId, eventType);
      
      if (!withinLimits) {
        return {
          success: false,
          withinLimits: false
        };
      }

      // Update Redis counters
      await this.updateRedisCounters(organizationId, eventType);

      // Log the usage event
      await this.logUsageEvent(organizationId, eventType, eventDetails, location, userId);

      // Get current usage
      const currentUsage = await this.getCurrentUsage(organizationId);

      return {
        success: true,
        withinLimits: true,
        currentUsage
      };
    } catch (error) {
      console.error('Usage tracking error:', error);
      return {
        success: false,
        withinLimits: false
      };
    }
  }

  /**
   * Update Redis counters for usage tracking
   */
  private async updateRedisCounters(organizationId: string, eventType: string): Promise<void> {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

    try {
      const multi = redisClient.multi();

      // Monthly counters
      multi.incr(`usage:${organizationId}:${eventType}:${month}`);
      multi.expire(`usage:${organizationId}:${eventType}:${month}`, 2592000); // 30 days

      // Daily counters (for more granular tracking)
      multi.incr(`usage:${organizationId}:${eventType}:${day}`);
      multi.expire(`usage:${organizationId}:${eventType}:${day}`, 86400); // 24 hours

      // Real-time counters (for immediate limit checking)
      multi.incr(`usage:${organizationId}:${eventType}:current`);
      multi.expire(`usage:${organizationId}:${eventType}:current`, 3600); // 1 hour

      await multi.exec();
    } catch (error) {
      console.error('Redis counter update error:', error);
      throw error;
    }
  }

  /**
   * Get current usage from Redis counters
   */
  async getCurrentUsage(organizationId: string): Promise<any> {
    const month = new Date().toISOString().slice(0, 7);

    try {
      const multi = redisClient.multi();

      // Get monthly counters for all event types
      const eventTypes = ['driver_added', 'route_created', 'delivery_created', 'api_call', 'geofence_created'];
      eventTypes.forEach(eventType => {
        multi.get(`usage:${organizationId}:${eventType}:${month}`);
      });

      const results = await multi.exec();
      
      return {
        drivers: parseInt(((results as any)?.[0]?.[1] as string) || '0'),
        routes: parseInt(((results as any)?.[1]?.[1] as string) || '0'),
        deliveries: parseInt(((results as any)?.[2]?.[1] as string) || '0'),
        apiCalls: parseInt(((results as any)?.[3]?.[1] as string) || '0'),
        geofences: parseInt(((results as any)?.[4]?.[1] as string) || '0'),
        month
      };
    } catch (error) {
      console.error('Get current usage error:', error);
      return {
        drivers: 0,
        routes: 0,
        deliveries: 0,
        apiCalls: 0,
        geofences: 0,
        month
      };
    }
  }

  /**
   * Log usage event to database for audit and analytics
   */
  private async logUsageEvent(
    organizationId: string,
    eventType: string,
    eventDetails: Record<string, any>,
    location?: GeoPoint,
    userId?: string
  ): Promise<void> {
    try {
      const client = await databaseConfig.connect();
      try {
        // Get subscription ID
        const subResult = await client.query(
          'SELECT id FROM subscriptions WHERE organization_id = $1 AND status = $2',
          [organizationId, 'active']
        );

        const subscriptionId = subResult.rows.length > 0 ? subResult.rows[0].id : null;

        const logId = this.generateId();
        const query = `
          INSERT INTO subscription_usage_logs (
            id,
            subscription_id,
            organization_id,
            event_type,
            event_details,
            location,
            user_id,
            timestamp,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
        `;

        const locationPoint = location ? `POINT(${location.longitude} ${location.latitude})` : null;

        await client.query(query, [
          logId,
          subscriptionId,
          organizationId,
          eventType,
          JSON.stringify(eventDetails),
          locationPoint,
          userId,
          JSON.stringify({ source: 'usage_tracking_service' })
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Usage event logging error:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Get usage analytics for a time period
   */
  async getUsageAnalytics(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const client = await databaseConfig.connect();
      try {
        const query = `
          SELECT 
            event_type,
            DATE(timestamp) as date,
            COUNT(*) as count,
            COUNT(DISTINCT user_id) as unique_users
          FROM subscription_usage_logs
          WHERE organization_id = $1
            AND timestamp >= $2
            AND timestamp <= $3
          GROUP BY event_type, DATE(timestamp)
          ORDER BY date DESC, event_type
        `;

        const result = await client.query(query, [organizationId, startDate, endDate]);

        // Group by event type
        const analytics = result.rows.reduce((acc, row) => {
          if (!acc[row.event_type]) {
            acc[row.event_type] = [];
          }
          acc[row.event_type].push({
            date: row.date,
            count: parseInt(row.count),
            uniqueUsers: parseInt(row.unique_users)
          });
          return acc;
        }, {});

        return analytics;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Usage analytics error:', error);
      return {};
    }
  }

  /**
   * Get geographic usage distribution
   */
  async getGeographicUsage(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    try {
      const client = await databaseConfig.connect();
      try {
        const query = `
          SELECT 
            event_type,
            ST_X(location) as longitude,
            ST_Y(location) as latitude,
            COUNT(*) as count
          FROM subscription_usage_logs
          WHERE organization_id = $1
            AND timestamp >= $2
            AND timestamp <= $3
            AND location IS NOT NULL
          GROUP BY event_type, ST_X(location), ST_Y(location)
          ORDER BY count DESC
          LIMIT 1000
        `;

        const result = await client.query(query, [organizationId, startDate, endDate]);

        return result.rows.map(row => ({
          eventType: row.event_type,
          location: {
            longitude: parseFloat(row.longitude),
            latitude: parseFloat(row.latitude)
          },
          count: parseInt(row.count)
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Geographic usage error:', error);
      return [];
    }
  }

  /**
   * Reset monthly usage counters (called at the beginning of each month)
   */
  async resetMonthlyCounters(organizationId: string): Promise<void> {
    try {
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const prevMonthKey = previousMonth.toISOString().slice(0, 7);

      const eventTypes = ['driver_added', 'route_created', 'delivery_created', 'api_call', 'geofence_created'];
      
      const multi = redisClient.multi();
      eventTypes.forEach(eventType => {
        multi.del(`usage:${organizationId}:${eventType}:${prevMonthKey}`);
      });

      await multi.exec();
      
      console.log(`Reset monthly counters for organization ${organizationId}`);
    } catch (error) {
      console.error('Reset monthly counters error:', error);
    }
  }

  /**
   * Get real-time usage status for rate limiting
   */
  async getRealTimeUsage(organizationId: string): Promise<any> {
    try {
      const eventTypes = ['driver_added', 'route_created', 'delivery_created', 'api_call', 'geofence_created'];
      
      const multi = redisClient.multi();
      eventTypes.forEach(eventType => {
        multi.get(`usage:${organizationId}:${eventType}:current`);
      });

      const results = await multi.exec();
      
      return {
        drivers: parseInt(((results as any)?.[0]?.[1] as string) || '0'),
        routes: parseInt(((results as any)?.[1]?.[1] as string) || '0'),
        deliveries: parseInt(((results as any)?.[2]?.[1] as string) || '0'),
        apiCalls: parseInt(((results as any)?.[3]?.[1] as string) || '0'),
        geofences: parseInt(((results as any)?.[4]?.[1] as string) || '0'),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Real-time usage error:', error);
      return {
        drivers: 0,
        routes: 0,
        deliveries: 0,
        apiCalls: 0,
        geofences: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Batch update usage (for bulk operations)
   */
  async batchUpdateUsage(
    organizationId: string,
    events: Array<{
      eventType: string;
      eventDetails: Record<string, any>;
      location?: GeoPoint;
      userId?: string;
    }>
  ): Promise<{ success: boolean; processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    try {
      // First validate all events against limits
      const validationResults = await Promise.all(
        events.map(event => 
          this.stripeService.validateUsageLimits(organizationId, event.eventType)
        )
      );

      // Filter out events that exceed limits
      const validEvents = events.filter((_, index) => validationResults[index]);
      
      // Update Redis counters in batch
      const month = new Date().toISOString().slice(0, 7);
      const day = new Date().toISOString().slice(0, 10);
      const multi = redisClient.multi();

      validEvents.forEach(event => {
        multi.incr(`usage:${organizationId}:${event.eventType}:${month}`);
        multi.expire(`usage:${organizationId}:${event.eventType}:${month}`, 2592000);
        multi.incr(`usage:${organizationId}:${event.eventType}:${day}`);
        multi.expire(`usage:${organizationId}:${event.eventType}:${day}`, 86400);
        multi.incr(`usage:${organizationId}:${event.eventType}:current`);
        multi.expire(`usage:${organizationId}:${event.eventType}:current`, 3600);
      });

      await multi.exec();

      // Log events to database
      await Promise.all(
        validEvents.map(event =>
          this.logUsageEvent(
            organizationId,
            event.eventType,
            event.eventDetails,
            event.location,
            event.userId
          ).then(() => processed++).catch(() => failed++)
        )
      );

      return { success: true, processed, failed };
    } catch (error) {
      console.error('Batch usage update error:', error);
      return { success: false, processed, failed: events.length };
    }
  }

  private generateId(): string {
    return 'log_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}