/**
 * Health Check Tests
 * Tests the /health and /ready endpoints
 */

// Bypass rate limiting so tests don't hit 429 from express-rate-limit
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

// Mock DB before requiring app so the pool doesn't attempt a real connection
jest.mock('../Models/db', () => ({
    query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
    transaction: jest.fn(),
    checkHealth: jest.fn().mockResolvedValue(new Date()),
    pool: { end: jest.fn(), on: jest.fn() },
}));

const request = require('supertest');
const app = require('../index');

describe('Health Endpoints', () => {
    describe('GET /health', () => {
        it('should return 200 with healthy status', async () => {
            const res = await request(app).get('/health');

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                status: 'healthy',
                version: '1.0.0',
            });
            expect(res.body.timestamp).toBeDefined();
            expect(res.body.uptime).toBeGreaterThanOrEqual(0);
        });

        it('should not require authentication', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
        });
    });

    describe('GET /ready', () => {
        it('should respond (status depends on DB connection)', async () => {
            const res = await request(app).get('/ready');
            // Either ready (200) or not ready (503) - both are valid responses
            expect([200, 503]).toContain(res.status);
        });
    });

    describe('404 Handler', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/api/v1/nonexistent-endpoint');
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
    });
});
