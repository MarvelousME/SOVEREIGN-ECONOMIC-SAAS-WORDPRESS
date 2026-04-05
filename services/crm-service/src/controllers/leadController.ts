import { Request, Response } from 'express';
import { leadService } from '../services/leadService';
import { routingService } from '../services/routingService';
import { scoringService } from '../services/scoringService';
import { CreateLeadInput, UpdateLeadInput, LogActivityInput, ListQueryParams } from '../types';

export class LeadController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }

      const input: CreateLeadInput = req.body;
      if (!input.email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const lead = await leadService.create(tenantId, input);
      res.status(201).json(lead);
    } catch (error) {
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const lead = await leadService.getById(tenantId, id);
      if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }

      res.json(lead);
    } catch (error) {
      console.error('Error getting lead:', error);
      res.status(500).json({ error: 'Failed to get lead' });
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

      const result = await leadService.list(tenantId, params);
      res.json(result);
    } catch (error) {
      console.error('Error listing leads:', error);
      res.status(500).json({ error: 'Failed to list leads' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const input: UpdateLeadInput = req.body;

      const lead = await leadService.update(tenantId, id, input);
      if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }

      res.json(lead);
    } catch (error) {
      console.error('Error updating lead:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const deleted = await leadService.delete(tenantId, id);
      if (!deleted) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting lead:', error);
      res.status(500).json({ error: 'Failed to delete lead' });
    }
  }

  async convertToDeal(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const { name, value, pipelineId, stageId } = req.body;

      if (!name || !value || !pipelineId || !stageId) {
        res.status(400).json({ error: 'name, value, pipelineId, and stageId are required' });
        return;
      }

      const result = await leadService.convertToDeal(tenantId, id, { name, value, pipelineId, stageId });
      res.status(201).json(result);
    } catch (error) {
      console.error('Error converting lead to deal:', error);
      res.status(500).json({ error: 'Failed to convert lead to deal' });
    }
  }

  async logActivity(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const input: LogActivityInput = req.body;

      if (!input.type || !input.subject) {
        res.status(400).json({ error: 'type and subject are required' });
        return;
      }

      const activity = await leadService.logActivity(tenantId, id, input);
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error logging activity:', error);
      res.status(500).json({ error: 'Failed to log activity' });
    }
  }

  async getTimeline(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const params: ListQueryParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await leadService.getTimeline(tenantId, id, params);
      res.json(result);
    } catch (error) {
      console.error('Error getting timeline:', error);
      res.status(500).json({ error: 'Failed to get timeline' });
    }
  }

  async bulkImport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { leads } = req.body;

      if (!Array.isArray(leads)) {
        res.status(400).json({ error: 'leads array is required' });
        return;
      }

      const result = await leadService.bulkImport(tenantId, leads);
      res.json(result);
    } catch (error) {
      console.error('Error bulk importing leads:', error);
      res.status(500).json({ error: 'Failed to bulk import leads' });
    }
  }

  async getScore(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const score = await leadService.getScore(tenantId, id);
      if (!score) {
        res.status(404).json({ error: 'Score not found' });
        return;
      }

      res.json(score);
    } catch (error) {
      console.error('Error getting score:', error);
      res.status(500).json({ error: 'Failed to get score' });
    }
  }

  async recalculateScore(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const lead = await leadService.getById(tenantId, id);
      if (!lead) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }

      const score = await scoringService.recalculateScore(tenantId, lead);
      res.json(score);
    } catch (error) {
      console.error('Error recalculating score:', error);
      res.status(500).json({ error: 'Failed to recalculate score' });
    }
  }

  async getRoutingRules(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const rules = await routingService.getRoutingRules(tenantId);
      res.json(rules);
    } catch (error) {
      console.error('Error getting routing rules:', error);
      res.status(500).json({ error: 'Failed to get routing rules' });
    }
  }

  async createRoutingRule(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const rule = await routingService.createRoutingRule(tenantId, req.body);
      res.status(201).json(rule);
    } catch (error) {
      console.error('Error creating routing rule:', error);
      res.status(500).json({ error: 'Failed to create routing rule' });
    }
  }

  async getSLAMeasurements(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const measurements = await routingService.getSLAMeasurements(tenantId);
      res.json(measurements);
    } catch (error) {
      console.error('Error getting SLA measurements:', error);
      res.status(500).json({ error: 'Failed to get SLA measurements' });
    }
  }
}

export const leadController = new LeadController();
