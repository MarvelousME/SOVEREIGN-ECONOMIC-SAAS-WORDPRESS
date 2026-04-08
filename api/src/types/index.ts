/**
 * Shared TypeScript types for the UBI CMS API
 * @version 1.0.0
 */

import { Request } from 'express';
import { QueryResult } from 'pg';

// ─── Auth / Request ──────────────────────────────────────────────────────────

export interface JwtPayload {
  userId: string;
  username: string;
  email?: string;
  roles: string[];
  tenantId?: string;
  iat?: number;
  exp?: number;
}

/** Express Request extended with the decoded JWT user */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  /** Optional OpenTelemetry span attached by tracingMiddleware */
  span?: {
    spanContext(): { traceId: string; spanId: string };
    setAttribute(key: string, value: string | number | boolean): void;
    setStatus(status: { code: number; message?: string }): void;
    end(): void;
  };
  traceId?: string;
  spanId?: string;
  session?: Record<string, unknown> & { csrfToken?: string };
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface SecurityConfig {
  corsOrigin: string | undefined;
  rateLimitWindow: number;
  rateLimitMax: number;
  bcryptRounds: number;
  jwtExpiry: string;
}

export interface DatabaseConfig {
  host: string;
  port: number | string;
  name: string;
  user: string;
  password: string | undefined;
}

export interface RedisConfig {
  host: string;
  port: number | string;
}

export interface NatsConfig {
  url: string;
}

export interface LoggingConfig {
  level: string;
  format: string;
}

export interface AppConfig {
  port: number | string;
  nodeEnv: string;
  security: SecurityConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  nats: NatsConfig;
  logging: LoggingConfig;
}

// ─── API Responses ───────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: Pagination;
}

// ─── Domain Models ───────────────────────────────────────────────────────────

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  password?: string;       // aliased from password_hash in queries
  roles: string[];
  status: string;
  wallet_address: string | null;
  kyc_verified: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;        // will be stored as password_hash
  roles?: string[];
}

export interface UpdateUserData {
  username: string | null;
  email: string | null;
  roles: string[] | null;
  wallet_address: string | null;
  kyc_verified: boolean | null;
  status: string | null;
}

export interface TaskRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  reward_amount: number;
  reward_currency: string;
  max_participants: number;
  current_participants: number;
  status: 'active' | 'completed' | 'cancelled';
  deadline: Date | null;
  proof_requirements: Record<string, unknown>;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateTaskData {
  title: string;
  description: string;
  category?: string;
  difficulty?: string;
  reward_amount: number;
  reward_currency?: string;
  max_participants?: number;
  deadline?: Date | string;
  proof_requirements?: Record<string, unknown>;
  created_by: string;
}

export interface AgentRecord {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  capability: string;
  endpoint: string;
  auth_type: string;
  pricing_model: string;
  price_per_call: number;
  status: 'active' | 'inactive' | 'suspended';
  rating: number;
  total_calls: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateAgentData {
  owner_id: string;
  name: string;
  description: string;
  capability: string;
  endpoint: string;
  auth_type?: string;
  pricing_model?: string;
  price_per_call?: number;
}

export interface AgentFilters {
  status?: string;
  capability?: string;
  search?: string;
}

export interface RewardRecord {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  type: string;
  source_type: string;
  source_id: string | null;
  status: string;
  processed_at: Date | null;
  created_at?: Date;
}

export interface CreateRewardData {
  user_id: string;
  amount: number;
  currency?: string;
  type: string;
  source_type: string;
  source_id?: string;
}

export interface TreasuryBalanceRecord {
  balance: number;
  currency: string;
}

export interface TreasuryTransactionRecord {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  currency: string;
  balance_after: number;
  metadata: Record<string, unknown>;
  created_at?: Date;
}

export interface TreasuryStrategyRecord {
  id: string;
  name: string;
  description: string;
  apy: number;
  risk_level: string;
  active: boolean;
}

export interface MarketplaceAppRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  publisher_id: string;
  publisher_username?: string;
  category: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  manifest: Record<string, unknown>;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateAppData {
  slug: string;
  name: string;
  description?: string;
  publisher_id: string;
  category?: string;
  version?: string;
  manifest?: Record<string, unknown>;
}

export interface UserAppInstallRecord {
  id: string;
  user_id: string;
  app_id: string;
  status: 'installed' | 'active' | 'disabled';
  installed_at?: Date;
  activated_at?: Date | null;
  slug?: string;
  name?: string;
  description?: string | null;
  category?: string;
  version?: string;
  app_status?: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  metadata: Record<string, unknown>;
  created_at?: Date;
}

export interface CreateNotificationData {
  user_id: string;
  title: string;
  body?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

// ─── Database helpers ────────────────────────────────────────────────────────

/** Re-export QueryResult for convenience */
export type { QueryResult };

export interface TaskFilters {
  status?: string;
  category?: string;
  difficulty?: string;
}

// ─── Audit types ─────────────────────────────────────────────────────────────

export type AuditLogType =
  | 'mutation'
  | 'authentication'
  | 'security'
  | 'policy_decision'
  | 'data_access'
  | 'admin_action'
  | 'treasury'
  | 'governance'
  | 'agent'
  | 'task'
  | 'consent'
  | 'export';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: AuditLogType;
  tenant_id: string | undefined;
  user_id: string | undefined;
  user_email: string | undefined;
  session_id: string | undefined;
  ip_address: string | undefined;
  user_agent: string | undefined;
  request: {
    method: string;
    path: string;
    query: unknown;
    body?: unknown;
  };
  data: unknown;
  hash: string | null;
}

export interface AuditLoggerOptions {
  logMutations?: boolean;
  logQueries?: boolean;
  logAuth?: boolean;
  logSecurity?: boolean;
  logPolicyDecisions?: boolean;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  sensitiveFields?: string[];
}

// ─── UBI ─────────────────────────────────────────────────────────────────────

export interface UbiBalance {
  balance: number;
  currency: string;
}

export interface UbiClaimResult {
  amount: number;
  currency: string;
  message: string;
}

export interface UbiPlatformStats {
  active_users: number;
  total_ubi_distributed: number;
  total_claims: number;
}

// ─── Env file manager ────────────────────────────────────────────────────────

export interface EnvFileInfo {
  id: string;
  exists: boolean;
  mtimeMs: number | null;
  size: number | null;
}

export interface EnvManifest {
  root: string;
  enabled: boolean;
  files: EnvFileInfo[];
}
