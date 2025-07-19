import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { databaseConfig } from '../config/database';
import { redisClient } from '../config/redis';

const router = express.Router();
const pool = databaseConfig;

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Types
interface Driver {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  vehicle_type: 'van' | 'truck' | 'motorcycle' | 'car';
  status: 'available' | 'busy' | 'offline' | 'break';
  shift_start_time: string;
  shift_end_time: string;
  shift_is_active: boolean;
  rating: number;
  total_deliveries: number;
  created_at: string;
  updated_at: string;
}

interface LoginCredentials {
  driverId: string;
  pin: string;
}

// Helper functions
const generateTokens = (driverId: string) => {
  const accessToken = jwt.sign(
    { driverId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { driverId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
};

const verifyToken = (token: string, secret: string = JWT_SECRET) => {
  try {
    return jwt.verify(token, secret) as any;
  } catch (error) {
    return null;
  }
};

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }

  req.driverId = decoded.driverId;
  next();
};

// Routes

/**
 * POST /api/auth/login
 * Driver login with employee ID and PIN
 */
router.post('/login', async (req, res) => {
  try {
    const { driverId, pin }: LoginCredentials = req.body;

    if (!driverId || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID and PIN are required'
      });
    }

    // Query driver from database
    const query = `
      SELECT 
        id,
        employee_id,
        name,
        email,
        phone,
        license_number,
        license_expiry,
        vehicle_type,
        status,
        shift_start_time,
        shift_end_time,
        shift_is_active,
        rating,
        total_deliveries,
        created_at,
        updated_at,
        pin_hash
      FROM drivers 
      WHERE employee_id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [driverId]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid driver ID or PIN'
      });
    }

    const driver = result.rows[0];

    // Verify PIN
    const pinMatch = await bcrypt.compare(pin, driver.pin_hash);
    if (!pinMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid driver ID or PIN'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(driver.id);

    // Store refresh token in Redis with expiration
    await redisClient.setEx(`refresh_token:${driver.id}`, 7 * 24 * 60 * 60, refreshToken);

    // Update driver status to available and last login
    await pool.query(
      'UPDATE drivers SET status = $1, last_login = NOW() WHERE id = $2',
      ['available', driver.id]
    );

    // Format driver data for response
    const driverData = {
      id: driver.id,
      employeeId: driver.employee_id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      licenseNumber: driver.license_number,
      licenseExpiry: driver.license_expiry,
      vehicleType: driver.vehicle_type,
      status: 'available',
      shift: {
        startTime: driver.shift_start_time,
        endTime: driver.shift_end_time,
        isActive: driver.shift_is_active
      },
      rating: driver.rating,
      totalDeliveries: driver.total_deliveries,
      createdAt: driver.created_at,
      updatedAt: driver.updated_at
    };

    res.json({
      success: true,
      token: accessToken,
      refreshToken,
      driver: driverData,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const refreshToken = authHeader && authHeader.split(' ')[1];

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in Redis
    const storedToken = await redisClient.get(`refresh_token:${decoded.driverId}`);
    if (storedToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token revoked'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.driverId);

    // Update refresh token in Redis
    await redisClient.setEx(`refresh_token:${decoded.driverId}`, 7 * 24 * 60 * 60, newRefreshToken);

    res.json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify access token validity
 */
router.get('/verify', authenticateToken, async (req: any, res) => {
  try {
    // If we reach here, token is valid (middleware verified it)
    const query = 'SELECT id, employee_id, name, status FROM drivers WHERE id = $1';
    const result = await pool.query(query, [req.driverId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      valid: true,
      driver: {
        id: result.rows[0].id,
        employeeId: result.rows[0].employee_id,
        name: result.rows[0].name,
        status: result.rows[0].status
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout driver and revoke tokens
 */
router.post('/logout', authenticateToken, async (req: any, res) => {
  try {
    // Remove refresh token from Redis
    await redisClient.del(`refresh_token:${req.driverId}`);

    // Update driver status to offline
    await pool.query(
      'UPDATE drivers SET status = $1 WHERE id = $2',
      ['offline', req.driverId]
    );

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/auth/session
 * Create/update driver session
 */
router.post('/session', authenticateToken, async (req: any, res) => {
  try {
    const { sessionId, startTime, deviceInfo } = req.body;

    const query = `
      INSERT INTO driver_sessions (session_id, driver_id, start_time, device_info, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (session_id) 
      DO UPDATE SET 
        start_time = $3,
        device_info = $4,
        is_active = true
    `;

    await pool.query(query, [sessionId, req.driverId, startTime, JSON.stringify(deviceInfo)]);

    res.json({
      success: true,
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export { router as authRoutes, authenticateToken };