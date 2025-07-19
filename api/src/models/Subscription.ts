export interface Subscription {
  id: string;
  organizationId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'unpaid';
  tier: 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  features: string[];
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionLimits {
  maxDrivers: number;
  maxRoutes: number;
  maxDeliveries: number;
  maxGeofences: number;
  apiCallsPerMonth: number;
  storageGB: number;
  supportLevel: 'basic' | 'priority' | 'dedicated';
}

export interface SubscriptionUsage {
  drivers: number;
  routes: number;
  deliveries: number;
  geofences: number;
  apiCalls: number;
  storageUsed: number;
  lastUpdated: Date;
}

export interface SubscriptionCreateDTO {
  organizationId: string;
  tier: 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'annual';
  paymentMethodId?: string;
  couponCode?: string;
}

export interface SubscriptionUpdateDTO {
  tier?: 'starter' | 'professional' | 'enterprise';
  billingCycle?: 'monthly' | 'annual';
  cancelAtPeriodEnd?: boolean;
  paymentMethodId?: string;
}

export interface SubscriptionResponseDTO {
  id: string;
  organizationId: string;
  status: string;
  tier: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  features: string[];
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
  nextBillAmount?: number;
  nextBillDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionUsageLog {
  id: string;
  subscriptionId: string;
  organizationId: string;
  eventType: 'driver_added' | 'driver_removed' | 'route_created' | 'delivery_created' | 'api_call' | 'geofence_created';
  eventDetails: Record<string, any>;
  location?: GeoPoint;
  userId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export const TIER_LIMITS: Record<string, SubscriptionLimits> = {
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
    maxDrivers: -1, // unlimited
    maxRoutes: -1,
    maxDeliveries: -1,
    maxGeofences: -1,
    apiCallsPerMonth: -1,
    storageGB: 100,
    supportLevel: 'dedicated'
  }
};

export const TIER_FEATURES: Record<string, string[]> = {
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
    'white_label',
    'geofencing',
    'priority_routing'
  ]
};