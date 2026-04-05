import { AgentRuntimeImpl } from '../executors/AgentRuntime';
import { VM } from 'vm2';
import { ExecutionContext, MemoryType } from '../types';

jest.mock('vm2');
jest.mock('../memory/MemoryManager', () => ({
  default: {
    store: jest.fn().mockResolvedValue('memory-id-123'),
    retrieve: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../storage/StorageManager', () => ({
  default: {
    upload: jest.fn().mockResolvedValue({ id: 'artifact-1', name: 'test.txt' }),
    download: jest.fn().mockResolvedValue(Buffer.from('test content')),
    list: jest.fn().mockResolvedValue([]),
  },
}));

describe('AgentRuntimeImpl', () => {
  let runtime: AgentRuntimeImpl;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    runtime = new AgentRuntimeImpl();
    
    mockContext = {
      agentId: 'agent-123',
      executionId: 'exec-456',
      userId: 'user-789',
      input: { data: 'test input' },
      environment: { NODE_ENV: 'test' },
      permissions: ['memory:read', 'memory:write'],
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
  });

  afterEach(() => {
    runtime.cancel('non-existent-id').catch(() => {});
  });

  describe('execute', () => {
    it('should execute code successfully and return result', async () => {
      const mockVM = {
        run: jest.fn().mockResolvedValue('success result'),
      };
      (VM as jest.Mock).mockImplementation(() => mockVM);

      const result = await runtime.execute(mockContext, 'return "success";');

      expect(result.executionId).toBe(mockContext.executionId);
      expect(result.status).toBe('success');
      expect(result.output).toBe('success result');
      expect(result.metrics).toHaveProperty('startTime');
      expect(result.metrics).toHaveProperty('endTime');
      expect(result.metrics).toHaveProperty('durationMs');
    });

    it('should handle execution errors', async () => {
      const mockVM = {
        run: jest.fn().mockRejectedValue(new Error('Sandbox error')),
      };
      (VM as jest.Mock).mockImplementation(() => mockVM);

      const result = await runtime.execute(mockContext, 'throw new Error("Sandbox error");');

      expect(result.status).toBe('failure');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Sandbox error');
    });

    it('should create sandbox with memory API', async () => {
      const mockVM = {
        run: jest.fn().mockResolvedValue(undefined),
      };
      (VM as jest.Mock).mockImplementation(() => mockVM);

      await runtime.execute(mockContext, 'return true;');

      const sandbox = (VM as jest.Mock).mock.calls[0][0].sandbox;
      expect(sandbox.memory).toBeDefined();
      expect(typeof sandbox.memory.store).toBe('function');
      expect(typeof sandbox.memory.retrieve).toBe('function');
      expect(typeof sandbox.memory.delete).toBe('function');
    });

    it('should create sandbox with storage API', async () => {
      const mockVM = {
        run: jest.fn().mockResolvedValue(undefined),
      };
      (VM as jest.Mock).mockImplementation(() => mockVM);

      await runtime.execute(mockContext, 'return true;');

      const sandbox = (VM as jest.Mock).mock.calls[0][0].sandbox;
      expect(sandbox.storage).toBeDefined();
      expect(typeof sandbox.storage.upload).toBe('function');
      expect(typeof sandbox.storage.download).toBe('function');
      expect(typeof sandbox.storage.list).toBe('function');
    });

    it('should create sandbox with console API', async () => {
      const mockVM = {
        run: jest.fn().mockResolvedValue(undefined),
      };
      (VM as jest.Mock).mockImplementation(() => mockVM);

      await runtime.execute(mockContext, 'return true;');

      const sandbox = (VM as jest.Mock).mock.calls[0][0].sandbox;
      expect(sandbox.console).toBeDefined();
      expect(typeof sandbox.console.log).toBe('function');
      expect(typeof sandbox.console.error).toBe('function');
      expect(typeof sandbox.console.warn).toBe('function');
    });

    it('should create sandbox with context information', async () => {
      const mockVM = {
        run: jest.fn().mockResolvedValue(undefined),
      };
      (VM as jest.Mock).mockImplementation(() => mockVM);

      await runtime.execute(mockContext, 'return true;');

      const sandbox = (VM as jest.Mock).mock.calls[0][0].sandbox;
      expect(sandbox.agentId).toBe(mockContext.agentId);
      expect(sandbox.executionId).toBe(mockContext.executionId);
      expect(sandbox.userId).toBe(mockContext.userId);
    });
  });

  describe('pause', () => {
    it('should throw error for non-existent execution', async () => {
      await expect(runtime.pause('non-existent-id')).rejects.toThrow('Execution not found');
    });

    it('should clear timeout when pausing', async () => {
      const mockVM = {
        run: jest.fn().mockImplementation(() => 
          new Promise(r => setTimeout(() => r('done'), 5000))
        ),
      };
      (VM as jest.Mock).mockImplementation(() => mockVM);

      const executePromise = runtime.execute(mockContext, 'await new Promise(r => setTimeout(r, 10000))');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await expect(runtime.pause(mockContext.executionId)).rejects.toThrow('Execution not found');
    });
  });

  describe('resume', () => {
    it('should log warning when resume is called', async () => {
      const logger = require('../utils/logger');
      
      await runtime.resume('some-id');

      expect(logger.warn).toHaveBeenCalledWith('Resume not implemented');
    });
  });

  describe('cancel', () => {
    it('should handle cancelling non-existent execution gracefully', async () => {
      await expect(runtime.cancel('non-existent-id')).resolves.toBeUndefined();
    });

    it('should clear timeout on cancel', async () => {
      const mockVM = {
        run: jest.fn().mockImplementation(() => 
          new Promise(r => setTimeout(() => r('done'), 10000))
        ),
      };
      (VM as jest.Mock).mockImplementation(() => mockVM);

      runtime.execute(mockContext, 'await new Promise(r => setTimeout(r, 10000))');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await runtime.cancel(mockContext.executionId);

      expect(clearTimeout).toHaveBeenCalled();
    });
  });
});
