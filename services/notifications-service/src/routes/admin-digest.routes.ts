import { Router, Request, Response } from 'express';
import { digestService } from '../services/digest.service';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// POST /api/v1/notifications/process-digests - Process all due digests (admin/trigger endpoint)
router.post('/process-digests', async (req: Request, res: Response) => {
  try {
    const results = await digestService.processAllDigests();
    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    logger.error('Failed to process digests', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/notifications/digest-stats - Get digest statistics
router.get('/digest-stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const stats = await digestService.getDigestStats(tenantId);
    res.json({ stats });
  } catch (error) {
    logger.error('Failed to get digest stats', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;