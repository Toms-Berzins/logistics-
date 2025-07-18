package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/suite"

	"go-spatial/database"
	"go-spatial/handlers"
	"go-spatial/models"
	"go-spatial/services"
)

type SpatialTestSuite struct {
	suite.Suite
	app             *fiber.App
	db              *sql.DB
	spatialService  *services.SpatialService
	geofenceService *services.GeofenceService
	routeService    *services.RouteService
}

func (suite *SpatialTestSuite) SetupSuite() {
	// Setup test database
	testDBURL := os.Getenv("TEST_DATABASE_URL")
	if testDBURL == "" {
		testDBURL = "postgres://postgres:password@localhost:5432/logistics_test?sslmode=disable"
	}

	var err error
	suite.db, err = database.Initialize(testDBURL)
	suite.Require().NoError(err)

	// Run migrations
	err = database.CreateTables(suite.db)
	suite.Require().NoError(err)

	// Initialize services
	suite.spatialService = services.NewSpatialService(suite.db)
	suite.geofenceService = services.NewGeofenceService(suite.db)
	suite.routeService = services.NewRouteService(suite.db)

	// Setup Fiber app
	suite.app = fiber.New()

	// Initialize handlers
	spatialHandler := handlers.NewSpatialHandler(suite.spatialService, suite.geofenceService)
	routeHandler := handlers.NewRouteHandler(suite.routeService, suite.spatialService)
	geofenceHandler := handlers.NewGeofenceHandler(suite.geofenceService, suite.spatialService)

	// Setup routes
	v1 := suite.app.Group("/api/v1")

	spatial := v1.Group("/spatial")
	spatial.Post("/analyze", spatialHandler.AnalyzeLocation)
	spatial.Post("/batch-analyze", spatialHandler.BatchAnalyze)
	spatial.Get("/nearby", spatialHandler.FindNearby)
	spatial.Post("/distance", spatialHandler.CalculateDistance)

	routes := v1.Group("/route")
	routes.Post("/optimize", routeHandler.OptimizeRoute)
	routes.Post("/calculate", routeHandler.CalculateRoute)

	geofences := v1.Group("/geofences")
	geofences.Get("/", geofenceHandler.ListGeofences)
	geofences.Post("/", geofenceHandler.CreateGeofence)
	geofences.Post("/check", geofenceHandler.CheckGeofenceEntry)

	performance := v1.Group("/performance")
	performance.Get("/metrics", spatialHandler.GetMetrics)
	performance.Get("/health", spatialHandler.HealthCheck)
}

func (suite *SpatialTestSuite) TearDownSuite() {
	if suite.db != nil {
		suite.db.Close()
	}
}

func (suite *SpatialTestSuite) SetupTest() {
	// Clean up data before each test
	suite.cleanupTestData()

	// Insert test data
	suite.insertTestData()
}

func (suite *SpatialTestSuite) cleanupTestData() {
	tables := []string{"traffic_data", "points_of_interest", "delivery_locations", "geofences"}
	for _, table := range tables {
		_, err := suite.db.Exec(fmt.Sprintf("DELETE FROM %s", table))
		suite.Require().NoError(err)
	}
}

func (suite *SpatialTestSuite) insertTestData() {
	// Insert test geofences
	_, err := suite.db.Exec(`
		INSERT INTO geofences (id, name, geometry, buffer_distance, active) VALUES
		('test-geofence-1', 'Test Downtown Zone', 
		 ST_GeomFromText('POLYGON((-74.0170 40.7040, -74.0100 40.7040, -74.0100 40.7120, -74.0170 40.7120, -74.0170 40.7040))', 4326),
		 50, true),
		('test-geofence-2', 'Test Warehouse Zone',
		 ST_GeomFromText('POLYGON((-74.0060 40.7580, -74.0020 40.7580, -74.0020 40.7620, -74.0060 40.7620, -74.0060 40.7580))', 4326),
		 25, true)
	`)
	suite.Require().NoError(err)

	// Insert test delivery locations
	_, err = suite.db.Exec(`
		INSERT INTO delivery_locations (customer_name, address, location, status, active) VALUES
		('Test Customer 1', '123 Test St', ST_Point(-74.0059, 40.7128), 'pending', true),
		('Test Customer 2', '456 Test Ave', ST_Point(-74.0044, 40.7589), 'pending', true)
	`)
	suite.Require().NoError(err)

	// Insert test POIs
	_, err = suite.db.Exec(`
		INSERT INTO points_of_interest (name, type, address, location, active) VALUES
		('Test Gas Station', 'fuel', '100 Test St', ST_Point(-74.0147, 40.7093), true),
		('Test Park', 'park', 'Test Park Ave', ST_Point(-73.9654, 40.7829), true)
	`)
	suite.Require().NoError(err)
}

func (suite *SpatialTestSuite) TestHealthCheck() {
	req := httptest.NewRequest("GET", "/api/v1/performance/health", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 10000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusOK, resp.StatusCode)

	var health map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&health)
	suite.Require().NoError(err)

	suite.Equal("healthy", health["status"])
	suite.Contains(health, "checks")
}

