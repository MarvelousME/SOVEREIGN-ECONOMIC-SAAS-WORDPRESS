/**
 * UBI Distribution Service
 *
 * @version 1.0.0
 * Handles Universal Basic Income calculation and distribution.
 */

const db = require('../Models/db');

class UbiService {
    /**
     * Get UBI balance for a user (their treasury account balance).
     */
    async getBalance(userId) {
        const result = await db.query(
            'SELECT COALESCE(balance, 0) AS balance, currency FROM treasury_accounts WHERE user_id = $1',
            [userId]
        );
        return {
            balance:  parseFloat(result.rows[0]?.balance || 0),
            currency: result.rows[0]?.currency || 'UBI',
        };
    }

    /**
     * Get UBI distribution history for a user (paginated).
     */
    async getDistributionHistory(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [result, countResult] = await Promise.all([
            db.query(
                `SELECT * FROM rewards
                 WHERE user_id = $1 AND type = 'ubi_distribution'
                 ORDER BY created_at DESC
                 LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            ),
            db.query(
                `SELECT COUNT(*) FROM rewards WHERE user_id = $1 AND type = 'ubi_distribution'`,
                [userId]
            ),
        ]);
        const total = parseInt(countResult.rows[0].count);
        return {
            data: result.rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }

    /**
     * Claim UBI for a user (manual claim with 24-hour cooldown).
     *
     * In production this would additionally be triggered by the UBI engine
     * on a schedule. The manual claim path is gated by a per-user cooldown
     * stored in the rewards table so no extra state table is required.
     */
    async claimUbi(userId) {
        const BASE_UBI_AMOUNT   = 100; // 100 UBI per claim
        const CLAIM_COOLDOWN_HOURS = 24;

        // Check when the user last claimed
        const lastClaim = await db.query(
            `SELECT created_at FROM rewards
             WHERE user_id = $1 AND type = 'ubi_distribution'
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (lastClaim.rows.length > 0) {
            const lastClaimTime     = new Date(lastClaim.rows[0].created_at);
            const hoursSinceLastClaim = (Date.now() - lastClaimTime.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastClaim < CLAIM_COOLDOWN_HOURS) {
                const hoursRemaining = Math.ceil(CLAIM_COOLDOWN_HOURS - hoursSinceLastClaim);
                throw new Error(`UBI already claimed. Next claim available in ${hoursRemaining} hours.`);
            }
        }

        return db.transaction(async (client) => {
            // Record the reward distribution
            await client.query(
                `INSERT INTO rewards (user_id, amount, currency, type, source_type, status, processed_at)
                 VALUES ($1, $2, 'UBI', 'ubi_distribution', 'ubi_engine', 'completed', NOW())`,
                [userId, BASE_UBI_AMOUNT]
            );

            // Credit the treasury account (upsert — creates account if first claim)
            await client.query(
                `INSERT INTO treasury_accounts (user_id, balance, currency)
                 VALUES ($1, $2, 'UBI')
                 ON CONFLICT (user_id) DO UPDATE
                     SET balance    = treasury_accounts.balance + $2,
                         updated_at = NOW()`,
                [userId, BASE_UBI_AMOUNT]
            );

            return {
                amount:   BASE_UBI_AMOUNT,
                currency: 'UBI',
                message:  `Successfully claimed ${BASE_UBI_AMOUNT} UBI`,
            };
        });
    }

    /**
     * Get platform-wide UBI statistics (public endpoint).
     */
    async getPlatformStats() {
        const [usersResult, distributedResult, claimsResult] = await Promise.all([
            db.query(
                `SELECT COUNT(*) AS total FROM users WHERE status = $1`,
                ['active']
            ),
            db.query(
                `SELECT COALESCE(SUM(amount), 0) AS total
                 FROM rewards
                 WHERE type = 'ubi_distribution' AND status = 'completed'`
            ),
            db.query(
                `SELECT COUNT(*) AS total
                 FROM rewards
                 WHERE type = 'ubi_distribution' AND status = 'completed'`
            ),
        ]);

        return {
            active_users:           parseInt(usersResult.rows[0].total),
            total_ubi_distributed:  parseFloat(distributedResult.rows[0].total),
            total_claims:           parseInt(claimsResult.rows[0].total),
        };
    }
}

module.exports = new UbiService();
