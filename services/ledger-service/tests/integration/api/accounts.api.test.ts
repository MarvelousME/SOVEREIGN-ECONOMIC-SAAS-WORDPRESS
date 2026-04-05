import request from 'supertest';
import { createApiHelper } from '@tests/helpers/api.helper';
import { getDbHelper } from '@tests/helpers/database.helper';
import { AccountFactory } from '@tests/factories/account.factory';
import { v4 as uuidv4 } from 'uuid';
import app from '../../../src/app';

describe('Accounts API Integration Tests', () => {
  const api = createApiHelper(app);
  const dbHelper = getDbHelper();

  beforeEach(async () => {
    await dbHelper.cleanDatabase();
  });

  describe('POST /api/accounts', () => {
    it('should create a new account', async () => {
      const userId = uuidv4();
      
      const response = await api.post('/api/accounts', {
        userId,
        accountType: 'USER',
        currency: 'UBI',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.userId).toBe(userId);
      expect(response.body.data.balance).toBe('0');
    });

    it('should return 400 for invalid input', async () => {
      const response = await api.post('/api/accounts', {
        userId: 'invalid-id',
        accountType: 'INVALID_TYPE',
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate account', async () => {
      const userId = uuidv4();
      
      await api.post('/api/accounts', {
        userId,
        accountType: 'USER',
        currency: 'UBI',
      });

      const response = await api.post('/api/accounts', {
        userId,
        accountType: 'USER',
        currency: 'UBI',
      });

      expect(response.status).toBe(409);
    });

    it('should enforce tenant isolation', async () => {
      const userId = uuidv4();
      
      // Create account in tenant A
      await api.post('/api/accounts', {
        userId,
        accountType: 'USER',
        currency: 'UBI',
      }, { 'X-Tenant-ID': 'tenant-a' });

      // Should be able to create same account in tenant B
      const response = await api.post('/api/accounts', {
        userId,
        accountType: 'USER',
        currency: 'UBI',
      }, { 'X-Tenant-ID': 'tenant-b' });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('should retrieve account by ID', async () => {
      const account = AccountFactory.createUserAccount(uuidv4());
      await dbHelper.seedDatabase({ accounts: [account] });

      const response = await api.get(`/api/accounts/${account.id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(account.id);
      expect(response.body.data.balance).toBe(account.balance);
    });

    it('should return 404 for non-existent account', async () => {
      const response = await api.get(`/api/accounts/${uuidv4()}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/accounts/:id/balance', () => {
    it('should return current account balance', async () => {
      const account = AccountFactory.createUserAccount(uuidv4(), '1500');
      await dbHelper.seedDatabase({ accounts: [account] });

      const response = await api.get(`/api/accounts/${account.id}/balance`);

      expect(response.status).toBe(200);
      expect(response.body.data.balance).toBe('1500');
      expect(response.body.data.currency).toBe('UBI');
    });
  });

  describe('GET /api/accounts/user/:userId', () => {
    it('should list all accounts for a user', async () => {
      const userId = uuidv4();
      const accounts = [
        AccountFactory.create({ userId, currency: 'UBI' }),
        AccountFactory.create({ userId, currency: 'USDC' }),
        AccountFactory.create({ userId, currency: 'ETH' }),
      ];
      
      await dbHelper.seedDatabase({ accounts });

      const response = await api.get(`/api/accounts/user/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data.map((a: any) => a.currency)).toContain('UBI');
      expect(response.body.data.map((a: any) => a.currency)).toContain('USDC');
      expect(response.body.data.map((a: any) => a.currency)).toContain('ETH');
    });

    it('should return empty array for user with no accounts', async () => {
      const response = await api.get(`/api/accounts/user/${uuidv4()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const userId = uuidv4();
      
      // Make requests up to rate limit
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          api.post('/api/accounts', {
            userId: uuidv4(),
            accountType: 'USER',
            currency: 'UBI',
          })
        );
      }

      await Promise.all(requests);

      // Next request should be rate limited
      const response = await api.post('/api/accounts', {
        userId: uuidv4(),
        accountType: 'USER',
        currency: 'UBI',
      });

      expect(response.status).toBe(429);
    });
  });
});
