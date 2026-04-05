import { z } from 'zod';

// ==================== Common Types ====================

export interface ServiceConfig {
  name: string;
  version: string;
  port: number;
  env: 'development' | 'staging' | 'production';
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  min: number;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

export interface NatsConfig {
  url: string;
  clusterId?: string;
  reconnect: boolean;
  maxReconnectAttempts: number;
  reconnectTimeWait: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

export interface OpaConfig {
  url: string;
  timeout: number;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  correlationIdHeader: string;
}

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  otlpEndpoint: string;
  tracesSampleRate: number;
  metricInterval: number;
}

export interface CircuitBreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  rollingCountTimeout: number;
  rollingCountBuckets: number;
  name: string;
}

// ==================== Event Types ====================

export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  correlationId: string;
  causationId: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface UserCreatedEvent extends BaseEvent {
  eventType: 'user.created';
  data: {
    userId: string;
    email: string;
    username: string;
    roles: string[];
  };
}

export interface UserUpdatedEvent extends BaseEvent {
  eventType: 'user.updated';
  data: {
    userId: string;
    changes: Record<string, any>;
  };
}

export interface ProposalCreatedEvent extends BaseEvent {
  eventType: 'proposal.created';
  data: {
    proposalId: string;
    title: string;
    type: string;
    createdBy: string;
  };
}

export interface ProposalVotedEvent extends BaseEvent {
  eventType: 'proposal.voted';
  data: {
    proposalId: string;
    voterId: string;
    vote: 'yes' | 'no' | 'abstain';
    votingPower: number;
  };
}

export interface ProposalExecutedEvent extends BaseEvent {
  eventType: 'proposal.executed';
  data: {
    proposalId: string;
    executedBy: string;
    result: string;
  };
}

export interface UBIDistributionEvent extends BaseEvent {
  eventType: 'ubi.distribution';
  data: {
    distributionId: string;
    amount: number;
    currency: string;
    recipientCount: number;
  };
}

export interface TransactionCreatedEvent extends BaseEvent {
  eventType: 'transaction.created';
  data: {
    transactionId: string;
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency: string;
    type: string;
  };
}

export interface TaskCreatedEvent extends BaseEvent {
  eventType: 'task.created';
  data: {
    taskId: string;
    title: string;
    category: string;
    requiredSkills: string[];
    reward: number;
  };
}

export interface TaskAssignedEvent extends BaseEvent {
  eventType: 'task.assigned';
  data: {
    taskId: string;
    assigneeId: string;
  };
}

export interface TaskCompletedEvent extends BaseEvent {
  eventType: 'task.completed';
  data: {
    taskId: string;
    assigneeId: string;
    completedAt: string;
  };
}

export interface ReputationUpdatedEvent extends BaseEvent {
  eventType: 'reputation.updated';
  data: {
    userId: string;
    category: string;
    oldScore: number;
    newScore: number;
    reason: string;
  };
}

export interface NotificationEvent extends BaseEvent {
  eventType: 'notification.send';
  data: {
    userId: string;
    channel: 'email' | 'sms' | 'push' | 'in-app';
    template: string;
    data: Record<string, any>;
  };
}

// Union type of all events
export type DomainEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | ProposalCreatedEvent
  | ProposalVotedEvent
  | ProposalExecutedEvent
  | UBIDistributionEvent
  | TransactionCreatedEvent
  | TaskCreatedEvent
  | TaskAssignedEvent
  | TaskCompletedEvent
  | ReputationUpdatedEvent
  | NotificationEvent;

// ==================== API Types ====================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    requestId: string;
    timestamp: string;
    duration?: number;
  };
}

// ==================== Saga Types ====================

export interface SagaStep {
  name: string;
  execute: () => Promise<void>;
  compensate: () => Promise<void>;
}

export interface SagaContext {
  sagaId: string;
  correlationId: string;
  completedSteps: string[];
  data: Record<string, any>;
}

// ==================== Service Discovery ====================

export interface ServiceEndpoint {
  serviceName: string;
  version: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc';
  healthCheckPath: string;
  metadata?: Record<string, any>;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
      responseTime?: number;
    };
  };
}

// ==================== Validation Schemas ====================

export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const BaseEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  timestamp: z.string().datetime(),
  correlationId: z.string().uuid(),
  causationId: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional(),
});

// ==================== Tenant Isolation ====================

export interface TenantContext {
  tenantId: string;
  schema?: string;
  features: string[];
  limits: Record<string, number>;
}

export interface MultiTenantQuery {
  tenantId: string;
  isolationLevel: 'shared' | 'dedicated';
}
