/**
 * Authentication Tests
 * Tests login, register, logout, and /me endpoints
 */

const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Bypass rate limiting so auth tests don't hit 429
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

// Mock the database module before requiring app
jest.mock('../Models/db', () => ({
    query: jest.fn(),
    transaction: jest.fn(),
    checkHealth: jest.fn().mockResolvedValue(new Date()),
    pool: { end: jest.fn(), on: jest.fn() },
}));

const db = require('../Models/db');
const app = require('../index');

const JWT_SECRET = process.env.JWT_SECRET;

// Valid test password meeting all requirements (12+ chars, upper, lower, digit, special)
const VALID_PASSWORD = 'TestPass@123456';

// Helper to create a valid JWT
function makeToken(userId = 1, username = 'testuser', roles = ['subscriber']) {
    return jwt.sign({ userId, username, roles }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
}

describe('Authentication', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/auth/login', () => {
        it('should login with valid credentials', async () => {
            const hashedPw = await bcrypt.hash(VALID_PASSWORD, 10);

            // findByUsername
            db.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    password: hashedPw,
                    roles: ['subscriber'],
                }]
            });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'testuser', password: VALID_PASSWORD });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.username).toBe('testuser');
            expect(res.body.user).not.toHaveProperty('password');
            expect(res.body.user).not.toHaveProperty('password_hash');
        });

        it('should reject invalid password', async () => {
            const hashedPw = await bcrypt.hash(VALID_PASSWORD, 10);

            db.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    password: hashedPw,
                    roles: ['subscriber'],
                }]
            });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'testuser', password: 'WrongPassword@123' });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        it('should reject non-existent user', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'nobody', password: VALID_PASSWORD });

            expect(res.status).toBe(401);
        });

        it('should reject missing username', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ password: VALID_PASSWORD });

            expect(res.status).toBe(400);
        });

        it('should reject short username (< 3 chars)', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'ab', password: VALID_PASSWORD });

            expect(res.status).toBe(400);
        });

        it('should reject missing password', async () => {
            const res = await request(app)
                .post('/api/v1/auth/login')
                .send({ username: 'testuser' });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/v1/auth/register', () => {
        it('should register a new user', async () => {
            // findByUsername -> no existing user
            db.query.mockResolvedValueOnce({ rows: [] });
            // create user
            db.query.mockResolvedValueOnce({
                rows: [{
                    id: 2,
                    username: 'newuser',
                    email: 'newuser@example.com',
                    roles: ['subscriber'],
                    status: 'active',
                    created_at: new Date(),
                }]
            });

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser',
                    email: 'newuser@example.com',
                    password: VALID_PASSWORD,
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.username).toBe('newuser');
        });

        it('should reject duplicate username', async () => {
            // findByUsername -> existing user
            db.query.mockResolvedValueOnce({
                rows: [{ id: 1, username: 'existinguser' }]
            });

            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'existinguser',
                    email: 'other@example.com',
                    password: VALID_PASSWORD,
                });

            expect(res.status).toBe(409);
            expect(res.body.error).toContain('already taken');
        });

        it('should reject weak password (no uppercase)', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser2',
                    email: 'newuser2@example.com',
                    password: 'nouppercase@123',
                });

            expect(res.status).toBe(400);
        });

        it('should reject invalid email', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser3',
                    email: 'not-an-email',
                    password: VALID_PASSWORD,
                });

            expect(res.status).toBe(400);
        });

        it('should reject short password (< 12 chars)', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser4',
                    email: 'newuser4@example.com',
                    password: 'Short@1',
                });

            expect(res.status).toBe(400);
        });

        it('should reject password without special character', async () => {
            const res = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    username: 'newuser5',
                    email: 'newuser5@example.com',
                    password: 'NoSpecialChar123',
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/auth/me', () => {
        it('should return user info with valid token', async () => {
            const token = makeToken(1, 'testuser');

            // findById
            db.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    username: 'testuser',
                    email: 'test@example.com',
                    roles: ['subscriber'],
                    status: 'active',
                }]
            });

            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.username).toBe('testuser');
            expect(res.body.roles).toEqual(['subscriber']);
            expect(res.body).not.toHaveProperty('password');
        });

        it('should return 401 without token', async () => {
            const res = await request(app).get('/api/v1/auth/me');
            expect(res.status).toBe(401);
        });

        it('should return 401 with invalid token', async () => {
            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid.token.here');
            expect(res.status).toBe(401);
        });

        it('should return 404 when user not found in DB', async () => {
            const token = makeToken(9999, 'ghostuser');

            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('should logout successfully with valid token', async () => {
            const token = makeToken();
            const res = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${token}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('Logged out');
        });

        it('should return 401 without token', async () => {
            const res = await request(app).post('/api/v1/auth/logout');
            expect(res.status).toBe(401);
        });
    });
});
