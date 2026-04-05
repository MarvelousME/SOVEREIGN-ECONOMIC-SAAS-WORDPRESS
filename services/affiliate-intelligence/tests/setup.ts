jest.setTimeout(10000);

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_NAME = 'affiliate_intelligence_test';
  process.env.DB_USER = 'postgres';
  process.env.DB_PASSWORD = 'postgres';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.NATS_URL = 'nats://localhost:4222';
});

afterAll(() => {
  jest.clearAllMocks();
});
