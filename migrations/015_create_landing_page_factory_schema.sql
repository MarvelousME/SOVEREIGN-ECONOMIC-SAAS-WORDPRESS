-- Migration: Create Landing Page Factory Schema
-- Description: Tables for Landing Page Factory service
-- Author: Sovereign OS Team
-- Date: 2026-04-05

-- Landing pages table
CREATE TABLE IF NOT EXISTS landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    business_id UUID,
    template_id UUID,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    blocks JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    review_status VARCHAR(20) DEFAULT 'pending',
    review_notes TEXT,
    review_reviewed_by UUID,
    review_reviewed_at TIMESTAMP,
    publish_targets JSONB DEFAULT '[]',
    ab_test_variant VARCHAR(50),
    affiliate_url TEXT,
    affiliate_network VARCHAR(100),
    brand_tone VARCHAR(50) NOT NULL DEFAULT 'professional',
    locale VARCHAR(10) NOT NULL DEFAULT 'en-US',
    version INTEGER NOT NULL DEFAULT 1,
    current_version_id UUID,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_page_status CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
    CONSTRAINT valid_review_status CHECK (review_status IN ('pending', 'approved', 'rejected') OR review_status IS NULL),
    CONSTRAINT valid_brand_tone CHECK (brand_tone IN ('professional', 'casual', 'playful', 'luxurious', 'minimalist', 'authority'))
);

CREATE INDEX idx_landing_pages_tenant_id ON landing_pages(tenant_id);
CREATE INDEX idx_landing_pages_user_id ON landing_pages(user_id);
CREATE INDEX idx_landing_pages_business_id ON landing_pages(business_id);
CREATE INDEX idx_landing_pages_status ON landing_pages(status);
CREATE INDEX idx_landing_pages_slug ON landing_pages(slug);
CREATE INDEX idx_landing_pages_created_at ON landing_pages(created_at DESC);
CREATE UNIQUE INDEX idx_landing_pages_tenant_slug ON landing_pages(tenant_id, slug);

-- Page versions table for versioning and rollback
CREATE TABLE IF NOT EXISTS page_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    blocks JSONB NOT NULL,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL,
    change_description TEXT,
    rollback_token VARCHAR(64) UNIQUE,
    CONSTRAINT unique_page_version UNIQUE (page_id, version)
);

CREATE INDEX idx_page_versions_page_id ON page_versions(page_id);
CREATE INDEX idx_page_versions_version ON page_versions(page_id, version DESC);
CREATE INDEX idx_page_versions_rollback_token ON page_versions(rollback_token);

-- Page blocks table for structured block storage
CREATE TABLE IF NOT EXISTS page_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    block_type VARCHAR(50) NOT NULL,
    block_order INTEGER NOT NULL,
    config JSONB DEFAULT '{}',
    content JSONB NOT NULL,
    styles JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_block_type CHECK (block_type IN ('hero', 'features', 'benefits', 'pricing', 'testimonials', 'cta', 'faq', 'footer', 'cookie_consent', 'affiliate_disclosure', 'lead_form', 'video_embed', 'comparison_table'))
);

CREATE INDEX idx_page_blocks_page_id ON page_blocks(page_id);
CREATE INDEX idx_page_blocks_type ON page_blocks(block_type);
CREATE INDEX idx_page_blocks_order ON page_blocks(page_id, block_order);

-- Page templates table
CREATE TABLE IF NOT EXISTS page_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    thumbnail TEXT,
    blocks JSONB NOT NULL,
    default_metadata JSONB NOT NULL,
    variables JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    is_a_b_testable BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_template_category CHECK (category IN ('lead_generation', 'sales', 'webinar', 'ecommerce', 'affiliate', 'review', 'comparison', 'template'))
);

CREATE INDEX idx_page_templates_category ON page_templates(category);
CREATE INDEX idx_page_templates_is_public ON page_templates(is_public);

-- Page disclosures table
CREATE TABLE IF NOT EXISTS page_disclosures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    disclosure_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    position VARCHAR(20) NOT NULL DEFAULT 'bottom',
    is_required BOOLEAN DEFAULT true,
    jurisdictions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_disclosure_type CHECK (disclosure_type IN ('ftc_affiliate', 'gdpr_privacy', 'cookie_consent', 'channel_specific')),
    CONSTRAINT valid_position CHECK (position IN ('top', 'bottom', 'inline'))
);

CREATE INDEX idx_page_disclosures_page_id ON page_disclosures(page_id);
CREATE INDEX idx_page_disclosures_type ON page_disclosures(disclosure_type);

-- Page publish targets table
CREATE TABLE IF NOT EXISTS page_publish_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL,
    url TEXT,
    domain VARCHAR(255),
    subdomain VARCHAR(255),
    cdn_distribution_id VARCHAR(255),
    cdn_url TEXT,
    embed_code TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    published_at TIMESTAMP,
    unpublished_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_target_type CHECK (target_type IN ('cdn', 'embedded', 'subdomain', 'custom_domain')),
    CONSTRAINT valid_publish_status CHECK (status IN ('draft', 'published', 'unpublished'))
);

CREATE INDEX idx_page_publish_targets_page_id ON page_publish_targets(page_id);
CREATE INDEX idx_page_publish_targets_type ON page_publish_targets(target_type);
CREATE INDEX idx_page_publish_targets_status ON page_publish_targets(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_landing_page_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_landing_pages_updated_at
    BEFORE UPDATE ON landing_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_page_updated_at();

CREATE TRIGGER update_page_versions_updated_at
    BEFORE UPDATE ON page_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_page_updated_at();

CREATE TRIGGER update_page_blocks_updated_at
    BEFORE UPDATE ON page_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_page_updated_at();

CREATE TRIGGER update_page_templates_updated_at
    BEFORE UPDATE ON page_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_page_updated_at();

CREATE TRIGGER update_page_disclosures_updated_at
    BEFORE UPDATE ON page_disclosures
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_page_updated_at();

CREATE TRIGGER update_page_publish_targets_updated_at
    BEFORE UPDATE ON page_publish_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_page_updated_at();

-- Add comments
COMMENT ON TABLE landing_pages IS 'Landing pages created by the Landing Page Factory';
COMMENT ON TABLE page_versions IS 'Version history for landing pages with rollback support';
COMMENT ON TABLE page_blocks IS 'Structured block storage for landing pages';
COMMENT ON TABLE page_templates IS 'Reusable page templates';
COMMENT ON TABLE page_disclosures IS 'Legal disclosures for landing pages (FTC, GDPR, etc.)';
COMMENT ON TABLE page_publish_targets IS 'Publishing targets (CDN, embedded, custom domain)';
