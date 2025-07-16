import { Pool } from 'pg';
import { databaseConfig } from '../config/database';

export interface PostGISPoint {
  latitude: number;
  longitude: number;
}

export interface PostGISPolygon {
  coordinates: number[][][]; // GeoJSON Polygon format
}

export interface PostGISMultiPolygon {
  coordinates: number[][][][]; // GeoJSON MultiPolygon format
}

export interface SpatialQueryOptions {
  limit?: number;
  orderBy?: 'distance' | 'area' | 'created_at';
  orderDirection?: 'ASC' | 'DESC';
  bufferMeters?: number;
}

export interface DistanceResult {
  id: string;
  distanceMeters: number;
  [key: string]: any;
}

export interface ContainmentResult {
  id: string;
  isContained: boolean;
  [key: string]: any;
}

export class PostGISUtils {
  private db: Pool;

  constructor() {
    this.db = databaseConfig;
  }

  /**
   * Check if a point is contained within a polygon
   */
  async pointInPolygon(
    point: PostGISPoint,
    polygonWKT: string
  ): Promise<boolean> {
    const query = `
      SELECT ST_Contains(
        ST_GeogFromText($1),
        ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
      ) as is_contained
    `;
    
    const result = await this.db.query(query, [
      polygonWKT,
      point.longitude,
      point.latitude
    ]);
    
    return result.rows[0]?.is_contained || false;
  }

