# Mapping Service Documentation

## Overview

The Mapping Service provides a unified abstraction layer for multiple mapping providers (Mapbox and Google Maps), offering geocoding, directions, traffic data, static maps, and distance matrix calculations with automatic failover and caching.

## Features

### Core Capabilities
- **Geocoding**: Convert addresses to coordinates
- **Reverse Geocoding**: Convert coordinates to addresses
- **Directions**: Calculate routes between points
- **Distance Matrix**: Calculate distances/times between multiple origins and destinations
- **Static Maps**: Generate static map images with markers and paths
- **Traffic Data**: Real-time traffic information
- **Batch Processing**: Bulk geocoding with rate limiting
- **Route Optimization**: Basic route optimization for multiple waypoints

### Provider Support
- **Mapbox**: Primary provider with full feature support
- **Google Maps**: Secondary provider with automatic failover
- **Extensible**: Easy to add new providers

### Advanced Features
- **Automatic Failover**: Seamless switching between providers
- **Redis Caching**: Configurable caching for all operations
- **Rate Limiting**: Per-provider rate limiting with queue management
- **Error Handling**: Comprehensive error handling and retry logic
- **Event Emission**: Success/failure events for monitoring
- **Performance Monitoring**: Built-in metrics and logging

## API Endpoints

### Geocoding
```http
POST /api/mapping/geocode
Content-Type: application/json

{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA",
  "bounds": {
    "northeast": { "latitude": 37.5, "longitude": -122.0 },
    "southwest": { "latitude": 37.4, "longitude": -122.1 }
  },
  "language": "en"
}
```

### Reverse Geocoding
```http
POST /api/mapping/reverse-geocode
Content-Type: application/json

{
  "location": {
    "latitude": 37.4224764,
    "longitude": -122.0842499
  },
  "language": "en"
}
```

### Directions
```http
POST /api/mapping/directions
Content-Type: application/json

{
  "origin": { "latitude": 37.4224764, "longitude": -122.0842499 },
  "destination": { "latitude": 37.7749, "longitude": -122.4194 },
  "travelMode": "driving",
  "avoidTolls": false,
  "departureTime": "2024-01-15T10:00:00Z"
}
```

### Distance Matrix
```http
POST /api/mapping/distance-matrix
Content-Type: application/json

{
  "origins": [
    { "latitude": 37.4224764, "longitude": -122.0842499 },
    { "latitude": 37.7749, "longitude": -122.4194 }
  ],
  "destinations": [
    { "latitude": 37.3382, "longitude": -121.8863 },
    { "latitude": 37.6879, "longitude": -122.4702 }
  ],
  "travelMode": "driving",
  "units": "metric"
}
```

### Static Maps
```http
POST /api/mapping/static-map
Content-Type: application/json

{
  "center": { "latitude": 37.4224764, "longitude": -122.0842499 },
  "zoom": 15,
  "size": { "width": 400, "height": 400 },
  "markers": [
    {
      "location": { "latitude": 37.4224764, "longitude": -122.0842499 },
      "color": "red",
      "size": "normal"
    }
  ]
}
```

### Batch Geocoding
```http
POST /api/mapping/batch-geocode
Content-Type: application/json

{
  "addresses": [
    "1600 Amphitheatre Parkway, Mountain View, CA",
    "1 Hacker Way, Menlo Park, CA",
    "1 Infinite Loop, Cupertino, CA"
  ],
  "batchSize": 25,
  "delayMs": 100
}
```

### Traffic Data
```http
POST /api/mapping/traffic
Content-Type: application/json

{
  "points": [
    { "latitude": 37.4224764, "longitude": -122.0842499 },
    { "latitude": 37.7749, "longitude": -122.4194 }
  ]
}
```

### Provider Status
```http
GET /api/mapping/status
```

### Route Optimization
```http
POST /api/mapping/optimize-route
Content-Type: application/json

{
  "origin": { "latitude": 37.4224764, "longitude": -122.0842499 },
  "destination": { "latitude": 37.7749, "longitude": -122.4194 },
  "waypoints": [
    { "latitude": 37.5, "longitude": -122.2 },
    { "latitude": 37.6, "longitude": -122.3 }
  ],
  "travelMode": "driving"
}
```

## Configuration

### Environment Variables
```bash
# Mapbox Configuration
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here

# Google Maps Configuration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Redis Configuration (for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Service Configuration
```typescript
const mappingService = new MappingService({
  providers: {
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN,
      enabled: true,
      priority: 1 // Higher priority = preferred provider
    },
    googlemaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      enabled: true,
      priority: 2
    }
  },
  caching: {
    enabled: true,
    geocodingTtlSeconds: 3600,    // 1 hour
    directionsTtlSeconds: 1800,   // 30 minutes
    trafficDataTtlSeconds: 300    // 5 minutes
  },
  fallback: {
    enabled: true,
    maxRetries: 3,
    timeoutMs: 10000
  },
  rateLimit: {
    enabled: true,
    requestsPerSecond: 10,
    burstSize: 20
  }
});
```

## Usage Examples

### Basic Geocoding
```typescript
import { mappingService } from '../services/MappingService';

const results = await mappingService.geocode({
  address: 'Golden Gate Bridge, San Francisco, CA'
});

