import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return secret || 'development-secret-do-not-use-in-production';
};

export const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

export const verifyToken = (token: string, secret: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { error: (error as Error).message });
    }
    return null;
  }
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header',
    });
    return;
  }

  try {
    const secret = getJwtSecret();
    const payload = verifyToken(token, secret);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    if (!payload.id || !payload.email) {
      res.status(401).json({
        success: false,
        error: 'Invalid token payload',
      });
      return;
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role || 'user',
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error });
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);

  if (!token) {
    next();
    return;
  }

  try {
    const secret = getJwtSecret();
    const payload = verifyToken(token, secret);

    if (payload && payload.id && payload.email) {
      req.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role || 'user',
      };
    }
  } catch (error) {
    logger.error('Optional authentication error', { error });
  }

  next();
};

export type Role = 'user' | 'moderator' | 'admin';

const roleHierarchy: Record<Role, number> = {
  user: 1,
  moderator: 2,
  admin: 3,
};

export const hasPermission = (userRole: string, requiredRole: Role): boolean => {
  const userLevel = roleHierarchy[userRole as Role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const hasRequiredRole = roles.some((role) => hasPermission(req.user!.role, role));

    if (!hasRequiredRole) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireModerator = requireRole('moderator');
export const requireUser = requireRole('user');

export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn = '24h'): string => {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, { expiresIn });
};
