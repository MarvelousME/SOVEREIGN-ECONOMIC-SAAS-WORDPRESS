import { v4 as uuidv4 } from 'uuid';
import { ReferralReward, RewardStatus } from '../types';
import db from '../config/database';
import logger from '../utils/logger';

export class RewardModel {
  async create(data: {
    referrerId: string;
    refereeId: string;
    tier: number;
    amount: number;
    currency: string;
    source: string;
    sourceId: string;
    status: RewardStatus;
  }): Promise<ReferralReward> {
    const query = `
      INSERT INTO referral_rewards (
        id, referrer_id, referee_id, tier, amount, currency,
        source, source_id, status, calculated_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const id = uuidv4();
    const now = new Date();

    const values = [
      id,
      data.referrerId,
      data.refereeId,
      data.tier,
      data.amount,
      data.currency,
      data.source,
      data.sourceId,
      data.status,
      now,
      now,
      now,
    ];

    try {
      const result = await db.query<ReferralReward>(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating referral reward', { data, error });
      throw error;
    }
  }

  async findByReferrerId(
    referrerId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<ReferralReward[]> {
    const query = `
      SELECT * FROM referral_rewards 
      WHERE referrer_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query<ReferralReward>(query, [referrerId, limit, offset]);
      return result.rows.map(row => this.mapRow(row));
    } catch (error) {
      logger.error('Error finding rewards by referrer', { referrerId, error });
      throw error;
    }
  }

  async getTotalEarnings(referrerId: string, status?: RewardStatus): Promise<number> {
    let query = 'SELECT COALESCE(SUM(amount), 0) as total FROM referral_rewards WHERE referrer_id = $1';
    const values: any[] = [referrerId];

    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }

    try {
      const result = await db.query(query, values);
      return parseFloat(result.rows[0].total);
    } catch (error) {
      logger.error('Error getting total earnings', { referrerId, status, error });
      throw error;
    }
  }

  async updateStatus(id: string, status: RewardStatus, distributedAt?: Date): Promise<void> {
    const query = `
      UPDATE referral_rewards 
      SET status = $1, distributed_at = $2, updated_at = $3 
      WHERE id = $4
    `;

    try {
      await db.query(query, [status, distributedAt || null, new Date(), id]);
    } catch (error) {
      logger.error('Error updating reward status', { id, status, error });
      throw error;
    }
  }

  async getTotalByReferee(refereeId: string, referrerId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM referral_rewards 
      WHERE referee_id = $1 AND referrer_id = $2
    `;

    try {
      const result = await db.query(query, [refereeId, referrerId]);
      return parseFloat(result.rows[0].total);
    } catch (error) {
      logger.error('Error getting total by referee', { refereeId, referrerId, error });
      throw error;
    }
  }

  private mapRow(row: any): ReferralReward {
    return {
      id: row.id,
      referrerId: row.referrer_id,
      refereeId: row.referee_id,
      tier: row.tier,
      amount: parseFloat(row.amount),
      currency: row.currency,
      source: row.source,
      sourceId: row.source_id,
      status: row.status as RewardStatus,
      calculatedAt: new Date(row.calculated_at),
      distributedAt: row.distributed_at ? new Date(row.distributed_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default RewardModel;
