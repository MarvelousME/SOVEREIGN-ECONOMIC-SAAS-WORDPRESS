import { v4 as uuidv4 } from 'uuid';
import { PayoutRequest, PayoutMethod, PayoutStatus } from '../types';
import db from '../config/database';
import logger from '../utils/logger';

export class PayoutModel {
  async create(data: {
    userId: string;
    amount: number;
    currency: string;
    method: PayoutMethod;
    idempotencyKey: string;
    metadata?: Record<string, any>;
  }): Promise<PayoutRequest> {
    const query = `
      INSERT INTO payout_requests (
        id, user_id, amount, currency, method, status,
        requested_at, processed_at, idempotency_key, metadata,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const id = uuidv4();
    const now = new Date();

    const values = [
      id,
      data.userId,
      data.amount,
      data.currency,
      data.method,
      PayoutStatus.PENDING,
      now,
      null,
      data.idempotencyKey,
      JSON.stringify(data.metadata || {}),
      now,
      now,
    ];

    try {
      const result = await db.query(query, values);
      return this.mapRow(result.rows[0]);
    } catch (error) {
      logger.error('Error creating payout request', { data, error });
      throw error;
    }
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<PayoutRequest | null> {
    const query = 'SELECT * FROM payout_requests WHERE idempotency_key = $1';
    
    try {
      const result = await db.query(query, [idempotencyKey]);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding payout by idempotency key', { idempotencyKey, error });
      throw error;
    }
  }

  async findById(id: string): Promise<PayoutRequest | null> {
    const query = 'SELECT * FROM payout_requests WHERE id = $1';
    
    try {
      const result = await db.query(query, [id]);
      return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    } catch (error) {
      logger.error('Error finding payout by ID', { id, error });
      throw error;
    }
  }

  async findByUserId(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<PayoutRequest[]> {
    const query = `
      SELECT * FROM payout_requests 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [userId, limit, offset]);
      return result.rows.map(row => this.mapRow(row));
    } catch (error) {
      logger.error('Error finding payouts by user ID', { userId, error });
      throw error;
    }
  }

  async updateStatus(
    id: string,
    status: PayoutStatus,
    processedAt?: Date,
    metadata?: Record<string, any>
  ): Promise<void> {
    const updates: string[] = ['status = $1', 'updated_at = $2'];
    const values: any[] = [status, new Date()];
    let paramIndex = 3;

    if (processedAt) {
      updates.push(`processed_at = $${paramIndex}`);
      values.push(processedAt);
      paramIndex++;
    }

    if (metadata) {
      updates.push(`metadata = $${paramIndex}`);
      values.push(JSON.stringify(metadata));
      paramIndex++;
    }

    const query = `
      UPDATE payout_requests 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    try {
      await db.query(query, [...values, id]);
    } catch (error) {
      logger.error('Error updating payout status', { id, status, error });
      throw error;
    }
  }

  async getTotalPaidOut(userId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payout_requests 
      WHERE user_id = $1 AND status = $2
    `;

    try {
      const result = await db.query(query, [userId, PayoutStatus.COMPLETED]);
      return parseFloat(result.rows[0].total);
    } catch (error) {
      logger.error('Error getting total paid out', { userId, error });
      throw error;
    }
  }

  async getPendingPayoutsTotal(userId: string): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payout_requests 
      WHERE user_id = $1 AND status IN ($2, $3)
    `;

    try {
      const result = await db.query(query, [
        userId,
        PayoutStatus.PENDING,
        PayoutStatus.PROCESSING,
      ]);
      return parseFloat(result.rows[0].total);
    } catch (error) {
      logger.error('Error getting pending payouts total', { userId, error });
      throw error;
    }
  }

  private mapRow(row: any): PayoutRequest {
    return {
      id: row.id,
      userId: row.user_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      method: row.method as PayoutMethod,
      status: row.status as PayoutStatus,
      requestedAt: new Date(row.requested_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : null,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
    };
  }
}

export class PayoutAuditModel {
  async create(data: {
    payoutId: string;
    action: string;
    actorId?: string;
    details: Record<string, any>;
  }): Promise<void> {
    const query = `
      INSERT INTO payout_audit_log (
        id, payout_id, action, actor_id, details, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const id = uuidv4();
    const now = new Date();

    try {
      await db.query(query, [
        id,
        data.payoutId,
        data.action,
        data.actorId || null,
        JSON.stringify(data.details),
        now,
      ]);
    } catch (error) {
      logger.error('Error creating payout audit log', { data, error });
      throw error;
    }
  }

  async findByPayoutId(payoutId: string): Promise<any[]> {
    const query = `
      SELECT * FROM payout_audit_log 
      WHERE payout_id = $1 
      ORDER BY created_at ASC
    `;

    try {
      const result = await db.query(query, [payoutId]);
      return result.rows.map(row => ({
        id: row.id,
        payoutId: row.payout_id,
        action: row.action,
        actorId: row.actor_id,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      logger.error('Error finding audit logs by payout ID', { payoutId, error });
      throw error;
    }
  }
}

export default PayoutModel;
