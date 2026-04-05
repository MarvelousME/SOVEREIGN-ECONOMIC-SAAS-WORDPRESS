import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const publicPaths = ['/health', '/api/v1/affiliate/analyze'];
  if (publicPaths.includes(req.path)) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    logger.debug('Missing authorization header', { path: req.path });
    res.status(401).json({
      success: false,
      error: 'Authorization required',
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Invalid authorization format',
    });
    return;
  }

  try {
    (req as any).userId = 'user-from-token';
    next();
  } catch (error) {
    logger.error('Auth error', { error });
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
}
