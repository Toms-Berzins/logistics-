import Stripe from 'stripe';
import { Request, Response } from 'express';
import { clerkClient } from '../lib/auth/clerk-setup';
import { databaseConfig } from '../config/database';
import { UsageTrackingService } from '../services/UsageTrackingService';
import { redisClient } from '../config/redis';

// Check for required environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not configured. Stripe webhooks will not work.');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('STRIPE_WEBHOOK_SECRET not configured. Webhook signature verification will be skipped.');
}

// Initialize Stripe (only if API key is available)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil'
    })
  : null;

// Webhook endpoint secret for verification
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Initialize usage tracking service
const usageTrackingService = new UsageTrackingService();

// Subscription tier mapping
const SUBSCRIPTION_TIERS = {
  'price_starter_monthly': 'starter',
  'price_starter_annual': 'starter',
  'price_professional_monthly': 'professional',
  'price_professional_annual': 'professional',
  'price_enterprise_monthly': 'enterprise',
  'price_enterprise_annual': 'enterprise'
} as const;

// Feature sets for each tier
const TIER_FEATURES = {
  starter: [
    'basic_tracking',
    'route_planning',
    'basic_analytics',
    'mobile_app'
  ],
  professional: [
    'basic_tracking',
    'route_planning',
    'advanced_analytics',
    'mobile_app',
    'fleet_management',
    'customer_portal',
    'api_access'
  ],
  enterprise: [
    'basic_tracking',
    'route_planning',
    'advanced_analytics',
    'mobile_app',
    'fleet_management',
    'customer_portal',
    'api_access',
    'custom_integrations',
    'dedicated_support',
    'white_label'
  ]
} as const;

// Helper functions for subscription management
function getTierLimits(tier: string) {
  const limits = {
    starter: {
      maxDrivers: 5,
      maxRoutes: 50,
      maxDeliveries: 500,
      maxGeofences: 10,
      apiCallsPerMonth: 10000,
      storageGB: 1,
      supportLevel: 'basic'
    },
    professional: {
      maxDrivers: 25,
      maxRoutes: 500,
      maxDeliveries: 5000,
      maxGeofences: 100,
      apiCallsPerMonth: 100000,
      storageGB: 10,
      supportLevel: 'priority'
    },
    enterprise: {
      maxDrivers: -1,
      maxRoutes: -1,
      maxDeliveries: -1,
      maxGeofences: -1,
      apiCallsPerMonth: -1,
      storageGB: 100,
      supportLevel: 'dedicated'
    }
  };
  return limits[tier as keyof typeof limits] || limits.starter;
}

function getInitialUsage() {
  return {
    drivers: 0,
    routes: 0,
    deliveries: 0,
    geofences: 0,
    apiCalls: 0,
    storageUsed: 0,
    lastUpdated: new Date()
  };
}

