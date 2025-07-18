package database

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

// Initialize creates and configures database connection with PostGIS extensions
func Initialize(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(time.Minute)

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Enable PostGIS extensions
	if err := enablePostGISExtensions(db); err != nil {
		return nil, fmt.Errorf("failed to enable PostGIS extensions: %w", err)
	}

	return db, nil
}

// enablePostGISExtensions enables required PostGIS extensions
func enablePostGISExtensions(db *sql.DB) error {
	extensions := []string{
		"CREATE EXTENSION IF NOT EXISTS postgis;",
		"CREATE EXTENSION IF NOT EXISTS postgis_topology;",
		"CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;",
		"CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;",
	}

	for _, ext := range extensions {
		if _, err := db.Exec(ext); err != nil {
			return fmt.Errorf("failed to create extension: %w", err)
		}
	}

	return nil
}

// Migrate runs database migrations
func Migrate(db *sql.DB) error {
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		"file://migrations",
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migration instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// CreateTables creates the required tables with spatial indexes
func CreateTables(db *sql.DB) error {
	tables := []string{
		createGeofencesTable(),
		createDeliveryLocationsTable(),
		createPointsOfInterestTable(),
		createTrafficDataTable(),
		createSpatialIndexes(),
	}

	for _, table := range tables {
		if _, err := db.Exec(table); err != nil {
			return fmt.Errorf("failed to create table: %w", err)
		}
	}

	return nil
}

func createGeofencesTable() string {
	return `
	CREATE TABLE IF NOT EXISTS geofences (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name VARCHAR(255) NOT NULL,
		geometry GEOMETRY(POLYGON, 4326) NOT NULL,
		properties JSONB DEFAULT '{}',
		driver_id VARCHAR(255),
		buffer_distance FLOAT DEFAULT 0,
		active BOOLEAN DEFAULT true,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);`
}

func createDeliveryLocationsTable() string {
	return `
	CREATE TABLE IF NOT EXISTS delivery_locations (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		customer_name VARCHAR(255) NOT NULL,
		address TEXT NOT NULL,
		location GEOMETRY(POINT, 4326) NOT NULL,
		delivery_time TIMESTAMP WITH TIME ZONE,
		status VARCHAR(50) DEFAULT 'pending',
		active BOOLEAN DEFAULT true,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);`
}

func createPointsOfInterestTable() string {
	return `
	CREATE TABLE IF NOT EXISTS points_of_interest (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name VARCHAR(255) NOT NULL,
		type VARCHAR(100) NOT NULL,
		address TEXT,
		location GEOMETRY(POINT, 4326) NOT NULL,
		properties JSONB DEFAULT '{}',
		active BOOLEAN DEFAULT true,
		created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
	);`
}

func createTrafficDataTable() string {
	return `
	CREATE TABLE IF NOT EXISTS traffic_data (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		location GEOMETRY(POINT, 4326) NOT NULL,
		congestion_level FLOAT NOT NULL CHECK (congestion_level >= 0 AND congestion_level <= 1),
		average_speed FLOAT NOT NULL,
		timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
		source VARCHAR(100),
		properties JSONB DEFAULT '{}'
	);`
}

func createSpatialIndexes() string {
	return `
	-- Spatial indexes for high-performance spatial queries
	CREATE INDEX IF NOT EXISTS idx_geofences_geometry 
		ON geofences USING GIST (geometry);
	
	CREATE INDEX IF NOT EXISTS idx_delivery_locations_location 
		ON delivery_locations USING GIST (location);
	
	CREATE INDEX IF NOT EXISTS idx_points_of_interest_location 
		ON points_of_interest USING GIST (location);
	
	CREATE INDEX IF NOT EXISTS idx_traffic_data_location 
		ON traffic_data USING GIST (location);
	
	-- Additional indexes for performance
	CREATE INDEX IF NOT EXISTS idx_geofences_active_driver 
		ON geofences (active, driver_id);
	
	CREATE INDEX IF NOT EXISTS idx_delivery_locations_active 
		ON delivery_locations (active);
	
	CREATE INDEX IF NOT EXISTS idx_points_of_interest_active_type 
		ON points_of_interest (active, type);
	
	CREATE INDEX IF NOT EXISTS idx_traffic_data_timestamp 
		ON traffic_data (timestamp);
	
	-- Update triggers for updated_at columns
	CREATE OR REPLACE FUNCTION update_updated_at_column()
	RETURNS TRIGGER AS $$
	BEGIN
		NEW.updated_at = NOW();
		RETURN NEW;
	END;
	$$ language 'plpgsql';
	
	DROP TRIGGER IF EXISTS update_geofences_updated_at ON geofences;
	CREATE TRIGGER update_geofences_updated_at 
		BEFORE UPDATE ON geofences 
		FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
	
	DROP TRIGGER IF EXISTS update_delivery_locations_updated_at ON delivery_locations;
	CREATE TRIGGER update_delivery_locations_updated_at 
		BEFORE UPDATE ON delivery_locations 
		FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
	
	DROP TRIGGER IF EXISTS update_points_of_interest_updated_at ON points_of_interest;
	CREATE TRIGGER update_points_of_interest_updated_at 
		BEFORE UPDATE ON points_of_interest 
		FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
	`
}
