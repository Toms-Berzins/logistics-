import Stripe from 'stripe';
import { Request, Response } from 'express';
import { clerkClient } from '../lib/auth/clerk-setup';
import { databaseConfig } from '../config/database';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Webhook endpoint secret for verification
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

// Database queries
async function updateOrganizationSubscription(
  stripeCustomerId: string,
  subscriptionData: {
    subscriptionId?: string;
    status: string;
    tier?: string;
    billingCycle?: string;
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
      console.error(`No organization found for Stripe customer: ${stripeCustomerId}`);
      return;
    }

    const organizationId = orgQuery.rows[0].id;

    // Update or insert subscription record
    await client.query(`
      INSERT INTO organization_subscriptions (
        organization_id,
        stripe_customer_id,
        stripe_subscription_id,
        status,
        tier,
        billing_cycle,
        current_period_end,
        cancel_at_period_end,
        features,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (organization_id) 
      DO UPDATE SET
        stripe_subscription_id = EXCLUDED.stripe_subscription_id,
        status = EXCLUDED.status,
        tier = EXCLUDED.tier,
        billing_cycle = EXCLUDED.billing_cycle,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        features = EXCLUDED.features,
        updated_at = NOW()
    `, [
      organizationId,
      stripeCustomerId,
      subscriptionData.subscriptionId || null,
      subscriptionData.status,
      subscriptionData.tier || 'starter',
      subscriptionData.billingCycle || 'monthly',
      subscriptionData.currentPeriodEnd || null,
      subscriptionData.cancelAtPeriodEnd || false,
      JSON.stringify(TIER_FEATURES[subscriptionData.tier as keyof typeof TIER_FEATURES] || TIER_FEATURES.starter)
    ]);

    console.log(`Updated subscription for organization ${organizationId}: ${subscriptionData.status}`);
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
    const organizations = await clerkClient.organizations.getOrganizationList();
    const organization = organizations.find(org => 
      org.privateMetadata?.stripeCustomerId === stripeCustomerId
    );

    if (!organization) {
      console.error(`No Clerk organization found for Stripe customer: ${stripeCustomerId}`);
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

    console.log(`Updated Clerk metadata for organization ${organization.id}`);
  } catch (error) {
    console.error('Failed to update Clerk organization metadata:', error);
  }
}

// Webhook handler
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
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
        console.log(`Unhandled event type: ${event.type}`);
    }

    const endTime = performance.now();
    const processingTime = endTime - startTime;

    // Log performance
    console.log(`Webhook ${event.type} processed in ${processingTime.toFixed(2)}ms`);

    // Warn if processing takes too long
    if (processingTime > 500) {
      console.warn(`Slow webhook processing: ${processingTime.toFixed(2)}ms for ${event.type}`);
    }

    res.json({ received: true, processingTime: processingTime.toFixed(2) });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
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
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });

  await updateClerkOrganizationMetadata(customerId, {
    subscriptionId: subscription.id,
    status: subscription.status,
    tier,
    billingCycle,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });

  // Send welcome email or trigger onboarding
  console.log(`New subscription created for customer ${customerId}: ${tier} tier`);
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
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });

  await updateClerkOrganizationMetadata(customerId, {
    subscriptionId: subscription.id,
    status: subscription.status,
    tier,
    billingCycle,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  });

  console.log(`Subscription updated for customer ${customerId}: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  await updateOrganizationSubscription(customerId, {
    status: 'canceled'
  });

  await updateClerkOrganizationMetadata(customerId, {
    status: 'canceled'
  });

  console.log(`Subscription canceled for customer ${customerId}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

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

    console.log(`Payment succeeded for customer ${customerId}`);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

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
    console.log(`Payment failed for customer ${customerId}`);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  
  // TODO: Send trial ending notification
  console.log(`Trial will end for customer ${customerId}`);
}

async function handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
  console.log(`New customer created: ${customer.id}`);
  
  // TODO: Set up default organization settings
}

// Utility functions for subscription management
export async function createStripeCustomer(
  organizationId: string,
  email: string,
  name: string
): Promise<string> {
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