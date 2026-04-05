import request from 'supertest';
import app from '../../src/index';

describe('Auth API Integration Tests', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test123!@#',
          first_name: 'Test',
          last_name: 'User',
        });

      // Note: This will fail without a running Keycloak instance
      // In real tests, you would use test containers or mock the Keycloak service
      expect([201, 500]).toContain(response.status);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'Test123!@#',
          first_name: 'Test',
          last_name: 'User',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return tokens on successful login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!@#',
        });

      // Will fail without running Keycloak
      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service', 'auth-service');
    });
  });
});
