import { Request } from 'express';

export interface User {
  id: string;
  keycloak_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  tenant_id: string | null;
  tenant_slug: string | null;
  reputation_tier: string | null;
  feature_flags: Record<string, boolean>;
  agent_owner_id: string | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

export interface KeycloakUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  enabled: boolean;
  attributes?: Record<string, string[]>;
  createdTimestamp?: number;
}

export interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  'not-before-policy'?: number;
  session_state?: string;
  scope?: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  email_verified: boolean;
  preferred_username: string;
  given_name: string;
  family_name: string;
  tenant_id?: string;
  tenant_slug?: string;
  reputation_tier?: string;
  feature_flags?: Record<string, boolean>;
  agent_owner_id?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  exp: number;
  iat: number;
  iss: string;
}

export interface AuthRequest extends Request {
  user?: DecodedToken;
  tenant?: {
    id: string;
    slug: string;
  };
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  tenant_slug?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface LoginAttempt {
  user_id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason?: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  device_info: string;
  ip_address: string;
  expires_at: Date;
  created_at: Date;
  last_activity: Date;
}

export interface UserRole {
  user_id: string;
  role_name: string;
  tenant_id?: string;
  assigned_at: Date;
}

export enum SystemRole {
  ADMIN = 'admin',
  USER = 'user',
  AGENT_CREATOR = 'agent_creator',
  TREASURY_ADMIN = 'treasury_admin',
  UBI_ADMIN = 'ubi_admin',
}

export interface KeycloakConfig {
  url: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  adminUsername: string;
  adminPassword: string;
}

export interface JWTConfig {
  secret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export interface SecurityConfig {
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockTime: number;
  sessionTimeout: number;
}
