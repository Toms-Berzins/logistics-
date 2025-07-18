package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
	"github.com/joho/godotenv"

	"go-spatial/config"
	"go-spatial/database"
	"go-spatial/handlers"
	"go-spatial/middleware"
	"go-spatial/services"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize configuration
	cfg := config.Load()

	// Initialize database connection with PostGIS
	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Run database migrations
	if err := database.Migrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize services
	spatialService := services.NewSpatialService(db)
	geofenceService := services.NewGeofenceService(db)
	routeService := services.NewRouteService(db)
	wsHub := services.NewWebSocketHub()

	// Initialize Fiber app with optimized settings
	app := fiber.New(fiber.Config{
		AppName:           "LogiTrack Go Spatial Service",
		EnablePrintRoutes: false,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       30 * time.Second,
		BodyLimit:         4 * 1024 * 1024, // 4MB
		JSONEncoder:       json.Marshal,
		JSONDecoder:       json.Unmarshal,
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}

			return c.Status(code).JSON(fiber.Map{
				"error":     true,
				"message":   err.Error(),
				"timestamp": time.Now().Unix(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} - ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Driver-ID",
		AllowCredentials: true,
	}))

	// Custom middleware
	app.Use(middleware.Performance())
	app.Use(middleware.RateLimit())

	// Health check endpoint
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "healthy",
			"service":   "go-spatial",
			"version":   cfg.Version,
			"timestamp": time.Now().Unix(),
			"database":  "connected",
			"performance": fiber.Map{
				"target_query_time": "50ms",
				"target_route_time": "200ms",
			},
		})
	})

	// Initialize handlers
	spatialHandler := handlers.NewSpatialHandler(spatialService, geofenceService)
	routeHandler := handlers.NewRouteHandler(routeService, spatialService)
	geofenceHandler := handlers.NewGeofenceHandler(geofenceService, spatialService)
	wsHandler := handlers.NewWebSocketHandler(wsHub, spatialService)

	// API routes with versioning
	v1 := app.Group("/api/v1")

	// Authentication middleware for protected routes
	v1.Use(middleware.Authentication())

	// Spatial analysis endpoints
	spatial := v1.Group("/spatial")
	spatial.Post("/analyze", spatialHandler.AnalyzeLocation)
	spatial.Post("/batch-analyze", spatialHandler.BatchAnalyze)
	spatial.Get("/nearby", spatialHandler.FindNearby)
	spatial.Post("/distance", spatialHandler.CalculateDistance)
	spatial.Post("/intersects", spatialHandler.CheckIntersection)

	// Route optimization endpoints
	routes := v1.Group("/route")
	routes.Post("/optimize", routeHandler.OptimizeRoute)
	routes.Post("/calculate", routeHandler.CalculateRoute)
	routes.Post("/validate", routeHandler.ValidateRoute)
	routes.Get("/traffic/:routeId", routeHandler.GetTrafficData)

	// Geofence management endpoints
	geofences := v1.Group("/geofences")
	geofences.Get("/", geofenceHandler.ListGeofences)
	geofences.Post("/", geofenceHandler.CreateGeofence)
	geofences.Get("/:id", geofenceHandler.GetGeofence)
	geofences.Put("/:id", geofenceHandler.UpdateGeofence)
	geofences.Delete("/:id", geofenceHandler.DeleteGeofence)
	geofences.Post("/check", geofenceHandler.CheckGeofenceEntry)

	// Performance monitoring endpoints
	performance := v1.Group("/performance")
	performance.Get("/metrics", spatialHandler.GetMetrics)
	performance.Get("/health", spatialHandler.HealthCheck)

	// WebSocket endpoint for real-time updates
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	app.Get("/ws/spatial", websocket.New(wsHandler.HandleConnection))

	// Start WebSocket hub
	go wsHub.Run()

	// Start performance monitoring
	go startPerformanceMonitoring(spatialService)

	// Graceful shutdown
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	go func() {
		if err := app.Listen(fmt.Sprintf(":%s", cfg.Port)); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	fmt.Printf("🚀 Go Spatial Service started on port %s\n", cfg.Port)
	fmt.Printf("📊 Health check: http://localhost:%s/health\n", cfg.Port)
	fmt.Printf("🔌 WebSocket: ws://localhost:%s/ws/spatial\n", cfg.Port)

	<-c
	fmt.Println("\n🛑 Shutting down Go Spatial Service...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	fmt.Println("✅ Go Spatial Service shutdown complete")
}

func startPerformanceMonitoring(spatialService *services.SpatialService) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			metrics := spatialService.GetPerformanceMetrics()
			log.Printf("Performance Metrics - Queries: %d, Avg Response: %.2fms, Cache Hit Rate: %.2f%%",
				metrics.TotalQueries,
				metrics.AverageResponseTime,
				metrics.CacheHitRate,
			)
		}
	}
}
