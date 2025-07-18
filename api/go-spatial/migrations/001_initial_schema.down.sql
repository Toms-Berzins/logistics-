-- Drop performance functions
DROP FUNCTION IF EXISTS optimize_spatial_indexes();
DROP FUNCTION IF EXISTS get_nearby_deliveries(FLOAT, FLOAT, FLOAT, INT);

-- Drop performance views
DROP VIEW IF EXISTS delivery_performance_stats;
DROP VIEW IF EXISTS geofence_performance_stats;

-- Drop triggers
DROP TRIGGER IF EXISTS update_points_of_interest_updated_at ON points_of_interest;
DROP TRIGGER IF EXISTS update_delivery_locations_updated_at ON delivery_locations;
DROP TRIGGER IF EXISTS update_geofences_updated_at ON geofences;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_traffic_data_timestamp;
DROP INDEX IF EXISTS idx_points_of_interest_active_type;
DROP INDEX IF EXISTS idx_delivery_locations_status;
DROP INDEX IF EXISTS idx_delivery_locations_active;
DROP INDEX IF EXISTS idx_geofences_active;
DROP INDEX IF EXISTS idx_geofences_active_driver;
DROP INDEX IF EXISTS idx_traffic_data_location;
DROP INDEX IF EXISTS idx_points_of_interest_location;
DROP INDEX IF EXISTS idx_delivery_locations_location;
DROP INDEX IF EXISTS idx_geofences_geometry;

-- Drop tables
DROP TABLE IF EXISTS traffic_data;
DROP TABLE IF EXISTS points_of_interest;
DROP TABLE IF EXISTS delivery_locations;
DROP TABLE IF EXISTS geofences;