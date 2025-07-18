import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LogisticsRole, ROLE_PERMISSIONS } from '../../src/lib/auth/clerk-setup';

describe('Clerk Integration - Role Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LogisticsRole enum', () => {
    it('should have all required roles', () => {
      expect(LogisticsRole.SUPER_ADMIN).toBe('super_admin');
      expect(LogisticsRole.COMPANY_ADMIN).toBe('company_admin');
      expect(LogisticsRole.DISPATCHER).toBe('dispatcher');
      expect(LogisticsRole.DRIVER).toBe('driver');
      expect(LogisticsRole.CUSTOMER).toBe('customer');
      expect(LogisticsRole.SUPPORT).toBe('support');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should have correct permissions for SUPER_ADMIN', () => {
      expect(ROLE_PERMISSIONS[LogisticsRole.SUPER_ADMIN]).toEqual(['*']);
    });

    it('should have correct permissions for COMPANY_ADMIN', () => {
      const permissions = ROLE_PERMISSIONS[LogisticsRole.COMPANY_ADMIN];
      expect(permissions).toContain('manage:organization');
      expect(permissions).toContain('manage:drivers');
      expect(permissions).toContain('manage:dispatchers');
      expect(permissions).toContain('view:analytics');
      expect(permissions).toContain('manage:billing');
      expect(permissions).toHaveLength(5);
    });

    it('should have correct permissions for DISPATCHER', () => {
      const permissions = ROLE_PERMISSIONS[LogisticsRole.DISPATCHER];
      expect(permissions).toContain('manage:routes');
      expect(permissions).toContain('manage:deliveries');
      expect(permissions).toContain('view:drivers');
      expect(permissions).toContain('communicate:drivers');
      expect(permissions).toContain('view:analytics');
      expect(permissions).toHaveLength(5);
    });

    it('should have correct permissions for DRIVER', () => {
      const permissions = ROLE_PERMISSIONS[LogisticsRole.DRIVER];
      expect(permissions).toContain('view:assigned_routes');
      expect(permissions).toContain('update:delivery_status');
      expect(permissions).toContain('communicate:dispatcher');
      expect(permissions).toContain('view:profile');
      expect(permissions).toHaveLength(4);
    });

    it('should have correct permissions for CUSTOMER', () => {
      const permissions = ROLE_PERMISSIONS[LogisticsRole.CUSTOMER];
      expect(permissions).toContain('view:deliveries');
      expect(permissions).toContain('create:delivery_requests');
      expect(permissions).toContain('view:tracking');
      expect(permissions).toContain('view:invoices');
      expect(permissions).toHaveLength(4);
    });

    it('should have correct permissions for SUPPORT', () => {
      const permissions = ROLE_PERMISSIONS[LogisticsRole.SUPPORT];
      expect(permissions).toContain('view:tickets');
      expect(permissions).toContain('respond:tickets');
      expect(permissions).toContain('view:user_profiles');
      expect(permissions).toHaveLength(3);
    });

    it('should not have overlapping admin permissions for non-admin roles', () => {
      const adminPermissions = ['manage:organization', 'manage:billing'];
      
      const driverPermissions = ROLE_PERMISSIONS[LogisticsRole.DRIVER];
      const customerPermissions = ROLE_PERMISSIONS[LogisticsRole.CUSTOMER];
      const supportPermissions = ROLE_PERMISSIONS[LogisticsRole.SUPPORT];

      adminPermissions.forEach(permission => {
        expect(driverPermissions).not.toContain(permission);
        expect(customerPermissions).not.toContain(permission);
        expect(supportPermissions).not.toContain(permission);
      });
    });

    it('should have proper role hierarchy - dispatcher vs driver permissions', () => {
      const dispatcherPermissions = ROLE_PERMISSIONS[LogisticsRole.DISPATCHER];
      const driverPermissions = ROLE_PERMISSIONS[LogisticsRole.DRIVER];

      // Dispatcher should have management permissions
      expect(dispatcherPermissions).toContain('manage:routes');
      expect(dispatcherPermissions).toContain('manage:deliveries');
      expect(dispatcherPermissions).toContain('view:drivers');

      // Driver should not have management permissions
      expect(driverPermissions).not.toContain('manage:routes');
      expect(driverPermissions).not.toContain('manage:deliveries');
      expect(driverPermissions).not.toContain('view:drivers');

      // Both should have some common permissions
      expect(dispatcherPermissions).toContain('view:analytics');
      expect(driverPermissions).toContain('view:profile');
    });
  });

  describe('Permission validation', () => {
    it('should validate that all permissions are strings', () => {
      Object.values(ROLE_PERMISSIONS).forEach(permissions => {
        permissions.forEach(permission => {
          expect(typeof permission).toBe('string');
          expect(permission.length).toBeGreaterThan(0);
        });
      });
    });

    it('should validate permission format (action:resource)', () => {
      Object.entries(ROLE_PERMISSIONS).forEach(([role, permissions]) => {
        permissions.forEach(permission => {
          if (permission !== '*') {
            expect(permission).toMatch(/^[a-z_]+:[a-z_]+$/);
          }
        });
      });
    });

    it('should have unique permissions within each role', () => {
      Object.entries(ROLE_PERMISSIONS).forEach(([role, permissions]) => {
        const uniquePermissions = [...new Set(permissions)];
        expect(uniquePermissions).toHaveLength(permissions.length);
      });
    });
  });

  describe('Performance requirements', () => {
    it('should have reasonable number of permissions per role for performance', () => {
      Object.entries(ROLE_PERMISSIONS).forEach(([role, permissions]) => {
        // Each role should have reasonable number of permissions (not too many for performance)
        expect(permissions.length).toBeLessThanOrEqual(10);
        expect(permissions.length).toBeGreaterThan(0);
      });
    });

    it('should have consistent permission naming', () => {
      const allPermissions = new Set();
      Object.values(ROLE_PERMISSIONS).forEach(permissions => {
        permissions.forEach(permission => {
          if (permission !== '*') {
            allPermissions.add(permission);
          }
        });
      });

      // Check that we have a good variety of actions and resources
      const actions = new Set();
      const resources = new Set();
      
      allPermissions.forEach(permission => {
        if (permission !== '*') {
          const [action, resource] = permission.split(':');
          actions.add(action);
          resources.add(resource);
        }
      });

      expect(actions.size).toBeGreaterThanOrEqual(3); // view, manage, create, etc.
      expect(resources.size).toBeGreaterThanOrEqual(5); // routes, deliveries, organization, etc.
    });
  });
});