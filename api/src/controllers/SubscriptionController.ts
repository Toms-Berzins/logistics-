import { Request, Response } from 'express';
import { databaseConfig } from '../config/database';
import { redisClient } from '../config/redis';
import { StripeService } from '../services/StripeService';
import { 
  Subscription, 
  SubscriptionCreateDTO, 
  SubscriptionUpdateDTO, 
  SubscriptionResponseDTO,
  SubscriptionUsageLog,
  TIER_LIMITS, 
  TIER_FEATURES 
} from '../models/Subscription';

export class SubscriptionController {
  private stripeService: StripeService;

  constructor() {
    this.stripeService = new StripeService();
  }

  // GET /subscriptions
  async getSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, status, tier, page = 1, limit = 10 } = req.query as any;
      const offset = (page - 1) * limit;

      const client = await databaseConfig.connect();
      try {
        let whereConditions: string[] = [];
        let queryParams: any[] = [];
        let paramIndex = 1;

        if (organizationId) {
          whereConditions.push(`s.organization_id = $${paramIndex++}`);
          queryParams.push(organizationId);
        }

        if (status) {
          whereConditions.push(`s.status = $${paramIndex++}`);
          queryParams.push(status);
        }

        if (tier) {
          whereConditions.push(`s.tier = $${paramIndex++}`);
          queryParams.push(tier);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
          SELECT 
            s.*,
            o.name as organization_name,
            o.email as organization_email,
            COUNT(*) OVER() as total_count
          FROM subscriptions s
          JOIN organizations o ON s.organization_id = o.id
          ${whereClause}
          ORDER BY s.created_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        queryParams.push(limit, offset);
        const result = await client.query(query, queryParams);

        const subscriptions = result.rows.map(row => this.formatSubscriptionResponse(row));
        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

        res.json({
          success: true,
          data: subscriptions,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit)
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Get subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subscriptions'
      });
    }
  }

  // GET /subscriptions/:id
  async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const client = await databaseConfig.connect();
      try {
        const query = `
          SELECT 
            s.*,
            o.name as organization_name,
            o.email as organization_email
          FROM subscriptions s
          JOIN organizations o ON s.organization_id = o.id
          WHERE s.id = $1
        `;

        const result = await client.query(query, [id]);

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'Subscription not found'
          });
          return;
        }

        const subscription = this.formatSubscriptionResponse(result.rows[0]);

        res.json({
          success: true,
          data: subscription
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve subscription'
      });
    }
  }

  // POST /subscriptions
  async createSubscription(req: Request, res: Response): Promise<void> {
    try {
      const data: SubscriptionCreateDTO = req.body;

      // Create Stripe subscription
      const stripeSubscription = await this.stripeService.createSubscription(data);

      // Create local subscription record
      const client = await databaseConfig.connect();
      try {
        const subscriptionId = this.generateId();
        const limits = TIER_LIMITS[data.tier];
        const features = TIER_FEATURES[data.tier];

        const query = `
          INSERT INTO subscriptions (
            id,
            organization_id,
            stripe_customer_id,
            stripe_subscription_id,
            status,
            tier,
            billing_cycle,
            current_period_start,
            current_period_end,
            cancel_at_period_end,
            features,
            limits,
            usage,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          RETURNING *
        `;

        const usage = {
          drivers: 0,
          routes: 0,
          deliveries: 0,
          geofences: 0,
          apiCalls: 0,
          storageUsed: 0,
          lastUpdated: new Date()
        };

        const values = [
          subscriptionId,
          data.organizationId,
          stripeSubscription.customer,
          stripeSubscription.id,
          stripeSubscription.status,
          data.tier,
          data.billingCycle,
          new Date((stripeSubscription as any).current_period_start * 1000),
          new Date((stripeSubscription as any).current_period_end * 1000),
          (stripeSubscription as any).cancel_at_period_end,
          JSON.stringify(features),
          JSON.stringify(limits),
          JSON.stringify(usage)
        ];

        const result = await client.query(query, values);
        
        // Log subscription creation
        await this.logSubscriptionChange(
          subscriptionId,
          data.organizationId,
          'subscription_created',
          { tier: data.tier, billingCycle: data.billingCycle },
          req.user?.id
        );

        const subscription = this.formatSubscriptionResponse(result.rows[0]);

        res.status(201).json({
          success: true,
          data: subscription,
          stripeClientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent?.client_secret
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to create subscription'
      });
    }
  }

  // PUT /subscriptions/:id
  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: SubscriptionUpdateDTO = req.body;

      const client = await databaseConfig.connect();
      try {
        // Get current subscription
        const currentResult = await client.query(
          'SELECT * FROM subscriptions WHERE id = $1',
          [id]
        );

        if (currentResult.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'Subscription not found'
          });
          return;
        }

        const currentSub = currentResult.rows[0];

        // Update Stripe subscription if needed
        if (data.tier || data.billingCycle || data.paymentMethodId) {
          await this.stripeService.updateSubscription(currentSub.stripe_subscription_id, data);
        }

        // Handle cancellation
        if (data.cancelAtPeriodEnd !== undefined) {
          await this.stripeService.cancelSubscription(
            currentSub.stripe_subscription_id,
            data.cancelAtPeriodEnd
          );
        }

        // Update local record
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (data.tier) {
          updates.push(`tier = $${paramIndex++}`);
          values.push(data.tier);
          
          updates.push(`limits = $${paramIndex++}`);
          values.push(JSON.stringify(TIER_LIMITS[data.tier]));
          
          updates.push(`features = $${paramIndex++}`);
          values.push(JSON.stringify(TIER_FEATURES[data.tier]));
        }

        if (data.billingCycle) {
          updates.push(`billing_cycle = $${paramIndex++}`);
          values.push(data.billingCycle);
        }

        if (data.cancelAtPeriodEnd !== undefined) {
          updates.push(`cancel_at_period_end = $${paramIndex++}`);
          values.push(data.cancelAtPeriodEnd);
        }

        updates.push(`updated_at = NOW()`);
        values.push(id);

        const updateQuery = `
          UPDATE subscriptions 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await client.query(updateQuery, values);

        // Log subscription update
        await this.logSubscriptionChange(
          id,
          currentSub.organization_id,
          'subscription_updated',
          data,
          req.user?.id
        );

        const subscription = this.formatSubscriptionResponse(result.rows[0]);

        res.json({
          success: true,
          data: subscription
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update subscription'
      });
    }
  }

  // DELETE /subscriptions/:id
  async deleteSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const client = await databaseConfig.connect();
      try {
        // Get subscription
        const result = await client.query(
          'SELECT * FROM subscriptions WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'Subscription not found'
          });
          return;
        }

        const subscription = result.rows[0];

        // Cancel Stripe subscription immediately
        await this.stripeService.cancelSubscription(subscription.stripe_subscription_id, false);

        // Update local record
        await client.query(
          'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2',
          ['canceled', id]
        );

        // Log subscription cancellation
        await this.logSubscriptionChange(
          id,
          subscription.organization_id,
          'subscription_canceled',
          { immediate: true },
          req.user?.id
        );

        res.json({
          success: true,
          message: 'Subscription canceled successfully'
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Delete subscription error:', error);
      res.status(500).json({
        success: false,
        message: error?.message || 'Failed to cancel subscription'
      });
    }
  }

  // GET /subscriptions/:id/usage
  async getUsage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const client = await databaseConfig.connect();
      try {
        const subscription = await client.query(
          'SELECT stripe_subscription_id, organization_id, tier, limits FROM subscriptions WHERE id = $1',
          [id]
        );

        if (subscription.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'Subscription not found'
          });
          return;
        }

        const { stripe_subscription_id, organization_id, tier, limits } = subscription.rows[0];
        const usage = await this.stripeService.getUsageRecord(stripe_subscription_id);
        const tierLimits = limits || TIER_LIMITS[tier];

        res.json({
          success: true,
          data: {
            current: usage,
            limits: tierLimits,
            percentages: {
              drivers: tierLimits.maxDrivers === -1 ? 0 : (usage.driver_count / tierLimits.maxDrivers) * 100,
              routes: tierLimits.maxRoutes === -1 ? 0 : (usage.route_count / tierLimits.maxRoutes) * 100,
              deliveries: tierLimits.maxDeliveries === -1 ? 0 : (usage.delivery_count / tierLimits.maxDeliveries) * 100,
              apiCalls: tierLimits.apiCallsPerMonth === -1 ? 0 : (usage.api_calls / tierLimits.apiCallsPerMonth) * 100
            }
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Get usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve usage data'
      });
    }
  }

  // POST /subscriptions/:id/billing-portal
  async createBillingPortal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { returnUrl } = req.body;

      const client = await databaseConfig.connect();
      try {
        const result = await client.query(
          'SELECT stripe_customer_id FROM subscriptions WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'Subscription not found'
          });
          return;
        }

        const { stripe_customer_id } = result.rows[0];
        const portalUrl = await this.stripeService.createBillingPortalSession(
          stripe_customer_id,
          returnUrl
        );

        res.json({
          success: true,
          data: { url: portalUrl }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Create billing portal error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create billing portal session'
      });
    }
  }

  // POST /subscriptions/:id/validate-usage
  async validateUsage(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { eventType, quantity = 1 } = req.body;

      const client = await databaseConfig.connect();
      try {
        const result = await client.query(
          'SELECT organization_id FROM subscriptions WHERE id = $1',
          [id]
        );

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: 'Subscription not found'
          });
          return;
        }

        const { organization_id } = result.rows[0];
        const isValid = await this.stripeService.validateUsageLimits(organization_id, eventType);

        res.json({
          success: true,
          data: {
            valid: isValid,
            eventType,
            quantity
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Validate usage error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate usage'
      });
    }
  }

  private formatSubscriptionResponse(row: any): SubscriptionResponseDTO {
    return {
      id: row.id,
      organizationId: row.organization_id,
      status: row.status,
      tier: row.tier,
      billingCycle: row.billing_cycle,
      currentPeriodStart: row.current_period_start?.toISOString(),
      currentPeriodEnd: row.current_period_end?.toISOString(),
      cancelAtPeriodEnd: row.cancel_at_period_end,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
      limits: typeof row.limits === 'string' ? JSON.parse(row.limits) : row.limits,
      usage: typeof row.usage === 'string' ? JSON.parse(row.usage) : row.usage,
      createdAt: row.created_at?.toISOString(),
      updatedAt: row.updated_at?.toISOString()
    };
  }

  private async logSubscriptionChange(
    subscriptionId: string,
    organizationId: string,
    eventType: string,
    eventDetails: any,
    userId?: string
  ): Promise<void> {
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
            user_id,
            timestamp,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        `, [
          this.generateId(),
          subscriptionId,
          organizationId,
          eventType,
          JSON.stringify(eventDetails),
          userId,
          JSON.stringify({ source: 'subscription_controller' })
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to log subscription change:', error);
    }
  }

  private generateId(): string {
    return 'sub_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}