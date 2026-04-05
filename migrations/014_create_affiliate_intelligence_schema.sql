-- Affiliate Intelligence Schema
-- Supports affiliate link management, merchant database, offer detection, and freshness scoring

-- Create affiliate_links table
CREATE TABLE IF NOT EXISTS affiliate_links (
    id UUID PRIMARY KEY,
    original_url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    merchant_id UUID,
    product_id UUID,
    offer_id UUID,
    user_id VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    tracking_parameters JSONB,
    stripped_parameters JSONB,
    url_hash VARCHAR(64) NOT NULL UNIQUE,
    click_count INTEGER NOT NULL DEFAULT 0,
    last_clicked_at TIMESTAMP,
    first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    freshness_score DECIMAL(5, 4),
    provenance JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create merchants table
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    network VARCHAR(50),
    website_url TEXT,
    logo_url TEXT,
    description TEXT,
    categories TEXT[],
    commission_rules JSONB,
    average_commission DECIMAL(5, 4),
    commission_type VARCHAR(20),
    payout_threshold DECIMAL(18, 6),
    payout_frequency VARCHAR(20),
    cookie_duration INTEGER,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL,
    name VARCHAR(500) NOT NULL,
    sku VARCHAR(255),
    description TEXT,
    category VARCHAR(255),
    subcategory VARCHAR(255),
    brand VARCHAR(255),
    image_url TEXT,
    product_url TEXT,
    original_price DECIMAL(18, 6),
    current_price DECIMAL(18, 6),
    sale_price DECIMAL(18, 6),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    in_stock BOOLEAN NOT NULL DEFAULT true,
    stock_quantity INTEGER,
    specifications JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY,
    merchant_id UUID NOT NULL,
    offer_code VARCHAR(100),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    offer_type VARCHAR(50) NOT NULL,
    discount_type VARCHAR(20),
    discount_value DECIMAL(18, 6),
    commission_rate DECIMAL(5, 4),
    commission_amount DECIMAL(18, 6),
    minimum_purchase DECIMAL(18, 6),
    maximum_discount DECIMAL(18, 6),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    is_exclusive BOOLEAN NOT NULL DEFAULT false,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    usage_count INTEGER NOT NULL DEFAULT 0,
    success_rate DECIMAL(5, 4),
    last_verified_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    categories TEXT[],
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- Create offer_snapshots table for versioning
CREATE TABLE IF NOT EXISTS offer_snapshots (
    id UUID PRIMARY KEY,
    offer_id UUID NOT NULL,
    version INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20),
    discount_value DECIMAL(18, 6),
    commission_rate DECIMAL(5, 4),
    commission_amount DECIMAL(18, 6),
    minimum_purchase DECIMAL(18, 6),
    maximum_discount DECIMAL(18, 6),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(20),
    price_at_snapshot DECIMAL(18, 6),
    commission_at_snapshot DECIMAL(18, 6),
    snapshot_reason VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
    UNIQUE(offer_id, version)
);

-- Create url_analysis_results table
CREATE TABLE IF NOT EXISTS url_analysis_results (
    id UUID PRIMARY KEY,
    url TEXT NOT NULL,
    url_hash VARCHAR(64) NOT NULL,
    parse_success BOOLEAN NOT NULL DEFAULT false,
    merchant_detected VARCHAR(255),
    merchant_id UUID,
    product_detected VARCHAR(500),
    product_id UUID,
    offer_detected VARCHAR(100),
    offer_id UUID,
    detected_parameters JSONB,
    cleaned_url TEXT,
    extraction_confidence DECIMAL(5, 4),
    parsing_errors JSONB,
    analysis_duration_ms INTEGER,
    is_affiliate_url BOOLEAN NOT NULL DEFAULT false,
    confidence_score DECIMAL(5, 4),
    recommendations JSONB,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE SET NULL
);

