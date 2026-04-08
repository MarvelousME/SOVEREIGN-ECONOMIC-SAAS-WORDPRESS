import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';

export interface TenantContext {
  tenantId: string;
  workspaceId?: string;
  userId?: string;
  roles?: string[];
  ssoAuthenticated?: boolean;
  region?: string;
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ success: false, error: 'Authorization header required' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ success: false, error: 'Invalid authorization format' });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.app.jwtSecret) as {
      tenantId: string;
      workspaceId?: string;
      userId?: string;
      roles?: string[];
      ssoAuthenticated?: boolean;
      sso?: boolean;
      region?: string;
    };

    req.tenantContext = {
      tenantId: decoded.tenantId,
      workspaceId: decoded.workspaceId,
      userId: decoded.userId,
      roles: decoded.roles,
      ssoAuthenticated: Boolean(decoded.ssoAuthenticated ?? decoded.sso),
      region: decoded.region,
    };

    next();
  } catch (error) {
    logger.warn('JWT verification failed', { error });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next();
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.app.jwtSecret) as {
      tenantId: string;
      workspaceId?: string;
      userId?: string;
      roles?: string[];
      ssoAuthenticated?: boolean;
      sso?: boolean;
      region?: string;
    };

    req.tenantContext = {
      tenantId: decoded.tenantId,
      workspaceId: decoded.workspaceId,
      userId: decoded.userId,
      roles: decoded.roles,
      ssoAuthenticated: Boolean(decoded.ssoAuthenticated ?? decoded.sso),
      region: decoded.region,
    };
  } catch (error) {
    logger.warn('Optional JWT verification failed', { error });
  }

  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!req.tenantContext.roles || !roles.some(role => req.tenantContext!.roles!.includes(role))) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function workspaceMiddleware(req: Request, res: Response, next: NextFunction): void {
  const workspaceId = req.headers['x-workspace-id'] as string || req.query.workspaceId as string;
  const region = (req.headers['x-region'] as string) || (req.query.region as string);

  if (workspaceId && req.tenantContext) {
    req.tenantContext.workspaceId = workspaceId;
  }
  if (region && req.tenantContext) {
    req.tenantContext.region = region;
  }

  next();
}

export function requireReportAccess(options?: { minRole?: string; requireSso?: boolean }) {
  const minRole = options?.minRole || 'analyst';
  const requireSso = options?.requireSso ?? false;
  const rank: Record<string, number> = { member: 1, analyst: 2, admin: 3, owner: 4 };

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const roles = req.tenantContext.roles || [];
    const maxRoleRank = roles.reduce((acc, role) => Math.max(acc, rank[role] || 0), 0);
    if (maxRoleRank < (rank[minRole] || rank.analyst)) {
      res.status(403).json({ success: false, error: 'Insufficient report access role' });
      return;
    }
    if (requireSso && !req.tenantContext.ssoAuthenticated) {
      res.status(403).json({ success: false, error: 'SSO authentication required for this report' });
      return;
    }
    next();
  };
}

export function generateToken(payload: {
  tenantId: string;
  workspaceId?: string;
  userId?: string;
  roles?: string[];
}): string {
  return jwt.sign(payload, config.app.jwtSecret, { expiresIn: '24h' });
}
