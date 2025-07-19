import { Router, Request, Response, NextFunction } from 'express';
import { mappingService } from '../services/MappingService';
import {
  GeocodingRequest,
  ReverseGeocodingRequest,
  DirectionsRequest,
  StaticMapRequest,
  DistanceMatrixRequest,
  DistanceMatrixResult,
  BatchGeocodingRequest,
  GeoPoint
} from '../models/Mapping';

const router = Router();

interface AuthenticatedRequest extends Request {
  companyId?: string;
  driverId?: string;
}

/**
 * Geocode an address to coordinates
 */
router.post('/geocode', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const geocodingRequest: GeocodingRequest = {
      address: req.body.address,
      bounds: req.body.bounds,
      region: req.body.region,
      language: req.body.language || 'en',
      components: req.body.components
    };

    // Validate required fields
    if (!geocodingRequest.address || geocodingRequest.address.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    const results = await mappingService.geocode(geocodingRequest);

    res.json({
      success: true,
      data: {
        results,
        count: results.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Reverse geocode coordinates to address
 */
router.post('/reverse-geocode', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const reverseGeocodingRequest: ReverseGeocodingRequest = {
      location: req.body.location,
      resultTypes: req.body.resultTypes,
      locationTypes: req.body.locationTypes,
      language: req.body.language || 'en'
    };

    // Validate required fields
    if (!reverseGeocodingRequest.location ||
        typeof reverseGeocodingRequest.location.latitude !== 'number' ||
        typeof reverseGeocodingRequest.location.longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid location coordinates are required'
      });
    }

    const results = await mappingService.reverseGeocode(reverseGeocodingRequest);

    res.json({
      success: true,
      data: {
        results,
        count: results.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get directions between points
 */
router.post('/directions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const directionsRequest: DirectionsRequest = {
      origin: req.body.origin,
      destination: req.body.destination,
      waypoints: req.body.waypoints,
      travelMode: req.body.travelMode || 'driving',
      avoidTolls: req.body.avoidTolls,
      avoidHighways: req.body.avoidHighways,
      avoidFerries: req.body.avoidFerries,
      departureTime: req.body.departureTime ? new Date(req.body.departureTime) : undefined,
      arrivalTime: req.body.arrivalTime ? new Date(req.body.arrivalTime) : undefined,
      trafficModel: req.body.trafficModel,
      transitMode: req.body.transitMode,
      units: req.body.units || 'metric',
      region: req.body.region,
      language: req.body.language || 'en'
    };

    // Validate required fields
    if (!directionsRequest.origin || !directionsRequest.destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }

    // Validate travel mode
    const validTravelModes = ['driving', 'walking', 'bicycling', 'transit'];
    if (!validTravelModes.includes(directionsRequest.travelMode)) {
      return res.status(400).json({
        success: false,
        error: `Travel mode must be one of: ${validTravelModes.join(', ')}`
      });
    }

    const result = await mappingService.getDirections(directionsRequest);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get traffic data for points
 */
router.post('/traffic', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { points } = req.body;

    // Validate points
    if (!Array.isArray(points) || points.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Points array is required'
      });
    }

    // Validate each point
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      if (!point || typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
        return res.status(400).json({
          success: false,
          error: `Invalid coordinates at index ${i}`
        });
      }
    }

    const trafficData = await mappingService.getTrafficData(points);

    res.json({
      success: true,
      data: {
        trafficData,
        count: trafficData.length
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate static map URL
 */
router.post('/static-map', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const staticMapRequest: StaticMapRequest = {
      center: req.body.center,
      zoom: req.body.zoom || 12,
      size: req.body.size || { width: 400, height: 400 },
      scale: req.body.scale,
      format: req.body.format || 'png',
      maptype: req.body.maptype || 'roadmap',
      markers: req.body.markers,
      path: req.body.path,
      style: req.body.style
    };

    // Validate required fields
    if (!staticMapRequest.center ||
        typeof staticMapRequest.center.latitude !== 'number' ||
        typeof staticMapRequest.center.longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid center coordinates are required'
      });
    }

    // Validate zoom level
    if (staticMapRequest.zoom < 0 || staticMapRequest.zoom > 21) {
      return res.status(400).json({
        success: false,
        error: 'Zoom level must be between 0 and 21'
      });
    }

    // Validate size
    if (staticMapRequest.size.width > 2048 || staticMapRequest.size.height > 2048) {
      return res.status(400).json({
        success: false,
        error: 'Map size cannot exceed 2048x2048 pixels'
      });
    }

    const mapUrl = await mappingService.getStaticMap(staticMapRequest);

    res.json({
      success: true,
      data: {
        url: mapUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Calculate distance matrix
 */
router.post('/distance-matrix', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const distanceMatrixRequest: DistanceMatrixRequest = {
      origins: req.body.origins,
      destinations: req.body.destinations,
      travelMode: req.body.travelMode || 'driving',
      units: req.body.units || 'metric',
      avoidTolls: req.body.avoidTolls,
      avoidHighways: req.body.avoidHighways,
      avoidFerries: req.body.avoidFerries,
      departureTime: req.body.departureTime ? new Date(req.body.departureTime) : undefined,
      arrivalTime: req.body.arrivalTime ? new Date(req.body.arrivalTime) : undefined,
      trafficModel: req.body.trafficModel,
      language: req.body.language || 'en',
      region: req.body.region
    };

    // Validate required fields
    if (!Array.isArray(distanceMatrixRequest.origins) || distanceMatrixRequest.origins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Origins array is required'
      });
    }

    if (!Array.isArray(distanceMatrixRequest.destinations) || distanceMatrixRequest.destinations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Destinations array is required'
      });
    }

    // Check matrix size limits
    const maxElements = 625; // 25x25 matrix
    const totalElements = distanceMatrixRequest.origins.length * distanceMatrixRequest.destinations.length;
    if (totalElements > maxElements) {
      return res.status(400).json({
        success: false,
        error: `Matrix size too large. Maximum ${maxElements} elements allowed.`
      });
    }

    // Validate travel mode
    const validTravelModes = ['driving', 'walking', 'bicycling', 'transit'];
    if (!validTravelModes.includes(distanceMatrixRequest.travelMode)) {
      return res.status(400).json({
        success: false,
        error: `Travel mode must be one of: ${validTravelModes.join(', ')}`
      });
    }

    const result = await mappingService.getDistanceMatrix(distanceMatrixRequest);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Batch geocode multiple addresses
 */
router.post('/batch-geocode', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const batchGeocodingRequest: BatchGeocodingRequest = {
      addresses: req.body.addresses,
      batchSize: req.body.batchSize || 25,
      delayMs: req.body.delayMs || 100
    };

    // Validate required fields
    if ((batchGeocodingRequest.delayMs ?? 100) > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum delayMs allowed is 1000 milliseconds'
      });
    }
    if (!Array.isArray(batchGeocodingRequest.addresses) || batchGeocodingRequest.addresses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Addresses array is required'
      });
    }

    // Limit batch size for performance
    if (batchGeocodingRequest.addresses.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 1000 addresses allowed per batch'
      });
    }

    // Validate all addresses are strings
    for (let i = 0; i < batchGeocodingRequest.addresses.length; i++) {
      if (typeof batchGeocodingRequest.addresses[i] !== 'string' || batchGeocodingRequest.addresses[i].trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid address at index ${i}`
        });
      }
    }

    const result = await mappingService.batchGeocode(batchGeocodingRequest);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check provider status and availability
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const providerStatus = await mappingService.checkProviderStatus();

    const status = {
      providers: Object.fromEntries(providerStatus),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get nearby places (POI search)
 */
router.post('/nearby', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { location, radius, type, keyword } = req.body;

    // Validate location
    if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid location coordinates are required'
      });
    }

    // For now, use geocoding to find nearby places (simplified implementation)
    // In production, you'd use Places API for this
    const searchQuery = keyword ? `${keyword} near ${location.latitude},${location.longitude}` :
      type ? `${type} near ${location.latitude},${location.longitude}` :
        `places near ${location.latitude},${location.longitude}`;

    const results = await mappingService.geocode({ address: searchQuery });

    res.json({
      success: true,
      data: {
        results: results.filter(result => {
          // Filter results within radius (if specified)
          if (radius) {
            const distance = calculateDistance(location, result.location);
            return distance <= radius;
          }
          return true;
        }),
        location,
        radius: radius || 'unlimited'
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Calculate route optimization for multiple waypoints
 */
router.post('/optimize-route', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { waypoints, origin, destination, travelMode = 'driving' } = req.body;

    // Validate required fields
    if (!Array.isArray(waypoints) || waypoints.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Waypoints array is required'
      });
    }

    if (waypoints.length > 25) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 25 waypoints allowed'
      });
    }

    // Simple route optimization using distance matrix
    // In production, you'd use specialized route optimization algorithms
    const allPoints = [origin, ...waypoints, destination].filter(Boolean);

    if (allPoints.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 points are required for route optimization'
      });
    }

    // Get distance matrix for all points
    const distanceMatrix = await mappingService.getDistanceMatrix({
      origins: allPoints,
      destinations: allPoints,
      travelMode
    });

    // Simple greedy optimization (nearest neighbor)
    const optimizedOrder = optimizeRouteOrder(distanceMatrix);
    const optimizedWaypoints = optimizedOrder.slice(1, -1).map(index => allPoints[index]);

    // Get optimized directions
    const directions = await mappingService.getDirections({
      origin: allPoints[optimizedOrder[0]],
      destination: allPoints[optimizedOrder[optimizedOrder.length - 1]],
      waypoints: optimizedWaypoints,
      travelMode
    });

    res.json({
      success: true,
      data: {
        originalOrder: allPoints,
        optimizedOrder: optimizedOrder.map(index => allPoints[index]),
        optimizedWaypoints,
        directions,
        totalDistance: directions.routes[0]?.legs.reduce((sum, leg) => sum + leg.distance.value, 0) || 0,
        totalDuration: directions.routes[0]?.legs.reduce((sum, leg) => sum + leg.duration.value, 0) || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions

function calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function optimizeRouteOrder(distanceMatrix: DistanceMatrixResult): number[] {
  const numPoints = distanceMatrix.rows.length;
  if (numPoints <= 2) return [0, 1];

  // Simple greedy nearest neighbor algorithm
  const visited = new Set<number>();
  const route = [0]; // Start from first point
  visited.add(0);

  while (route.length < numPoints) {
    const currentPoint = route[route.length - 1];
    let nearestPoint = -1;
    let shortestDistance = Infinity;

    for (let i = 0; i < numPoints; i++) {
      if (!visited.has(i)) {
        const element = distanceMatrix.rows[currentPoint].elements[i];
        if (element.status === 'OK' && element.distance) {
          if (element.distance.value < shortestDistance) {
            shortestDistance = element.distance.value;
            nearestPoint = i;
          }
        }
      }
    }

    if (nearestPoint !== -1) {
      route.push(nearestPoint);
      visited.add(nearestPoint);
    } else {
      // If no unvisited point is reachable, add remaining points in order
      for (let i = 0; i < numPoints; i++) {
        if (!visited.has(i)) {
          route.push(i);
          visited.add(i);
        }
      }
      break;
    }
  }

  return route;
}

// Error handling middleware
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Mapping API error:', error);

  if (error.message.includes('rate limit')) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60
    });
  }

  if (error.message.includes('timeout')) {
    return res.status(504).json({
      success: false,
      error: 'Request timeout. Please try again.'
    });
  }

  if (error.message.includes('API key') || error.message.includes('access token')) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API credentials'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred'
  });
});

export default router;
