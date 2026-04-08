-- Rollback for Migration 015: landing_page_factory_schema
-- Reverses: landing_pages, page_versions, page_blocks, page_templates, page_disclosures, page_publish_targets

-- Drop tables in reverse order of creation (respecting foreign key dependencies)
DROP TABLE IF EXISTS page_publish_targets CASCADE;
DROP TABLE IF EXISTS page_disclosures CASCADE;
DROP TABLE IF EXISTS page_templates CASCADE;
DROP TABLE IF EXISTS page_blocks CASCADE;
DROP TABLE IF EXISTS page_versions CASCADE;
DROP TABLE IF EXISTS landing_pages CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS update_landing_page_updated_at();
