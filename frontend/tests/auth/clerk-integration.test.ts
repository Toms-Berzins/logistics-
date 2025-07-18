import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { 
  LogisticsRole, 
  getUserRole, 
  hasPermission, 
  generateDriverOfflineToken,
  completeDriverOnboarding,
  getSubscriptionStatus,
  ROLE_PERMISSIONS
} from '../../src/lib/auth/clerk-setup';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now())
};

// Test data
const mockUser = {
  id: 'user_123',
  emailAddresses: [{ emailAddress: 'driver@test.com' }],
  firstName: 'John',
  lastName: 'Doe',
  privateMetadata: {
    role: LogisticsRole.DRIVER,
    organizationId: 'org_123',
    driverId: 'driver_123',
    vehicleId: 'vehicle_123',
    territory: ['zone_1', 'zone_2'],
    permissions: ROLE_PERMISSIONS[LogisticsRole.DRIVER],
    isActive: true,
    onboardingCompleted: true
  }
};

const mockOrganization = {
  id: 'org_123',
  name: 'Test Logistics Co',
  privateMetadata: {
    type: 'logistics_company',
    subscriptionStatus: 'active',
    subscriptionTier: 'professional',
    stripeCustomerId: 'cus_123',
    features: ['basic_tracking', 'route_planning', 'advanced_analytics']
  }
};

