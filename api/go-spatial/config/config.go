package config

import (
	"os"
	"strconv"
	"strings"
)

// Config holds application configuration
type Config struct {
	Port               string
	DatabaseURL        string
	RedisURL           string
	JWTSecret          string
	CORSOrigins        string
	LogLevel           string
	Version            string
	PerformanceTargets PerformanceTargets
	CacheTTL           int
}

// PerformanceTargets holds performance target configurations
type PerformanceTargets struct {
	SpatialQueriesMs   int
	RouteCalculationMs int
}

// Load loads configuration from environment variables
func Load() *Config {
	cfg := &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://logistics_user:logistics_password@localhost:5432/logistics_spatial?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   getEnv("JWT_SECRET", "your-jwt-secret-key-here"),
		CORSOrigins: getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001"),
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		Version:     getEnv("VERSION", "1.0.0"),
		CacheTTL:    getEnvInt("CACHE_TTL", 300),
		PerformanceTargets: PerformanceTargets{
			SpatialQueriesMs:   getEnvInt("PERFORMANCE_TARGET_SPATIAL", 50),
			RouteCalculationMs: getEnvInt("PERFORMANCE_TARGET_ROUTE", 200),
		},
	}

	return cfg
}

// GetDatabaseConfig returns database configuration parameters
func (c *Config) GetDatabaseConfig() map[string]interface{} {
	return map[string]interface{}{
		"max_open_conns":     getEnvInt("DB_MAX_OPEN_CONNS", 25),
		"max_idle_conns":     getEnvInt("DB_MAX_IDLE_CONNS", 5),
		"conn_max_lifetime":  getEnvInt("DB_CONN_MAX_LIFETIME", 300), // seconds
		"conn_max_idle_time": getEnvInt("DB_CONN_MAX_IDLE_TIME", 60), // seconds
	}
}

// IsDevelopment returns true if running in development mode
func (c *Config) IsDevelopment() bool {
	return strings.ToLower(getEnv("ENVIRONMENT", "development")) == "development"
}

// IsProduction returns true if running in production mode
func (c *Config) IsProduction() bool {
	return strings.ToLower(getEnv("ENVIRONMENT", "development")) == "production"
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
