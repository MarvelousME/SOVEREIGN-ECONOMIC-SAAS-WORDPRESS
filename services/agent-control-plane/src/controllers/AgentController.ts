import { Request, Response } from 'express';
import agentService from '../services/AgentService';
import logger from '../utils/logger';
import {
  CreateAgentRequestSchema,
  UpdateAgentRequestSchema,
  AgentStatus,
  DeploymentStrategy,
} from '../types';

export class AgentController {
  async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      // Validate request
      const validatedRequest = CreateAgentRequestSchema.parse(req.body);
      
      const agent = await agentService.createAgent(userId, validatedRequest);
      
      res.status(201).json({
        success: true,
        data: agent,
      });
    } catch (error: any) {
      logger.error('Failed to create agent', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const agent = await agentService.getAgent(id, userId);
      
      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: agent,
      });
    } catch (error: any) {
      logger.error('Failed to get agent', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async listAgents(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const type = req.query.type as string | undefined;
      const status = req.query.status as AgentStatus | undefined;
      
      const result = await agentService.listAgents(userId, page, limit, { type, status });
      
      res.json({
        success: true,
        data: result.agents,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error: any) {
      logger.error('Failed to list agents', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      // Validate request
      const validatedRequest = UpdateAgentRequestSchema.parse(req.body);
      
      const agent = await agentService.updateAgent(id, userId, validatedRequest);
      
      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: agent,
      });
    } catch (error: any) {
      logger.error('Failed to update agent', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deployAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const deploymentConfig = {
        strategy: req.body.strategy || DeploymentStrategy.DIRECT,
        canaryPercent: req.body.canaryPercent,
        healthCheckPath: req.body.healthCheckPath,
        rollbackOnFailure: req.body.rollbackOnFailure !== false,
        maxRolloutDuration: req.body.maxRolloutDuration,
      };
      
      const agent = await agentService.deployAgent(id, userId, deploymentConfig);
      
      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: agent,
        message: 'Agent deployed successfully',
      });
    } catch (error: any) {
      logger.error('Failed to deploy agent', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async pauseAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const agent = await agentService.pauseAgent(id, userId);
      
      if (!agent) {
        res.status(404).json({
          success: false,
          error: 'Agent not found or not deployed',
        });
        return;
      }
      
      res.json({
        success: true,
        data: agent,
        message: 'Agent paused successfully',
      });
    } catch (error: any) {
      logger.error('Failed to pause agent', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deleteAgent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const deleted = await agentService.deleteAgent(id, userId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Agent deleted successfully',
      });
    } catch (error: any) {
      logger.error('Failed to delete agent', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getAgentLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const result = await agentService.getAgentLogs(id, userId, page, limit);
      
      res.json({
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get agent logs', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getAgentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const period = req.query.period as string || '24h';
      
      const metrics = await agentService.getAgentMetrics(id, userId, period);
      
      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      logger.error('Failed to get agent metrics', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new AgentController();
