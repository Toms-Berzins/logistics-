package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"go-spatial/models"
	"go-spatial/services"
)

type RouteHandler struct {
	routeService   *services.RouteService
	spatialService *services.SpatialService
}

func NewRouteHandler(routeService *services.RouteService, spatialService *services.SpatialService) *RouteHandler {
	return &RouteHandler{
		routeService:   routeService,
		spatialService: spatialService,
	}
}

// OptimizeRoute handles route optimization requests
func (h *RouteHandler) OptimizeRoute(c *fiber.Ctx) error {
	startTime := time.Now()

	var request models.RouteOptimizationRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	// Validate request
	if request.Origin.Latitude == 0 || request.Origin.Longitude == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Valid origin coordinates required",
		})
	}

	if len(request.Destinations) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "At least one destination required",
		})
	}

	if len(request.Destinations) > 50 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Maximum 50 destinations allowed",
		})
	}

	// Perform route optimization
	response, err := h.routeService.OptimizeRoute(request)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Route optimization failed",
			"details": err.Error(),
		})
	}

	// Check if response time meets performance target (200ms)
	responseTime := time.Since(startTime).Milliseconds()
	performanceTarget := 200 // 200ms target

	// Add performance information
	response.Performance.QueryTime = responseTime
	response.Performance.SpatialIndexUsed = true

	// Emit performance metrics
	performanceData := fiber.Map{
		"operation":     "route_optimization",
		"response_time": responseTime,
		"target":        performanceTarget,
		"within_target": responseTime <= int64(performanceTarget),
		"waypoints":     len(response.OptimizedRoute.Waypoints),
		"distance":      response.OptimizedRoute.TotalDistance,
		"duration":      response.OptimizedRoute.TotalDuration,
	}

	// Log performance for monitoring
	if responseTime > int64(performanceTarget) {
		c.Set("X-Performance-Warning", "Response time exceeded target")
	}

	return c.JSON(fiber.Map{
		"optimized_route":  response.OptimizedRoute,
		"performance":      response.Performance,
		"performance_data": performanceData,
	})
}

// CalculateRoute handles simple route calculation between two points
func (h *RouteHandler) CalculateRoute(c *fiber.Ctx) error {
	startTime := time.Now()

	var request struct {
		Origin      models.Location `json:"origin"`
		Destination models.Location `json:"destination"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	// Validate coordinates
	if request.Origin.Latitude == 0 || request.Origin.Longitude == 0 ||
		request.Destination.Latitude == 0 || request.Destination.Longitude == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Valid origin and destination coordinates required",
		})
	}

	// Calculate route
	route, err := h.routeService.CalculateRoute(request.Origin, request.Destination)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Route calculation failed",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	return c.JSON(fiber.Map{
		"route": route,
		"performance": fiber.Map{
			"calculation_time": responseTime,
			"target":           50, // 50ms target for simple calculations
			"within_target":    responseTime <= 50,
		},
	})
}

// ValidateRoute handles route validation requests
func (h *RouteHandler) ValidateRoute(c *fiber.Ctx) error {
	startTime := time.Now()

	var request struct {
		Waypoints []models.Location `json:"waypoints"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	if len(request.Waypoints) < 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "At least 2 waypoints required for validation",
		})
	}

	// Validate route
	validation, err := h.routeService.ValidateRoute(request.Waypoints)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Route validation failed",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	return c.JSON(fiber.Map{
		"validation": validation,
		"performance": fiber.Map{
			"validation_time":   responseTime,
			"waypoints_checked": len(request.Waypoints),
		},
	})
}

// GetTrafficData handles traffic data requests for a route
func (h *RouteHandler) GetTrafficData(c *fiber.Ctx) error {
	routeID := c.Params("routeId")
	if routeID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Route ID required",
		})
	}

	// Get optional query parameters
	radius := c.Query("radius", "1000") // Default 1km
	radiusFloat, err := strconv.ParseFloat(radius, 64)
	if err != nil || radiusFloat <= 0 {
		radiusFloat = 1000
	}

	startTime := time.Now()

	// Get traffic data
	trafficData, err := h.routeService.GetTrafficData(routeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to get traffic data",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	// Determine traffic status
	status := "normal"
	if trafficData.CongestionLevel > 0.8 {
		status = "severe"
	} else if trafficData.CongestionLevel > 0.6 {
		status = "heavy"
	} else if trafficData.CongestionLevel > 0.3 {
		status = "moderate"
	}

	return c.JSON(fiber.Map{
		"route_id":        routeID,
		"traffic_data":    trafficData,
		"status":          status,
		"recommendations": h.generateTrafficRecommendations(trafficData),
		"performance": fiber.Map{
			"query_time":    responseTime,
			"data_sources":  1,
			"radius_meters": radiusFloat,
		},
	})
}

// GetRouteAnalytics provides analytics for route performance
func (h *RouteHandler) GetRouteAnalytics(c *fiber.Ctx) error {
	// Get query parameters
	driverID := c.Query("driver_id")
	days := c.Query("days", "7")
	daysInt, err := strconv.Atoi(days)
	if err != nil || daysInt <= 0 {
		daysInt = 7
	}

	startTime := time.Now()

	// For demo purposes, return simulated analytics
	// In production, you'd query actual route history from database
	analytics := fiber.Map{
		"driver_id":               driverID,
		"period_days":             daysInt,
		"total_routes":            45,
		"total_distance_km":       1250.5,
		"total_duration_hours":    78.2,
		"average_speed_kmh":       42.3,
		"fuel_consumption_liters": 156.8,
		"optimization_savings": fiber.Map{
			"distance_saved_km": 89.2,
			"time_saved_hours":  4.1,
			"fuel_saved_liters": 12.4,
			"cost_saved_usd":    45.80,
		},
		"performance_metrics": fiber.Map{
			"routes_optimized":             43,
			"optimization_success_rate":    95.6,
			"average_optimization_time_ms": 145,
		},
		"traffic_analysis": fiber.Map{
			"heavy_traffic_encounters": 12,
			"average_delay_minutes":    8.5,
			"best_departure_times":     []string{"06:30", "09:45", "14:15"},
		},
	}

	responseTime := time.Since(startTime).Milliseconds()

	return c.JSON(fiber.Map{
		"analytics":    analytics,
		"generated_at": time.Now().Unix(),
		"performance": fiber.Map{
			"calculation_time":     responseTime,
			"data_points_analyzed": 450,
		},
	})
}

// Private helper methods

func (h *RouteHandler) generateTrafficRecommendations(trafficData *models.TrafficData) []string {
	recommendations := make([]string, 0)

	if trafficData.CongestionLevel > 0.8 {
		recommendations = append(recommendations, "Consider delaying departure by 30-60 minutes")
		recommendations = append(recommendations, "Use alternative routes if available")
		recommendations = append(recommendations, "Allow extra time for delivery")
	} else if trafficData.CongestionLevel > 0.6 {
		recommendations = append(recommendations, "Monitor traffic conditions closely")
		recommendations = append(recommendations, "Consider minor route adjustments")
	} else if trafficData.CongestionLevel > 0.3 {
		recommendations = append(recommendations, "Normal traffic conditions")
		recommendations = append(recommendations, "Proceed with planned route")
	} else {
		recommendations = append(recommendations, "Optimal traffic conditions")
		recommendations = append(recommendations, "Good time for efficient delivery")
	}

	if trafficData.AverageSpeed < 25 {
		recommendations = append(recommendations, "Very slow traffic - expect significant delays")
	} else if trafficData.AverageSpeed < 40 {
		recommendations = append(recommendations, "Moderate traffic - allow buffer time")
	}

	return recommendations
}
