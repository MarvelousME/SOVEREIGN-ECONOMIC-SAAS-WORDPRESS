import { Pool } from 'pg';
import { Vault, CreateVaultRequest, VaultStatus } from '../types';

export class VaultRepository {
  constructor(private pool: Pool) {}

  async createVault(data: CreateVaultRequest): Promise<Vault> {
    const query = `
      INSERT INTO vaults (name, description, currency, strategy_id, compounding_frequency, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.name,
      data.description,
      data.currency,
      data.strategy_id,
      data.compounding_frequency,
      VaultStatus.ACTIVE,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getVaultById(id: string): Promise<Vault | null> {
    const query = 'SELECT * FROM vaults WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async getAllVaults(limit: number = 50, offset: number = 0): Promise<Vault[]> {
    const query = `
      SELECT * FROM vaults
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await this.pool.query(query, [limit, offset]);
    return result.rows;
  }

  async updateVaultBalance(
    vaultId: string,
    totalBalance: string,
    availableBalance: string,
    lockedBalance: string
  ): Promise<void> {
    const query = `
      UPDATE vaults
      SET total_balance = $1, available_balance = $2, locked_balance = $3
      WHERE id = $4
    `;
    await this.pool.query(query, [totalBalance, availableBalance, lockedBalance, vaultId]);
  }

  async updateVaultStatus(vaultId: string, status: VaultStatus): Promise<void> {
    const query = 'UPDATE vaults SET status = $1 WHERE id = $2';
    await this.pool.query(query, [status, vaultId]);
  }

  async updateVaultApy(vaultId: string, apy: number): Promise<void> {
    const query = 'UPDATE vaults SET apy = $1 WHERE id = $2';
    await this.pool.query(query, [apy, vaultId]);
  }

  async updateLastCompoundAt(vaultId: string, timestamp: Date): Promise<void> {
    const query = 'UPDATE vaults SET last_compound_at = $1 WHERE id = $2';
    await this.pool.query(query, [timestamp, vaultId]);
  }

  async updateVaultStrategy(vaultId: string, strategyId: string): Promise<void> {
    const query = 'UPDATE vaults SET strategy_id = $1 WHERE id = $2';
    await this.pool.query(query, [strategyId, vaultId]);
  }

  async getVaultsByStatus(status: VaultStatus): Promise<Vault[]> {
    const query = 'SELECT * FROM vaults WHERE status = $1';
    const result = await this.pool.query(query, [status]);
    return result.rows;
  }

  async getVaultsForCompounding(frequency: string): Promise<Vault[]> {
    const query = `
      SELECT * FROM vaults
      WHERE status = $1
      AND compounding_frequency = $2
      AND (
        last_compound_at IS NULL
        OR last_compound_at < NOW() - INTERVAL '1 ${frequency}'
      )
    `;
    const result = await this.pool.query(query, [VaultStatus.ACTIVE, frequency]);
    return result.rows;
  }
}
