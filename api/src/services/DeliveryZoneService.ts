import { databaseConfig } from '../config/database';
import trackingRedis from '../config/redisTracking';
import { postgisUtils } from '../utils/postgis';
import {
  Zone,
  ZoneMetadata,
  ZonePricing,
  ZoneContainmentResult,
  ZoneOperation,
  ZoneStatistics,
  ZoneImportRequest,
  ZoneImportResult,
  TimeRestriction,
  ZoneCoverageAnalysis
} from '../models/Zone';
import { GeoPoint } from '../models/Driver';
import { EventEmitter } from 'events';

export interface ZoneServiceOptions {
  enableCaching?: boolean;
  cacheExpirySeconds?: number;
  maxZonesPerQuery?: number;
  enableStatistics?: boolean;
}

export interface ZoneQueryOptions {
  includeInactive?: boolean;
  priorityThreshold?: number;
  zoneTypes?: string[];
  serviceLevel?: string;
  timeFilter?: Date;
}

export class DeliveryZoneService extends EventEmitter {
  private options: ZoneServiceOptions;
  private zoneCache = new Map<string, Zone>();
  private pricingCache = new Map<string, ZonePricing[]>();

  constructor(options: ZoneServiceOptions = {}) {
    super();
    this.options = {
      enableCaching: true,
      cacheExpirySeconds: 300, // 5 minutes
      maxZonesPerQuery: 1000,
      enableStatistics: true,
      ...options
    };
  }

