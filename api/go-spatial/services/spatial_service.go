package services

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"sync"
	"time"

	"go-spatial/models"
)

type SpatialService struct {
	db           *sql.DB
	cache        *Cache
	metrics      *PerformanceMetrics
	metricsMutex sync.RWMutex
}

type PerformanceMetrics struct {
	TotalQueries        int64     `json:"total_queries"`
	AverageResponseTime float64   `json:"average_response_time"`
	CacheHitRate        float64   `json:"cache_hit_rate"`
	LastUpdated         time.Time `json:"last_updated"`
	QueryTimes          []int64   `json:"-"`
	CacheHits           int64     `json:"cache_hits"`
	CacheMisses         int64     `json:"cache_misses"`
}

type Cache struct {
	data       map[string]interface{}
	expiration map[string]time.Time
	mutex      sync.RWMutex
	ttl        time.Duration
}

func NewSpatialService(db *sql.DB) *SpatialService {
	return &SpatialService{
		db:    db,
		cache: NewCache(5 * time.Minute), // 5 minute cache TTL
		metrics: &PerformanceMetrics{
			QueryTimes:  make([]int64, 0, 1000),
			LastUpdated: time.Now(),
		},
	}
}

func NewCache(ttl time.Duration) *Cache {
	c := &Cache{
		data:       make(map[string]interface{}),
		expiration: make(map[string]time.Time),
		ttl:        ttl,
	}

	// Start cleanup goroutine
	go c.cleanup()

	return c
}

func (c *Cache) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.mutex.Lock()
			now := time.Now()
			for key, expiry := range c.expiration {
				if now.After(expiry) {
					delete(c.data, key)
					delete(c.expiration, key)
				}
			}
			c.mutex.Unlock()
		}
	}
}

func (c *Cache) Get(key string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	if expiry, exists := c.expiration[key]; exists {
		if time.Now().Before(expiry) {
			if value, exists := c.data[key]; exists {
				return value, true
			}
		}
	}

	return nil, false
}

func (c *Cache) Set(key string, value interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.data[key] = value
	c.expiration[key] = time.Now().Add(c.ttl)
}

// CheckGeofences performs real-time geofence checking
func (s *SpatialService) CheckGeofences(driverID string, location models.Location) (*models.SpatialAnalysisResult, error) {
	startTime := time.Now()
	defer s.recordQueryTime(time.Since(startTime).Milliseconds())

	// Check cache first
	cacheKey := fmt.Sprintf("geofence_%s_%.6f_%.6f", driverID, location.Latitude, location.Longitude)
	if cached, found := s.cache.Get(cacheKey); found {
		s.recordCacheHit()
		return cached.(*models.SpatialAnalysisResult), nil
	}

	s.recordCacheMiss()

	// PostGIS spatial query with spatial index optimization
	query := `
		SELECT 
			g.id,
			g.name,
			ST_Contains(g.geometry, ST_Point($1, $2)) as within_geofence,
			ST_Distance(
				g.geometry::geography, 
				ST_Point($1, $2)::geography
			) as distance_to_boundary
		FROM geofences g
		WHERE 
			g.active = true
			AND (g.driver_id IS NULL OR g.driver_id = $3)
			AND ST_DWithin(
				g.geometry::geography,
				ST_Point($1, $2)::geography,
				g.buffer_distance
			)
		ORDER BY distance_to_boundary
		LIMIT 10
	`

	rows, err := s.db.Query(query, location.Longitude, location.Latitude, driverID)
	if err != nil {
		return nil, fmt.Errorf("geofence query failed: %w", err)
	}
	defer rows.Close()

	result := &models.SpatialAnalysisResult{
		WithinGeofence:   false,
		SpatialQueries:   1,
		CalculationTime:  time.Since(startTime).Milliseconds(),
		NearbyDeliveries: make([]models.Location, 0),
	}

	for rows.Next() {
		var geofenceID, geofenceName string
		var withinGeofence bool
		var distanceToBoundary float64

		if err := rows.Scan(&geofenceID, &geofenceName, &withinGeofence, &distanceToBoundary); err != nil {
			continue
		}

		if withinGeofence {
			result.WithinGeofence = true
			result.GeofenceID = &geofenceID
			result.GeofenceName = &geofenceName
			break
		}
	}

	// Cache the result
	s.cache.Set(cacheKey, result)

	return result, nil
}

