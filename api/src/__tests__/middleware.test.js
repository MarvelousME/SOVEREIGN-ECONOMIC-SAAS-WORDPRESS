/**
 * Middleware Unit Tests
 *
 * Tests auth middleware behaviour via real HTTP calls through the app.
 * Uses protected routes as integration points.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Bypass rate limiting so middleware tests don't hit 429
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

jest.mock('../Models/db', () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    transaction: jest.fn(),
    checkHealth: jest.fn().mockResolvedValue(new Date()),
    pool: { end: jest.fn(), on: jest.fn() },
}));

const app = require('../index');

const JWT_SECRET = process.env.JWT_SECRET;

describe('Auth Middleware', () => {
    // ------------------------------------------------------------------ //
    //  authenticate
    // ------------------------------------------------------------------ //
    describe('authenticate', () => {
        it('should reject missing authorization header', async () => {
            const res = await request(app).get('/api/v1/auth/me');
            expect(res.status).toBe(401);
            expect(res.body.error).toBe('No token provided');
        });

        it('should reject missing "Bearer " prefix', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Token sometoken');

            expect(res.status).toBe(401);
            expect(res.body.error).toBe('No token provided');
        });

        it('should reject malformed JWT (not 3-part)', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer notavalidjwt');

            expect(res.status).toBe(401);
        });

        it('should reject expired token', async () => {
            const expiredToken = jwt.sign(
                { userId: 1, username: 'testuser', roles: ['subscriber'] },
                JWT_SECRET,
                { expiresIn: '-1s', algorithm: 'HS256' }
            );

            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(res.status).toBe(401);
        });

        it('should reject token signed with wrong secret', async () => {
            const wrongToken = jwt.sign(
                { userId: 1, username: 'testuser', roles: ['subscriber'] },
                'wrong-secret-that-is-not-the-real-one',
                { expiresIn: '1h' }
            );

            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${wrongToken}`);

            expect(res.status).toBe(401);
        });

        it('should accept valid token and pass to handler', async () => {
            const token = jwt.sign(
                { userId: 1, username: 'testuser', roles: ['subscriber'] },
                JWT_SECRET,
                { expiresIn: '1h', algorithm: 'HS256' }
            );

            // db.query mock already returns { rows: [] } which causes 404 from userModel.findById
            // That's fine — the important thing is we get past the 401 auth gate
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).not.toBe(401);
        });
    });

    // ------------------------------------------------------------------ //
    //  requireRole
    // ------------------------------------------------------------------ //
    describe('requireRole', () => {
        it('should block subscriber from admin-only route (POST /tasks)', async () => {
            const userToken = jwt.sign(
                { userId: 2, username: 'regular', roles: ['subscriber'] },
                JWT_SECRET,
                { expiresIn: '1h', algorithm: 'HS256' }
            );

            const res = await request(app)
                .post('/api/v1/tasks')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ title: 'Task', difficulty: 'easy', reward_amount: 10 });

            expect(res.status).toBe(403);
            expect(res.body.error).toBeDefined();
        });

        it('should allow admin to reach admin-only route', async () => {
            const adminToken = jwt.sign(
                { userId: 1, username: 'admin', roles: ['admin', 'subscriber'] },
                JWT_SECRET,
                { expiresIn: '1h', algorithm: 'HS256' }
            );

            // db.query will be called by taskModel.create — mock it to return a task
            const db = require('../Models/db');
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'T', difficulty: 'easy' }] });

            const res = await request(app)
                .post('/api/v1/tasks')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ title: 'Admin Task', difficulty: 'easy', reward_amount: 10 });

            // Should not be 401 (auth) or 403 (role) — may be 201 or 500 depending on mocks
            expect(res.status).not.toBe(401);
            expect(res.status).not.toBe(403);
        });

        it('should allow moderator to update tasks', async () => {
            const modToken = jwt.sign(
                { userId: 3, username: 'moderator', roles: ['moderator'] },
                JWT_SECRET,
                { expiresIn: '1h', algorithm: 'HS256' }
            );

            const db = require('../Models/db');
            db.query
                .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Task' }] })  // findById
                .mockResolvedValueOnce({ rows: [{ id: 1, title: 'Updated' }] }); // update

            const res = await request(app)
                .put('/api/v1/tasks/1')
                .set('Authorization', `Bearer ${modToken}`)
                .send({ title: 'Updated' });

            expect(res.status).not.toBe(401);
            expect(res.status).not.toBe(403);
        });
    });
});
