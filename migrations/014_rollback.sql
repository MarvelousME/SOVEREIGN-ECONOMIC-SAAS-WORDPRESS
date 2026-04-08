-- Rollback for Migration 014: affiliate_intelligence_schema
-- Reverses: affiliate_links, merchants, products, offers, offer_snapshots, url_analysis_results, freshness_scores

-- Drop tables in reverse order of creation (respecting foreign key dependencies)
DROP TABLE IF EXISTS freshness_scores CASCADE;
DROP TABLE IF EXISTS url_analysis_results CASCADE;
DROP TABLE IF EXISTS offer_snapshots CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS merchants CASCADE;
DROP TABLE IF EXISTS affiliate_links CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_merchants_updated_at ON merchants;
DROP TRIGGER IF EXISTS update_affiliate_links_updated_at ON affiliate_links;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();