// CheckRouteDeviation analyzes route deviation
func (s *SpatialService) CheckRouteDeviation(currentLocation models.Location, expectedRoute []models.Location) (*models.SpatialAnalysisResult, error) {
	startTime := time.Now()
	defer s.recordQueryTime(time.Since(startTime).Milliseconds())

	if len(expectedRoute) < 2 {
		return nil, fmt.Errorf("expected route must have at least 2 points")
	}

	// Find closest point on route using PostGIS
	routeWKT := s.buildLineStringWKT(expectedRoute)

	query := `
		SELECT 
			ST_Distance(
				ST_GeomFromText($1, 4326)::geography,
				ST_Point($2, $3)::geography
			) as distance_to_route,
			ST_Length(ST_GeomFromText($1, 4326)::geography) as route_length
	`

	var distanceToRoute, routeLength float64
	err := s.db.QueryRow(query, routeWKT, currentLocation.Longitude, currentLocation.Latitude).
		Scan(&distanceToRoute, &routeLength)

	if err != nil {
		return nil, fmt.Errorf("route deviation query failed: %w", err)
	}

	// Calculate estimated delay based on deviation
	estimatedDelay := s.calculateDelayFromDeviation(distanceToRoute)

	result := &models.SpatialAnalysisResult{
		DistanceToRoute: &distanceToRoute,
		EstimatedDelay:  &estimatedDelay,
		SpatialQueries:  1,
		CalculationTime: time.Since(startTime).Milliseconds(),
	}

	return result, nil
}

// CheckDeliveryZone checks if location is in delivery zone
func (s *SpatialService) CheckDeliveryZone(location models.Location) (*models.SpatialAnalysisResult, error) {
	startTime := time.Now()
	defer s.recordQueryTime(time.Since(startTime).Milliseconds())

	// Find nearby delivery points using spatial index
	query := `
		SELECT 
			d.id,
			d.customer_name,
			d.address,
			ST_X(d.location) as longitude,
			ST_Y(d.location) as latitude,
			ST_Distance(
				d.location::geography,
				ST_Point($1, $2)::geography
			) as distance
		FROM delivery_locations d
		WHERE 
			d.active = true
			AND ST_DWithin(
				d.location::geography,
				ST_Point($1, $2)::geography,
				1000
			)
		ORDER BY distance
		LIMIT 10
	`

	rows, err := s.db.Query(query, location.Longitude, location.Latitude)
	if err != nil {
		return nil, fmt.Errorf("delivery zone query failed: %w", err)
	}
	defer rows.Close()

	nearbyDeliveries := make([]models.Location, 0)

	for rows.Next() {
		var id, customerName, address string
		var lng, lat, distance float64

		if err := rows.Scan(&id, &customerName, &address, &lng, &lat, &distance); err != nil {
			continue
		}

		nearbyDeliveries = append(nearbyDeliveries, models.Location{
			Latitude:     lat,
			Longitude:    lng,
			Address:      &address,
			CustomerName: &customerName,
			Distance:     &distance,
			Timestamp:    time.Now().Unix(),
		})
	}

	result := &models.SpatialAnalysisResult{
		NearbyDeliveries: nearbyDeliveries,
		SpatialQueries:   1,
		CalculationTime:  time.Since(startTime).Milliseconds(),
	}

	return result, nil
}

// AnalyzeTraffic performs traffic analysis
func (s *SpatialService) AnalyzeTraffic(location models.Location) (*models.SpatialAnalysisResult, error) {
	startTime := time.Now()
	defer s.recordQueryTime(time.Since(startTime).Milliseconds())

	// Query traffic data from spatial database
	query := `
		SELECT 
			AVG(t.congestion_level) as avg_congestion,
			COUNT(*) as traffic_reports
		FROM traffic_data t
		WHERE 
			t.timestamp > NOW() - INTERVAL '15 minutes'
			AND ST_DWithin(
				t.location::geography,
				ST_Point($1, $2)::geography,
				500
			)
	`

	var avgCongestion sql.NullFloat64
	var trafficReports int

	err := s.db.QueryRow(query, location.Longitude, location.Latitude).
		Scan(&avgCongestion, &trafficReports)

	if err != nil {
		return nil, fmt.Errorf("traffic analysis query failed: %w", err)
	}

	// Determine traffic level
	trafficLevel := "low"
	if avgCongestion.Valid {
		switch {
		case avgCongestion.Float64 > 0.8:
			trafficLevel = "severe"
		case avgCongestion.Float64 > 0.6:
			trafficLevel = "high"
		case avgCongestion.Float64 > 0.3:
			trafficLevel = "moderate"
		}
	}

	result := &models.SpatialAnalysisResult{
		TrafficLevel:    &trafficLevel,
		SpatialQueries:  1,
		CalculationTime: time.Since(startTime).Milliseconds(),
	}

	return result, nil
}

