import { Pool } from 'pg';
import { Strategy, StrategyType } from '../types';

export class StrategyRepository {
  constructor(private pool: Pool) {}

  async createStrategy(data: Omit<Strategy, 'id' | 'created_at' | 'updated_at'>): Promise<Strategy> {
    const query = `
      INSERT INTO strategies (name, type, description, risk_level, target_apy, min_allocation, max_allocation, allocations, rebalance_threshold, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      data.name,
      data.type,
      data.description,
      data.risk_level,
      data.target_apy,
      data.min_allocation,
      data.max_allocation,
      JSON.stringify(data.allocations),
      data.rebalance_threshold,
      data.active,
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    row.allocations = JSON.parse(row.allocations);
    return row;
  }

  async getStrategyById(id: string): Promise<Strategy | null> {
    const query = 'SELECT * FROM strategies WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    row.allocations = JSON.parse(row.allocations);
    return row;
  }

  async getAllStrategies(activeOnly: boolean = false): Promise<Strategy[]> {
    const query = activeOnly
      ? 'SELECT * FROM strategies WHERE active = true ORDER BY created_at DESC'
      : 'SELECT * FROM strategies ORDER BY created_at DESC';
    
    const result = await this.pool.query(query);
    return result.rows.map(row => ({
      ...row,
      allocations: JSON.parse(row.allocations),
    }));
  }

  async getStrategiesByType(type: StrategyType): Promise<Strategy[]> {
    const query = 'SELECT * FROM strategies WHERE type = $1 AND active = true';
    const result = await this.pool.query(query, [type]);
    return result.rows.map(row => ({
      ...row,
      allocations: JSON.parse(row.allocations),
    }));
  }

  async updateStrategy(id: string, data: Partial<Strategy>): Promise<Strategy> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.target_apy !== undefined) {
      updateFields.push(`target_apy = $${paramIndex++}`);
      values.push(data.target_apy);
    }
    if (data.allocations !== undefined) {
      updateFields.push(`allocations = $${paramIndex++}`);
      values.push(JSON.stringify(data.allocations));
    }
    if (data.active !== undefined) {
      updateFields.push(`active = $${paramIndex++}`);
      values.push(data.active);
    }

    values.push(id);

    const query = `
      UPDATE strategies
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    const row = result.rows[0];
    row.allocations = JSON.parse(row.allocations);
    return row;
  }

  async deleteStrategy(id: string): Promise<void> {
    const query = 'DELETE FROM strategies WHERE id = $1';
    await this.pool.query(query, [id]);
  }
}
