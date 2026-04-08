-- Rollback for Migration 026: page_templates_scope
-- Reverses: ADD COLUMN tenant_id and created_by to page_templates

-- Drop indexes
DROP INDEX IF EXISTS idx_page_templates_tenant_created_by;
DROP INDEX IF EXISTS idx_page_templates_created_by;
DROP INDEX IF EXISTS idx_page_templates_tenant_id;

-- Drop columns
ALTER TABLE page_templates
    DROP COLUMN IF EXISTS created_by,
    DROP COLUMN IF EXISTS tenant_id;
