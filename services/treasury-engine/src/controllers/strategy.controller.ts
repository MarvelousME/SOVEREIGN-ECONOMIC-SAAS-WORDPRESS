import { Request, Response } from 'express';
import { TreasuryService } from '../services/treasury.service';

export class StrategyController {
  constructor(private treasuryService: TreasuryService) {}

  getAllStrategies = async (req: Request, res: Response): Promise<void> => {
    const strategies = await this.treasuryService.getAllStrategies();
    res.json({ strategies, total: strategies.length });
  };

  getStrategy = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const strategy = await this.treasuryService.getStrategy(id);
    res.json({ strategy });
  };
}
