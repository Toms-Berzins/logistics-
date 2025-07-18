package middleware

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
)

// Performance middleware tracks response times and adds performance headers
func Performance() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Continue processing request
		err := c.Next()

		// Calculate response time
		duration := time.Since(start)

		// Add performance headers
		c.Set("X-Response-Time", fmt.Sprintf("%.2fms", float64(duration.Nanoseconds())/1e6))
		c.Set("X-Processed-At", start.Format(time.RFC3339))

		// Log slow queries (> 200ms)
		if duration > 200*time.Millisecond {
			fmt.Printf("SLOW QUERY: %s %s took %.2fms\n",
				c.Method(), c.Path(), float64(duration.Nanoseconds())/1e6)
		}

		return err
	}
}

// RateLimit middleware implements rate limiting
func RateLimit() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        100,             // 100 requests
		Expiration: 1 * time.Minute, // per minute
		KeyGenerator: func(c *fiber.Ctx) string {
			// Use IP + driver ID for rate limiting
			driverID := c.Get("X-Driver-ID", "unknown")
			ip := c.IP()
			return fmt.Sprintf("%s:%s", ip, driverID)
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       true,
				"message":     "Rate limit exceeded. Please try again later.",
				"retry_after": 60,
			})
		},
		SkipFailedRequests:     false,
		SkipSuccessfulRequests: false,
	})
}

// Authentication middleware validates JWT tokens and driver authorization
func Authentication() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip authentication for health checks and public endpoints
		if strings.HasPrefix(c.Path(), "/health") ||
			strings.HasPrefix(c.Path(), "/metrics") {
			return c.Next()
		}

		// Extract JWT token from Authorization header
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   true,
				"message": "Authorization header required",
			})
		}

		// Validate Bearer token format
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   true,
				"message": "Invalid authorization format. Use 'Bearer <token>'",
			})
		}

		token := tokenParts[1]

		// For demo purposes, we'll do basic validation
		// In production, you'd validate the JWT signature and claims
		if token == "" || len(token) < 10 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error":   true,
				"message": "Invalid token",
			})
		}

		// Extract driver ID from header or token claims
		driverID := c.Get("X-Driver-ID")
		if driverID == "" {
			// In production, extract from JWT claims
			driverID = "demo-driver-id"
		}

		// Store driver information in context
		c.Locals("driver_id", driverID)
		c.Locals("authenticated", true)

		return c.Next()
	}
}

// CORS middleware for handling cross-origin requests
func CORS(allowedOrigins string) fiber.Handler {
	origins := strings.Split(allowedOrigins, ",")

	return func(c *fiber.Ctx) error {
		origin := c.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range origins {
			if strings.TrimSpace(allowedOrigin) == origin || strings.TrimSpace(allowedOrigin) == "*" {
				allowed = true
				break
			}
		}

		if allowed {
			c.Set("Access-Control-Allow-Origin", origin)
		}

		c.Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Origin,Content-Type,Accept,Authorization,X-Driver-ID")
		c.Set("Access-Control-Allow-Credentials", "true")
		c.Set("Access-Control-Max-Age", "86400") // 24 hours

		// Handle preflight requests
		if c.Method() == "OPTIONS" {
			return c.SendStatus(fiber.StatusNoContent)
		}

		return c.Next()
	}
}

// RequestLogging middleware logs all requests with detailed information
func RequestLogging() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Extract request details
		ip := c.IP()
		method := c.Method()
		path := c.Path()
		userAgent := c.Get("User-Agent")
		driverID := c.Get("X-Driver-ID", "unknown")

		// Process request
		err := c.Next()

		// Calculate metrics
		duration := time.Since(start)
		status := c.Response().StatusCode()

		// Create log entry
		logEntry := map[string]interface{}{
			"timestamp":   start.Format(time.RFC3339),
			"ip":          ip,
			"method":      method,
			"path":        path,
			"status":      status,
			"duration_ms": float64(duration.Nanoseconds()) / 1e6,
			"driver_id":   driverID,
			"user_agent":  userAgent,
		}

		// Add error information if present
		if err != nil {
			logEntry["error"] = err.Error()
		}

		// Log as JSON for structured logging
		logJSON, _ := json.Marshal(logEntry)
		fmt.Println(string(logJSON))

		return err
	}
}

// SecurityHeaders adds security-related headers
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Security headers
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Content-Security-Policy", "default-src 'self'")

		// API-specific headers
		c.Set("X-API-Version", "v1")
		c.Set("X-Service", "go-spatial")

		return c.Next()
	}
}

// RequestID middleware adds unique request ID to each request
func RequestID() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		c.Set("X-Request-ID", requestID)
		c.Locals("request_id", requestID)

		return c.Next()
	}
}

// ValidationMiddleware validates common request parameters
func ValidationMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Validate content type for POST/PUT requests
		if c.Method() == "POST" || c.Method() == "PUT" {
			contentType := c.Get("Content-Type")
			if !strings.Contains(contentType, "application/json") {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error":   true,
					"message": "Content-Type must be application/json",
				})
			}
		}

		// Validate driver ID header for spatial operations
		if strings.Contains(c.Path(), "/spatial") || strings.Contains(c.Path(), "/route") {
			driverID := c.Get("X-Driver-ID")
			if driverID == "" {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error":   true,
					"message": "X-Driver-ID header required for spatial operations",
				})
			}
		}

		return c.Next()
	}
}

// Helper functions

func generateRequestID() string {
	// Simple request ID generation
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// GetDriverID extracts driver ID from request context
func GetDriverID(c *fiber.Ctx) string {
	if driverID, ok := c.Locals("driver_id").(string); ok {
		return driverID
	}
	return c.Get("X-Driver-ID", "unknown")
}

// GetRequestID extracts request ID from request context
func GetRequestID(c *fiber.Ctx) string {
	if requestID, ok := c.Locals("request_id").(string); ok {
		return requestID
	}
	return c.Get("X-Request-ID", "unknown")
}

// IsAuthenticated checks if request is authenticated
func IsAuthenticated(c *fiber.Ctx) bool {
	if authenticated, ok := c.Locals("authenticated").(bool); ok {
		return authenticated
	}
	return false
}
