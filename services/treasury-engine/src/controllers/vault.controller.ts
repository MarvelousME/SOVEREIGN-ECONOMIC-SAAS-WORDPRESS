import { Request, Response } from 'express';
import { TreasuryService } from '../services/treasury.service';
import { z } from 'zod';

const createVaultSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  currency: z.string().length(3).or(z.string().length(4)),
  strategy_id: z.string().uuid(),
  compounding_frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
});

const depositSchema = z.object({
  vault_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
});

const withdrawSchema = z.object({
  vault_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
});

const allocateSchema = z.object({
  vault_id: z.string().uuid(),
  strategy_id: z.string().uuid(),
});

const rebalanceSchema = z.object({
  vault_id: z.string().uuid(),
  force: z.boolean().optional(),
});

export class VaultController {
  constructor(private treasuryService: TreasuryService) {}

  getAllVaults = async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const vaults = await this.treasuryService.getAllVaults(limit, offset);
    res.json({ vaults, total: vaults.length });
  };

  getVault = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const vault = await this.treasuryService.getVault(id);
    res.json({ vault });
  };

  createVault = async (req: Request, res: Response): Promise<void> => {
    const data = createVaultSchema.parse(req.body);
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const vault = await this.treasuryService.createVault(data, userId);
    res.status(201).json({ vault });
  };

  deposit = async (req: Request, res: Response): Promise<void> => {
    const data = depositSchema.parse(req.body);
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const transaction = await this.treasuryService.deposit({
      ...data,
      user_id: userId,
    });

    res.status(201).json({ transaction });
  };

  withdraw = async (req: Request, res: Response): Promise<void> => {
    const data = withdrawSchema.parse(req.body);
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const transaction = await this.treasuryService.withdraw({
      ...data,
      user_id: userId,
    });

    res.status(201).json({ transaction });
  };

  allocate = async (req: Request, res: Response): Promise<void> => {
    const data = allocateSchema.parse(req.body);
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await this.treasuryService.allocateToStrategy(data, userId);
    res.json({ success: true, message: 'Strategy allocated successfully' });
  };

  rebalance = async (req: Request, res: Response): Promise<void> => {
    const data = rebalanceSchema.parse(req.body);
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await this.treasuryService.rebalance(data, userId);
    res.json({ result });
  };

  getPerformance = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const period = (req.query.period as string) || '30d';

    const metrics = await this.treasuryService.getPerformanceMetrics(id, period);
    res.json({ metrics });
  };
}
