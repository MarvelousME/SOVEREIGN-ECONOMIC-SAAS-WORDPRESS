jest.mock('../src/utils/database');
jest.mock('../src/services/events.service');

process.env.NODE_ENV = 'test';
process.env.PORT = '3020';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'ubi_cms_test';
process.env.DB_USER = 'ubi_user';
process.env.DB_PASSWORD = 'ubi_password';
process.env.NATS_URL = 'nats://localhost:4222';
process.env.LOG_LEVEL = 'error';
