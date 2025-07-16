import { databaseConfig } from '../config/database';
import trackingRedis from '../config/redisTracking';
import { postgisUtils } from '../utils/postgis';
import { RouteSegment, GeoPoint } from '../models/Driver';
import { EventEmitter } from 'events';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface RouteInsights {
  analysisId: string;
  dateRange: DateRange;
  zoneId?: string;

  // General statistics
  totalRoutes: number;
  totalDistanceKm: number;
  totalDurationHours: number;
  averageSpeedKmh: number;

  // Performance metrics
  onTimeDeliveryRate: number;
  averageDelayMinutes: number;
  efficiencyScore: number; // 0-100

  // Pattern analysis
  commonRouteSegments: RoutePattern[];
  trafficPatterns: TrafficPattern[];
  driverBehaviorInsights: DriverBehaviorInsight[];

  // Time-based patterns
  hourlyPerformance: HourlyPerformance[];
  dailyPerformance: DailyPerformance[];

  // Delivery density analysis
  deliveryHeatmap: DeliveryHeatmapData;
  delayHotspots: DelayHotspot[];

  // Predictive insights
  optimalDepartureTimes: OptimalDepartureTime[];
  routeOptimizationSuggestions: RouteOptimization[];

  calculatedAt: Date;
  cacheExpiry?: Date;
}

export interface RoutePattern {
  patternId: string;
  description: string;
  geometry: GeoJSON.LineString;
  frequency: number; // How often this pattern is used
  averageSpeed: number;
  averageDuration: number;
  reliability: number; // Consistency score 0-1
  usagePercentage: number;
}

export interface TrafficPattern {
  timeSlot: string; // e.g., "Monday 08:00-09:00"
  averageDelay: number; // minutes
  delayVariance: number;
  affectedSegments: string[];
  severity: 'low' | 'medium' | 'high' | 'extreme';
  recommendation: string;
}

export interface DriverBehaviorInsight {
  behaviorType: 'speeding' | 'harsh_braking' | 'rapid_acceleration' | 'long_stops' | 'route_deviation';
  frequency: number;
  severity: 'low' | 'medium' | 'high';
  impactOnEfficiency: number; // percentage
  affectedDrivers: string[];
  recommendation: string;
}

export interface HourlyPerformance {
  hour: number; // 0-23
  averageSpeed: number;
  onTimeRate: number;
  averageDelay: number;
  trafficImpact: number;
  deliveryVolume: number;
}

export interface DailyPerformance {
  dayOfWeek: number; // 0=Sunday
  averageSpeed: number;
  onTimeRate: number;
  averageDelay: number;
  deliveryVolume: number;
  weatherImpact?: number;
}

export interface DeliveryHeatmapData {
  gridSize: number; // Cell size in meters
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  cells: HeatmapCell[];
}

export interface HeatmapCell {
  lat: number;
  lng: number;
  deliveryCount: number;
  averageDeliveryTime: number;
  density: number; // 0-1 normalized
}

export interface DelayHotspot {
  location: GeoPoint;
  radius: number; // meters
  averageDelay: number; // minutes
  delayFrequency: number; // percentage of deliveries delayed
  mainCauses: string[];
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface OptimalDepartureTime {
  destinationZone: string;
  dayOfWeek: number;
  optimalHour: number;
  optimalMinute: number;
  confidence: number; // 0-1
  averageDeliveryTime: number;
  onTimeRate: number;
  reasoning: string;
}

export interface RouteOptimization {
  routeId: string;
  currentEfficiency: number;
  potentialEfficiency: number;
  estimatedTimeSaving: number; // minutes
  suggestions: RouteSuggestion[];
  priority: 'low' | 'medium' | 'high';
}

export interface RouteSuggestion {
  type: 'route_change' | 'timing_adjustment' | 'vehicle_change' | 'driver_training';
  description: string;
  estimatedImpact: number; // percentage improvement
  implementationDifficulty: 'easy' | 'medium' | 'hard';
}

export interface RouteAnalyticsOptions {
  enableCaching?: boolean;
  cacheExpiryHours?: number;
  clusteringDistance?: number; // meters for route clustering
  minimumPatternSupport?: number; // minimum frequency for pattern recognition
  enablePredictiveAnalysis?: boolean;
  enableMLProcessing?: boolean;
}

export interface AnalyticsQuery {
  companyId: string;
  dateRange: DateRange;
  zoneId?: string;
  driverIds?: string[];
  routeTypes?: string[];
  minimumDistance?: number;
  includeWeather?: boolean;
  includeTraffic?: boolean;
}

export class RouteAnalyticsService extends EventEmitter {
  private options: RouteAnalyticsOptions;
  private analysisCache = new Map<string, RouteInsights>();

