package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"go-spatial/models"
	"go-spatial/services"
)

type SpatialHandler struct {
	spatialService  *services.SpatialService
	geofenceService *services.GeofenceService
}

func NewSpatialHandler(spatialService *services.SpatialService, geofenceService *services.GeofenceService) *SpatialHandler {
	return &SpatialHandler{
		spatialService:  spatialService,
		geofenceService: geofenceService,
	}
}

// AnalyzeLocation performs real-time spatial analysis
func (h *SpatialHandler) AnalyzeLocation(c *fiber.Ctx) error {
	startTime := time.Now()

	var request models.SpatialAnalysisRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	// Validate required fields
	if request.DriverID == "" || request.Location.Latitude == 0 || request.Location.Longitude == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Missing required fields: driverId, latitude, longitude",
		})
	}

	// Perform spatial analysis based on type
	var result *models.SpatialAnalysisResult
	var err error

	switch request.AnalysisType {
	case "geofence_check":
		result, err = h.spatialService.CheckGeofences(request.DriverID, request.Location)
	case "route_deviation":
		expectedRoute, ok := request.Parameters["expectedRoute"].([]models.Location)
		if !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   true,
				"message": "Expected route parameter required for route deviation analysis",
			})
		}
		result, err = h.spatialService.CheckRouteDeviation(request.Location, expectedRoute)
	case "delivery_zone":
		result, err = h.spatialService.CheckDeliveryZone(request.Location)
	case "traffic_analysis":
		result, err = h.spatialService.AnalyzeTraffic(request.Location)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid analysis type",
		})
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Spatial analysis failed",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	response := models.SpatialAnalysisResponse{
		Result: *result,
		Performance: models.PerformanceMetrics{
			QueryTime:        responseTime,
			SpatialIndexUsed: true,
			CalculationTime:  responseTime,
			SpatialQueries:   result.SpatialQueries,
		},
	}

	// Log performance metrics
	h.spatialService.RecordMetrics(request.AnalysisType, responseTime)

	return c.JSON(response)
}

// BatchAnalyze performs batch spatial analysis for multiple locations
func (h *SpatialHandler) BatchAnalyze(c *fiber.Ctx) error {
	startTime := time.Now()

	var request models.BatchSpatialAnalysisRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	if len(request.Locations) == 0 || len(request.Locations) > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Batch size must be between 1 and 100 locations",
		})
	}

	results, err := h.spatialService.BatchAnalyze(request)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Batch analysis failed",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	response := models.BatchSpatialAnalysisResponse{
		Results: results,
		Performance: models.PerformanceMetrics{
			QueryTime:       responseTime,
			BatchSize:       len(request.Locations),
			CalculationTime: responseTime,
		},
	}

	return c.JSON(response)
}

// FindNearby finds nearby points of interest
func (h *SpatialHandler) FindNearby(c *fiber.Ctx) error {
	startTime := time.Now()

	// Parse query parameters
	latStr := c.Query("lat")
	lngStr := c.Query("lng")
	radiusStr := c.Query("radius", "1000") // Default 1km
	poiType := c.Query("type", "all")
	limitStr := c.Query("limit", "50")

	if latStr == "" || lngStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Latitude and longitude parameters required",
		})
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid latitude value",
		})
	}

	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid longitude value",
		})
	}

	radius, err := strconv.ParseFloat(radiusStr, 64)
	if err != nil || radius <= 0 || radius > 50000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid radius value (must be between 1 and 50000 meters)",
		})
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid limit value (must be between 1 and 100)",
		})
	}

	location := models.Location{
		Latitude:  lat,
		Longitude: lng,
		Timestamp: time.Now().Unix(),
	}

	nearbyPOIs, err := h.spatialService.FindNearbyPOIs(location, radius, poiType, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to find nearby points",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	response := fiber.Map{
		"nearby_pois": nearbyPOIs,
		"center": fiber.Map{
			"latitude":  lat,
			"longitude": lng,
		},
		"radius": radius,
		"count":  len(nearbyPOIs),
		"performance": fiber.Map{
			"query_time":    responseTime,
			"target":        50, // 50ms target
			"within_target": responseTime <= 50,
		},
	}

	return c.JSON(response)
}

// CalculateDistance calculates distance between two points
func (h *SpatialHandler) CalculateDistance(c *fiber.Ctx) error {
	startTime := time.Now()

	var request models.DistanceRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	if request.Origin.Latitude == 0 || request.Origin.Longitude == 0 ||
		request.Destination.Latitude == 0 || request.Destination.Longitude == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid coordinates",
		})
	}

	distance, err := h.spatialService.CalculateDistance(request.Origin, request.Destination, request.Method)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Distance calculation failed",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	response := models.DistanceResponse{
		Distance: distance,
		Method:   request.Method,
		Performance: models.PerformanceMetrics{
			QueryTime:       responseTime,
			CalculationTime: responseTime,
		},
	}

	return c.JSON(response)
}

// CheckIntersection checks if geometries intersect
func (h *SpatialHandler) CheckIntersection(c *fiber.Ctx) error {
	startTime := time.Now()

	var request models.IntersectionRequest
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	intersects, err := h.spatialService.CheckIntersection(request.Geometry1, request.Geometry2)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Intersection check failed",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	response := models.IntersectionResponse{
		Intersects: intersects,
		Performance: models.PerformanceMetrics{
			QueryTime:       responseTime,
			CalculationTime: responseTime,
		},
	}

	return c.JSON(response)
}

// GetMetrics returns performance metrics
func (h *SpatialHandler) GetMetrics(c *fiber.Ctx) error {
	metrics := h.spatialService.GetPerformanceMetrics()

	return c.JSON(fiber.Map{
		"spatial_service_metrics": metrics,
		"timestamp":               time.Now().Unix(),
		"performance_targets": fiber.Map{
			"spatial_queries":    "50ms",
			"route_calculations": "200ms",
			"batch_operations":   "500ms",
			"cache_hit_rate":     "95%",
		},
	})
}

// HealthCheck performs detailed health check
func (h *SpatialHandler) HealthCheck(c *fiber.Ctx) error {
	startTime := time.Now()

	// Test database connectivity
	dbHealth := h.spatialService.CheckDatabaseHealth()

	// Test spatial index performance
	testLocation := models.Location{
		Latitude:  40.7128,
		Longitude: -74.0060,
		Timestamp: time.Now().Unix(),
	}

	indexTestStart := time.Now()
	_, err := h.spatialService.FindNearbyPOIs(testLocation, 1000, "all", 10)
	indexTestTime := time.Since(indexTestStart).Milliseconds()

	spatialIndexHealth := err == nil && indexTestTime < 50

	responseTime := time.Since(startTime).Milliseconds()

	overallHealth := dbHealth && spatialIndexHealth

	status := "healthy"
	if !overallHealth {
		status = "degraded"
	}

	response := fiber.Map{
		"status":    status,
		"timestamp": time.Now().Unix(),
		"checks": fiber.Map{
			"database": fiber.Map{
				"status":        dbHealth,
				"response_time": responseTime,
			},
			"spatial_index": fiber.Map{
				"status":        spatialIndexHealth,
				"response_time": indexTestTime,
				"target":        50,
			},
		},
		"performance": fiber.Map{
			"total_response_time": responseTime,
			"spatial_queries_avg": h.spatialService.GetAverageQueryTime(),
		},
	}

	statusCode := fiber.StatusOK
	if !overallHealth {
		statusCode = fiber.StatusServiceUnavailable
	}

	return c.Status(statusCode).JSON(response)
}
