/**
 * Task Endpoint Tests
 *
 * The task model uses db.query directly (no transaction helper), so we mock
 * db.query call-by-call in order of execution.
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

function makeToken(userId = 1, roles = ['subscriber']) {
    return jwt.sign({ userId, username: 'testuser', roles }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
}

function makeAdminToken() {
    return makeToken(1, ['admin', 'subscriber']);
}

const sampleTask = {
    id: 1,
    title: 'Test Task',
    description: 'A test task description',
    category: 'testing',
    difficulty: 'easy',
    reward_amount: '50.00',
    reward_currency: 'UBI',
    max_participants: 5,
    current_participants: 0,
    status: 'active',
    proof_requirements: {},
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
};

describe('Tasks API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ------------------------------------------------------------------ //
    //  GET /api/v1/tasks
    // ------------------------------------------------------------------ //
    describe('GET /api/v1/tasks', () => {
        it('should list tasks with authentication', async () => {
            // taskModel.list() calls db.query twice: SELECT tasks + COUNT
            db.query
                .mockResolvedValueOnce({ rows: [sampleTask] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const res = await request(app)
                .get('/api/v1/tasks')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/tasks');
            expect(res.status).toBe(401);
        });

        it('should support pagination params', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/v1/tasks?page=2&limit=10')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.pagination.page).toBe(2);
            expect(res.body.pagination.limit).toBe(10);
        });

        it('should support status filter', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [sampleTask] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const res = await request(app)
                .get('/api/v1/tasks?status=active')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
        });
    });

    // ------------------------------------------------------------------ //
    //  GET /api/v1/tasks/:id
    // ------------------------------------------------------------------ //
    describe('GET /api/v1/tasks/:id', () => {
        it('should return a specific task', async () => {
            db.query.mockResolvedValueOnce({ rows: [sampleTask] });

            const res = await request(app)
                .get('/api/v1/tasks/1')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(1);
            expect(res.body.title).toBe('Test Task');
        });

        it('should return 404 for non-existent task', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/v1/tasks/99999')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/tasks/1');
            expect(res.status).toBe(401);
        });
    });

    // ------------------------------------------------------------------ //
    //  POST /api/v1/tasks  (admin only)
    // ------------------------------------------------------------------ //
    describe('POST /api/v1/tasks', () => {
        it('should create task as admin', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ ...sampleTask, id: 2 }] });

            const res = await request(app)
                .post('/api/v1/tasks')
                .set('Authorization', `Bearer ${makeAdminToken()}`)
                .send({
                    title: 'New Task',
                    description: 'Task description',
                    category: 'content',
                    difficulty: 'medium',
                    reward_amount: 100,
                    max_participants: 3,
                });

            expect(res.status).toBe(201);
        });

        it('should reject task creation by regular user', async () => {
            const res = await request(app)
                .post('/api/v1/tasks')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({
                    title: 'Unauthorized Task',
                    difficulty: 'easy',
                    reward_amount: 10,
                });

            expect(res.status).toBe(403);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/v1/tasks')
                .send({ title: 'Task' });

            expect(res.status).toBe(401);
        });
    });

    // ------------------------------------------------------------------ //
    //  PUT /api/v1/tasks/:id  (admin/moderator only)
    // ------------------------------------------------------------------ //
    describe('PUT /api/v1/tasks/:id', () => {
        it('should update task as admin', async () => {
            // taskController.update: findById, then update
            db.query
                .mockResolvedValueOnce({ rows: [sampleTask] })
                .mockResolvedValueOnce({ rows: [{ ...sampleTask, title: 'Updated Title' }] });

            const res = await request(app)
                .put('/api/v1/tasks/1')
                .set('Authorization', `Bearer ${makeAdminToken()}`)
                .send({ title: 'Updated Title' });

            expect(res.status).toBe(200);
        });

        it('should reject update by regular user', async () => {
            const res = await request(app)
                .put('/api/v1/tasks/1')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ title: 'Hacked' });

            expect(res.status).toBe(403);
        });
    });

    // ------------------------------------------------------------------ //
    //  DELETE /api/v1/tasks/:id  (admin only)
    // ------------------------------------------------------------------ //
    describe('DELETE /api/v1/tasks/:id', () => {
        it('should delete task as admin', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [sampleTask] })   // findById
                .mockResolvedValueOnce({ rows: [] });              // DELETE

            const res = await request(app)
                .delete('/api/v1/tasks/1')
                .set('Authorization', `Bearer ${makeAdminToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('deleted');
        });

        it('should return 404 when deleting non-existent task', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .delete('/api/v1/tasks/99999')
                .set('Authorization', `Bearer ${makeAdminToken()}`);

            expect(res.status).toBe(404);
        });
    });

    // ------------------------------------------------------------------ //
    //  POST /api/v1/tasks/:id/assign
    // ------------------------------------------------------------------ //
    describe('POST /api/v1/tasks/:id/assign', () => {
        it('should assign user to task', async () => {
            // taskController.assign order:
            // 1. taskModel.findById  → SELECT tasks
            // 2. userModel.findById  → SELECT users
            // 3. existingAssignment  → SELECT task_assignments
            // 4. INSERT task_assignments
            // 5. taskModel.incrementParticipants → UPDATE tasks
            db.query
                .mockResolvedValueOnce({ rows: [{ ...sampleTask, status: 'active', current_participants: 0, max_participants: 5 }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 1 }] })
                .mockResolvedValueOnce({ rows: [sampleTask] });

            const res = await request(app)
                .post('/api/v1/tasks/1/assign')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(201);
            expect(res.body.message).toContain('assigned');
        });

        it('should reject if task is full', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{
                    ...sampleTask,
                    current_participants: 5,
                    max_participants: 5,
                }]
            });

            const res = await request(app)
                .post('/api/v1/tasks/1/assign')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('full');
        });

        it('should reject if task is not active', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ ...sampleTask, status: 'completed' }]
            });

            const res = await request(app)
                .post('/api/v1/tasks/1/assign')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('not active');
        });

        it('should reject duplicate assignment', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [{ ...sampleTask, status: 'active', current_participants: 0, max_participants: 5 }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, task_id: 1, user_id: 1 }] }); // already assigned

            const res = await request(app)
                .post('/api/v1/tasks/1/assign')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Already assigned');
        });

        it('should return 404 for non-existent task', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/v1/tasks/99999/assign')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(404);
        });
    });

    // ------------------------------------------------------------------ //
    //  POST /api/v1/tasks/:id/submit
    // ------------------------------------------------------------------ //
    describe('POST /api/v1/tasks/:id/submit', () => {
        it('should submit task proof', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ id: 1, task_id: 1, user_id: 1, status: 'submitted' }]
            });

            const res = await request(app)
                .post('/api/v1/tasks/1/submit')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ proof_data: { url: 'https://example.com/proof' } });

            expect(res.status).toBe(200);
            expect(res.body.message).toContain('verification');
        });

        it('should return 404 if assignment not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/v1/tasks/1/submit')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ proof_data: {} });

            expect(res.status).toBe(404);
        });
    });
});
