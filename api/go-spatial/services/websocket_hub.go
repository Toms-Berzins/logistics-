package services

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gofiber/websocket/v2"
	"go-spatial/models"
)

// WebSocketHub manages WebSocket connections and message broadcasting
type WebSocketHub struct {
	// Registered clients
	clients map[*WebSocketClient]bool

	// Register requests from clients
	register chan *WebSocketClient

	// Unregister requests from clients
	unregister chan *WebSocketClient

	// Broadcast channel for messages
	broadcast chan []byte

	// Driver-specific channels
	driverChannels map[string]map[*WebSocketClient]bool

	// Mutex for thread-safe operations
	mutex sync.RWMutex

	// Performance metrics
	metrics *WebSocketMetrics
}

// WebSocketClient represents a WebSocket client connection
type WebSocketClient struct {
	// WebSocket connection
	conn *websocket.Conn

	// Driver ID associated with this connection
	driverID string

	// Send channel for outbound messages
	send chan []byte

	// Hub reference
	hub *WebSocketHub

	// Connection metadata
	connectedAt time.Time
	lastPing    time.Time
	isActive    bool
}

// WebSocketMetrics tracks WebSocket performance
type WebSocketMetrics struct {
	TotalConnections  int64     `json:"total_connections"`
	ActiveConnections int       `json:"active_connections"`
	MessagesReceived  int64     `json:"messages_received"`
	MessagesSent      int64     `json:"messages_sent"`
	DriversConnected  int       `json:"drivers_connected"`
	LastUpdated       time.Time `json:"last_updated"`
	AverageLatency    float64   `json:"average_latency_ms"`
	ConnectionErrors  int64     `json:"connection_errors"`
	mutex             sync.RWMutex
}

// NewWebSocketHub creates a new WebSocket hub
func NewWebSocketHub() *WebSocketHub {
	return &WebSocketHub{
		clients:        make(map[*WebSocketClient]bool),
		register:       make(chan *WebSocketClient),
		unregister:     make(chan *WebSocketClient),
		broadcast:      make(chan []byte),
		driverChannels: make(map[string]map[*WebSocketClient]bool),
		metrics: &WebSocketMetrics{
			LastUpdated: time.Now(),
		},
	}
}

// Run starts the WebSocket hub
func (h *WebSocketHub) Run() {
	// Start metrics update goroutine
	go h.updateMetrics()

	// Start cleanup goroutine
	go h.cleanupInactiveConnections()

	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)
		}
	}
}

// RegisterClient registers a new WebSocket client
func (h *WebSocketHub) RegisterClient(conn *websocket.Conn, driverID string) *WebSocketClient {
	client := &WebSocketClient{
		conn:        conn,
		driverID:    driverID,
		send:        make(chan []byte, 256),
		hub:         h,
		connectedAt: time.Now(),
		lastPing:    time.Now(),
		isActive:    true,
	}

	h.register <- client

	// Start client goroutines
	go client.writePump()
	go client.readPump()

	return client
}

// BroadcastToDriver sends a message to all connections for a specific driver
func (h *WebSocketHub) BroadcastToDriver(driverID string, message interface{}) error {
	msgBytes, err := json.Marshal(models.WebSocketMessage{
		Type:      "driver_message",
		DriverID:  driverID,
		Payload:   message,
		Timestamp: time.Now(),
	})
	if err != nil {
		return err
	}

	h.mutex.RLock()
	driverClients, exists := h.driverChannels[driverID]
	h.mutex.RUnlock()

	if !exists {
		return nil // No clients for this driver
	}

	for client := range driverClients {
		if client.isActive {
			select {
			case client.send <- msgBytes:
				h.metrics.incrementMessagesSent()
			default:
				// Client's send channel is full, close it
				h.unregister <- client
			}
		}
	}

	return nil
}

// BroadcastToAll sends a message to all connected clients
func (h *WebSocketHub) BroadcastToAll(message interface{}) error {
	msgBytes, err := json.Marshal(models.WebSocketMessage{
		Type:      "broadcast",
		Payload:   message,
		Timestamp: time.Now(),
	})
	if err != nil {
		return err
	}

	h.broadcast <- msgBytes
	return nil
}

// SendGeofenceAlert sends geofence alert to specific driver
func (h *WebSocketHub) SendGeofenceAlert(driverID string, alert models.GeofenceAlert) error {
	return h.BroadcastToDriver(driverID, map[string]interface{}{
		"type":    "geofence_alert",
		"alert":   alert,
		"message": "Geofence boundary crossed",
	})
}

// SendRouteUpdate sends route update to specific driver
func (h *WebSocketHub) SendRouteUpdate(driverID string, route models.OptimizedRoute) error {
	return h.BroadcastToDriver(driverID, map[string]interface{}{
		"type":    "route_update",
		"route":   route,
		"message": "Route has been updated",
	})
}

// SendTrafficAlert sends traffic alert to specific driver
func (h *WebSocketHub) SendTrafficAlert(driverID string, trafficData models.TrafficData) error {
	severity := "low"
	if trafficData.CongestionLevel > 0.8 {
		severity = "high"
	} else if trafficData.CongestionLevel > 0.5 {
		severity = "medium"
	}

	return h.BroadcastToDriver(driverID, map[string]interface{}{
		"type":     "traffic_alert",
		"traffic":  trafficData,
		"severity": severity,
		"message":  "Traffic conditions have changed",
	})
}

// SendPerformanceMetrics sends performance metrics to monitoring clients
func (h *WebSocketHub) SendPerformanceMetrics(metrics interface{}) error {
	return h.BroadcastToAll(map[string]interface{}{
		"type":      "performance_metrics",
		"metrics":   metrics,
		"timestamp": time.Now().Unix(),
	})
}