console.log(`Coordinates: ${results[0].location.latitude}, ${results[0].location.longitude}`);
```

### Route Planning with Traffic
```typescript
const directions = await mappingService.getDirections({
  origin: { latitude: 37.7749, longitude: -122.4194 },
  destination: { latitude: 37.7849, longitude: -122.4094 },
  travelMode: 'driving',
  departureTime: new Date(),
  trafficModel: 'best_guess'
});

const route = directions.routes[0];
console.log(`Distance: ${route.legs[0].distance.text}`);
console.log(`Duration: ${route.legs[0].duration.text}`);
console.log(`Duration in traffic: ${route.legs[0].duration_in_traffic?.text}`);
```

### Bulk Address Processing
```typescript
const addresses = [
  '1600 Amphitheatre Parkway, Mountain View, CA',
  '1 Hacker Way, Menlo Park, CA',
  '1 Infinite Loop, Cupertino, CA'
];

const batchResult = await mappingService.batchGeocode({
  addresses,
  batchSize: 10,
  delayMs: 100
});

console.log(`Processed: ${batchResult.successCount}/${addresses.length}`);
batchResult.results.forEach((result, index) => {
  if (result) {
    console.log(`${addresses[index]}: ${result.location.latitude}, ${result.location.longitude}`);
  }
});
```

### Provider Monitoring
```typescript
mappingService.on('providerSuccess', (event) => {
  console.log(`✅ ${event.provider} succeeded for ${event.capability}`);
});

mappingService.on('providerFailure', (event) => {
  console.log(`❌ ${event.provider} failed for ${event.capability}: ${event.error}`);
});

// Check provider status
const status = await mappingService.checkProviderStatus();
console.log('Provider Status:', Object.fromEntries(status));
```

## Error Handling

The service provides comprehensive error handling with specific error types:

### Common Error Types
- **Rate Limit Exceeded**: `429` status with retry-after header
- **Invalid API Credentials**: `401` status 
- **Request Timeout**: `504` status
- **Invalid Input**: `400` status with validation details
- **Provider Unavailable**: Automatic failover to secondary provider

### Error Response Format
```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

## Performance Considerations

### Caching Strategy
- **Geocoding**: 1 hour TTL (addresses rarely change)
- **Directions**: 30 minutes TTL (traffic patterns change)
- **Traffic Data**: 5 minutes TTL (real-time data)

### Rate Limiting
- **Mapbox**: 300 requests/second, 100k requests/day
- **Google Maps**: 50 requests/second, 40k requests/day
- **Automatic queuing** when limits are approached

### Optimization Tips
1. **Use batch geocoding** for multiple addresses
2. **Cache results** when possible
3. **Monitor provider status** and adjust accordingly
4. **Use appropriate travel modes** for your use case
5. **Implement request deduplication** for identical requests

## Integration with Driver Tracking

The mapping service integrates seamlessly with the driver tracking system:

```typescript
// Calculate ETA for driver
const directions = await mappingService.getDirections({
  origin: driverLocation,
  destination: deliveryAddress,
  travelMode: 'driving',
  departureTime: new Date(),
  trafficModel: 'best_guess'
});

const eta = directions.routes[0].legs[0].duration_in_traffic;

// Geocode delivery address
const geocoded = await mappingService.geocode({
  address: deliveryAddress
});

// Get traffic conditions along route
const routePoints = decodePolyline(directions.routes[0].overview_polyline.points);
const trafficData = await mappingService.getTrafficData(routePoints);
```

## Testing

Run the mapping service tests:

```bash
npm test src/tests/MappingService.test.ts
```

The test suite covers:
- ✅ Geocoding and reverse geocoding
- ✅ Directions calculation
- ✅ Distance matrix computation
- ✅ Batch processing
- ✅ Provider failover
- ✅ Error handling
- ✅ Static map generation
- ✅ Traffic data retrieval

## Monitoring and Analytics

### Key Metrics
- **Request success rate** by provider
- **Average response time** by operation type
- **Cache hit rate** for each operation
- **Provider availability** over time
- **Rate limit utilization**

### Event Logging
```typescript
mappingService.on('providerSuccess', (event) => {
  // Log successful requests
  logger.info('Provider success', {
    provider: event.provider,
    capability: event.capability,
    timestamp: event.timestamp
  });
});

mappingService.on('providerFailure', (event) => {
  // Log failed requests
  logger.warn('Provider failure', {
    provider: event.provider,
    capability: event.capability,
    error: event.error,
    timestamp: event.timestamp
  });
});
```

## Future Enhancements

### Planned Features
1. **Additional Providers**: HERE Maps, OpenStreetMap
2. **Advanced Route Optimization**: Vehicle routing problem (VRP) solver
3. **Geofencing Integration**: Real-time geofence notifications
4. **Elevation Data**: Terrain-aware routing
5. **Historical Traffic**: Pattern-based ETA prediction
6. **Machine Learning**: Smart provider selection based on historical performance

### API Extensions
- Isochrone calculation (travel time polygons)
- Real-time traffic incident reporting
- Multi-modal transportation options
- Carbon footprint calculation for routes
- Dynamic pricing based on traffic conditions

## Support

For issues or questions regarding the mapping service:

1. Check the provider status endpoint first
2. Verify API keys are valid and have sufficient quota
3. Review error logs for specific error details
4. Test with a simple geocoding request to isolate issues
5. Monitor Redis connectivity for caching issues

The mapping service is designed to be robust and self-healing, automatically handling provider failures and maintaining service availability.