func (suite *SpatialTestSuite) TestSpatialAnalysisGeofenceCheck() {
	request := models.SpatialAnalysisRequest{
		DriverID: "test-driver",
		Location: models.Location{
			Latitude:  40.7080,
			Longitude: -74.0135,
			Accuracy:  10,
			Timestamp: time.Now().Unix(),
		},
		AnalysisType: "geofence_check",
	}

	body, err := json.Marshal(request)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/spatial/analyze", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 10000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusOK, resp.StatusCode)

	var response models.SpatialAnalysisResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	suite.Require().NoError(err)

	// Should be within the downtown geofence
	suite.True(response.Result.WithinGeofence)
	suite.NotNil(response.Result.GeofenceID)
	suite.True(response.Performance.QueryTime < 100) // Should be under 100ms
}

func (suite *SpatialTestSuite) TestSpatialAnalysisPerformance() {
	// Test that spatial queries meet performance targets
	request := models.SpatialAnalysisRequest{
		DriverID: "test-driver",
		Location: models.Location{
			Latitude:  40.7128,
			Longitude: -74.0060,
			Accuracy:  10,
			Timestamp: time.Now().Unix(),
		},
		AnalysisType: "geofence_check",
	}

	body, err := json.Marshal(request)
	suite.Require().NoError(err)

	// Run multiple requests to test performance
	start := time.Now()
	for i := 0; i < 10; i++ {
		req := httptest.NewRequest("POST", "/api/v1/spatial/analyze", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer test-token")
		req.Header.Set("X-Driver-ID", "test-driver")

		resp, err := suite.app.Test(req, 5000)
		suite.Require().NoError(err)
		suite.Equal(http.StatusOK, resp.StatusCode)
	}
	totalTime := time.Since(start)

	// 10 requests should complete in under 500ms total
	suite.True(totalTime < 500*time.Millisecond,
		fmt.Sprintf("10 spatial queries took %v, expected under 500ms", totalTime))
}

func (suite *SpatialTestSuite) TestBatchSpatialAnalysis() {
	locations := make([]models.Location, 5)
	for i := 0; i < 5; i++ {
		locations[i] = models.Location{
			Latitude:  40.7128 + float64(i)*0.001,
			Longitude: -74.0060 + float64(i)*0.001,
			Accuracy:  10,
			Timestamp: time.Now().Unix(),
		}
	}

	request := models.BatchSpatialAnalysisRequest{
		DriverID:     "test-driver",
		Locations:    locations,
		AnalysisType: "geofence_check",
	}

	body, err := json.Marshal(request)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/spatial/batch-analyze", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 10000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusOK, resp.StatusCode)

	var response models.BatchSpatialAnalysisResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	suite.Require().NoError(err)

	suite.Len(response.Results, 5)
	suite.True(response.Performance.QueryTime < 200) // Batch should be under 200ms
}

func (suite *SpatialTestSuite) TestRouteOptimization() {
	request := models.RouteOptimizationRequest{
		Origin: models.Location{
			Latitude:  40.7128,
			Longitude: -74.0060,
			Timestamp: time.Now().Unix(),
		},
		Destinations: []models.Location{
			{
				Latitude:  40.7589,
				Longitude: -73.9851,
				Timestamp: time.Now().Unix(),
			},
			{
				Latitude:  40.7505,
				Longitude: -73.9707,
				Timestamp: time.Now().Unix(),
			},
		},
		Vehicle: models.Vehicle{
			Type:     "van",
			Capacity: 1000,
		},
		Preferences: models.RoutePreferences{
			OptimizeFor:   "time",
			AvoidTolls:    false,
			AvoidHighways: false,
		},
	}

	body, err := json.Marshal(request)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/route/optimize", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 15000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusOK, resp.StatusCode)

	var response map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	suite.Require().NoError(err)

	optimizedRoute := response["optimized_route"].(map[string]interface{})
	suite.Contains(optimizedRoute, "waypoints")
	suite.Contains(optimizedRoute, "total_distance")
	suite.Contains(optimizedRoute, "total_duration")

	performance := response["performance"].(map[string]interface{})
	suite.True(performance["calculation_time"].(float64) < 500) // Should be under 500ms
}

func (suite *SpatialTestSuite) TestFindNearbyPOIs() {
	req := httptest.NewRequest("GET", "/api/v1/spatial/nearby?lat=40.7128&lng=-74.0060&radius=2000&type=all&limit=10", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 10000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusOK, resp.StatusCode)

	var response map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	suite.Require().NoError(err)

	suite.Contains(response, "nearby_pois")
	suite.Contains(response, "performance")

	performance := response["performance"].(map[string]interface{})
	suite.True(performance["query_time"].(float64) < 100) // Should be under 100ms
}

func (suite *SpatialTestSuite) TestGeofenceCreation() {
	geofence := models.Geofence{
		ID:   "test-new-geofence",
		Name: "Test New Geofence",
		Geometry: map[string]interface{}{
			"type": "Polygon",
			"coordinates": []interface{}{
				[]interface{}{
					[]interface{}{-74.0200, 40.7000},
					[]interface{}{-74.0150, 40.7000},
					[]interface{}{-74.0150, 40.7050},
					[]interface{}{-74.0200, 40.7050},
					[]interface{}{-74.0200, 40.7000},
				},
			},
		},
		Properties:     map[string]interface{}{"test": true},
		BufferDistance: 30,
		Active:         true,
	}

	body, err := json.Marshal(geofence)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/geofences", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 10000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusCreated, resp.StatusCode)

	var response map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	suite.Require().NoError(err)

	suite.True(response["success"].(bool))
	suite.Contains(response, "geofence")
}

func (suite *SpatialTestSuite) TestGeofenceCheck() {
	request := map[string]interface{}{
		"driver_id": "test-driver",
		"location": map[string]interface{}{
			"latitude":  40.7080,
			"longitude": -74.0135,
			"accuracy":  10,
			"timestamp": time.Now().Unix(),
		},
	}

	body, err := json.Marshal(request)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/geofences/check", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 10000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusOK, resp.StatusCode)

	var response map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	suite.Require().NoError(err)

	suite.Contains(response, "alerts")
	suite.Contains(response, "performance")

	performance := response["performance"].(map[string]interface{})
	suite.True(performance["check_time"].(float64) < 100) // Should be under 100ms
}

func (suite *SpatialTestSuite) TestDistanceCalculation() {
	request := models.DistanceRequest{
		Origin: models.Location{
			Latitude:  40.7128,
			Longitude: -74.0060,
		},
		Destination: models.Location{
			Latitude:  40.7589,
			Longitude: -73.9851,
		},
		Method: "spherical",
	}

	body, err := json.Marshal(request)
	suite.Require().NoError(err)

	req := httptest.NewRequest("POST", "/api/v1/spatial/distance", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 10000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusOK, resp.StatusCode)

	var response models.DistanceResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	suite.Require().NoError(err)

	suite.NotNil(response.Distance)
	suite.True(response.Distance.Distance > 0)
	suite.Equal("spherical", response.Distance.Method)
	suite.True(response.Performance.QueryTime < 50) // Should be under 50ms
}

func (suite *SpatialTestSuite) TestPerformanceMetrics() {
	req := httptest.NewRequest("GET", "/api/v1/performance/metrics", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	req.Header.Set("X-Driver-ID", "test-driver")

	resp, err := suite.app.Test(req, 10000)
	suite.Require().NoError(err)
	suite.Equal(http.StatusOK, resp.StatusCode)

	var response map[string]interface{}
	err = json.NewDecoder(resp.Body).Decode(&response)
	suite.Require().NoError(err)

	suite.Contains(response, "spatial_service_metrics")
	suite.Contains(response, "performance_targets")

	targets := response["performance_targets"].(map[string]interface{})
	suite.Equal("50ms", targets["spatial_queries"])
	suite.Equal("200ms", targets["route_calculations"])
}

func TestSpatialTestSuite(t *testing.T) {
	suite.Run(t, new(SpatialTestSuite))
}

// Benchmark tests for performance validation
func BenchmarkSpatialAnalysis(b *testing.B) {
	// Setup similar to test suite
	testDBURL := os.Getenv("TEST_DATABASE_URL")
	if testDBURL == "" {
		testDBURL = "postgres://postgres:password@localhost:5432/logistics_test?sslmode=disable"
	}

	db, err := database.Initialize(testDBURL)
	if err != nil {
		b.Fatal(err)
	}
	defer db.Close()

	spatialService := services.NewSpatialService(db)

	location := models.Location{
		Latitude:  40.7128,
		Longitude: -74.0060,
		Accuracy:  10,
		Timestamp: time.Now().Unix(),
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := spatialService.CheckGeofences("bench-driver", location)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkRouteOptimization(b *testing.B) {
	testDBURL := os.Getenv("TEST_DATABASE_URL")
	if testDBURL == "" {
		testDBURL = "postgres://postgres:password@localhost:5432/logistics_test?sslmode=disable"
	}

	db, err := database.Initialize(testDBURL)
	if err != nil {
		b.Fatal(err)
	}
	defer db.Close()

	routeService := services.NewRouteService(db)

	request := models.RouteOptimizationRequest{
		Origin: models.Location{
			Latitude:  40.7128,
			Longitude: -74.0060,
		},
		Destinations: []models.Location{
			{Latitude: 40.7589, Longitude: -73.9851},
			{Latitude: 40.7505, Longitude: -73.9707},
			{Latitude: 40.7829, Longitude: -73.9654},
		},
		Vehicle: models.Vehicle{
			Type:     "van",
			Capacity: 1000,
		},
		Preferences: models.RoutePreferences{
			OptimizeFor: "time",
		},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := routeService.OptimizeRoute(request)
		if err != nil {
			b.Fatal(err)
		}
	}
}
