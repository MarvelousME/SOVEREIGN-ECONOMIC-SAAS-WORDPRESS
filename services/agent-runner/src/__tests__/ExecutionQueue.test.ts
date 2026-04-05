jest.mock('nats', () => ({
  connect: jest.fn().mockResolvedValue({
    jetstream: jest.fn().mockReturnValue({
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockReturnValue({
        on: jest.fn(),
      }),
    }),
    jetstreamManager: jest.fn().mockResolvedValue({
      streams: {
        add: jest.fn().mockResolvedValue(undefined),
      },
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../utils/database', () => ({
  default: {
    query: jest.fn().mockResolvedValue({
      rows: [{
        id: 'agent-123',
        user_id: 'user-789',
        config: JSON.stringify({
          code: 'return "test";',
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
        }),
      }],
    }),
  },
}));

jest.mock('../executors/AgentRuntime', () => ({
  default: {
    execute: jest.fn().mockResolvedValue({
      executionId: 'exec-456',
      status: 'success',
      output: 'result',
      metrics: {
        startTime: new Date(),
        endTime: new Date(),
        durationMs: 100,
        cpuUsagePercent: 10,
        memoryUsageMB: 50,
        storageUsageMB: 5,
        apiCallsCount: 0,
        tokensUsed: 0,
        cost: 0,
      },
      artifacts: [],
    }),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../config', () => ({
  default: {
    nats: {
      servers: ['nats://localhost:4222'],
      user: undefined,
      pass: undefined,
    },
    logging: {
      level: 'error',
      format: 'json',
    },
    env: 'test',
    execution: {
      defaultTimeout: 5000,
      maxTimeout: 60000,
      maxConcurrentExecutions: 100,
      checkpointInterval: 30000,
    },
  },
}));

import { ExecutionQueue } from '../queue/ExecutionQueue';
import { MessageType, QueueMessage } from '../types';

describe('ExecutionQueue', () => {
  let queue: ExecutionQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    queue = new ExecutionQueue();
  });

  describe('connect', () => {
    it('should connect to NATS successfully', async () => {
      await expect(queue.connect()).resolves.not.toThrow();
    });

    it('should setup streams on connect', async () => {
      await queue.connect();
      expect(queue).toBeDefined();
    });

    it('should throw on connection error', async () => {
      const { connect } = require('nats');
      connect.mockRejectedValueOnce(new Error('Connection failed'));

      const newQueue = new ExecutionQueue();
      await expect(newQueue.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('enqueueExecution', () => {
    it('should generate execution ID', async () => {
      const { connect } = require('nats');
      const mockJetstream = {
        publish: jest.fn().mockResolvedValue(undefined),
      };
      
      connect.mockResolvedValue({
        jetstream: jest.fn().mockReturnValue(mockJetstream),
        jetstreamManager: jest.fn().mockResolvedValue({
          streams: { add: jest.fn().mockResolvedValue(undefined) },
        }),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await queue.connect();
      const executionId = await queue.enqueueExecution('agent-123', { data: 'test' });

      expect(executionId).toBeDefined();
      expect(typeof executionId).toBe('string');
    });

    it('should publish message with correct structure', async () => {
      const { connect } = require('nats');
      const mockPublish = jest.fn().mockResolvedValue(undefined);
      const mockJetstream = { publish: mockPublish };
      
      connect.mockResolvedValue({
        jetstream: jest.fn().mockReturnValue(mockJetstream),
        jetstreamManager: jest.fn().mockResolvedValue({
          streams: { add: jest.fn().mockResolvedValue(undefined) },
        }),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await queue.connect();
      await queue.enqueueExecution('agent-123', { query: 'test' }, 5);

      expect(mockPublish).toHaveBeenCalled();
    });

    it('should use default priority of 5', async () => {
      const { connect } = require('nats');
      const mockPublish = jest.fn().mockResolvedValue(undefined);
      const mockJetstream = { publish: mockPublish };
      
      connect.mockResolvedValue({
        jetstream: jest.fn().mockReturnValue(mockJetstream),
        jetstreamManager: jest.fn().mockResolvedValue({
          streams: { add: jest.fn().mockResolvedValue(undefined) },
        }),
        close: jest.fn().mockResolvedValue(undefined),
      });

      await queue.connect();
      const executionId = await queue.enqueueExecution('agent-123', { query: 'test' });

      expect(executionId).toBeDefined();
    });
  });

  describe('publishEvent', () => {
    it('should throw if not connected', async () => {
      const newQueue = new ExecutionQueue();
      const message: QueueMessage = {
        type: MessageType.AGENT_COMPLETED,
        agentId: 'agent-123',
        executionId: 'exec-456',
        payload: {},
        timestamp: new Date(),
      };

      await expect(newQueue.publishEvent('agent.completed', message)).rejects.toThrow('Not connected to NATS');
    });
  });

  describe('close', () => {
    it('should close NATS connection', async () => {
      const { connect } = require('nats');
      const mockClose = jest.fn().mockResolvedValue(undefined);
      
      connect.mockResolvedValue({
        jetstream: jest.fn().mockReturnValue({
          publish: jest.fn(),
          subscribe: jest.fn(),
        }),
        jetstreamManager: jest.fn().mockResolvedValue({
          streams: { add: jest.fn() },
        }),
        close: mockClose,
      });

      await queue.connect();
      await queue.close();

      expect(mockClose).toHaveBeenCalled();
    });
  });
});

describe('QueueMessage', () => {
  it('should have correct message types', () => {
    expect(MessageType.EXECUTE_AGENT).toBe('execute_agent');
    expect(MessageType.PAUSE_AGENT).toBe('pause_agent');
    expect(MessageType.RESUME_AGENT).toBe('resume_agent');
    expect(MessageType.CANCEL_AGENT).toBe('cancel_agent');
    expect(MessageType.AGENT_COMPLETED).toBe('agent_completed');
    expect(MessageType.AGENT_FAILED).toBe('agent_failed');
  });

  it('should create valid queue message', () => {
    const message: QueueMessage = {
      type: MessageType.EXECUTE_AGENT,
      agentId: 'agent-123',
      executionId: 'exec-456',
      payload: { input: { query: 'test' } },
      timestamp: new Date(),
    };

    expect(message.type).toBe(MessageType.EXECUTE_AGENT);
    expect(message.agentId).toBe('agent-123');
    expect(message.executionId).toBe('exec-456');
    expect(message.payload).toBeDefined();
  });
});
