import { Router, Request, Response } from 'express';
import { digestService } from '../services/digest.service';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/users/:userId/notifications/digest-preferences - Get digest preferences for a user
router.get('/users/:userId/digest-preferences', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const preferences = await digestService.getOrCreateDigestPreferences(tenantId, userId);
    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to get digest preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/v1/users/:userId/notifications/digest-preferences - Update digest preferences for a user
router.put('/users/:userId/digest-preferences', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { userId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: 'Missing tenant_id header' });
    }

    const updateSchema = z.object({
      digest_frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
      digest_day: z.number().min(0).max(6).optional(),
      digest_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
    });

    const validation = updateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error });
    }

    const preferences = await digestService.updateDigestPreferences(
      tenantId,
      userId,
      validation.data
    );

    res.json({ preferences });
  } catch (error) {
    logger.error('Failed to update digest preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;