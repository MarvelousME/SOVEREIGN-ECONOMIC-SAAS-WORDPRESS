/**
 * Rewards Endpoint Tests
 *
 * rewardModel.listByUser   → two db.query calls (SELECT + COUNT)
 * rewardModel.getUserBalance → one db.query call (SUM aggregate)
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Bypass rate limiting so tests don't hit 429
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

jest.mock('../Models/db', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
    checkHealth: jest.fn().mockResolvedValue(new Date()),
    pool: { end: jest.fn(), on: jest.fn() },
}));

const db = require('../Models/db');
const app = require('../index');

function makeToken(userId = 1) {
    return jwt.sign(
        { userId, username: 'testuser', roles: ['subscriber'] },
        process.env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
    );
}

describe('Rewards API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ------------------------------------------------------------------ //
    //  GET /api/v1/rewards/balance
    // ------------------------------------------------------------------ //
    describe('GET /api/v1/rewards/balance', () => {
        it('should return reward balance', async () => {
            // rewardModel.getUserBalance → SUM query
            db.query.mockResolvedValueOnce({
                rows: [{ balance: '250.50' }]
            });

            const res = await request(app)
                .get('/api/v1/rewards/balance')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('balance');
            expect(res.body).toHaveProperty('currency', 'UBI');
        });

        it('should return zero for user with no rewards', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ balance: '0' }] });

            const res = await request(app)
                .get('/api/v1/rewards/balance')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(parseFloat(res.body.balance)).toBe(0);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/rewards/balance');
            expect(res.status).toBe(401);
        });
    });

    // ------------------------------------------------------------------ //
    //  GET /api/v1/rewards/history
    // ------------------------------------------------------------------ //
    describe('GET /api/v1/rewards/history', () => {
        it('should return reward history with pagination', async () => {
            // rewardModel.listByUser: SELECT then COUNT
            db.query
                .mockResolvedValueOnce({
                    rows: [
                        { id: 1, amount: '100', currency: 'UBI', type: 'task_reward', status: 'completed', created_at: new Date() },
                        { id: 2, amount: '50', currency: 'UBI', type: 'ubi_distribution', status: 'completed', created_at: new Date() },
                    ]
                })
                .mockResolvedValueOnce({ rows: [{ count: '2' }] });

            const res = await request(app)
                .get('/api/v1/rewards/history')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBe(2);
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.pagination.total).toBe(2);
        });

        it('should return empty array when no history', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/v1/rewards/history')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toEqual([]);
            expect(res.body.pagination.total).toBe(0);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/rewards/history');
            expect(res.status).toBe(401);
        });
    });

    // ------------------------------------------------------------------ //
    //  GET /api/v1/rewards  (list - same model, same response shape)
    // ------------------------------------------------------------------ //
    describe('GET /api/v1/rewards', () => {
        it('should list rewards for authenticated user', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 1, amount: '75', currency: 'UBI', type: 'task_reward', status: 'completed', created_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const res = await request(app)
                .get('/api/v1/rewards')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/rewards');
            expect(res.status).toBe(401);
        });
    });
});
