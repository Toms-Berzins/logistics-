import Stripe from 'stripe';
import { databaseConfig } from '../config/database';
import { redisClient } from '../config/redis';
import { 
  Subscription, 
  SubscriptionCreateDTO, 
  SubscriptionUpdateDTO, 
  TIER_LIMITS, 
  TIER_FEATURES 
} from '../models/Subscription';

export class StripeService {
  private stripe: Stripe | null;
  private endpointSecret: string;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.warn('⚠️  STRIPE_SECRET_KEY not configured. Stripe functionality will be disabled.');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2025-06-30.basil'
      });
    }
    
    this.endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  }

  private ensureStripeConfigured(): void {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
  }

  async createCustomer(organizationId: string, email: string, name: string): Promise<string> {
    this.ensureStripeConfigured();
    try {
      const customer = await this.stripe!.customers.create({
        email,
        name,
        metadata: {
          organizationId
        }
      });

      // Update organization with Stripe customer ID
      const client = await databaseConfig.connect();
      try {
        await client.query(
          'UPDATE organizations SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
          [customer.id, organizationId]
        );
      } finally {
        client.release();
      }

      return customer.id;
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  async createSubscription(data: SubscriptionCreateDTO): Promise<Stripe.Subscription> {
    this.ensureStripeConfigured();
    try {
      // Get organization and customer info
      const client = await databaseConfig.connect();
      let customerId: string;
      
      try {
        const orgResult = await client.query(
          'SELECT stripe_customer_id, name, email FROM organizations WHERE id = $1',
          [data.organizationId]
        );

        if (orgResult.rows.length === 0) {
          throw new Error('Organization not found');
        }

        const org = orgResult.rows[0];
        customerId = org.stripe_customer_id;

        // Create customer if doesn't exist
        if (!customerId) {
          customerId = await this.createCustomer(data.organizationId, org.email, org.name);
        }
      } finally {
        client.release();
      }

      // Get price ID for tier and billing cycle
      const priceId = this.getPriceId(data.tier, data.billingCycle);
      
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          organizationId: data.organizationId,
          tier: data.tier,
          billingCycle: data.billingCycle
        }
      };

      // Add payment method if provided
      if (data.paymentMethodId) {
        subscriptionData.default_payment_method = data.paymentMethodId;
      }

      // Add coupon if provided
      if (data.couponCode) {
        (subscriptionData as any).coupon = data.couponCode;
      }

      const subscription = await this.stripe!.subscriptions.create(subscriptionData);
      
      // Cache subscription data
      await this.cacheSubscription(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async updateSubscription(subscriptionId: string, data: SubscriptionUpdateDTO): Promise<Stripe.Subscription> {
    this.ensureStripeConfigured();
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {};

      if (data.tier && data.billingCycle) {
        const priceId = this.getPriceId(data.tier, data.billingCycle);
        updateData.items = [{
          id: (await this.stripe!.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: priceId
        }];
      }

      if (data.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = data.cancelAtPeriodEnd;
      }

      if (data.paymentMethodId) {
        updateData.default_payment_method = data.paymentMethodId;
      }

      const subscription = await this.stripe!.subscriptions.update(subscriptionId, updateData);
      
      // Update cache
      await this.cacheSubscription(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<Stripe.Subscription> {
    this.ensureStripeConfigured();
    try {
      const subscription = await this.stripe!.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      });

      // Update cache
      await this.cacheSubscription(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    this.ensureStripeConfigured();
    try {
      // Try cache first
      const cached = await redisClient.get(`subscription:${subscriptionId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      const subscription = await this.stripe!.subscriptions.retrieve(subscriptionId);
      
      // Cache for 5 minutes
      await this.cacheSubscription(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Failed to get subscription:', error);
      throw new Error('Failed to retrieve subscription');
    }
  }

  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    this.ensureStripeConfigured();
    try {
      const subscriptions = await this.stripe!.subscriptions.list({
        customer: customerId,
        status: 'all'
      });

      return subscriptions.data;
    } catch (error) {
      console.error('Failed to get customer subscriptions:', error);
      throw new Error('Failed to retrieve subscriptions');
    }
  }

  async createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
    this.ensureStripeConfigured();
    try {
      const session = await this.stripe!.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      return session.url;
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
      throw new Error('Failed to create billing portal session');
    }
  }

  async getInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
    this.ensureStripeConfigured();
    try {
      const invoices = await this.stripe!.invoices.list({
        customer: customerId,
        limit
      });

      return invoices.data;
    } catch (error) {
      console.error('Failed to get invoices:', error);
      throw new Error('Failed to retrieve invoices');
    }
  }

  async getUsageRecord(subscriptionId: string): Promise<any> {
    try {
      // Get current month usage from database
      const client = await databaseConfig.connect();
      try {
        const result = await client.query(`
          SELECT 
            COUNT(DISTINCT d.id) as driver_count,
            COUNT(DISTINCT r.id) as route_count,
            COUNT(DISTINCT del.id) as delivery_count,
            COUNT(DISTINCT g.id) as geofence_count,
            COALESCE(api.call_count, 0) as api_calls,
            COALESCE(storage.size_gb, 0) as storage_used
          FROM subscriptions s
          JOIN organizations o ON s.organization_id = o.id
          LEFT JOIN drivers d ON o.id = d.organization_id AND d.created_at >= date_trunc('month', NOW())
          LEFT JOIN routes r ON o.id = r.organization_id AND r.created_at >= date_trunc('month', NOW())
          LEFT JOIN deliveries del ON o.id = del.organization_id AND del.created_at >= date_trunc('month', NOW())
          LEFT JOIN geofences g ON o.id = g.organization_id AND g.created_at >= date_trunc('month', NOW())
          LEFT JOIN (
            SELECT organization_id, COUNT(*) as call_count 
            FROM api_usage_logs 
            WHERE created_at >= date_trunc('month', NOW()) 
            GROUP BY organization_id
          ) api ON o.id = api.organization_id
          LEFT JOIN (
            SELECT organization_id, SUM(size_bytes) / (1024*1024*1024) as size_gb
            FROM storage_usage
            GROUP BY organization_id
          ) storage ON o.id = storage.organization_id
          WHERE s.stripe_subscription_id = $1
          GROUP BY s.id, api.call_count, storage.size_gb
        `, [subscriptionId]);

        return result.rows[0] || {
          driver_count: 0,
          route_count: 0,
          delivery_count: 0,
          geofence_count: 0,
          api_calls: 0,
          storage_used: 0
        };
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to get usage record:', error);
      return {
        driver_count: 0,
        route_count: 0,
        delivery_count: 0,
        geofence_count: 0,
        api_calls: 0,
        storage_used: 0
      };
    }
  }

  async validateUsageLimits(organizationId: string, eventType: string): Promise<boolean> {
    try {
      const client = await databaseConfig.connect();
      try {
        // Get subscription info
        const subResult = await client.query(
          'SELECT tier, limits FROM subscriptions WHERE organization_id = $1 AND status = $2',
          [organizationId, 'active']
        );

        if (subResult.rows.length === 0) {
          return false; // No active subscription
        }

        const { tier, limits } = subResult.rows[0];
        const tierLimits = limits || TIER_LIMITS[tier];

        // Get current usage
        const usage = await this.getUsageRecord(organizationId);

        // Check limits based on event type
        switch (eventType) {
          case 'driver_added':
            return tierLimits.maxDrivers === -1 || usage.driver_count < tierLimits.maxDrivers;
          case 'route_created':
            return tierLimits.maxRoutes === -1 || usage.route_count < tierLimits.maxRoutes;
          case 'delivery_created':
            return tierLimits.maxDeliveries === -1 || usage.delivery_count < tierLimits.maxDeliveries;
          case 'geofence_created':
            return tierLimits.maxGeofences === -1 || usage.geofence_count < tierLimits.maxGeofences;
          case 'api_call':
            return tierLimits.apiCallsPerMonth === -1 || usage.api_calls < tierLimits.apiCallsPerMonth;
          default:
            return true;
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Failed to validate usage limits:', error);
      return false;
    }
  }

  async constructWebhookEvent(payload: string, signature: string): Promise<Stripe.Event> {
    this.ensureStripeConfigured();
    try {
      if (!this.endpointSecret) {
        console.warn('Webhook signature verification skipped - no secret configured');
        return JSON.parse(payload);
      }

      return this.stripe!.webhooks.constructEvent(payload, signature, this.endpointSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  private getPriceId(tier: string, billingCycle: string): string {
    const priceMap: Record<string, string> = {
      'starter_monthly': process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
      'starter_annual': process.env.STRIPE_PRICE_STARTER_ANNUAL || 'price_starter_annual',
      'professional_monthly': process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || 'price_professional_monthly',
      'professional_annual': process.env.STRIPE_PRICE_PROFESSIONAL_ANNUAL || 'price_professional_annual',
      'enterprise_monthly': process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || 'price_enterprise_monthly',
      'enterprise_annual': process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL || 'price_enterprise_annual'
    };

    const key = `${tier}_${billingCycle}`;
    const priceId = priceMap[key];
    
    if (!priceId) {
      throw new Error(`Invalid tier and billing cycle combination: ${key}`);
    }

    return priceId;
  }

  private async cacheSubscription(subscription: Stripe.Subscription): Promise<void> {
    try {
      await redisClient.setEx(
        `subscription:${subscription.id}`,
        300, // 5 minutes
        JSON.stringify(subscription)
      );
    } catch (error) {
      console.error('Failed to cache subscription:', error);
      // Don't throw, caching is not critical
    }
  }
}