  /**
   * Create a new delivery zone
   */
  async createZone(
    companyId: string,
    name: string,
    polygon: GeoJSON.MultiPolygon,
    metadata: ZoneMetadata,
    pricing?: Partial<ZonePricing>
  ): Promise<Zone> {
    // Validate geometry
    const polygonWKT = postgisUtils.geoJSONToWKT(polygon);
    const validation = await postgisUtils.validateGeometry(polygonWKT);

    if (!validation.isValid) {
      throw new Error(`Invalid polygon geometry: ${validation.reason}`);
    }

    // Check for topology issues
    await this.validateZoneTopology(companyId, polygon);

    // Calculate zone statistics
    const area = await postgisUtils.calculateArea(polygonWKT);
    const perimeter = await postgisUtils.calculatePerimeter(polygonWKT);

    const client = await databaseConfig.connect();

    try {
      await client.query('BEGIN');

      // Insert zone
      const zoneResult = await client.query(`
        INSERT INTO delivery_zones (
          company_id, name, description, boundary, zone_type, service_level,
          base_delivery_fee, per_mile_rate, minimum_order, maximum_distance_km,
          active_hours, timezone, area_sq_km, priority
        ) VALUES (
          $1, $2, $3, ST_GeomFromGeoJSON($4), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) RETURNING id, created_at, updated_at
      `, [
        companyId,
        name,
        metadata.description || '',
        JSON.stringify(polygon),
        metadata.serviceLevel || 'standard',
        'normal',
        pricing?.baseFee || 0,
        pricing?.perMileRate || 0,
        metadata.restrictions?.noWeekends ? 1000 : 0, // minimum order
        metadata.restrictions?.noEvenings ? 50 : 100, // max distance
        JSON.stringify({}), // active hours
        'UTC',
        area,
        this.calculateZonePriority(area, companyId)
      ]);

      const zoneId = zoneResult.rows[0].id;

      // Create default pricing if provided
      if (pricing) {
        await client.query(`
          INSERT INTO zone_pricing (
            zone_id, base_fee, per_mile_rate, per_minute_rate, surge_multiplier
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          zoneId,
          pricing.baseFee || 0,
          pricing.perMileRate || 0,
          pricing.perMinuteRate || 0,
          pricing.surgeMultiplier || 1.0
        ]);
      }

      await client.query('COMMIT');

      // Create zone object
      const zone: Zone = {
        id: zoneId,
        companyId,
        name,
        description: metadata.description,
        boundary: polygon,
        priority: this.calculateZonePriority(area, companyId),
        zoneType: 'standard',
        serviceLevel: 'normal',
        baseDeliveryFee: pricing?.baseFee,
        perMileRate: pricing?.perMileRate,
        minimumOrder: 0,
        maximumDistanceKm: 100,
        activeHours: {},
        timezone: 'UTC',
        areaSqKm: area,
        isActive: true,
        createdAt: new Date(zoneResult.rows[0].created_at),
        updatedAt: new Date(zoneResult.rows[0].updated_at)
      };

      // Update cache
      if (this.options.enableCaching) {
        this.zoneCache.set(zoneId, zone);
        await this.updateZoneCache(companyId);
      }

      // Emit event
      this.emit('zoneCreated', { zone, metadata });

      return zone;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find zones containing a point
   */
  async findZonesContainingPoint(
    point: GeoPoint,
    companyId: string,
    options: ZoneQueryOptions = {}
  ): Promise<ZoneContainmentResult> {
    const cacheKey = `zones:contains:${companyId}:${point.latitude}:${point.longitude}`;

    // Check cache first
    if (this.options.enableCaching) {
      const cached = await trackingRedis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const client = await databaseConfig.connect();

    try {
      let query = `
        SELECT 
          id, name, description, zone_type, service_level, priority,
          base_delivery_fee, per_mile_rate, minimum_order, maximum_distance_km,
          ST_AsGeoJSON(boundary) as boundary,
          active_hours, timezone, area_sq_km, is_active,
          ST_Distance(boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) as distance_meters
        FROM delivery_zones
        WHERE company_id = $1
          AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography)
      `;

      const params: any[] = [companyId, point.longitude, point.latitude];

      if (!options.includeInactive) {
        query += ' AND is_active = true';
      }

      if (options.zoneTypes && options.zoneTypes.length > 0) {
        query += ` AND zone_type = ANY($${params.length + 1})`;
        params.push(options.zoneTypes);
      }

      if (options.serviceLevel) {
        query += ` AND service_level = $${params.length + 1}`;
        params.push(options.serviceLevel);
      }

      query += ' ORDER BY priority DESC, area_sq_km ASC';

      const result = await client.query(query, params);

      const zones: Zone[] = result.rows.map(row => ({
        id: row.id,
        companyId,
        name: row.name,
        description: row.description,
        boundary: JSON.parse(row.boundary),
        priority: row.priority,
        zoneType: row.zone_type,
        serviceLevel: row.service_level,
        baseDeliveryFee: row.base_delivery_fee,
        perMileRate: row.per_mile_rate,
        minimumOrder: row.minimum_order,
        maximumDistanceKm: row.maximum_distance_km,
        activeHours: row.active_hours || {},
        timezone: row.timezone,
        areaSqKm: parseFloat(row.area_sq_km),
        isActive: row.is_active,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // Find nearby zones if no containment
      let nearbyZones: { zoneId: string; distanceMeters: number }[] = [];
      if (zones.length === 0) {
        const nearbyResult = await client.query(`
          SELECT 
            id,
            ST_Distance(boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography) as distance_meters
          FROM delivery_zones
          WHERE company_id = $1 AND is_active = true
          ORDER BY distance_meters ASC
          LIMIT 5
        `, [companyId, point.longitude, point.latitude]);

        nearbyZones = nearbyResult.rows.map(row => ({
          zoneId: row.id,
          distanceMeters: parseFloat(row.distance_meters)
        }));
      }

      const containmentResult: ZoneContainmentResult = {
        zones,
        point: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude]
        },
        containedIn: zones.map(z => z.id),
        nearbyZones: nearbyZones.length > 0 ? nearbyZones : undefined
      };

      // Cache result
      if (this.options.enableCaching) {
        await trackingRedis.setex(
          cacheKey,
          this.options.cacheExpirySeconds!,
          JSON.stringify(containmentResult)
        );
      }

      return containmentResult;

    } finally {
      client.release();
    }
  }

  /**
   * Perform zone operations (union, intersection, difference)
   */
  async performZoneOperation(
    operation: 'union' | 'intersection' | 'difference',
    zoneIds: string[]
  ): Promise<ZoneOperation> {
    if (zoneIds.length < 2) {
      throw new Error('Zone operations require at least 2 zones');
    }

    const client = await databaseConfig.connect();

    try {
      // Get zone geometries
      const result = await client.query(`
        SELECT id, ST_AsText(boundary) as boundary_wkt
        FROM delivery_zones
        WHERE id = ANY($1)
      `, [zoneIds]);

      if (result.rows.length !== zoneIds.length) {
        throw new Error('One or more zones not found');
      }

      let resultGeometry: string;
      const geometries = result.rows.map(row => row.boundary_wkt);

      switch (operation) {
      case 'union':
        resultGeometry = await postgisUtils.calculateUnion(geometries);
        break;

      case 'intersection':
        if (geometries.length > 2) {
          throw new Error('Intersection operation supports only 2 zones');
        }
        resultGeometry = await postgisUtils.calculateIntersection(geometries[0], geometries[1]);
        break;

      case 'difference':
        if (geometries.length > 2) {
          throw new Error('Difference operation supports only 2 zones');
        }
        resultGeometry = await postgisUtils.calculateDifference(geometries[0], geometries[1]);
        break;

      default:
        throw new Error(`Unsupported operation: ${operation}`);
      }

      const area = await postgisUtils.calculateArea(resultGeometry);

      // Convert to GeoJSON
      const geoJsonResult = await client.query(
        'SELECT ST_AsGeoJSON($1) as geojson',
        [resultGeometry]
      );

      const resultPolygon: GeoJSON.MultiPolygon = JSON.parse(geoJsonResult.rows[0].geojson);

      return {
        operation,
        zones: zoneIds,
        result: resultPolygon,
        areaSqKm: area
      };

    } finally {
      client.release();
    }
  }

  /**
   * Calculate zone coverage statistics
   */
  async calculateZoneStatistics(
    zoneId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ZoneStatistics> {
    const client = await databaseConfig.connect();

    try {
      // Get zone details
      const zoneResult = await client.query(`
        SELECT area_sq_km, ST_AsText(boundary) as boundary_wkt
        FROM delivery_zones
        WHERE id = $1
      `, [zoneId]);

      if (zoneResult.rows.length === 0) {
        throw new Error('Zone not found');
      }

      const zone = zoneResult.rows[0];
      const perimeter = await postgisUtils.calculatePerimeter(zone.boundary_wkt);

      // Calculate delivery statistics (mock implementation)
      // In production, this would query actual delivery data
      const deliveryStats = {
        totalDeliveries: 150,
        averageDeliveryTime: 32.5,
        successRate: 94.2,
        revenueGenerated: 4875.50,
        costPerDelivery: 12.80
      };

      const statistics: ZoneStatistics = {
        zoneId,
        areaSqKm: parseFloat(zone.area_sq_km),
        perimeterKm: perimeter,
        estimatedAddresses: Math.floor(parseFloat(zone.area_sq_km) * 2500), // ~2500 addresses per sq km
        actualDeliveries: deliveryStats.totalDeliveries,
        averageDeliveryTime: deliveryStats.averageDeliveryTime,
        successRate: deliveryStats.successRate,
        revenueGenerated: deliveryStats.revenueGenerated,
        costPerDelivery: deliveryStats.costPerDelivery,
        profitMargin: ((deliveryStats.revenueGenerated - (deliveryStats.totalDeliveries * deliveryStats.costPerDelivery)) / deliveryStats.revenueGenerated) * 100,
        periodStart,
        periodEnd,
        calculatedAt: new Date()
      };

      return statistics;

    } finally {
      client.release();
    }
  }

  /**
   * Import zones from external formats
   */
  async importZones(
    companyId: string,
    importRequest: ZoneImportRequest
  ): Promise<ZoneImportResult> {
    const result: ZoneImportResult = {
      totalZones: 0,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      importedZoneIds: [],
      warnings: []
    };

    try {
      let zones: any[] = [];

      // Parse data based on format
      switch (importRequest.format) {
      case 'geojson':
        zones = this.parseGeoJSON(importRequest.fileData as string);
        break;
      case 'kml':
        zones = this.parseKML(importRequest.fileData as string);
        break;
      case 'shapefile':
        throw new Error('Shapefile import not implemented yet');
      default:
        throw new Error(`Unsupported format: ${importRequest.format}`);
      }

      result.totalZones = zones.length;

      // Process each zone
      for (let i = 0; i < zones.length; i++) {
        try {
          const zoneData = zones[i];

          // Validate geometry if requested
          if (importRequest.validateGeometry) {
            const geometryWKT = postgisUtils.geoJSONToWKT(zoneData.geometry);
            const validation = await postgisUtils.validateGeometry(geometryWKT);

            if (!validation.isValid) {
              result.errors.push({
                zoneIndex: i,
                error: `Invalid geometry: ${validation.reason}`
              });
              result.failedImports++;
              continue;
            }
          }

          // Create zone
          const zone = await this.createZone(
            companyId,
            zoneData.properties?.name || `Imported Zone ${i + 1}`,
            zoneData.geometry,
            {
              ...importRequest.defaultMetadata,
              description: zoneData.properties?.description || importRequest.defaultMetadata?.description
            }
          );

          result.importedZoneIds.push(zone.id);
          result.successfulImports++;

        } catch (error) {
          result.errors.push({
            zoneIndex: i,
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error
          });
          result.failedImports++;
        }
      }

      // Merge overlapping zones if requested
      if (importRequest.mergeOverlapping && result.importedZoneIds.length > 1) {
        await this.mergeOverlappingZones(companyId, result.importedZoneIds);
        result.warnings.push('Overlapping zones were merged');
      }

      return result;

    } catch (error) {
      throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze zone coverage for a company
   */
  async analyzeZoneCoverage(
    companyId: string,
    analysisArea?: GeoJSON.Polygon
  ): Promise<ZoneCoverageAnalysis> {
    const client = await databaseConfig.connect();

    try {
      let areaWhere = '';
      const areaParams: any[] = [companyId];

      if (analysisArea) {
        areaWhere = 'AND ST_Intersects(boundary, ST_GeomFromGeoJSON($2))';
        areaParams.push(JSON.stringify(analysisArea));
      }

      // Get all zones for the company
      const zonesResult = await client.query(`
        SELECT 
          id, 
          ST_AsText(boundary) as boundary_wkt,
          ST_Area(boundary) as area_sq_m
        FROM delivery_zones
        WHERE company_id = $1 AND is_active = true
        ${areaWhere}
      `, areaParams);

      const zones = zonesResult.rows;
      let totalArea = 0;
      let unionGeometry = '';

      if (zones.length === 0) {
        // No zones found
        return {
          totalArea: 0,
          coveredArea: 0,
          uncoveredArea: 0,
          overlapArea: 0,
          gapAreas: [],
          overlapRegions: [],
          coveragePercentage: 0
        };
      }

      // Calculate union of all zones
      const geometries = zones.map(z => z.boundary_wkt);
      unionGeometry = await postgisUtils.calculateUnion(geometries);

      const unionArea = await postgisUtils.calculateArea(unionGeometry);

      // Calculate total area of individual zones (to detect overlaps)
      totalArea = zones.reduce((sum, zone) => sum + parseFloat(zone.area_sq_m), 0) / 1000000; // Convert to sq km

      const overlapArea = Math.max(0, totalArea - unionArea);

      // For simplicity, we'll return basic statistics
      // In production, you'd calculate actual gaps and overlaps using PostGIS
      const coverage: ZoneCoverageAnalysis = {
        totalArea: analysisArea ? await postgisUtils.calculateArea(postgisUtils.geoJSONToWKT(analysisArea)) : totalArea,
        coveredArea: unionArea,
        uncoveredArea: 0, // Would calculate based on analysis area
        overlapArea,
        gapAreas: [],
        overlapRegions: [],
        coveragePercentage: analysisArea ?
          (unionArea / await postgisUtils.calculateArea(postgisUtils.geoJSONToWKT(analysisArea))) * 100 :
          100
      };

      return coverage;

    } finally {
      client.release();
    }
  }

  /**
   * Get zone pricing for a specific request
   */
  async getZonePricing(
    zoneId: string,
    vehicleType?: string,
    requestTime?: Date
  ): Promise<ZonePricing[]> {
    const cacheKey = `pricing:${zoneId}:${vehicleType || 'default'}`;

    // Check cache
    if (this.options.enableCaching && this.pricingCache.has(cacheKey)) {
      return this.pricingCache.get(cacheKey)!;
    }

    const client = await databaseConfig.connect();

    try {
      const currentTime = requestTime || new Date();
      const dayOfWeek = currentTime.getDay();
      const hourOfDay = currentTime.getHours();

      let query = `
        SELECT 
          id, zone_id, vehicle_type, weight_class, day_of_week, hour_of_day,
          base_fee, per_mile_rate, per_minute_rate, surge_multiplier,
          valid_from, valid_until, is_active
        FROM zone_pricing
        WHERE zone_id = $1 AND is_active = true
      `;

      const params: any[] = [zoneId];
      let paramIndex = 2;

      if (vehicleType) {
        query += ` AND (vehicle_type = $${paramIndex} OR vehicle_type IS NULL)`;
        params.push(vehicleType);
        paramIndex++;
      }

      // Time-based filtering
      query += ` AND (day_of_week = $${paramIndex} OR day_of_week IS NULL)`;
      params.push(dayOfWeek);
      paramIndex++;

      query += ` AND (hour_of_day = $${paramIndex} OR hour_of_day IS NULL)`;
      params.push(hourOfDay);
      paramIndex++;

      query += ` AND (valid_from IS NULL OR valid_from <= $${paramIndex})`;
      params.push(currentTime);
      paramIndex++;

      query += ` AND (valid_until IS NULL OR valid_until >= $${paramIndex})`;
      params.push(currentTime);

      query += ` ORDER BY 
        CASE WHEN vehicle_type IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN day_of_week IS NOT NULL THEN 1 ELSE 2 END,
        CASE WHEN hour_of_day IS NOT NULL THEN 1 ELSE 2 END
      `;

      const result = await client.query(query, params);

      const pricing: ZonePricing[] = result.rows.map(row => ({
        id: row.id,
        zoneId: row.zone_id,
        vehicleType: row.vehicle_type,
        weightClass: row.weight_class,
        dayOfWeek: row.day_of_week,
        hourOfDay: row.hour_of_day,
        baseFee: parseFloat(row.base_fee),
        perMileRate: row.per_mile_rate ? parseFloat(row.per_mile_rate) : undefined,
        perMinuteRate: row.per_minute_rate ? parseFloat(row.per_minute_rate) : undefined,
        surgeMultiplier: parseFloat(row.surge_multiplier),
        validFrom: row.valid_from ? new Date(row.valid_from) : undefined,
        validUntil: row.valid_until ? new Date(row.valid_until) : undefined,
        isActive: row.is_active,
        createdAt: new Date()
      }));

      // Cache result
      if (this.options.enableCaching) {
        this.pricingCache.set(cacheKey, pricing);

        // Auto-expire cache after 5 minutes
        setTimeout(() => {
          this.pricingCache.delete(cacheKey);
        }, 300000);
      }

      return pricing;

    } finally {
      client.release();
    }
  }

  // Private helper methods

  private async validateZoneTopology(companyId: string, polygon: GeoJSON.MultiPolygon): Promise<void> {
    // Check for overlaps with existing zones (if needed)
    // This is a simplified check - production might have more complex rules

    const client = await databaseConfig.connect();

    try {
      const result = await client.query(`
        SELECT COUNT(*) as overlap_count
        FROM delivery_zones
        WHERE company_id = $1 
          AND is_active = true
          AND ST_Overlaps(boundary, ST_GeomFromGeoJSON($2))
      `, [companyId, JSON.stringify(polygon)]);

      const overlapCount = parseInt(result.rows[0].overlap_count);

      if (overlapCount > 5) {
        console.warn(`Zone has ${overlapCount} overlaps with existing zones`);
      }
    } finally {
      client.release();
    }
  }

  private calculateZonePriority(area: number, companyId: string): number {
    // Smaller zones get higher priority (more specific)
    if (area < 1) return 100; // < 1 sq km = very high priority
    if (area < 5) return 80; // < 5 sq km = high priority
    if (area < 20) return 60; // < 20 sq km = medium priority
    if (area < 100) return 40; // < 100 sq km = low priority
    return 20; // Large zones = very low priority
  }

  private async updateZoneCache(companyId: string): Promise<void> {
    if (!this.options.enableCaching) return;

    const cacheKey = `zones:company:${companyId}`;

    // Clear existing cache
    await trackingRedis.del(cacheKey);

    // This would cache all zones for the company
    // Implementation depends on caching strategy
  }

  private parseGeoJSON(data: string): any[] {
    const geoJson = JSON.parse(data);

    if (geoJson.type === 'FeatureCollection') {
      return geoJson.features.filter((feature: any) =>
        feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'
      );
    } else if (geoJson.type === 'Feature') {
      return [geoJson];
    }

    throw new Error('Invalid GeoJSON format');
  }

  private parseKML(data: string): any[] {
    // This is a placeholder for KML parsing
    // In production, you'd use a library like 'togeojson' or implement a proper KML parser
    throw new Error('KML parsing not implemented');
  }

  private async mergeOverlappingZones(companyId: string, zoneIds: string[]): Promise<void> {
    // This is a placeholder for merging overlapping zones
    // Implementation would depend on business rules
    console.log(`Would merge overlapping zones: ${zoneIds.join(', ')}`);
  }
}

export const deliveryZoneService = new DeliveryZoneService();
