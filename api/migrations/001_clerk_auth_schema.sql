-- Migration: Add Clerk authentication and Stripe billing schema
-- Created: 2024-01-17
-- Description: Creates tables for Clerk user management and Stripe subscription billing

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table with Clerk and Stripe integration
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    -- Clerk integration
    clerk_organization_id VARCHAR(255) UNIQUE,
    
    -- Stripe integration
    stripe_customer_id VARCHAR(255) UNIQUE,
    
    -- Organization metadata
    type VARCHAR(50) NOT NULL DEFAULT 'logistics_company',
    industry VARCHAR(100),
    company_size VARCHAR(20) CHECK (company_size IN ('small', 'medium', 'large', 'enterprise')),
    territories TEXT[], -- Array of territory codes
    fleet_size INTEGER DEFAULT 0,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    CONSTRAINT valid_type CHECK (type IN ('logistics_company', 'customer_company'))
);

-- Users table with Clerk integration
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Clerk integration
    clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Basic user info
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    
    -- Role and organization
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'company_admin', 'dispatcher', 'driver', 'customer', 'support')),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Driver-specific fields
    driver_license VARCHAR(50),
    vehicle_id UUID,
    territory TEXT[], -- Array of territory codes
    mobile_device_id VARCHAR(255),
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false,
    last_location_update TIMESTAMP WITH TIME ZONE,
    offline_token_expiry TIMESTAMP WITH TIME ZONE,
    
    -- Stripe integration
    stripe_customer_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization subscriptions table
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Stripe integration
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255),
    
    -- Subscription details
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
    tier VARCHAR(50) NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'professional', 'enterprise')),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    
    -- Billing periods
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP WITH TIME ZONE,
    
    -- Features and limits
    features JSONB DEFAULT '[]',
    usage_limits JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription usage tracking
CREATE TABLE IF NOT EXISTS subscription_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES organization_subscriptions(id) ON DELETE CASCADE,
    
    -- Usage metrics
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Counters
    driver_count INTEGER DEFAULT 0,
    route_count INTEGER DEFAULT 0,
    delivery_count INTEGER DEFAULT 0,
    api_requests INTEGER DEFAULT 0,
    storage_gb DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    usage_data JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(organization_id, period_start, period_end)
);

-- User sessions for offline token management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session details
    clerk_session_id VARCHAR(255),
    device_id VARCHAR(255),
    device_type VARCHAR(50), -- mobile, web, desktop
    
    -- Offline token management
    offline_token_hash VARCHAR(255), -- Hashed offline token
    offline_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Billing events log
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(100) NOT NULL, -- stripe webhook event type
    stripe_event_id VARCHAR(255) UNIQUE,
    
    -- Event data
    event_data JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Error handling
    processing_errors TEXT[],
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permission cache for performance
CREATE TABLE IF NOT EXISTS user_permission_cache (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    PRIMARY KEY (user_id, permission)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_organizations_clerk_id ON organizations(clerk_organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON organization_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON organization_subscriptions(tier);

CREATE INDEX IF NOT EXISTS idx_usage_organization_period ON subscription_usage(organization_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON user_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(offline_expires_at);

CREATE INDEX IF NOT EXISTS idx_billing_events_organization ON billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe_id ON billing_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_permission_cache_expires ON user_permission_cache(expires_at);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON organization_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_updated_at BEFORE UPDATE ON subscription_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired permission cache
CREATE OR REPLACE FUNCTION clean_expired_permission_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM user_permission_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get user permissions with caching
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TEXT[] AS $$
DECLARE
    user_role TEXT;
    permissions TEXT[];
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = p_user_id;
    
    -- Return permissions based on role
    CASE user_role
        WHEN 'super_admin' THEN
            permissions := ARRAY['*'];
        WHEN 'company_admin' THEN
            permissions := ARRAY['manage:organization', 'manage:drivers', 'manage:dispatchers', 'view:analytics', 'manage:billing'];
        WHEN 'dispatcher' THEN
            permissions := ARRAY['manage:routes', 'manage:deliveries', 'view:drivers', 'communicate:drivers', 'view:analytics'];
        WHEN 'driver' THEN
            permissions := ARRAY['view:assigned_routes', 'update:delivery_status', 'communicate:dispatcher', 'view:profile'];
        WHEN 'customer' THEN
            permissions := ARRAY['view:deliveries', 'create:delivery_requests', 'view:tracking', 'view:invoices'];
        WHEN 'support' THEN
            permissions := ARRAY['view:tickets', 'respond:tickets', 'view:user_profiles'];
        ELSE
            permissions := ARRAY[]::TEXT[];
    END CASE;
    
    RETURN permissions;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    cached_result BOOLEAN;
    user_permissions TEXT[];
    has_perm BOOLEAN := false;
    perm TEXT;
BEGIN
    -- Check cache first
    SELECT granted INTO cached_result 
    FROM user_permission_cache 
    WHERE user_id = p_user_id 
    AND permission = p_permission 
    AND expires_at > NOW();
    
    IF FOUND THEN
        RETURN cached_result;
    END IF;
    
    -- Get permissions and check
    user_permissions := get_user_permissions(p_user_id);
    
    FOREACH perm IN ARRAY user_permissions
    LOOP
        IF perm = '*' OR perm = p_permission THEN
            has_perm := true;
            EXIT;
        END IF;
    END LOOP;
    
    -- Cache result
    INSERT INTO user_permission_cache (user_id, permission, granted, expires_at)
    VALUES (p_user_id, p_permission, has_perm, NOW() + INTERVAL '5 minutes')
    ON CONFLICT (user_id, permission) 
    DO UPDATE SET granted = EXCLUDED.granted, expires_at = EXCLUDED.expires_at;
    
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- View for organization subscription status
CREATE OR REPLACE VIEW organization_subscription_status AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.clerk_organization_id,
    s.stripe_subscription_id,
    s.status as subscription_status,
    s.tier as subscription_tier,
    s.billing_cycle,
    s.current_period_end,
    s.cancel_at_period_end,
    s.features,
    CASE 
        WHEN s.status = 'active' THEN true
        WHEN s.status = 'trialing' THEN true
        ELSE false
    END as has_active_subscription
FROM organizations o
LEFT JOIN organization_subscriptions s ON o.id = s.organization_id;

-- Initial data: Create super admin organization if it doesn't exist
INSERT INTO organizations (name, slug, type) 
VALUES ('System Administration', 'system-admin', 'logistics_company')
ON CONFLICT (slug) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE organizations IS 'Organizations with Clerk and Stripe integration for multi-tenant logistics platform';
COMMENT ON TABLE users IS 'Users with Clerk authentication and role-based access control';
COMMENT ON TABLE organization_subscriptions IS 'Stripe subscription management for organizations';
COMMENT ON TABLE subscription_usage IS 'Usage tracking for billing and analytics';
COMMENT ON TABLE user_sessions IS 'Session management for offline token support';
COMMENT ON TABLE billing_events IS 'Audit log for Stripe webhook events';
COMMENT ON TABLE user_permission_cache IS 'Performance cache for permission checks';

COMMENT ON FUNCTION get_user_permissions(UUID) IS 'Returns array of permissions for a user based on their role';
COMMENT ON FUNCTION user_has_permission(UUID, TEXT) IS 'Checks if user has specific permission with caching';
COMMENT ON FUNCTION clean_expired_permission_cache() IS 'Maintenance function to clean expired cache entries';