// GetMetrics returns current WebSocket metrics
func (h *WebSocketHub) GetMetrics() *WebSocketMetrics {
	h.metrics.mutex.RLock()
	defer h.metrics.mutex.RUnlock()

	// Create a copy to avoid race conditions without copying the mutex
	return &WebSocketMetrics{
		TotalConnections:  h.metrics.TotalConnections,
		ActiveConnections: h.metrics.ActiveConnections,
		MessagesReceived:  h.metrics.MessagesReceived,
		MessagesSent:      h.metrics.MessagesSent,
		DriversConnected:  h.metrics.DriversConnected,
		LastUpdated:       h.metrics.LastUpdated,
		AverageLatency:    h.metrics.AverageLatency,
		ConnectionErrors:  h.metrics.ConnectionErrors,
	}
}

// Private methods

func (h *WebSocketHub) registerClient(client *WebSocketClient) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	// Add to general clients map
	h.clients[client] = true

	// Add to driver-specific channels
	if h.driverChannels[client.driverID] == nil {
		h.driverChannels[client.driverID] = make(map[*WebSocketClient]bool)
	}
	h.driverChannels[client.driverID][client] = true

	// Update metrics
	h.metrics.incrementTotalConnections()
	h.metrics.updateActiveConnections(len(h.clients))

	log.Printf("WebSocket client registered for driver: %s (total: %d)",
		client.driverID, len(h.clients))

	// Send welcome message
	welcomeMsg, _ := json.Marshal(models.WebSocketMessage{
		Type:      "connection_established",
		DriverID:  client.driverID,
		Payload:   map[string]string{"status": "connected"},
		Timestamp: time.Now(),
	})

	select {
	case client.send <- welcomeMsg:
	default:
		// If can't send welcome message, close client
		close(client.send)
	}
}

func (h *WebSocketHub) unregisterClient(client *WebSocketClient) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	if _, ok := h.clients[client]; ok {
		// Remove from general clients map
		delete(h.clients, client)

		// Remove from driver-specific channels
		if driverClients, exists := h.driverChannels[client.driverID]; exists {
			delete(driverClients, client)
			if len(driverClients) == 0 {
				delete(h.driverChannels, client.driverID)
			}
		}

		// Close send channel
		close(client.send)

		// Mark as inactive
		client.isActive = false

		// Update metrics
		h.metrics.updateActiveConnections(len(h.clients))

		log.Printf("WebSocket client unregistered for driver: %s (total: %d)",
			client.driverID, len(h.clients))
	}
}

func (h *WebSocketHub) broadcastMessage(message []byte) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()

	for client := range h.clients {
		if client.isActive {
			select {
			case client.send <- message:
				h.metrics.incrementMessagesSent()
			default:
				// Client's send channel is full, unregister it
				delete(h.clients, client)
				close(client.send)
				client.isActive = false
			}
		}
	}
}

func (h *WebSocketHub) updateMetrics() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.metrics.mutex.Lock()
			h.metrics.LastUpdated = time.Now()
			h.metrics.ActiveConnections = len(h.clients)
			h.metrics.DriversConnected = len(h.driverChannels)
			h.metrics.mutex.Unlock()
		}
	}
}

func (h *WebSocketHub) cleanupInactiveConnections() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			h.mutex.RLock()
			clientsToRemove := make([]*WebSocketClient, 0)

			for client := range h.clients {
				// Remove clients that haven't pinged in the last 2 minutes
				if time.Since(client.lastPing) > 2*time.Minute {
					clientsToRemove = append(clientsToRemove, client)
				}
			}
			h.mutex.RUnlock()

			// Remove inactive clients
			for _, client := range clientsToRemove {
				h.unregister <- client
			}
		}
	}
}

// WebSocketClient methods

func (c *WebSocketClient) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *WebSocketClient) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.lastPing = time.Now()
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
				c.hub.metrics.incrementConnectionErrors()
			}
			break
		}

		c.hub.metrics.incrementMessagesReceived()
		c.lastPing = time.Now()

		// Handle incoming messages
		c.handleMessage(message)
	}
}

func (c *WebSocketClient) handleMessage(message []byte) {
	var wsMessage models.WebSocketMessage
	if err := json.Unmarshal(message, &wsMessage); err != nil {
		log.Printf("Failed to unmarshal WebSocket message: %v", err)
		return
	}

	// Handle different message types
	switch wsMessage.Type {
	case "ping":
		c.sendPong()
	case "subscribe":
		// Handle subscription to specific events
		log.Printf("Driver %s subscribed to events", c.driverID)
	case "location_update":
		// Handle location updates from client
		log.Printf("Received location update from driver %s", c.driverID)
	default:
		log.Printf("Unknown message type: %s", wsMessage.Type)
	}
}

func (c *WebSocketClient) sendPong() {
	pongMsg, _ := json.Marshal(models.WebSocketMessage{
		Type:      "pong",
		DriverID:  c.driverID,
		Timestamp: time.Now(),
	})

	select {
	case c.send <- pongMsg:
	default:
		// Channel full, client will be cleaned up
	}
}

// WebSocketMetrics methods

func (m *WebSocketMetrics) incrementTotalConnections() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.TotalConnections++
}

func (m *WebSocketMetrics) incrementMessagesReceived() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.MessagesReceived++
}

func (m *WebSocketMetrics) incrementMessagesSent() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.MessagesSent++
}

func (m *WebSocketMetrics) incrementConnectionErrors() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.ConnectionErrors++
}

func (m *WebSocketMetrics) updateActiveConnections(count int) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.ActiveConnections = count
}
