import KcAdminClient from '@keycloak/keycloak-admin-client';
import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';
import {
  KeycloakUser,
  KeycloakTokenResponse,
  RegisterRequest,
  LoginRequest,
  SystemRole,
} from '../types';

class KeycloakService {
  private adminClient: KcAdminClient;
  private initialized: boolean = false;

  constructor() {
    this.adminClient = new KcAdminClient({
      baseUrl: config.keycloak.url,
      realmName: config.keycloak.realm,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.adminClient.auth({
        username: config.keycloak.adminUsername,
        password: config.keycloak.adminPassword,
        grantType: 'password',
        clientId: 'admin-cli',
      });

      this.initialized = true;
      logger.info('Keycloak admin client initialized');

      // Refresh token periodically (every 50 seconds, tokens expire in 60)
      setInterval(async () => {
        try {
          await this.adminClient.auth({
            username: config.keycloak.adminUsername,
            password: config.keycloak.adminPassword,
            grantType: 'password',
            clientId: 'admin-cli',
          });
        } catch (error) {
          logger.error('Failed to refresh Keycloak admin token', error);
        }
      }, 50000);
    } catch (error) {
      logger.error('Failed to initialize Keycloak admin client', error);
      throw error;
    }
  }

  async createUser(userData: RegisterRequest): Promise<KeycloakUser> {
    await this.ensureInitialized();

    try {
      const userId = await this.adminClient.users.create({
        realm: config.keycloak.realm,
        username: userData.username,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        enabled: true,
        emailVerified: false,
        attributes: {
          tenant_slug: userData.tenant_slug ? [userData.tenant_slug] : [],
        },
      });

      // Set password
      await this.adminClient.users.resetPassword({
        realm: config.keycloak.realm,
        id: userId.id,
        credential: {
          temporary: false,
          type: 'password',
          value: userData.password,
        },
      });

      // Assign default user role
      const userRole = await this.adminClient.roles.findOneByName({
        realm: config.keycloak.realm,
        name: SystemRole.USER,
      });

      if (userRole) {
        await this.adminClient.users.addRealmRoleMappings({
          realm: config.keycloak.realm,
          id: userId.id,
          roles: [{ id: userRole.id!, name: userRole.name! }],
        });
      }

      // Send verification email
      await this.sendVerificationEmail(userId.id);

      const user = await this.adminClient.users.findOne({
        realm: config.keycloak.realm,
        id: userId.id,
      });

      logger.info('User created in Keycloak', { userId: userId.id, username: userData.username });
      return user as KeycloakUser;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error('User already exists');
      }
      logger.error('Failed to create user in Keycloak', error);
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<KeycloakTokenResponse> {
    try {
      const tokenUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('client_id', config.keycloak.clientId);
      params.append('client_secret', config.keycloak.clientSecret);
      params.append('grant_type', 'password');
      params.append('username', credentials.username);
      params.append('password', credentials.password);

      const response = await axios.post<KeycloakTokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      logger.info('User logged in successfully', { username: credentials.username });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials');
      }
      logger.error('Login failed', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<KeycloakTokenResponse> {
    try {
      const tokenUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/token`;

      const params = new URLSearchParams();
      params.append('client_id', config.keycloak.clientId);
      params.append('client_secret', config.keycloak.clientSecret);
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);

      const response = await axios.post<KeycloakTokenResponse>(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error('Invalid refresh token');
      }
      logger.error('Token refresh failed', error);
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const logoutUrl = `${config.keycloak.url}/realms/${config.keycloak.realm}/protocol/openid-connect/logout`;

      const params = new URLSearchParams();
      params.append('client_id', config.keycloak.clientId);
      params.append('client_secret', config.keycloak.clientSecret);
      params.append('refresh_token', refreshToken);

      await axios.post(logoutUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<KeycloakUser | null> {
    await this.ensureInitialized();

    try {
      const user = await this.adminClient.users.findOne({
        realm: config.keycloak.realm,
        id: userId,
      });

      return user as KeycloakUser | null;
    } catch (error) {
      logger.error('Failed to get user by ID', { userId, error });
      return null;
    }
  }

  async getUserByUsername(username: string): Promise<KeycloakUser | null> {
    await this.ensureInitialized();

    try {
      const users = await this.adminClient.users.find({
        realm: config.keycloak.realm,
        username,
        exact: true,
      });

      return users.length > 0 ? (users[0] as KeycloakUser) : null;
    } catch (error) {
      logger.error('Failed to get user by username', { username, error });
      return null;
    }
  }

  async getUserByEmail(email: string): Promise<KeycloakUser | null> {
    await this.ensureInitialized();

    try {
      const users = await this.adminClient.users.find({
        realm: config.keycloak.realm,
        email,
        exact: true,
      });

      return users.length > 0 ? (users[0] as KeycloakUser) : null;
    } catch (error) {
      logger.error('Failed to get user by email', { email, error });
      return null;
    }
  }

  async updateUser(userId: string, updates: Partial<KeycloakUser>): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.adminClient.users.update(
        {
          realm: config.keycloak.realm,
          id: userId,
        },
        updates
      );

      logger.info('User updated in Keycloak', { userId });
    } catch (error) {
      logger.error('Failed to update user', { userId, error });
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.adminClient.users.del({
        realm: config.keycloak.realm,
        id: userId,
      });

      logger.info('User deleted from Keycloak', { userId });
    } catch (error) {
      logger.error('Failed to delete user', { userId, error });
      throw error;
    }
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.adminClient.users.resetPassword({
        realm: config.keycloak.realm,
        id: userId,
        credential: {
          temporary: false,
          type: 'password',
          value: newPassword,
        },
      });

      logger.info('Password reset successfully', { userId });
    } catch (error) {
      logger.error('Failed to reset password', { userId, error });
      throw error;
    }
  }

  async sendVerificationEmail(userId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.adminClient.users.executeActionsEmail({
        realm: config.keycloak.realm,
        id: userId,
        actions: ['VERIFY_EMAIL'],
        clientId: config.keycloak.clientId,
      });

      logger.info('Verification email sent', { userId });
    } catch (error) {
      logger.error('Failed to send verification email', { userId, error });
      throw error;
    }
  }

  async sendPasswordResetEmail(userId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      await this.adminClient.users.executeActionsEmail({
        realm: config.keycloak.realm,
        id: userId,
        actions: ['UPDATE_PASSWORD'],
        clientId: config.keycloak.clientId,
      });

      logger.info('Password reset email sent', { userId });
    } catch (error) {
      logger.error('Failed to send password reset email', { userId, error });
      throw error;
    }
  }

  async getUserRoles(userId: string): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const roles = await this.adminClient.users.listRealmRoleMappings({
        realm: config.keycloak.realm,
        id: userId,
      });

      return roles.map((role) => role.name!);
    } catch (error) {
      logger.error('Failed to get user roles', { userId, error });
      return [];
    }
  }

  async addUserRole(userId: string, roleName: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const role = await this.adminClient.roles.findOneByName({
        realm: config.keycloak.realm,
        name: roleName,
      });

      if (!role) {
        throw new Error(`Role not found: ${roleName}`);
      }

      await this.adminClient.users.addRealmRoleMappings({
        realm: config.keycloak.realm,
        id: userId,
        roles: [{ id: role.id!, name: role.name! }],
      });

      logger.info('Role added to user', { userId, roleName });
    } catch (error) {
      logger.error('Failed to add user role', { userId, roleName, error });
      throw error;
    }
  }

  async removeUserRole(userId: string, roleName: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const role = await this.adminClient.roles.findOneByName({
        realm: config.keycloak.realm,
        name: roleName,
      });

      if (!role) {
        throw new Error(`Role not found: ${roleName}`);
      }

      await this.adminClient.users.delRealmRoleMappings({
        realm: config.keycloak.realm,
        id: userId,
        roles: [{ id: role.id!, name: role.name! }],
      });

      logger.info('Role removed from user', { userId, roleName });
    } catch (error) {
      logger.error('Failed to remove user role', { userId, roleName, error });
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export const keycloakService = new KeycloakService();
export default keycloakService;
