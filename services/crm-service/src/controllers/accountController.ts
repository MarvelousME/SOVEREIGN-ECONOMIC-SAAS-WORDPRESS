import { Request, Response } from 'express';
import { accountService } from '../services/accountService';
import { enrichmentService } from '../services/enrichmentService';
import { CreateAccountInput, Account, ListQueryParams } from '../types';

export class AccountController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }

      const input: CreateAccountInput = req.body;
      if (!input.name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const account = await accountService.create(tenantId, input);
      res.status(201).json(account);
    } catch (error) {
      console.error('Error creating account:', error);
      res.status(500).json({ error: 'Failed to create account' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const account = await accountService.getById(tenantId, id);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      res.json(account);
    } catch (error) {
      console.error('Error getting account:', error);
      res.status(500).json({ error: 'Failed to get account' });
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

      const result = await accountService.list(tenantId, params);
      res.json(result);
    } catch (error) {
      console.error('Error listing accounts:', error);
      res.status(500).json({ error: 'Failed to list accounts' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const updates: Partial<Account> = req.body;

      const account = await accountService.update(tenantId, id, updates);
      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      res.json(account);
    } catch (error) {
      console.error('Error updating account:', error);
      res.status(500).json({ error: 'Failed to update account' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const deleted = await accountService.delete(tenantId, id);
      if (!deleted) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting account:', error);
      res.status(500).json({ error: 'Failed to delete account' });
    }
  }

  async getHierarchy(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const hierarchy = await accountService.getHierarchy(tenantId, id);
      res.json(hierarchy);
    } catch (error) {
      console.error('Error getting account hierarchy:', error);
      res.status(500).json({ error: 'Failed to get account hierarchy' });
    }
  }

  async enrich(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const { domain } = req.body;

      if (!domain) {
        res.status(400).json({ error: 'domain is required' });
        return;
      }

      const result = await enrichmentService.enrichAccountFromDomain(tenantId, id, domain);
      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json(result);
    } catch (error) {
      console.error('Error enriching account:', error);
      res.status(500).json({ error: 'Failed to enrich account' });
    }
  }

  async calculateScore(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const score = await accountService.calculateScore(tenantId, id);
      res.json({ score });
    } catch (error) {
      console.error('Error calculating account score:', error);
      res.status(500).json({ error: 'Failed to calculate score' });
    }
  }
}

export const accountController = new AccountController();
