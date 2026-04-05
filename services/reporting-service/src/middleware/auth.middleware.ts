import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return secret;
};

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Authorization header with Bearer token is required'
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as { id?: string; sub?: string; tenantId?: string };

    if (!decoded) {
      res.status(401).json({
        error: 'Invalid or expired token'
      });
      return;
    }

    const userId = decoded.id || decoded.sub;

    if (!userId) {
      res.status(401).json({
        error: 'Token missing user identifier'
      });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token expired', { error });
      res.status(401).json({
        error: 'Token has expired'
      });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid token', { error });
      res.status(401).json({
        error: 'Invalid token'
      });
      return;
    }
    logger.error('Auth middleware error', { error });
    res.status(401).json({
      error: 'Authentication failed'
    });
  }
};
