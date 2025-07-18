import { createClerkClient } from '@clerk/backend';

// Logistics-specific user roles
export enum LogisticsRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin', 
  DISPATCHER = 'dispatcher',
  DRIVER = 'driver',
  CUSTOMER = 'customer',
  SUPPORT = 'support'
}

// Organization types for logistics companies
export enum OrganizationType {
  LOGISTICS_COMPANY = 'logistics_company',
  CUSTOMER_COMPANY = 'customer_company'
}

// Permission levels for role-based access
export const ROLE_PERMISSIONS = {
  [LogisticsRole.SUPER_ADMIN]: ['*'],
  [LogisticsRole.COMPANY_ADMIN]: [
    'manage:organization',
    'manage:drivers',
    'manage:dispatchers', 
    'view:analytics',
    'manage:billing'
  ],
  [LogisticsRole.DISPATCHER]: [
    'manage:routes',
    'manage:deliveries',
    'view:drivers',
    'communicate:drivers',
    'view:analytics'
  ],
  [LogisticsRole.DRIVER]: [
    'view:assigned_routes',
    'update:delivery_status',
    'communicate:dispatcher',
    'view:profile'
  ],
  [LogisticsRole.CUSTOMER]: [
    'view:deliveries',
    'create:delivery_requests',
    'view:tracking',
    'view:invoices'
  ],
  [LogisticsRole.SUPPORT]: [
    'view:tickets',
    'respond:tickets',
    'view:user_profiles'
  ]
} as const;

// Extract permission type from the ROLE_PERMISSIONS
type Permission = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS][number];

// Clerk client configuration for server-side operations
export const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

// Enhanced user metadata interface
export interface LogisticsUserMetadata {
  role: LogisticsRole;
  organizationId: string;
  companyId?: string;
  driverId?: string;
  vehicleId?: string;
  territory?: string[];
  permissions: string[];
  stripeCustomerId?: string;
  lastLocationUpdate?: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  mobileDeviceId?: string;
  offlineTokenExpiry?: string;
}

// Organization metadata for logistics companies
export interface LogisticsOrgMetadata {
  type: OrganizationType;
  companySize: 'small' | 'medium' | 'large' | 'enterprise';
  industry: string;
  territories: string[];
  fleetSize: number;
  stripeCustomerId: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise';
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing';
  billingCycle: 'monthly' | 'annual';
  features: string[];
  settings: {
    allowDriverOfflineMode: boolean;
    requireDriverPhotos: boolean;
    enableRealTimeTracking: boolean;
    enableCustomerNotifications: boolean;
  };
}

// Performance-optimized user role checking
export async function getUserRole(userId: string): Promise<LogisticsRole | null> {
  try {
    const startTime = performance.now();
    
    const user = await clerkClient.users.getUser(userId);
    const role = user.privateMetadata?.role as LogisticsRole;
    
    const endTime = performance.now();
    if (endTime - startTime > 100) {
      console.warn(`Slow auth check: ${endTime - startTime}ms for user ${userId}`);
    }
    
    return role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

// Fast permission checking with caching
const permissionCache = new Map<string, { permissions: string[], expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function hasPermission(userId: string, permission: Permission | string): Promise<boolean> {
  try {
    const cacheKey = `${userId}:permissions`;
    const cached = permissionCache.get(cacheKey);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.permissions.includes(permission) || cached.permissions.includes('*');
    }

    const user = await clerkClient.users.getUser(userId);
    const role = user.privateMetadata?.role as LogisticsRole;
    
    if (!role) return false;
    
    const permissions = [...(ROLE_PERMISSIONS[role] || [])];
    
    // Cache the permissions
    permissionCache.set(cacheKey, {
      permissions,
      expiry: Date.now() + CACHE_TTL
    });
    
    return (permissions as string[]).includes(permission) || (permissions as string[]).includes('*');
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Organization-based access control
export async function getOrganizationAccess(userId: string, orgId: string): Promise<boolean> {
  try {
    const orgMembershipList = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId
    });
    
    return orgMembershipList.data.some(member => member.publicUserData?.userId === userId);
  } catch (error) {
    console.error('Error checking organization access:', error);
    return false;
  }
}

// Driver-specific authentication utilities
export async function generateDriverOfflineToken(driverId: string): Promise<string> {
  try {
    const driver = await clerkClient.users.getUser(driverId);
    if (driver.privateMetadata?.role !== LogisticsRole.DRIVER) {
      throw new Error('User is not a driver');
    }

    // Create a session token that works offline for 24 hours
    const token = await clerkClient.sessions.createSession({
      userId: driverId
    });

    // Update user metadata with offline token expiry
    await clerkClient.users.updateUserMetadata(driverId, {
      privateMetadata: {
        ...driver.privateMetadata,
        offlineTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    });

    return token.id;
  } catch (error) {
    console.error('Error generating driver offline token:', error);
    throw error;
  }
}

// Subscription status checking
export async function getSubscriptionStatus(orgId: string): Promise<LogisticsOrgMetadata['subscriptionStatus']> {
  try {
    const startTime = performance.now();
    
    const org = await clerkClient.organizations.getOrganization({ organizationId: orgId });
    const metadata = org.privateMetadata as unknown as LogisticsOrgMetadata;
    
    const endTime = performance.now();
    if (endTime - startTime > 500) {
      console.warn(`Slow subscription check: ${endTime - startTime}ms for org ${orgId}`);
    }
    
    return metadata?.subscriptionStatus || 'canceled';
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return 'canceled';
  }
}

// User onboarding helpers
export async function completeDriverOnboarding(
  userId: string, 
  driverData: {
    vehicleId: string;
    territory: string[];
    mobileDeviceId?: string;
  }
): Promise<void> {
  try {
    const user = await clerkClient.users.getUser(userId);
    
    await clerkClient.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...user.privateMetadata,
        vehicleId: driverData.vehicleId,
        territory: driverData.territory,
        mobileDeviceId: driverData.mobileDeviceId,
        onboardingCompleted: true,
        isActive: true
      }
    });
  } catch (error) {
    console.error('Error completing driver onboarding:', error);
    throw error;
  }
}

// Clerk configuration for Next.js app
export const clerkConfig = {
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  appearance: {
    baseTheme: 'light',
    variables: {
      colorPrimary: '#2563eb',
      colorText: '#1f2937',
      colorTextSecondary: '#6b7280',
      colorBackground: '#ffffff',
      colorInputBackground: '#f9fafb',
      borderRadius: '0.5rem'
    },
    elements: {
      formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
      card: 'shadow-lg border border-gray-200',
      headerTitle: 'text-xl font-semibold text-gray-900',
      headerSubtitle: 'text-sm text-gray-600'
    }
  },
  localization: {
    signIn: {
      start: {
        title: 'Sign in to Logistics Platform',
        subtitle: 'Welcome back! Please sign in to continue.'
      }
    },
    signUp: {
      start: {
        title: 'Create your account',
        subtitle: 'Get started with our logistics platform'
      }
    }
  }
};

// Clear permission cache for user (useful for role changes)
export function clearUserPermissionCache(userId: string): void {
  const cacheKey = `${userId}:permissions`;
  permissionCache.delete(cacheKey);
}

// Utility for checking multiple permissions at once
export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userId, permission)) {
      return true;
    }
  }
  return false;
}