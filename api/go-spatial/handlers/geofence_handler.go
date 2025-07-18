package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"go-spatial/models"
	"go-spatial/services"
)

type GeofenceHandler struct {
	geofenceService *services.GeofenceService
	spatialService  *services.SpatialService
}

func NewGeofenceHandler(geofenceService *services.GeofenceService, spatialService *services.SpatialService) *GeofenceHandler {
	return &GeofenceHandler{
		geofenceService: geofenceService,
		spatialService:  spatialService,
	}
}

// CreateGeofence handles geofence creation
func (h *GeofenceHandler) CreateGeofence(c *fiber.Ctx) error {
	var geofence models.Geofence
	if err := c.BodyParser(&geofence); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	// Validate required fields
	if geofence.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Geofence name is required",
		})
	}

	if geofence.Geometry == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Geofence geometry is required",
		})
	}

	// Set default values
	if geofence.ID == "" {
		geofence.ID = generateGeofenceID()
	}

	if geofence.Properties == nil {
		geofence.Properties = make(map[string]interface{})
	}

	geofence.CreatedAt = time.Now()
	geofence.UpdatedAt = time.Now()

	// Create geofence
	if err := h.geofenceService.CreateGeofence(&geofence); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to create geofence",
			"details": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success":  true,
		"message":  "Geofence created successfully",
		"geofence": geofence,
	})
}

// GetGeofence handles retrieving a specific geofence
func (h *GeofenceHandler) GetGeofence(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Geofence ID is required",
		})
	}

	geofence, err := h.geofenceService.GetGeofence(id)
	if err != nil {
		if err.Error() == "geofence not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   true,
				"message": "Geofence not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to get geofence",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"geofence": geofence,
	})
}

// UpdateGeofence handles geofence updates
func (h *GeofenceHandler) UpdateGeofence(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Geofence ID is required",
		})
	}

	var geofence models.Geofence
	if err := c.BodyParser(&geofence); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	// Update geofence
	if err := h.geofenceService.UpdateGeofence(id, &geofence); err != nil {
		if err.Error() == "geofence not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   true,
				"message": "Geofence not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to update geofence",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Geofence updated successfully",
	})
}

// DeleteGeofence handles geofence deletion
func (h *GeofenceHandler) DeleteGeofence(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Geofence ID is required",
		})
	}

	if err := h.geofenceService.DeleteGeofence(id); err != nil {
		if err.Error() == "geofence not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   true,
				"message": "Geofence not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to delete geofence",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Geofence deleted successfully",
	})
}

// ListGeofences handles listing geofences with filtering
func (h *GeofenceHandler) ListGeofences(c *fiber.Ctx) error {
	// Parse query parameters
	driverID := c.Query("driver_id")
	activeStr := c.Query("active")
	limitStr := c.Query("limit", "50")
	offsetStr := c.Query("offset", "0")

	// Convert parameters
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 100 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	var active *bool
	if activeStr != "" {
		activeBool, err := strconv.ParseBool(activeStr)
		if err == nil {
			active = &activeBool
		}
	}

	var driverIDPtr *string
	if driverID != "" {
		driverIDPtr = &driverID
	}

	// Get geofences
	geofences, err := h.geofenceService.ListGeofences(driverIDPtr, active, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to list geofences",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"geofences": geofences,
		"count":     len(geofences),
		"limit":     limit,
		"offset":    offset,
		"filters": fiber.Map{
			"driver_id": driverID,
			"active":    activeStr,
		},
	})
}

