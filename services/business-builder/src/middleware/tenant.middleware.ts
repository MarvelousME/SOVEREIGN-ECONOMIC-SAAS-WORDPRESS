import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { DEFAULT_WORKSPACE_ID } from '../constants/tenant';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * After authenticate: resolve workspace from X-Tenant-Id, JWT tenantId, or DEFAULT_WORKSPACE_ID.
 */
export function tenantContext() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const headerTenant =
      (req.headers['x-tenant-id'] as string | undefined)?.trim() ||
      (req.headers['x-workspace-id'] as string | undefined)?.trim();

    const fromJwt = (req.user as { tenantId?: string } | undefined)?.tenantId;

    const raw = headerTenant || fromJwt || process.env.DEFAULT_WORKSPACE_ID || DEFAULT_WORKSPACE_ID;

    if (!UUID_RE.test(raw)) {
      res.status(400).json({
        success: false,
        error: 'Invalid tenant/workspace id (expected UUID)',
      });
      return;
    }

    req.tenantId = raw.toLowerCase();
    next();
  };
}

/**
 * Non-default workspaces require a membership row (provision API adds members).
 */
export function requireTenantMembership(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const defaultId = (process.env.DEFAULT_WORKSPACE_ID || DEFAULT_WORKSPACE_ID).toLowerCase();
    if (tenantId === defaultId) {
      next();
      return;
    }

    try {
      const r = await pool.query(
        `SELECT 1 FROM tenant_workspace_members WHERE tenant_id = $1 AND user_id = $2`,
        [tenantId, userId]
      );
      if (r.rowCount === 0) {
        res.status(403).json({
          success: false,
          error: 'You are not a member of this workspace',
        });
        return;
      }
    } catch (e) {
      res.status(500).json({ success: false, error: 'Tenant membership check failed' });
      return;
    }

    next();
  };
}