function generateSubscriptionId(): string {
  return 'sub_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

async function cacheSubscriptionStatus(organizationId: string, status: string, tier: string): Promise<void> {
  try {
    await redisClient.setEx(
      `subscription:org:${organizationId}`,
      300, // 5 minutes TTL
      JSON.stringify({ status, tier, cachedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.error('Failed to cache subscription status:', error);
  }
}

// Enhanced database queries with new subscription table support
async function updateOrganizationSubscription(
  stripeCustomerId: string,
  subscriptionData: {
    subscriptionId?: string;
    status: string;
    tier?: string;
    billingCycle?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
  }
): Promise<void> {
  const client = await databaseConfig.connect();
  
  try {
    // First, find the organization by Stripe customer ID
    const orgQuery = await client.query(
      'SELECT id FROM organizations WHERE stripe_customer_id = $1',
      [stripeCustomerId]
    );

    if (orgQuery.rows.length === 0) {
      console.error('No organization found for Stripe customer: %s', stripeCustomerId);
      return;
    }

    const organizationId = orgQuery.rows[0].id;
    const tier = subscriptionData.tier || 'starter';
    const features = TIER_FEATURES[tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.starter;

    // Update the new subscriptions table
    const subscriptionId = generateSubscriptionId();
    await client.query(`
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
      ON CONFLICT (stripe_subscription_id) 
      DO UPDATE SET
        status = EXCLUDED.status,
        tier = EXCLUDED.tier,
        billing_cycle = EXCLUDED.billing_cycle,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        features = EXCLUDED.features,
        limits = EXCLUDED.limits,
        updated_at = NOW()
    `, [
      subscriptionId,
      organizationId,
      stripeCustomerId,
      subscriptionData.subscriptionId || null,
      subscriptionData.status,
      tier,
      subscriptionData.billingCycle || 'monthly',
      subscriptionData.currentPeriodStart || null,
      subscriptionData.currentPeriodEnd || null,
      subscriptionData.cancelAtPeriodEnd || false,
      JSON.stringify(features),
      JSON.stringify(getTierLimits(tier)),
      JSON.stringify(getInitialUsage())
    ]);

    // Also update organization for backward compatibility
    await client.query(`
      UPDATE organizations 
      SET subscription_tier = $1, subscription_status = $2, updated_at = NOW()
      WHERE id = $3
    `, [tier, subscriptionData.status, organizationId]);

    // Log subscription change for audit
    await usageTrackingService.trackUsage(
      organizationId,
      subscriptionData.subscriptionId ? 'subscription_updated' : 'subscription_created',
      {
        stripeCustomerId,
        subscriptionId: subscriptionData.subscriptionId,
        tier,
        status: subscriptionData.status,
        billingCycle: subscriptionData.billingCycle
      }
    );

    // Cache subscription status in Redis
    await cacheSubscriptionStatus(organizationId, subscriptionData.status, tier);

    console.log('Updated subscription for organization %s: %s', organizationId, subscriptionData.status);
  } finally {
    client.release();
  }
}

async function updateClerkOrganizationMetadata(
  stripeCustomerId: string,
  subscriptionData: any
): Promise<void> {
  try {
    // Find Clerk organization by Stripe customer ID
    const organizationsResponse = await clerkClient.organizations.getOrganizationList();
    const organization = organizationsResponse.data.find((org: any) => 
      org.privateMetadata?.stripeCustomerId === stripeCustomerId
    );

    if (!organization) {
      console.error('No Clerk organization found for Stripe customer: %s', stripeCustomerId);
      return;
    }

    // Update organization metadata
    await clerkClient.organizations.updateOrganizationMetadata(organization.id, {
      privateMetadata: {
        ...organization.privateMetadata,
        subscriptionStatus: subscriptionData.status,
        subscriptionTier: subscriptionData.tier || 'starter',
        billingCycle: subscriptionData.billingCycle || 'monthly',
        features: TIER_FEATURES[subscriptionData.tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.starter,
        stripeSubscriptionId: subscriptionData.subscriptionId,
        currentPeriodEnd: subscriptionData.currentPeriodEnd?.toISOString(),
        cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false
      }
    });

    console.log('Updated Clerk metadata for organization %s', organization.id);
  } catch (error) {
    console.error('Failed to update Clerk organization metadata:', error);
  }
}

// Webhook handler
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  // Check if Stripe is configured
  if (!stripe) {
    console.error('Stripe not configured. Cannot process webhook.');
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Verify webhook signature if secret is available
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // Skip signature verification in development
      console.warn('Webhook signature verification skipped - no secret configured');
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).send(`Webhook Error: ${err}`);
    return;
  }

  const startTime = performance.now();

  try {
    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      default:
        console.log('Unhandled event type: %s', event.type);
    }

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Log performance
    console.log('Webhook %s processed in %sms', event.type, processingTime.toFixed(2));

    // Warn if processing takes too long
    if (processingTime > 500) {
      console.warn('Slow webhook processing: %sms for %s', processingTime.toFixed(2), event.type);
    }

    res.json({ received: true, processingTime: processingTime.toFixed(2) });
  } catch (error) {
    console.error('Error processing webhook %s:', event.type, error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? SUBSCRIPTION_TIERS[priceId as keyof typeof SUBSCRIPTION_TIERS] : 'starter';
  const billingCycle = subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';

  await updateOrganizationSubscription(customerId, {
    subscriptionId: subscription.id,
    status: subscription.status,
    tier,
    billingCycle,
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
  });

  await updateClerkOrganizationMetadata(customerId, {
    subscriptionId: subscription.id,
    status: subscription.status,
    tier,
    billingCycle,
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
  });

  // Send welcome email or trigger onboarding
  console.log('New subscription created for customer %s: %s tier', customerId, tier);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? SUBSCRIPTION_TIERS[priceId as keyof typeof SUBSCRIPTION_TIERS] : 'starter';
  const billingCycle = subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'annual' : 'monthly';

  await updateOrganizationSubscription(customerId, {
    subscriptionId: subscription.id,
    status: subscription.status,
    tier,
    billingCycle,
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
  });

  await updateClerkOrganizationMetadata(customerId, {
    subscriptionId: subscription.id,
    status: subscription.status,
    tier,
    billingCycle,
    currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
    cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
  });

  console.log('Subscription updated for customer %s: %s', customerId, subscription.status);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  await updateOrganizationSubscription(customerId, {
    status: 'canceled'
  });

  await updateClerkOrganizationMetadata(customerId, {
    status: 'canceled'
  });

  console.log('Subscription canceled for customer %s', customerId);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  if (subscriptionId) {
    // Update subscription status to active
    await updateOrganizationSubscription(customerId, {
      subscriptionId,
      status: 'active'
    });

    await updateClerkOrganizationMetadata(customerId, {
      subscriptionId,
      status: 'active'
    });

    console.log('Payment succeeded for customer %s', customerId);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  if (subscriptionId) {
    // Update subscription status to past_due
    await updateOrganizationSubscription(customerId, {
      subscriptionId,
      status: 'past_due'
    });

    await updateClerkOrganizationMetadata(customerId, {
      subscriptionId,
      status: 'past_due'
    });

    // TODO: Send payment failed notification
    console.log('Payment failed for customer %s', customerId);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  
  // TODO: Send trial ending notification
  console.log('Trial will end for customer %s', customerId);
}

async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  console.log('New customer created: %s', customer.id);
  
  // TODO: Set up default organization settings
}

// Utility functions for subscription management
export async function createStripeCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  
  try {
    const customer = await stripe.customers.create({
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
        'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2',
        [customer.id, organizationId]
      );
    } finally {
      client.release();
    }

    return customer.id;
  } catch (error) {
    console.error('Failed to create Stripe customer:', error);
    throw error;
  }
}

export async function createSubscription(
  customerId: string,
  priceId: string,
  organizationId: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        organizationId
      }
    });

    return subscription;
  } catch (error) {
    console.error('Failed to create subscription:', error);
    throw error;
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = true
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }
  
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd
    });

    return subscription;
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }
}

export async function getUsageMetrics(customerId: string): Promise<any> {
  try {
    // Get current usage data
    const client = await databaseConfig.connect();
    try {
      const result = await client.query(`
        SELECT 
          COUNT(DISTINCT drivers.id) as driver_count,
          COUNT(DISTINCT routes.id) as route_count,
          COUNT(DISTINCT deliveries.id) as delivery_count
        FROM organizations 
        LEFT JOIN drivers ON organizations.id = drivers.organization_id
        LEFT JOIN routes ON organizations.id = routes.organization_id  
        LEFT JOIN deliveries ON organizations.id = deliveries.organization_id
        WHERE organizations.stripe_customer_id = $1
        AND organizations.created_at >= date_trunc('month', NOW())
      `, [customerId]);

      return result.rows[0];
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to get usage metrics:', error);
    return { driver_count: 0, route_count: 0, delivery_count: 0 };
  }
}