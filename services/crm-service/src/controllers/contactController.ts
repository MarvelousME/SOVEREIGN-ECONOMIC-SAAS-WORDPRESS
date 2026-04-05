import { Request, Response } from 'express';
import { contactService } from '../services/contactService';
import { CreateContactInput, Contact, ListQueryParams } from '../types';

export class ContactController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID required' });
        return;
      }

      const input: CreateContactInput = req.body;
      if (!input.email || !input.firstName || !input.lastName) {
        res.status(400).json({ error: 'email, firstName, and lastName are required' });
        return;
      }

      const contact = await contactService.create(tenantId, input);
      res.status(201).json(contact);
    } catch (error) {
      console.error('Error creating contact:', error);
      res.status(500).json({ error: 'Failed to create contact' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const contact = await contactService.getById(tenantId, id);
      if (!contact) {
        res.status(404).json({ error: 'Contact not found' });
        return;
      }

      res.json(contact);
    } catch (error) {
      console.error('Error getting contact:', error);
      res.status(500).json({ error: 'Failed to get contact' });
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

      const result = await contactService.list(tenantId, params);
      res.json(result);
    } catch (error) {
      console.error('Error listing contacts:', error);
      res.status(500).json({ error: 'Failed to list contacts' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const updates: Partial<Contact> = req.body;

      const contact = await contactService.update(tenantId, id, updates);
      if (!contact) {
        res.status(404).json({ error: 'Contact not found' });
        return;
      }

      res.json(contact);
    } catch (error) {
      console.error('Error updating contact:', error);
      res.status(500).json({ error: 'Failed to update contact' });
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const deleted = await contactService.delete(tenantId, id);
      if (!deleted) {
        res.status(404).json({ error: 'Contact not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting contact:', error);
      res.status(500).json({ error: 'Failed to delete contact' });
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

      const result = await contactService.getTimeline(tenantId, id, params);
      res.json(result);
    } catch (error) {
      console.error('Error getting timeline:', error);
      res.status(500).json({ error: 'Failed to get timeline' });
    }
  }

  async logActivity(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const { type, subject, description, userId, metadata } = req.body;

      if (!type || !subject) {
        res.status(400).json({ error: 'type and subject are required' });
        return;
      }

      const activity = await contactService.logActivity(tenantId, id, { type, subject, description, userId, metadata });
      res.status(201).json(activity);
    } catch (error) {
      console.error('Error logging activity:', error);
      res.status(500).json({ error: 'Failed to log activity' });
    }
  }

  async getByAccount(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { accountId } = req.params;

      const contacts = await contactService.getByAccount(tenantId, accountId);
      res.json(contacts);
    } catch (error) {
      console.error('Error getting contacts by account:', error);
      res.status(500).json({ error: 'Failed to get contacts' });
    }
  }

  async setPrimary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const { accountId } = req.body;

      if (!accountId) {
        res.status(400).json({ error: 'accountId is required' });
        return;
      }

      await contactService.setPrimary(tenantId, id, accountId);
      res.status(204).send();
    } catch (error) {
      console.error('Error setting primary contact:', error);
      res.status(500).json({ error: 'Failed to set primary contact' });
    }
  }
}

export const contactController = new ContactController();
