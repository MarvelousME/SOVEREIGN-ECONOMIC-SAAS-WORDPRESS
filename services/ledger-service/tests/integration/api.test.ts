import request from 'supertest';
import { createApp } from '../../src/server';

describe('Ledger API Integration Tests', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service', 'ledger-service');
      expect(response.body).toHaveProperty('checks');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without tenant header', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/accounts/123')
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(response.body.message).toContain('x-tenant-id');
    });

    it('should reject requests without auth header', async () => {
      const response = await request(app)
        .get('/api/v1/ledger/accounts/123')
        .set('x-tenant-id', 'test-tenant')
        .expect(401);

      expect(response.body.message).toContain('Authorization');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown/route')
        .expect(404);

      expect(response.body.error).toBe('Not Found');
    });
  });
});
