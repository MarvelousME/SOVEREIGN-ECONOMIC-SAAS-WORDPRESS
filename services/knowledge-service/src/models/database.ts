import { Pool, PoolClient } from 'pg';
import config from '../config';
import { logger } from '../utils/logger';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error:', err);
    });
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Database query error:', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async initialize(): Promise<void> {
    try {
      await this.createTables();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const client = await this.getClient();
    try {
      // Collections table
      await client.query(`
        CREATE TABLE IF NOT EXISTS collections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          vector_dimension INTEGER NOT NULL DEFAULT 1536,
          distance VARCHAR(20) NOT NULL DEFAULT 'cosine',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(tenant_id, name)
        )
      `);

      // Documents table
      await client.query(`
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
          title VARCHAR(500) NOT NULL,
          content TEXT,
          format VARCHAR(20) NOT NULL,
          metadata JSONB DEFAULT '{}',
          source VARCHAR(500),
          url TEXT,
          version INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Document chunks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          chunk_index INTEGER NOT NULL,
          start_char INTEGER NOT NULL,
          end_char INTEGER NOT NULL,
          vector_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Search analytics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS search_analytics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          query TEXT,
          collection_id UUID REFERENCES collections(id),
          results_count INTEGER,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Relevance feedback table
      await client.query(`
        CREATE TABLE IF NOT EXISTS relevance_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          search_id UUID NOT NULL,
          document_id UUID NOT NULL REFERENCES documents(id),
          tenant_id UUID NOT NULL,
          score FLOAT,
          feedback VARCHAR(20) NOT NULL,
          user_id UUID,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_collections_tenant ON collections(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection_id);
        CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON search_analytics(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_analytics_created ON search_analytics(created_at);
        CREATE INDEX IF NOT EXISTS idx_feedback_tenant ON relevance_feedback(tenant_id);
      `);

      logger.info('Database tables created successfully');
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }
}

export const database = new Database();
