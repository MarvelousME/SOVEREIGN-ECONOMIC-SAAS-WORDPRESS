import { Request, Response, NextFunction } from 'express';

const UUID_V4_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enforce tenant scope at the API boundary.
 * Every CRM route must include x-tenant-id so all CRUD remains tenant-isolated.
 */
export function requireTenantContext(req: Request, res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'];
  const resolved = Array.isArray(tenantId) ? tenantId[0] : tenantId;

  if (!resolved || typeof resolved !== 'string') {
    res.status(400).json({ error: 'Tenant ID required via x-tenant-id header' });
    return;
  }

  const normalized = resolved.trim();
  if (!UUID_V4_LIKE.test(normalized)) {
    res.status(400).json({ error: 'Invalid tenant ID format in x-tenant-id header' });
    return;
  }

  next();
}

