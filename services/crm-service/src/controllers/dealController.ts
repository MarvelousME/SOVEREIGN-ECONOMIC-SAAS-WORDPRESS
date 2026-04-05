import { Request, Response } from 'express';
import { dealService } from '../services/dealService';
import { CreateDealInput, UpdateDealStageInput, Deal, ListQueryParams } from '../types';

export class DealController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }

      const input: CreateDealInput = req.body;
      if (!input.name || !input.accountId || !input.stageId || !input.pipelineId) {
        res.status(400).json({ error: 'name, accountId, stageId, and pipelineId are required' });
        return;
      }

      const deal = await dealService.create(tenantId, input);
      res.status(201).json(deal);
    } catch (error) {
      console.error('Error creating deal:', error);
      res.status(500).json({ error: 'Failed to create deal' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const deal = await dealService.getById(tenantId, id);
      if (!deal) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      res.json(deal);
    } catch (error) {
      console.error('Error getting deal:', error);
      res.status(500).json({ error: 'Failed to get deal' });
    }
  }

  async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const params: ListQueryParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        search: req.query.search as string,
        filter: req.query.filter ? JSON.parse(req.query.filter as string) : undefined,
      };

      const result = await dealService.list(tenantId, params);
      res.json(result);
    } catch (error) {
      console.error('Error listing deals:', error);
      res.status(500).json({ error: 'Failed to list deals' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const updates: Partial<Deal> = req.body;

      const deal = await dealService.update(tenantId, id, updates);
      if (!deal) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      res.json(deal);
    } catch (error) {
      console.error('Error updating deal:', error);
      res.status(500).json({ error: 'Failed to update deal' });
    }
  }

  async updateStage(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const input: UpdateDealStageInput = req.body;

      if (!input.stageId) {
        res.status(400).json({ error: 'stageId is required' });
        return;
      }

      const deal = await dealService.updateStage(tenantId, id, input);
      if (!deal) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      res.json(deal);
    } catch (error) {
      console.error('Error updating deal stage:', error);
      res.status(500).json({ error: 'Failed to update deal stage' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const deleted = await dealService.delete(tenantId, id);
      if (!deleted) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting deal:', error);
      res.status(500).json({ error: 'Failed to delete deal' });
    }
  }

  async getActivities(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const activities = await dealService.getActivities(tenantId, id);
      res.json(activities);
    } catch (error) {
      console.error('Error getting deal activities:', error);
      res.status(500).json({ error: 'Failed to get activities' });
    }
  }

  async logActivity(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const { type, description, fromValue, toValue, userId, metadata } = req.body;

      if (!type || !description) {
        res.status(400).json({ error: 'type and description are required' });
        return;
      }

      const activity = await dealService.logActivity(tenantId, id, { type, description, fromValue, toValue, userId, metadata });
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error logging deal activity:', error);
      res.status(500).json({ error: 'Failed to log activity' });
    }
  }

  async getPipelines(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const pipelines = await dealService.getPipelines(tenantId);
      res.json(pipelines);
    } catch (error) {
      console.error('Error getting pipelines:', error);
      res.status(500).json({ error: 'Failed to get pipelines' });
    }
  }

  async getPipelineView(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { pipelineId } = req.params;

      const view = await dealService.getPipelineView(tenantId, pipelineId);
      res.json(view);
    } catch (error) {
      console.error('Error getting pipeline view:', error);
      res.status(500).json({ error: 'Failed to get pipeline view' });
    }
  }

  async createPipeline(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { name, description, isDefault } = req.body;

      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const pipeline = await dealService.createPipeline(tenantId, name, description, isDefault);
      res.status(201).json(pipeline);
    } catch (error) {
      console.error('Error creating pipeline:', error);
      res.status(500).json({ error: 'Failed to create pipeline' });
    }
  }

  async createStage(req: Request, res: Response): Promise<void> {
    try {
      const { pipelineId } = req.params;
      const { name, order, probability, isWinStage, isLossStage, daysToAdvance } = req.body;

      if (!name || order === undefined || probability === undefined) {
        res.status(400).json({ error: 'name, order, and probability are required' });
        return;
      }

      const stage = await dealService.createStage(pipelineId, name, order, probability, { isWinStage, isLossStage, daysToAdvance });
      res.status(201).json(stage);
    } catch (error) {
      console.error('Error creating stage:', error);
      res.status(500).json({ error: 'Failed to create stage' });
    }
  }

  async winAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analysis = await dealService.winAnalysis(tenantId, startDate, endDate);
      res.json(analysis);
    } catch (error) {
      console.error('Error getting win analysis:', error);
      res.status(500).json({ error: 'Failed to get win analysis' });
    }
  }
}

export const dealController = new DealController();
