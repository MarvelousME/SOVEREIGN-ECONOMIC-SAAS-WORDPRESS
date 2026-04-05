/**
 * Agent Controller & Model Tests
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

function makeToken(userId = 1, username = 'testuser', roles = ['subscriber']) {
    return jwt.sign({ userId, username, roles }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
}
function makeAdminToken() {
    return makeToken(99, 'admin', ['admin', 'subscriber']);
}

const SAMPLE_AGENT = {
    id: 'agt-001',
    owner_id: 99,
    name: 'Test Agent',
    description: 'A test agent',
    capability: 'text-analysis',
    endpoint: 'https://agent.example.com/run',
    auth_type: 'api_key',
    pricing_model: 'per_call',
    price_per_call: 0.01,
    status: 'active',
    rating: 4.5,
    total_calls: 100,
    created_at: new Date().toISOString(),
};

const SAMPLE_EXECUTION = {
    id: 'exec-001',
    agent_id: 'agt-001',
    user_id: 1,
    status: 'completed',
    duration_ms: 42,
    cost: 0.01,
    completed_at: new Date().toISOString(),
};

describe('Agent API', () => {
    beforeEach(() => jest.clearAllMocks());

    // ──────────────────────────────────────────────────────────────────────
    describe('GET /api/v1/agents', () => {
        it('should return paginated agent list', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [SAMPLE_AGENT] })    // data
                .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // count

            const res = await request(app)
                .get('/api/v1/agents')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(res.body.data[0].name).toBe('Test Agent');
        });

        it('should filter by capability', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [SAMPLE_AGENT] })
                .mockResolvedValueOnce({ rows: [{ count: '1' }] });

            const res = await request(app)
                .get('/api/v1/agents?capability=text-analysis')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
        });

        it('should filter by search term', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ count: '0' }] });

            const res = await request(app)
                .get('/api/v1/agents?search=nonexistent')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(0);
        });

        it('should require authentication', async () => {
            const res = await request(app).get('/api/v1/agents');
            expect(res.status).toBe(401);
        });

        it('should handle database errors gracefully', async () => {
            db.query.mockRejectedValueOnce(new Error('DB connection lost'));

            const res = await request(app)
                .get('/api/v1/agents')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(500);
            expect(res.body).toHaveProperty('error');
        });
    });

    // ──────────────────────────────────────────────────────────────────────
    describe('GET /api/v1/agents/:id', () => {
        it('should return a specific agent', async () => {
            db.query.mockResolvedValueOnce({ rows: [SAMPLE_AGENT] });

            const res = await request(app)
                .get('/api/v1/agents/agt-001')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe('agt-001');
        });

        it('should return 404 for unknown agent', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/api/v1/agents/nonexistent')
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
        });
    });

    // ──────────────────────────────────────────────────────────────────────
    describe('POST /api/v1/agents (register)', () => {
        const AGENT_PAYLOAD = {
            name: 'New Agent',
            description: 'Does things',
            capability: 'code-generation',
            endpoint: 'https://myagent.example.com/run',
            auth_type: 'api_key',
            pricing_model: 'per_call',
            price_per_call: 0.05,
        };

        it('should register a new agent as admin', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ ...SAMPLE_AGENT, ...AGENT_PAYLOAD }] });

            const res = await request(app)
                .post('/api/v1/agents')
                .set('Authorization', `Bearer ${makeAdminToken()}`)
                .send(AGENT_PAYLOAD);

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('New Agent');
        });

        it('should reject non-admin users', async () => {
            const res = await request(app)
                .post('/api/v1/agents')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send(AGENT_PAYLOAD);

            expect(res.status).toBe(403);
        });

        it('should require authentication', async () => {
            const res = await request(app).post('/api/v1/agents').send(AGENT_PAYLOAD);
            expect(res.status).toBe(401);
        });
    });

    // ──────────────────────────────────────────────────────────────────────
    describe('POST /api/v1/agents/:id/execute', () => {
        it('should execute an active agent and record the run', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [SAMPLE_AGENT] })          // findById
                .mockResolvedValueOnce({ rows: [SAMPLE_EXECUTION] })       // recordExecution INSERT
                .mockResolvedValueOnce({ rows: [] });                       // UPDATE total_calls

            const res = await request(app)
                .post('/api/v1/agents/agt-001/execute')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ input: { text: 'Analyse this sentence.' } });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('output');
            expect(res.body).toHaveProperty('duration_ms');
            expect(res.body).toHaveProperty('execution_id');
        });

        it('should return 404 for unknown agent', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .post('/api/v1/agents/bad-id/execute')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ input: {} });

            expect(res.status).toBe(404);
        });

        it('should return 400 for inactive agent', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ ...SAMPLE_AGENT, status: 'inactive' }],
            });

            const res = await request(app)
                .post('/api/v1/agents/agt-001/execute')
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ input: {} });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/not active/i);
        });

        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/v1/agents/agt-001/execute')
                .send({ input: {} });

            expect(res.status).toBe(401);
        });
    });
});
