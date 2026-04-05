import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { eventService, ComplianceEvents } from './events.service';
import {
  SuppressionEntry,
  SuppressionType,
  SuppressionChannel,
  AddSuppressionInput
} from '../types';

export class SuppressionService {
  async addToSuppressionList(input: AddSuppressionInput): Promise<SuppressionEntry> {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = input.expiresInDays
      ? new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const existingQuery = `
      SELECT id FROM compliance.suppression_list
      WHERE ($1::text IS NOT NULL AND contact_id = $1)
         OR ($2::text IS NOT NULL AND email = $2)
         OR ($3::text IS NOT NULL AND phone = $3)
    `;

    const existing = await db.query(existingQuery, [
      input.contactId || null,
      input.email || null,
      input.phone || null
    ]);

    if (existing.rows.length > 0) {
      const updateQuery = `
        UPDATE compliance.suppression_list
        SET type = $4,
            channel = $5,
            reason = COALESCE($6, reason),
            source = COALESCE($7, source),
            added_by = COALESCE($8, added_by),
            expires_at = $9,
            metadata = metadata || $10,
            updated_at = $11
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query(updateQuery, [
        existing.rows[0].id,
        input.type,
        input.channel,
        input.reason || null,
        input.source || null,
        input.addedBy || null,
        expiresAt,
        JSON.stringify({ previousUpdate: now }),
        now
      ]);

      const entry = this.mapToSuppressionEntry(result.rows[0]);

      await eventService.publish(ComplianceEvents.SUPPRESSION_UPDATED, {
        suppressionId: entry.id,
        action: 'updated',
        type: entry.type,
        channel: entry.channel,
        timestamp: now
      });

      logger.info('Suppression entry updated', { suppressionId: entry.id });

      return entry;
    }

    const query = `
      INSERT INTO compliance.suppression_list (
        id, contact_id, email, phone, type, channel,
        reason, source, added_by, expires_at, metadata,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12, $12
      )
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      input.contactId || null,
      input.email || null,
      input.phone || null,
      input.type,
      input.channel,
      input.reason || null,
      input.source || null,
      input.addedBy || null,
      expiresAt,
      JSON.stringify({}),
      now
    ]);

    const entry = this.mapToSuppressionEntry(result.rows[0]);

    await eventService.publish(ComplianceEvents.SUPPRESSION_UPDATED, {
      suppressionId: entry.id,
      action: 'added',
      type: entry.type,
      channel: entry.channel,
      timestamp: now
    });

    logger.info('Suppression entry added', { suppressionId: id, type: input.type });

    return entry;
  }

  async removeFromSuppressionList(id: string): Promise<boolean> {
    const query = `
      DELETE FROM compliance.suppression_list
      WHERE id = $1
      RETURNING id
    `;

    const result = await db.query(query, [id]);

    if (result.rowCount && result.rowCount > 0) {
      await eventService.publish(ComplianceEvents.SUPPRESSION_UPDATED, {
        suppressionId: id,
        action: 'removed',
        timestamp: new Date()
      });

      logger.info('Suppression entry removed', { suppressionId: id });
      return true;
    }

    return false;
  }

  async getSuppressionEntry(id: string): Promise<SuppressionEntry | null> {
    const query = `SELECT * FROM compliance.suppression_list WHERE id = $1`;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) return null;

    return this.mapToSuppressionEntry(result.rows[0]);
  }

  async listSuppressionEntries(filters?: {
    type?: SuppressionType;
    channel?: SuppressionChannel;
    contactId?: string;
    email?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: SuppressionEntry[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }

    if (filters?.channel) {
      conditions.push(`channel = $${paramIndex++}`);
      values.push(filters.channel);
    }

    if (filters?.contactId) {
      conditions.push(`contact_id = $${paramIndex++}`);
      values.push(filters.contactId);
    }

    if (filters?.email) {
      conditions.push(`email = $${paramIndex++}`);
      values.push(filters.email);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countQuery = `SELECT COUNT(*) FROM compliance.suppression_list ${whereClause}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 100;
    const offset = filters?.offset || 0;

    const query = `
      SELECT * FROM compliance.suppression_list
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);

    return {
      entries: result.rows.map(this.mapToSuppressionEntry),
      total
    };
  }

  async isSuppressed(input: {
    contactId?: string;
    email?: string;
    phone?: string;
    channel?: SuppressionChannel;
  }): Promise<{ isSuppressed: boolean; entry?: SuppressionEntry }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.contactId) {
      conditions.push(`contact_id = $${paramIndex++}`);
      values.push(input.contactId);
    }

    if (input.email) {
      conditions.push(`email = $${paramIndex++}`);
      values.push(input.email);
    }

    if (input.phone) {
      conditions.push(`phone = $${paramIndex++}`);
      values.push(input.phone);
    }

    if (conditions.length === 0) {
      return { isSuppressed: false };
    }

    let whereClause = `WHERE ${conditions.join(' OR ')}`;

    if (input.channel && input.channel !== SuppressionChannel.ALL) {
      whereClause += ` AND (channel = $${paramIndex++} OR channel = 'all')`;
      values.push(input.channel);
    }

    const now = new Date();
    whereClause += ` AND (expires_at IS NULL OR expires_at > $${paramIndex++})`;
    values.push(now);

    const query = `
      SELECT * FROM compliance.suppression_list
      ${whereClause}
      LIMIT 1
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return { isSuppressed: false };
    }

    return {
      isSuppressed: true,
      entry: this.mapToSuppressionEntry(result.rows[0])
    };
  }

  async syncUnsubscribe(identifier: {
    contactId?: string;
    email?: string;
    phone?: string;
  }): Promise<void> {
    const existing = await this.isSuppressed({
      contactId: identifier.contactId,
      email: identifier.email,
      phone: identifier.phone
    });

    if (!existing.isSuppressed) {
      await this.addToSuppressionList({
        contactId: identifier.contactId,
        email: identifier.email,
        phone: identifier.phone,
        type: SuppressionType.UNSUBSCRIBE,
        channel: SuppressionChannel.ALL,
        reason: 'User unsubscribed',
        source: 'sync'
      });
    }
  }

  async cleanupExpired(): Promise<number> {
    const now = new Date();

    const query = `
      DELETE FROM compliance.suppression_list
      WHERE expires_at IS NOT NULL
        AND expires_at < $1
    `;

    const result = await db.query(query, [now]);

    logger.info('Expired suppression entries cleaned up', { count: result.rowCount });

    return result.rowCount || 0;
  }

  private mapToSuppressionEntry(row: any): SuppressionEntry {
    return {
      id: row.id,
      contactId: row.contact_id,
      email: row.email,
      phone: row.phone,
      type: row.type as SuppressionType,
      channel: row.channel as SuppressionChannel,
      reason: row.reason,
      source: row.source,
      addedBy: row.added_by,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const suppressionService = new SuppressionService();
