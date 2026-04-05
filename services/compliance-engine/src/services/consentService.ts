import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { eventService, ComplianceEvents } from './events.service';
import {
  ConsentRecord,
  ConsentBasis,
  ConsentChannel,
  Regulation,
  RecordConsentInput
} from '../types';

export class ConsentService {
  async recordConsent(input: RecordConsentInput): Promise<ConsentRecord> {
    const id = uuidv4();
    const now = new Date();
    const expiresAt = input.expiresInDays
      ? new Date(now.getTime() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const query = `
      INSERT INTO compliance.consent_records (
        id, contact_id, purpose, basis, channels, regulations,
        status, granted_at, expires_at, proof_type, proof_data,
        ip_address, user_agent, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        'granted', $7, $8, $9, $10,
        $11, $12, $13, $14, $14
      )
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      input.contactId,
      input.purpose,
      input.basis,
      JSON.stringify(input.channels),
      JSON.stringify(input.regulations),
      now,
      expiresAt,
      input.proofType || 'web_form',
      JSON.stringify(input.proofData || {}),
      input.ipAddress || null,
      input.userAgent || null,
      JSON.stringify({})
    ]);

    const record = this.mapToConsentRecord(result.rows[0]);

    await eventService.publish(ComplianceEvents.CONSENT_RECORDED, {
      consentId: record.id,
      contactId: record.contactId,
      purpose: record.purpose,
      basis: record.basis,
      channels: record.channels,
      regulations: record.regulations,
      timestamp: now
    });

    logger.info('Consent recorded', { consentId: id, contactId: input.contactId });

    return record;
  }

  async getConsentByContactId(contactId: string): Promise<ConsentRecord[]> {
    const query = `
      SELECT * FROM compliance.consent_records
      WHERE contact_id = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [contactId]);
    return result.rows.map(this.mapToConsentRecord);
  }

  async getConsentStatus(contactId: string): Promise<{
    hasValidConsent: boolean;
    consents: ConsentRecord[];
    channels: ConsentChannel[];
    regulations: Regulation[];
  }> {
    const consents = await this.getConsentByContactId(contactId);
    const now = new Date();

    const validConsents = consents.filter(c => {
      if (c.status !== 'granted') return false;
      if (c.expiresAt && new Date(c.expiresAt) < now) return false;
      return true;
    });

    const channels = [...new Set(validConsents.flatMap(c => c.channels))];
    const regulations = [...new Set(validConsents.flatMap(c => c.regulations))];

    return {
      hasValidConsent: validConsents.length > 0,
      consents: validConsents,
      channels,
      regulations
    };
  }

  async revokeConsent(consentId: string, reason?: string): Promise<ConsentRecord> {
    const now = new Date();

    const query = `
      UPDATE compliance.consent_records
      SET status = 'revoked',
          revoked_at = $2,
          metadata = metadata || $3,
          updated_at = $2
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      consentId,
      now,
      JSON.stringify({ revocationReason: reason || 'User requested revocation' })
    ]);

    if (result.rows.length === 0) {
      throw new Error('Consent record not found');
    }

    const record = this.mapToConsentRecord(result.rows[0]);

    await eventService.publish(ComplianceEvents.CONSENT_REVOKED, {
      consentId: record.id,
      contactId: record.contactId,
      reason,
      timestamp: now
    });

    logger.info('Consent revoked', { consentId, reason });

    return record;
  }

  async checkConsentForChannel(
    contactId: string,
    channel: ConsentChannel,
    regulation: Regulation,
    purpose: string
  ): Promise<boolean> {
    const status = await this.getConsentStatus(contactId);

    if (!status.hasValidConsent) return false;

    const hasChannelConsent = status.channels.includes(channel);
    const hasRegulationConsent = status.regulations.includes(regulation);

    const matchingConsent = status.consents.find(c =>
      c.purpose === purpose &&
      c.channels.includes(channel) &&
      c.regulations.includes(regulation)
    );

    return hasChannelConsent && hasRegulationConsent && !!matchingConsent;
  }

  async updateConsent(
    consentId: string,
    updates: Partial<{
      purpose: string;
      channels: ConsentChannel[];
      regulations: Regulation[];
      expiresInDays: number;
    }>
  ): Promise<ConsentRecord> {
    const now = new Date();
    const setClauses: string[] = ['updated_at = $2'];
    const values: any[] = [consentId, now];
    let paramIndex = 3;

    if (updates.purpose) {
      setClauses.push(`purpose = $${paramIndex++}`);
      values.push(updates.purpose);
    }

    if (updates.channels) {
      setClauses.push(`channels = $${paramIndex++}`);
      values.push(JSON.stringify(updates.channels));
    }

    if (updates.regulations) {
      setClauses.push(`regulations = $${paramIndex++}`);
      values.push(JSON.stringify(updates.regulations));
    }

    if (updates.expiresInDays !== undefined) {
      setClauses.push(`expires_at = $${paramIndex++}`);
      values.push(new Date(now.getTime() + updates.expiresInDays * 24 * 60 * 60 * 1000));
    }

    const query = `
      UPDATE compliance.consent_records
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Consent record not found');
    }

    const record = this.mapToConsentRecord(result.rows[0]);

    await eventService.publish(ComplianceEvents.CONSENT_UPDATED, {
      consentId: record.id,
      contactId: record.contactId,
      updates,
      timestamp: now
    });

    logger.info('Consent updated', { consentId, updates });

    return record;
  }

  async expireConsents(): Promise<number> {
    const now = new Date();

    const query = `
      UPDATE compliance.consent_records
      SET status = 'expired',
          updated_at = $2
      WHERE status = 'granted'
        AND expires_at IS NOT NULL
        AND expires_at < $1
    `;

    const result = await db.query(query, [now]);

    logger.info('Expired consents processed', { count: result.rowCount });

    return result.rowCount || 0;
  }

  private mapToConsentRecord(row: any): ConsentRecord {
    return {
      id: row.id,
      contactId: row.contact_id,
      purpose: row.purpose,
      basis: row.basis as ConsentBasis,
      channels: JSON.parse(row.channels || '[]'),
      regulations: JSON.parse(row.regulations || '[]'),
      status: row.status,
      grantedAt: new Date(row.granted_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
      proofType: row.proof_type,
      proofData: JSON.parse(row.proof_data || '{}'),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const consentService = new ConsentService();
