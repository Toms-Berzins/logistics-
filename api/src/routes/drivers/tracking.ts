import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { driverTrackingService } from '../../services/driverTracking';
import { getDriverEventHandler } from '../../sockets/socketHandler';
import { performanceMonitor } from '../../utils/performanceMonitor';

const router = Router();

// Validation schemas
const locationUpdateSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().min(0).max(10000).optional(),
  speed: Joi.number().min(0).max(1000).optional(),
  heading: Joi.number().min(0).max(360).optional(),
  altitude: Joi.number().optional(),
  timestamp: Joi.string().isoDate().optional(),
});

const batchLocationUpdateSchema = Joi.object({
  updates: Joi.array().items(locationUpdateSchema).min(1).max(100).required(),
});

const nearbyDriversSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required(),
  radius: Joi.number().min(0.1).max(100).default(5), // km
  limit: Joi.number().min(1).max(100).default(20),
  excludeDriverIds: Joi.array().items(Joi.string()).optional(),
});

const statusUpdateSchema = Joi.object({
  isOnline: Joi.boolean().required(),
  isAvailable: Joi.boolean().required(),
  currentJobId: Joi.string().optional(),
  batteryLevel: Joi.number().min(0).max(100).optional(),
  connectionQuality: Joi.string().valid('excellent', 'good', 'poor', 'offline').optional(),
});

// Middleware for request validation
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
        })),
      });
    }
    
    req.body = value;
    next();
  };
};

// Middleware for driver authentication (simplified - in real app, use JWT)
const authenticateDriver = (req: Request, res: Response, next: NextFunction) => {
  const driverId = req.params.driverId || req.headers['x-driver-id'];
  const companyId = req.headers['x-company-id'];
  
  if (!driverId || !companyId) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Driver ID and Company ID must be provided',
    });
  }
  
  // Attach to request for use in handlers
  req.driverAuth = {
    driverId: driverId as string,
    companyId: companyId as string,
  };
  
  next();
};

/**
 * POST /api/drivers/:driverId/location
 * Update driver's current location
 */
router.post('/:driverId/location', 
  authenticateDriver,
  validateRequest(locationUpdateSchema),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { driverId, companyId } = req.driverAuth;
      const locationData = req.body;
      
      const location = {
        driverId,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        speed: locationData.speed,
        heading: locationData.heading,
        altitude: locationData.altitude,
        timestamp: locationData.timestamp ? new Date(locationData.timestamp) : new Date(),
        companyId,
      };
      
      // Update location using the tracking service
      await driverTrackingService.updateDriverLocation(location);
      
      // Record performance metrics
      performanceMonitor.recordLocationUpdate();
      
      // Broadcast via Socket.io if handler is available
      const driverEventHandler = getDriverEventHandler();
      if (driverEventHandler) {
        await driverEventHandler.broadcastLocationUpdate(driverId, location);
      }
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        message: 'Location updated successfully',
        data: {
          driverId,
          timestamp: location.timestamp.toISOString(),
          processingTime: `${processingTime}ms`,
        },
      });
      
      // Log slow requests
      if (processingTime > 100) {
        console.warn(`Slow location update API: ${processingTime}ms for driver ${driverId}`);
      }
      
    } catch (error) {
      console.error('Location update API error:', error);
      performanceMonitor.recordError();
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update location',
      });
    }
  }
);

/**
 * POST /api/drivers/:driverId/location/batch
 * Batch update driver locations (for mobile apps with poor connectivity)
 */
router.post('/:driverId/location/batch',
  authenticateDriver,
  validateRequest(batchLocationUpdateSchema),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const { driverId, companyId } = req.driverAuth;
      const { updates } = req.body;
      
      const locations = updates.map((update: any) => ({
        driverId,
        latitude: update.latitude,
        longitude: update.longitude,
        accuracy: update.accuracy,
        speed: update.speed,
        heading: update.heading,
        altitude: update.altitude,
        timestamp: update.timestamp ? new Date(update.timestamp) : new Date(),
        companyId,
      }));
      
      // Batch update locations
      await driverTrackingService.batchUpdateLocations(locations);
      
      // Broadcast only the latest location
      const latestLocation = locations[locations.length - 1];
      const driverEventHandler = getDriverEventHandler();
      if (driverEventHandler) {
        await driverEventHandler.broadcastLocationUpdate(driverId, latestLocation);
      }
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        message: 'Batch locations updated successfully',
        data: {
          driverId,
          updatesCount: locations.length,
          latestTimestamp: latestLocation.timestamp.toISOString(),
          processingTime: `${processingTime}ms`,
        },
      });
      
    } catch (error) {
      console.error('Batch location update API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update batch locations',
      });
    }
  }
);

/**
 * GET /api/drivers/:driverId/location
 * Get driver's current location
 */
