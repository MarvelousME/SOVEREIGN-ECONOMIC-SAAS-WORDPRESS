import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { encryptionService } from '../utils/encryption';
import { anonymizationService } from '../utils/anonymization';
import {
  VaultData,
  DataConsent,
  DataAccessLog,
  DataMonetization,
  StoreDataRequest,
  GrantConsentRequest,
  DataExportRequest,
  ConsentStatus,
  DataType,
  AnonymizationLevel
} from '../types';
import { EventService } from './events.service';
import { config } from '../config';

export class DataVaultService {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  /**
   * Store personal data (encrypted)
   */
  async storeData(userId: string, request: StoreDataRequest): Promise<VaultData> {
    // Encrypt the data
    const encrypted = encryptionService.encryptObject(request.data);
    
    const dataId = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO vault_data (
        id, user_id, data_type, encrypted_data, encryption_iv, auth_tag,
        metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await db.query(query, [
      dataId,
      userId,
      request.dataType,
      encrypted.encryptedData,
      encrypted.iv,
      encrypted.authTag,
      JSON.stringify(request.metadata || {}),
      now,
      now
    ]);

    // Publish event
    await this.eventService.publish('data.stored', {
      dataId,
      userId,
      dataType: request.dataType
    });

    logger.info('Data stored in vault', { dataId, userId, dataType: request.dataType });

    // Return without encrypted fields
    return {
      id: dataId,
      userId,
      dataType: request.dataType,
      data: request.data,
      encryptedData: '[encrypted]',
      metadata: request.metadata,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Retrieve own data (decrypted)
   */
  async retrieveData(userId: string, dataId?: string, dataType?: DataType): Promise<VaultData[]> {
    let query = `
      SELECT id, user_id, data_type, encrypted_data, encryption_iv, auth_tag, metadata, created_at, updated_at
      FROM vault_data
      WHERE user_id = $1
    `;
    const params: any[] = [userId];

    if (dataId) {
      query += ' AND id = $2';
      params.push(dataId);
    } else if (dataType) {
      query += ' AND data_type = $2';
      params.push(dataType);
    }

    const result = await db.query(query, params);

    return result.rows.map(row => {
      // Decrypt data
      const decryptedData = encryptionService.decryptObject(
        row.encrypted_data,
        row.encryption_iv,
        row.auth_tag
      );

      return {
        id: row.id,
        userId: row.user_id,
        dataType: row.data_type,
        data: decryptedData,
        encryptedData: '[encrypted]',
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
  }

  /**
   * Update data
   */
  async updateData(userId: string, dataId: string, data: Record<string, any>): Promise<VaultData> {
    return await db.transaction(async (client) => {
      // Verify ownership
      const checkQuery = 'SELECT id FROM vault_data WHERE id = $1 AND user_id = $2';
      const checkResult = await client.query(checkQuery, [dataId, userId]);

      if (checkResult.rows.length === 0) {
        throw new Error('Data not found or access denied');
      }

      // Encrypt new data
      const encrypted = encryptionService.encryptObject(data);

      // Update
      const updateQuery = `
        UPDATE vault_data
        SET encrypted_data = $1, encryption_iv = $2, auth_tag = $3, updated_at = $4
        WHERE id = $5 AND user_id = $6
        RETURNING *
      `;

      const result = await client.query(updateQuery, [
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag,
        new Date(),
        dataId,
        userId
      ]);

      const row = result.rows[0];

      await this.eventService.publish('data.updated', {
        dataId,
        userId
      });

      logger.info('Data updated in vault', { dataId, userId });

      return {
        id: row.id,
        userId: row.user_id,
        dataType: row.data_type,
        data,
        encryptedData: '[encrypted]',
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });
  }

  /**
   * Delete data (GDPR right to be forgotten)
   */
  async deleteData(userId: string, dataId: string): Promise<void> {
    return await db.transaction(async (client) => {
      // Delete consents first
      await client.query(
        'DELETE FROM data_consents WHERE user_id = $1 AND data_id = $2',
        [userId, dataId]
      );

      // Delete data
      const result = await client.query(
        'DELETE FROM vault_data WHERE id = $1 AND user_id = $2',
        [dataId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Data not found or access denied');
      }

      await this.eventService.publish('data.deleted', {
        dataId,
        userId
      });

      logger.info('Data deleted from vault (right to be forgotten)', { dataId, userId });
    });
  }

  /**
   * Grant data access consent
   */
  async grantConsent(userId: string, request: GrantConsentRequest): Promise<DataConsent> {
    const consentId = uuidv4();
    const now = new Date();
    const expiresAt = request.expiresIn
      ? new Date(now.getTime() + request.expiresIn * 24 * 60 * 60 * 1000)
      : null;

    const query = `
      INSERT INTO data_consents (
        id, user_id, data_id, data_type, granted_to, purpose,
        anonymization_level, fields, status, granted_at, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query<DataConsent>(query, [
      consentId,
      userId,
      request.dataId || null,
      request.dataType || null,
      request.grantedTo,
      request.purpose,
      request.anonymizationLevel,
      JSON.stringify(request.fields || []),
      ConsentStatus.GRANTED,
      now,
      expiresAt
    ]);

    const consent = result.rows[0];

    await this.eventService.publish('consent.granted', {
      consentId,
      userId,
      grantedTo: request.grantedTo,
      purpose: request.purpose
    });

    logger.info('Data consent granted', { consentId, userId, grantedTo: request.grantedTo });

    return consent;
  }

  /**
   * List user's consents
   */
  async listConsents(userId: string): Promise<DataConsent[]> {
    const query = `
      SELECT * FROM data_consents
      WHERE user_id = $1
      ORDER BY granted_at DESC
    `;

    const result = await db.query<DataConsent>(query, [userId]);
    return result.rows;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(userId: string, consentId: string): Promise<void> {
    const now = new Date();

    const result = await db.query(
      `UPDATE data_consents 
       SET status = $1, revoked_at = $2 
       WHERE id = $3 AND user_id = $4`,
      [ConsentStatus.REVOKED, now, consentId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Consent not found');
    }

    await this.eventService.publish('consent.revoked', {
      consentId,
      userId
    });

    logger.info('Data consent revoked', { consentId, userId });
  }

  /**
   * Access data with consent (for third parties)
   */
  async accessDataWithConsent(
    requesterId: string,
    consentId: string
  ): Promise<{ data: Record<string, any>; anonymizationLevel: AnonymizationLevel }> {
    return await db.transaction(async (client) => {
      // Get consent
      const consentQuery = `
        SELECT * FROM data_consents
        WHERE id = $1 AND granted_to = $2 AND status = $3
      `;

      const consentResult = await client.query<DataConsent>(consentQuery, [
        consentId,
        requesterId,
        ConsentStatus.GRANTED
      ]);

      if (consentResult.rows.length === 0) {
        throw new Error('Consent not found or invalid');
      }

      const consent = consentResult.rows[0];

      // Check expiration
      if (consent.expiresAt && new Date() > new Date(consent.expiresAt)) {
        throw new Error('Consent has expired');
      }

      // Get encrypted data
      const dataQuery = consent.dataId
        ? 'SELECT * FROM vault_data WHERE id = $1'
        : 'SELECT * FROM vault_data WHERE user_id = $1 AND data_type = $2';

      const dataParams = consent.dataId
        ? [consent.dataId]
        : [consent.userId, consent.dataType];

      const dataResult = await client.query(dataQuery, dataParams);

      if (dataResult.rows.length === 0) {
        throw new Error('Data not found');
      }

      const row = dataResult.rows[0];

      // Decrypt data
      let decryptedData = encryptionService.decryptObject(
        row.encrypted_data,
        row.encryption_iv,
        row.auth_tag
      );

      // Apply anonymization
      const anonymized = anonymizationService.anonymize(
        decryptedData,
        consent.anonymizationLevel
      );

      // Filter fields if specified
      if (consent.fields && Array.isArray(consent.fields) && consent.fields.length > 0) {
        const allowedFields = consent.fields as string[];
        const filteredData: Record<string, any> = {};
        allowedFields.forEach(field => {
          if (field in anonymized.data) {
            filteredData[field] = anonymized.data[field];
          }
        });
        anonymized.data = filteredData;
      }

      // Log access
      const logQuery = `
        INSERT INTO data_access_logs (
          id, consent_id, accessed_by, accessed_at, data_type, 
          fields_accessed, anonymization_level, purpose
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      await client.query(logQuery, [
        uuidv4(),
        consentId,
        requesterId,
        new Date(),
        row.data_type,
        JSON.stringify(Object.keys(anonymized.data)),
        consent.anonymizationLevel,
        consent.purpose
      ]);

      await this.eventService.publish('data.accessed', {
        consentId,
        accessedBy: requesterId,
        dataType: row.data_type
      });

      logger.info('Data accessed with consent', { consentId, requesterId });

      return {
        data: anonymized.data,
        anonymizationLevel: consent.anonymizationLevel
      };
    });
  }

  /**
   * Export user data (GDPR data portability)
   */
  async exportData(userId: string, request: DataExportRequest): Promise<any> {
    const query = `
      SELECT id, data_type, encrypted_data, encryption_iv, auth_tag, metadata, created_at, updated_at
      FROM vault_data
      WHERE user_id = $1
      ${request.dataTypes ? 'AND data_type = ANY($2)' : ''}
    `;

    const params: any[] = [userId];
    if (request.dataTypes) {
      params.push(request.dataTypes);
    }

    const result = await db.query(query, params);

    const exportData = result.rows.map(row => {
      const decryptedData = encryptionService.decryptObject(
        row.encrypted_data,
        row.encryption_iv,
        row.auth_tag
      );

      return {
        id: row.id,
        dataType: row.data_type,
        data: decryptedData,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    await this.eventService.publish('data.exported', {
      userId,
      recordCount: exportData.length
    });

    logger.info('User data exported', { userId, recordCount: exportData.length });

    if (request.format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return exportData;
  }

  /**
   * Get data monetization revenue
   */
  async getMonetizationRevenue(userId: string): Promise<DataMonetization[]> {
    const query = `
      SELECT * FROM data_monetization
      WHERE user_id = $1
      ORDER BY purchased_at DESC
    `;

    const result = await db.query<DataMonetization>(query, [userId]);
    return result.rows;
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'object' ? JSON.stringify(value) : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }
}
