import { z } from 'zod';

// Execution Context
export interface ExecutionContext {
  agentId: string;
  executionId: string;
  userId: string;
  input: any;
  environment: Record<string, string>;
  permissions: string[];
  resourceLimits: ResourceLimits;
  memoryConfig: MemoryConfig;
}

// Resource Limits
export interface ResourceLimits {
  maxCpuCores: number;
  maxMemoryMB: number;
  maxStorageMB: number;
  maxApiCallsPerMinute: number;
  maxTokensPerDay: number;
  maxCostPerDay: number;
}

// Memory Configuration
export interface MemoryConfig {
  enableShortTerm: boolean;
  enableLongTerm: boolean;
  enableEpisodic: boolean;
  vectorDimension: number;
}

// Memory Types
export enum MemoryType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  EPISODIC = 'episodic',
  SHARED = 'shared'
}

// Memory Entry
export interface MemoryEntry {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  metadata: Record<string, any>;
  embedding?: number[];
  createdAt: Date;
  expiresAt?: Date;
}

// Artifact
export interface Artifact {
  id: string;
  agentId: string;
  executionId: string;
  name: string;
  type: string;
  path: string;
  size: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Execution State
export interface ExecutionState {
  agentId: string;
  executionId: string;
  state: Record<string, any>;
  checkpoint: number;
  createdAt: Date;
  updatedAt: Date;
}

// Execution Result
export interface ExecutionResult {
  executionId: string;
  status: 'success' | 'failure' | 'timeout';
  output?: any;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metrics: ExecutionMetrics;
  artifacts: string[];
}

// Execution Metrics
export interface ExecutionMetrics {
  startTime: Date;
  endTime: Date;
  durationMs: number;
  cpuUsagePercent: number;
  memoryUsageMB: number;
  storageUsageMB: number;
  apiCallsCount: number;
  tokensUsed: number;
  cost: number;
}

// Agent Runtime
export interface AgentRuntime {
  execute(context: ExecutionContext, code: string): Promise<ExecutionResult>;
  pause(executionId: string, options?: PauseOptions): Promise<PauseResult>;
  resume(executionId: string): Promise<void>;
  cancel(executionId: string): Promise<void>;
  isPaused(executionId: string): boolean;
  getCheckpoint(executionId: string): CheckpointData | undefined;
  on(event: 'pause:initiated' | 'pause:complete' | 'pause:timeout' | 'pause:force' | 'resume:initiated' | 'resume:complete' | 'execution:paused' | 'execution:resumed', listener: (data: any) => void): void;
}

// Memory Manager Interface
export interface MemoryManager {
  store(agentId: string, type: MemoryType, content: string, metadata?: Record<string, any>): Promise<string>;
  retrieve(agentId: string, type: MemoryType, query: string, limit?: number): Promise<MemoryEntry[]>;
  delete(agentId: string, memoryId: string): Promise<void>;
  clear(agentId: string, type?: MemoryType): Promise<void>;
}

// Storage Manager Interface
export interface StorageManager {
  upload(agentId: string, executionId: string, name: string, content: Buffer, metadata?: Record<string, any>): Promise<Artifact>;
  download(artifactId: string): Promise<Buffer>;
  delete(artifactId: string): Promise<void>;
  list(agentId: string, executionId?: string): Promise<Artifact[]>;
}

// Queue Message Types
export enum MessageType {
  EXECUTE_AGENT = 'execute_agent',
  PAUSE_AGENT = 'pause_agent',
  RESUME_AGENT = 'resume_agent',
  CANCEL_AGENT = 'cancel_agent',
  AGENT_COMPLETED = 'agent_completed',
  AGENT_FAILED = 'agent_failed'
}

export interface QueueMessage {
  type: MessageType;
  agentId: string;
  executionId: string;
  payload: any;
  timestamp: Date;
}

// Execution Request Schema
export const ExecutionRequestSchema = z.object({
  agentId: z.string().uuid(),
  input: z.any(),
  priority: z.number().min(0).max(10).default(5),
  timeout: z.number().min(1000).max(3600000).default(300000),
  metadata: z.record(z.any()).optional()
});

export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

// Agent Sandbox Configuration
export interface SandboxConfig {
  allowedModules: string[];
  allowedGlobals: string[];
  timeout: number;
  memoryLimit: number;
}

// Rate Limiter Interface
export interface RateLimiter {
  checkLimit(agentId: string, resource: string): Promise<boolean>;
  incrementUsage(agentId: string, resource: string, amount: number): Promise<void>;
  resetUsage(agentId: string, resource: string): Promise<void>;
  getCurrentUsage(agentId: string, resource: string): Promise<number>;
}

// Resource Snapshot
export interface ResourceSnapshot {
  timestamp: Date;
  cpuUsagePercent: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  storageUsedMB: number;
}

// Resource Usage Summary
export interface ResourceUsage {
  executionId: string;
  snapshots: ResourceSnapshot[];
  peakCpu: number;
  peakMemoryMB: number;
  avgCpu: number;
  avgMemoryMB: number;
}

export interface PauseOptions {
  timeout?: number;
  force?: boolean;
}

export interface PauseResult {
  checkpoint: CheckpointData;
  pausedAt: Date;
  wasForced: boolean;
}

// Checkpoint Version
export const CHECKPOINT_VERSION = 1;

export interface CheckpointData {
  version: number;
  executionId: string;
  agentId: string;
  userId: string;
  state: Record<string, any>;
  localVariables: Record<string, any>;
  pendingWorkQueue: PendingWorkItem[];
  executionPointer: number;
  createdAt: string;
  expiresAt?: string;
  checksum?: string;
}

export interface PendingWorkItem {
  id: string;
  type: string;
  data: any;
  priority: number;
  addedAt: string;
}

export interface CheckpointIntegrity {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CheckpointStorage {
  save(executionId: string, checkpoint: CheckpointData): Promise<void>;
  load(executionId: string): Promise<CheckpointData | null>;
  delete(executionId: string): Promise<void>;
  list(agentId?: string): Promise<CheckpointData[]>;
  validateIntegrity(checkpoint: CheckpointData): CheckpointIntegrity;
}
