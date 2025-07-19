import Joi from 'joi';

export const subscriptionCreateSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
  tier: Joi.string().valid('starter', 'professional', 'enterprise').required(),
  billingCycle: Joi.string().valid('monthly', 'annual').required(),
  paymentMethodId: Joi.string().optional(),
  couponCode: Joi.string().optional()
});

export const subscriptionUpdateSchema = Joi.object({
  tier: Joi.string().valid('starter', 'professional', 'enterprise').optional(),
  billingCycle: Joi.string().valid('monthly', 'annual').optional(),
  cancelAtPeriodEnd: Joi.boolean().optional(),
  paymentMethodId: Joi.string().optional()
}).min(1);

export const subscriptionQuerySchema = Joi.object({
  organizationId: Joi.string().uuid().optional(),
  status: Joi.string().valid('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'unpaid').optional(),
  tier: Joi.string().valid('starter', 'professional', 'enterprise').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export const usageTrackingSchema = Joi.object({
  eventType: Joi.string().valid(
    'driver_added', 
    'driver_removed', 
    'route_created', 
    'delivery_created', 
    'api_call', 
    'geofence_created'
  ).required(),
  eventDetails: Joi.object().required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  }).optional(),
  metadata: Joi.object().default({})
});

export const webhookEventSchema = Joi.object({
  id: Joi.string().required(),
  object: Joi.string().valid('event').required(),
  type: Joi.string().required(),
  data: Joi.object().required(),
  created: Joi.number().required()
});

export const billingPortalSchema = Joi.object({
  returnUrl: Joi.string().uri().required()
});

export const invoiceQuerySchema = Joi.object({
  customerId: Joi.string().optional(),
  status: Joi.string().valid('draft', 'open', 'paid', 'uncollectible', 'void').optional(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  startingAfter: Joi.string().optional()
});

export const usageLimitValidationSchema = Joi.object({
  organizationId: Joi.string().uuid().required(),
  eventType: Joi.string().valid(
    'driver_added', 
    'route_created', 
    'delivery_created', 
    'geofence_created', 
    'api_call'
  ).required(),
  quantity: Joi.number().integer().min(1).default(1)
});

// Middleware validation functions
export const validateSubscriptionCreate = (req: any, res: any, next: any) => {
  const { error } = subscriptionCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

export const validateSubscriptionUpdate = (req: any, res: any, next: any) => {
  const { error } = subscriptionUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

export const validateSubscriptionQuery = (req: any, res: any, next: any) => {
  const { error, value } = subscriptionQuerySchema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  req.validatedQuery = value;
  next();
};

export const validateUsageTracking = (req: any, res: any, next: any) => {
  const { error } = usageTrackingSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

export const validateWebhookEvent = (req: any, res: any, next: any) => {
  const { error } = webhookEventSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid webhook event',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

export const validateBillingPortal = (req: any, res: any, next: any) => {
  const { error } = billingPortalSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};

export const validateUsageLimits = (req: any, res: any, next: any) => {
  const { error } = usageLimitValidationSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }
  next();
};