import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
});

beforeEach(() => {
  // Reset any global state before each test
});

afterEach(() => {
  // Clean up after each test
});

// Global test utilities
declare global {
  var testUtils: {
    generateId: () => string;
    generateEmail: () => string;
    generateOrganizationId: () => string;
    delay: (ms: number) => Promise<void>;
  };
}

global.testUtils = {
  generateId: () => 'test_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
  generateEmail: () => `test${Date.now()}@example.com`,
  generateOrganizationId: () => 'org_' + Math.random().toString(36).substr(2, 9),
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

// Mock external services for testing
if (process.env.NODE_ENV === 'test') {
  // Mock Stripe
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock_secret';
  
  // Mock Redis
  process.env.REDIS_URL = 'redis://localhost:6379/15'; // Use test database
  
  // Mock Database
  process.env.DB_NAME = 'logistics_test_db';
}