// CheckGeofenceEntry handles geofence entry/exit checking
func (h *GeofenceHandler) CheckGeofenceEntry(c *fiber.Ctx) error {
	startTime := time.Now()

	var request struct {
		DriverID string          `json:"driver_id"`
		Location models.Location `json:"location"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	// Validate required fields
	if request.DriverID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Driver ID is required",
		})
	}

	if request.Location.Latitude == 0 || request.Location.Longitude == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Valid location coordinates are required",
		})
	}

	// Check geofence entry
	alerts, err := h.geofenceService.CheckGeofenceEntry(request.DriverID, request.Location)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to check geofence entry",
			"details": err.Error(),
		})
	}

	responseTime := time.Since(startTime).Milliseconds()

	// Determine if any alerts were triggered
	hasAlerts := len(alerts) > 0
	alertLevel := "none"
	if hasAlerts {
		// Determine alert level based on geofence properties
		alertLevel = "info"
		for _, alert := range alerts {
			if alert.AlertType == "entry" {
				alertLevel = "warning"
				break
			}
		}
	}

	response := fiber.Map{
		"driver_id":   request.DriverID,
		"location":    request.Location,
		"alerts":      alerts,
		"alert_count": len(alerts),
		"has_alerts":  hasAlerts,
		"alert_level": alertLevel,
		"checked_at":  time.Now().Unix(),
		"performance": fiber.Map{
			"check_time":        responseTime,
			"target":            50, // 50ms target
			"within_target":     responseTime <= 50,
			"geofences_checked": len(alerts),
		},
	}

	return c.JSON(response)
}

// GetGeofenceStats returns geofence statistics
func (h *GeofenceHandler) GetGeofenceStats(c *fiber.Ctx) error {
	stats, err := h.geofenceService.GetGeofenceStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to get geofence statistics",
			"details": err.Error(),
		})
	}

	// Add additional computed stats
	if totalGeofences, ok := stats["total_geofences"].(int); ok && totalGeofences > 0 {
		if activeGeofences, ok := stats["active_geofences"].(int); ok {
			stats["active_percentage"] = float64(activeGeofences) / float64(totalGeofences) * 100
		}
	}

	return c.JSON(fiber.Map{
		"statistics": stats,
		"service_info": fiber.Map{
			"features": []string{
				"polygon_geofences",
				"circular_geofences",
				"driver_specific_geofences",
				"real_time_monitoring",
				"buffer_zones",
			},
			"performance": fiber.Map{
				"target_response_time": "50ms",
				"spatial_indexing":     true,
				"caching_enabled":      true,
			},
		},
	})
}

// GetGeofenceActivity returns recent geofence activity
func (h *GeofenceHandler) GetGeofenceActivity(c *fiber.Ctx) error {
	// Parse query parameters
	driverID := c.Query("driver_id")
	hours := c.Query("hours", "24")
	hoursInt, err := strconv.Atoi(hours)
	if err != nil || hoursInt <= 0 || hoursInt > 168 { // Max 1 week
		hoursInt = 24
	}

	// For demo purposes, return simulated activity data
	// In production, you'd query actual geofence events from database
	activity := []fiber.Map{
		{
			"timestamp":     time.Now().Add(-2 * time.Hour).Unix(),
			"driver_id":     driverID,
			"geofence_id":   "geofence_1",
			"geofence_name": "Downtown Delivery Zone",
			"event_type":    "entry",
			"location": fiber.Map{
				"latitude":  40.7128,
				"longitude": -74.0060,
			},
		},
		{
			"timestamp":     time.Now().Add(-4 * time.Hour).Unix(),
			"driver_id":     driverID,
			"geofence_id":   "geofence_2",
			"geofence_name": "Warehouse Area",
			"event_type":    "exit",
			"location": fiber.Map{
				"latitude":  40.7589,
				"longitude": -73.9851,
			},
		},
	}

	return c.JSON(fiber.Map{
		"activity":     activity,
		"period_hours": hoursInt,
		"driver_id":    driverID,
		"event_count":  len(activity),
		"summary": fiber.Map{
			"entries":          1,
			"exits":            1,
			"unique_geofences": 2,
		},
	})
}

// Helper functions

func generateGeofenceID() string {
	return "geofence_" + strconv.FormatInt(time.Now().UnixNano(), 36)
}
