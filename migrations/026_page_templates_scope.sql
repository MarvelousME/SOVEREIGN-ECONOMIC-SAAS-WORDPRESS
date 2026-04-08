-- Add workspace scoping support to page templates
ALTER TABLE page_templates
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_page_templates_tenant_id ON page_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_page_templates_created_by ON page_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_page_templates_tenant_created_by ON page_templates(tenant_id, created_by);
