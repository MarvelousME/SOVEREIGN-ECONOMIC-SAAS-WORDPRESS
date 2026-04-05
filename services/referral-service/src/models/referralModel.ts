import { Pool, PoolClient, QueryResult } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Referral, ReferralStatus, ReferralConversion, ConversionMilestone } from '../types';
import db from '../config/database';
import logger from '../utils/logger';

export class ReferralModel {
  async create(data: {
    userId: string;
    referralCode: string;
    referrerId: string | null;
    tier: number;
    ipAddress: string;
    deviceFingerprint: string;
    userAgent: string;
    status: ReferralStatus;
    fraudScore: number;
  }): Promise<Referral> {
    const query = `
      INSERT INTO referrals (
        id, user_id, referral_code, referrer_id, tier,
        ip_address, device_fingerprint, user_agent, status,
        fraud_score, registered_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const id = uuidv4();
    const now = new Date();

    const values = [
      id,
      data.userId,
      data.referralCode,
      data.referrerId,
      data.tier,
      data.ipAddress,
      data.deviceFingerprint,
      data.userAgent,
      data.status,
      data.fraudScore,
      now,
      now,
      now,
    ];

    try {
      const result = await db.query<Referral>(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating referral', { data, error });
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<Referral | null> {
    const query = 'SELECT * FROM referrals WHERE user_id = $1';
    
    try {
      const result = await db.query<Referral>(query, [userId]);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding referral by user ID', { userId, error });
      throw error;
    }
  }

  async findByReferralCode(code: string): Promise<Referral | null> {
    const query = 'SELECT * FROM referrals WHERE referral_code = $1';
    
    try {
      const result = await db.query<Referral>(query, [code]);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding referral by code', { code, error });
      throw error;
    }
  }

  async findByReferrerId(referrerId: string, limit: number = 100, offset: number = 0): Promise<Referral[]> {
    const query = `
      SELECT * FROM referrals 
      WHERE referrer_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await db.query<Referral>(query, [referrerId, limit, offset]);
      return result.rows.map(row => this.mapRow(row));
    } catch (error) {
      logger.error('Error finding referrals by referrer', { referrerId, error });
      throw error;
    }
  }

  async updateStatus(userId: string, status: ReferralStatus): Promise<void> {
    const query = `
      UPDATE referrals 
      SET status = $1, updated_at = $2 
      WHERE user_id = $3
    `;
    
    try {
      await db.query(query, [status, new Date(), userId]);
    } catch (error) {
      logger.error('Error updating referral status', { userId, status, error });
      throw error;
    }
  }

  async countByReferrerId(referrerId: string, status?: ReferralStatus): Promise<number> {
    let query = 'SELECT COUNT(*) FROM referrals WHERE referrer_id = $1';
    const values: any[] = [referrerId];

    if (status) {
      query += ' AND status = $2';
      values.push(status);
    }

    try {
      const result = await db.query(query, values);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      logger.error('Error counting referrals', { referrerId, status, error });
      throw error;
    }
  }

  async countByTier(referrerId: string): Promise<Record<number, number>> {
    const query = `
      SELECT tier, COUNT(*) as count 
      FROM referrals 
      WHERE referrer_id = $1 
      GROUP BY tier
    `;

    try {
      const result = await db.query(query, [referrerId]);
      const counts: Record<number, number> = {};
      
      result.rows.forEach(row => {
        counts[row.tier] = parseInt(row.count, 10);
      });

      return counts;
    } catch (error) {
      logger.error('Error counting referrals by tier', { referrerId, error });
      throw error;
    }
  }

  async getReferralTree(userId: string, maxDepth: number = 5): Promise<any> {
    // Recursive CTE to build referral tree
    const query = `
      WITH RECURSIVE referral_tree AS (
        SELECT 
          id, user_id, referral_code, referrer_id, tier, status,
          1 as depth
        FROM referrals
        WHERE user_id = $1
        
        UNION ALL
        
        SELECT 
          r.id, r.user_id, r.referral_code, r.referrer_id, r.tier, r.status,
          rt.depth + 1
        FROM referrals r
        INNER JOIN referral_tree rt ON r.referrer_id = rt.user_id
        WHERE rt.depth < $2
      )
      SELECT * FROM referral_tree ORDER BY depth, created_at
    `;

    try {
      const result = await db.query(query, [userId, maxDepth]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting referral tree', { userId, error });
      throw error;
    }
  }

  private mapRow(row: any): Referral {
    return {
      id: row.id,
      userId: row.user_id,
      referralCode: row.referral_code,
      referrerId: row.referrer_id,
      tier: row.tier,
      registeredAt: new Date(row.registered_at),
      ipAddress: row.ip_address,
      deviceFingerprint: row.device_fingerprint,
      userAgent: row.user_agent,
      status: row.status as ReferralStatus,
      fraudScore: row.fraud_score,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export default ReferralModel;
