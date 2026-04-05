jest.setTimeout(10000);

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_NAME = 'sovereign_saas_test';
  process.env.DB_USER = 'postgres';
  process.env.DB_PASSWORD = 'postgres';
});

afterAll(() => {
  jest.clearAllMocks();
});
