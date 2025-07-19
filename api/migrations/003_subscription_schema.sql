-- Subscription Management Schema
-- Migration 003: Add subscription and usage tracking tables

-- Enable UUID generation and PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Organizations table (may already exist, add missing columns)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' AND column_name = 'stripe_customer_id') THEN
        ALTER TABLE organizations 
        ADD COLUMN stripe_customer_id VARCHAR(255) UNIQUE,
        ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'starter',
        ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'inactive';
    END IF;
END $$;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(255) PRIMARY KEY,
    organization_id UUID NOT NULL,
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    tier VARCHAR(50) NOT NULL DEFAULT 'starter',
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    features JSONB DEFAULT '[]'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    usage JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_subscription_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT chk_subscription_status 
        CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'unpaid')),
    CONSTRAINT chk_subscription_tier 
        CHECK (tier IN ('starter', 'professional', 'enterprise')),
    CONSTRAINT chk_billing_cycle 
        CHECK (billing_cycle IN ('monthly', 'annual'))
);

-- Usage logs table with PostGIS support for geographic tracking
CREATE TABLE IF NOT EXISTS subscription_usage_logs (
    id VARCHAR(255) PRIMARY KEY,
    subscription_id VARCHAR(255),
    organization_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    location GEOMETRY(POINT, 4326), -- PostGIS point for geographic tracking
    user_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    CONSTRAINT fk_usage_log_subscription 
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
    CONSTRAINT fk_usage_log_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT chk_event_type 
        CHECK (event_type IN ('driver_added', 'driver_removed', 'route_created', 'delivery_created', 
                             'api_call', 'geofence_created', 'subscription_created', 'subscription_updated', 
                             'subscription_canceled', 'payment_succeeded', 'payment_failed'))
);