  constructor(options: RouteAnalyticsOptions = {}) {
    super();
    this.options = {
      enableCaching: true,
      cacheExpiryHours: 4,
      clusteringDistance: 100, // 100 meters
      minimumPatternSupport: 5, // minimum 5 occurrences
      enablePredictiveAnalysis: true,
      enableMLProcessing: false,
      ...options
    };
  }

  /**
   * Analyze route patterns for the given criteria
   */
  async analyzeRoutePatterns(query: AnalyticsQuery): Promise<RouteInsights> {
    const startTime = Date.now();
    const analysisId = this.generateAnalysisId(query);

    // Check cache first
    if (this.options.enableCaching) {
      const cached = await this.getCachedAnalysis(analysisId);
      if (cached) {
        return cached;
      }
    }

    const client = await databaseConfig.connect();

    try {
      // Get route segments for analysis
      const segments = await this.getRouteSegments(client, query);

      if (segments.length === 0) {
        throw new Error('No route data found for the specified criteria');
      }

      // Parallel analysis execution
      const [
        basicStats,
        commonPatterns,
        trafficPatterns,
        behaviorInsights,
        timeBasedPerformance,
        spatialAnalysis,
        predictiveInsights
      ] = await Promise.all([
        this.calculateBasicStatistics(segments),
        this.identifyCommonRouteSegments(client, segments),
        this.analyzeTrafficPatterns(client, query),
        this.analyzeDriverBehavior(client, segments),
        this.analyzeTimeBasedPerformance(client, query),
        this.performSpatialAnalysis(client, segments, query),
        this.options.enablePredictiveAnalysis ?
          this.generatePredictiveInsights(client, query, segments) :
          this.getEmptyPredictiveInsights()
      ]);

      const insights: RouteInsights = {
        analysisId,
        dateRange: query.dateRange,
        zoneId: query.zoneId,

        // Basic statistics
        totalRoutes: basicStats.totalRoutes,
        totalDistanceKm: basicStats.totalDistanceKm,
        totalDurationHours: basicStats.totalDurationHours,
        averageSpeedKmh: basicStats.averageSpeedKmh,

        // Performance metrics
        onTimeDeliveryRate: basicStats.onTimeRate,
        averageDelayMinutes: basicStats.averageDelay,
        efficiencyScore: this.calculateEfficiencyScore(basicStats),

        // Pattern analysis
        commonRouteSegments: commonPatterns,
        trafficPatterns,
        driverBehaviorInsights: behaviorInsights,

        // Time-based patterns
        hourlyPerformance: timeBasedPerformance.hourly,
        dailyPerformance: timeBasedPerformance.daily,

        // Spatial analysis
        deliveryHeatmap: spatialAnalysis.heatmap,
        delayHotspots: spatialAnalysis.hotspots,

        // Predictive insights
        optimalDepartureTimes: predictiveInsights.departureTimes,
        routeOptimizationSuggestions: predictiveInsights.optimizations,

        calculatedAt: new Date(),
        cacheExpiry: new Date(Date.now() + (this.options.cacheExpiryHours! * 60 * 60 * 1000))
      };

      // Cache the results
      if (this.options.enableCaching) {
        await this.cacheAnalysis(analysisId, insights);
      }

      // Emit analytics event
      this.emit('analysisCompleted', {
        analysisId,
        query,
        insights,
        processingTimeMs: Date.now() - startTime
      });

      return insights;

    } finally {
      client.release();
    }
  }

