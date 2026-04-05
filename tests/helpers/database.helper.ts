import { Pool, PoolClient } from 'pg';

export class DatabaseHelper {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ubi_cms_test',
      user: process.env.DB_USER || 'test_user',
      password: process.env.DB_PASSWORD || 'test_password',
    });
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async query(text: string, params?: any[]) {
    return await this.pool.query(text, params);
  }

  async cleanDatabase(): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      // Disable triggers
      await client.query('SET session_replication_role = replica');
      
      // Get all tables
      const result = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public'
      `);
      
      // Truncate all tables
      for (const row of result.rows) {
        await client.query(`TRUNCATE TABLE ${row.tablename} CASCADE`);
      }
      
      // Re-enable triggers
      await client.query('SET session_replication_role = DEFAULT');
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async seedDatabase(seedData: Record<string, any[]>): Promise<void> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      
      for (const [table, rows] of Object.entries(seedData)) {
        for (const row of rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          
          await client.query(
            `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async createTransaction() {
    const client = await this.getClient();
    await client.query('BEGIN');
    return {
      client,
      commit: async () => {
        await client.query('COMMIT');
        client.release();
      },
      rollback: async () => {
        await client.query('ROLLBACK');
        client.release();
      },
    };
  }
}

// Singleton instance
let dbHelper: DatabaseHelper;

export function getDbHelper(): DatabaseHelper {
  if (!dbHelper) {
    dbHelper = new DatabaseHelper();
  }
  return dbHelper;
}

// Global cleanup
afterAll(async () => {
  if (dbHelper) {
    await dbHelper.close();
  }
});