-- Subscription audit log table
CREATE TABLE IF NOT EXISTS subscription_audit_logs (
    id SERIAL PRIMARY KEY,
    subscription_id VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_audit_subscription 
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    CONSTRAINT fk_audit_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- API usage tracking table for rate limiting and billing
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id SERIAL PRIMARY KEY,
    organization_id UUID NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    user_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_api_usage_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Storage usage tracking table
CREATE TABLE IF NOT EXISTS storage_usage (
    id SERIAL PRIMARY KEY,
    organization_id UUID NOT NULL,
    resource_type VARCHAR(100) NOT NULL, -- 'files', 'logs', 'cache', etc.
    resource_id VARCHAR(255),
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT fk_storage_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);

-- Usage logs indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_subscription_id ON subscription_usage_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_organization_id ON subscription_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_event_type ON subscription_usage_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON subscription_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON subscription_usage_logs(user_id);

-- Geographic index for location-based queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_location ON subscription_usage_logs USING GIST(location);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_usage_logs_org_event_time ON subscription_usage_logs(organization_id, event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_monthly ON subscription_usage_logs(organization_id, event_type, date_trunc('month', timestamp));

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_subscription_id ON subscription_audit_logs(subscription_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON subscription_audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON subscription_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON subscription_audit_logs(action);

-- API usage indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_organization_id ON api_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_monthly ON api_usage_logs(organization_id, date_trunc('month', created_at));

-- Storage usage indexes
CREATE INDEX IF NOT EXISTS idx_storage_usage_organization_id ON storage_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_resource_type ON storage_usage(resource_type);
CREATE INDEX IF NOT EXISTS idx_storage_usage_created_at ON storage_usage(created_at);

-- Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies (examples - you'd customize these based on your auth system)
-- These policies ensure users can only access their own organization's data

-- Subscriptions policies
CREATE POLICY IF NOT EXISTS subscription_org_isolation ON subscriptions
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Usage logs policies  
CREATE POLICY IF NOT EXISTS usage_logs_org_isolation ON subscription_usage_logs
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Audit logs policies
CREATE POLICY IF NOT EXISTS audit_logs_org_isolation ON subscription_audit_logs
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- API usage policies
CREATE POLICY IF NOT EXISTS api_usage_org_isolation ON api_usage_logs
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Storage usage policies
CREATE POLICY IF NOT EXISTS storage_usage_org_isolation ON storage_usage
    USING (organization_id = current_setting('app.current_organization_id')::UUID);

-- Functions for usage analytics

-- Function to get monthly usage summary
CREATE OR REPLACE FUNCTION get_monthly_usage_summary(org_id UUID, target_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    event_type VARCHAR(100),
    total_count BIGINT,
    unique_users BIGINT,
    first_event TIMESTAMP WITH TIME ZONE,
    last_event TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sul.event_type,
        COUNT(*) as total_count,
        COUNT(DISTINCT sul.user_id) as unique_users,
        MIN(sul.timestamp) as first_event,
        MAX(sul.timestamp) as last_event
    FROM subscription_usage_logs sul
    WHERE sul.organization_id = org_id
        AND DATE_TRUNC('month', sul.timestamp) = DATE_TRUNC('month', target_month)
    GROUP BY sul.event_type
    ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get geographic usage distribution
CREATE OR REPLACE FUNCTION get_geographic_usage_distribution(
    org_id UUID, 
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE(
    event_type VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    event_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sul.event_type,
        ST_Y(sul.location) as latitude,
        ST_X(sul.location) as longitude,
        COUNT(*) as event_count
    FROM subscription_usage_logs sul
    WHERE sul.organization_id = org_id
        AND sul.timestamp BETWEEN start_date AND end_date
        AND sul.location IS NOT NULL
    GROUP BY sul.event_type, ST_Y(sul.location), ST_X(sul.location)
    ORDER BY event_count DESC
    LIMIT 1000;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for automatic updates

-- Update subscription updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_timestamp
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_timestamp();

-- Trigger to log subscription changes to audit table
CREATE OR REPLACE FUNCTION log_subscription_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO subscription_audit_logs (
            subscription_id,
            organization_id,
            action,
            old_values,
            new_values,
            changed_by,
            timestamp
        ) VALUES (
            NEW.id,
            NEW.organization_id,
            'UPDATE',
            row_to_json(OLD),
            row_to_json(NEW),
            current_setting('app.current_user_id', true),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO subscription_audit_logs (
            subscription_id,
            organization_id,
            action,
            new_values,
            changed_by,
            timestamp
        ) VALUES (
            NEW.id,
            NEW.organization_id,
            'INSERT',
            row_to_json(NEW),
            current_setting('app.current_user_id', true),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO subscription_audit_logs (
            subscription_id,
            organization_id,
            action,
            old_values,
            changed_by,
            timestamp
        ) VALUES (
            OLD.id,
            OLD.organization_id,
            'DELETE',
            row_to_json(OLD),
            current_setting('app.current_user_id', true),
            NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_subscription_changes
    AFTER INSERT OR UPDATE OR DELETE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION log_subscription_changes();

-- Comments for documentation
COMMENT ON TABLE subscriptions IS 'Core subscription management table with Stripe integration';
COMMENT ON TABLE subscription_usage_logs IS 'Event tracking for usage-based billing and analytics with geographic support';
COMMENT ON TABLE subscription_audit_logs IS 'Audit trail for all subscription changes';
COMMENT ON TABLE api_usage_logs IS 'API usage tracking for rate limiting and billing';
COMMENT ON TABLE storage_usage IS 'Storage usage tracking for billing and quota management';

COMMENT ON COLUMN subscription_usage_logs.location IS 'PostGIS point for geographic event tracking';
COMMENT ON COLUMN subscription_usage_logs.event_details IS 'JSON details specific to the event type';
COMMENT ON COLUMN subscriptions.features IS 'JSON array of enabled features for the subscription tier';
COMMENT ON COLUMN subscriptions.limits IS 'JSON object containing usage limits for the subscription tier';
COMMENT ON COLUMN subscriptions.usage IS 'JSON object containing current usage metrics';