import { Response } from 'express';
import { z } from 'zod';
import { ledgerService } from '../services/ledger.service';
import { TenantRequest } from '../middleware/tenant.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { EntryType, TransactionStatus } from '../types';

type AuthTenantRequest = TenantRequest & AuthRequest;

// Validation schemas
const entrySchema = z.object({
  account_id: z.string().uuid(),
  type: z.nativeEnum(EntryType),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Amount must be a positive decimal with up to 2 decimal places'),
  currency: z.string().length(3)
});

export const createTransactionSchema = z.object({
  reference: z.string().min(1).max(255),
  description: z.string().min(1).max(1000),
  transaction_date: z.string().datetime().optional(),
  entries: z.array(entrySchema).min(2),
  // idempotency_key may also arrive via X-Idempotency-Key header; both are valid
  idempotency_key: z.string().uuid().optional(),
  metadata: z.record(z.any()).optional()
});

export class TransactionsController {
  async createTransaction(req: AuthTenantRequest, res: Response): Promise<void> {
    if (!req.tenantId) {
      res.status(400).json({ error: 'Bad Request', message: 'Tenant context missing' });
      return;
    }

    try {
      // Accept idempotency key from header (X-Idempotency-Key) OR body field.
      // Header takes precedence when both are present.
      const headerIdempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
      const idempotencyKey = headerIdempotencyKey || req.body.idempotency_key;

      const input = {
        ...req.body,
        transaction_date: req.body.transaction_date
          ? new Date(req.body.transaction_date)
          : undefined,
        idempotency_key: idempotencyKey || undefined,
        created_by: req.userId!
      };

      const transaction = await ledgerService.createTransaction(
        req.tenantId,
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

  async listTransactions(req: TenantRequest, res: Response): Promise<void> {
    if (!req.tenantId) {
      res.status(400).json({ error: 'Bad Request', message: 'Tenant context missing' });
      return;
    }

    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as TransactionStatus | undefined;
      const reference = req.query.reference as string | undefined;

      const transactions = await ledgerService.listTransactions(req.tenantId, {
        limit,
        offset,
        status,
        reference
      });

      res.json({
        transactions,
        limit,
        offset
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

  async getTransaction(req: TenantRequest, res: Response): Promise<void> {
    if (!req.tenantId) {
      res.status(400).json({ error: 'Bad Request', message: 'Tenant context missing' });
      return;
    }

    try {
      const transaction = await ledgerService.getTransaction(
        req.tenantId,
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
        req.tenantId,
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
    if (!req.tenantId) {
      res.status(400).json({ error: 'Bad Request', message: 'Tenant context missing' });
      return;
    }

    try {
      const reversingTransaction = await ledgerService.reverseTransaction(
        req.tenantId,
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
