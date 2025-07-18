package services

import (
	"database/sql"
	"fmt"
	"math"
	"time"

	"go-spatial/models"
)

type RouteService struct {
	db *sql.DB
}

func NewRouteService(db *sql.DB) *RouteService {
	return &RouteService{
		db: db,
	}
}

// OptimizeRoute performs route optimization using spatial algorithms
func (s *RouteService) OptimizeRoute(request models.RouteOptimizationRequest) (*models.RouteOptimizationResponse, error) {
	startTime := time.Now()

	// Validate request
	if len(request.Destinations) == 0 {
		return nil, fmt.Errorf("no destinations provided")
	}

	// For demo purposes, we'll implement a simple nearest neighbor algorithm
	// In production, you'd use more sophisticated algorithms like Genetic Algorithm,
	// Simulated Annealing, or call external routing services like OSRM
	optimizedWaypoints, err := s.optimizeWaypointsNearestNeighbor(request.Origin, request.Destinations)
	if err != nil {
		return nil, fmt.Errorf("route optimization failed: %w", err)
	}

	// Calculate route metrics
	totalDistance, totalDuration, estimatedFuel, err := s.calculateRouteMetrics(optimizedWaypoints, request.Vehicle)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate route metrics: %w", err)
	}

	calculationTime := time.Since(startTime).Milliseconds()

	response := &models.RouteOptimizationResponse{
		OptimizedRoute: models.OptimizedRoute{
			Waypoints:     optimizedWaypoints,
			TotalDistance: totalDistance,
			TotalDuration: int(totalDuration),
			EstimatedFuel: estimatedFuel,
		},
		Performance: models.PerformanceMetrics{
			CalculationTime: calculationTime,
			SpatialQueries:  len(request.Destinations),
		},
	}

	return response, nil
}

// CalculateRoute calculates route between two points
func (s *RouteService) CalculateRoute(origin, destination models.Location) (*models.OptimizedRoute, error) {
	// Calculate direct distance and duration
	distance, err := s.calculateDistance(origin, destination)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate distance: %w", err)
	}

	// Estimate duration (assuming average speed of 50 km/h in urban areas)
	avgSpeedKmh := 50.0
	durationHours := (distance / 1000.0) / avgSpeedKmh
	durationSeconds := int(durationHours * 3600)

	// Estimate fuel consumption (assuming 8L/100km for a van)
	fuelConsumptionPer100km := 8.0
	estimatedFuel := (distance / 1000.0) * (fuelConsumptionPer100km / 100.0)

	route := &models.OptimizedRoute{
		Waypoints:     []models.Location{origin, destination},
		TotalDistance: distance,
		TotalDuration: durationSeconds,
		EstimatedFuel: estimatedFuel,
	}

	return route, nil
}

// ValidateRoute validates a proposed route
func (s *RouteService) ValidateRoute(waypoints []models.Location) (*models.RouteValidationResult, error) {
	if len(waypoints) < 2 {
		return &models.RouteValidationResult{
			IsValid: false,
			Issues:  []string{"Route must have at least 2 waypoints"},
		}, nil
	}

	issues := make([]string, 0)

	// Check for duplicate waypoints
	for i := 0; i < len(waypoints); i++ {
		for j := i + 1; j < len(waypoints); j++ {
			if s.locationsEqual(waypoints[i], waypoints[j]) {
				issues = append(issues, fmt.Sprintf("Duplicate waypoints found at indices %d and %d", i, j))
			}
		}
	}

	// Check for extremely long segments (> 500km)
	for i := 0; i < len(waypoints)-1; i++ {
		distance, err := s.calculateDistance(waypoints[i], waypoints[i+1])
		if err == nil && distance > 500000 { // 500km in meters
			issues = append(issues, fmt.Sprintf("Very long segment between waypoints %d and %d (%.2f km)",
				i, i+1, distance/1000))
		}
	}

	// Check for invalid coordinates
	for i, waypoint := range waypoints {
		if waypoint.Latitude < -90 || waypoint.Latitude > 90 ||
			waypoint.Longitude < -180 || waypoint.Longitude > 180 {
			issues = append(issues, fmt.Sprintf("Invalid coordinates at waypoint %d", i))
		}
	}

	return &models.RouteValidationResult{
		IsValid: len(issues) == 0,
		Issues:  issues,
	}, nil
}

