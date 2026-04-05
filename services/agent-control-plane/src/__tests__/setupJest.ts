process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

jest.setTimeout(30000);

afterEach(() => {
  jest.clearAllMocks();
});
