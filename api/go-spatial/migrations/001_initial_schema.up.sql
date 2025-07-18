-- Enable PostGIS extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Create geofences table
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
);

-- Create delivery locations table
CREATE TABLE IF NOT EXISTS delivery_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    delivery_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create points of interest table
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
);

-- Create traffic data table
CREATE TABLE IF NOT EXISTS traffic_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOMETRY(POINT, 4326) NOT NULL,
    congestion_level FLOAT NOT NULL CHECK (congestion_level >= 0 AND congestion_level <= 1),
    average_speed FLOAT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(100),
    properties JSONB DEFAULT '{}'
);

-- Create spatial indexes for high-performance queries
CREATE INDEX IF NOT EXISTS idx_geofences_geometry 
    ON geofences USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_delivery_locations_location 
    ON delivery_locations USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_points_of_interest_location 
    ON points_of_interest USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_traffic_data_location 
    ON traffic_data USING GIST (location);

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_geofences_active_driver 
    ON geofences (active, driver_id);

CREATE INDEX IF NOT EXISTS idx_geofences_active 
    ON geofences (active);

CREATE INDEX IF NOT EXISTS idx_delivery_locations_active 
    ON delivery_locations (active);

CREATE INDEX IF NOT EXISTS idx_delivery_locations_status 
    ON delivery_locations (status);

CREATE INDEX IF NOT EXISTS idx_points_of_interest_active_type 
    ON points_of_interest (active, type);

CREATE INDEX IF NOT EXISTS idx_traffic_data_timestamp 
    ON traffic_data (timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
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

-- Insert sample data for development/testing
INSERT INTO geofences (name, geometry, properties, buffer_distance, active) VALUES
(
    'Downtown Delivery Zone',
    ST_GeomFromText('POLYGON((-74.0170 40.7040, -74.0100 40.7040, -74.0100 40.7120, -74.0170 40.7120, -74.0170 40.7040))', 4326),
    '{"alert_on_entry": true, "alert_on_exit": true, "priority": "high"}',
    50,
    true
),
(
    'Main Warehouse Area',
    ST_GeomFromText('POLYGON((-74.0060 40.7580, -74.0020 40.7580, -74.0020 40.7620, -74.0060 40.7620, -74.0060 40.7580))', 4326),
    '{"alert_on_entry": true, "alert_on_exit": false, "priority": "medium"}',
    25,
    true
);

INSERT INTO delivery_locations (customer_name, address, location, status, active) VALUES
('John Smith', '123 Main St, New York, NY', ST_Point(-74.0059, 40.7128), 'pending', true),
('Jane Doe', '456 Broadway, New York, NY', ST_Point(-74.0044, 40.7589), 'pending', true),
('Bob Johnson', '789 5th Ave, New York, NY', ST_Point(-73.9654, 40.7829), 'completed', true),
('Alice Brown', '321 Park Ave, New York, NY', ST_Point(-73.9707, 40.7505), 'pending', true);

INSERT INTO points_of_interest (name, type, address, location, properties, active) VALUES
('Central Park', 'park', 'Central Park, New York, NY', ST_Point(-73.9654, 40.7829), '{"area": "large", "facilities": ["parking", "restrooms"]}', true),
('Times Square', 'landmark', 'Times Square, New York, NY', ST_Point(-73.9855, 40.7580), '{"traffic": "heavy", "parking": "limited"}', true),
('Brooklyn Bridge', 'landmark', 'Brooklyn Bridge, New York, NY', ST_Point(-73.9969, 40.7061), '{"type": "bridge", "historic": true}', true),
('Gas Station - Shell', 'fuel', '100 West St, New York, NY', ST_Point(-74.0147, 40.7093), '{"brand": "Shell", "24_hour": true}', true);

-- Insert sample traffic data
INSERT INTO traffic_data (location, congestion_level, average_speed, source) VALUES
(ST_Point(-74.0059, 40.7128), 0.3, 45.0, 'traffic_api'),
(ST_Point(-74.0044, 40.7589), 0.7, 25.0, 'traffic_api'),
(ST_Point(-73.9855, 40.7580), 0.9, 15.0, 'traffic_api'),
(ST_Point(-73.9969, 40.7061), 0.2, 55.0, 'traffic_api');

-- Create performance monitoring views
CREATE OR REPLACE VIEW geofence_performance_stats AS
SELECT 
    COUNT(*) as total_geofences,
    COUNT(CASE WHEN active = true THEN 1 END) as active_geofences,
    COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END) as driver_specific_geofences,
    AVG(buffer_distance) as avg_buffer_distance,
    MIN(created_at) as first_created,
    MAX(updated_at) as last_updated
FROM geofences;

CREATE OR REPLACE VIEW delivery_performance_stats AS
SELECT 
    COUNT(*) as total_deliveries,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_deliveries,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_deliveries,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deliveries,
    ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::FLOAT / COUNT(*)::FLOAT * 100), 2) as completion_rate
FROM delivery_locations;

-- Create spatial analysis functions
CREATE OR REPLACE FUNCTION get_nearby_deliveries(
    input_lat FLOAT,
    input_lng FLOAT,
    radius_meters FLOAT DEFAULT 1000,
    max_results INT DEFAULT 10
)
RETURNS TABLE(
    id UUID,
    customer_name VARCHAR(255),
    address TEXT,
    distance_meters FLOAT,
    status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.customer_name,
        d.address,
        ST_Distance(d.location::geography, ST_Point(input_lng, input_lat)::geography) as distance_meters,
        d.status
    FROM delivery_locations d
    WHERE 
        d.active = true
        AND ST_DWithin(
            d.location::geography,
            ST_Point(input_lng, input_lat)::geography,
            radius_meters
        )
    ORDER BY distance_meters
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Performance optimization function
CREATE OR REPLACE FUNCTION optimize_spatial_indexes()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    optimization_result TEXT
) AS $$
BEGIN
    -- Analyze tables to update statistics
    ANALYZE geofences;
    ANALYZE delivery_locations;
    ANALYZE points_of_interest;
    ANALYZE traffic_data;
    
    RETURN QUERY VALUES 
        ('geofences', 'idx_geofences_geometry', 'Optimized'),
        ('delivery_locations', 'idx_delivery_locations_location', 'Optimized'),
        ('points_of_interest', 'idx_points_of_interest_location', 'Optimized'),
        ('traffic_data', 'idx_traffic_data_location', 'Optimized');
END;
$$ LANGUAGE plpgsql;