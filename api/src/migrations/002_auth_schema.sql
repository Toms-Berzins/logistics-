-- Driver authentication and session management schema

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    license_number VARCHAR(50),
    license_expiry DATE,
    vehicle_id UUID,
    vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('van', 'truck', 'motorcycle', 'car')),
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('available', 'busy', 'offline', 'break')),
    
    -- Location tracking
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    last_location_update TIMESTAMP WITH TIME ZONE,
    location_accuracy DECIMAL(10, 2),
    
    -- Shift management
    shift_start_time TIME,
    shift_end_time TIME,
    shift_is_active BOOLEAN DEFAULT false,
    
    -- Performance metrics
    rating DECIMAL(3, 2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    total_deliveries INTEGER DEFAULT 0,
    
    -- Authentication
    pin_hash VARCHAR(255) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create driver sessions table
CREATE TABLE IF NOT EXISTS driver_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    device_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drivers_employee_id ON drivers(employee_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver_id ON driver_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_active ON driver_sessions(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_drivers_updated_at 
    BEFORE UPDATE ON drivers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert demo drivers with hashed PINs
-- PIN: 1234 -> $2a$10$hash...
-- PIN: 1111 -> $2a$10$hash...
-- etc.

INSERT INTO drivers (
    employee_id, name, email, phone, license_number, license_expiry, 
    vehicle_type, shift_start_time, shift_end_time, shift_is_active,
    rating, total_deliveries, pin_hash
) VALUES 
    ('DEMO001', 'Demo Driver', 'demo@logistics.com', '+1-555-0123', 'DL123456', 
     '2025-12-31', 'van', '08:00', '17:00', true, 4.8, 245, 
     '$2a$10$rOz7vz9j7i3.i9j7i9j7i.O1Z9j7i9j7i9j7i9j7i9j7i9j7i9j7i9j'),
    
    ('DRV001', 'John Martinez', 'john.martinez@logistics.com', '+1-555-0124', 'DL789012', 
     '2025-08-15', 'truck', '07:00', '16:00', true, 4.9, 423, 
     '$2a$10$rOz7vz9j7i3.i9j7i9j7i.O1Z9j7i9j7i9j7i9j7i9j7i9j7i9j7i9j'),
    
    ('DRV002', 'Sarah Johnson', 'sarah.johnson@logistics.com', '+1-555-0125', 'DL345678', 
     '2025-10-20', 'van', '09:00', '18:00', true, 4.7, 356, 
     '$2a$10$rOz7vz9j7i3.i9j7i9j7i.O1Z9j7i9j7i9j7i9j7i9j7i9j7i9j7i9j'),
    
    ('DRV003', 'Mike Chen', 'mike.chen@logistics.com', '+1-555-0126', 'DL901234', 
     '2025-06-30', 'motorcycle', '10:00', '19:00', true, 4.6, 189, 
     '$2a$10$rOz7vz9j7i3.i9j7i9j7i.O1Z9j7i9j7i9j7i9j7i9j7i9j7i9j7i9j'),
    
    ('DRV004', 'Emma Rodriguez', 'emma.rodriguez@logistics.com', '+1-555-0127', 'DL567890', 
     '2025-11-12', 'car', '08:30', '17:30', true, 4.8, 298, 
     '$2a$10$rOz7vz9j7i3.i9j7i9j7i.O1Z9j7i9j7i9j7i9j7i9j7i9j7i9j7i9j')
ON CONFLICT (employee_id) DO NOTHING;

-- Create function to hash PIN and update driver
CREATE OR REPLACE FUNCTION set_driver_pin(driver_employee_id VARCHAR(50), new_pin VARCHAR(10))
RETURNS VOID AS $$
BEGIN
    UPDATE drivers 
    SET pin_hash = crypt(new_pin, gen_salt('bf', 10))
    WHERE employee_id = driver_employee_id;
END;
$$ LANGUAGE plpgsql;

-- Set actual PINs for demo drivers
SELECT set_driver_pin('DEMO001', '1234');
SELECT set_driver_pin('DRV001', '1111');
SELECT set_driver_pin('DRV002', '2222');
SELECT set_driver_pin('DRV003', '3333');
SELECT set_driver_pin('DRV004', '4444');