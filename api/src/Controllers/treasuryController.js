/**
 * Treasury Controller
 * 
 * @version 1.0.0
 * Treasury management API endpoints
 */

const treasuryModel = require('../Models/treasury');

class TreasuryController {
    async balance(req, res) {
        try {
            const result = await treasuryModel.getBalance(req.user.userId);
            res.json(result);
        } catch (error) {
            console.error('Get treasury balance error:', error.message);
            res.status(500).json({ error: 'Failed to get balance' });
        }
    }

    async listStrategies(req, res) {
        try {
            const strategies = await treasuryModel.listStrategies();
            res.json({ strategies });
        } catch (error) {
            console.error('List strategies error:', error.message);
            res.status(500).json({ error: 'Failed to list strategies' });
        }
    }

    async deposit(req, res) {
        try {
            const { amount, currency = 'UBI', metadata = {} } = req.body;
            
            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }
            
            const result = await treasuryModel.deposit(req.user.userId, amount, currency, metadata);
            res.json({ message: 'Deposit successful', balance: result.balance });
        } catch (error) {
            console.error('Deposit error:', error.message);
            res.status(500).json({ error: 'Failed to process deposit' });
        }
    }

    async withdraw(req, res) {
        try {
            const { amount, currency = 'UBI', metadata = {} } = req.body;
            
            if (!amount || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }
            
            const result = await treasuryModel.withdraw(req.user.userId, amount, currency, metadata);
            res.json({ message: 'Withdrawal successful', balance: result.balance });
        } catch (error) {
            if (error.message === 'Insufficient balance') {
                return res.status(400).json({ error: 'Insufficient balance' });
            }
            console.error('Withdraw error:', error.message);
            res.status(500).json({ error: 'Failed to process withdrawal' });
        }
    }

    async getYield(req, res) {
        try {
            // Calculate yield based on user's treasury balance and strategies
            const balance = await treasuryModel.getBalance(req.user.userId);
            const strategies = await treasuryModel.listStrategies();
            
            // Simple yield calculation (could be enhanced with actual protocol integration)
            const avgApy = strategies.reduce((sum, s) => sum + parseFloat(s.apy || 0), 0) / strategies.length || 5;
            const currentYield = (parseFloat(balance.balance) * avgApy) / 100;
            
            res.json({
                balance: balance.balance,
                currency: balance.currency,
                current_apy: avgApy,
                estimated_annual_yield: currentYield,
            });
        } catch (error) {
            console.error('Get yield error:', error.message);
            res.status(500).json({ error: 'Failed to calculate yield' });
        }
    }
}

module.exports = new TreasuryController();