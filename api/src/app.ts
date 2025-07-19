import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import RedisStore from 'connect-redis';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { databaseConfig, testConnection } from './config/database';
import { redisClient } from './config/redis';
import { healthRoutes } from './routes/health';
import { trackingRoutes } from './routes/drivers/tracking';
import mappingRoutes from './routes/mapping';
import { authRoutes } from './routes/auth';
import { subscriptionRoutes } from './routes/subscriptions';
import { handleStripeWebhook } from './payments/stripe-webhooks';
import { errorHandler } from './middleware/errorHandler';
import { csrfMiddleware, csrfTokenMiddleware, csrfTokenHandler, csrfErrorHandler } from './middleware/csrf';
import { socketHandler } from './sockets/socketHandler';
import { performanceMonitor } from './utils/performanceMonitor';
import { SubscriptionNotificationService } from './services/SubscriptionNotificationService';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:8081',
      'http://localhost:8085',
      'exp://localhost:8081',
      'exp://localhost:8085',
      'http://192.168.18.2:8081',
      'http://192.168.18.2:8085',
      'exp://192.168.18.2:8081',
      'exp://192.168.18.2:8085'
    ],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Webhook-specific rate limiting (more permissive for legitimate webhook traffic)
const webhookLimiter = rateLimit({
  windowMs: parseInt(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.WEBHOOK_RATE_LIMIT_MAX || '1000'), // Allow up to 1000 webhook requests per minute per IP
  message: 'Too many webhook requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator to also limit by webhook type
  keyGenerator: (req) => {
    const webhookType = req.headers['stripe-signature'] ? 'stripe' : 'unknown';
    return `${req.ip}-${webhookType}`;
  }
});

// Strict rate limiting for sensitive authentication routes
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10'), // limit each IP to 10 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:8085',
    'exp://localhost:8081',
    'exp://localhost:8085',
    'http://192.168.18.2:8081',
    'http://192.168.18.2:8085',
    'exp://192.168.18.2:8081',
    'exp://192.168.18.2:8085'
  ],
  credentials: true
}));
// Stripe webhook endpoint needs raw body, so place before JSON middleware
app.use('/api/webhooks/stripe', webhookLimiter, express.raw({ type: 'application/json' }), handleStripeWebhook);

// Cookie parser must come before session and CSRF
app.use(cookieParser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(limiter);

// Session configuration
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CSRF token middleware (makes token available in res.locals)
app.use(csrfTokenMiddleware);

// CSRF token endpoint (GET requests are excluded from CSRF validation)
app.get('/api/csrf-token', csrfTokenHandler);

// Initialize subscription notification service
const subscriptionNotificationService = new SubscriptionNotificationService(io);

// CSRF protection middleware (after session, but excludes specific routes)
app.use('/api', (req, res, next) => {
  // Skip CSRF for these endpoints
  const skipPaths = [
    '/api/webhooks/', // All webhook endpoints
    '/api/health',    // Health check
    '/api/csrf-token' // CSRF token endpoint
  ];
  
  const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
  if (shouldSkip) {
    return next();
  }
  
  // Apply CSRF protection for other endpoints
  csrfMiddleware(req, res, next);
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/drivers', trackingRoutes);
app.use('/api/mapping', mappingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Socket.io
socketHandler(io);

// Error handling - CSRF errors first, then general errors
app.use(csrfErrorHandler);
app.use(errorHandler);

// Start server
server.listen(PORT, async () => {
  try {
    await testConnection();
    console.log('✅ Database connected successfully');

    await redisClient.connect();
    await redisClient.ping();
    console.log('✅ Redis connected successfully');

    console.log(`🚀 Server running on port ${PORT}`);

    // Start performance monitoring in production
    if (process.env.NODE_ENV === 'production') {
      performanceMonitor.startMonitoring();
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
});

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  console.log('\n📡 Received %s. Starting graceful shutdown...', signal);
  
  try {
    // Close HTTP server
    console.log('🔌 Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Close Socket.io connections
    console.log('🔌 Closing Socket.io connections...');
    io.close();

    // Close Redis connection
    console.log('🔌 Closing Redis connection...');
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }

    // Close database connections
    console.log('🔌 Closing database connections...');
    await databaseConfig.end();

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // Nodemon restart

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export { app, io, subscriptionNotificationService };