// GetTrafficData retrieves traffic data for a route
func (s *RouteService) GetTrafficData(routeID string) (*models.TrafficData, error) {
	// For demo purposes, return simulated traffic data
	// In production, you'd integrate with real traffic APIs

	query := `
		SELECT 
			AVG(congestion_level) as avg_congestion,
			AVG(average_speed) as avg_speed,
			COUNT(*) as data_points
		FROM traffic_data
		WHERE timestamp > NOW() - INTERVAL '30 minutes'
	`

	var avgCongestion, avgSpeed sql.NullFloat64
	var dataPoints int

	err := s.db.QueryRow(query).Scan(&avgCongestion, &avgSpeed, &dataPoints)
	if err != nil && err != sql.ErrNoRows {
		return nil, fmt.Errorf("failed to get traffic data: %w", err)
	}

	// Default values if no data available
	congestionLevel := 0.3 // Light traffic
	averageSpeed := 45.0   // 45 km/h

	if avgCongestion.Valid {
		congestionLevel = avgCongestion.Float64
	}
	if avgSpeed.Valid {
		averageSpeed = avgSpeed.Float64
	}

	trafficData := &models.TrafficData{
		Location: models.Location{
			Latitude:  0, // Would be specific to route
			Longitude: 0,
			Timestamp: time.Now().Unix(),
		},
		CongestionLevel: congestionLevel,
		AverageSpeed:    averageSpeed,
		Timestamp:       time.Now(),
	}

	return trafficData, nil
}

// Private helper methods

func (s *RouteService) optimizeWaypointsNearestNeighbor(origin models.Location, destinations []models.Location) ([]models.Location, error) {
	if len(destinations) == 0 {
		return []models.Location{origin}, nil
	}

	optimized := []models.Location{origin}
	remaining := make([]models.Location, len(destinations))
	copy(remaining, destinations)

	current := origin

	// Nearest neighbor algorithm
	for len(remaining) > 0 {
		nearestIndex := 0
		nearestDistance := math.Inf(1)

		// Find nearest unvisited destination
		for i, dest := range remaining {
			distance, err := s.calculateDistance(current, dest)
			if err != nil {
				continue
			}

			if distance < nearestDistance {
				nearestDistance = distance
				nearestIndex = i
			}
		}

		// Add nearest destination to route
		optimized = append(optimized, remaining[nearestIndex])
		current = remaining[nearestIndex]

		// Remove from remaining destinations
		remaining = append(remaining[:nearestIndex], remaining[nearestIndex+1:]...)
	}

	return optimized, nil
}

func (s *RouteService) calculateRouteMetrics(waypoints []models.Location, vehicle models.Vehicle) (float64, float64, float64, error) {
	if len(waypoints) < 2 {
		return 0, 0, 0, fmt.Errorf("insufficient waypoints")
	}

	var totalDistance float64
	var totalDuration float64

	// Calculate cumulative distance and duration
	for i := 0; i < len(waypoints)-1; i++ {
		distance, err := s.calculateDistance(waypoints[i], waypoints[i+1])
		if err != nil {
			return 0, 0, 0, fmt.Errorf("failed to calculate segment distance: %w", err)
		}

		totalDistance += distance

		// Estimate duration based on vehicle type and road conditions
		avgSpeed := s.getAverageSpeedForVehicle(vehicle.Type)
		segmentDuration := (distance / 1000.0) / avgSpeed * 3600 // Convert to seconds
		totalDuration += segmentDuration
	}

	// Calculate fuel consumption based on vehicle type
	estimatedFuel := s.calculateFuelConsumption(totalDistance, vehicle.Type)

	return totalDistance, totalDuration, estimatedFuel, nil
}

func (s *RouteService) calculateDistance(origin, destination models.Location) (float64, error) {
	query := `
		SELECT ST_Distance(
			ST_Point($1, $2)::geography,
			ST_Point($3, $4)::geography
		) as distance
	`

	var distance float64
	err := s.db.QueryRow(query,
		origin.Longitude, origin.Latitude,
		destination.Longitude, destination.Latitude,
	).Scan(&distance)

	if err != nil {
		return 0, fmt.Errorf("distance calculation failed: %w", err)
	}

	return distance, nil
}

func (s *RouteService) getAverageSpeedForVehicle(vehicleType string) float64 {
	switch vehicleType {
	case "motorcycle":
		return 60.0 // km/h
	case "van":
		return 50.0 // km/h
	case "truck":
		return 40.0 // km/h
	default:
		return 50.0 // km/h
	}
}

func (s *RouteService) calculateFuelConsumption(distanceMeters float64, vehicleType string) float64 {
	distanceKm := distanceMeters / 1000.0

	var fuelPer100km float64
	switch vehicleType {
	case "motorcycle":
		fuelPer100km = 4.0 // L/100km
	case "van":
		fuelPer100km = 8.0 // L/100km
	case "truck":
		fuelPer100km = 15.0 // L/100km
	default:
		fuelPer100km = 8.0 // L/100km
	}

	return distanceKm * (fuelPer100km / 100.0)
}

func (s *RouteService) locationsEqual(loc1, loc2 models.Location) bool {
	const epsilon = 0.000001 // ~0.1 meter precision
	return math.Abs(loc1.Latitude-loc2.Latitude) < epsilon &&
		math.Abs(loc1.Longitude-loc2.Longitude) < epsilon
}
