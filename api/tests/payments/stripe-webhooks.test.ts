import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { handleStripeWebhook, createStripeCustomer, createSubscription, cancelSubscription } from '../../src/payments/stripe-webhooks';

// Mock dependencies
const mockStripe = {
  webhooks: {
    constructEvent: vi.fn()
  },
  customers: {
    create: vi.fn()
  },
  subscriptions: {
    create: vi.fn(),
    update: vi.fn()
  }
};

const mockClerkClient = {
  organizations: {
    getOrganizationList: vi.fn(),
    updateOrganizationMetadata: vi.fn()
  }
};

const mockDatabaseClient = {
  query: vi.fn(),
  release: vi.fn()
};

const mockDatabaseConfig = {
  connect: vi.fn(() => Promise.resolve(mockDatabaseClient))
};

// Mock performance
const mockPerformance = {
  now: vi.fn(() => Date.now())
};

// Test data
const mockCustomer = {
  id: 'cus_123',
  email: 'test@company.com',
  name: 'Test Company'
};

const mockSubscription = {
  id: 'sub_123',
  customer: 'cus_123',
  status: 'active',
  items: {
    data: [{
      price: {
        id: 'price_professional_monthly',
        recurring: { interval: 'month' }
      }
    }]
  },
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  cancel_at_period_end: false
};

const mockInvoice = {
  id: 'in_123',
  customer: 'cus_123',
  subscription: 'sub_123',
  amount_paid: 9900,
  status: 'paid'
};

const mockOrganization = {
  id: 'org_123',
  name: 'Test Logistics Co',
  privateMetadata: {
    stripeCustomerId: 'cus_123',
    subscriptionStatus: 'active'
  }
};