  /**
   * Find all polygons that contain a point
   */
  async findContainingZones(
    point: PostGISPoint,
    tableName: string = 'delivery_zones',
    options: SpatialQueryOptions = {}
  ): Promise<ContainmentResult[]> {
    const { limit = 100, orderBy = 'priority', orderDirection = 'DESC' } = options;
    
    let query = `
      SELECT 
        id,
        name,
        priority,
        ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as is_contained,
        ST_Distance(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_meters
      FROM ${tableName}
      WHERE is_active = true
        AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography)
    `;
    
    // Add ordering
    if (orderBy === 'distance') {
      query += ` ORDER BY distance_meters ${orderDirection}`;
    } else if (orderBy === 'area') {
      query += ` ORDER BY ST_Area(boundary) ${orderDirection}`;
    } else {
      query += ` ORDER BY ${orderBy} ${orderDirection}`;
    }
    
    query += ` LIMIT $3`;
    
    const result = await this.db.query(query, [
      point.longitude,
      point.latitude,
      limit
    ]);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      priority: row.priority,
      isContained: row.is_contained,
      distanceMeters: parseFloat(row.distance_meters)
    }));
  }

  /**
   * Calculate distance between two points
   */
  async calculateDistance(
    point1: PostGISPoint,
    point2: PostGISPoint
  ): Promise<number> {
    const query = `
      SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
      ) as distance_meters
    `;
    
    const result = await this.db.query(query, [
      point1.longitude,
      point1.latitude,
      point2.longitude,
      point2.latitude
    ]);
    
    return parseFloat(result.rows[0]?.distance_meters || 0);
  }

  /**
   * Find points within a radius of a center point
   */
  async findWithinRadius(
    center: PostGISPoint,
    radiusMeters: number,
    tableName: string,
    locationColumn: string = 'location',
    options: SpatialQueryOptions = {}
  ): Promise<DistanceResult[]> {
    const { limit = 100, orderBy = 'distance' } = options;
    
    let query = `
      SELECT 
        *,
        ST_Distance(
          ${locationColumn},
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_meters
      FROM ${tableName}
      WHERE ST_DWithin(
        ${locationColumn},
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
    `;
    
    if (orderBy === 'distance') {
      query += ` ORDER BY distance_meters ASC`;
    }
    
    query += ` LIMIT $4`;
    
    const result = await this.db.query(query, [
      center.longitude,
      center.latitude,
      radiusMeters,
      limit
    ]);
    
    return result.rows.map(row => ({
      ...row,
      distanceMeters: parseFloat(row.distance_meters)
    }));
  }

  /**
   * Create a buffer around a geometry
   */
  async createBuffer(
    geometryWKT: string,
    bufferMeters: number
  ): Promise<string> {
    const query = `
      SELECT ST_AsText(ST_Buffer($1::geography, $2)) as buffered_geometry
    `;
    
    const result = await this.db.query(query, [geometryWKT, bufferMeters]);
    return result.rows[0]?.buffered_geometry;
  }

  /**
   * Calculate the union of multiple polygons
   */
  async calculateUnion(polygonWKTs: string[]): Promise<string> {
    if (polygonWKTs.length === 0) return '';
    if (polygonWKTs.length === 1) return polygonWKTs[0];
    
    const placeholders = polygonWKTs.map((_, i) => `$${i + 1}::geography`).join(', ');
    const query = `
      SELECT ST_AsText(ST_Union(ARRAY[${placeholders}])) as union_result
    `;
    
    const result = await this.db.query(query, polygonWKTs);
    return result.rows[0]?.union_result;
  }

  /**
   * Calculate the intersection of multiple polygons
   */
  async calculateIntersection(polygon1WKT: string, polygon2WKT: string): Promise<string> {
    const query = `
      SELECT ST_AsText(ST_Intersection($1::geography, $2::geography)) as intersection_result
    `;
    
    const result = await this.db.query(query, [polygon1WKT, polygon2WKT]);
    return result.rows[0]?.intersection_result;
  }

  /**
   * Calculate the difference between two polygons
   */
  async calculateDifference(polygon1WKT: string, polygon2WKT: string): Promise<string> {
    const query = `
      SELECT ST_AsText(ST_Difference($1::geography, $2::geography)) as difference_result
    `;
    
    const result = await this.db.query(query, [polygon1WKT, polygon2WKT]);
    return result.rows[0]?.difference_result;
  }

  /**
   * Validate geometry
   */
  async validateGeometry(geometryWKT: string): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    const query = `
      SELECT 
        ST_IsValid($1::geometry) as is_valid,
        ST_IsValidReason($1::geometry) as reason
    `;
    
    const result = await this.db.query(query, [geometryWKT]);
    const row = result.rows[0];
    
    return {
      isValid: row?.is_valid || false,
      reason: row?.reason
    };
  }

  /**
   * Calculate area of a polygon in square kilometers
   */
  async calculateArea(polygonWKT: string): Promise<number> {
    const query = `
      SELECT ST_Area($1::geography) / 1000000 as area_sq_km
    `;
    
    const result = await this.db.query(query, [polygonWKT]);
    return parseFloat(result.rows[0]?.area_sq_km || 0);
  }

  /**
   * Calculate perimeter of a polygon in kilometers
   */
  async calculatePerimeter(polygonWKT: string): Promise<number> {
    const query = `
      SELECT ST_Perimeter($1::geography) / 1000 as perimeter_km
    `;
    
    const result = await this.db.query(query, [polygonWKT]);
    return parseFloat(result.rows[0]?.perimeter_km || 0);
  }

  /**
   * Simplify geometry to reduce complexity
   */
  async simplifyGeometry(geometryWKT: string, tolerance: number = 10): Promise<string> {
    const query = `
      SELECT ST_AsText(ST_Simplify($1::geometry, $2)) as simplified_geometry
    `;
    
    const result = await this.db.query(query, [geometryWKT, tolerance]);
    return result.rows[0]?.simplified_geometry;
  }

  /**
   * Check if two geometries intersect
   */
  async geometriesIntersect(geometry1WKT: string, geometry2WKT: string): Promise<boolean> {
    const query = `
      SELECT ST_Intersects($1::geography, $2::geography) as intersects
    `;
    
    const result = await this.db.query(query, [geometry1WKT, geometry2WKT]);
    return result.rows[0]?.intersects || false;
  }

  /**
   * Get the centroid of a geometry
   */
  async getCentroid(geometryWKT: string): Promise<PostGISPoint> {
    const query = `
      SELECT 
        ST_Y(ST_Centroid($1::geometry)) as latitude,
        ST_X(ST_Centroid($1::geometry)) as longitude
    `;
    
    const result = await this.db.query(query, [geometryWKT]);
    const row = result.rows[0];
    
    return {
      latitude: parseFloat(row?.latitude || 0),
      longitude: parseFloat(row?.longitude || 0)
    };
  }

  /**
   * Convert GeoJSON to WKT
   */
  geoJSONToWKT(geoJSON: GeoJSON.Geometry): string {
    // This is a simplified implementation
    // In production, you might want to use a library like 'wkt' or 'terraformer'
    
    if (geoJSON.type === 'Point') {
      const coords = geoJSON.coordinates as [number, number];
      return `POINT(${coords[0]} ${coords[1]})`;
    }
    
    if (geoJSON.type === 'Polygon') {
      const coords = geoJSON.coordinates as number[][][];
      const rings = coords.map(ring => 
        ring.map(coord => `${coord[0]} ${coord[1]}`).join(', ')
      ).map(ring => `(${ring})`).join(', ');
      return `POLYGON(${rings})`;
    }
    
    if (geoJSON.type === 'MultiPolygon') {
      const coords = geoJSON.coordinates as number[][][][];
      const polygons = coords.map(polygon => {
        const rings = polygon.map(ring => 
          ring.map(coord => `${coord[0]} ${coord[1]}`).join(', ')
        ).map(ring => `(${ring})`).join(', ');
        return `(${rings})`;
      }).join(', ');
      return `MULTIPOLYGON(${polygons})`;
    }
    
    throw new Error(`Unsupported geometry type: ${geoJSON.type}`);
  }

  /**
   * Batch spatial operations for performance
   */
  async batchSpatialQueries<T>(
    queries: Array<{
      sql: string;
      params: any[];
    }>
  ): Promise<T[][]> {
    const client = await this.db.connect();
    
    try {
      const results: T[][] = [];
      
      for (const query of queries) {
        const result = await client.query(query.sql, query.params);
        results.push(result.rows);
      }
      
      return results;
    } finally {
      client.release();
    }
  }
}

export const postgisUtils = new PostGISUtils();