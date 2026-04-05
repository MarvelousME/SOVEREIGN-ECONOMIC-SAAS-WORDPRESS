/**
 * Treasury Endpoint Tests
 *
 * treasury.deposit and treasury.withdraw use db.transaction() which wraps
 * a callback with a client.query function.  We mock db.transaction to call
 * the callback with a fake client.
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

const JWT_SECRET = process.env.JWT_SECRET;

function makeToken(userId = 1) {
    return jwt.sign(
        { userId, username: 'testuser', roles: ['subscriber'] },
        JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
    );
}

describe('Treasury API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ------------------------------------------------------------------ //
    //  GET /api/v1/treasury/balance
    // ------------------------------------------------------------------ //
    describe('GET /api/v1/treasury/balance', () => {
        it('should return balance for existing account', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ balance: '100.00', currency: 'UBI' }]
            });

            const res = await request(app)
                .get('/api/v1/treasury/balance')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('balance');
            expect(res.body).toHaveProperty('currency');
        });

        it('should return zero balance for new user (no row)', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/v1/treasury/balance')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(parseFloat(res.body.balance)).toBe(0);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/treasury/balance');
            expect(res.status).toBe(401);
        });
    });

    // ------------------------------------------------------------------ //
    //  GET /api/v1/treasury/strategies
    // ------------------------------------------------------------------ //
    describe('GET /api/v1/treasury/strategies', () => {
        it('should return a list of yield strategies', async () => {
            db.query.mockResolvedValueOnce({
                rows: [
                    { id: 1, name: 'Safe Savings', apy: '4.50', risk_level: 'low', active: true },
                    { id: 2, name: 'Balanced', apy: '8.20', risk_level: 'medium', active: true },
                ]
            });

            const res = await request(app)
                .get('/api/v1/treasury/strategies')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('strategies');
            expect(Array.isArray(res.body.strategies)).toBe(true);
            expect(res.body.strategies.length).toBe(2);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/treasury/strategies');
            expect(res.status).toBe(401);
        });
    });

    // ------------------------------------------------------------------ //
    //  GET /api/v1/treasury/yield
    // ------------------------------------------------------------------ //
    describe('GET /api/v1/treasury/yield', () => {
        it('should return yield calculation', async () => {
            // getBalance
            db.query.mockResolvedValueOnce({ rows: [{ balance: '1000.00', currency: 'UBI' }] });
            // listStrategies
            db.query.mockResolvedValueOnce({
                rows: [{ apy: '5.00' }, { apy: '10.00' }]
            });

            const res = await request(app)
                .get('/api/v1/treasury/yield')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('balance');
            expect(res.body).toHaveProperty('current_apy');
            expect(res.body).toHaveProperty('estimated_annual_yield');
        });
    });

    // ------------------------------------------------------------------ //
    //  POST /api/v1/treasury/deposit
    // ------------------------------------------------------------------ //
    describe('POST /api/v1/treasury/deposit', () => {
        it('should process a valid deposit', async () => {
            db.transaction.mockImplementationOnce(async (callback) => {
                const client = {
                    query: jest.fn()
                        .mockResolvedValueOnce({ rows: [{ balance: '200.00' }] })  // INSERT/UPDATE treasury_accounts
                        .mockResolvedValueOnce({ rows: [] }),                       // INSERT treasury_transactions
                };
                return callback(client);
            });

            const res = await request(app)
                .post('/api/v1/treasury/deposit')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ amount: 100, currency: 'UBI' });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('successful');
            expect(res.body).toHaveProperty('balance');
        });

        it('should reject negative amount', async () => {
            const res = await request(app)
                .post('/api/v1/treasury/deposit')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ amount: -50 });

            expect(res.status).toBe(400);
        });

        it('should reject zero amount', async () => {
            const res = await request(app)
                .post('/api/v1/treasury/deposit')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ amount: 0 });

            expect(res.status).toBe(400);
        });

        it('should reject missing amount', async () => {
            const res = await request(app)
                .post('/api/v1/treasury/deposit')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({});

            expect(res.status).toBe(400);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/v1/treasury/deposit')
                .send({ amount: 100 });

            expect(res.status).toBe(401);
        });
    });

    // ------------------------------------------------------------------ //
    //  POST /api/v1/treasury/withdraw
    // ------------------------------------------------------------------ //
    describe('POST /api/v1/treasury/withdraw', () => {
        it('should process a valid withdrawal', async () => {
            db.transaction.mockImplementationOnce(async (callback) => {
                const client = {
                    query: jest.fn()
                        .mockResolvedValueOnce({ rows: [{ balance: '500.00' }] })  // SELECT FOR UPDATE
                        .mockResolvedValueOnce({ rows: [{ balance: '400.00' }] })  // UPDATE balance
                        .mockResolvedValueOnce({ rows: [] }),                       // INSERT treasury_transactions
                };
                return callback(client);
            });

            const res = await request(app)
                .post('/api/v1/treasury/withdraw')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ amount: 100, currency: 'UBI' });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('successful');
        });

        it('should reject withdrawal with insufficient balance', async () => {
            db.transaction.mockImplementationOnce(async (callback) => {
                const client = {
                    query: jest.fn()
                        .mockResolvedValueOnce({ rows: [{ balance: '10.00' }] }), // only 10
                };
                return callback(client);
            });

            const res = await request(app)
                .post('/api/v1/treasury/withdraw')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ amount: 1000 });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Insufficient');
        });

        it('should reject negative withdraw amount', async () => {
            const res = await request(app)
                .post('/api/v1/treasury/withdraw')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ amount: -10 });

            expect(res.status).toBe(400);
        });
    });
});
