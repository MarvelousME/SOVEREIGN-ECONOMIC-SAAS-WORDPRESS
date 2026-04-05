import { VM } from 'vm2';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import config from '../config';
import logger from '../utils/logger';
import memoryManager from '../memory/MemoryManager';
import storageManager from '../storage/StorageManager';
import checkpointStorage from '../storage/CheckpointStorage';
import {
  AgentRuntime,
  ExecutionContext,
  ExecutionResult,
  ExecutionMetrics,
  MemoryType,
  ResourceSnapshot,
  ResourceUsage,
  PauseOptions,
  PauseResult,
  CheckpointData,
  CHECKPOINT_VERSION,
  PendingWorkItem,
} from '../types';
import { agentFetch, RateLimiter, rateLimiter } from './RateLimiter';
import { CostTracker } from './CostTracker';

export interface LLMCallEvent {
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: Date;
}

export interface APICallEvent {
  provider: string;
  endpoint: string;
  timestamp: Date;
  success: boolean;
}

export interface ActiveExecution {
  vm: VM;
  startTime: Date;
  timeout: NodeJS.Timeout;
  resourceSnapshots: ResourceSnapshot[];
  initialCpuUsage: number;
  initialMemoryUsage: number;
  storageBaseline: number;
  context: ExecutionContext;
  code: string;
  isPaused: boolean;
  pauseDeferred?: {
    promise: Promise<PauseResult>;
    resolve: (result: PauseResult) => void;
    reject: (error: Error) => void;
  };
  checkpoint?: CheckpointData;
  pendingWorkQueue: PendingWorkItem[];
  localVariables: Record<string, any>;
  executionPointer: number;
  signalHandlers: {
    sigterm?: () => void;
    sigint?: () => void;
  };
  checkpointInterval?: NodeJS.Timeout;
  costTracker: CostTracker;
  llmCalls: LLMCallEvent[];
  apiCalls: APICallEvent[];
}

export class ResourceTracker {
  private previousCpuInfo: os.CpuInfo[];
  private previousCpuTimes: { user: number; system: number } | null = null;

  constructor() {
    this.previousCpuInfo = os.cpus();
  }

  getSnapshot(): ResourceSnapshot {
    const timestamp = new Date();
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    const cpuUsage = this.calculateCpuUsage(cpus);
    const memoryUsageMB = Math.round((usedMem / 1024 / 1024) * 100) / 100;
    const totalMemoryMB = Math.round((totalMem / 1024 / 1024) * 100) / 100;

    return {
      timestamp,
      cpuUsagePercent: cpuUsage,
      memoryUsedMB: memoryUsageMB,
      memoryTotalMB: totalMemoryMB,
      storageUsedMB: 0,
    };
  }

  private calculateCpuUsage(cpus: os.CpuInfo[]): number {
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof os.CpuInfo['times']];
      }
      totalIdle += cpu.times.idle;
    }

    if (this.previousCpuInfo.length === 0) {
      this.previousCpuInfo = cpus;
      return 0;
    }

    let prevTotalIdle = 0;
    let prevTotalTick = 0;

    for (const cpu of this.previousCpuInfo) {
      for (const type in cpu.times) {
        prevTotalTick += cpu.times[type as keyof os.CpuInfo['times']];
      }
      prevTotalIdle += cpu.times.idle;
    }

    const totalIdleDiff = totalIdle - prevTotalIdle;
    const totalTickDiff = totalTick - prevTotalTick;

    this.previousCpuInfo = cpus;

    if (totalTickDiff === 0) return 0;

    const usage = 100 - (100 * totalIdleDiff / totalTickDiff);
    return Math.round(usage * 100) / 100;
  }

  async getStorageUsage(agentId: string, executionId?: string): Promise<number> {
    try {
      const storagePath = config.storage.localPath;
      const agentStoragePath = path.join(storagePath, agentId, executionId || '');
      
      if (!fs.existsSync(agentStoragePath)) {
        return 0;
      }

      const size = await this.getDirectorySize(agentStoragePath);
      return Math.round((size / 1024 / 1024) * 100) / 100;
    } catch (error) {
      logger.warn('Failed to get storage usage', { agentId, executionId, error });
      return 0;
    }
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          size += await this.getDirectorySize(fullPath);
        } else {
          const stats = fs.statSync(fullPath);
          size += stats.size;
        }
      }
    } catch (error) {
      logger.debug('Error calculating directory size', { dirPath, error });
    }

    return size;
  }
}