describe('Clerk Integration Tests', () => {
  beforeAll(() => {
    // Setup global mocks
    global.performance = mockPerformance as any;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockPerformance.now.mockReturnValue(Date.now());
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('getUserRole', () => {
    it('should return user role for valid user', async () => {
      // Arrange
      const { createClerkClient } = await import('@clerk/backend');
      const mockClient = vi.mocked(createClerkClient)();
      vi.mocked(mockClient.users.getUser).mockResolvedValue(mockUser);

      // Act
      const role = await getUserRole('user_123');

      // Assert
      expect(role).toBe(LogisticsRole.DRIVER);
      expect(mockClient.users.getUser).toHaveBeenCalledWith('user_123');
    });

    it('should return null for user without role', async () => {
      // Arrange
      const userWithoutRole = { ...mockUser, privateMetadata: {} };
      mockClerkClient.users.getUser.mockResolvedValue(userWithoutRole);

      // Act
      const role = await getUserRole('user_123');

      // Assert
      expect(role).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      // Arrange
      mockClerkClient.users.getUser.mockRejectedValue(new Error('User not found'));

      // Act
      const role = await getUserRole('user_123');

      // Assert
      expect(role).toBeNull();
    });

    it('should complete within 100ms performance requirement', async () => {
      // Arrange
      const startTime = 1000;
      const endTime = 1050; // 50ms
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await getUserRole('user_123');

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should warn if performance exceeds 100ms', async () => {
      // Arrange
      const startTime = 1000;
      const endTime = 1150; // 150ms
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await getUserRole('user_123');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow auth check: 150ms for user user_123')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('hasPermission', () => {
    it('should return true for valid permission', async () => {
      // Arrange
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);

      // Act
      const result = await hasPermission('user_123', 'view:assigned_routes');

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for super admin with any permission', async () => {
      // Arrange
      const superAdminUser = {
        ...mockUser,
        privateMetadata: { ...mockUser.privateMetadata, role: LogisticsRole.SUPER_ADMIN }
      };
      mockClerkClient.users.getUser.mockResolvedValue(superAdminUser);

      // Act
      const result = await hasPermission('user_123', 'any:permission');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for invalid permission', async () => {
      // Arrange
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);

      // Act
      const result = await hasPermission('user_123', 'manage:organization');

      // Assert
      expect(result).toBe(false);
    });

    it('should cache permissions for performance', async () => {
      // Arrange
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);

      // Act
      await hasPermission('user_123', 'view:assigned_routes');
      await hasPermission('user_123', 'view:assigned_routes'); // Second call

      // Assert
      expect(mockClerkClient.users.getUser).toHaveBeenCalledTimes(1);
    });

    it('should return false for user without role', async () => {
      // Arrange
      const userWithoutRole = { ...mockUser, privateMetadata: {} };
      mockClerkClient.users.getUser.mockResolvedValue(userWithoutRole);

      // Act
      const result = await hasPermission('user_123', 'view:assigned_routes');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateDriverOfflineToken', () => {
    it('should generate token for valid driver', async () => {
      // Arrange
      const mockSession = { id: 'sess_123' };
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      mockClerkClient.sessions.createSession.mockResolvedValue(mockSession);
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({});

      // Act
      const token = await generateDriverOfflineToken('user_123');

      // Assert
      expect(token).toBe('sess_123');
      expect(mockClerkClient.sessions.createSession).toHaveBeenCalledWith({
        userId: 'user_123',
        expiresInSeconds: 24 * 60 * 60
      });
    });

    it('should throw error for non-driver user', async () => {
      // Arrange
      const nonDriverUser = {
        ...mockUser,
        privateMetadata: { ...mockUser.privateMetadata, role: LogisticsRole.DISPATCHER }
      };
      mockClerkClient.users.getUser.mockResolvedValue(nonDriverUser);

      // Act & Assert
      await expect(generateDriverOfflineToken('user_123')).rejects.toThrow('User is not a driver');
    });

    it('should update user metadata with token expiry', async () => {
      // Arrange
      const mockSession = { id: 'sess_123' };
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      mockClerkClient.sessions.createSession.mockResolvedValue(mockSession);
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({});

      // Act
      await generateDriverOfflineToken('user_123');

      // Assert
      expect(mockClerkClient.users.updateUserMetadata).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          privateMetadata: expect.objectContaining({
            offlineTokenExpiry: expect.any(String)
          })
        })
      );
    });
  });

  describe('completeDriverOnboarding', () => {
    it('should complete onboarding for driver', async () => {
      // Arrange
      const driverData = {
        vehicleId: 'vehicle_456',
        territory: ['zone_3', 'zone_4'],
        mobileDeviceId: 'device_123'
      };
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({});

      // Act
      await completeDriverOnboarding('user_123', driverData);

      // Assert
      expect(mockClerkClient.users.updateUserMetadata).toHaveBeenCalledWith(
        'user_123',
        {
          privateMetadata: expect.objectContaining({
            vehicleId: 'vehicle_456',
            territory: ['zone_3', 'zone_4'],
            mobileDeviceId: 'device_123',
            onboardingCompleted: true,
            isActive: true
          })
        }
      );
    });

    it('should handle missing optional fields', async () => {
      // Arrange
      const driverData = {
        vehicleId: 'vehicle_456',
        territory: ['zone_3']
      };
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({});

      // Act
      await completeDriverOnboarding('user_123', driverData);

      // Assert
      expect(mockClerkClient.users.updateUserMetadata).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          privateMetadata: expect.objectContaining({
            vehicleId: 'vehicle_456',
            territory: ['zone_3'],
            mobileDeviceId: undefined,
            onboardingCompleted: true,
            isActive: true
          })
        })
      );
    });
  });

  describe('getSubscriptionStatus', () => {
    it('should return subscription status for organization', async () => {
      // Arrange
      mockClerkClient.organizations.getOrganization.mockResolvedValue(mockOrganization);

      // Act
      const status = await getSubscriptionStatus('org_123');

      // Assert
      expect(status).toBe('active');
      expect(mockClerkClient.organizations.getOrganization).toHaveBeenCalledWith({
        organizationId: 'org_123'
      });
    });

    it('should return canceled for organization without subscription', async () => {
      // Arrange
      const orgWithoutSubscription = {
        ...mockOrganization,
        privateMetadata: {}
      };
      mockClerkClient.organizations.getOrganization.mockResolvedValue(orgWithoutSubscription);

      // Act
      const status = await getSubscriptionStatus('org_123');

      // Assert
      expect(status).toBe('canceled');
    });

    it('should complete within 500ms performance requirement', async () => {
      // Arrange
      const startTime = 1000;
      const endTime = 1300; // 300ms
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      mockClerkClient.organizations.getOrganization.mockResolvedValue(mockOrganization);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await getSubscriptionStatus('org_123');

      // Assert
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should warn if performance exceeds 500ms', async () => {
      // Arrange
      const startTime = 1000;
      const endTime = 1600; // 600ms
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      mockClerkClient.organizations.getOrganization.mockResolvedValue(mockOrganization);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await getSubscriptionStatus('org_123');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow subscription check: 600ms for org org_123')
      );
      consoleSpy.mockRestore();
    });

    it('should return canceled on error', async () => {
      // Arrange
      mockClerkClient.organizations.getOrganization.mockRejectedValue(new Error('Org not found'));

      // Act
      const status = await getSubscriptionStatus('org_123');

      // Assert
      expect(status).toBe('canceled');
    });
  });

  describe('Role Permissions', () => {
    it('should have correct permissions for each role', () => {
      // Test SUPER_ADMIN
      expect(ROLE_PERMISSIONS[LogisticsRole.SUPER_ADMIN]).toEqual(['*']);

      // Test COMPANY_ADMIN
      expect(ROLE_PERMISSIONS[LogisticsRole.COMPANY_ADMIN]).toContain('manage:organization');
      expect(ROLE_PERMISSIONS[LogisticsRole.COMPANY_ADMIN]).toContain('manage:drivers');
      expect(ROLE_PERMISSIONS[LogisticsRole.COMPANY_ADMIN]).toContain('view:analytics');

      // Test DISPATCHER
      expect(ROLE_PERMISSIONS[LogisticsRole.DISPATCHER]).toContain('manage:routes');
      expect(ROLE_PERMISSIONS[LogisticsRole.DISPATCHER]).toContain('manage:deliveries');
      expect(ROLE_PERMISSIONS[LogisticsRole.DISPATCHER]).not.toContain('manage:organization');

      // Test DRIVER
      expect(ROLE_PERMISSIONS[LogisticsRole.DRIVER]).toContain('view:assigned_routes');
      expect(ROLE_PERMISSIONS[LogisticsRole.DRIVER]).toContain('update:delivery_status');
      expect(ROLE_PERMISSIONS[LogisticsRole.DRIVER]).not.toContain('manage:routes');

      // Test CUSTOMER
      expect(ROLE_PERMISSIONS[LogisticsRole.CUSTOMER]).toContain('view:deliveries');
      expect(ROLE_PERMISSIONS[LogisticsRole.CUSTOMER]).toContain('create:delivery_requests');
      expect(ROLE_PERMISSIONS[LogisticsRole.CUSTOMER]).not.toContain('manage:routes');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete driver workflow', async () => {
      // Arrange
      const mockSession = { id: 'sess_123' };
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);
      mockClerkClient.sessions.createSession.mockResolvedValue(mockSession);
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({});

      // Act - Complete driver onboarding
      await completeDriverOnboarding('user_123', {
        vehicleId: 'vehicle_456',
        territory: ['zone_3'],
        mobileDeviceId: 'device_123'
      });

      // Generate offline token
      const token = await generateDriverOfflineToken('user_123');

      // Check permissions
      const canViewRoutes = await hasPermission('user_123', 'view:assigned_routes');
      const canManageOrg = await hasPermission('user_123', 'manage:organization');

      // Assert
      expect(token).toBe('sess_123');
      expect(canViewRoutes).toBe(true);
      expect(canManageOrg).toBe(false);
    });

    it('should handle organization access control', async () => {
      // Arrange
      mockClerkClient.organizations.getOrganization.mockResolvedValue(mockOrganization);

      // Act
      const subscriptionStatus = await getSubscriptionStatus('org_123');

      // Assert
      expect(subscriptionStatus).toBe('active');
    });
  });
});