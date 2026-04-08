import { AgentService } from '../services/AgentService';
import axios from 'axios';
import database from '../utils/database';
import logger from '../utils/logger';
import {
  AgentStatus,
  AgentType,
  DeploymentConfig,
  DeploymentStrategy,
} from '../types';

jest.mock('../utils/database');
jest.mock('../utils/logger');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));
jest.mock('axios');

describe('AgentService', () => {
  let agentService: AgentService;

  const mockUserId = 'user-123';
  const mockAgentId = 'agent-456';

  const mockAgentRow = {
    id: mockAgentId,
    user_id: mockUserId,
    name: 'Test Agent',
    description: 'A test agent',
    type: AgentType.TRADING,
    status: AgentStatus.DRAFT,
    version: '1.0.0',
    config: JSON.stringify({
      name: 'Test Agent',
      type: AgentType.TRADING,
      code: 'console.log("hello")',
      triggers: [],
      permissions: [],
      resourceLimits: {},
      version: '1.0.0',
      environment: {},
      dependencies: [],
      memoryConfig: {},
    }),
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    deployed_at: null,
    last_executed_at: null,
    execution_count: 0,
    total_tokens_used: 0,
    total_cost: 0,
    total_revenue: 0,
    marketplace_listing_id: null,
  };

  const mockCreateAgentRequest = {
    name: 'Test Agent',
    description: 'A test agent',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    agentService = new AgentService();
  });

  describe('createAgent', () => {
    it('should create a new agent successfully', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockAgentRow],
      });

      const result = await agentService.createAgent(mockUserId, mockCreateAgentRequest);

      expect(database.query).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Creating agent', {
        userId: mockUserId,
        agentName: mockCreateAgentRequest.name,
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(mockAgentId);
      expect(result.name).toBe('Test Agent');
    });

    it('should create agent without optional description', async () => {
      const requestWithoutDescription = { ...mockCreateAgentRequest, description: undefined };
      (database.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ ...mockAgentRow, description: null }],
      });

      const result = await agentService.createAgent(mockUserId, requestWithoutDescription);

      expect(result).toBeDefined();
      expect(database.query).toHaveBeenCalled();
    });

    it('should propagate database errors', async () => {
      (database.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      await expect(agentService.createAgent(mockUserId, mockCreateAgentRequest)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getAgent', () => {
    it('should return agent when found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockAgentRow],
      });

      const result = await agentService.getAgent(mockAgentId, mockUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockAgentId);
      expect(result?.name).toBe('Test Agent');
    });

    it('should return null when agent not found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({
        rows: [],
      });

      const result = await agentService.getAgent(mockAgentId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('listAgents', () => {
    it('should return paginated list of agents', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({
          rows: [mockAgentRow, { ...mockAgentRow, id: 'agent-789' }],
        });

      const result = await agentService.listAgents(mockUserId, 1, 20);

      expect(result.agents).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should apply type filter when provided', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockAgentRow] });

      const result = await agentService.listAgents(mockUserId, 1, 20, {
        type: AgentType.TRADING,
      });

      expect(result.agents).toHaveLength(1);
    });

    it('should apply status filter when provided', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockAgentRow] });

      const result = await agentService.listAgents(mockUserId, 1, 20, {
        status: AgentStatus.DRAFT,
      });

      expect(result.agents).toHaveLength(1);
    });

    it('should apply both type and status filters', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockAgentRow] });

      const result = await agentService.listAgents(mockUserId, 1, 20, {
        type: AgentType.TRADING,
        status: AgentStatus.DRAFT,
      });

      expect(result.agents).toHaveLength(1);
    });

    it('should calculate correct pagination offset', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [mockAgentRow] });

      await agentService.listAgents(mockUserId, 3, 10);

      const lastCall = (database.query as jest.Mock).mock.calls[1];
      expect(lastCall[0]).toContain('OFFSET');
    });
  });

  describe('updateAgent', () => {
    it('should update agent name successfully', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({
          rows: [{ ...mockAgentRow, name: 'Updated Agent' }],
        });

      const result = await agentService.updateAgent(mockAgentId, mockUserId, {
        name: 'Updated Agent',
      });

      expect(result?.name).toBe('Updated Agent');
    });

    it('should return null when agent not found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await agentService.updateAgent(mockAgentId, mockUserId, {
        name: 'Updated Agent',
      });

      expect(result).toBeNull();
    });

    it('should throw error when updating deployed agent', async () => {
      const deployedAgent = { ...mockAgentRow, status: AgentStatus.DEPLOYED };
      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [deployedAgent] });

      await expect(
        agentService.updateAgent(mockAgentId, mockUserId, { name: 'Updated Agent' })
      ).rejects.toThrow('Cannot update deployed agent');
    });

    it('should update description when provided', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({
          rows: [{ ...mockAgentRow, description: 'New description' }],
        });

      const result = await agentService.updateAgent(mockAgentId, mockUserId, {
        description: 'New description',
      });

      expect(result?.description).toBe('New description');
    });

    it('should update config when code is provided', async () => {
      const agentWithConfig = {
        ...mockAgentRow,
        config: JSON.stringify({ code: 'old code', triggers: [] }),
      };
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [agentWithConfig] })
        .mockResolvedValueOnce({
          rows: [
            {
              ...agentWithConfig,
              config: JSON.stringify({ code: 'new code' }),
            },
          ],
        });

      const result = await agentService.updateAgent(mockAgentId, mockUserId, {
        code: 'new code',
      });

      expect(result).toBeDefined();
    });
  });

  describe('deployAgent', () => {
    it('should deploy agent successfully', async () => {
      const deployedRow = {
        ...mockAgentRow,
        status: AgentStatus.DEPLOYED,
        deployed_at: new Date(),
      };
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [deployedRow] });

      const deploymentConfig: DeploymentConfig = {
        strategy: DeploymentStrategy.DIRECT,
        rollbackOnFailure: true,
      };

      const result = await agentService.deployAgent(mockAgentId, mockUserId, deploymentConfig);

      expect(result?.status).toBe(AgentStatus.DEPLOYED);
    });

    it('should return null when agent not found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await agentService.deployAgent(mockAgentId, mockUserId, {
        strategy: DeploymentStrategy.DIRECT,
        rollbackOnFailure: true,
      });

      expect(result).toBeNull();
    });

    it('should deploy with canary strategy', async () => {
      const deployedRow = {
        ...mockAgentRow,
        status: AgentStatus.DEPLOYED,
        deployed_at: new Date(),
      };
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [deployedRow] });

      const deploymentConfig: DeploymentConfig = {
        strategy: DeploymentStrategy.CANARY,
        canaryPercent: 10,
        rollbackOnFailure: true,
      };

      const result = await agentService.deployAgent(mockAgentId, mockUserId, deploymentConfig);

      expect(result?.status).toBe(AgentStatus.DEPLOYED);
    });
  });

  describe('pauseAgent', () => {
    it('should pause deployed agent successfully', async () => {
      const pausedRow = { ...mockAgentRow, status: AgentStatus.PAUSED };

      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [pausedRow] });

      const result = await agentService.pauseAgent(mockAgentId, mockUserId);

      expect(result?.status).toBe(AgentStatus.PAUSED);
    });

    it('should return null when agent is not deployed or not found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await agentService.pauseAgent(mockAgentId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent successfully', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });

      const result = await agentService.deleteAgent(mockAgentId, mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when agent not found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });

      const result = await agentService.deleteAgent(mockAgentId, mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getAgentLogs', () => {
    const mockExecutionLog = {
      id: 'log-1',
      agent_id: mockAgentId,
      started_at: new Date('2024-01-01'),
      completed_at: new Date('2024-01-01'),
      status: 'success',
      input: JSON.stringify({ query: 'test' }),
      output: JSON.stringify({ result: 'ok' }),
      error: null,
      tokens_used: 100,
      cost: 0.5,
      execution_time_ms: 500,
    };

    it('should return agent logs successfully', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [mockExecutionLog] });

      const result = await agentService.getAgentLogs(mockAgentId, mockUserId, 1, 50);

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw error when agent not found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        agentService.getAgentLogs(mockAgentId, mockUserId, 1, 50)
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('getAgentMetrics', () => {
    const mockResourceUsage = { avgCpuPercent: 45, avgMemoryMB: 512, avgStorageMB: 0 };
    const mockRevenue = 1250.75;

    beforeEach(() => {
      jest.spyOn(global, 'fetch').mockReset();
    });

    it('should return metrics for agent with executions', async () => {
      const metricsRow = {
        agent_id: mockAgentId,
        execution_count: '100',
        success_count: '95',
        failure_count: '5',
        avg_execution_time_ms: '250.5',
        total_tokens_used: '10000',
        total_cost: '50.25',
      };

      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [metricsRow] });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { revenue: mockRevenue } });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `container_cpu_usage_seconds_total{agent_id="agent-456"} 0.45
container_memory_usage_bytes{agent_id="agent-456"} 536870912`,
      });

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(result?.executionCount).toBe(100);
      expect(result?.successCount).toBe(95);
      expect(result?.failureCount).toBe(5);
      expect(result?.totalRevenue).toBe(mockRevenue);
      expect(result?.resourceUsage).toEqual(mockResourceUsage);
    });

    it('should return default metrics when no executions', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [] });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { revenue: 0 } });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(result?.executionCount).toBe(0);
      expect(result?.totalRevenue).toBe(0);
    });

    it('should return null when agent not found', async () => {
      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(result).toBeNull();
    });

    it('should use custom period', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [] });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { revenue: 0 } });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      await agentService.getAgentMetrics(mockAgentId, mockUserId, '7d');

      const calls = (database.query as jest.Mock).mock.calls;
      const metricsCall = calls[1];
      expect(metricsCall[0]).toContain("NOW() - INTERVAL '7d'");
    });

    it('should fetch revenue from ledger service', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [] });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { revenue: mockRevenue } });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3003/api/v1/agents/agent-456/revenue',
        { params: { period: '24h' } }
      );
      expect(result?.totalRevenue).toBe(mockRevenue);
    });

    it('should return 0 revenue when ledger service is unavailable', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [] });
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Ledger service unavailable'));
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(result?.totalRevenue).toBe(0);
    });

    it('should return 0 revenue when ledger returns no data', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [] });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: {} });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(result?.totalRevenue).toBe(0);
    });

    it('should fetch resource usage from metrics endpoint', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [] });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { revenue: 0 } });
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        text: async () => `
container_cpu_usage_seconds_total{agent_id="agent-456"} 0.5
container_memory_usage_bytes{agent_id="agent-456"} 536870912
        `,
      });

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(result?.resourceUsage?.avgMemoryMB).toBe(512);
    });

    it('should return default resource usage when metrics service unavailable', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [] });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { revenue: 0 } });
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Metrics unavailable'));

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(result?.resourceUsage?.avgCpuPercent).toBe(0);
      expect(result?.resourceUsage?.avgMemoryMB).toBe(0);
      expect(result?.resourceUsage?.avgStorageMB).toBe(0);
    });

    it('should fallback to runner stats endpoint when prometheus unavailable', async () => {
      (database.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [mockAgentRow] })
        .mockResolvedValueOnce({ rows: [] });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { revenue: 0 } });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ avgCpuPercent: 60, avgMemoryMB: 1024, avgStorageMB: 200 }),
        });

      const result = await agentService.getAgentMetrics(mockAgentId, mockUserId, '24h');

      expect(result?.resourceUsage?.avgCpuPercent).toBe(60);
      expect(result?.resourceUsage?.avgMemoryMB).toBe(1024);
    });
  });

  describe('mapRowToAgent', () => {
    it('should parse config string to object', async () => {
      const rowWithStringConfig = {
        ...mockAgentRow,
        config: '{"name":"Test","type":"trading","code":"test"}',
      };
      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [rowWithStringConfig] });

      const result = await agentService.getAgent(mockAgentId, mockUserId);

      expect(result).toBeDefined();
    });

    it('should keep config as object when already parsed', async () => {
      const rowWithObjectConfig = {
        ...mockAgentRow,
        config: { name: 'Test', type: 'trading', code: 'test' },
      };
      (database.query as jest.Mock).mockResolvedValueOnce({ rows: [rowWithObjectConfig] });

      const result = await agentService.getAgent(mockAgentId, mockUserId);

      expect(result).toBeDefined();
    });
  });
});
