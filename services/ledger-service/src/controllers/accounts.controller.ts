import { Response } from 'express';
import { z } from 'zod';
import { ledgerService } from '../services/ledger.service';
import { TenantRequest } from '../middleware/tenant.middleware';
import { AccountType } from '../types';

// Validation schemas
export const createAccountSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  type: z.nativeEnum(AccountType),
  currency: z.string().length(3),
  parent_id: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

export class AccountsController {
  async createAccount(req: TenantRequest, res: Response): Promise<void> {
    try {
      const account = await ledgerService.createAccount(
        req.tenantId!,
        req.body
      );

      res.status(201).json(account);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message
        });
      }
    }
  }

  async getAccount(req: TenantRequest, res: Response): Promise<void> {
    try {
      const account = await ledgerService.getAccount(
        req.tenantId!,
        req.params.id
      );

      if (!account) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Account not found'
        });
        return;
      }

      res.json(account);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message
        });
      }
    }
  }

  async getAccountBalance(req: TenantRequest, res: Response): Promise<void> {
    try {
      const balance = await ledgerService.getAccountBalance(
        req.tenantId!,
        req.params.id
      );

      res.json(balance);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Account not found') {
          res.status(404).json({
            error: 'Not Found',
            message: error.message
          });
          return;
        }
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message
        });
      }
    }
  }

  async getAccountStatement(req: TenantRequest, res: Response): Promise<void> {
    try {
      const startDate = new Date(req.query.start_date as string);
      const endDate = new Date(req.query.end_date as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid start_date or end_date'
        });
        return;
      }

      const statement = await ledgerService.getAccountStatement(
        req.tenantId!,
        req.params.id,
        startDate,
        endDate
      );

      res.json(statement);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Account not found') {
          res.status(404).json({
            error: 'Not Found',
            message: error.message
          });
          return;
        }
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message
        });
      }
    }
  }

  async getAccountHistory(req: TenantRequest, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const history = await ledgerService.getAccountHistory(
        req.tenantId!,
        req.params.id,
        limit,
        offset
      );

      res.json({
        entries: history,
        limit,
        offset
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Account not found') {
          res.status(404).json({
            error: 'Not Found',
            message: error.message
          });
          return;
        }
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message
        });
      }
    }
  }
}

export const accountsController = new AccountsController();