// BatchAnalyze performs batch spatial analysis
func (s *SpatialService) BatchAnalyze(request models.BatchSpatialAnalysisRequest) ([]models.SpatialAnalysisResult, error) {
	startTime := time.Now()
	defer s.recordQueryTime(time.Since(startTime).Milliseconds())

	results := make([]models.SpatialAnalysisResult, 0, len(request.Locations))

	// Use transaction for batch processing
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("failed to start transaction: %w", err)
	}
	defer tx.Rollback()

	for _, location := range request.Locations {
		switch request.AnalysisType {
		case "geofence_check":
			result, err := s.CheckGeofences(request.DriverID, location)
			if err == nil {
				results = append(results, *result)
			}
		case "delivery_zone":
			result, err := s.CheckDeliveryZone(location)
			if err == nil {
				results = append(results, *result)
			}
		}
	}

	return results, nil
}

// FindNearbyPOIs finds nearby points of interest
func (s *SpatialService) FindNearbyPOIs(location models.Location, radius float64, poiType string, limit int) ([]models.PointOfInterest, error) {
	startTime := time.Now()
	defer s.recordQueryTime(time.Since(startTime).Milliseconds())

	// Cache key for POI queries
	cacheKey := fmt.Sprintf("poi_%.6f_%.6f_%.0f_%s_%d",
		location.Latitude, location.Longitude, radius, poiType, limit)

	if cached, found := s.cache.Get(cacheKey); found {
		s.recordCacheHit()
		return cached.([]models.PointOfInterest), nil
	}

	s.recordCacheMiss()

	// Build query based on POI type
	whereClause := ""
	args := []interface{}{location.Longitude, location.Latitude, radius, limit}

	if poiType != "all" {
		whereClause = "AND p.type = $5"
		args = append(args, poiType)
	}

	query := fmt.Sprintf(`
		SELECT 
			p.id,
			p.name,
			p.type,
			p.address,
			ST_X(p.location) as longitude,
			ST_Y(p.location) as latitude,
			ST_Distance(
				p.location::geography,
				ST_Point($1, $2)::geography
			) as distance
		FROM points_of_interest p
		WHERE 
			p.active = true
			AND ST_DWithin(
				p.location::geography,
				ST_Point($1, $2)::geography,
				$3
			)
			%s
		ORDER BY distance
		LIMIT $4
	`, whereClause)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("POI query failed: %w", err)
	}
	defer rows.Close()

	pois := make([]models.PointOfInterest, 0)

	for rows.Next() {
		var poi models.PointOfInterest

		if err := rows.Scan(&poi.ID, &poi.Name, &poi.Type, &poi.Address,
			&poi.Longitude, &poi.Latitude, &poi.Distance); err != nil {
			continue
		}

		pois = append(pois, poi)
	}

	// Cache the result
	s.cache.Set(cacheKey, pois)

	return pois, nil
}

// CalculateDistance calculates distance between two points
func (s *SpatialService) CalculateDistance(origin, destination models.Location, method string) (*models.DistanceResult, error) {
	startTime := time.Now()
	defer s.recordQueryTime(time.Since(startTime).Milliseconds())

	var query string
	switch method {
	case "euclidean":
		query = `SELECT ST_Distance(ST_Point($1, $2), ST_Point($3, $4))`
	case "spherical":
		query = `SELECT ST_Distance(ST_Point($1, $2)::geography, ST_Point($3, $4)::geography)`
	default:
		method = "spherical"
		query = `SELECT ST_Distance(ST_Point($1, $2)::geography, ST_Point($3, $4)::geography)`
	}

	var distance float64
	err := s.db.QueryRow(query, origin.Longitude, origin.Latitude,
		destination.Longitude, destination.Latitude).Scan(&distance)

	if err != nil {
		return nil, fmt.Errorf("distance calculation failed: %w", err)
	}

	result := &models.DistanceResult{
		Distance: distance,
		Method:   method,
		Unit:     "meters",
	}

	return result, nil
}