export class AgentRuntimeImpl extends EventEmitter implements AgentRuntime {
  private activeExecutions: Map<string, ActiveExecution>;
  private resourceTracker: ResourceTracker;
  private pollingIntervals: Map<string, NodeJS.Timeout>;
  private defaultPauseTimeout: number = 30000;

  constructor() {
    super();
    this.activeExecutions = new Map();
    this.resourceTracker = new ResourceTracker();
    this.pollingIntervals = new Map();
  }

  private startResourcePolling(executionId: string, intervalMs: number = 1000): void {
    const interval = setInterval(() => {
      const execution = this.activeExecutions.get(executionId);
      if (execution) {
        const snapshot = this.resourceTracker.getSnapshot();
        execution.resourceSnapshots.push(snapshot);
      }
    }, intervalMs);

    this.pollingIntervals.set(executionId, interval);
  }

  private stopResourcePolling(executionId: string): void {
    const interval = this.pollingIntervals.get(executionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(executionId);
    }
  }

  private startCheckpointInterval(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) return;

    execution.checkpointInterval = setInterval(async () => {
      try {
        const checkpoint = this.createCheckpoint(execution);
        await checkpointStorage.save(executionId, checkpoint);
        logger.debug('Periodic checkpoint saved', { executionId });
      } catch (error) {
        logger.error('Failed to create periodic checkpoint', { executionId, error });
      }
    }, config.execution.checkpointInterval);
  }

  private stopCheckpointInterval(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution?.checkpointInterval) {
      clearInterval(execution.checkpointInterval);
      execution.checkpointInterval = undefined;
    }
  }

  async execute(context: ExecutionContext, code: string): Promise<ExecutionResult> {
    return this.executeInternal(context, code, null);
  }

  private async executeInternal(
    context: ExecutionContext,
    code: string,
    checkpoint: CheckpointData | null
  ): Promise<ExecutionResult> {
    const startTime = new Date();
    const initialSnapshot = this.resourceTracker.getSnapshot();
    const isResumed = checkpoint !== null;
    const costTracker = new CostTracker();
    const llmCalls: LLMCallEvent[] = [];
    const apiCalls: APICallEvent[] = [];

    logger.info(isResumed ? 'Resuming agent execution' : 'Starting agent execution', {
      agentId: context.agentId,
      executionId: context.executionId,
      resumedFromCheckpoint: isResumed,
    });

    try {
      const sandbox = this.createSandbox(context, costTracker, llmCalls, apiCalls);
      const vm = new VM({
        timeout: config.execution.defaultTimeout,
        sandbox,
        eval: false,
        wasm: false,
      });

      const timeout = setTimeout(() => {
        this.cancel(context.executionId);
      }, config.execution.defaultTimeout);

      const initialStorage = await this.resourceTracker.getStorageUsage(
        context.agentId,
        context.executionId
      );

      let localVariables: Record<string, any> = {};
      let pendingWorkQueue: PendingWorkItem[] = [];
      let executionPointer = 0;

      if (checkpoint) {
        localVariables = checkpoint.localVariables || {};
        pendingWorkQueue = checkpoint.pendingWorkQueue || [];
        executionPointer = checkpoint.executionPointer || 0;
      }

      const activeExecution: ActiveExecution = {
        vm,
        startTime,
        timeout,
        resourceSnapshots: [initialSnapshot],
        initialCpuUsage: initialSnapshot.cpuUsagePercent,
        initialMemoryUsage: initialSnapshot.memoryUsedMB,
        storageBaseline: initialStorage,
        context,
        code,
        isPaused: false,
        pendingWorkQueue,
        localVariables,
        executionPointer,
        signalHandlers: {},
        costTracker,
        llmCalls,
        apiCalls,
      };

      this.activeExecutions.set(context.executionId, activeExecution);
      this.setupSignalHandlers(activeExecution);
      this.startResourcePolling(context.executionId, 1000);
      this.startCheckpointInterval(context.executionId);

      const result = await this.executeInSandbox(vm, code, context);

      this.stopCheckpointInterval(context.executionId);
      this.stopResourcePolling(context.executionId);
      clearTimeout(timeout);

      await checkpointStorage.delete(context.executionId);

      const endSnapshot = this.resourceTracker.getSnapshot();
      const finalStorage = await this.resourceTracker.getStorageUsage(
        context.agentId,
        context.executionId
      );

      const execution = this.activeExecutions.get(context.executionId);
      const metrics = this.calculateMetrics(
        context.agentId,
        context.environment?.model,
        startTime,
        new Date(),
        execution?.resourceSnapshots || [],
        initialSnapshot,
        endSnapshot,
        initialStorage,
        finalStorage,
        costTracker
      );

      this.activeExecutions.delete(context.executionId);

      logger.info('Agent execution completed successfully', {
        agentId: context.agentId,
        executionId: context.executionId,
        durationMs: metrics.durationMs,
        cpuUsagePercent: metrics.cpuUsagePercent,
        memoryUsageMB: metrics.memoryUsageMB,
      });

      return {
        executionId: context.executionId,
        status: 'success',
        output: result,
        metrics,
        artifacts: [],
      };
    } catch (error: any) {
      this.stopCheckpointInterval(context.executionId);
      this.stopResourcePolling(context.executionId);
      this.cleanupExecution(context.executionId);
      const endTime = new Date();
      const endSnapshot = this.resourceTracker.getSnapshot();
      const finalStorage = await this.resourceTracker.getStorageUsage(
        context.agentId,
        context.executionId
      );

      const execution = this.activeExecutions.get(context.executionId);
      const metrics = this.calculateMetrics(
        context.agentId,
        context.environment?.model,
        startTime,
        endTime,
        execution?.resourceSnapshots || [],
        initialSnapshot,
        endSnapshot,
        initialSnapshot.memoryUsedMB,
        finalStorage,
        costTracker
      );

      logger.error('Agent execution failed', {
        agentId: context.agentId,
        executionId: context.executionId,
        error: error.message,
      });

      return {
        executionId: context.executionId,
        status: 'failure',
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
        metrics,
        artifacts: [],
      };
    }
  }

  async pause(executionId: string, options?: PauseOptions): Promise<PauseResult> {
    const timeout = options?.timeout ?? this.defaultPauseTimeout;
    const force = options?.force ?? false;

    logger.info('Pausing execution', { executionId, timeout, force });

    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.isPaused) {
      throw new Error(`Execution already paused: ${executionId}`);
    }

    this.emit('pause:initiated', { executionId, agentId: execution.context.agentId, timeout, force });

    clearTimeout(execution.timeout);
    this.stopResourcePolling(executionId);
    this.stopCheckpointInterval(executionId);
    execution.isPaused = true;

    const checkpoint = this.createCheckpoint(execution);

    try {
      await checkpointStorage.save(executionId, checkpoint);
      logger.info('Checkpoint persisted to storage', { executionId });
    } catch (error) {
      logger.error('Failed to persist checkpoint', { executionId, error });
    }

    const pauseResult: PauseResult = {
      checkpoint,
      pausedAt: new Date(),
      wasForced: force,
    };

    execution.checkpoint = checkpoint;

    this.emit('pause:complete', { executionId, checkpoint });

    if (execution.pauseDeferred) {
      execution.pauseDeferred.resolve(pauseResult);
    }

    return pauseResult;
  }

  async resume(executionId: string): Promise<void> {
    logger.info('Resuming execution', { executionId });

    let execution = this.activeExecutions.get(executionId);
    
    let checkpoint: CheckpointData | null = null;
    
    if (execution) {
      if (!execution.isPaused) {
        throw new Error(`Execution not paused: ${executionId}`);
      }
      
      if (execution.checkpoint) {
        checkpoint = execution.checkpoint;
      }
    } else {
      checkpoint = await checkpointStorage.load(executionId);
      if (!checkpoint) {
        throw new Error(`No checkpoint found for execution: ${executionId}`);
      }
      
      const integrity = checkpointStorage.validateIntegrity(checkpoint);
      if (!integrity.isValid) {
        logger.error('Checkpoint integrity check failed', {
          executionId,
          errors: integrity.errors,
          warnings: integrity.warnings,
        });
        throw new Error(`Checkpoint integrity failed: ${integrity.errors.join(', ')}`);
      }
      
      logger.info('Resuming from stored checkpoint', { executionId });
    }

    this.emit('resume:initiated', { executionId, agentId: checkpoint?.agentId });

    if (execution && checkpoint) {
      this.restoreFromCheckpoint(execution, checkpoint);
      execution.isPaused = false;
      execution.checkpoint = undefined;
      this.startResourcePolling(executionId, 1000);
      this.startCheckpointInterval(executionId);
    }

    this.emit('resume:complete', { executionId });

    logger.info('Execution resumed', { executionId });
  }

  async resumeFromCheckpoint(executionId: string): Promise<ExecutionResult> {
    logger.info('Resuming execution from checkpoint', { executionId });

    const checkpoint = await checkpointStorage.load(executionId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for execution: ${executionId}`);
    }

    const integrity = checkpointStorage.validateIntegrity(checkpoint);
    const hasWarnings = integrity.warnings.length > 0;

    if (!integrity.isValid) {
      logger.error('Checkpoint integrity check failed - cannot resume', {
        executionId,
        errors: integrity.errors,
      });
      throw new Error(`Checkpoint integrity failed: ${integrity.errors.join(', ')}`);
    }

    if (hasWarnings) {
      logger.warn('Checkpoint has warnings', {
        executionId,
        warnings: integrity.warnings,
      });
    }

    const partialCorruption = integrity.warnings.some(w =>
      w.includes('Missing local variables') || w.includes('Missing pending work queue')
    );

    if (partialCorruption) {
      logger.warn('Checkpoint has partial corruption - some state may be lost', {
        executionId,
        warnings: integrity.warnings,
      });
    }

    const context: ExecutionContext = {
      agentId: checkpoint.agentId,
      executionId: checkpoint.executionId,
      userId: checkpoint.userId,
      input: checkpoint.state?.input || {},
      environment: checkpoint.state?.environment || {},
      permissions: checkpoint.state?.permissions || [],
      resourceLimits: checkpoint.state?.resourceLimits || {
        maxCpuCores: 1,
        maxMemoryMB: 512,
        maxStorageMB: 1024,
        maxApiCallsPerMinute: 60,
        maxTokensPerDay: 100000,
        maxCostPerDay: 10,
      },
      memoryConfig: checkpoint.state?.memoryConfig || {
        enableShortTerm: true,
        enableLongTerm: true,
        enableEpisodic: false,
        vectorDimension: 1536,
      },
    };

    await checkpointStorage.delete(executionId);

    return this.executeInternal(context, checkpoint.state?.code || '', checkpoint);
  }

  async cancel(executionId: string): Promise<void> {
    logger.info('Cancelling execution', { executionId });

    this.cleanupExecution(executionId);
    await checkpointStorage.delete(executionId);
  }

  isPaused(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    return execution?.isPaused ?? false;
  }

  getCheckpoint(executionId: string): CheckpointData | undefined {
    return this.activeExecutions.get(executionId)?.checkpoint;
  }

  private calculateMetrics(
    agentId: string,
    model: string | undefined,
    startTime: Date,
    endTime: Date,
    snapshots: ResourceSnapshot[],
    initialSnapshot: ResourceSnapshot,
    finalSnapshot: ResourceSnapshot,
    initialStorage: number,
    finalStorage: number,
    costTracker: CostTracker
  ): ExecutionMetrics {
    const durationMs = endTime.getTime() - startTime.getTime();
    costTracker.setComputeTime(durationMs);

    let avgCpuUsage = 0;
    let peakMemoryUsage = initialSnapshot.memoryUsedMB;

    if (snapshots.length > 0) {
      let totalCpu = 0;
      for (const snapshot of snapshots) {
        totalCpu += snapshot.cpuUsagePercent;
        if (snapshot.memoryUsedMB > peakMemoryUsage) {
          peakMemoryUsage = snapshot.memoryUsedMB;
        }
      }
      avgCpuUsage = Math.round((totalCpu / snapshots.length) * 100) / 100;
      peakMemoryUsage = Math.round(peakMemoryUsage * 100) / 100;
    }

    const memoryDelta = Math.max(0, finalSnapshot.memoryUsedMB - initialSnapshot.memoryUsedMB);
    const memoryUsageMB = Math.round(memoryDelta * 100) / 100;

    const storageDelta = Math.max(0, finalStorage - initialStorage);
    const storageUsageMB = Math.round(storageDelta * 100) / 100;

    const costSummary = costTracker.getCostSummary(model);

    return {
      startTime,
      endTime,
      durationMs,
      cpuUsagePercent: avgCpuUsage,
      memoryUsageMB,
      storageUsageMB,
      apiCallsCount: costTracker.getState().apiCalls,
      tokensUsed: costTracker.getState().tokenUsage.totalTokens,
      cost: costSummary.totalCost,
    };
  }

  getResourceUsage(executionId: string): ResourceUsage | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return null;
    }

    return {
      executionId,
      snapshots: execution.resourceSnapshots,
      peakCpu: Math.max(...execution.resourceSnapshots.map(s => s.cpuUsagePercent), 0),
      peakMemoryMB: Math.max(...execution.resourceSnapshots.map(s => s.memoryUsedMB), 0),
      avgCpu: execution.resourceSnapshots.length > 0
        ? execution.resourceSnapshots.reduce((sum, s) => sum + s.cpuUsagePercent, 0) / execution.resourceSnapshots.length
        : 0,
      avgMemoryMB: execution.resourceSnapshots.length > 0
        ? execution.resourceSnapshots.reduce((sum, s) => sum + s.memoryUsedMB, 0) / execution.resourceSnapshots.length
        : 0,
    };
  }

  getActiveExecutionsCount(): number {
    return this.activeExecutions.size;
  }

  getResourceTracker(): ResourceTracker {
    return this.resourceTracker;
  }

  getExecutionCost(executionId: string): { totalCost: number; breakdown: ReturnType<CostTracker['calculateCost']> } | null {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return null;
    }
    const breakdown = execution.costTracker.calculateCost();
    return {
      totalCost: breakdown.totalCost,
      breakdown,
    };
  }

  private recordLLMCall(executionId: string, model: string, inputTokens: number, outputTokens: number): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.llmCalls.push({
        model,
        inputTokens,
        outputTokens,
        timestamp: new Date(),
      });
      execution.costTracker.addTokens(inputTokens, outputTokens, model);
    }
  }

  private recordAPICall(
    executionId: string,
    provider: string,
    endpoint: string,
    success: boolean
  ): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.apiCalls.push({
        provider,
        endpoint,
        timestamp: new Date(),
        success,
      });
      execution.costTracker.incrementApiCalls(provider);
    }
  }

  private createCheckpoint(execution: ActiveExecution): CheckpointData {
    return {
      version: CHECKPOINT_VERSION,
      executionId: execution.context.executionId,
      agentId: execution.context.agentId,
      userId: execution.context.userId,
      state: {
        isPaused: true,
        pausedAt: new Date().toISOString(),
        input: execution.context.input,
        environment: execution.context.environment,
        permissions: execution.context.permissions,
        resourceLimits: execution.context.resourceLimits,
        memoryConfig: execution.context.memoryConfig,
        code: execution.code,
      },
      localVariables: { ...execution.localVariables },
      pendingWorkQueue: [...execution.pendingWorkQueue],
      executionPointer: execution.executionPointer,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      checksum: this.generateCheckpointChecksum(execution),
    };
  }

  private restoreFromCheckpoint(execution: ActiveExecution, checkpoint: CheckpointData): void {
    execution.executionPointer = checkpoint.executionPointer;
    execution.localVariables = { ...checkpoint.localVariables };
    execution.pendingWorkQueue = [...checkpoint.pendingWorkQueue];

    if (execution.vm && execution.vm.sandbox) {
      execution.vm.sandbox._checkpointState = checkpoint.state;
      execution.vm.sandbox._executionPointer = checkpoint.executionPointer;
    }
  }

  private generateCheckpointChecksum(execution: ActiveExecution): string {
    const data = JSON.stringify({
      executionPointer: execution.executionPointer,
      localVariables: execution.localVariables,
      pendingWorkQueue: execution.pendingWorkQueue,
      timestamp: Date.now(),
    });

    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  private calculateResourceSnapshot(execution: ActiveExecution): { cpuUsagePercent: number; memoryUsageMB: number; apiCallsCount: number; tokensUsed: number } {
    const latestSnapshot = execution.resourceSnapshots[execution.resourceSnapshots.length - 1];

    return {
      cpuUsagePercent: latestSnapshot?.cpuUsagePercent ?? 0,
      memoryUsageMB: latestSnapshot?.memoryUsedMB ?? 0,
      apiCallsCount: 0,
      tokensUsed: 0,
    };
  }

  private setupSignalHandlers(execution: ActiveExecution): void {
    const sigtermHandler = async () => {
      logger.info('Received SIGTERM, initiating graceful pause', { executionId: execution.context.executionId });
      try {
        await this.pause(execution.context.executionId, { timeout: 5000, force: true });
        this.emit('execution:paused', { executionId: execution.context.executionId, reason: 'SIGTERM' });
      } catch (error: any) {
        logger.error('SIGTERM pause failed', { executionId: execution.context.executionId, error: error.message });
      }
    };

    const sigintHandler = async () => {
      logger.info('Received SIGINT, initiating graceful pause', { executionId: execution.context.executionId });
      try {
        await this.pause(execution.context.executionId, { timeout: 5000, force: true });
        this.emit('execution:paused', { executionId: execution.context.executionId, reason: 'SIGINT' });
      } catch (error: any) {
        logger.error('SIGINT pause failed', { executionId: execution.context.executionId, error: error.message });
      }
    };

    execution.signalHandlers.sigterm = sigtermHandler;
    execution.signalHandlers.sigint = sigintHandler;

    process.on('SIGTERM', sigtermHandler);
    process.on('SIGINT', sigintHandler);
  }

  private removeSignalHandlers(execution: ActiveExecution): void {
    if (execution.signalHandlers.sigterm) {
      process.off('SIGTERM', execution.signalHandlers.sigterm);
    }
    if (execution.signalHandlers.sigint) {
      process.off('SIGINT', execution.signalHandlers.sigint);
    }
    execution.signalHandlers = {};
  }

  private cleanupExecution(executionId: string): void {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      this.stopCheckpointInterval(executionId);
      this.stopResourcePolling(executionId);
      this.removeSignalHandlers(execution);
      if (execution.timeout) {
        clearTimeout(execution.timeout);
      }
      this.activeExecutions.delete(executionId);
    }
  }

  private createSandbox(
    context: ExecutionContext,
    costTracker: CostTracker,
    llmCalls: LLMCallEvent[],
    apiCalls: APICallEvent[]
  ): any {
    const self = this;

    return {
      console: {
        log: (...args: any[]) => logger.info('Agent log', { executionId: context.executionId, args }),
        error: (...args: any[]) => logger.error('Agent error', { executionId: context.executionId, args }),
        warn: (...args: any[]) => logger.warn('Agent warning', { executionId: context.executionId, args }),
        info: (...args: any[]) => logger.info('Agent info', { executionId: context.executionId, args }),
        debug: (...args: any[]) => logger.debug('Agent debug', { executionId: context.executionId, args }),
      },
      
      agentId: context.agentId,
      executionId: context.executionId,
      userId: context.userId,
      input: context.input,
      env: context.environment,

      memory: {
        store: async (type: MemoryType, content: string, metadata?: Record<string, any>) => {
          const memoryId = await memoryManager.store(context.agentId, type, content, metadata);
          self.recordAPICall(context.executionId, 'memory', 'store', true);
          return memoryId;
        },
        retrieve: async (type: MemoryType, query: string, limit?: number) => {
          const results = await memoryManager.retrieve(context.agentId, type, query, limit);
          self.recordAPICall(context.executionId, 'memory', 'retrieve', true);
          return results;
        },
        delete: async (memoryId: string) => {
          await memoryManager.delete(context.agentId, memoryId);
          self.recordAPICall(context.executionId, 'memory', 'delete', true);
        },
      },

      storage: {
        upload: async (name: string, content: Buffer, metadata?: Record<string, any>) => {
          const artifact = await storageManager.upload(
            context.agentId,
            context.executionId,
            name,
            content,
            metadata
          );
          costTracker.addStorageBytes(content.length);
          self.recordAPICall(context.executionId, 'storage', 'upload', true);
          return artifact;
        },
        download: async (artifactId: string) => {
          const content = await storageManager.download(artifactId);
          costTracker.addStorageBytes(content.length);
          self.recordAPICall(context.executionId, 'storage', 'download', true);
          return content;
        },
        list: async () => {
          const artifacts = await storageManager.list(context.agentId, context.executionId);
          self.recordAPICall(context.executionId, 'storage', 'list', true);
          return artifacts;
        },
      },

      llm: {
        complete: async (
          prompt: string,
          options?: { model?: string; maxTokens?: number; temperature?: number }
        ) => {
          const model = options?.model || context.environment?.model || 'gpt-4-turbo-preview';
          const estimatedInputTokens = Math.ceil(prompt.length / 4);
          const estimatedOutputTokens = options?.maxTokens || Math.ceil(estimatedInputTokens * 0.75);
          
          self.recordLLMCall(context.executionId, model, estimatedInputTokens, estimatedOutputTokens);
          
          logger.debug('LLM completion requested', {
            executionId: context.executionId,
            model,
            estimatedInputTokens,
            estimatedOutputTokens,
          });
          
          throw new Error('LLM not implemented in sandbox - use external LLM service');
        },
        embed: async (text: string, model?: string) => {
          const embedModel = model || context.environment?.embeddingModel || 'text-embedding-3-small';
          const estimatedTokens = Math.ceil(text.length / 4);
          
          self.recordLLMCall(context.executionId, embedModel, estimatedTokens, 0);
          
          logger.debug('Embedding requested', {
            executionId: context.executionId,
            model: embedModel,
            estimatedTokens,
          });
          
          throw new Error('Embedding not implemented in sandbox - use external embedding service');
        },
      },

      metrics: {
        getApiCallsCount: () => costTracker.getState().apiCalls,
        getTokenUsage: () => costTracker.getTokenUsage(),
        getCost: () => costTracker.calculateCost(context.environment?.model),
        getCostSummary: () => costTracker.getCostSummary(context.environment?.model),
      },

      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      Promise,
      JSON,
      Math,
      Date,
      Buffer,

      fetch: async (url: string, options?: any) => {
        const resourceLimits = context.resourceLimits;
        const agentId = context.agentId;

        rateLimiter.setAgentLimits(
          agentId,
          resourceLimits.maxApiCallsPerMinute,
          resourceLimits.maxTokensPerDay
        );

        try {
          const result = await agentFetch.fetch(agentId, url, {
            method: options?.method || 'GET',
            headers: options?.headers,
            body: options?.body,
            timeout: options?.timeout || 30000,
            signal: options?.signal,
          });
          self.recordAPICall(context.executionId, 'http', 'fetch', true);
          return result;
        } catch (error) {
          self.recordAPICall(context.executionId, 'http', 'fetch', false);
          throw error;
        }
      },

      agentFetch: {
        getMetrics: () => agentFetch.getMetrics(context.agentId),
        setLimits: (requestsPerMinute: number, tokensPerMinute: number) => {
          agentFetch.setAgentLimits(context.agentId, requestsPerMinute, tokensPerMinute);
        },
      },
    };
  }

  private async executeInSandbox(vm: VM, code: string, context: ExecutionContext): Promise<any> {
    // Wrap code in async function
    const wrappedCode = `
      (async () => {
        ${code}
      })()
    `;

    try {
      const result = await vm.run(wrappedCode);
      return result;
    } catch (error: any) {
      logger.error('Sandbox execution error', {
        executionId: context.executionId,
        error: error.message,
      });
      throw error;
    }
  }
}

export default new AgentRuntimeImpl();
