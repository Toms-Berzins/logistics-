import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { databaseConfig } from '../config/database';
import { redisClient } from '../config/redis';
import { StripeService } from '../services/StripeService';

// Extend Request type to include user and organization data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        role: string;
        permissions: string[];
      };
      organization?: {
        id: string;
        name: string;
        subscriptionStatus: string;
        subscriptionTier: string;
        features: string[];
        limits: any;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const stripeService = new StripeService();

/**
 * JWT Authentication Middleware
 * Verifies the JWT token and extracts user information
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      res.status(403).json({
        success: false,
        message: 'Token has been revoked'
      });
      return;
    }

    // Get user information from database
    const client = await databaseConfig.connect();
    try {
      const userResult = await client.query(`
        SELECT 
          u.id,
          u.organization_id,
          u.role,
          u.permissions,
          o.name as organization_name,
          o.subscription_status,
          o.subscription_tier
        FROM users u
        JOIN organizations o ON u.organization_id = o.id
        WHERE u.id = $1 AND u.is_active = true
      `, [decoded.userId || decoded.driverId]);

      if (userResult.rows.length === 0) {
        res.status(403).json({
          success: false,
          message: 'User not found or inactive'
        });
        return;
      }

      const user = userResult.rows[0];
      
      // Set user context
      req.user = {
        id: user.id,
        organizationId: user.organization_id,
        role: user.role,
        permissions: typeof user.permissions === 'string' 
          ? JSON.parse(user.permissions) 
          : user.permissions || []
      };

      // Set organization context for RLS
      await client.query(`SET app.current_user_id = '${user.id}'`);
      await client.query(`SET app.current_organization_id = '${user.organization_id}'`);

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Organization Context Middleware
 * Loads organization details and subscription information
 */
export const loadOrganizationContext = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const organizationId = req.user.organizationId;

    // Try to get organization data from cache first
    const cachedOrg = await redisClient.get(`org:${organizationId}`);
    if (cachedOrg) {
      req.organization = JSON.parse(cachedOrg);
      next();
      return;
    }

    // Get organization data from database
    const client = await databaseConfig.connect();
    try {
      const orgResult = await client.query(`
        SELECT 
          o.id,
          o.name,
          o.subscription_status,
          o.subscription_tier,
          s.status as current_status,
          s.tier as current_tier,
          s.features,
          s.limits,
          s.usage,
          s.current_period_end
        FROM organizations o
        LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status != 'canceled'
        WHERE o.id = $1
      `, [organizationId]);

      if (orgResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
        return;
      }

      const org = orgResult.rows[0];
      
      req.organization = {
        id: org.id,
        name: org.name,
        subscriptionStatus: org.current_status || org.subscription_status || 'inactive',
        subscriptionTier: org.current_tier || org.subscription_tier || 'starter',
        features: typeof org.features === 'string' 
          ? JSON.parse(org.features) 
          : org.features || [],
        limits: typeof org.limits === 'string'
          ? JSON.parse(org.limits)
          : org.limits || {}
      };

      // Cache organization data for 5 minutes
      await redisClient.setEx(
        `org:${organizationId}`,
        300,
        JSON.stringify(req.organization)
      );

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Organization context error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load organization context'
    });
  }
};

/**
 * Multi-tenant Authorization Middleware
 * Ensures users can only access their organization's data
 */
export const enforceOrganizationAccess = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const userOrgId = req.user.organizationId;
    
    // Check organization ID in various places
    const requestedOrgId = 
      req.params.organizationId || 
      req.body.organizationId || 
      req.query.organizationId ||
      req.body.organization_id ||
      req.query.organization_id;

    if (requestedOrgId && requestedOrgId !== userOrgId) {
      res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other organization\'s data'
      });
      return;
    }

    // Add organization ID to request body if not present (for create operations)
    if (req.method === 'POST' && !req.body.organizationId && !req.body.organization_id) {
      req.body.organizationId = userOrgId;
    }

    next();
  } catch (error) {
    console.error('Organization access enforcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Access validation failed'
    });
  }
};

/**
 * Feature Access Middleware
 * Checks if the organization has access to a specific feature
 */
export const requireFeature = (featureName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.organization) {
        res.status(500).json({
          success: false,
          message: 'Organization context not loaded'
        });
        return;
      }

      const hasFeature = req.organization.features.includes(featureName);
      if (!hasFeature) {
        res.status(403).json({
          success: false,
          message: `Feature '${featureName}' not available in your subscription plan`,
          upgradeRequired: true,
          currentTier: req.organization.subscriptionTier
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Feature access check error:', error);
      res.status(500).json({
        success: false,
        message: 'Feature access validation failed'
      });
    }
  };
};

/**
 * Usage Limit Middleware
 * Checks if an action would exceed subscription limits
 */
export const checkUsageLimit = (eventType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const organizationId = req.user.organizationId;
      const isWithinLimits = await stripeService.validateUsageLimits(organizationId, eventType);

      if (!isWithinLimits) {
        res.status(403).json({
          success: false,
          message: `Usage limit exceeded for ${eventType}`,
          limitExceeded: true,
          eventType,
          upgradeRequired: true,
          currentTier: req.organization?.subscriptionTier
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({
        success: false,
        message: 'Usage limit validation failed'
      });
    }
  };
};

/**
 * Permission-based Authorization Middleware
 * Checks if user has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const hasPermission = req.user.permissions.includes(permission) || 
                           req.user.permissions.includes('admin') ||
                           req.user.role === 'admin';

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`,
          requiredPermission: permission,
          userRole: req.user.role
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission validation failed'
      });
    }
  };
};

/**
 * Role-based Authorization Middleware
 * Checks if user has specific role
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      const hasRole = allowedRoles.includes(req.user.role);

      if (!hasRole) {
        res.status(403).json({
          success: false,
          message: `Role '${allowedRoles.join(' or ')}' required`,
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        message: 'Role validation failed'
      });
    }
  };
};

/**
 * Subscription Status Middleware
 * Checks if organization has active subscription
 */
export const requireActiveSubscription = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.organization) {
      res.status(500).json({
        success: false,
        message: 'Organization context not loaded'
      });
      return;
    }

    const isActive = ['active', 'trialing'].includes(req.organization.subscriptionStatus);
    if (!isActive) {
      res.status(403).json({
        success: false,
        message: 'Active subscription required',
        subscriptionStatus: req.organization.subscriptionStatus,
        subscriptionRequired: true
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Subscription status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Subscription validation failed'
    });
  }
};