// CheckIntersection checks if two geometries intersect
func (s *SpatialService) CheckIntersection(geom1, geom2 interface{}) (bool, error) {
	startTime := time.Now()
	defer s.recordQueryTime(time.Since(startTime).Milliseconds())

	// Convert geometries to WKT
	wkt1, err := s.geometryToWKT(geom1)
	if err != nil {
		return false, err
	}

	wkt2, err := s.geometryToWKT(geom2)
	if err != nil {
		return false, err
	}

	query := `SELECT ST_Intersects(ST_GeomFromText($1, 4326), ST_GeomFromText($2, 4326))`

	var intersects bool
	err = s.db.QueryRow(query, wkt1, wkt2).Scan(&intersects)

	if err != nil {
		return false, fmt.Errorf("intersection check failed: %w", err)
	}

	return intersects, nil
}

// Performance and metrics methods

func (s *SpatialService) RecordMetrics(operation string, responseTime int64) {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()

	s.metrics.TotalQueries++
	s.metrics.QueryTimes = append(s.metrics.QueryTimes, responseTime)

	// Keep only last 1000 query times
	if len(s.metrics.QueryTimes) > 1000 {
		s.metrics.QueryTimes = s.metrics.QueryTimes[1:]
	}

	// Calculate average
	var total int64
	for _, time := range s.metrics.QueryTimes {
		total += time
	}
	s.metrics.AverageResponseTime = float64(total) / float64(len(s.metrics.QueryTimes))

	// Calculate cache hit rate
	totalCacheOperations := s.metrics.CacheHits + s.metrics.CacheMisses
	if totalCacheOperations > 0 {
		s.metrics.CacheHitRate = float64(s.metrics.CacheHits) / float64(totalCacheOperations) * 100
	}

	s.metrics.LastUpdated = time.Now()
}

func (s *SpatialService) GetPerformanceMetrics() PerformanceMetrics {
	s.metricsMutex.RLock()
	defer s.metricsMutex.RUnlock()

	return *s.metrics
}

func (s *SpatialService) GetAverageQueryTime() float64 {
	s.metricsMutex.RLock()
	defer s.metricsMutex.RUnlock()

	return s.metrics.AverageResponseTime
}

func (s *SpatialService) CheckDatabaseHealth() bool {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err := s.db.PingContext(ctx)
	return err == nil
}

// Helper methods

func (s *SpatialService) recordQueryTime(milliseconds int64) {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()

	s.metrics.QueryTimes = append(s.metrics.QueryTimes, milliseconds)
	if len(s.metrics.QueryTimes) > 1000 {
		s.metrics.QueryTimes = s.metrics.QueryTimes[1:]
	}
}

func (s *SpatialService) recordCacheHit() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()

	s.metrics.CacheHits++
}

func (s *SpatialService) recordCacheMiss() {
	s.metricsMutex.Lock()
	defer s.metricsMutex.Unlock()

	s.metrics.CacheMisses++
}

func (s *SpatialService) buildLineStringWKT(points []models.Location) string {
	if len(points) < 2 {
		return ""
	}

	wkt := "LINESTRING("
	for i, point := range points {
		if i > 0 {
			wkt += ","
		}
		wkt += fmt.Sprintf("%.6f %.6f", point.Longitude, point.Latitude)
	}
	wkt += ")"

	return wkt
}

func (s *SpatialService) calculateDelayFromDeviation(distanceMeters float64) int {
	// Simple delay calculation: 1 minute per 100m deviation
	return int(math.Ceil(distanceMeters / 100))
}

func (s *SpatialService) geometryToWKT(geom interface{}) (string, error) {
	// This would convert various geometry types to WKT
	// For now, assume it's already a WKT string
	if wkt, ok := geom.(string); ok {
		return wkt, nil
	}

	return "", fmt.Errorf("unsupported geometry type")
}
