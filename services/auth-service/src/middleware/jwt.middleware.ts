import { Response, NextFunction } from 'express';
import { jwtVerify, createRemoteJWKSet, createLocalJWKSet, JWKSMultipleMatchingKeys } from 'jose';
import config from '../config';
import redis from '../utils/redis';
import keycloakService from '../services/keycloak.service';
import logger from '../utils/logger';
import { AuthRequest, DecodedToken } from '../types';

/**
 * Redis key prefix for the token blacklist.
 * Tokens are stored as: blacklist:<jti> → "1"  with TTL matching remaining token lifetime.
 */
const BLACKLIST_PREFIX = 'blacklist:';

/**
 * Build a JWKS verifier.
 *
 * Strategy (in priority order):
 *  1. Try Redis cache — if a valid JSON JWKS is found, build a local JWK set (no network).
 *  2. Fall back to the remote JWKS URL (jose's createRemoteJWKSet handles its own in-process
 *     cache automatically; here we layer an additional Redis cache on top so all pod instances
 *     share a single copy and survive a pod restart without hammering Keycloak).
 *
 * The cached document is refreshed by keycloakService.getJwks() which writes to Redis with a
 * 1-hour TTL (JWKS_CACHE_TTL_SECONDS = 3600).  On key-rotation events call
 * keycloakService.invalidateJwksCache() to force an immediate refresh.
 */
const REMOTE_JWKS = createRemoteJWKSet(
  new URL(`${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/certs`)
);

async function getJwksVerifier() {
  try {
    // Prefer the Redis-cached copy so all instances share it
    const jwks = await keycloakService.getJwks();
    // jwks is shaped like { keys: [...] }
    if (jwks && (jwks as any).keys) {
      return createLocalJWKSet(jwks as any);
    }
  } catch (_) {
    // Cache unavailable — fall through to remote
  }
  return REMOTE_JWKS;
}

/**
 * Check whether a token has been explicitly revoked (placed on the Redis blacklist).
 * We key on the JWT `jti` claim; if absent we fall back to a hash of the raw token.
 */
async function isBlacklisted(token: string, jti?: string): Promise<boolean> {
  try {
    const key = jti
      ? `${BLACKLIST_PREFIX}${jti}`
      : `${BLACKLIST_PREFIX}tok:${Buffer.from(token).toString('base64').substring(0, 32)}`;
    const val = await redis.get(key);
    return val !== null;
  } catch (_) {
    // Redis unavailable — fail open (do not block valid requests due to cache outage)
    logger.warn('Redis unavailable for blacklist check — failing open');
    return false;
  }
}

/**
 * Add a token to the Redis blacklist.
 * @param jti  JWT ID claim (preferred) or a token fingerprint
 * @param ttl  Remaining lifetime in seconds; after this the key auto-expires
 */
export async function blacklistToken(jti: string, ttl: number): Promise<void> {
  try {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    await redis.set(key, '1', ttl > 0 ? ttl : 1);
    logger.info('Token added to blacklist', { jti, ttl });
  } catch (error) {
    logger.error('Failed to blacklist token', { jti, error });
  }
}

/**
 * Primary authentication middleware.
 *
 * Validates a Keycloak-issued JWT by:
 *  1. Extracting the Bearer token from the Authorization header
 *  2. Verifying signature against cached/remote JWKS
 *  3. Checking the Redis token blacklist
 *  4. Attaching decoded claims (sub, email, preferred_username, realm_access.roles,
 *     tenant_id, tenant_slug, …) to req.user
 */
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
      const jwks = await getJwksVerifier();
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `${config.keycloak.url}/realms/${config.keycloak.realm}`,
        audience: config.keycloak.clientId,
      });

      // Blacklist check — uses jti when present
      const jti = payload.jti;
      if (await isBlacklisted(token, jti)) {
        logger.warn('Rejected blacklisted token', { jti, sub: payload.sub });
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }

      // Attach full decoded claims to request
      req.user = payload as DecodedToken;
      next();
    } catch (error: any) {
      if (error instanceof JWKSMultipleMatchingKeys) {
        // Key rotation in progress — invalidate cache and retry once with remote
        await keycloakService.invalidateJwksCache();
        logger.warn('JWKS multiple matching keys — cache invalidated', { error: error.message });
      } else {
        logger.warn('Token verification failed', { error: error.message });
      }
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('JWT middleware error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Role-based access control middleware factory.
 * At least one of the supplied roles must appear in realm_access.roles.
 */
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

/**
 * Optional authentication — attaches req.user when a valid token is present,
 * but never rejects the request.
 */
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

  getJwksVerifier()
    .then((jwks) =>
      jwtVerify(token, jwks, {
        issuer: `${config.keycloak.url}/realms/${config.keycloak.realm}`,
        audience: config.keycloak.clientId,
      })
    )
    .then(async ({ payload }) => {
      const jti = payload.jti;
      if (!(await isBlacklisted(token, jti))) {
        req.user = payload as DecodedToken;
      }
      next();
    })
    .catch(() => {
      // Invalid token in optional context — continue without user
      next();
    });
}
