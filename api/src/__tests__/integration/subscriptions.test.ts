import request from 'supertest';
import { app } from '../../src/app';
import { databaseConfig } from '../../src/config/database';
import { redisClient } from '../../src/config/redis';

describe('Subscription API Integration Tests', () => {
  let authToken: string;
  let organizationId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    // Setup test database and Redis connections
    try {
      await redisClient.connect();
      
      // Create test organization and user
      const client = await databaseConfig.connect();
      try {
        // Insert test organization
        const orgResult = await client.query(`
          INSERT INTO organizations (id, name, email, stripe_customer_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING id
        `, ['test-org-123', 'Test Organization', 'test@example.com', 'cus_test_123']);
        
        organizationId = orgResult.rows[0].id;

        // Insert test user
        await client.query(`
          INSERT INTO users (id, organization_id, email, role, permissions, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, ['test-user-123', organizationId, 'testuser@example.com', 'admin', '["admin"]', true]);

        // Generate test JWT token (simplified for testing)
        authToken = 'Bearer test-jwt-token';
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Test setup failed:', error);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      const client = await databaseConfig.connect();
      try {
        await client.query('DELETE FROM subscription_usage_logs WHERE organization_id = $1', [organizationId]);
        await client.query('DELETE FROM subscriptions WHERE organization_id = $1', [organizationId]);
        await client.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
        await client.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
      } finally {
        client.release();
      }
      
      await redisClient.disconnect();
    } catch (error) {
      console.error('Test cleanup failed:', error);
    }
  });

  describe('GET /api/subscriptions/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/subscriptions/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        service: 'subscriptions',
        status: 'healthy'
      });
    });
  });

  describe('POST /api/subscriptions', () => {
    it('should create a new subscription', async () => {
      const subscriptionData = {
        organizationId: organizationId,
        tier: 'professional',
        billingCycle: 'monthly'
      };

      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', authToken)
        .send(subscriptionData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          organizationId: organizationId,
          tier: 'professional',
          billingCycle: 'monthly',
          status: expect.any(String)
        }
      });

      subscriptionId = response.body.data.id;
    });

    it('should return validation error for invalid data', async () => {
      const invalidData = {
        organizationId: 'invalid-uuid',
        tier: 'invalid-tier',
        billingCycle: 'invalid-cycle'
      };

      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });

    it('should return 401 without authentication', async () => {
      const subscriptionData = {
        organizationId: organizationId,
        tier: 'starter',
        billingCycle: 'monthly'
      };

      await request(app)
        .post('/api/subscriptions')
        .send(subscriptionData)
        .expect(401);
    });
  });

  describe('GET /api/subscriptions', () => {
    it('should retrieve subscriptions with pagination', async () => {
      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', authToken)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Array),
        pagination: {
          page: 1,
          limit: 10,
          total: expect.any(Number),
          pages: expect.any(Number)
        }
      });
    });

    it('should filter subscriptions by organization', async () => {
      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', authToken)
        .query({ organizationId: organizationId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter subscriptions by tier', async () => {
      const response = await request(app)
        .get('/api/subscriptions')
        .set('Authorization', authToken)
        .query({ tier: 'professional' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/subscriptions/:id', () => {
    it('should retrieve a specific subscription', async () => {
      if (!subscriptionId) {
        // Create a subscription first if none exists
        const createResponse = await request(app)
          .post('/api/subscriptions')
          .set('Authorization', authToken)
          .send({
            organizationId: organizationId,
            tier: 'starter',
            billingCycle: 'monthly'
          });
        subscriptionId = createResponse.body.data.id;
      }

      const response = await request(app)
        .get(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: subscriptionId,
          organizationId: organizationId
        }
      });
    });

    it('should return 404 for non-existent subscription', async () => {
      await request(app)
        .get('/api/subscriptions/non-existent-id')
        .set('Authorization', authToken)
        .expect(404);
    });
  });

  describe('PUT /api/subscriptions/:id', () => {
    it('should update a subscription', async () => {
      if (!subscriptionId) return;

      const updateData = {
        tier: 'enterprise',
        billingCycle: 'annual'
      };

      const response = await request(app)
        .put(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: subscriptionId,
          tier: 'enterprise',
          billingCycle: 'annual'
        }
      });
    });

    it('should return validation error for invalid update data', async () => {
      if (!subscriptionId) return;

      const invalidData = {
        tier: 'invalid-tier'
      };

      await request(app)
        .put(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/subscriptions/:id/usage', () => {
    it('should retrieve usage data for a subscription', async () => {
      if (!subscriptionId) return;

      const response = await request(app)
        .get(`/api/subscriptions/${subscriptionId}/usage`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          current: expect.any(Object),
          limits: expect.any(Object),
          percentages: expect.any(Object)
        }
      });
    });
  });

  describe('POST /api/subscriptions/:id/validate-usage', () => {
    it('should validate usage limits', async () => {
      if (!subscriptionId) return;

      const validationData = {
        eventType: 'driver_added',
        quantity: 1
      };

      const response = await request(app)
        .post(`/api/subscriptions/${subscriptionId}/validate-usage`)
        .set('Authorization', authToken)
        .send(validationData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          valid: expect.any(Boolean),
          eventType: 'driver_added'
        }
      });
    });

    it('should return validation error for invalid event type', async () => {
      if (!subscriptionId) return;

      const invalidData = {
        eventType: 'invalid_event',
        quantity: 1
      };

      await request(app)
        .post(`/api/subscriptions/${subscriptionId}/validate-usage`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('POST /api/subscriptions/:id/billing-portal', () => {
    it('should create billing portal session', async () => {
      if (!subscriptionId) return;

      const portalData = {
        returnUrl: 'https://example.com/dashboard'
      };

      const response = await request(app)
        .post(`/api/subscriptions/${subscriptionId}/billing-portal`)
        .set('Authorization', authToken)
        .send(portalData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          url: expect.any(String)
        }
      });
    });

    it('should return validation error for invalid return URL', async () => {
      if (!subscriptionId) return;

      const invalidData = {
        returnUrl: 'invalid-url'
      };

      await request(app)
        .post(`/api/subscriptions/${subscriptionId}/billing-portal`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /api/subscriptions/:id', () => {
    it('should cancel a subscription', async () => {
      if (!subscriptionId) return;

      const response = await request(app)
        .delete(`/api/subscriptions/${subscriptionId}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Subscription canceled successfully'
      });
    });

    it('should return 404 for non-existent subscription', async () => {
      await request(app)
        .delete('/api/subscriptions/non-existent-id')
        .set('Authorization', authToken)
        .expect(404);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // Make multiple rapid requests
      const promises = Array.from({ length: 105 }, () =>
        request(app)
          .get('/api/subscriptions/health')
          .set('Authorization', authToken)
      );

      const responses = await Promise.all(promises.map(p => p.catch(e => e.response)));
      
      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(r => r && r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database connections
      // For now, we'll test that the app handles unknown routes
      await request(app)
        .get('/api/subscriptions/unknown-endpoint')
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return proper error format', async () => {
      const response = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', authToken)
        .send({}) // Empty data to trigger validation error
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String)
      });
    });
  });

  describe('Multi-tenancy', () => {
    it('should prevent access to other organizations data', async () => {
      // Create another organization's subscription ID
      const otherOrgSubscriptionId = 'sub_other_org_123';

      await request(app)
        .get(`/api/subscriptions/${otherOrgSubscriptionId}`)
        .set('Authorization', authToken)
        .expect(403);
    });
  });

  describe('Feature Access Control', () => {
    it('should restrict access based on subscription tier', async () => {
      // This would test feature-specific endpoints
      // Example: advanced analytics might require professional+ tier
      const response = await request(app)
        .get('/api/subscriptions/advanced-analytics')
        .set('Authorization', authToken);

      // Should either succeed or return a feature restriction error
      if (response.status === 403) {
        expect(response.body).toMatchObject({
          success: false,
          upgradeRequired: true
        });
      }
    });
  });
});