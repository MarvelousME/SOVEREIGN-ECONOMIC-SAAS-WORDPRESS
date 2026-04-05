import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-32-byte-key-for-aes256!!';
  process.env.ENCRYPTION_ALGORITHM = 'aes-256-gcm';
});

afterEach(() => {
  jest.clearAllMocks();
});
