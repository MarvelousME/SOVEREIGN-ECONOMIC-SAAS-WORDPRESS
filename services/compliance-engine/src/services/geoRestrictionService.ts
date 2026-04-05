import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { eventService, ComplianceEvents } from './events.service';
import { config } from '../config';
import {
  GeoRestriction,
  GeoRestrictionType
} from '../types';

interface GeoCheckResult {
  isBlocked: boolean;
  isAllowed: boolean;
  restrictions: GeoRestriction[];
  requiresDisclosure: boolean;
  disclosureText?: string;
  metadata?: Record<string, any>;
}

export class GeoRestrictionService {
  private cache: Map<string, { data: GeoRestriction[]; expiry: Date }> = new Map();

  async checkGeoRestriction(params: {
    country?: string;
    state?: string;
    region?: string;
    contentType?: string;
  }): Promise<GeoCheckResult> {
    const restrictions = await this.getRestrictionsForLocation(
      params.country,
      params.state,
      params.region
    );

    const blocked = restrictions.filter(r => r.isBlocked);

    if (blocked.length > 0) {
      await eventService.publish(ComplianceEvents.GEO_RESTRICTION_TRIGGERED, {
        country: params.country,
        state: params.state,
        region: params.region,
        restrictions: blocked.map(r => r.id),
        timestamp: new Date()
      });

      const requiresDisclosure = blocked.some(r => r.requiresDisclosure);

      return {
        isBlocked: true,
        isAllowed: false,
        restrictions: blocked,
        requiresDisclosure,
        disclosureText: requiresDisclosure
          ? blocked.find(r => r.requiresDisclosure)?.disclosureText
          : undefined
      };
    }

    const requiresDisclosure = restrictions.some(r => r.requiresDisclosure);

    return {
      isBlocked: false,
      isAllowed: true,
      restrictions,
      requiresDisclosure,
      disclosureText: requiresDisclosure
        ? restrictions.find(r => r.requiresDisclosure)?.disclosureText
        : undefined
    };
  }

  async getRestrictionsForLocation(
    country?: string,
    state?: string,
    region?: string
  ): Promise<GeoRestriction[]> {
    if (country) {
      const cacheKey = `country:${country}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;
    }

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (country) {
      conditions.push(`(country = $${paramIndex++} OR country IS NULL)`);
      values.push(country);
    } else {
      conditions.push(`country IS NULL`);
    }

    if (state) {
      conditions.push(`(state = $${paramIndex++} OR state IS NULL)`);
      values.push(state);
    }

    if (region) {
      conditions.push(`(region = $${paramIndex++} OR region IS NULL)`);
      values.push(region);
    }

    const query = `
      SELECT * FROM compliance.geo_restrictions
      WHERE (${conditions.join(' AND ')})
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY
        CASE WHEN country IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN state IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN region IS NOT NULL THEN 0 ELSE 1 END
    `;

    const result = await db.query(query, values);
    const restrictions = result.rows.map(this.mapToGeoRestriction);

    if (country) {
      this.setCache(`country:${country}`, restrictions);
    }

    return restrictions;
  }

  async createRestriction(restriction: {
    type: GeoRestrictionType;
    country?: string;
    state?: string;
    region?: string;
    isBlocked: boolean;
    requiresDisclosure?: boolean;
    disclosureText?: string;
    metadata?: Record<string, any>;
  }): Promise<GeoRestriction> {
    const id = uuidv4();

    const query = `
      INSERT INTO compliance.geo_restrictions (
        id, type, country, state, region, is_blocked,
        requires_disclosure, disclosure_text, metadata,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10
      )
      RETURNING *
    `;

    const result = await db.query(query, [
      id,
      restriction.type,
      restriction.country || null,
      restriction.state || null,
      restriction.region || null,
      restriction.isBlocked,
      restriction.requiresDisclosure || false,
      restriction.disclosureText || null,
      JSON.stringify(restriction.metadata || {})
    ]);

    this.clearCache();

    logger.info('Geo restriction created', { id, country: restriction.country });

    return this.mapToGeoRestriction(result.rows[0]);
  }

  async updateRestriction(
    id: string,
    updates: Partial<{
      isBlocked: boolean;
      requiresDisclosure: boolean;
      disclosureText: string;
      metadata: Record<string, any>;
    }>
  ): Promise<GeoRestriction> {
    const now = new Date();
    const setClauses: string[] = ['updated_at = $2'];
    const values: any[] = [id, now];
    let paramIndex = 3;

    if (updates.isBlocked !== undefined) {
      setClauses.push(`is_blocked = $${paramIndex++}`);
      values.push(updates.isBlocked);
    }

    if (updates.requiresDisclosure !== undefined) {
      setClauses.push(`requires_disclosure = $${paramIndex++}`);
      values.push(updates.requiresDisclosure);
    }

    if (updates.disclosureText !== undefined) {
      setClauses.push(`disclosure_text = $${paramIndex++}`);
      values.push(updates.disclosureText);
    }

    if (updates.metadata !== undefined) {
      setClauses.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    const query = `
      UPDATE compliance.geo_restrictions
      SET ${setClauses.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Geo restriction not found');
    }

    this.clearCache();

    logger.info('Geo restriction updated', { id });

    return this.mapToGeoRestriction(result.rows[0]);
  }

  async deleteRestriction(id: string): Promise<boolean> {
    const query = `DELETE FROM compliance.geo_restrictions WHERE id = $1 RETURNING id`;
    const result = await db.query(query, [id]);

    if (result.rowCount && result.rowCount > 0) {
      this.clearCache();
      logger.info('Geo restriction deleted', { id });
      return true;
    }

    return false;
  }

  async listRestrictions(filters?: {
    type?: GeoRestrictionType;
    country?: string;
    isBlocked?: boolean;
  }): Promise<GeoRestriction[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }

    if (filters?.country) {
      conditions.push(`country = $${paramIndex++}`);
      values.push(filters.country);
    }

    if (filters?.isBlocked !== undefined) {
      conditions.push(`is_blocked = $${paramIndex++}`);
      values.push(filters.isBlocked);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const query = `
      SELECT * FROM compliance.geo_restrictions
      ${whereClause}
      ORDER BY country, state, region
    `;

    const result = await db.query(query, values);

    return result.rows.map(this.mapToGeoRestriction);
  }

  async getDataResidencyRules(country: string): Promise<{
    mustStayInCountry: boolean;
    allowedOutboundCountries?: string[];
    metadata?: Record<string, any>;
  }> {
    const query = `
      SELECT * FROM compliance.geo_restrictions
      WHERE country = $1
        AND type = 'data_residency'
        AND is_blocked = false
    `;

    const result = await db.query(query, [country]);

    if (result.rows.length === 0) {
      return { mustStayInCountry: false };
    }

    const restriction = this.mapToGeoRestriction(result.rows[0]);
    const metadata = restriction.metadata || {};

    return {
      mustStayInCountry: metadata.mustStayInCountry || false,
      allowedOutboundCountries: metadata.allowedOutboundCountries,
      metadata
    };
  }

  private getFromCache(key: string): GeoRestriction[] | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > new Date()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: GeoRestriction[]): void {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + config.compliance.geoRestrictionCacheMinutes);
    this.cache.set(key, { data, expiry });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private mapToGeoRestriction(row: any): GeoRestriction {
    return {
      id: row.id,
      type: row.type as GeoRestrictionType,
      country: row.country,
      state: row.state,
      region: row.region,
      isBlocked: row.is_blocked,
      requiresDisclosure: row.requires_disclosure,
      disclosureText: row.disclosure_text,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export const geoRestrictionService = new GeoRestrictionService();
