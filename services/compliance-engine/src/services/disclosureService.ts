import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { eventService, ComplianceEvents } from './events.service';
import {
  DisclosureTemplate,
  DisclosureType,
  Regulation
} from '../types';

interface GenerateDisclosureParams {
  type: DisclosureType;
  channel: string;
  context?: Record<string, any>;
}

export class DisclosureService {
  async createTemplate(template: {
    type: DisclosureType;
    channel: string;
    regulation: Regulation;
    text: string;
    version?: string;
    metadata?: Record<string, any>;
  }): Promise<DisclosureTemplate> {
    const id = uuidv4();

    const query = `
      INSERT INTO compliance.disclosure_templates (
        id, type, channel, regulation, text, is_active, version, metadata,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, true, $6, $7, $8, $8
      )
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      template.type,
      template.channel,
      template.regulation,
      template.text,
      template.version || '1.0.0',
      JSON.stringify(template.metadata || {})
    ]);

    logger.info('Disclosure template created', { id, type: template.type });

    return this.mapToDisclosureTemplate(result.rows[0]);
  }

  async generateDisclosure(params: GenerateDisclosureParams): Promise<{
    text: string;
    type: DisclosureType;
    channel: string;
    regulation: Regulation;
    metadata?: Record<string, any>;
  }> {
    const query = `
      SELECT * FROM compliance.disclosure_templates
      WHERE type = $1
        AND channel = $2
        AND is_active = true
      ORDER BY version DESC
      LIMIT 1
    `;

    const result = await db.query(query, [params.type, params.channel]);

    if (result.rows.length === 0) {
      const defaultText = this.getDefaultDisclosureText(params.type);
      return {
        text: this.interpolateContext(defaultText, params.context),
        type: params.type,
        channel: params.channel,
        regulation: this.getRegulationForType(params.type)
      };
    }

    const template = this.mapToDisclosureTemplate(result.rows[0]);

    await eventService.publish(ComplianceEvents.DISCLOSURE_GENERATED, {
      templateId: template.id,
      type: params.type,
      channel: params.channel,
      timestamp: new Date()
    });

    return {
      text: this.interpolateContext(template.text, params.context),
      type: template.type,
      channel: template.channel,
      regulation: template.regulation,
      metadata: template.metadata
    };
  }

  async getTemplate(id: string): Promise<DisclosureTemplate | null> {
    const query = `SELECT * FROM compliance.disclosure_templates WHERE id = $1`;
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) return null;

    return this.mapToDisclosureTemplate(result.rows[0]);
  }

  async listTemplates(filters?: {
    type?: DisclosureType;
    channel?: string;
    regulation?: Regulation;
    isActive?: boolean;
  }): Promise<DisclosureTemplate[]> {
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

    if (filters?.regulation) {
      conditions.push(`regulation = $${paramIndex++}`);
      values.push(filters.regulation);
    }

    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${paramIndex++}`);
      values.push(filters.isActive);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = `
      SELECT * FROM compliance.disclosure_templates
      ${whereClause}
      ORDER BY type, channel
    `;

    const result = await db.query(query, values);

    return result.rows.map(this.mapToDisclosureTemplate);
  }

  async updateTemplate(
    id: string,
    updates: Partial<{
      text: string;
      isActive: boolean;
      version: string;
      metadata: Record<string, any>;
    }>
  ): Promise<DisclosureTemplate> {
    const now = new Date();
    const setClauses: string[] = ['updated_at = $2'];
    const values: any[] = [id, now];
    let paramIndex = 3;

    if (updates.text !== undefined) {
      setClauses.push(`text = $${paramIndex++}`);
      values.push(updates.text);
    }

    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }

    if (updates.version !== undefined) {
      setClauses.push(`version = $${paramIndex++}`);
      values.push(updates.version);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    const query = `
      UPDATE compliance.disclosure_templates
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Disclosure template not found');
    }

    logger.info('Disclosure template updated', { id });

    return this.mapToDisclosureTemplate(result.rows[0]);
  }

  private getDefaultDisclosureText(type: DisclosureType): string {
    const defaults: Record<DisclosureType, string> = {
      [DisclosureType.FTC_AFFILIATE]:
        'This page contains affiliate links. We may earn a commission at no extra cost to you if you make a purchase through links on this page.',
      [DisclosureType.SPONSORED_CONTENT]:
        'This content is sponsored content paid for by the advertiser.',
      [DisclosureType.NATIVE_ADVERTISING]:
        'This is a paid advertisement. The content above is provided by the advertiser.',
      [DisclosureType.PAID_PARTNERSHIP]:
        'This page contains a paid partnership with {partnerName}.',
      [DisclosureType.MATERIAL_CONNECTION]:
        'We have a material connection with {partnerName} as described in our disclosure policy.'
    };

    return defaults[type] || 'This content contains advertising material.';
  }

  private getRegulationForType(type: DisclosureType): Regulation {
    const regulations: Record<DisclosureType, Regulation> = {
      [DisclosureType.FTC_AFFILIATE]: Regulation.FTC,
      [DisclosureType.SPONSORED_CONTENT]: Regulation.FTC,
      [DisclosureType.NATIVE_ADVERTISING]: Regulation.FTC,
      [DisclosureType.PAID_PARTNERSHIP]: Regulation.FTC,
      [DisclosureType.MATERIAL_CONNECTION]: Regulation.FTC
    };

    return regulations[type] || Regulation.FTC;
  }

  private interpolateContext(
    text: string,
    context?: Record<string, any>
  ): string {
    if (!context) return text;

    let interpolated = text;
    for (const [key, value] of Object.entries(context)) {
      interpolated = interpolated.replace(
        new RegExp(`\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    return interpolated;
  }

  private mapToDisclosureTemplate(row: any): DisclosureTemplate {
    return {
      id: row.id,
      type: row.type as DisclosureType,
      channel: row.channel,
      regulation: row.regulation as Regulation,
      text: row.text,
      isActive: row.is_active,
      version: row.version,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const disclosureService = new DisclosureService();