-- Create freshness_scores table
CREATE TABLE IF NOT EXISTS freshness_scores (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    score DECIMAL(5, 4) NOT NULL,
    factors JSONB NOT NULL,
    breakdown JSONB,
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    metadata JSONB,
    UNIQUE(entity_type, entity_id)
);

-- Create indexes for affiliate_links
CREATE INDEX idx_affiliate_links_url_hash ON affiliate_links(url_hash);
CREATE INDEX idx_affiliate_links_merchant_id ON affiliate_links(merchant_id);
CREATE INDEX idx_affiliate_links_product_id ON affiliate_links(product_id);
CREATE INDEX idx_affiliate_links_offer_id ON affiliate_links(offer_id);
CREATE INDEX idx_affiliate_links_user_id ON affiliate_links(user_id);
CREATE INDEX idx_affiliate_links_status ON affiliate_links(status);
CREATE INDEX idx_affiliate_links_normalized_url ON affiliate_links(normalized_url);
CREATE INDEX idx_affiliate_links_freshness_score ON affiliate_links(freshness_score);
CREATE INDEX idx_affiliate_links_created_at ON affiliate_links(created_at);

-- Create indexes for merchants
CREATE INDEX idx_merchants_slug ON merchants(slug);
CREATE INDEX idx_merchants_network ON merchants(network);
CREATE INDEX idx_merchants_is_active ON merchants(is_active);
CREATE INDEX idx_merchants_categories ON merchants USING GIN(categories);

-- Create indexes for products
CREATE INDEX idx_products_merchant_id ON products(merchant_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_current_price ON products(current_price);

-- Create indexes for offers
CREATE INDEX idx_offers_merchant_id ON offers(merchant_id);
CREATE INDEX idx_offers_offer_code ON offers(offer_code);
CREATE INDEX idx_offers_offer_type ON offers(offer_type);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_start_date ON offers(start_date);
CREATE INDEX idx_offers_end_date ON offers(end_date);
CREATE INDEX idx_offers_is_verified ON offers(is_verified);
CREATE INDEX idx_offers_is_featured ON offers(is_featured);
CREATE INDEX idx_offers_categories ON offers USING GIN(categories);
CREATE INDEX idx_offers_tags ON offers USING GIN(tags);
CREATE INDEX idx_offers_discount_value ON offers(discount_value);

-- Create indexes for offer_snapshots
CREATE INDEX idx_offer_snapshots_offer_id ON offer_snapshots(offer_id);
CREATE INDEX idx_offer_snapshots_version ON offer_snapshots(offer_id, version);

-- Create indexes for url_analysis_results
CREATE INDEX idx_url_analysis_url_hash ON url_analysis_results(url_hash);
CREATE INDEX idx_url_analysis_merchant_id ON url_analysis_results(merchant_id);
CREATE INDEX idx_url_analysis_product_id ON url_analysis_results(product_id);
CREATE INDEX idx_url_analysis_offer_id ON url_analysis_results(offer_id);
CREATE INDEX idx_url_analysis_created_at ON url_analysis_results(created_at);

-- Create indexes for freshness_scores
CREATE INDEX idx_freshness_scores_entity ON freshness_scores(entity_type, entity_id);
CREATE INDEX idx_freshness_scores_expires_at ON freshness_scores(expires_at);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_affiliate_links_updated_at BEFORE UPDATE ON affiliate_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at BEFORE UPDATE ON merchants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE affiliate_links IS 'Stores normalized affiliate links with tracking and freshness scoring';
COMMENT ON TABLE merchants IS 'Merchant profiles with network integration and commission rules';
COMMENT ON TABLE products IS 'Product catalog extracted from affiliate links';
COMMENT ON TABLE offers IS 'Active offers with commission tracking and expiration monitoring';
COMMENT ON TABLE offer_snapshots IS 'Versioned snapshots of offer changes for historical tracking';
COMMENT ON TABLE url_analysis_results IS 'URL parsing and analysis results for affiliate link intake';
COMMENT ON TABLE freshness_scores IS 'Freshness scores for affiliate entities with expiration';
