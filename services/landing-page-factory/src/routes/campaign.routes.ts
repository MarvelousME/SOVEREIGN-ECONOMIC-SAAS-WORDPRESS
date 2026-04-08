import { Router, Request, Response, NextFunction } from 'express';
import { CampaignController } from '../controllers/campaign.controller';

export function createCampaignRoutes(controller: CampaignController): Router {
  const router = Router();

  router.use((req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;
    const userId = req.headers['x-user-id'] as string | undefined;

    if (!tenantId || !userId) {
      res.status(401).json({ success: false, error: 'Missing tenant or user context' });
      return;
    }

    (req.body as Record<string, unknown>).tenantId = tenantId;
    (req.body as Record<string, unknown>).userId = userId;
    next();
  });

  router.get('/', controller.listCampaigns);
  router.get('/reports', controller.getCampaignReport);
  router.post('/', controller.createCampaign);
  router.get('/:id', controller.getCampaign);
  router.patch('/:id', controller.updateCampaign);
  router.post('/:id/transition', controller.transitionCampaign);
  router.get('/:id/events', controller.listCampaignStateEvents);
  router.get('/:id/summary', controller.getCampaignSummary);
  router.post('/:id/agent-chain/run', controller.runAgentChain);
  router.get('/:id/agent-chain/latest', controller.getLatestAgentChainRun);

  return router;
}
