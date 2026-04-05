-- Migration: Create Business Builder Tables
-- Description: Tables for Business-in-a-Box service
-- Author: UBI-CMS Team
-- Date: 2026-03-26

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    branding JSONB,
    domain JSONB NOT NULL,
    integrations JSONB NOT NULL DEFAULT '{}',
    funnels JSONB DEFAULT '[]',
    pages JSONB DEFAULT '[]',
    revenue JSONB NOT NULL DEFAULT '{"total": 0, "platformFee": 0, "lastUpdated": null}',
    analytics JSONB NOT NULL DEFAULT '{"visitors": 0, "conversions": 0, "conversionRate": 0, "revenue": 0, "period": "week"}',
    features JSONB NOT NULL DEFAULT '{"abTesting": false, "advancedAnalytics": false, "premiumTemplates": false, "customIntegrations": false}',
    subscription JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deployed_at TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('draft', 'configuring', 'deploying', 'active', 'paused', 'archived'))
);

-- Create index on user_id for faster queries
CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_status ON businesses(status);
CREATE INDEX idx_businesses_template ON businesses(template);
CREATE INDEX idx_businesses_created_at ON businesses(created_at DESC);

-- Create unique index on subdomain
CREATE UNIQUE INDEX idx_businesses_subdomain ON businesses((domain->>'subdomain'));

-- Create business_pages table
CREATE TABLE IF NOT EXISTS business_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    components JSONB NOT NULL DEFAULT '[]',
    seo JSONB NOT NULL,
    ab_test_variant VARCHAR(50),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id, slug)
);

CREATE INDEX idx_business_pages_business_id ON business_pages(business_id);
CREATE INDEX idx_business_pages_type ON business_pages(type);
CREATE INDEX idx_business_pages_slug ON business_pages(slug);

-- Create business_funnels table
CREATE TABLE IF NOT EXISTS business_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    pages JSONB NOT NULL DEFAULT '[]',
    email_sequences JSONB NOT NULL DEFAULT '[]',
    conversion_goal VARCHAR(50) NOT NULL,
    tracking_pixels JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_business_funnels_business_id ON business_funnels(business_id);

-- Create business_analytics table for detailed analytics
CREATE TABLE IF NOT EXISTS business_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    visitor_id VARCHAR(100),
    page_path VARCHAR(255),
    page_views INTEGER DEFAULT 1,
    source VARCHAR(100),
    device VARCHAR(20),
    converted BOOLEAN DEFAULT false,
    revenue DECIMAL(10, 2) DEFAULT 0,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_business_analytics_business_id ON business_analytics(business_id);
CREATE INDEX idx_business_analytics_timestamp ON business_analytics(timestamp DESC);
CREATE INDEX idx_business_analytics_visitor_id ON business_analytics(visitor_id);

-- Create business_payments table
CREATE TABLE IF NOT EXISTS business_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    transaction_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    net_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50),
    customer_email VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

CREATE INDEX idx_business_payments_business_id ON business_payments(business_id);
CREATE INDEX idx_business_payments_status ON business_payments(status);
CREATE INDEX idx_business_payments_created_at ON business_payments(created_at DESC);
CREATE UNIQUE INDEX idx_business_payments_transaction_id ON business_payments(transaction_id);

-- Create business_domains table
CREATE TABLE IF NOT EXISTS business_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    is_custom BOOLEAN DEFAULT false,
    ssl_enabled BOOLEAN DEFAULT false,
    ssl_issuer VARCHAR(100),
    ssl_expires_at TIMESTAMP,
    verified BOOLEAN DEFAULT false,
    dns_records JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_business_domains_business_id ON business_domains(business_id);
CREATE INDEX idx_business_domains_domain ON business_domains(domain);

-- Create business_webhooks table for integrations
CREATE TABLE IF NOT EXISTS business_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_business_webhooks_business_id ON business_webhooks(business_id);
CREATE INDEX idx_business_webhooks_event_type ON business_webhooks(event_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_business_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();

CREATE TRIGGER update_business_pages_updated_at
    BEFORE UPDATE ON business_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();

CREATE TRIGGER update_business_funnels_updated_at
    BEFORE UPDATE ON business_funnels
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();

CREATE TRIGGER update_business_payments_updated_at
    BEFORE UPDATE ON business_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();

CREATE TRIGGER update_business_domains_updated_at
    BEFORE UPDATE ON business_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();

CREATE TRIGGER update_business_webhooks_updated_at
    BEFORE UPDATE ON business_webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_business_updated_at();

-- Add comments
COMMENT ON TABLE businesses IS 'Main businesses table for Business-in-a-Box service';
COMMENT ON TABLE business_pages IS 'Pages for each business';
COMMENT ON TABLE business_funnels IS 'Marketing funnels for businesses';
COMMENT ON TABLE business_analytics IS 'Analytics tracking for businesses';
COMMENT ON TABLE business_payments IS 'Payment transactions and platform fees';
COMMENT ON TABLE business_domains IS 'Custom domains and SSL certificates';
COMMENT ON TABLE business_webhooks IS 'Webhook integrations for businesses';
