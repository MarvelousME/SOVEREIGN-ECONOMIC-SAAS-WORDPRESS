import { Router } from 'express';
import { ReputationController } from './controllers/ReputationController';
import { authMiddleware } from '../infrastructure/middleware/auth';
import { validateRequest } from '../infrastructure/middleware/validation';
import { rateLimiter } from '../infrastructure/middleware/rateLimit';

export function createReputationRouter(): Router {
  const router = Router();
  const controller = new ReputationController();

  // GET /api/v1/reputation/:userId - Get reputation
  router.get(
    '/:userId',
    rateLimiter({ max: 50, windowMs: 60000 }), // 50 requests per minute
    controller.getReputation.bind(controller)
  );

  // GET /api/v1/reputation/:userId/skills - Skill breakdown
  router.get(
    '/:userId/skills',
    rateLimiter({ max: 30, windowMs: 60000 }),
    controller.getUserSkills.bind(controller)
  );

  // POST /api/v1/reputation/validate-skill - Validate skill
  router.post(
    '/validate-skill',
    authMiddleware,
    rateLimiter({ max: 10, windowMs: 60000 }),
    validateRequest('validateSkill'),
    controller.validateSkill.bind(controller)
  );

  // GET /api/v1/reputation/leaderboard - Top users
  router.get(
    '/leaderboard',
    rateLimiter({ max: 20, windowMs: 60000 }),
    controller.getLeaderboard.bind(controller)
  );

  // GET /api/v1/reputation/:userId/history - Score history
  router.get(
    '/:userId/history',
    rateLimiter({ max: 20, windowMs: 60000 }),
    controller.getReputationHistory.bind(controller)
  );

  // GET /api/v1/reputation/:userId/achievements - User achievements
  router.get(
    '/:userId/achievements',
    rateLimiter({ max: 20, windowMs: 60000 }),
    controller.getUserAchievements.bind(controller)
  );

  // POST /api/v1/reputation/endorse - Endorse user skill
  router.post(
    '/endorse',
    authMiddleware,
    rateLimiter({ max: 5, windowMs: 60000 }),
    validateRequest('endorseUser'),
    controller.endorseUser.bind(controller)
  );

  // GET /api/v1/reputation/:userId/benefits - Get reputation benefits
  router.get(
    '/:userId/benefits',
    rateLimiter({ max: 30, windowMs: 60000 }),
    controller.getReputationBenefits.bind(controller)
  );

  // POST /api/v1/reputation/recalculate - Trigger recalculation (admin)
  router.post(
    '/recalculate/:userId',
    authMiddleware,
    rateLimiter({ max: 5, windowMs: 60000 }),
    controller.recalculateReputation.bind(controller)
  );

  // GET /api/v1/reputation/:userId/fraud-alerts - Get fraud alerts
  router.get(
    '/:userId/fraud-alerts',
    authMiddleware,
    rateLimiter({ max: 10, windowMs: 60000 }),
    controller.getFraudAlerts.bind(controller)
  );

  return router;
}
