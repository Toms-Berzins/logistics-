package models

import "time"

// Location represents a geographic location with metadata
type Location struct {
	Latitude     float64  `json:"latitude"`
	Longitude    float64  `json:"longitude"`
	Altitude     *float64 `json:"altitude,omitempty"`
	Accuracy     float64  `json:"accuracy"`
	Heading      *float64 `json:"heading,omitempty"`
	Speed        *float64 `json:"speed,omitempty"`
	Timestamp    int64    `json:"timestamp"`
	Address      *string  `json:"address,omitempty"`
	CustomerName *string  `json:"customer_name,omitempty"`
	Distance     *float64 `json:"distance,omitempty"`
}

// SpatialAnalysisRequest represents a request for spatial analysis
type SpatialAnalysisRequest struct {
	DriverID     string                 `json:"driver_id"`
	Location     Location               `json:"location"`
	AnalysisType string                 `json:"analysis_type"` // geofence_check, route_deviation, delivery_zone, traffic_analysis
	Parameters   map[string]interface{} `json:"parameters,omitempty"`
}

// SpatialAnalysisResult represents the result of spatial analysis
type SpatialAnalysisResult struct {
	WithinGeofence   bool       `json:"within_geofence"`
	GeofenceID       *string    `json:"geofence_id,omitempty"`
	GeofenceName     *string    `json:"geofence_name,omitempty"`
	DistanceToRoute  *float64   `json:"distance_to_route,omitempty"`
	EstimatedDelay   *int       `json:"estimated_delay,omitempty"`
	NearbyDeliveries []Location `json:"nearby_deliveries"`
	TrafficLevel     *string    `json:"traffic_level,omitempty"`
	SpatialQueries   int        `json:"spatial_queries"`
	CalculationTime  int64      `json:"calculation_time"`
}

// SpatialAnalysisResponse represents the response from spatial analysis
type SpatialAnalysisResponse struct {
	Result      SpatialAnalysisResult `json:"result"`
	Performance PerformanceMetrics    `json:"performance"`
}

// BatchSpatialAnalysisRequest represents a batch analysis request
type BatchSpatialAnalysisRequest struct {
	DriverID     string                 `json:"driver_id"`
	Locations    []Location             `json:"locations"`
	AnalysisType string                 `json:"analysis_type"`
	Parameters   map[string]interface{} `json:"parameters,omitempty"`
}

// BatchSpatialAnalysisResponse represents the response from batch analysis
type BatchSpatialAnalysisResponse struct {
	Results     []SpatialAnalysisResult `json:"results"`
	Performance PerformanceMetrics      `json:"performance"`
}

// PerformanceMetrics represents performance metrics for spatial operations
type PerformanceMetrics struct {
	QueryTime        int64 `json:"query_time"`
	SpatialIndexUsed bool  `json:"spatial_index_used"`
	CalculationTime  int64 `json:"calculation_time"`
	SpatialQueries   int   `json:"spatial_queries"`
	BatchSize        int   `json:"batch_size,omitempty"`
}

// DistanceRequest represents a distance calculation request
type DistanceRequest struct {
	Origin      Location `json:"origin"`
	Destination Location `json:"destination"`
	Method      string   `json:"method"` // euclidean, spherical, driving
}

// DistanceResult represents the result of distance calculation
type DistanceResult struct {
	Distance float64 `json:"distance"`
	Method   string  `json:"method"`
	Unit     string  `json:"unit"`
}

// DistanceResponse represents the response from distance calculation
type DistanceResponse struct {
	Distance    *DistanceResult    `json:"distance"`
	Method      string             `json:"method"`
	Performance PerformanceMetrics `json:"performance"`
}

// IntersectionRequest represents a geometry intersection request
type IntersectionRequest struct {
	Geometry1 interface{} `json:"geometry1"`
	Geometry2 interface{} `json:"geometry2"`
}

// IntersectionResponse represents the response from intersection check
type IntersectionResponse struct {
	Intersects  bool               `json:"intersects"`
	Performance PerformanceMetrics `json:"performance"`
}

