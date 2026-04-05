import { Request, Response, NextFunction } from 'express';
import { Pool, PoolClient } from 'pg';

export const TENANT_SETTING_KEY = 'app.current_tenant_id';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      db?: Pool | PoolClient;
      getTenantDb: () => Promise<PoolClient>;
    }
  }
}

export async function setTenantContext(pool: Pool, tenantId: string): Promise<PoolClient> {
  const client = await pool.connect();
  try {
    await client.query(`SET LOCAL ${TENANT_SETTING_KEY} = $1`, [tenantId]);
    return client;
  } catch (error) {
    client.release();
    throw error;
  }
}

export function tenantIsolation(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId || req.user?.tenantId;

    if (!tenantId) {
      res.status(401).json({ success: false, error: 'Tenant context required' });
      return;
    }

    try {
      const tenantClient = await setTenantContext(pool, tenantId);

      req.db = tenantClient;
      req.getTenantDb = async (): Promise<PoolClient> => {
        if (!req.db || !(req.db as PoolClient).release) {
          return setTenantContext(pool, tenantId);
        }
        return req.db as PoolClient;
      };

      next();
    } catch (error) {
      console.error('Failed to set tenant context:', error);
      res.status(500).json({ success: false, error: 'Tenant context setup failed' });
    }
  };
}

export function releaseTenantClient(req: Request): void {
  if (req.db && 'release' in req.db) {
    (req.db as PoolClient).release();
    req.db = undefined;
  }
}