  /**
   * Export analytics data to various formats
   */
  async exportAnalytics(
    analysisId: string,
    format: 'csv' | 'json' | 'excel'
  ): Promise<Buffer | string> {
    const insights = await this.getAnalysisById(analysisId);

    if (!insights) {
      throw new Error('Analysis not found');
    }

    switch (format) {
    case 'csv':
      return this.exportToCSV(insights);
    case 'json':
      return JSON.stringify(insights, null, 2);
    case 'excel':
      return this.exportToExcel(insights);
    default:
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate real-time route predictions
   */
  async predictRoutePerformance(
    driverId: string,
    plannedRoute: GeoJSON.LineString,
    departureTime: Date
  ): Promise<{
    estimatedDuration: number;
    confidence: number;
    delayRisk: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    const client = await databaseConfig.connect();

    try {
      // Get historical data for similar routes
      const historicalData = await this.getHistoricalRouteData(
        client,
        driverId,
        plannedRoute,
        departureTime
      );

      // Simple prediction model (in production, this would use ML)
      const baseTime = this.calculateBaseRouteTime(plannedRoute);
      const historicalAdjustment = this.calculateHistoricalAdjustment(historicalData);
      const trafficAdjustment = await this.calculateTrafficAdjustment(departureTime);

      const estimatedDuration = baseTime * historicalAdjustment * trafficAdjustment;
      const confidence = Math.min(historicalData.length / 10, 1); // More data = higher confidence

      let delayRisk: 'low' | 'medium' | 'high' = 'low';
      if (trafficAdjustment > 1.3) delayRisk = 'high';
      else if (trafficAdjustment > 1.15) delayRisk = 'medium';

      const recommendations: string[] = [];
      if (delayRisk === 'high') {
        recommendations.push('Consider departing 15-30 minutes earlier');
        recommendations.push('Use alternative route if available');
      }
      if (historicalData.some(d => d.weatherDelay > 0)) {
        recommendations.push('Check weather conditions before departure');
      }

      return {
        estimatedDuration: Math.round(estimatedDuration),
        confidence,
        delayRisk,
        recommendations
      };

    } finally {
      client.release();
    }
  }

  // Private helper methods

  private generateAnalysisId(query: AnalyticsQuery): string {
    const hash = require('crypto')
      .createHash('md5')
      .update(JSON.stringify(query))
      .digest('hex');
    return `analysis_${hash}`;
  }

  private async getCachedAnalysis(analysisId: string): Promise<RouteInsights | null> {
    // Check memory cache first
    if (this.analysisCache.has(analysisId)) {
      const cached = this.analysisCache.get(analysisId)!;
      if (cached.cacheExpiry && cached.cacheExpiry > new Date()) {
        return cached;
      } else {
        this.analysisCache.delete(analysisId);
      }
    }

    // Check Redis cache
    const redisKey = `analytics:${analysisId}`;
    const cached = await trackingRedis.get(redisKey);

    if (cached) {
      const insights: RouteInsights = JSON.parse(cached);
      if (insights.cacheExpiry && new Date(insights.cacheExpiry) > new Date()) {
        this.analysisCache.set(analysisId, insights);
        return insights;
      } else {
        await trackingRedis.del(redisKey);
      }
    }

    return null;
  }

  private async getRouteSegments(client: any, query: AnalyticsQuery): Promise<RouteSegment[]> {
    let sql = `
      SELECT 
        rs.*,
        ST_AsGeoJSON(rs.trajectory) as trajectory_geojson,
        ST_AsGeoJSON(rs.start_location) as start_location_geojson,
        ST_AsGeoJSON(rs.end_location) as end_location_geojson
      FROM route_segments rs
      JOIN drivers d ON d.id = rs.driver_id
      WHERE d.company_id = $1
        AND rs.started_at >= $2
        AND rs.completed_at <= $3
    `;

    const params: any[] = [query.companyId, query.dateRange.startDate, query.dateRange.endDate];
    let paramIndex = 4;

    if (query.driverIds && query.driverIds.length > 0) {
      sql += ` AND rs.driver_id = ANY($${paramIndex})`;
      params.push(query.driverIds);
      paramIndex++;
    }

    if (query.routeTypes && query.routeTypes.length > 0) {
      sql += ` AND rs.segment_type = ANY($${paramIndex})`;
      params.push(query.routeTypes);
      paramIndex++;
    }

    if (query.minimumDistance) {
      sql += ` AND rs.distance_meters >= $${paramIndex}`;
      params.push(query.minimumDistance);
      paramIndex++;
    }

    sql += ' ORDER BY rs.started_at';

    const result = await client.query(sql, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      routeId: row.route_id,
      driverId: row.driver_id,
      segmentOrder: row.segment_order,
      trajectory: JSON.parse(row.trajectory_geojson),
      startLocation: this.parseGeoJSONPoint(row.start_location_geojson),
      endLocation: this.parseGeoJSONPoint(row.end_location_geojson),
      startedAt: new Date(row.started_at),
      completedAt: new Date(row.completed_at),
      distanceMeters: parseFloat(row.distance_meters),
      durationSeconds: row.duration_seconds,
      averageSpeed: parseFloat(row.average_speed),
      maxSpeed: parseFloat(row.max_speed),
      idleTimeSeconds: row.idle_time_seconds,
      trafficDelaySeconds: row.traffic_delay_seconds,
      segmentType: row.segment_type,
      roadType: row.road_type,
      createdAt: new Date(row.created_at)
    }));
  }