// Geofence represents a geographic boundary
type Geofence struct {
	ID             string                 `json:"id"`
	Name           string                 `json:"name"`
	Geometry       interface{}            `json:"geometry"`
	Properties     map[string]interface{} `json:"properties"`
	DriverID       *string                `json:"driver_id,omitempty"`
	BufferDistance float64                `json:"buffer_distance"`
	Active         bool                   `json:"active"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
}

// GeofenceAlert represents a geofence alert
type GeofenceAlert struct {
	GeofenceID string    `json:"geofence_id"`
	DriverID   string    `json:"driver_id"`
	AlertType  string    `json:"alert_type"` // entry, exit
	Location   Location  `json:"location"`
	Timestamp  time.Time `json:"timestamp"`
}

// RouteOptimizationRequest represents a route optimization request
type RouteOptimizationRequest struct {
	Origin       Location         `json:"origin"`
	Destinations []Location       `json:"destinations"`
	Vehicle      Vehicle          `json:"vehicle"`
	Preferences  RoutePreferences `json:"preferences"`
}

// Vehicle represents vehicle specifications
type Vehicle struct {
	Type         string   `json:"type"` // van, truck, motorcycle
	Capacity     int      `json:"capacity"`
	Restrictions []string `json:"restrictions,omitempty"`
}

// RoutePreferences represents route optimization preferences
type RoutePreferences struct {
	OptimizeFor   string `json:"optimize_for"` // time, distance, fuel
	AvoidTolls    bool   `json:"avoid_tolls"`
	AvoidHighways bool   `json:"avoid_highways"`
}

// OptimizedRoute represents an optimized route
type OptimizedRoute struct {
	Waypoints     []Location `json:"waypoints"`
	TotalDistance float64    `json:"total_distance"`
	TotalDuration int        `json:"total_duration"`
	EstimatedFuel float64    `json:"estimated_fuel"`
}

// RouteOptimizationResponse represents the response from route optimization
type RouteOptimizationResponse struct {
	OptimizedRoute OptimizedRoute     `json:"optimized_route"`
	Performance    PerformanceMetrics `json:"performance"`
}

// PointOfInterest represents a point of interest
type PointOfInterest struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Type      string  `json:"type"`
	Address   string  `json:"address"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Distance  float64 `json:"distance"`
}

// TrafficData represents traffic information
type TrafficData struct {
	Location        Location  `json:"location"`
	CongestionLevel float64   `json:"congestion_level"` // 0.0 to 1.0
	AverageSpeed    float64   `json:"average_speed"`    // km/h
	Timestamp       time.Time `json:"timestamp"`
}

// DeliveryLocation represents a delivery destination
type DeliveryLocation struct {
	ID           string     `json:"id"`
	CustomerName string     `json:"customer_name"`
	Address      string     `json:"address"`
	Location     Location   `json:"location"`
	DeliveryTime *time.Time `json:"delivery_time,omitempty"`
	Status       string     `json:"status"` // pending, completed, failed
	Active       bool       `json:"active"`
}

// WebSocketMessage represents a WebSocket message
type WebSocketMessage struct {
	Type      string      `json:"type"`
	DriverID  string      `json:"driver_id,omitempty"`
	Payload   interface{} `json:"payload"`
	Timestamp time.Time   `json:"timestamp"`
}

// SpatialIndex represents spatial index information
type SpatialIndex struct {
	TableName   string  `json:"table_name"`
	ColumnName  string  `json:"column_name"`
	IndexType   string  `json:"index_type"`
	IsValid     bool    `json:"is_valid"`
	Performance float64 `json:"performance_score"`
}

// DatabaseHealth represents database health status
type DatabaseHealth struct {
	Connected      bool           `json:"connected"`
	ResponseTime   int64          `json:"response_time"`
	SpatialIndexes []SpatialIndex `json:"spatial_indexes"`
	ActiveQueries  int            `json:"active_queries"`
	ConnectionPool ConnectionPool `json:"connection_pool"`
}

// ConnectionPool represents database connection pool status
type ConnectionPool struct {
	MaxConnections    int `json:"max_connections"`
	ActiveConnections int `json:"active_connections"`
	IdleConnections   int `json:"idle_connections"`
}

// RouteValidationResult represents route validation result
type RouteValidationResult struct {
	IsValid bool     `json:"is_valid"`
	Issues  []string `json:"issues"`
}