describe('Stripe Webhooks Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeAll(() => {
    // Setup global mocks
    global.performance = mockPerformance as any;
    vi.mock('stripe', () => ({
      default: vi.fn(() => mockStripe)
    }));
    vi.mock('../../src/lib/auth/clerk-setup', () => ({
      clerkClient: mockClerkClient
    }));
    vi.mock('../../src/config/database', () => ({
      databaseConfig: mockDatabaseConfig
    }));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      body: Buffer.from('webhook-body'),
      headers: {
        'stripe-signature': 'test-signature'
      }
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockPerformance.now.mockReturnValue(Date.now());
    mockDatabaseClient.query.mockResolvedValue({ rows: [{ id: 'org_123' }] });
    mockClerkClient.organizations.getOrganizationList.mockResolvedValue([mockOrganization]);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('handleStripeWebhook', () => {
    it('should handle customer.subscription.created event', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.created',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining([
          'org_123',
          'cus_123',
          'sub_123',
          'active',
          'professional',
          'monthly'
        ])
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ received: true })
      );
    });

    it('should handle customer.subscription.updated event', async () => {
      // Arrange
      const updatedSubscription = {
        ...mockSubscription,
        status: 'past_due'
      };
      const event = {
        type: 'customer.subscription.updated',
        data: { object: updatedSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining(['past_due'])
      );
      expect(mockClerkClient.organizations.updateOrganizationMetadata).toHaveBeenCalledWith(
        'org_123',
        expect.objectContaining({
          privateMetadata: expect.objectContaining({
            subscriptionStatus: 'past_due'
          })
        })
      );
    });

    it('should handle customer.subscription.deleted event', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining(['canceled'])
      );
    });

    it('should handle invoice.payment_succeeded event', async () => {
      // Arrange
      const event = {
        type: 'invoice.payment_succeeded',
        data: { object: mockInvoice }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining(['active'])
      );
    });

    it('should handle invoice.payment_failed event', async () => {
      // Arrange
      const failedInvoice = { ...mockInvoice, status: 'payment_failed' };
      const event = {
        type: 'invoice.payment_failed',
        data: { object: failedInvoice }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining(['past_due'])
      );
    });

    it('should reject invalid webhook signatures', async () => {
      // Arrange
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.stringContaining('Webhook Error: Invalid signature')
      );
    });

    it('should handle unknown event types gracefully', async () => {
      // Arrange
      const event = {
        type: 'unknown.event.type',
        data: { object: {} }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Unhandled event type: unknown.event.type');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ received: true })
      );
      consoleSpy.mockRestore();
    });

    it('should complete webhook processing within 500ms', async () => {
      // Arrange
      const startTime = 1000;
      const endTime = 1300; // 300ms
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      const event = {
        type: 'customer.subscription.created',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Slow webhook processing')
      );
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          received: true,
          processingTime: '300.00'
        })
      );
      consoleSpy.mockRestore();
    });

    it('should warn if webhook processing exceeds 500ms', async () => {
      // Arrange
      const startTime = 1000;
      const endTime = 1600; // 600ms
      mockPerformance.now
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      
      const event = {
        type: 'customer.subscription.created',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Slow webhook processing: 600.00ms for customer.subscription.created'
      );
      consoleSpy.mockRestore();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.created',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockDatabaseClient.query.mockRejectedValue(new Error('Database error'));

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Webhook processing failed'
      });
    });

    it('should handle organization not found scenario', async () => {
      // Arrange
      const event = {
        type: 'customer.subscription.created',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockDatabaseClient.query.mockResolvedValue({ rows: [] }); // No organization found
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await handleStripeWebhook(mockReq as Request, mockRes as Response);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'No organization found for Stripe customer: cus_123'
      );
      consoleSpy.mockRestore();
    });
  });

  describe('createStripeCustomer', () => {
    it('should create customer and update organization', async () => {
      // Arrange
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      // Act
      const customerId = await createStripeCustomer(
        'org_123',
        'test@company.com',
        'Test Company'
      );

      // Assert
      expect(customerId).toBe('cus_123');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@company.com',
        name: 'Test Company',
        metadata: { organizationId: 'org_123' }
      });
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        'UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2',
        ['cus_123', 'org_123']
      );
    });

    it('should handle Stripe API errors', async () => {
      // Arrange
      mockStripe.customers.create.mockRejectedValue(new Error('Stripe API error'));

      // Act & Assert
      await expect(createStripeCustomer('org_123', 'test@company.com', 'Test Company'))
        .rejects.toThrow('Stripe API error');
    });
  });

  describe('createSubscription', () => {
    it('should create subscription with correct parameters', async () => {
      // Arrange
      const mockCreatedSubscription = {
        ...mockSubscription,
        latest_invoice: {
          payment_intent: {
            client_secret: 'pi_secret_123'
          }
        }
      };
      mockStripe.subscriptions.create.mockResolvedValue(mockCreatedSubscription);

      // Act
      const subscription = await createSubscription(
        'cus_123',
        'price_professional_monthly',
        'org_123'
      );

      // Assert
      expect(subscription).toEqual(mockCreatedSubscription);
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_professional_monthly' }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: { organizationId: 'org_123' }
      });
    });

    it('should handle subscription creation errors', async () => {
      // Arrange
      mockStripe.subscriptions.create.mockRejectedValue(new Error('Payment method required'));

      // Act & Assert
      await expect(createSubscription('cus_123', 'price_123', 'org_123'))
        .rejects.toThrow('Payment method required');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end by default', async () => {
      // Arrange
      const canceledSubscription = { ...mockSubscription, cancel_at_period_end: true };
      mockStripe.subscriptions.update.mockResolvedValue(canceledSubscription);

      // Act
      const subscription = await cancelSubscription('sub_123');

      // Assert
      expect(subscription.cancel_at_period_end).toBe(true);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true
      });
    });

    it('should cancel subscription immediately when specified', async () => {
      // Arrange
      const canceledSubscription = { ...mockSubscription, cancel_at_period_end: false };
      mockStripe.subscriptions.update.mockResolvedValue(canceledSubscription);

      // Act
      const subscription = await cancelSubscription('sub_123', false);

      // Assert
      expect(subscription.cancel_at_period_end).toBe(false);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: false
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete subscription lifecycle', async () => {
      // Test subscription creation
      const createEvent = {
        type: 'customer.subscription.created',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(createEvent);
      
      await handleStripeWebhook(mockReq as Request, mockRes as Response);
      
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ received: true })
      );

      // Test subscription update
      vi.clearAllMocks();
      const updateEvent = {
        type: 'customer.subscription.updated',
        data: { object: { ...mockSubscription, status: 'past_due' } }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(updateEvent);
      
      await handleStripeWebhook(mockReq as Request, mockRes as Response);
      
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining(['past_due'])
      );

      // Test subscription deletion
      vi.clearAllMocks();
      const deleteEvent = {
        type: 'customer.subscription.deleted',
        data: { object: mockSubscription }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(deleteEvent);
      
      await handleStripeWebhook(mockReq as Request, mockRes as Response);
      
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining(['canceled'])
      );
    });

    it('should handle payment flow with invoice events', async () => {
      // Test successful payment
      const successEvent = {
        type: 'invoice.payment_succeeded',
        data: { object: mockInvoice }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(successEvent);
      
      await handleStripeWebhook(mockReq as Request, mockRes as Response);
      
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining(['active'])
      );

      // Test failed payment
      vi.clearAllMocks();
      const failEvent = {
        type: 'invoice.payment_failed',
        data: { object: mockInvoice }
      };
      mockStripe.webhooks.constructEvent.mockReturnValue(failEvent);
      
      await handleStripeWebhook(mockReq as Request, mockRes as Response);
      
      expect(mockDatabaseClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO organization_subscriptions'),
        expect.arrayContaining(['past_due'])
      );
    });

    it('should maintain performance under load', async () => {
      // Arrange
      const events = [
        { type: 'customer.subscription.created', data: { object: mockSubscription } },
        { type: 'invoice.payment_succeeded', data: { object: mockInvoice } },
        { type: 'customer.subscription.updated', data: { object: mockSubscription } }
      ];

      // Act - Process multiple webhooks
      const promises = events.map(async (event, index) => {
        const startTime = 1000 + (index * 100);
        const endTime = startTime + 200; // 200ms each
        mockPerformance.now
          .mockReturnValueOnce(startTime)
          .mockReturnValueOnce(endTime);
        
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        return handleStripeWebhook(mockReq as Request, mockRes as Response);
      });

      await Promise.all(promises);

      // Assert
      expect(mockRes.json).toHaveBeenCalledTimes(events.length);
      events.forEach((_, index) => {
        expect(mockRes.json).toHaveBeenNthCalledWith(index + 1,
          expect.objectContaining({ 
            received: true,
            processingTime: '200.00'
          })
        );
      });
    });
  });
});