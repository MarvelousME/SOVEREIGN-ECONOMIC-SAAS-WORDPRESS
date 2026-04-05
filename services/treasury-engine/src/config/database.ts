import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'treasury_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const initDatabase = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Vaults table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vaults (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        currency VARCHAR(10) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        total_balance DECIMAL(36, 18) NOT NULL DEFAULT 0,
        available_balance DECIMAL(36, 18) NOT NULL DEFAULT 0,
        locked_balance DECIMAL(36, 18) NOT NULL DEFAULT 0,
        apy DECIMAL(8, 4) NOT NULL DEFAULT 0,
        strategy_id UUID,
        compounding_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
        last_compound_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Strategies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS strategies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        risk_level INTEGER NOT NULL CHECK (risk_level BETWEEN 1 AND 10),
        target_apy DECIMAL(8, 4) NOT NULL,
        min_allocation DECIMAL(5, 2) NOT NULL DEFAULT 0,
        max_allocation DECIMAL(5, 2) NOT NULL DEFAULT 100,
        allocations JSONB NOT NULL DEFAULT '[]',
        rebalance_threshold DECIMAL(5, 4) NOT NULL DEFAULT 0.05,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Vault transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vault_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vault_id UUID NOT NULL REFERENCES vaults(id),
        user_id VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(36, 18) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        balance_before DECIMAL(36, 18) NOT NULL,
        balance_after DECIMAL(36, 18) NOT NULL,
        metadata JSONB DEFAULT '{}',
        ledger_transaction_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Performance metrics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vault_id UUID NOT NULL REFERENCES vaults(id),
        period VARCHAR(20) NOT NULL,
        total_deposited DECIMAL(36, 18) NOT NULL DEFAULT 0,
        total_withdrawn DECIMAL(36, 18) NOT NULL DEFAULT 0,
        total_yield DECIMAL(36, 18) NOT NULL DEFAULT 0,
        total_fees DECIMAL(36, 18) NOT NULL DEFAULT 0,
        net_apy DECIMAL(8, 4) NOT NULL DEFAULT 0,
        sharpe_ratio DECIMAL(8, 4) NOT NULL DEFAULT 0,
        max_drawdown DECIMAL(8, 4) NOT NULL DEFAULT 0,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(vault_id, period)
      );
    `);

    // Withdrawal queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vault_id UUID NOT NULL REFERENCES vaults(id),
        user_id VARCHAR(255) NOT NULL,
        amount DECIMAL(36, 18) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        priority INTEGER NOT NULL DEFAULT 0,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      );
    `);

    // Yield sources table
    await client.query(`
      CREATE TABLE IF NOT EXISTS yield_sources (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        protocol VARCHAR(255) NOT NULL UNIQUE,
        apy DECIMAL(8, 4) NOT NULL,
        tvl DECIMAL(36, 18) NOT NULL,
        risk_score INTEGER NOT NULL CHECK (risk_score BETWEEN 1 AND 10),
        liquidity_score INTEGER NOT NULL CHECK (liquidity_score BETWEEN 1 AND 10),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vaults_status ON vaults(status);
      CREATE INDEX IF NOT EXISTS idx_vaults_strategy ON vaults(strategy_id);
      CREATE INDEX IF NOT EXISTS idx_vault_transactions_vault ON vault_transactions(vault_id);
      CREATE INDEX IF NOT EXISTS idx_vault_transactions_user ON vault_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_vault_transactions_type ON vault_transactions(type);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_queue_vault ON withdrawal_queue(vault_id);
      CREATE INDEX IF NOT EXISTS idx_withdrawal_queue_status ON withdrawal_queue(status);
      CREATE INDEX IF NOT EXISTS idx_performance_metrics_vault ON performance_metrics(vault_id);
    `);

    // Create update trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers
    await client.query(`
      DROP TRIGGER IF EXISTS update_vaults_updated_at ON vaults;
      CREATE TRIGGER update_vaults_updated_at BEFORE UPDATE ON vaults
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_strategies_updated_at ON strategies;
      CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON strategies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
