/**
 * Reward Controller
 * 
 * @version 1.0.0
 * Reward management API endpoints
 */

const rewardModel = require('../Models/reward');

class RewardController {
    async list(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const result = await rewardModel.listByUser(req.user.userId, parseInt(page), parseInt(limit));
            res.json(result);
        } catch (error) {
            console.error('List rewards error:', error.message);
            res.status(500).json({ error: 'Failed to list rewards' });
        }
    }

    async balance(req, res) {
        try {
            const balance = await rewardModel.getUserBalance(req.user.userId);
            res.json({ balance, currency: 'UBI' });
        } catch (error) {
            console.error('Get balance error:', error.message);
            res.status(500).json({ error: 'Failed to get balance' });
        }
    }

    async history(req, res) {
        try {
            const { page = 1, limit = 50 } = req.query;
            const result = await rewardModel.listByUser(req.user.userId, parseInt(page), parseInt(limit));
            res.json(result);
        } catch (error) {
            console.error('Get history error:', error.message);
            res.status(500).json({ error: 'Failed to get reward history' });
        }
    }
}

module.exports = new RewardController();