import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import logger from '../utils/logger';

export function extractTenant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next();
    return;
  }

  const tenantId = req.user.tenant_id;
  const tenantSlug = req.user.tenant_slug;

  if (tenantId && tenantSlug) {
    req.tenant = {
      id: tenantId,
      slug: tenantSlug,
    };

    logger.debug('Tenant extracted from token', { tenantId, tenantSlug });
  }

  next();
}

export function requireTenant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    logger.warn('Tenant required but not found', { userId: req.user?.sub });
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }

  next();
}
