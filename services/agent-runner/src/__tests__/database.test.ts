jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue({
      rows: [],
      rowCount: 0,
    }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn(),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

jest.mock('../config', () => ({
  default: {
    database: {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'postgres',
      password: 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
    },
    logging: {
      level: 'error',
      format: 'json',
    },
    env: 'test',
  },
}));

describe('Database', () => {
  let database: any;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const DatabaseClass = require('../utils/database').default;
    database = new DatabaseClass();
    mockPool = require('pg').Pool();
  });

  describe('query', () => {
    it('should execute query successfully', async () => {
      const result = await database.query('SELECT * FROM agents');

      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM agents', undefined);
      expect(result).toHaveProperty('rows');
    });

    it('should pass parameters to query', async () => {
      await database.query('SELECT * FROM agents WHERE id = $1', ['agent-123']);

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM agents WHERE id = $1',
        ['agent-123']
      );
    });

    it('should throw on query error', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(database.query('INVALID SQL')).rejects.toThrow('Query failed');
    });

    it('should return query result with rowCount', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: '1' }, { id: '2' }],
        rowCount: 2,
      });

      const result = await database.query('SELECT * FROM agents');

      expect(result.rowCount).toBe(2);
      expect(result.rows).toHaveLength(2);
    });
  });

  describe('getClient', () => {
    it('should return a pool client', async () => {
      const client = await database.getClient();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(client).toHaveProperty('query');
      expect(client).toHaveProperty('release');
    });
  });

  describe('close', () => {
    it('should close the pool', async () => {
      await database.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is healthy', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const healthy = await database.healthCheck();

      expect(healthy).toBe(true);
    });

    it('should return false when database is unhealthy', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection refused'));

      const healthy = await database.healthCheck();

      expect(healthy).toBe(false);
    });
  });
});
