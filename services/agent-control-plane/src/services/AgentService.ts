import { v4 as uuidv4 } from 'uuid';
import database from '../utils/database';
import logger from '../utils/logger';
import {
  Agent,
  AgentStatus,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentConfig,
  DeploymentConfig,
  AgentMetrics,
  ExecutionLog,
  DeploymentStrategy,
} from '../types';

export class AgentService {
  async createAgent(userId: string, request: CreateAgentRequest): Promise<Agent> {
    logger.info('Creating agent', { userId, agentName: request.name });

    const agentId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO agents (
        id, user_id, name, description, type, status, version, config, 
        created_at, updated_at, execution_count, total_tokens_used, 
        total_cost, total_revenue
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      agentId,
      userId,
      request.name,
      request.description || null,
      request.type,
      AgentStatus.DRAFT,
      request.version || '1.0.0',
      JSON.stringify(request),
      now,
      now,
      0,
      0,
      0,
      0,
    ];

    const result = await database.query<Agent>(query, values);
    const agent = this.mapRowToAgent(result.rows[0]);

    logger.info('Agent created successfully', { agentId, userId });
    return agent;
  }

  async getAgent(agentId: string, userId: string): Promise<Agent | null> {
    const query = 'SELECT * FROM agents WHERE id = $1 AND user_id = $2';
    const result = await database.query<Agent>(query, [agentId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAgent(result.rows[0]);
  }

  async listAgents(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      type?: string;
      status?: AgentStatus;
    }
  ): Promise<{ agents: Agent[]; total: number }> {
    let query = 'SELECT * FROM agents WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (filters?.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    // Count total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await database.query<Agent>(query, params);
    const agents = result.rows.map(row => this.mapRowToAgent(row));

    return { agents, total };
  }

  async updateAgent(
    agentId: string,
    userId: string,
    request: UpdateAgentRequest
  ): Promise<Agent | null> {
    logger.info('Updating agent', { agentId, userId });

    // Get current agent
    const currentAgent = await this.getAgent(agentId, userId);
    if (!currentAgent) {
      return null;
    }

    // Cannot update deployed agents directly
    if (currentAgent.status === AgentStatus.DEPLOYED) {
      throw new Error('Cannot update deployed agent. Create a new version instead.');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (request.name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(request.name);
    }

    if (request.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(request.description);
    }

    if (request.code || request.triggers || request.permissions || request.resourceLimits) {
      const updatedConfig = {
        ...currentAgent.config,
        ...request,
      };
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(updatedConfig));
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(agentId, userId);

    const query = `
      UPDATE agents 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await database.query<Agent>(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Agent updated successfully', { agentId, userId });
    return this.mapRowToAgent(result.rows[0]);
  }

  async deployAgent(
    agentId: string,
    userId: string,
    deploymentConfig: DeploymentConfig
  ): Promise<Agent | null> {
    logger.info('Deploying agent', { agentId, userId, deploymentConfig });

    const agent = await this.getAgent(agentId, userId);
    if (!agent) {
      return null;
    }

    const now = new Date();
    const query = `
      UPDATE agents
      SET status = $1, deployed_at = $2, updated_at = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `;

    const result = await database.query<Agent>(query, [
      AgentStatus.DEPLOYED,
      now,
      now,
      agentId,
      userId,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Agent deployed successfully', { agentId, userId });
    return this.mapRowToAgent(result.rows[0]);
  }

  async pauseAgent(agentId: string, userId: string): Promise<Agent | null> {
    logger.info('Pausing agent', { agentId, userId });

    const query = `
      UPDATE agents
      SET status = $1, updated_at = $2
      WHERE id = $3 AND user_id = $4 AND status = $5
      RETURNING *
    `;

    const result = await database.query<Agent>(query, [
      AgentStatus.PAUSED,
      new Date(),
      agentId,
      userId,
      AgentStatus.DEPLOYED,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info('Agent paused successfully', { agentId, userId });
    return this.mapRowToAgent(result.rows[0]);
  }

  async deleteAgent(agentId: string, userId: string): Promise<boolean> {
    logger.info('Deleting agent', { agentId, userId });

    const query = 'DELETE FROM agents WHERE id = $1 AND user_id = $2';
    const result = await database.query(query, [agentId, userId]);

    const deleted = (result.rowCount || 0) > 0;
    if (deleted) {
      logger.info('Agent deleted successfully', { agentId, userId });
    }

    return deleted;
  }

  async getAgentLogs(
    agentId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: ExecutionLog[]; total: number }> {
    // Verify agent ownership
    const agent = await this.getAgent(agentId, userId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const countQuery = 'SELECT COUNT(*) FROM agent_execution_logs WHERE agent_id = $1';
    const countResult = await database.query(countQuery, [agentId]);
    const total = parseInt(countResult.rows[0].count, 10);

    const query = `
      SELECT * FROM agent_execution_logs 
      WHERE agent_id = $1 
      ORDER BY started_at DESC 
      LIMIT $2 OFFSET $3
    `;

    const result = await database.query<ExecutionLog>(query, [
      agentId,
      limit,
      (page - 1) * limit,
    ]);

    const logs = result.rows.map(row => ({
      ...row,
      input: typeof row.input === 'string' ? JSON.parse(row.input) : row.input,
      output: row.output && typeof row.output === 'string' ? JSON.parse(row.output) : row.output,
    }));

    return { logs, total };
  }

  async getAgentMetrics(
    agentId: string,
    userId: string,
    period: string = '24h'
  ): Promise<AgentMetrics | null> {
    // Verify agent ownership
    const agent = await this.getAgent(agentId, userId);
    if (!agent) {
      return null;
    }

    const query = `
      SELECT 
        agent_id,
        COUNT(*) as execution_count,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failure_count,
        AVG(execution_time_ms) as avg_execution_time_ms,
        SUM(tokens_used) as total_tokens_used,
        SUM(cost) as total_cost
      FROM agent_execution_logs
      WHERE agent_id = $1 AND started_at > NOW() - INTERVAL '${period}'
      GROUP BY agent_id
    `;

    const result = await database.query(query, [agentId]);

    if (result.rows.length === 0) {
      return {
        agentId,
        period,
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
    }

    const row = result.rows[0];
    return {
      agentId,
      period,
      executionCount: parseInt(row.execution_count, 10),
      successCount: parseInt(row.success_count, 10),
      failureCount: parseInt(row.failure_count, 10),
      avgExecutionTimeMs: parseFloat(row.avg_execution_time_ms) || 0,
      totalTokensUsed: parseInt(row.total_tokens_used, 10) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      totalRevenue: 0, // TODO: Implement revenue tracking
      resourceUsage: {
        avgCpuPercent: 0, // TODO: Implement resource tracking
        avgMemoryMB: 0,
        avgStorageMB: 0,
      },
    };
  }

  private mapRowToAgent(row: any): Agent {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      version: row.version,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deployedAt: row.deployed_at,
      lastExecutedAt: row.last_executed_at,
      executionCount: row.execution_count,
      totalTokensUsed: row.total_tokens_used,
      totalCost: row.total_cost,
      totalRevenue: row.total_revenue,
      marketplaceListingId: row.marketplace_listing_id,
    };
  }
}

export default new AgentService();
