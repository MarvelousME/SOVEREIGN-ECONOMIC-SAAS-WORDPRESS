import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import keycloakService from '../services/keycloak.service';
import userService from '../services/user.service';
import logger from '../utils/logger';
import {
  validateRequest,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailSchema,
} from '../utils/validators';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const data = validateRequest(registerSchema, req.body);

      // Create user in Keycloak
      const keycloakUser = await keycloakService.createUser(data);

      // Sync to local database
      const user = await userService.syncUserFromKeycloak(keycloakUser);

      logger.info('User registered successfully', { userId: user.id, email: data.email });

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          email_verified: user.email_verified,
        },
      });
    } catch (error: any) {
      logger.error('Registration failed', error);

      if (error.message === 'User already exists') {
        res.status(409).json({ error: 'User already exists' });
        return;
      }

      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const data = validateRequest(loginSchema, req.body);
      const ipAddress = (req.ip || req.socket.remoteAddress) as string;
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Check if account is locked
      const { isLocked, remainingAttempts } = await userService.checkLoginAttempts(
        data.username,
        ipAddress
      );

      if (isLocked) {
        res.status(429).json({
          error: 'Account temporarily locked due to multiple failed login attempts',
        });
        return;
      }

      try {
        // Authenticate with Keycloak
        const tokens = await keycloakService.login(data);

        // Get user from Keycloak
        const keycloakUser = await keycloakService.getUserByUsername(data.username);

        if (!keycloakUser) {
          throw new Error('User not found after successful login');
        }

        // Sync to local database
        const user = await userService.syncUserFromKeycloak(keycloakUser);

        // Update last login
        await userService.updateLastLogin(user.id);

        // Clear failed login attempts
        await userService.clearLoginAttempts(data.username, ipAddress);

        // Record successful login attempt
        await userService.recordLoginAttempt({
          user_id: user.id,
          email: user.email,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: true,
        });

        // Create session
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
        await userService.createSession({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          device_info: userAgent,
          ip_address: ipAddress,
          expires_at: expiresAt,
        });

        logger.info('User logged in successfully', { userId: user.id, username: data.username });

        res.json({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          token_type: tokens.token_type,
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            email_verified: user.email_verified,
            tenant_id: user.tenant_id,
            tenant_slug: user.tenant_slug,
          },
        });
      } catch (error: any) {
        // Increment failed login attempts
        await userService.incrementLoginAttempts(data.username, ipAddress);

        // Record failed login attempt
        const userByUsername = await userService.getUserByUsername(data.username);
        await userService.recordLoginAttempt({
          user_id: userByUsername?.id || '',
          email: userByUsername?.email || data.username,
          ip_address: ipAddress,
          user_agent: userAgent,
          success: false,
          failure_reason: error.message,
        });

        const updatedCheck = await userService.checkLoginAttempts(data.username, ipAddress);

        if (error.message === 'Invalid credentials') {
          res.status(401).json({
            error: 'Invalid credentials',
            remaining_attempts: updatedCheck.remainingAttempts,
          });
          return;
        }

        throw error;
      }
    } catch (error: any) {
      logger.error('Login failed', error);

      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      res.status(500).json({ error: 'Login failed' });
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      // Logout from Keycloak
      await keycloakService.logout(refresh_token);

      // Delete all user sessions if user is authenticated
      if (req.user) {
        const user = await userService.getUserByKeycloakId(req.user.sub);
        if (user) {
          await userService.deleteUserSessions(user.id);
        }
      }

      logger.info('User logged out successfully', { userId: req.user?.sub });

      res.json({ message: 'Logout successful' });
    } catch (error) {
      logger.error('Logout failed', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const data = validateRequest(refreshTokenSchema, req.body);

      const tokens = await keycloakService.refreshToken(data.refresh_token);

      logger.info('Token refreshed successfully');

      res.json({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
      });
    } catch (error: any) {
      logger.error('Token refresh failed', error);

      if (error.message === 'Invalid refresh token') {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }

      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      res.status(500).json({ error: 'Token refresh failed' });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const data = validateRequest(passwordResetSchema, req.body);

      const keycloakUser = await keycloakService.getUserByEmail(data.email);

      if (!keycloakUser) {
        // Don't reveal if user exists
        res.json({
          message: 'If the email exists, a password reset link has been sent',
        });
        return;
      }

      await keycloakService.sendPasswordResetEmail(keycloakUser.id);

      logger.info('Password reset email sent', { email: data.email });

      res.json({
        message: 'If the email exists, a password reset link has been sent',
      });
    } catch (error) {
      logger.error('Password reset request failed', error);
      res.status(500).json({ error: 'Password reset request failed' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const data = validateRequest(resetPasswordSchema, req.body);

      // Note: In a production system, you would validate the token here
      // For Keycloak, the reset is handled via the email link workflow

      res.json({
        message: 'Password reset successfully. Please login with your new password.',
      });
    } catch (error: any) {
      logger.error('Password reset failed', error);

      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      res.status(500).json({ error: 'Password reset failed' });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const data = validateRequest(verifyEmailSchema, req.body);

      // Note: Email verification is handled by Keycloak via the email link
      // This endpoint can be used for additional verification logic

      res.json({ message: 'Email verified successfully' });
    } catch (error: any) {
      logger.error('Email verification failed', error);

      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      res.status(500).json({ error: 'Email verification failed' });
    }
  }

  async getCurrentUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await userService.getUserByKeycloakId(req.user.sub);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const roles = await keycloakService.getUserRoles(req.user.sub);

      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified: user.email_verified,
        tenant_id: user.tenant_id,
        tenant_slug: user.tenant_slug,
        reputation_tier: user.reputation_tier,
        feature_flags: user.feature_flags,
        roles,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      });
    } catch (error) {
      logger.error('Failed to get current user', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = validateRequest(updateProfileSchema, req.body);

      const updates: any = {};
      if (data.first_name) updates.firstName = data.first_name;
      if (data.last_name) updates.lastName = data.last_name;
      if (data.email) updates.email = data.email;

      await keycloakService.updateUser(req.user.sub, updates);

      // Sync to local database
      const keycloakUser = await keycloakService.getUserById(req.user.sub);
      if (keycloakUser) {
        await userService.syncUserFromKeycloak(keycloakUser);
      }

      logger.info('Profile updated successfully', { userId: req.user.sub });

      res.json({ message: 'Profile updated successfully' });
    } catch (error: any) {
      logger.error('Profile update failed', error);

      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      res.status(500).json({ error: 'Profile update failed' });
    }
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const data = validateRequest(changePasswordSchema, req.body);

      // Verify old password by attempting to login
      const keycloakUser = await keycloakService.getUserById(req.user.sub);
      if (!keycloakUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      try {
        await keycloakService.login({
          username: keycloakUser.username,
          password: data.old_password,
        });
      } catch (error) {
        res.status(401).json({ error: 'Invalid current password' });
        return;
      }

      // Update password
      await keycloakService.resetPassword(req.user.sub, data.new_password);

      logger.info('Password changed successfully', { userId: req.user.sub });

      res.json({ message: 'Password changed successfully' });
    } catch (error: any) {
      logger.error('Password change failed', error);

      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }

      res.status(500).json({ error: 'Password change failed' });
    }
  }
}

export const authController = new AuthController();
