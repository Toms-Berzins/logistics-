import axios, { AxiosInstance } from 'axios';
import trackingRedis from '../config/redisTracking';
import { EventEmitter } from 'events';
import {
  GeocodingRequest,
  GeocodingResult,
  ReverseGeocodingRequest,
  DirectionsRequest,
  DirectionsResult,
  TrafficData,
  StaticMapRequest,
  DistanceMatrixRequest,
  DistanceMatrixResult,
  BatchGeocodingRequest,
  BatchGeocodingResult,
  MappingProvider,
  MappingServiceConfig,
  GeoPoint
} from '../models/Mapping';

interface RateLimiter {
  tokens: number;
  lastRefill: number;
  requestQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    request: () => Promise<any>;
  }>;
}

export class MappingService extends EventEmitter {
  private config: MappingServiceConfig;
  private providers: Map<string, MappingProvider> = new Map();
  private clients: Map<string, AxiosInstance> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private retryCount = 0;
  private maxRetries = 3;

  constructor(config: MappingServiceConfig) {
    super();
    this.config = config;
    this.initializeProviders();
    this.initializeRateLimiters();
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(request: GeocodingRequest): Promise<GeocodingResult[]> {
    const cacheKey = `geocode:${JSON.stringify(request)}`;

    // Check cache first
    if (this.config.caching.enabled) {
      const cached = await trackingRedis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await this.executeWithFallback('geocoding', async (provider) => {
      switch (provider.name) {
      case 'mapbox':
        return this.mapboxGeocode(request);
      case 'googlemaps':
        return this.googleMapsGeocode(request);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
      }
    });

    // Cache result
    if (this.config.caching.enabled && result) {
      await trackingRedis.setex(
        cacheKey,
        this.config.caching.geocodingTtlSeconds,
        JSON.stringify(result)
      );
    }

    return result;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(request: ReverseGeocodingRequest): Promise<GeocodingResult[]> {
    const cacheKey = `reverse_geocode:${request.location.latitude},${request.location.longitude}`;

    // Check cache first
    if (this.config.caching.enabled) {
      const cached = await trackingRedis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await this.executeWithFallback('reverseGeocoding', async (provider) => {
      switch (provider.name) {
      case 'mapbox':
        return this.mapboxReverseGeocode(request);
      case 'googlemaps':
        return this.googleMapsReverseGeocode(request);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
      }
    });

    // Cache result
    if (this.config.caching.enabled && result) {
      await trackingRedis.setex(
        cacheKey,
        this.config.caching.geocodingTtlSeconds,
        JSON.stringify(result)
      );
    }

    return result;
  }

  /**
   * Get directions between points
   */
  async getDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    const cacheKey = `directions:${JSON.stringify(request)}`;

    // Check cache first
    if (this.config.caching.enabled) {
      const cached = await trackingRedis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await this.executeWithFallback('directions', async (provider) => {
      switch (provider.name) {
      case 'mapbox':
        return this.mapboxDirections(request);
      case 'googlemaps':
        return this.googleMapsDirections(request);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
      }
    });

    // Cache result
    if (this.config.caching.enabled && result) {
      await trackingRedis.setex(
        cacheKey,
        this.config.caching.directionsTtlSeconds,
        JSON.stringify(result)
      );
    }

    return result;
  }

  /**
   * Get traffic data for a route or area
   */
  async getTrafficData(points: GeoPoint[]): Promise<TrafficData[]> {
    const cacheKey = `traffic:${JSON.stringify(points)}`;

    // Check cache first
    if (this.config.caching.enabled) {
      const cached = await trackingRedis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await this.executeWithFallback('trafficData', async (provider) => {
      switch (provider.name) {
      case 'mapbox':
        return this.mapboxTraffic(points);
      case 'googlemaps':
        return this.googleMapsTraffic(points);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
      }
    });

    // Cache result
    if (this.config.caching.enabled && result) {
      await trackingRedis.setex(
        cacheKey,
        this.config.caching.trafficDataTtlSeconds,
        JSON.stringify(result)
      );
    }

    return result;
  }

  /**
   * Generate static map URL
   */
  async getStaticMap(request: StaticMapRequest): Promise<string> {
    const provider = await this.getAvailableProvider('staticMaps');

    switch (provider.name) {
    case 'mapbox':
      return this.mapboxStaticMap(request);
    case 'googlemaps':
      return this.googleMapsStaticMap(request);
    default:
      throw new Error('No provider available for static maps');
    }
  }

  /**
   * Calculate distance matrix
   */
  async getDistanceMatrix(request: DistanceMatrixRequest): Promise<DistanceMatrixResult> {
    const cacheKey = `distance_matrix:${JSON.stringify(request)}`;

    // Check cache first
    if (this.config.caching.enabled) {
      const cached = await trackingRedis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const result = await this.executeWithFallback('distanceMatrix', async (provider) => {
      switch (provider.name) {
      case 'mapbox':
        return this.mapboxDistanceMatrix(request);
      case 'googlemaps':
        return this.googleMapsDistanceMatrix(request);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
      }
    });

    // Cache result
    if (this.config.caching.enabled && result) {
      await trackingRedis.setex(
        cacheKey,
        this.config.caching.directionsTtlSeconds,
        JSON.stringify(result)
      );
    }

    return result;
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(request: BatchGeocodingRequest): Promise<BatchGeocodingResult> {
    const { addresses, batchSize = 25, delayMs = 100 } = request;
    const results: (GeocodingResult | null)[] = [];
    const errors: { index: number; address: string; error: string }[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process in batches to respect rate limits
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (address, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          const geocodeResults = await this.geocode({ address });
          if (geocodeResults.length > 0) {
            results[globalIndex] = geocodeResults[0];
            successCount++;
          } else {
            results[globalIndex] = null;
            failureCount++;
            errors.push({
              index: globalIndex,
              address,
              error: 'No results found'
            });
          }
        } catch (error) {
          results[globalIndex] = null;
          failureCount++;
          errors.push({
            index: globalIndex,
            address,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches if not the last batch
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return {
      results,
      successCount,
      failureCount,
      errors
    };
  }

  /**
   * Check provider availability and status
   */
  async checkProviderStatus(): Promise<Map<string, boolean>> {
    const status = new Map<string, boolean>();

    for (const [name, provider] of this.providers) {
      try {
        switch (name) {
        case 'mapbox':
          await this.testMapboxConnection();
          status.set(name, true);
          break;
        case 'googlemaps':
          await this.testGoogleMapsConnection();
          status.set(name, true);
          break;
        default:
          status.set(name, false);
        }
      } catch (error) {
        console.error(`Provider ${name} is unavailable:`, error);
        status.set(name, false);
        provider.isAvailable = false;
      }
    }

    return status;
  }

  // Private methods

  private initializeProviders(): void {
    // Initialize Mapbox provider
    if (this.config.providers.mapbox?.enabled) {
      this.providers.set('mapbox', {
        name: 'mapbox',
        isAvailable: true,
        priority: this.config.providers.mapbox.priority,
        capabilities: {
          geocoding: true,
          reverseGeocoding: true,
          directions: true,
          staticMaps: true,
          trafficData: true,
          distanceMatrix: true
        },
        limits: {
          requestsPerSecond: 300,
          requestsPerDay: 100000,
          batchSize: 25
        }
      });

      this.clients.set('mapbox', axios.create({
        baseURL: this.config.providers.mapbox.baseUrl || 'https://api.mapbox.com',
        timeout: this.config.fallback.timeoutMs || 10000,
        headers: {
          'User-Agent': 'LogisticsPlatform/1.0'
        }
      }));
    }

    // Initialize Google Maps provider
    if (this.config.providers.googlemaps?.enabled) {
      this.providers.set('googlemaps', {
        name: 'googlemaps',
        isAvailable: true,
        priority: this.config.providers.googlemaps.priority,
        capabilities: {
          geocoding: true,
          reverseGeocoding: true,
          directions: true,
          staticMaps: true,
          trafficData: true,
          distanceMatrix: true
        },
        limits: {
          requestsPerSecond: 50,
          requestsPerDay: 40000,
          batchSize: 10
        }
      });

      this.clients.set('googlemaps', axios.create({
        baseURL: this.config.providers.googlemaps.baseUrl || 'https://maps.googleapis.com/maps/api',
        timeout: this.config.fallback.timeoutMs || 10000,
        headers: {
          'User-Agent': 'LogisticsPlatform/1.0'
        }
      }));
    }
  }

  private initializeRateLimiters(): void {
    if (!this.config.rateLimit.enabled) return;

    for (const [name, provider] of this.providers) {
      this.rateLimiters.set(name, {
        tokens: this.config.rateLimit.burstSize,
        lastRefill: Date.now(),
        requestQueue: []
      });
    }
  }

  private async executeWithFallback<T>(
    capability: keyof MappingProvider['capabilities'],
    operation: (provider: MappingProvider) => Promise<T>
  ): Promise<T> {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.isAvailable && p.capabilities[capability])
      .sort((a, b) => b.priority - a.priority);

    if (availableProviders.length === 0) {
      throw new Error(`No providers available for ${capability}`);
    }

    let lastError: Error | null = null;

    for (const provider of availableProviders) {
      try {
        // Apply rate limiting
        if (this.config.rateLimit.enabled) {
          await this.waitForRateLimit(provider.name);
        }

        const result = await operation(provider);
        this.retryCount = 0; // Reset retry count on success

        // Emit success event
        this.emit('providerSuccess', {
          provider: provider.name,
          capability,
          timestamp: new Date()
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Provider ${provider.name} failed for ${capability}:`, lastError.message);

        // Mark provider as temporarily unavailable if needed
        if (this.shouldMarkProviderUnavailable(lastError)) {
          provider.isAvailable = false;
          setTimeout(() => {
            provider.isAvailable = true;
          }, 60000); // Re-enable after 1 minute
        }

        // Emit failure event
        this.emit('providerFailure', {
          provider: provider.name,
          capability,
          error: lastError.message,
          timestamp: new Date()
        });

        // Continue to next provider if fallback is enabled
        if (!this.config.fallback.enabled) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error(`All providers failed for ${capability}`);
  }

  private async getAvailableProvider(capability: keyof MappingProvider['capabilities']): Promise<MappingProvider> {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.isAvailable && p.capabilities[capability])
      .sort((a, b) => b.priority - a.priority);

    if (availableProviders.length === 0) {
      throw new Error(`No providers available for ${capability}`);
    }

    return availableProviders[0];
  }

  private async waitForRateLimit(providerName: string): Promise<void> {
    const limiter = this.rateLimiters.get(providerName);
    if (!limiter) return;

    return new Promise((resolve, reject) => {
      const now = Date.now();
      const timeSinceLastRefill = now - limiter.lastRefill;
      const tokensToAdd = Math.floor(timeSinceLastRefill / 1000 * this.config.rateLimit.requestsPerSecond);

      if (tokensToAdd > 0) {
        limiter.tokens = Math.min(
          this.config.rateLimit.burstSize,
          limiter.tokens + tokensToAdd
        );
        limiter.lastRefill = now;
      }

      if (limiter.tokens > 0) {
        limiter.tokens--;
        resolve();
      } else {
        limiter.requestQueue.push({
          resolve,
          reject,
          request: async () => {
            limiter.tokens--;
            resolve();
          }
        });

        setTimeout(() => {
          const queuedRequest = limiter.requestQueue.shift();
          if (queuedRequest) {
            queuedRequest.request();
          }
        }, 1000 / this.config.rateLimit.requestsPerSecond);
      }
    });
  }

  private shouldMarkProviderUnavailable(error: Error): boolean {
    // Mark provider unavailable for certain errors
    const unavailableErrors = [
      'timeout',
      'network error',
      'rate limit exceeded',
      'service unavailable'
    ];

    return unavailableErrors.some(err =>
      error.message.toLowerCase().includes(err)
    );
  }

  // Provider-specific implementations

  private async mapboxGeocode(request: GeocodingRequest): Promise<GeocodingResult[]> {
    const client = this.clients.get('mapbox')!;
    const token = this.config.providers.mapbox!.accessToken;

    const params = new URLSearchParams({
      access_token: token,
      limit: '5'
    });

    if (request.bounds) {
      params.set('bbox', [
        request.bounds.southwest.longitude,
        request.bounds.southwest.latitude,
        request.bounds.northeast.longitude,
        request.bounds.northeast.latitude
      ].join(','));
    }

    if (request.language) {
      params.set('language', request.language);
    }

    const response = await client.get(`/geocoding/v5/mapbox.places/${encodeURIComponent(request.address)}.json?${params}`);

    return response.data.features.map((feature: any) => this.mapboxFeatureToGeocodingResult(feature));
  }

  private async mapboxReverseGeocode(request: ReverseGeocodingRequest): Promise<GeocodingResult[]> {
    const client = this.clients.get('mapbox')!;
    const token = this.config.providers.mapbox!.accessToken;

    const params = new URLSearchParams({
      access_token: token,
      limit: '5'
    });

    if (request.language) {
      params.set('language', request.language);
    }

    const response = await client.get(
      `/geocoding/v5/mapbox.places/${request.location.longitude},${request.location.latitude}.json?${params}`
    );

    return response.data.features.map((feature: any) => this.mapboxFeatureToGeocodingResult(feature));
  }

  private async mapboxDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    const client = this.clients.get('mapbox')!;
    const token = this.config.providers.mapbox!.accessToken;

    const coordinates = [
      this.formatCoordinate(request.origin),
      ...(request.waypoints?.map(wp => this.formatCoordinate(wp)) || []),
      this.formatCoordinate(request.destination)
    ].join(';');

    const profile = this.mapTravelModeToMapboxProfile(request.travelMode);

    const params = new URLSearchParams({
      access_token: token,
      geometries: 'geojson',
      steps: 'true',
      overview: 'full'
    });

    if (request.departureTime) {
      params.set('depart_at', request.departureTime.toISOString());
    }

    const response = await client.get(`/directions/v5/mapbox/${profile}/${coordinates}?${params}`);

    return this.mapboxDirectionsToDirectionsResult(response.data);
  }

  private async mapboxTraffic(points: GeoPoint[]): Promise<TrafficData[]> {
    // Mapbox traffic data implementation
    // This is a simplified implementation - in production you'd use Mapbox Traffic API
    return points.map(point => ({
      location: point,
      trafficLevel: 'MODERATE' as const,
      speed: 50,
      freeFlowSpeed: 60,
      currentTravelTime: 120,
      freeFlowTravelTime: 100,
      confidence: 0.8
    }));
  }

  private mapboxStaticMap(request: StaticMapRequest): string {
    const token = this.config.providers.mapbox!.accessToken;
    const { center, zoom, size } = request;

    let url = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static';

    // Add markers
    if (request.markers && request.markers.length > 0) {
      const markers = request.markers.map(marker =>
        `pin-s+${marker.color || 'ff0000'}(${marker.location.longitude},${marker.location.latitude})`
      ).join(',');
      url += `/${markers}`;
    }

    url += `/${center.longitude},${center.latitude},${zoom}`;
    url += `/${size.width}x${size.height}`;
    url += `${request.scale === 2 ? '@2x' : ''}`;
    url += `?access_token=${token}`;

    return url;
  }

  private async mapboxDistanceMatrix(request: DistanceMatrixRequest): Promise<DistanceMatrixResult> {
    const client = this.clients.get('mapbox')!;
    const token = this.config.providers.mapbox!.accessToken;

    const coordinates = [
      ...request.origins.map(o => this.formatCoordinate(o)),
      ...request.destinations.map(d => this.formatCoordinate(d))
    ].join(';');

    const profile = this.mapTravelModeToMapboxProfile(request.travelMode);
    const sources = request.origins.map((_, i) => i).join(';');
    const destinations = request.destinations.map((_, i) => i + request.origins.length).join(';');

    const params = new URLSearchParams({
      access_token: token,
      sources,
      destinations
    });

    const response = await client.get(`/directions-matrix/v1/mapbox/${profile}/${coordinates}?${params}`);

    return this.mapboxMatrixToDistanceMatrixResult(response.data, request);
  }

  private async googleMapsGeocode(request: GeocodingRequest): Promise<GeocodingResult[]> {
    const client = this.clients.get('googlemaps')!;
    const apiKey = this.config.providers.googlemaps!.apiKey;

    const params = new URLSearchParams({
      key: apiKey,
      address: request.address
    });

    if (request.bounds) {
      params.set('bounds', [
        request.bounds.southwest.latitude,
        request.bounds.southwest.longitude,
        request.bounds.northeast.latitude,
        request.bounds.northeast.longitude
      ].join(','));
    }

    if (request.language) {
      params.set('language', request.language);
    }

    if (request.region) {
      params.set('region', request.region);
    }

    const response = await client.get(`/geocode/json?${params}`);

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    return response.data.results.map((result: any) => this.googleMapsResultToGeocodingResult(result));
  }

  private async googleMapsReverseGeocode(request: ReverseGeocodingRequest): Promise<GeocodingResult[]> {
    const client = this.clients.get('googlemaps')!;
    const apiKey = this.config.providers.googlemaps!.apiKey;

    const params = new URLSearchParams({
      key: apiKey,
      latlng: `${request.location.latitude},${request.location.longitude}`
    });

    if (request.language) {
      params.set('language', request.language);
    }

    if (request.resultTypes) {
      params.set('result_type', request.resultTypes.join('|'));
    }

    const response = await client.get(`/geocode/json?${params}`);

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    return response.data.results.map((result: any) => this.googleMapsResultToGeocodingResult(result));
  }

  private async googleMapsDirections(request: DirectionsRequest): Promise<DirectionsResult> {
    const client = this.clients.get('googlemaps')!;
    const apiKey = this.config.providers.googlemaps!.apiKey;

    const params = new URLSearchParams({
      key: apiKey,
      origin: this.formatCoordinate(request.origin),
      destination: this.formatCoordinate(request.destination),
      mode: request.travelMode
    });

    if (request.waypoints && request.waypoints.length > 0) {
      params.set('waypoints', request.waypoints.map(wp => this.formatCoordinate(wp)).join('|'));
    }

    if (request.departureTime) {
      params.set('departure_time', Math.floor(request.departureTime.getTime() / 1000).toString());
    }

    const response = await client.get(`/directions/json?${params}`);

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    return response.data;
  }

  private async googleMapsTraffic(points: GeoPoint[]): Promise<TrafficData[]> {
    // Google Maps traffic data implementation
    // This would use Google Maps Roads API or Traffic Layer
    return points.map(point => ({
      location: point,
      trafficLevel: 'LIGHT' as const,
      speed: 55,
      freeFlowSpeed: 60,
      currentTravelTime: 110,
      freeFlowTravelTime: 100,
      confidence: 0.9
    }));
  }

  private googleMapsStaticMap(request: StaticMapRequest): string {
    const apiKey = this.config.providers.googlemaps!.apiKey;
    const { center, zoom, size } = request;

    let url = 'https://maps.googleapis.com/maps/api/staticmap';
    url += `?center=${center.latitude},${center.longitude}`;
    url += `&zoom=${zoom}`;
    url += `&size=${size.width}x${size.height}`;
    url += `&maptype=${request.maptype || 'roadmap'}`;
    url += `&key=${apiKey}`;

    // Add markers
    if (request.markers && request.markers.length > 0) {
      request.markers.forEach(marker => {
        url += `&markers=color:${marker.color || 'red'}|size:${marker.size || 'normal'}`;
        url += `|${marker.location.latitude},${marker.location.longitude}`;
      });
    }

    return url;
  }

  private async googleMapsDistanceMatrix(request: DistanceMatrixRequest): Promise<DistanceMatrixResult> {
    const client = this.clients.get('googlemaps')!;
    const apiKey = this.config.providers.googlemaps!.apiKey;

    const params = new URLSearchParams({
      key: apiKey,
      origins: request.origins.map(o => this.formatCoordinate(o)).join('|'),
      destinations: request.destinations.map(d => this.formatCoordinate(d)).join('|'),
      mode: request.travelMode,
      units: request.units || 'metric'
    });

    if (request.departureTime) {
      params.set('departure_time', Math.floor(request.departureTime.getTime() / 1000).toString());
    }

    const response = await client.get(`/distancematrix/json?${params}`);

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    return response.data;
  }

  private async testMapboxConnection(): Promise<void> {
    const client = this.clients.get('mapbox')!;
    const token = this.config.providers.mapbox!.accessToken;
    await client.get(`/geocoding/v5/mapbox.places/test.json?access_token=${token}&limit=1`);
  }

  private async testGoogleMapsConnection(): Promise<void> {
    const client = this.clients.get('googlemaps')!;
    const apiKey = this.config.providers.googlemaps!.apiKey;
    await client.get(`/geocode/json?address=test&key=${apiKey}`);
  }

  // Helper methods for data transformation

  private formatCoordinate(coord: GeoPoint | string): string {
    if (typeof coord === 'string') return coord;
    return `${coord.longitude},${coord.latitude}`;
  }

  private mapTravelModeToMapboxProfile(mode: string): string {
    const modeMap: Record<string, string> = {
      driving: 'driving-traffic',
      walking: 'walking',
      bicycling: 'cycling'
    };
    return modeMap[mode] || 'driving';
  }

  private mapboxFeatureToGeocodingResult(feature: any): GeocodingResult {
    return {
      formattedAddress: feature.place_name,
      location: {
        latitude: feature.center[1],
        longitude: feature.center[0]
      },
      placeId: feature.id,
      components: this.parseMapboxComponents(feature.context || []),
      geometry: {
        location: {
          latitude: feature.center[1],
          longitude: feature.center[0]
        },
        viewport: {
          northeast: {
            latitude: feature.bbox?.[3] || feature.center[1],
            longitude: feature.bbox?.[2] || feature.center[0]
          },
          southwest: {
            latitude: feature.bbox?.[1] || feature.center[1],
            longitude: feature.bbox?.[0] || feature.center[0]
          }
        }
      },
      types: feature.place_type || []
    };
  }

  private googleMapsResultToGeocodingResult(result: any): GeocodingResult {
    return {
      formattedAddress: result.formatted_address,
      location: {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng
      },
      placeId: result.place_id,
      components: this.parseGoogleMapsComponents(result.address_components),
      geometry: {
        location: {
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng
        },
        viewport: {
          northeast: {
            latitude: result.geometry.viewport.northeast.lat,
            longitude: result.geometry.viewport.northeast.lng
          },
          southwest: {
            latitude: result.geometry.viewport.southwest.lat,
            longitude: result.geometry.viewport.southwest.lng
          }
        },
        locationType: result.geometry.location_type
      },
      partialMatch: result.partial_match,
      types: result.types
    };
  }

  private parseMapboxComponents(context: any[]): any {
    const components: any = {};

    context.forEach(item => {
      if (item.id.includes('country')) {
        components.country = item.text;
      } else if (item.id.includes('region')) {
        components.administrativeAreaLevel1 = item.text;
      } else if (item.id.includes('postcode')) {
        components.postalCode = item.text;
      } else if (item.id.includes('place')) {
        components.locality = item.text;
      }
    });

    return components;
  }

  private parseGoogleMapsComponents(components: any[]): any {
    const result: any = {};

    components.forEach(component => {
      const types = component.types;

      if (types.includes('street_number')) {
        result.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        result.route = component.long_name;
      } else if (types.includes('locality')) {
        result.locality = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        result.administrativeAreaLevel1 = component.long_name;
      } else if (types.includes('administrative_area_level_2')) {
        result.administrativeAreaLevel2 = component.long_name;
      } else if (types.includes('country')) {
        result.country = component.long_name;
      } else if (types.includes('postal_code')) {
        result.postalCode = component.long_name;
      }
    });

    return result;
  }

  private mapboxDirectionsToDirectionsResult(data: any): DirectionsResult {
    return {
      routes: data.routes.map((route: any) => ({
        bounds: {
          northeast: {
            latitude: route.geometry.coordinates.reduce((max: number, coord: number[]) => Math.max(max, coord[1]), -90),
            longitude: route.geometry.coordinates.reduce((max: number, coord: number[]) => Math.max(max, coord[0]), -180)
          },
          southwest: {
            latitude: route.geometry.coordinates.reduce((min: number, coord: number[]) => Math.min(min, coord[1]), 90),
            longitude: route.geometry.coordinates.reduce((min: number, coord: number[]) => Math.min(min, coord[0]), 180)
          }
        },
        copyrights: '© Mapbox',
        legs: route.legs.map((leg: any) => ({
          distance: {
            text: `${(leg.distance / 1000).toFixed(1)} km`,
            value: leg.distance
          },
          duration: {
            text: `${Math.round(leg.duration / 60)} min`,
            value: leg.duration
          },
          end_address: '',
          end_location: {
            latitude: leg.steps[leg.steps.length - 1].maneuver.location[1],
            longitude: leg.steps[leg.steps.length - 1].maneuver.location[0]
          },
          start_address: '',
          start_location: {
            latitude: leg.steps[0].maneuver.location[1],
            longitude: leg.steps[0].maneuver.location[0]
          },
          steps: leg.steps.map((step: any) => ({
            distance: {
              text: `${(step.distance / 1000).toFixed(1)} km`,
              value: step.distance
            },
            duration: {
              text: `${Math.round(step.duration / 60)} min`,
              value: step.duration
            },
            end_location: {
              latitude: step.maneuver.location[1],
              longitude: step.maneuver.location[0]
            },
            html_instructions: step.maneuver.instruction,
            polyline: {
              points: step.geometry
            },
            start_location: {
              latitude: step.maneuver.location[1],
              longitude: step.maneuver.location[0]
            },
            travel_mode: 'DRIVING',
            maneuver: step.maneuver.type
          })),
          traffic_speed_entry: [],
          via_waypoint: []
        })),
        overview_polyline: {
          points: route.geometry
        },
        summary: route.legs.map((leg: any) => leg.summary).join(', '),
        warnings: [],
        waypoint_order: []
      })),
      status: 'OK'
    };
  }

  private mapboxMatrixToDistanceMatrixResult(data: any, request: DistanceMatrixRequest): DistanceMatrixResult {
    const originAddresses = request.origins.map(o => this.formatCoordinate(o));
    const destinationAddresses = request.destinations.map(d => this.formatCoordinate(d));

    const rows = data.durations.map((row: number[], rowIndex: number) => ({
      elements: row.map((duration: number, colIndex: number) => {
        const distance = data.distances?.[rowIndex]?.[colIndex];

        if (duration === null || duration === undefined) {
          return { status: 'NOT_FOUND' as const };
        }

        return {
          status: 'OK' as const,
          distance: distance ? {
            text: `${(distance / 1000).toFixed(1)} km`,
            value: distance
          } : undefined,
          duration: {
            text: `${Math.round(duration / 60)} min`,
            value: duration
          }
        };
      })
    }));

    return {
      originAddresses,
      destinationAddresses,
      rows,
      status: 'OK'
    };
  }
}

export const mappingService = new MappingService({
  providers: {
    mapbox: {
      accessToken: process.env.MAPBOX_ACCESS_TOKEN || '',
      enabled: !!process.env.MAPBOX_ACCESS_TOKEN,
      priority: 1
    },
    googlemaps: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      enabled: !!process.env.GOOGLE_MAPS_API_KEY,
      priority: 2
    }
  },
  caching: {
    enabled: true,
    geocodingTtlSeconds: 3600, // 1 hour
    directionsTtlSeconds: 1800, // 30 minutes
    trafficDataTtlSeconds: 300 // 5 minutes
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