router.get('/:driverId/location',
  authenticateDriver,
  async (req: Request, res: Response) => {
    try {
      const { driverId } = req.driverAuth;
      
      const location = await driverTrackingService.getDriverLocation(driverId);
      
      if (!location) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Driver location not available',
        });
      }
      
      res.json({
        success: true,
        data: {
          ...location,
          timestamp: location.timestamp.toISOString(),
        },
      });
      
    } catch (error) {
      console.error('Get location API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get location',
      });
    }
  }
);

/**
 * POST /api/drivers/:driverId/status
 * Update driver status (online/offline, available, etc.)
 */
router.post('/:driverId/status',
  authenticateDriver,
  validateRequest(statusUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const { driverId } = req.driverAuth;
      const statusData = req.body;
      
      const status = {
        driverId,
        isOnline: statusData.isOnline,
        isAvailable: statusData.isAvailable,
        currentJobId: statusData.currentJobId,
        lastLocationUpdate: new Date(),
        batteryLevel: statusData.batteryLevel,
        connectionQuality: statusData.connectionQuality || 'good',
      };
      
      await driverTrackingService.updateDriverStatus(status);
      
      res.json({
        success: true,
        message: 'Status updated successfully',
        data: {
          driverId,
          ...status,
          lastLocationUpdate: status.lastLocationUpdate.toISOString(),
        },
      });
      
    } catch (error) {
      console.error('Status update API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to update status',
      });
    }
  }
);

/**
 * POST /api/drivers/nearby
 * Find nearby drivers using spatial queries
 */
router.post('/nearby',
  validateRequest(nearbyDriversSchema),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
      const companyId = req.headers['x-company-id'] as string;
      
      if (!companyId) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Company ID must be provided',
        });
      }
      
      const query = {
        ...req.body,
        companyId,
      };
      
      const nearbyDrivers = await driverTrackingService.getNearbyDrivers(query);
      
      const processingTime = Date.now() - startTime;
      
      res.json({
        success: true,
        data: {
          drivers: nearbyDrivers.map(driver => ({
            ...driver,
            timestamp: driver.timestamp.toISOString(),
          })),
          searchCriteria: {
            latitude: query.latitude,
            longitude: query.longitude,
            radiusKm: query.radiusKm,
            limit: query.limit,
          },
          resultsCount: nearbyDrivers.length,
          processingTime: `${processingTime}ms`,
        },
      });
      
      // Log slow queries
      if (processingTime > 50) {
        console.warn(`Slow nearby drivers query: ${processingTime}ms`);
      }
      
    } catch (error) {
      console.error('Nearby drivers API error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to find nearby drivers',
      });
    }
  }
);

/**
 * GET /api/drivers/active
 * Get all active drivers for the company
 */
router.get('/active', async (req: Request, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string;
    
    if (!companyId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Company ID must be provided',
      });
    }
    
    const activeDriverIds = await driverTrackingService.getActiveDrivers(companyId);
    
    // Get location details for each active driver
    const driverLocations = await Promise.all(
      activeDriverIds.map(async (driverId) => {
        const location = await driverTrackingService.getDriverLocation(driverId);
        return location ? {
          ...location,
          timestamp: location.timestamp.toISOString(),
        } : null;
      })
    );
    
    // Filter out null results
    const validLocations = driverLocations.filter(loc => loc !== null);
    
    res.json({
      success: true,
      data: {
        activeDriversCount: validLocations.length,
        drivers: validLocations,
      },
    });
    
  } catch (error) {
    console.error('Active drivers API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get active drivers',
    });
  }
});

/**
 * GET /api/drivers/tracking/stats
 * Get tracking system statistics
 */
router.get('/tracking/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string;
    
    if (!companyId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Company ID must be provided',
      });
    }
    
    const activeDriverIds = await driverTrackingService.getActiveDrivers(companyId);
    const driverEventHandler = getDriverEventHandler();
    
    const stats = {
      companyId,
      activeDriversCount: activeDriverIds.length,
      connectedSocketsCount: driverEventHandler ? driverEventHandler.getConnectedDriversCount() : 0,
      timestamp: new Date().toISOString(),
    };
    
    res.json({
      success: true,
      data: stats,
    });
    
  } catch (error) {
    console.error('Tracking stats API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get tracking statistics',
    });
  }
});

/**
 * GET /api/drivers/tracking/performance
 * Get system performance metrics
 */
router.get('/tracking/performance', async (req: Request, res: Response) => {
  try {
    const performanceSummary = performanceMonitor.getPerformanceSummary();
    
    res.json({
      success: true,
      data: performanceSummary,
    });
    
  } catch (error) {
    console.error('Performance metrics API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get performance metrics',
    });
  }
});

// Extend Express Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      driverAuth: {
        driverId: string;
        companyId: string;
      };
    }
  }
}

export { router as trackingRoutes };