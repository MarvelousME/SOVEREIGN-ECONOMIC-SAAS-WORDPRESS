import { Pool } from 'pg';
import { VaultTransaction, TransactionType } from '../types';

export class TransactionRepository {
  constructor(private pool: Pool) {}

  async createTransaction(data: Omit<VaultTransaction, 'id' | 'created_at'>): Promise<VaultTransaction> {
    const query = `
      INSERT INTO vault_transactions (vault_id, user_id, type, amount, currency, balance_before, balance_after, metadata, ledger_transaction_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      data.vault_id,
      data.user_id,
      data.type,
      data.amount,
      data.currency,
      data.balance_before,
      data.balance_after,
      JSON.stringify(data.metadata),
      data.ledger_transaction_id,
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    row.metadata = JSON.parse(row.metadata);
    return row;
  }

  async getTransactionById(id: string): Promise<VaultTransaction | null> {
    const query = 'SELECT * FROM vault_transactions WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    row.metadata = JSON.parse(row.metadata);
    return row;
  }

  async getTransactionsByVault(vaultId: string, limit: number = 100, offset: number = 0): Promise<VaultTransaction[]> {
    const query = `
      SELECT * FROM vault_transactions
      WHERE vault_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.pool.query(query, [vaultId, limit, offset]);
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata),
    }));
  }

  async getTransactionsByUser(userId: string, limit: number = 100, offset: number = 0): Promise<VaultTransaction[]> {
    const query = `
      SELECT * FROM vault_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await this.pool.query(query, [userId, limit, offset]);
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata),
    }));
  }

  async getTransactionsByType(vaultId: string, type: TransactionType): Promise<VaultTransaction[]> {
    const query = `
      SELECT * FROM vault_transactions
      WHERE vault_id = $1 AND type = $2
      ORDER BY created_at DESC
    `;
    
    const result = await this.pool.query(query, [vaultId, type]);
    return result.rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata),
    }));
  }

  async getTotalDepositedByVault(vaultId: string): Promise<string> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM vault_transactions
      WHERE vault_id = $1 AND type = $2
    `;
    
    const result = await this.pool.query(query, [vaultId, TransactionType.DEPOSIT]);
    return result.rows[0].total.toString();
  }

  async getTotalWithdrawnByVault(vaultId: string): Promise<string> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM vault_transactions
      WHERE vault_id = $1 AND type = $2
    `;
    
    const result = await this.pool.query(query, [vaultId, TransactionType.WITHDRAW]);
    return result.rows[0].total.toString();
  }

  async getTotalYieldByVault(vaultId: string): Promise<string> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total
      FROM vault_transactions
      WHERE vault_id = $1 AND type IN ($2, $3)
    `;
    
    const result = await this.pool.query(query, [
      vaultId,
      TransactionType.COMPOUND,
      TransactionType.YIELD_HARVEST,
    ]);
    return result.rows[0].total.toString();
  }
}
