import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../logger';
import { TenantContext } from '../types';

export interface QueryOptions {
  tenantId?: string;
  timeout?: number;
  transaction?: boolean;
}

export interface TransactionCallback<T> {
  (client: PoolClient): Promise<T>;
}

class Database {
  private pool: Pool;
  private readonly queryTimeout: number = 5000;

  constructor() {
    const dbConfig = config.getDatabaseConfig();
    this.pool = new Pool({
      ...dbConfig,
      statement_timeout: this.queryTimeout,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('error', (err, client) => {
      logger.error('Unexpected database error on idle client', {
        error: err.message,
        stack: err.stack,
      });
    });

    this.pool.on('connect', (client) => {
      logger.debug('Database connection established');
    });

    this.pool.on('acquire', () => {
      logger.debug('Client acquired from pool');
    });

    this.pool.on('remove', () => {
      logger.debug('Client removed from pool');
    });
  }

  /**
   * Execute a query with automatic tenant isolation
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const client = await this.pool.connect();

    try {
      // Set row-level security context for tenant isolation
      if (options?.tenantId) {
        await client.query('SET LOCAL app.tenant_id = $1', [options.tenantId]);
      }

      // Set query timeout if specified
      if (options?.timeout) {
        await client.query(`SET LOCAL statement_timeout = ${options.timeout}`);
      }

      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;

      logger.logQuery(text, duration, {
        rows: result.rowCount || 0,
        tenantId: options?.tenantId,
      });

      return result;
    } catch (error: any) {
      logger.error('Database query error', {
        query: text,
        params,
        error: error.message,
        tenantId: options?.tenantId,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client from the pool for manual control
   */
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(
    callback: TransactionCallback<T>,
    options?: QueryOptions
  ): Promise<T> {
    const client = await this.pool.connect();
    const start = Date.now();

    try {
      await client.query('BEGIN');

      // Set tenant isolation context
      if (options?.tenantId) {
        await client.query('SET LOCAL app.tenant_id = $1', [options.tenantId]);
      }

      // Set query timeout if specified
      if (options?.timeout) {
        await client.query(`SET LOCAL statement_timeout = ${options.timeout}`);
      }

      const result = await callback(client);

      await client.query('COMMIT');

      const duration = Date.now() - start;
      logger.debug('Transaction completed', {
        duration,
        tenantId: options?.tenantId,
      });

      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');

      const duration = Date.now() - start;
      logger.error('Transaction rolled back', {
        duration,
        error: error.message,
        tenantId: options?.tenantId,
      });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a query with pagination
   */
  async queryPaginated<T extends QueryResultRow = any>(
    baseQuery: string,
    params: any[],
    page: number = 1,
    limit: number = 20,
    options?: QueryOptions
  ): Promise<{ data: T[]; total: number; totalPages: number }> {
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) as count_query`;
    const countResult = await this.query<{ count: string }>(countQuery, params, options);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Get paginated data
    const paginatedQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const result = await this.query<T>(
      paginatedQuery,
      [...params, limit, offset],
      options
    );

    return {
      data: result.rows,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Check database connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Close all database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }

  /**
   * Tenant-specific query helpers
   */
  async queryForTenant<T extends QueryResultRow = any>(
    tenantId: string,
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    return this.query<T>(text, params, { tenantId });
  }

  async transactionForTenant<T>(
    tenantId: string,
    callback: TransactionCallback<T>
  ): Promise<T> {
    return this.transaction(callback, { tenantId });
  }

  /**
   * Batch operations
   */
  async batchInsert(
    table: string,
    columns: string[],
    values: any[][],
    options?: QueryOptions
  ): Promise<void> {
    if (values.length === 0) return;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      if (options?.tenantId) {
        await client.query('SET LOCAL app.tenant_id = $1', [options.tenantId]);
      }

      // Create value placeholders
      const valueStrings = values.map((_, idx) => {
        const placeholders = columns.map((_, colIdx) => `$${idx * columns.length + colIdx + 1}`);
        return `(${placeholders.join(', ')})`;
      });

      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES ${valueStrings.join(', ')}
      `;

      const flatValues = values.flat();
      await client.query(query, flatValues);
      await client.query('COMMIT');

      logger.debug(`Batch inserted ${values.length} rows into ${table}`);
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Batch insert failed', {
        table,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Stream large result sets
   */
  async *streamQuery<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
    batchSize: number = 100,
    options?: QueryOptions
  ): AsyncGenerator<T[], void, unknown> {
    const client = await this.pool.connect();

    try {
      if (options?.tenantId) {
        await client.query('SET LOCAL app.tenant_id = $1', [options.tenantId]);
      }

      const cursor = client.query(new (require('pg').Cursor)(text, params));

      let rows: T[];
      do {
        rows = await cursor.read(batchSize);
        if (rows.length > 0) {
          yield rows;
        }
      } while (rows.length > 0);

      await cursor.close();
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const db = new Database();

// Export class for testing or custom instances
export { Database };
