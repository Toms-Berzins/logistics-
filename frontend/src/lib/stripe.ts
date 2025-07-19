import { loadStripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Subscription plans for LogiTrack
export const SUBSCRIPTION_PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small logistics operations',
    price: 49,
    currency: 'usd',
    interval: 'month',
    features: [
      'Up to 5 drivers',
      'Real-time tracking',
      'Basic route optimization',
      'Email support',
      'Mobile app access'
    ],
    maxDrivers: 5,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced features for growing businesses',
    price: 149,
    currency: 'usd',
    interval: 'month',
    features: [
      'Up to 25 drivers',
      'Advanced analytics',
      'Geofencing alerts',
      'Custom reports',
      'Priority support',
      'API access',
      'Route optimization AI'
    ],
    maxDrivers: 25,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID,
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited scale for large operations',
    price: 399,
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited drivers',
      'Advanced AI insights',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantees',
      'Custom branding',
      'Multi-tenant support',
      'Advanced security'
    ],
    maxDrivers: -1, // Unlimited
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

// Utility functions
export const getPlanByPriceId = (priceId: string) => {
  return Object.values(SUBSCRIPTION_PLANS).find(plan => plan.stripePriceId === priceId);
};

export const formatPrice = (price: number, currency: string = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(price);
};