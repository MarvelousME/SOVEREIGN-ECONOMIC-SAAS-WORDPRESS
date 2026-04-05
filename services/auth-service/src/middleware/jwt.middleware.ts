import { Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import config from '../config';
import logger from '../utils/logger';
import { AuthRequest, DecodedToken } from '../types';

const JWKS = createRemoteJWKSet(
  new URL(`${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/certs`)
);

export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${config.keycloak.url}/realms/${config.keycloak.realm}`,
        audience: config.keycloak.clientId,
      });

      req.user = payload as DecodedToken;
      next();
    } catch (error: any) {
      logger.warn('Token verification failed', { error: error.message });
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('JWT middleware error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userRoles = req.user.realm_access?.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      logger.warn('Insufficient permissions', {
        userId: req.user.sub,
        requiredRoles: roles,
        userRoles,
      });
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  jwtVerify(token, JWKS, {
    issuer: `${config.keycloak.url}/realms/${config.keycloak.realm}`,
    audience: config.keycloak.clientId,
  })
    .then(({ payload }) => {
      req.user = payload as DecodedToken;
      next();
    })
    .catch(() => {
      // Token is invalid, but this is optional auth so continue
      next();
    });
}