  private async calculateBasicStatistics(segments: RouteSegment[]): Promise<{
    totalRoutes: number;
    totalDistanceKm: number;
    totalDurationHours: number;
    averageSpeedKmh: number;
    onTimeRate: number;
    averageDelay: number;
  }> {
    const totalDistance = segments.reduce((sum, s) => sum + s.distanceMeters, 0);
    const totalDuration = segments.reduce((sum, s) => sum + s.durationSeconds, 0);
    const totalDelay = segments.reduce((sum, s) => sum + s.trafficDelaySeconds, 0);

    // Count unique routes
    const uniqueRoutes = new Set(segments.map(s => s.routeId)).size;

    // Calculate on-time rate (delivery segments with < 15 min delay)
    const deliverySegments = segments.filter(s => s.segmentType === 'delivery');
    const onTimeDeliveries = deliverySegments.filter(s => s.trafficDelaySeconds < 900).length; // 15 minutes
    const onTimeRate = deliverySegments.length > 0 ? (onTimeDeliveries / deliverySegments.length) * 100 : 100;

    return {
      totalRoutes: uniqueRoutes,
      totalDistanceKm: totalDistance / 1000,
      totalDurationHours: totalDuration / 3600,
      averageSpeedKmh: totalDistance > 0 ? (totalDistance / 1000) / (totalDuration / 3600) : 0,
      onTimeRate,
      averageDelay: segments.length > 0 ? totalDelay / segments.length / 60 : 0 // in minutes
    };
  }

  private async identifyCommonRouteSegments(client: any, segments: RouteSegment[]): Promise<RoutePattern[]> {
    // Use PostGIS ST_ClusterDBSCAN for route clustering
    const clusterQuery = `
      WITH clustered_routes AS (
        SELECT 
          trajectory,
          ST_ClusterDBSCAN(trajectory, $1, 3) OVER() as cluster_id,
          distance_meters,
          duration_seconds,
          average_speed
        FROM route_segments
        WHERE id = ANY($2)
      )
      SELECT 
        cluster_id,
        COUNT(*) as frequency,
        AVG(distance_meters) as avg_distance,
        AVG(duration_seconds) as avg_duration,
        AVG(average_speed) as avg_speed,
        ST_AsGeoJSON(ST_Union(trajectory)) as pattern_geometry
      FROM clustered_routes
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
      HAVING COUNT(*) >= $3
      ORDER BY frequency DESC
      LIMIT 10
    `;

    const segmentIds = segments.map(s => s.id);
    const result = await client.query(clusterQuery, [
      this.options.clusteringDistance,
      segmentIds,
      this.options.minimumPatternSupport
    ]);

    return result.rows.map((row: any, index: number) => ({
      patternId: `pattern_${row.cluster_id}`,
      description: `Common route pattern ${index + 1}`,
      geometry: JSON.parse(row.pattern_geometry),
      frequency: row.frequency,
      averageSpeed: parseFloat(row.avg_speed),
      averageDuration: parseFloat(row.avg_duration),
      reliability: Math.min(row.frequency / segments.length, 1),
      usagePercentage: (row.frequency / segments.length) * 100
    }));
  }

