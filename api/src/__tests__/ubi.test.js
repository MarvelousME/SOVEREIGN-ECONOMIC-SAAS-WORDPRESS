/**
 * UBI Service Tests
 * Tests getBalance, getDistributionHistory, claimUbi, getPlatformStats
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('express-rate-limit', () => () => (req, res, next) => next());

jest.mock('../Models/db', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
    checkHealth: jest.fn().mockResolvedValue(new Date()),
    pool: { end: jest.fn(), on: jest.fn() },
}));

const db = require('../Models/db');
const app = require('../index');

const JWT_SECRET = process.env.JWT_SECRET;

function makeToken(userId = 42, username = 'ubiuser', roles = ['subscriber']) {
    return jwt.sign({ userId, username, roles }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
}

const PAST_CLAIM_OLD = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(); // 26 h ago (eligible)
const PAST_CLAIM_RECENT = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 h ago (blocked)

describe('UBI API', () => {
    beforeEach(() => jest.clearAllMocks());

    // ──────────────────────────────────────────────────────────────────────
    describe('GET /api/v1/ubi/balance', () => {
        it('should return balance for a user with an account', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ balance: '350.00', currency: 'UBI' }],
            });

            const res = await request(app)
                .get('/api/v1/ubi/balance')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.balance).toBe(350);
            expect(res.body.currency).toBe('UBI');
        });

        it('should return 0 balance for user with no account', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/v1/ubi/balance')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.balance).toBe(0);
            expect(res.body.currency).toBe('UBI');
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/ubi/balance');
            expect(res.status).toBe(401);
        });

        it('should return 500 on DB error', async () => {
            db.query.mockRejectedValueOnce(new Error('DB down'));

            const res = await request(app)
                .get('/api/v1/ubi/balance')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(500);
        });
    });

    // ──────────────────────────────────────────────────────────────────────
    describe('GET /api/v1/ubi/history', () => {
        it('should return paginated distribution history', async () => {
            const rows = [
                { id: 1, amount: 100, currency: 'UBI', type: 'ubi_distribution', created_at: PAST_CLAIM_OLD },
            ];
            db.query
                .mockResolvedValueOnce({ rows })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const res = await request(app)
                .get('/api/v1/ubi/history?page=1&limit=10')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.pagination.total).toBe(1);
        });

        it('should return empty history for new user', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/v1/ubi/history')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(0);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/ubi/history');
            expect(res.status).toBe(401);
        });
    });

    // ──────────────────────────────────────────────────────────────────────
    describe('POST /api/v1/ubi/claim', () => {
        it('should allow claiming UBI after 24-hour cooldown', async () => {
            // last claim was 26 hours ago → eligible
            db.query.mockResolvedValueOnce({ rows: [{ created_at: PAST_CLAIM_OLD }] });

            db.transaction.mockImplementationOnce(async (fn) => {
                return fn({
                    query: jest.fn().mockResolvedValue({ rows: [] }),
                });
            });

            const res = await request(app)
                .post('/api/v1/ubi/claim')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.amount).toBe(100);
            expect(res.body.currency).toBe('UBI');
            expect(res.body.message).toMatch(/successfully claimed/i);
        });

        it('should allow first-ever claim (no previous claims)', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // no last claim

            db.transaction.mockImplementationOnce(async (fn) => {
                return fn({
                    query: jest.fn().mockResolvedValue({ rows: [] }),
                });
            });

            const res = await request(app)
                .post('/api/v1/ubi/claim')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.amount).toBe(100);
        });

        it('should block claim within 24-hour cooldown window', async () => {
            // last claim was only 2 hours ago → blocked
            db.query.mockResolvedValueOnce({ rows: [{ created_at: PAST_CLAIM_RECENT }] });

            const res = await request(app)
                .post('/api/v1/ubi/claim')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(429);
            expect(res.body.error).toMatch(/already claimed/i);
            expect(res.body.error).toMatch(/hours/i);
        });

        it('should require authentication', async () => {
            const res = await request(app).post('/api/v1/ubi/claim');
            expect(res.status).toBe(401);
        });

        it('should return 500 on unexpected DB error', async () => {
            db.query.mockRejectedValueOnce(new Error('Unexpected error'));

            const res = await request(app)
                .post('/api/v1/ubi/claim')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(500);
        });
    });

    // ──────────────────────────────────────────────────────────────────────
    describe('GET /api/v1/ubi/stats', () => {
        it('should return platform-wide stats (public endpoint)', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ total: '1500' }] })    // active users
                .mockResolvedValueOnce({ rows: [{ total: '150000' }] })  // total distributed
                .mockResolvedValueOnce({ rows: [{ total: '1500' }] });   // total claims

            const res = await request(app).get('/api/v1/ubi/stats');

            expect(res.status).toBe(200);
            expect(res.body.active_users).toBe(1500);
            expect(res.body.total_ubi_distributed).toBe(150000);
            expect(res.body.total_claims).toBe(1500);
        });

        it('should return 500 on DB error', async () => {
            db.query.mockRejectedValueOnce(new Error('DB unavailable'));

            const res = await request(app).get('/api/v1/ubi/stats');
            expect(res.status).toBe(500);
        });
    });
});
