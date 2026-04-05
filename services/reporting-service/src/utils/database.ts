import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';
import { logger } from './logger';

class Database {
  private pool: Pool;
  private readPool: Pool;

  constructor() {
    this.pool = new Pool(config.database);
    this.readPool = new Pool(config.databaseRead);

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error (write)', { error: err });
    });

    this.readPool.on('error', (err) => {
      logger.error('Unexpected database error (read)', { error: err });
    });
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.readPool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query error', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.readPool.connect();
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      await this.readPool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    await this.readPool.end();
    logger.info('Database pools closed');
  }
}

export const db = new Database();