  private async analyzeTrafficPatterns(client: any, query: AnalyticsQuery): Promise<TrafficPattern[]> {
    const trafficQuery = `
      SELECT 
        EXTRACT(DOW FROM started_at) as day_of_week,
        EXTRACT(HOUR FROM started_at) as hour_of_day,
        AVG(traffic_delay_seconds) as avg_delay,
        STDDEV(traffic_delay_seconds) as delay_variance,
        COUNT(*) as segment_count
      FROM route_segments rs
      JOIN drivers d ON d.id = rs.driver_id
      WHERE d.company_id = $1
        AND rs.started_at >= $2
        AND rs.completed_at <= $3
        AND rs.traffic_delay_seconds > 0
      GROUP BY day_of_week, hour_of_day
      HAVING COUNT(*) >= 5
      ORDER BY avg_delay DESC
      LIMIT 20
    `;

    const result = await client.query(trafficQuery, [
      query.companyId,
      query.dateRange.startDate,
      query.dateRange.endDate
    ]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return result.rows.map((row: any) => {
      const avgDelay = parseFloat(row.avg_delay) / 60; // Convert to minutes
      let severity: 'low' | 'medium' | 'high' | 'extreme' = 'low';

      if (avgDelay > 30) severity = 'extreme';
      else if (avgDelay > 20) severity = 'high';
      else if (avgDelay > 10) severity = 'medium';

      return {
        timeSlot: `${dayNames[row.day_of_week]} ${String(row.hour_of_day).padStart(2, '0')}:00-${String(row.hour_of_day + 1).padStart(2, '0')}:00`,
        averageDelay: avgDelay,
        delayVariance: parseFloat(row.delay_variance) / 60,
        affectedSegments: [], // Would be populated with actual segment IDs
        severity,
        recommendation: this.generateTrafficRecommendation(severity, avgDelay)
      };
    });
  }

  private async analyzeDriverBehavior(client: any, segments: RouteSegment[]): Promise<DriverBehaviorInsight[]> {
    const behaviors: DriverBehaviorInsight[] = [];

    // Analyze speeding patterns
    const speedingSegments = segments.filter(s => s.maxSpeed > 33.33); // > 120 km/h
    if (speedingSegments.length > 0) {
      behaviors.push({
        behaviorType: 'speeding',
        frequency: speedingSegments.length,
        severity: speedingSegments.length > segments.length * 0.1 ? 'high' : 'medium',
        impactOnEfficiency: -5, // Negative impact due to safety concerns
        affectedDrivers: [...new Set(speedingSegments.map(s => s.driverId))],
        recommendation: 'Implement speed monitoring and driver training programs'
      });
    }

    // Analyze idle time patterns
    const highIdleSegments = segments.filter(s => s.idleTimeSeconds > 600); // > 10 minutes
    if (highIdleSegments.length > 0) {
      behaviors.push({
        behaviorType: 'long_stops',
        frequency: highIdleSegments.length,
        severity: highIdleSegments.length > segments.length * 0.2 ? 'high' : 'medium',
        impactOnEfficiency: -15,
        affectedDrivers: [...new Set(highIdleSegments.map(s => s.driverId))],
        recommendation: 'Review stop duration policies and provide time management training'
      });
    }

    return behaviors;
  }

  private async analyzeTimeBasedPerformance(client: any, query: AnalyticsQuery): Promise<{
    hourly: HourlyPerformance[];
    daily: DailyPerformance[];
  }> {
    // Hourly performance analysis
    const hourlyQuery = `
      SELECT 
        EXTRACT(HOUR FROM started_at) as hour,
        AVG(average_speed) as avg_speed,
        AVG(CASE WHEN traffic_delay_seconds < 900 THEN 1 ELSE 0 END) * 100 as on_time_rate,
        AVG(traffic_delay_seconds) / 60 as avg_delay,
        COUNT(*) as delivery_volume
      FROM route_segments rs
      JOIN drivers d ON d.id = rs.driver_id
      WHERE d.company_id = $1
        AND rs.started_at >= $2
        AND rs.completed_at <= $3
        AND rs.segment_type = 'delivery'
      GROUP BY hour
      ORDER BY hour
    `;

    const hourlyResult = await client.query(hourlyQuery, [
      query.companyId,
      query.dateRange.startDate,
      query.dateRange.endDate
    ]);

    // Daily performance analysis
    const dailyQuery = `
      SELECT 
        EXTRACT(DOW FROM started_at) as day_of_week,
        AVG(average_speed) as avg_speed,
        AVG(CASE WHEN traffic_delay_seconds < 900 THEN 1 ELSE 0 END) * 100 as on_time_rate,
        AVG(traffic_delay_seconds) / 60 as avg_delay,
        COUNT(*) as delivery_volume
      FROM route_segments rs
      JOIN drivers d ON d.id = rs.driver_id
      WHERE d.company_id = $1
        AND rs.started_at >= $2
        AND rs.completed_at <= $3
        AND rs.segment_type = 'delivery'
      GROUP BY day_of_week
      ORDER BY day_of_week
    `;

    const dailyResult = await client.query(dailyQuery, [
      query.companyId,
      query.dateRange.startDate,
      query.dateRange.endDate
    ]);

    return {
      hourly: hourlyResult.rows.map((row: any) => ({
        hour: row.hour,
        averageSpeed: parseFloat(row.avg_speed) * 3.6, // Convert m/s to km/h
        onTimeRate: parseFloat(row.on_time_rate),
        averageDelay: parseFloat(row.avg_delay),
        trafficImpact: this.calculateTrafficImpact(row),
        deliveryVolume: row.delivery_volume
      })),
      daily: dailyResult.rows.map((row: any) => ({
        dayOfWeek: row.day_of_week,
        averageSpeed: parseFloat(row.avg_speed) * 3.6,
        onTimeRate: parseFloat(row.on_time_rate),
        averageDelay: parseFloat(row.avg_delay),
        deliveryVolume: row.delivery_volume
      }))
    };
  }

  private async performSpatialAnalysis(client: any, segments: RouteSegment[], query: AnalyticsQuery): Promise<{
    heatmap: DeliveryHeatmapData;
    hotspots: DelayHotspot[];
  }> {
    // Generate delivery heatmap
    const deliverySegments = segments.filter(s => s.segmentType === 'delivery');
    const heatmap = this.generateDeliveryHeatmap(deliverySegments);

    // Identify delay hotspots using spatial clustering
    const hotspotQuery = `
      WITH delay_points AS (
        SELECT 
          ST_X(end_location) as lng,
          ST_Y(end_location) as lat,
          traffic_delay_seconds
        FROM route_segments rs
        JOIN drivers d ON d.id = rs.driver_id
        WHERE d.company_id = $1
          AND rs.started_at >= $2
          AND rs.completed_at <= $3
          AND rs.segment_type = 'delivery'
          AND rs.traffic_delay_seconds > 600
      ),
      clustered_delays AS (
        SELECT 
          lng, lat, traffic_delay_seconds,
          ST_ClusterDBSCAN(ST_MakePoint(lng, lat), 0.001, 3) OVER() as cluster_id
        FROM delay_points
      )
      SELECT 
        cluster_id,
        AVG(lng) as center_lng,
        AVG(lat) as center_lat,
        AVG(traffic_delay_seconds) as avg_delay,
        COUNT(*) as delay_count
      FROM clustered_delays
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id
      HAVING COUNT(*) >= 3
      ORDER BY avg_delay DESC
      LIMIT 10
    `;

    const hotspotResult = await client.query(hotspotQuery, [
      query.companyId,
      query.dateRange.startDate,
      query.dateRange.endDate
    ]);

    const hotspots: DelayHotspot[] = hotspotResult.rows.map((row: any) => {
      const avgDelay = parseFloat(row.avg_delay) / 60; // Convert to minutes
      let severity: 'low' | 'medium' | 'high' = 'low';

      if (avgDelay > 20) severity = 'high';
      else if (avgDelay > 10) severity = 'medium';

      return {
        location: {
          latitude: parseFloat(row.center_lat),
          longitude: parseFloat(row.center_lng)
        },
        radius: 500, // 500 meter radius
        averageDelay: avgDelay,
        delayFrequency: (row.delay_count / deliverySegments.length) * 100,
        mainCauses: ['Traffic congestion', 'Road construction'], // Would be analyzed from data
        severity,
        recommendation: 'Consider alternative routes or schedule adjustments for this area'
      };
    });

    return { heatmap, hotspots };
  }

  private async generatePredictiveInsights(client: any, query: AnalyticsQuery, segments: RouteSegment[]): Promise<{
    departureTimes: OptimalDepartureTime[];
    optimizations: RouteOptimization[];
  }> {
    // Generate optimal departure times
    const departureQuery = `
      SELECT 
        EXTRACT(DOW FROM started_at) as day_of_week,
        EXTRACT(HOUR FROM started_at) as hour,
        EXTRACT(MINUTE FROM started_at) as minute,
        AVG(CASE WHEN traffic_delay_seconds < 900 THEN 1 ELSE 0 END) as on_time_rate,
        AVG(duration_seconds) as avg_duration,
        COUNT(*) as sample_size
      FROM route_segments rs
      JOIN drivers d ON d.id = rs.driver_id
      WHERE d.company_id = $1
        AND rs.started_at >= $2
        AND rs.completed_at <= $3
        AND rs.segment_type = 'delivery'
      GROUP BY day_of_week, hour, minute
      HAVING COUNT(*) >= 3
      ORDER BY on_time_rate DESC, avg_duration ASC
      LIMIT 20
    `;

    const departureResult = await client.query(departureQuery, [
      query.companyId,
      query.dateRange.startDate,
      query.dateRange.endDate
    ]);

    const departureTimes: OptimalDepartureTime[] = departureResult.rows.map((row: any) => ({
      destinationZone: query.zoneId || 'general',
      dayOfWeek: row.day_of_week,
      optimalHour: row.hour,
      optimalMinute: row.minute,
      confidence: Math.min(row.sample_size / 10, 1),
      averageDeliveryTime: parseFloat(row.avg_duration) / 60,
      onTimeRate: parseFloat(row.on_time_rate) * 100,
      reasoning: `Based on ${row.sample_size} historical deliveries with ${(row.on_time_rate * 100).toFixed(1)}% on-time rate`
    }));

    // Generate route optimization suggestions
    const routeOptimizations: RouteOptimization[] = this.generateRouteOptimizations(segments);

    return { departureTimes, optimizations: routeOptimizations };
  }

  private getEmptyPredictiveInsights(): { departureTimes: OptimalDepartureTime[]; optimizations: RouteOptimization[]; } {
    return {
      departureTimes: [],
      optimizations: []
    };
  }

  private calculateEfficiencyScore(stats: any): number {
    // Simple efficiency score calculation
    const speedScore = Math.min(stats.averageSpeedKmh / 50, 1) * 30; // Max 30 points
    const onTimeScore = (stats.onTimeRate / 100) * 40; // Max 40 points
    const delayScore = Math.max(0, (30 - stats.averageDelay) / 30) * 30; // Max 30 points

    return Math.round(speedScore + onTimeScore + delayScore);
  }

  private parseGeoJSONPoint(geoJsonStr: string): GeoPoint {
    const point = JSON.parse(geoJsonStr);
    return {
      latitude: point.coordinates[1],
      longitude: point.coordinates[0]
    };
  }

  private generateTrafficRecommendation(severity: string, avgDelay: number): string {
    switch (severity) {
    case 'extreme':
      return `Severe delays (${avgDelay.toFixed(1)} min avg). Consider alternative routes or schedule adjustments.`;
    case 'high':
      return `High delays (${avgDelay.toFixed(1)} min avg). Monitor traffic conditions closely.`;
    case 'medium':
      return `Moderate delays (${avgDelay.toFixed(1)} min avg). Allow extra time for deliveries.`;
    default:
      return `Minor delays (${avgDelay.toFixed(1)} min avg). Current routes are efficient.`;
    }
  }

  private calculateTrafficImpact(row: any): number {
    // Simple traffic impact calculation
    return Math.min(parseFloat(row.avg_delay) / 10, 5); // 0-5 scale
  }

  private generateDeliveryHeatmap(deliverySegments: RouteSegment[]): DeliveryHeatmapData {
    // Simple grid-based heatmap generation
    const gridSize = 1000; // 1km grid cells

    if (deliverySegments.length === 0) {
      return {
        gridSize,
        bounds: { north: 0, south: 0, east: 0, west: 0 },
        cells: []
      };
    }

    // Calculate bounds
    const lats = deliverySegments.map(s => s.endLocation.latitude);
    const lngs = deliverySegments.map(s => s.endLocation.longitude);

    const bounds = {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };

    // Generate grid cells (simplified implementation)
    const cells: HeatmapCell[] = [];
    const cellsX = Math.ceil((bounds.east - bounds.west) * 111000 / gridSize); // Rough conversion to meters
    const cellsY = Math.ceil((bounds.north - bounds.south) * 111000 / gridSize);

    for (let x = 0; x < Math.min(cellsX, 50); x++) {
      for (let y = 0; y < Math.min(cellsY, 50); y++) {
        const cellLng = bounds.west + (x / cellsX) * (bounds.east - bounds.west);
        const cellLat = bounds.south + (y / cellsY) * (bounds.north - bounds.south);

        // Count deliveries in this cell (simplified)
        const deliveriesInCell = deliverySegments.filter(s =>
          Math.abs(s.endLocation.latitude - cellLat) < 0.01 &&
          Math.abs(s.endLocation.longitude - cellLng) < 0.01
        );

        if (deliveriesInCell.length > 0) {
          cells.push({
            lat: cellLat,
            lng: cellLng,
            deliveryCount: deliveriesInCell.length,
            averageDeliveryTime: deliveriesInCell.reduce((sum, s) => sum + s.durationSeconds, 0) / deliveriesInCell.length / 60,
            density: deliveriesInCell.length / deliverySegments.length
          });
        }
      }
    }

    return { gridSize, bounds, cells };
  }

  private generateRouteOptimizations(segments: RouteSegment[]): RouteOptimization[] {
    // Group segments by route
    const routeGroups = new Map<string, RouteSegment[]>();
    segments.forEach(segment => {
      if (!routeGroups.has(segment.routeId)) {
        routeGroups.set(segment.routeId, []);
      }
      routeGroups.get(segment.routeId)!.push(segment);
    });

    const optimizations: RouteOptimization[] = [];

    routeGroups.forEach((routeSegments, routeId) => {
      const totalDuration = routeSegments.reduce((sum, s) => sum + s.durationSeconds, 0);
      const totalDistance = routeSegments.reduce((sum, s) => sum + s.distanceMeters, 0);
      const totalDelay = routeSegments.reduce((sum, s) => sum + s.trafficDelaySeconds, 0);

      const currentEfficiency = totalDistance > 0 ? (totalDistance / 1000) / (totalDuration / 3600) : 0;
      const delayImpact = totalDelay / totalDuration;

      if (delayImpact > 0.2) { // More than 20% delay
        const suggestions: RouteSuggestion[] = [];

        if (delayImpact > 0.3) {
          suggestions.push({
            type: 'route_change',
            description: 'Consider alternative route to avoid high-delay segments',
            estimatedImpact: 25,
            implementationDifficulty: 'medium'
          });
        }

        suggestions.push({
          type: 'timing_adjustment',
          description: 'Adjust departure time to avoid peak traffic',
          estimatedImpact: 15,
          implementationDifficulty: 'easy'
        });

        optimizations.push({
          routeId,
          currentEfficiency,
          potentialEfficiency: currentEfficiency * 1.2, // 20% improvement estimate
          estimatedTimeSaving: totalDelay / 60, // Convert to minutes
          suggestions,
          priority: delayImpact > 0.4 ? 'high' : 'medium'
        });
      }
    });

    return optimizations.slice(0, 10); // Return top 10
  }

  private async cacheAnalysis(analysisId: string, insights: RouteInsights): Promise<void> {
    // Cache in memory
    this.analysisCache.set(analysisId, insights);

    // Cache in Redis
    const redisKey = `analytics:${analysisId}`;
    const expirySeconds = this.options.cacheExpiryHours! * 3600;

    await trackingRedis.setex(redisKey, expirySeconds, JSON.stringify(insights));
  }

  private async getAnalysisById(analysisId: string): Promise<RouteInsights | null> {
    return await this.getCachedAnalysis(analysisId);
  }

  private exportToCSV(insights: RouteInsights): string {
    // Simplified CSV export
    const headers = [
      'Metric', 'Value', 'Unit'
    ];

    const rows = [
      ['Total Routes', insights.totalRoutes.toString(), 'count'],
      ['Total Distance', insights.totalDistanceKm.toFixed(2), 'km'],
      ['Total Duration', insights.totalDurationHours.toFixed(2), 'hours'],
      ['Average Speed', insights.averageSpeedKmh.toFixed(2), 'km/h'],
      ['On-Time Rate', insights.onTimeDeliveryRate.toFixed(1), '%'],
      ['Average Delay', insights.averageDelayMinutes.toFixed(1), 'minutes'],
      ['Efficiency Score', insights.efficiencyScore.toString(), '0-100']
    ];

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private exportToExcel(insights: RouteInsights): Buffer {
    // Placeholder for Excel export
    // In production, you'd use a library like 'exceljs'
    throw new Error('Excel export not implemented');
  }

  private async getHistoricalRouteData(client: any, driverId: string, route: GeoJSON.LineString, departureTime: Date): Promise<any[]> {
    // Simplified historical data retrieval
    return [];
  }

  private calculateBaseRouteTime(route: GeoJSON.LineString): number {
    // Calculate base time based on route distance and average speed
    // This is a simplified implementation
    return 30; // 30 minutes default
  }

  private calculateHistoricalAdjustment(historicalData: any[]): number {
    // Calculate adjustment factor based on historical performance
    return 1.0; // No adjustment if no historical data
  }

  private async calculateTrafficAdjustment(departureTime: Date): Promise<number> {
    const hour = departureTime.getHours();

    // Simple traffic adjustment based on time of day
    if (hour >= 7 && hour <= 9) return 1.4; // Morning rush
    if (hour >= 17 && hour <= 19) return 1.3; // Evening rush
    if (hour >= 11 && hour <= 14) return 1.1; // Lunch time

    return 1.0; // Off-peak
  }
}

export const routeAnalyticsService = new RouteAnalyticsService();
