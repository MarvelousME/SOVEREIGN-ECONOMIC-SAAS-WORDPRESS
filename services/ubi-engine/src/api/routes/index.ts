import { Router } from 'express';
import { ubiController } from '../controllers/ubi-controller';
import { adminController } from '../controllers/admin-controller';
import { eventsController } from '../controllers/events-controller';

const router = Router();

// Public UBI endpoints
router.get('/api/v1/ubi/balance', (req, res) => ubiController.getBalance(req, res));
router.post('/api/v1/ubi/claim', (req, res) => ubiController.claimUBI(req, res));
router.get('/api/v1/ubi/history', (req, res) => ubiController.getHistory(req, res));
router.get('/api/v1/ubi/eligibility', (req, res) => ubiController.getEligibility(req, res));
router.get('/api/v1/ubi/stats', (req, res) => ubiController.getStats(req, res));

// Admin endpoints (should be protected with auth middleware in production)
router.post('/api/v1/ubi/pool', (req, res) => adminController.configurePool(req, res));
router.post('/api/v1/ubi/distribute', (req, res) => adminController.triggerDistribution(req, res));
router.get('/api/v1/ubi/admin/distributions', (req, res) => adminController.getAllDistributions(req, res));
router.put('/api/v1/ubi/admin/pool/:poolId', (req, res) => adminController.updatePool(req, res));

// Internal: workflow activities publish domain events to NATS
router.post('/api/events', (req, res) => eventsController.publish(req, res));

// Health check
router.get('/health', async (req, res) => {
  const { db } = await import('../../database');
  const { cache } = await import('../../cache/redis');
  const { natsClient } = await import('../../events/nats-client');

  const dbHealthy = await db.healthCheck();
  const cacheHealthy = await cache.healthCheck();
  const natsHealthy = await natsClient.healthCheck();

  const healthy = dbHealthy && cacheHealthy && natsHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    services: {
      database: dbHealthy ? 'up' : 'down',
      cache: cacheHealthy ? 'up' : 'down',
      nats: natsHealthy ? 'up' : 'down'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
