import { Server as SocketIOServer } from 'socket.io';
import { redisClient } from '../config/redis';
import { databaseConfig } from '../config/database';

export interface SubscriptionNotification {
  type: 'subscription_updated' | 'usage_limit_reached' | 'payment_failed' | 'trial_ending' | 'subscription_canceled';
  organizationId: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class SubscriptionNotificationService {
  private io: SocketIOServer;
  private connectedClients: Map<string, Set<string>> = new Map(); // organizationId -> socket IDs

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Handle client subscription to organization updates
      socket.on('subscribe_to_organization', async (data: { organizationId: string, token: string }) => {
        try {
          // Verify the token and organization access
          const isAuthorized = await this.verifyOrganizationAccess(data.organizationId, data.token);
          
          if (!isAuthorized) {
            socket.emit('error', { message: 'Unauthorized access to organization' });
            return;
          }

          // Add client to organization room
          socket.join(`org:${data.organizationId}`);
          
          // Track connected clients
          if (!this.connectedClients.has(data.organizationId)) {
            this.connectedClients.set(data.organizationId, new Set());
          }
          this.connectedClients.get(data.organizationId)!.add(socket.id);

          // Store organization ID in socket data
          socket.data.organizationId = data.organizationId;

          // Send current subscription status
          const subscriptionStatus = await this.getCurrentSubscriptionStatus(data.organizationId);
          socket.emit('subscription_status', subscriptionStatus);

          // Send any pending notifications
          const pendingNotifications = await this.getPendingNotifications(data.organizationId);
          if (pendingNotifications.length > 0) {
            socket.emit('pending_notifications', pendingNotifications);
          }

          console.log(`Socket ${socket.id} subscribed to organization ${data.organizationId}`);
        } catch (error) {
          console.error('Subscription error:', error);
          socket.emit('error', { message: 'Failed to subscribe to organization updates' });
        }
      });

      // Handle unsubscribe
      socket.on('unsubscribe_from_organization', (data: { organizationId: string }) => {
        socket.leave(`org:${data.organizationId}`);
        
        if (this.connectedClients.has(data.organizationId)) {
          this.connectedClients.get(data.organizationId)!.delete(socket.id);
        }

        console.log(`Socket ${socket.id} unsubscribed from organization ${data.organizationId}`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.data.organizationId) {
          const orgId = socket.data.organizationId;
          if (this.connectedClients.has(orgId)) {
            this.connectedClients.get(orgId)!.delete(socket.id);
            if (this.connectedClients.get(orgId)!.size === 0) {
              this.connectedClients.delete(orgId);
            }
          }
        }
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Send notification to all clients subscribed to an organization
   */
  async sendNotification(notification: SubscriptionNotification): Promise<void> {
    try {
      // Store notification in Redis for persistence
      await this.storeNotification(notification);

      // Send to connected clients
      this.io.to(`org:${notification.organizationId}`).emit('subscription_notification', {
        ...notification,
        id: this.generateNotificationId(),
        timestamp: notification.timestamp.toISOString()
      });

      // Log notification for analytics
      await this.logNotification(notification);

      console.log(`Sent ${notification.type} notification to organization ${notification.organizationId}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  /**
   * Send subscription status update
   */
  async sendSubscriptionUpdate(
    organizationId: string,
    subscriptionData: {
      status: string;
      tier: string;
      billingCycle: string;
      currentPeriodEnd: Date;
      features: string[];
      limits: any;
      usage: any;
    }
  ): Promise<void> {
    const notification: SubscriptionNotification = {
      type: 'subscription_updated',
      organizationId,
      data: subscriptionData,
      timestamp: new Date(),
      priority: 'medium'
    };

    await this.sendNotification(notification);

    // Update cached subscription status
    await this.cacheSubscriptionStatus(organizationId, subscriptionData);
  }

  /**
   * Send usage limit warning
   */
  async sendUsageLimitWarning(
    organizationId: string,
    limitType: string,
    currentUsage: number,
    limit: number,
    percentage: number
  ): Promise<void> {
    const priority = percentage >= 90 ? 'critical' : percentage >= 75 ? 'high' : 'medium';
    
    const notification: SubscriptionNotification = {
      type: 'usage_limit_reached',
      organizationId,
      data: {
        limitType,
        currentUsage,
        limit,
        percentage,
        message: `${limitType} usage is at ${percentage.toFixed(1)}% of your plan limit`
      },
      timestamp: new Date(),
      priority
    };

    await this.sendNotification(notification);
  }

  /**
   * Send payment failure notification
   */
  async sendPaymentFailure(
    organizationId: string,
    invoiceData: {
      amount: number;
      currency: string;
      attemptCount: number;
      nextRetryDate?: Date;
    }
  ): Promise<void> {
    const notification: SubscriptionNotification = {
      type: 'payment_failed',
      organizationId,
      data: {
        ...invoiceData,
        message: `Payment of ${invoiceData.amount / 100} ${invoiceData.currency.toUpperCase()} failed. Attempt ${invoiceData.attemptCount}.`
      },
      timestamp: new Date(),
      priority: 'critical'
    };

    await this.sendNotification(notification);
  }

  /**
   * Send trial ending notification
   */
  async sendTrialEndingNotification(
    organizationId: string,
    daysRemaining: number
  ): Promise<void> {
    const priority = daysRemaining <= 1 ? 'critical' : daysRemaining <= 3 ? 'high' : 'medium';
    
    const notification: SubscriptionNotification = {
      type: 'trial_ending',
      organizationId,
      data: {
        daysRemaining,
        message: daysRemaining === 0 
          ? 'Your trial ends today. Please add a payment method to continue service.'
          : `Your trial ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}.`
      },
      timestamp: new Date(),
      priority
    };

    await this.sendNotification(notification);
  }

  /**
   * Send subscription cancellation notification
   */
  async sendSubscriptionCancellation(
    organizationId: string,
    cancellationData: {
      effectiveDate: Date;
      reason?: string;
      cancelAtPeriodEnd: boolean;
    }
  ): Promise<void> {
    const notification: SubscriptionNotification = {
      type: 'subscription_canceled',
      organizationId,
      data: {
        ...cancellationData,
        message: cancellationData.cancelAtPeriodEnd 
          ? `Your subscription will be canceled on ${cancellationData.effectiveDate.toDateString()}`
          : 'Your subscription has been canceled immediately'
      },
      timestamp: new Date(),
      priority: 'high'
    };

    await this.sendNotification(notification);
  }

  /**
   * Get connected clients count for an organization
   */
  getConnectedClientsCount(organizationId: string): number {
    return this.connectedClients.get(organizationId)?.size || 0;
  }

  /**
   * Get all connected organizations
   */
  getConnectedOrganizations(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  private async verifyOrganizationAccess(organizationId: string, token: string): Promise<boolean> {
    try {
      // This would integrate with your existing auth system
      // For now, we'll do a basic check
      
      // Decode the JWT token and verify organization access
      // This is a placeholder - implement according to your auth system
      return true;
    } catch (error) {
      console.error('Organization access verification failed:', error);
      return false;
    }
  }

  private async getCurrentSubscriptionStatus(organizationId: string): Promise<any> {
    try {
      // Try cache first
      const cached = await redisClient.get(`subscription:org:${organizationId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const client = await databaseConfig.connect();
      try {
        const result = await client.query(
          'SELECT status, tier, billing_cycle, current_period_end, features, limits, usage FROM subscriptions WHERE organization_id = $1 AND status != $2',
          [organizationId, 'canceled']
        );

        if (result.rows.length > 0) {
          const subscription = result.rows[0];
          const statusData = {
            status: subscription.status,
            tier: subscription.tier,
            billingCycle: subscription.billing_cycle,
            currentPeriodEnd: subscription.current_period_end?.toISOString(),
            features: typeof subscription.features === 'string' 
              ? JSON.parse(subscription.features) 
              : subscription.features,
            limits: typeof subscription.limits === 'string'
              ? JSON.parse(subscription.limits)
              : subscription.limits,
            usage: typeof subscription.usage === 'string'
              ? JSON.parse(subscription.usage)
              : subscription.usage
          };

          // Cache for 5 minutes
          await this.cacheSubscriptionStatus(organizationId, statusData);
          return statusData;
        }

        return { status: 'inactive', tier: 'starter' };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      return { status: 'unknown', tier: 'starter' };
    }
  }

  private async getPendingNotifications(organizationId: string): Promise<any[]> {
    try {
      const notifications = await redisClient.lRange(`notifications:${organizationId}`, 0, 9); // Get latest 10
      return notifications.map((n: string) => JSON.parse(n));
    } catch (error) {
      console.error('Failed to get pending notifications:', error);
      return [];
    }
  }

  private async storeNotification(notification: SubscriptionNotification): Promise<void> {
    try {
      const key = `notifications:${notification.organizationId}`;
      const notificationData = JSON.stringify({
        ...notification,
        id: this.generateNotificationId(),
        timestamp: notification.timestamp.toISOString()
      });

      // Store in Redis list (keep latest 50 notifications)
      await redisClient.lPush(key, notificationData);
      await redisClient.lTrim(key, 0, 49);
      await redisClient.expire(key, 86400); // Expire after 24 hours
    } catch (error) {
      console.error('Failed to store notification:', error);
    }
  }

  private async logNotification(notification: SubscriptionNotification): Promise<void> {
    try {
      const client = await databaseConfig.connect();
      try {
        await client.query(`
          INSERT INTO subscription_usage_logs (
            id,
            subscription_id,
            organization_id,
            event_type,
            event_details,
            timestamp,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          this.generateNotificationId(),
          null, // We might not have subscription_id in all cases
          notification.organizationId,
          `notification_${notification.type}`,
          JSON.stringify(notification.data),
          notification.timestamp,
          JSON.stringify({ 
            priority: notification.priority,
            source: 'notification_service',
            connectedClients: this.getConnectedClientsCount(notification.organizationId)
          })
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  private async cacheSubscriptionStatus(organizationId: string, data: any): Promise<void> {
    try {
      await redisClient.setEx(
        `subscription:org:${organizationId}`,
        300, // 5 minutes TTL
        JSON.stringify(data)
      );
    } catch (error) {
      console.error('Failed to cache subscription status:', error);
    }
  }

  private generateNotificationId(): string {
    return 'notif_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}