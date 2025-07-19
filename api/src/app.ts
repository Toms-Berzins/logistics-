import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
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
import { errorHandler } from './middleware/errorHandler';
import { socketHandler } from './sockets/socketHandler';
import { performanceMonitor } from './utils/performanceMonitor';

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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
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

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/drivers', trackingRoutes);
app.use('/api/mapping', mappingRoutes);

// Socket.io
socketHandler(io);

// Error handling
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

export { app, io };
