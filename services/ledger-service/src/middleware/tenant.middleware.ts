import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface TenantRequest extends Request {
  tenantId?: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return secret;
};

export const tenantMiddleware = (
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void => {
  const tenantIdHeader = req.headers['x-tenant-id'] as string | undefined;
  const authHeader = req.headers.authorization;

  let tenantId = tenantIdHeader;

  if (!tenantId && authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret) as { tenantId?: string };
      tenantId = decoded.tenantId;
    } catch {
      // Token invalid or no tenant claim, continue with header check
    }
  }

  if (!tenantId) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'x-tenant-id header is required'
    });
    return;
  }

  req.tenantId = tenantId;
  next();
};
