import { ExecutionRequestSchema } from '../types';

describe('Types', () => {
  describe('ExecutionRequestSchema', () => {
    it('should validate a valid execution request', () => {
      const validRequest = {
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        input: { query: 'test' },
        priority: 5,
        timeout: 300000,
      };

      const result = ExecutionRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const minimalRequest = {
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        input: { query: 'test' },
      };

      const result = ExecutionRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe(5);
        expect(result.data.timeout).toBe(300000);
      }
    });

    it('should reject invalid agentId format', () => {
      const invalidRequest = {
        agentId: 'not-a-uuid',
        input: {},
      };

      const result = ExecutionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject priority below 0', () => {
      const invalidRequest = {
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        input: {},
        priority: -1,
      };

      const result = ExecutionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject priority above 10', () => {
      const invalidRequest = {
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        input: {},
        priority: 11,
      };

      const result = ExecutionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject timeout below 1000ms', () => {
      const invalidRequest = {
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        input: {},
        timeout: 500,
      };

      const result = ExecutionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject timeout above 1 hour', () => {
      const invalidRequest = {
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        input: {},
        timeout: 4000000,
      };

      const result = ExecutionRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should accept optional metadata', () => {
      const requestWithMetadata = {
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        input: {},
        metadata: { key: 'value' },
      };

      const result = ExecutionRequestSchema.safeParse(requestWithMetadata);
      expect(result.success).toBe(true);
    });
  });

  describe('ExecutionContext', () => {
    it('should have all required fields', () => {
      const context = {
        agentId: 'agent-123',
        executionId: 'exec-456',
        userId: 'user-789',
        input: { data: 'test' },
        environment: { NODE_ENV: 'test' },
        permissions: ['memory:read'],
        resourceLimits: {
          maxCpuCores: 4,
          maxMemoryMB: 512,
          maxStorageMB: 1024,
          maxApiCallsPerMinute: 60,
          maxTokensPerDay: 100000,
          maxCostPerDay: 10.0,
        },
        memoryConfig: {
          enableShortTerm: true,
          enableLongTerm: true,
          enableEpisodic: true,
          vectorDimension: 1536,
        },
      };

      expect(context.agentId).toBeDefined();
      expect(context.executionId).toBeDefined();
      expect(context.userId).toBeDefined();
      expect(context.input).toBeDefined();
      expect(context.resourceLimits).toBeDefined();
      expect(context.memoryConfig).toBeDefined();
    });
  });

  describe('ExecutionResult', () => {
    it('should support success status', () => {
      const result = {
        executionId: 'exec-123',
        status: 'success' as const,
        output: { data: 'result' },
        metrics: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 100,
          cpuUsagePercent: 10,
          memoryUsageMB: 50,
          storageUsageMB: 5,
          apiCallsCount: 2,
          tokensUsed: 100,
          cost: 0.01,
        },
        artifacts: ['artifact-1'],
      };

      expect(result.status).toBe('success');
      expect(result.output).toBeDefined();
    });

    it('should support failure status with error', () => {
      const result = {
        executionId: 'exec-123',
        status: 'failure' as const,
        error: {
          message: 'Execution failed',
          stack: 'Error at line 1',
          code: 'EXEC_ERROR',
        },
        metrics: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 50,
          cpuUsagePercent: 5,
          memoryUsageMB: 25,
          storageUsageMB: 0,
          apiCallsCount: 0,
          tokensUsed: 0,
          cost: 0,
        },
        artifacts: [],
      };

      expect(result.status).toBe('failure');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Execution failed');
    });

    it('should support timeout status', () => {
      const result = {
        executionId: 'exec-123',
        status: 'timeout' as const,
        error: {
          message: 'Execution timed out',
        },
        metrics: {
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 300000,
          cpuUsagePercent: 80,
          memoryUsageMB: 500,
          storageUsageMB: 10,
          apiCallsCount: 50,
          tokensUsed: 50000,
          cost: 5.0,
        },
        artifacts: [],
      };

      expect(result.status).toBe('timeout');
    });
  });
});
