import { Router } from 'express';
import ReferralController from '../controllers/referralController';

const router = Router();
const referralController = new ReferralController();

// Referral routes
router.get('/my-code', referralController.getMyCode);
router.post('/register', referralController.registerWithCode);
router.get('/stats', referralController.getStats);
router.get('/tree', referralController.getTree);
router.get('/rewards', referralController.getRewards);
router.get('/leaderboard', referralController.getLeaderboard);

// Payout routes
router.post('/payout', referralController.requestPayout);
router.get('/payout/history', referralController.getPayoutHistory);
router.get('/payout/audit-log', referralController.getPayoutAuditLog);

export default router;
