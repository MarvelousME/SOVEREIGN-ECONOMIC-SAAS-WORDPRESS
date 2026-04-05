import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';

export interface TenantContext {
  tenantId: string;
  workspaceId?: string;
  userId?: string;
  roles?: string[];
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
    };

    req.tenantContext = {
      tenantId: decoded.tenantId,
      workspaceId: decoded.workspaceId,
      userId: decoded.userId,
      roles: decoded.roles,
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
    };

    req.tenantContext = {
      tenantId: decoded.tenantId,
      workspaceId: decoded.workspaceId,
      userId: decoded.userId,
      roles: decoded.roles,
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

  if (workspaceId && req.tenantContext) {
    req.tenantContext.workspaceId = workspaceId;
  }

  next();
}

export function generateToken(payload: {
  tenantId: string;
  workspaceId?: string;
  userId?: string;
  roles?: string[];
}): string {
  return jwt.sign(payload, config.app.jwtSecret, { expiresIn: '24h' });
}
