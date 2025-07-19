import request from 'supertest';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { csrfMiddleware, csrfTokenMiddleware, csrfTokenHandler, csrfErrorHandler } from '../middleware/csrf';

// Test app setup
const createTestApp = () => {
  const app = express();
  
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Rate limiting for security
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(limiter);
  
  // Simple in-memory session for testing
  app.use(session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));
  
  // CSRF middleware
  app.use(csrfTokenMiddleware);
  app.get('/csrf-token', csrfTokenHandler);
  
  // Protected routes (POST requests require CSRF)
  app.use('/protected', csrfMiddleware);
  app.post('/protected/data', (req, res) => {
    res.json({ success: true, message: 'Protected data updated' });
  });
  
  // Unprotected routes (GET requests don't require CSRF)
  app.get('/public/data', (req, res) => {
    res.json({ success: true, message: 'Public data' });
  });
  
  // Error handling
  app.use(csrfErrorHandler);
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Test error:', err);
    res.status(500).json({ error: err.message });
  });
  
  return app;
};

describe('CSRF Protection', () => {
  let app: express.Application;
  let agent: request.SuperAgentTest;

  beforeEach(() => {
    app = createTestApp();
    agent = request.agent(app);
  });

  describe('CSRF Token Endpoint', () => {
    it('should provide CSRF token on GET request', async () => {
      const response = await agent
        .get('/csrf-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('csrfToken');
      expect(typeof response.body.csrfToken).toBe('string');
      expect(response.body.csrfToken.length).toBeGreaterThan(20);
    });

    it('should set CSRF token in cookie', async () => {
      const response = await agent
        .get('/csrf-token')
        .expect(200);

      expect(response.headers['set-cookie']).toBeDefined();
      const csrfCookie = response.headers['set-cookie'].find((cookie: string) => 
        cookie.startsWith('csrf-token=')
      );
      expect(csrfCookie).toBeDefined();
    });
  });

  describe('CSRF Protection for POST Requests', () => {
    it('should reject POST request without CSRF token', async () => {
      const response = await agent
        .post('/protected/data')
        .send({ test: 'data' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'CSRF_TOKEN_INVALID');
    });

    it('should reject POST request with invalid CSRF token', async () => {
      const response = await agent
        .post('/protected/data')
        .set('csrf-token', 'invalid-token')
        .send({ test: 'data' })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'CSRF_TOKEN_INVALID');
    });

    it('should accept POST request with valid CSRF token in header', async () => {
      // First, get a CSRF token
      const tokenResponse = await agent
        .get('/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.csrfToken;

      // Use the token in a POST request
      const response = await agent
        .post('/protected/data')
        .set('csrf-token', csrfToken)
        .send({ test: 'data' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Protected data updated');
    });

    it('should accept POST request with valid CSRF token in body', async () => {
      // First, get a CSRF token
      const tokenResponse = await agent
        .get('/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.csrfToken;

      // Use the token in request body
      const response = await agent
        .post('/protected/data')
        .send({ test: 'data', _csrf: csrfToken })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should accept POST request with valid CSRF token in query', async () => {
      // First, get a CSRF token
      const tokenResponse = await agent
        .get('/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.csrfToken;

      // Use the token in query parameter
      const response = await agent
        .post(`/protected/data?_csrf=${encodeURIComponent(csrfToken)}`)
        .send({ test: 'data' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('GET Requests (No CSRF Required)', () => {
    it('should allow GET requests without CSRF token', async () => {
      const response = await agent
        .get('/public/data')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Public data');
    });
  });

  describe('Different HTTP Methods', () => {
    it('should reject PUT request without CSRF token', async () => {
      const response = await agent
        .put('/protected/data')
        .send({ test: 'data' })
        .expect(403);

      expect(response.body).toHaveProperty('code', 'CSRF_TOKEN_INVALID');
    });

    it('should reject DELETE request without CSRF token', async () => {
      const response = await agent
        .delete('/protected/data')
        .expect(403);

      expect(response.body).toHaveProperty('code', 'CSRF_TOKEN_INVALID');
    });

    it('should reject PATCH request without CSRF token', async () => {
      const response = await agent
        .patch('/protected/data')
        .send({ test: 'data' })
        .expect(403);

      expect(response.body).toHaveProperty('code', 'CSRF_TOKEN_INVALID');
    });

    it('should allow HEAD requests without CSRF token', async () => {
      await agent
        .head('/public/data')
        .expect(200);
    });

    it('should allow OPTIONS requests without CSRF token', async () => {
      await agent
        .options('/public/data')
        .expect(200);
    });
  });

  describe('Session Persistence', () => {
    it('should maintain CSRF token across requests in same session', async () => {
      // Get first token
      const firstResponse = await agent
        .get('/csrf-token')
        .expect(200);

      const firstToken = firstResponse.body.csrfToken;

      // Get second token (should be same due to session)
      const secondResponse = await agent
        .get('/csrf-token')
        .expect(200);

      const secondToken = secondResponse.body.csrfToken;

      // Both tokens should be valid for the same session (tokens can be different but both valid)
      expect(firstToken).toBeTruthy();
      expect(secondToken).toBeTruthy();

      // Both tokens should work for protected requests
      await agent
        .post('/protected/data')
        .set('csrf-token', firstToken)
        .send({ test: 'data' })
        .expect(200);

      await agent
        .post('/protected/data')
        .set('csrf-token', secondToken)
        .send({ test: 'data' })
        .expect(200);
    });
  });
});