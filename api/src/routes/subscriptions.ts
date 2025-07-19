import express from 'express';
import rateLimit from 'express-rate-limit';
import { SubscriptionController } from '../controllers/SubscriptionController';
import { authenticateToken } from './auth';
import {
  validateSubscriptionCreate,
  validateSubscriptionUpdate,
  validateSubscriptionQuery,
  validateBillingPortal,
  validateUsageLimits,
  validateWebhookEvent
} from '../validators/subscription';
import { StripeService } from '../services/StripeService';

const router = express.Router();
const subscriptionController = new SubscriptionController();
const stripeService = new StripeService();

// Rate limiting
const subscriptionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    success: false,
    message: 'Too many subscription requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const webhookRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour for webhooks
  message: {
    success: false,
    message: 'Webhook rate limit exceeded'
  },
  skip: (req) => {
    // Skip rate limiting for valid webhook signatures
    return req.headers['stripe-signature'] !== undefined;
  }
});

// Multi-tenant security middleware
const ensureOrganizationAccess = async (req: any, res: any, next: any) => {
  try {
    // For now, this is a placeholder - in a real implementation you'd verify
    // the user has access to the organization from the token or session
    // This would integrate with your existing auth system
    
    const userOrganizationId = req.user?.organizationId; // From JWT token
    const requestedOrganizationId = req.body?.organizationId || req.query?.organizationId;

    if (requestedOrganizationId && userOrganizationId !== requestedOrganizationId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to organization resources'
      });
    }

    next();
  } catch (error) {
    console.error('Organization access check error:', error);
    res.status(500).json({
      success: false,
      message: 'Access validation failed'
    });
  }
};

// Error handling middleware specific to subscriptions
const handleSubscriptionErrors = (err: any, req: any, res: any, next: any) => {
  console.error('Subscription route error:', err);

  // Stripe-specific errors
  if (err.type && err.type.startsWith('Stripe')) {
    return res.status(400).json({
      success: false,
      message: 'Payment processing error',
      error: {
        type: err.type,
        code: err.code,
        message: err.message
      }
    });
  }

  // Database errors
  if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violations
    return res.status(400).json({
      success: false,
      message: 'Data validation error',
      error: {
        code: err.code,
        detail: err.detail
      }
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Routes

/**
 * GET /api/subscriptions
 * Get subscriptions with optional filtering and pagination
 */
router.get(
  '/',
  subscriptionRateLimit,
  authenticateToken,
  validateSubscriptionQuery,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      await subscriptionController.getSubscriptions(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/subscriptions/:id
 * Get a specific subscription by ID
 */
router.get(
  '/:id',
  subscriptionRateLimit,
  authenticateToken,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      await subscriptionController.getSubscription(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
router.post(
  '/',
  subscriptionRateLimit,
  authenticateToken,
  validateSubscriptionCreate,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      await subscriptionController.createSubscription(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/subscriptions/:id
 * Update an existing subscription
 */
router.put(
  '/:id',
  subscriptionRateLimit,
  authenticateToken,
  validateSubscriptionUpdate,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      await subscriptionController.updateSubscription(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/subscriptions/:id
 * Cancel a subscription
 */
router.delete(
  '/:id',
  subscriptionRateLimit,
  authenticateToken,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      await subscriptionController.deleteSubscription(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/subscriptions/:id/usage
 * Get current usage for a subscription
 */
router.get(
  '/:id/usage',
  subscriptionRateLimit,
  authenticateToken,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      await subscriptionController.getUsage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/subscriptions/:id/billing-portal
 * Create a Stripe billing portal session
 */
router.post(
  '/:id/billing-portal',
  subscriptionRateLimit,
  authenticateToken,
  validateBillingPortal,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      await subscriptionController.createBillingPortal(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/subscriptions/:id/validate-usage
 * Validate if a usage event is within limits
 */
router.post(
  '/:id/validate-usage',
  subscriptionRateLimit,
  authenticateToken,
  validateUsageLimits,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      await subscriptionController.validateUsage(req, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/subscriptions/:id/invoices
 * Get invoices for a subscription
 */
router.get(
  '/:id/invoices',
  subscriptionRateLimit,
  authenticateToken,
  ensureOrganizationAccess,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query as any;

      // This endpoint needs proper implementation - for now return placeholder
      res.json({
        success: true,
        data: [],
        message: 'Invoice endpoint not yet implemented'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/subscriptions/webhooks/stripe
 * Handle Stripe webhooks
 */
router.post(
  '/webhooks/stripe',
  webhookRateLimit,
  express.raw({ type: 'application/json' }),
  validateWebhookEvent,
  async (req, res, next) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const payload = req.body.toString();

      // Construct and verify webhook event
      const event = await stripeService.constructWebhookEvent(payload, signature);

      // Process the event (this would typically be handled by the existing webhook handler)
      // For now, we'll just acknowledge receipt
      console.log(`Received webhook event: ${event.type}`);

      res.json({ 
        success: true,
        received: true,
        eventType: event.type
      });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(400).json({
        success: false,
        message: 'Webhook processing failed'
      });
    }
  }
);

/**
 * GET /api/subscriptions/health
 * Health check endpoint for subscription service
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'subscriptions',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Apply error handling middleware
router.use(handleSubscriptionErrors);

export { router as subscriptionRoutes };