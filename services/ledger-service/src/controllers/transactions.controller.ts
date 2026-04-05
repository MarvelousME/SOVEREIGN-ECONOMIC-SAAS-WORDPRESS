import { Response } from 'express';
import { z } from 'zod';
import { ledgerService } from '../services/ledger.service';
import { TenantRequest } from '../middleware/tenant.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { EntryType } from '../types';

type AuthTenantRequest = TenantRequest & AuthRequest;

// Validation schemas
const entrySchema = z.object({
  account_id: z.string().uuid(),
  type: z.nativeEnum(EntryType),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3)
});

export const createTransactionSchema = z.object({
  reference: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  transaction_date: z.string().datetime().optional(),
  entries: z.array(entrySchema).min(2),
  idempotency_key: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

export class TransactionsController {
  async createTransaction(req: AuthTenantRequest, res: Response): Promise<void> {
    try {
      const input = {
        ...req.body,
        transaction_date: req.body.transaction_date 
          ? new Date(req.body.transaction_date) 
          : undefined,
        created_by: req.userId!
      };

      const transaction = await ledgerService.createTransaction(
        req.tenantId!,
        input
      );

      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({
          error: 'Bad Request',
          message: error.message
        });
      }
    }
  }

  async getTransaction(req: TenantRequest, res: Response): Promise<void> {
    try {
      const transaction = await ledgerService.getTransaction(
        req.tenantId!,
        req.params.id
      );

      if (!transaction) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Transaction not found'
        });
        return;
      }

      // Also get entries
      const entries = await ledgerService.getTransactionEntries(
        req.tenantId!,
        req.params.id
      );

      res.json({
        ...transaction,
        entries
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error.message
        });
      }
    }
  }

  async reverseTransaction(req: AuthTenantRequest, res: Response): Promise<void> {
    try {
      const reversingTransaction = await ledgerService.reverseTransaction(
        req.tenantId!,
        req.params.id,
        req.userId!
      );

      res.status(201).json(reversingTransaction);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: 'Not Found',
            message: error.message
          });
          return;
        }
        res.status(400).json({
          error: 'Bad Request',
          message: error.message
        });
      }
    }
  }
}

export const transactionsController = new TransactionsController();
