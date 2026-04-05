import { v4 as uuidv4 } from 'uuid';
import db from '../utils/database';
import redis from '../utils/redis';
import logger from '../utils/logger';
import { User, KeycloakUser, LoginAttempt, Session } from '../types';
import config from '../config';

class UserService {
  async syncUserFromKeycloak(keycloakUser: KeycloakUser, tenantId?: string): Promise<User> {
    try {
      const existingUser = await this.getUserByKeycloakId(keycloakUser.id);

      const userData = {
        keycloak_id: keycloakUser.id,
        email: keycloakUser.email,
        username: keycloakUser.username,
        first_name: keycloakUser.firstName || '',
        last_name: keycloakUser.lastName || '',
        email_verified: keycloakUser.emailVerified,
        tenant_id: tenantId || keycloakUser.attributes?.tenant_id?.[0] || null,
        tenant_slug: keycloakUser.attributes?.tenant_slug?.[0] || null,
        reputation_tier: keycloakUser.attributes?.reputation_tier?.[0] || null,
        feature_flags: keycloakUser.attributes?.feature_flags
          ? JSON.parse(keycloakUser.attributes.feature_flags[0])
          : {},
        agent_owner_id: keycloakUser.attributes?.agent_owner_id?.[0] || null,
      };

      if (existingUser) {
        const [updatedUser] = await db.query<User>(
          `UPDATE users 
           SET email = $1, username = $2, first_name = $3, last_name = $4, 
               email_verified = $5, tenant_id = $6, tenant_slug = $7, 
               reputation_tier = $8, feature_flags = $9, agent_owner_id = $10,
               updated_at = NOW()
           WHERE keycloak_id = $11
           RETURNING *`,
          [
            userData.email,
            userData.username,
            userData.first_name,
            userData.last_name,
            userData.email_verified,
            userData.tenant_id,
            userData.tenant_slug,
            userData.reputation_tier,
            JSON.stringify(userData.feature_flags),
            userData.agent_owner_id,
            userData.keycloak_id,
          ]
        );

        logger.info('User synced from Keycloak (updated)', { userId: updatedUser.id });
        return updatedUser;
      } else {
        const [newUser] = await db.query<User>(
          `INSERT INTO users (
             id, keycloak_id, email, username, first_name, last_name,
             email_verified, tenant_id, tenant_slug, reputation_tier,
             feature_flags, agent_owner_id
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            uuidv4(),
            userData.keycloak_id,
            userData.email,
            userData.username,
            userData.first_name,
            userData.last_name,
            userData.email_verified,
            userData.tenant_id,
            userData.tenant_slug,
            userData.reputation_tier,
            JSON.stringify(userData.feature_flags),
            userData.agent_owner_id,
          ]
        );

        logger.info('User synced from Keycloak (created)', { userId: newUser.id });
        return newUser;
      }
    } catch (error) {
      logger.error('Failed to sync user from Keycloak', error);
      throw error;
    }
  }

  async getUserByKeycloakId(keycloakId: string): Promise<User | null> {
    try {
      const users = await db.query<User>('SELECT * FROM users WHERE keycloak_id = $1', [
        keycloakId,
      ]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Failed to get user by Keycloak ID', { keycloakId, error });
      throw error;
    }
  }

  async getUserById(id: string): Promise<User | null> {
    try {
      const users = await db.query<User>('SELECT * FROM users WHERE id = $1', [id]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Failed to get user by ID', { id, error });
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await db.query<User>('SELECT * FROM users WHERE email = $1', [email]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Failed to get user by email', { email, error });
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const users = await db.query<User>('SELECT * FROM users WHERE username = $1', [username]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      logger.error('Failed to get user by username', { username, error });
      throw error;
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
    try {
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [userId]);
      logger.info('Updated last login', { userId });
    } catch (error) {
      logger.error('Failed to update last login', { userId, error });
      throw error;
    }
  }

  async recordLoginAttempt(attempt: Omit<LoginAttempt, 'timestamp'>): Promise<void> {
    try {
      await db.query(
        `INSERT INTO login_attempts (
           id, user_id, email, ip_address, user_agent, success, failure_reason
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuidv4(),
          attempt.user_id,
          attempt.email,
          attempt.ip_address,
          attempt.user_agent,
          attempt.success,
          attempt.failure_reason || null,
        ]
      );

      logger.info('Login attempt recorded', { email: attempt.email, success: attempt.success });
    } catch (error) {
      logger.error('Failed to record login attempt', error);
      // Don't throw - this is a non-critical operation
    }
  }

  async checkLoginAttempts(email: string, ipAddress: string): Promise<{
    isLocked: boolean;
    remainingAttempts: number;
  }> {
    const lockKey = `login_lock:${email}:${ipAddress}`;
    const attemptKey = `login_attempts:${email}:${ipAddress}`;

    try {
      // Check if account is locked
      const lockStatus = await redis.get(lockKey);
      if (lockStatus) {
        return { isLocked: true, remainingAttempts: 0 };
      }

      // Get failed attempts count
      const attemptsStr = await redis.get(attemptKey);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

      const remainingAttempts = config.security.maxLoginAttempts - attempts;

      return {
        isLocked: false,
        remainingAttempts: Math.max(0, remainingAttempts),
      };
    } catch (error) {
      logger.error('Failed to check login attempts', { email, ipAddress, error });
      // In case of error, allow login (fail open)
      return { isLocked: false, remainingAttempts: config.security.maxLoginAttempts };
    }
  }

  async incrementLoginAttempts(email: string, ipAddress: string): Promise<void> {
    const attemptKey = `login_attempts:${email}:${ipAddress}`;
    const lockKey = `login_lock:${email}:${ipAddress}`;

    try {
      const attempts = await redis.incr(attemptKey);

      // Set expiry on first attempt (15 minutes)
      if (attempts === 1) {
        await redis.expire(attemptKey, 900);
      }

      // Lock account if max attempts exceeded
      if (attempts >= config.security.maxLoginAttempts) {
        const lockTimeSeconds = Math.floor(config.security.lockTime / 1000);
        await redis.set(lockKey, '1', lockTimeSeconds);
        logger.warn('Account locked due to multiple failed login attempts', {
          email,
          ipAddress,
          lockTimeSeconds,
        });
      }
    } catch (error) {
      logger.error('Failed to increment login attempts', { email, ipAddress, error });
    }
  }

  async clearLoginAttempts(email: string, ipAddress: string): Promise<void> {
    const attemptKey = `login_attempts:${email}:${ipAddress}`;

    try {
      await redis.del(attemptKey);
    } catch (error) {
      logger.error('Failed to clear login attempts', { email, ipAddress, error });
    }
  }

  async createSession(session: Omit<Session, 'id' | 'created_at' | 'last_activity'>): Promise<Session> {
    try {
      const [newSession] = await db.query<Session>(
        `INSERT INTO sessions (
           id, user_id, access_token, refresh_token, device_info, ip_address, expires_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          uuidv4(),
          session.user_id,
          session.access_token,
          session.refresh_token,
          session.device_info,
          session.ip_address,
          session.expires_at,
        ]
      );

      // Store session in Redis for fast lookup
      const sessionKey = `session:${newSession.id}`;
      await redis.set(
        sessionKey,
        JSON.stringify(newSession),
        Math.floor((session.expires_at.getTime() - Date.now()) / 1000)
      );

      logger.info('Session created', { sessionId: newSession.id, userId: session.user_id });
      return newSession;
    } catch (error) {
      logger.error('Failed to create session', error);
      throw error;
    }
  }

  async getSessionByAccessToken(accessToken: string): Promise<Session | null> {
    try {
      const sessions = await db.query<Session>('SELECT * FROM sessions WHERE access_token = $1', [
        accessToken,
      ]);
      return sessions.length > 0 ? sessions[0] : null;
    } catch (error) {
      logger.error('Failed to get session by access token', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
      await redis.del(`session:${sessionId}`);
      logger.info('Session deleted', { sessionId });
    } catch (error) {
      logger.error('Failed to delete session', { sessionId, error });
      throw error;
    }
  }

  async deleteUserSessions(userId: string): Promise<void> {
    try {
      const sessions = await db.query<Session>('SELECT id FROM sessions WHERE user_id = $1', [
        userId,
      ]);

      for (const session of sessions) {
        await redis.del(`session:${session.id}`);
      }

      await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      logger.info('All user sessions deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete user sessions', { userId, error });
      throw error;
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
      logger.info('Expired sessions cleaned up', { count: result.length });
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', error);
    }
  }
}

export const userService = new UserService();
export default userService;
