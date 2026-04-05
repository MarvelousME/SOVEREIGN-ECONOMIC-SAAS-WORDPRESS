import { Router } from 'express';
import { RewardsController } from './controllers/RewardsController';
import { authMiddleware } from '../infrastructure/middleware/auth';
import { validateRequest } from '../infrastructure/middleware/validation';
import { rateLimiter } from '../infrastructure/middleware/rateLimit';

export function createRewardsRouter(): Router {
  const router = Router();
  const controller = new RewardsController();

  // POST /api/v1/rewards/calculate - Calculate reward for action
  router.post(
    '/calculate',
    authMiddleware,
    rateLimiter({ max: 100, windowMs: 60000 }), // 100 requests per minute
    validateRequest('calculateReward'),
    controller.calculateReward.bind(controller)
  );

  // GET /api/v1/rewards/history - User reward history
  router.get(
    '/history',
    authMiddleware,
    rateLimiter({ max: 30, windowMs: 60000 }),
    controller.getRewardHistory.bind(controller)
  );

  // GET /api/v1/rewards/pending - Pending rewards
  router.get(
    '/pending',
    authMiddleware,
    rateLimiter({ max: 30, windowMs: 60000 }),
    controller.getPendingRewards.bind(controller)
  );

  // POST /api/v1/rewards/claim - Claim rewards
  router.post(
    '/claim',
    authMiddleware,
    rateLimiter({ max: 10, windowMs: 60000 }), // 10 claims per minute
    validateRequest('claimReward'),
    controller.claimRewards.bind(controller)
  );

  // GET /api/v1/rewards/stats - Aggregate statistics
  router.get(
    '/stats',
    authMiddleware,
    rateLimiter({ max: 20, windowMs: 60000 }),
    controller.getRewardStats.bind(controller)
  );

  // GET /api/v1/rewards/pools - Get active reward pools
  router.get(
    '/pools',
    rateLimiter({ max: 20, windowMs: 60000 }),
    controller.getRewardPools.bind(controller)
  );

  // GET /api/v1/rewards/multipliers/:userId - Get user multipliers
  router.get(
    '/multipliers/:userId',
    authMiddleware,
    rateLimiter({ max: 30, windowMs: 60000 }),
    controller.getUserMultipliers.bind(controller)
  );

  return router;
}
