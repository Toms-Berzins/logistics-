package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"go-spatial/services"
)

type WebSocketHandler struct {
	hub            *services.WebSocketHub
	spatialService *services.SpatialService
}

func NewWebSocketHandler(hub *services.WebSocketHub, spatialService *services.SpatialService) *WebSocketHandler {
	return &WebSocketHandler{
		hub:            hub,
		spatialService: spatialService,
	}
}

// HandleConnection handles new WebSocket connections
func (h *WebSocketHandler) HandleConnection(c *websocket.Conn) {
	// Extract driver ID from query parameters or headers
	driverID := c.Query("driver_id")
	if driverID == "" {
		// Try to get from Locals (set by middleware)
		if id, ok := c.Locals("driver_id").(string); ok {
			driverID = id
		} else {
			driverID = "unknown"
		}
	}

	log.Printf("New WebSocket connection for driver: %s from %s", driverID, c.RemoteAddr())

	// Register the client with the hub
	_ = h.hub.RegisterClient(c, driverID)

	// Send initial connection confirmation
	h.hub.BroadcastToDriver(driverID, map[string]interface{}{
		"type":      "connection_confirmed",
		"message":   "WebSocket connection established successfully",
		"driver_id": driverID,
		"features": []string{
			"real_time_geofencing",
			"route_optimization",
			"traffic_alerts",
			"performance_monitoring",
		},
	})

	// The client will handle its own read/write loops
	// Connection cleanup is handled automatically when the connection closes
	log.Printf("WebSocket connection established for driver: %s", driverID)
}

// GetConnectionStats returns WebSocket connection statistics
func (h *WebSocketHandler) GetConnectionStats(c *fiber.Ctx) error {
	metrics := h.hub.GetMetrics()

	return c.JSON(fiber.Map{
		"websocket_stats":       metrics,
		"spatial_service_stats": h.spatialService.GetPerformanceMetrics(),
		"status":                "healthy",
	})
}

// BroadcastMessage allows external systems to broadcast messages
func (h *WebSocketHandler) BroadcastMessage(c *fiber.Ctx) error {
	var request struct {
		Type     string      `json:"type"`
		DriverID string      `json:"driver_id,omitempty"`
		Message  interface{} `json:"message"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	var err error
	if request.DriverID != "" {
		// Send to specific driver
		err = h.hub.BroadcastToDriver(request.DriverID, request.Message)
	} else {
		// Broadcast to all
		err = h.hub.BroadcastToAll(request.Message)
	}

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to broadcast message",
			"details": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Message broadcasted successfully",
	})
}
