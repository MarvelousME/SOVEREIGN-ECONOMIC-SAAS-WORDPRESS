import { AgentController } from '../controllers/AgentController';
import agentService from '../services/AgentService';
import logger from '../utils/logger';
import { Request, Response } from 'express';
import {
  Agent,
  AgentStatus,
  AgentType,
  DeploymentStrategy,
} from '../types';

interface MockUser {
  id: string;
}

interface MockRequest extends Partial<Request> {
  user?: MockUser;
}

jest.mock('../services/AgentService');
jest.mock('../utils/logger');

describe('AgentController', () => {
  let agentController: AgentController;
  let mockRequest: MockRequest;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let jsonSendMock: jest.Mock;

  const mockUserId = 'user-123';
  const mockAgentId = 'agent-456';

  const mockAgent: Agent = {
    id: mockAgentId,
    userId: mockUserId,
    name: 'Test Agent',
    description: 'A test agent',
    type: AgentType.TRADING,
    status: AgentStatus.DRAFT,
    version: '1.0.0',
    config: {
      name: 'Test Agent',
      type: AgentType.TRADING,
      code: 'console.log("hello")',
      triggers: [],
      permissions: [],
      resourceLimits: {
        maxCpuCores: 1,
        maxMemoryMB: 512,
        maxStorageMB: 1024,
        maxApiCallsPerMinute: 60,
        maxTokensPerDay: 100000,
        maxCostPerDay: 10,
      },
      version: '1.0.0',
      environment: {},
      dependencies: [],
      memoryConfig: {
        enableShortTerm: true,
        enableLongTerm: true,
        enableEpisodic: true,
        vectorDimension: 1536,
      },
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    executionCount: 0,
    totalTokensUsed: 0,
    totalCost: 0,
    totalRevenue: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    agentController = new AgentController();

    jsonMock = jest.fn();
    jsonSendMock = jest.fn();
    statusMock = jest.fn(() => ({
      json: jsonSendMock,
    }));

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('createAgent', () => {
    const createAgentRequest = {
      name: 'Test Agent',
      type: AgentType.TRADING,
      code: 'console.log("hello")',
      triggers: [],
      permissions: [],
      resourceLimits: {},
    };

    it('should create agent with valid request', async () => {
      mockRequest = {
        body: { ...createAgentRequest, userId: mockUserId },
      } as MockRequest;

      const createAgentSpy = jest.spyOn(agentService, 'createAgent');
      createAgentSpy.mockResolvedValue(mockAgent);

      await agentController.createAgent(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('getAgent', () => {
    it('should return agent when found', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        query: { userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      (agentService.getAgent as jest.Mock).mockResolvedValue(mockAgent);

      await agentController.getAgent(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockAgent,
      });
    });
  });

  describe('listAgents', () => {
    it('should return paginated agents list', async () => {
      mockRequest = {
        query: {
          userId: mockUserId,
          page: '1',
          limit: '20',
        },
        user: { id: mockUserId },
      } as MockRequest;

      const agentsResult = {
        agents: [mockAgent],
        total: 1,
      };

      (agentService.listAgents as jest.Mock).mockResolvedValue(agentsResult);

      await agentController.listAgents(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [mockAgent],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    it('should use default pagination values', async () => {
      mockRequest = {
        query: { userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      const agentsResult = { agents: [], total: 0 };
      (agentService.listAgents as jest.Mock).mockResolvedValue(agentsResult);

      await agentController.listAgents(mockRequest as Request, mockResponse as Response);

      expect(agentService.listAgents).toHaveBeenCalledWith(
        mockUserId,
        1,
        20,
        expect.any(Object)
      );
    });

    it('should pass type and status filters', async () => {
      mockRequest = {
        query: {
          userId: mockUserId,
          type: AgentType.TRADING,
          status: AgentStatus.DRAFT,
        },
        user: { id: mockUserId },
      } as MockRequest;

      const agentsResult = { agents: [mockAgent], total: 1 };
      (agentService.listAgents as jest.Mock).mockResolvedValue(agentsResult);

      await agentController.listAgents(mockRequest as Request, mockResponse as Response);

      expect(agentService.listAgents).toHaveBeenCalledWith(
        mockUserId,
        1,
        20,
        { type: AgentType.TRADING, status: AgentStatus.DRAFT }
      );
    });
  });

  describe('updateAgent', () => {
    const updateRequest = { name: 'Updated Agent' };

    it('should update agent successfully', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        body: { ...updateRequest, userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      const updatedAgent = { ...mockAgent, name: 'Updated Agent' };
      (agentService.updateAgent as jest.Mock).mockResolvedValue(updatedAgent);

      await agentController.updateAgent(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: updatedAgent,
      });
    });
  });

  describe('deployAgent', () => {
    const deployRequest = {
      strategy: DeploymentStrategy.DIRECT,
      rollbackOnFailure: true,
    };

    it('should deploy agent successfully', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        body: { ...deployRequest, userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      const deployedAgent = { ...mockAgent, status: AgentStatus.DEPLOYED };
      (agentService.deployAgent as jest.Mock).mockResolvedValue(deployedAgent);

      await agentController.deployAgent(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: deployedAgent,
        message: 'Agent deployed successfully',
      });
    });

    it('should use default deployment strategy', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        body: { userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      const deployedAgent = { ...mockAgent, status: AgentStatus.DEPLOYED };
      (agentService.deployAgent as jest.Mock).mockResolvedValue(deployedAgent);

      await agentController.deployAgent(mockRequest as Request, mockResponse as Response);

      expect(agentService.deployAgent).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
        expect.objectContaining({ strategy: DeploymentStrategy.DIRECT })
      );
    });
  });

  describe('pauseAgent', () => {
    it('should pause agent successfully', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        body: { userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      const pausedAgent = { ...mockAgent, status: AgentStatus.PAUSED };
      (agentService.pauseAgent as jest.Mock).mockResolvedValue(pausedAgent);

      await agentController.pauseAgent(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: pausedAgent,
        message: 'Agent paused successfully',
      });
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent successfully', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        query: { userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      (agentService.deleteAgent as jest.Mock).mockResolvedValue(true);

      await agentController.deleteAgent(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Agent deleted successfully',
      });
    });
  });

  describe('getAgentLogs', () => {
    it('should return agent logs successfully', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        query: { userId: mockUserId, page: '1', limit: '50' },
        user: { id: mockUserId },
      } as MockRequest;

      const logsResult = {
        logs: [
          {
            id: 'log-1',
            agentId: mockAgentId,
            startedAt: new Date(),
            status: 'success' as const,
            input: {},
            output: {},
            tokensUsed: 100,
            cost: 0.5,
            executionTimeMs: 500,
          },
        ],
        total: 1,
      };

      (agentService.getAgentLogs as jest.Mock).mockResolvedValue(logsResult);

      await agentController.getAgentLogs(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: logsResult.logs,
        pagination: {
          total: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      });
    });

    it('should use default pagination values', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        query: { userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      const logsResult = { logs: [], total: 0 };
      (agentService.getAgentLogs as jest.Mock).mockResolvedValue(logsResult);

      await agentController.getAgentLogs(mockRequest as Request, mockResponse as Response);

      expect(agentService.getAgentLogs).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
        1,
        50
      );
    });
  });

  describe('getAgentMetrics', () => {
    it('should return agent metrics successfully', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        query: { userId: mockUserId, period: '24h' },
        user: { id: mockUserId },
      } as MockRequest;

      const metrics = {
        agentId: mockAgentId,
        period: '24h',
        executionCount: 100,
        successCount: 95,
        failureCount: 5,
        avgExecutionTimeMs: 250,
        totalTokensUsed: 10000,
        totalCost: 50,
        totalRevenue: 100,
        resourceUsage: {
          avgCpuPercent: 50,
          avgMemoryMB: 256,
          avgStorageMB: 512,
        },
      };

      (agentService.getAgentMetrics as jest.Mock).mockResolvedValue(metrics);

      await agentController.getAgentMetrics(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: metrics,
      });
    });

    it('should use default period', async () => {
      mockRequest = {
        params: { id: mockAgentId },
        query: { userId: mockUserId },
        user: { id: mockUserId },
      } as MockRequest;

      const metrics = {
        agentId: mockAgentId,
        period: '24h',
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        avgExecutionTimeMs: 0,
        totalTokensUsed: 0,
        totalCost: 0,
        totalRevenue: 0,
        resourceUsage: {
          avgCpuPercent: 0,
          avgMemoryMB: 0,
          avgStorageMB: 0,
        },
      };

      (agentService.getAgentMetrics as jest.Mock).mockResolvedValue(metrics);

      await agentController.getAgentMetrics(mockRequest as Request, mockResponse as Response);

      expect(agentService.getAgentMetrics).toHaveBeenCalledWith(
        mockAgentId,
        mockUserId,
        '24h'
      );
    });
  });
});
