import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config';
import { CloudEvent, CanonicalEvent, EventIngestionResult } from '../types';
import { validateEvent, validateBatch } from '../utils/validation';
import { emitAnalyticsEvent } from '../utils/logger';
import logger from '../utils/logger';

export class EventIngestionService {
  private deduplicationCache: Map<string, number> = new Map();
  private readonly DEDUP_CACHE_TTL_MS = 3600000;
  private readonly MAX_BATCH_SIZE = 1000;

  async ingestEvent(event: unknown): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const startTime = Date.now();
    
    const validation = validateEvent(event);
    if (!validation.valid || !validation.data) {
      logger.warn('Event validation failed', { errors: validation.errors });
      return { success: false, error: JSON.stringify(validation.errors) };
    }

    const cloudEvent = validation.data;
    
    if (await this.isDuplicate(cloudEvent.id)) {
      logger.info('Duplicate event detected', { eventId: cloudEvent.id });
      return { success: false, error: 'Duplicate event' };
    }

    try {
      const canonicalEvent = await this.storeEvent(cloudEvent, startTime);
      await this.processEventEnrichment(canonicalEvent);
      await this.updateRealTimeMetrics(canonicalEvent);
      
      this.markAsProcessed(cloudEvent.id);
      
      emitAnalyticsEvent('analytics.event_received', {
        eventId: cloudEvent.id,
        eventType: cloudEvent.type,
        tenantId: cloudEvent.tenantid,
        processingTimeMs: Date.now() - startTime,
      });

      logger.info('Event ingested successfully', { 
        eventId: cloudEvent.id, 
        eventType: cloudEvent.type,
        processingTimeMs: Date.now() - startTime,
      });

      return { success: true, eventId: canonicalEvent.id };
    } catch (error) {
      logger.error('Failed to ingest event', { error, eventId: cloudEvent.id });
      return { success: false, error: String(error) };
    }
  }

  async ingestBatch(events: unknown[]): Promise<EventIngestionResult> {
    const startTime = Date.now();
    const result: EventIngestionResult = {
      accepted: 0,
      rejected: 0,
      duplicates: 0,
      errors: [],
      processingTimeMs: 0,
    };

    if (events.length > this.MAX_BATCH_SIZE) {
      result.errors.push({ eventId: 'batch', error: `Batch size exceeds maximum of ${this.MAX_BATCH_SIZE}` });
      return { ...result, processingTimeMs: Date.now() - startTime };
    }

    const validation = validateBatch(events);
    
    for (const event of validation.accepted) {
      if (await this.isDuplicate(event.id)) {
        result.duplicates++;
        result.rejected++;
        result.errors.push({ eventId: event.id, error: 'Duplicate event' });
        continue;
      }

      try {
        const eventStartTime = Date.now();
        const canonicalEvent = await this.storeEvent(event, eventStartTime);
        await this.processEventEnrichment(canonicalEvent);
        await this.updateRealTimeMetrics(canonicalEvent);
        this.markAsProcessed(event.id);
        result.accepted++;
        
        emitAnalyticsEvent('analytics.event_received', {
          eventId: event.id,
          eventType: event.type,
          tenantId: event.tenantid,
          processingTimeMs: Date.now() - eventStartTime,
        });
      } catch (error) {
        result.rejected++;
        result.errors.push({ eventId: event.id, error: String(error) });
      }
    }

    for (const rejection of validation.rejected) {
      result.rejected++;
      const eventId = (rejection.event as CloudEvent)?.id || 'unknown';
      result.errors.push({ 
        eventId, 
        error: JSON.stringify(rejection.errors) 
      });
    }

    result.processingTimeMs = Date.now() - startTime;
    
    logger.info('Batch ingestion completed', {
      accepted: result.accepted,
      rejected: result.rejected,
      duplicates: result.duplicates,
      processingTimeMs: result.processingTimeMs,
    });

    return result;
  }

  private async isDuplicate(eventId: string): Promise<boolean> {
    if (this.deduplicationCache.has(eventId)) {
      return true;
    }

    try {
      const result = await pool.query(
        'SELECT id FROM canonical_events WHERE event_id = $1 LIMIT 1',
        [eventId]
      );
      if (result.rows.length > 0) {
        this.deduplicationCache.set(eventId, Date.now());
        return true;
      }
    } catch (error) {
      logger.error('Deduplication check failed', { error, eventId });
    }

    return false;
  }

  private markAsProcessed(eventId: string): void {
    this.deduplicationCache.set(eventId, Date.now());
  }

  private async storeEvent(cloudEvent: CloudEvent, startTime: number): Promise<CanonicalEvent> {
    const id = uuidv4();
    const timestamp = cloudEvent.time ? new Date(cloudEvent.time) : new Date();
    const processingTimeMs = Date.now() - startTime;

    const query = `
      INSERT INTO canonical_events (
        id, event_id, tenant_id, workspace_id, event_type, source,
        spec_version, event_type_schema, data, metadata, correlation_id,
        causation_id, timestamp, processing_time_ms, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
      )
      RETURNING *
    `;

    const values = [
      id,
      cloudEvent.id,
      cloudEvent.tenantid || uuidv4(),
      cloudEvent.workspaceid || uuidv4(),
      cloudEvent.type,
      cloudEvent.source,
      cloudEvent.specversion || '1.0',
      null,
      JSON.stringify(cloudEvent.data),
      JSON.stringify(cloudEvent.subject || {}),
      (cloudEvent as Record<string, unknown>).correlationId || null,
      (cloudEvent as Record<string, unknown>).causationId || null,
      timestamp,
      processingTimeMs,
    ];

    const result = await pool.query(query, values);
    return this.mapToCanonicalEvent(result.rows[0]);
  }

  private mapToCanonicalEvent(row: Record<string, unknown>): CanonicalEvent {
    return {
      id: row.id as string,
      eventId: row.event_id as string,
      tenantId: row.tenant_id as string,
      workspaceId: row.workspace_id as string,
      eventType: row.event_type as CanonicalEvent['eventType'],
      source: row.source as string,
      specVersion: row.spec_version as string,
      eventTypeSchema: row.event_type_schema as string | undefined,
      data: row.data as Record<string, unknown>,
      metadata: row.metadata as Record<string, unknown>,
      correlationId: row.correlation_id as string | undefined,
      causationId: row.causation_id as string | undefined,
      timestamp: new Date(row.timestamp as string),
      processingTimeMs: row.processing_time_ms as number | undefined,
      createdAt: new Date(row.created_at as string),
    };
  }

  private async processEventEnrichment(event: CanonicalEvent): Promise<void> {
    const enrichments: Record<string, unknown> = {};

    switch (event.eventType) {
      case 'lead.captured':
        enrichments.touchpointType = 'lead_capture';
        enrichments.touchpointId = (event.data as Record<string, unknown>).lead_id;
        break;
      case 'page.generated':
      case 'page.published':
        enrichments.touchpointType = 'page_view';
        enrichments.touchpointId = (event.data as Record<string, unknown>).page_id;
        break;
      case 'message.sent':
        enrichments.touchpointType = 'message';
        enrichments.touchpointId = (event.data as Record<string, unknown>).message_id;
        break;
      case 'affiliate_link.ingested':
        enrichments.touchpointType = 'affiliate_link';
        enrichments.touchpointId = (event.data as Record<string, unknown>).link_id;
        break;
      case 'offer.detected':
        enrichments.touchpointType = 'offer';
        enrichments.touchpointId = (event.data as Record<string, unknown>).offer_id;
        break;
      default:
        enrichments.touchpointType = event.eventType;
    }

    enrichments.channel = (event.data as Record<string, unknown>).channel || 'direct';
    enrichments.source = (event.data as Record<string, unknown>).source || event.source;
    enrichments.medium = (event.data as Record<string, unknown>).medium || null;
    enrichments.campaign = (event.data as Record<string, unknown>).campaign || null;

    if (enrichments.touchpointId) {
      await this.createTouchpoint(event, enrichments);
    }
  }

  private async createTouchpoint(event: CanonicalEvent, enrichments: Record<string, unknown>): Promise<void> {
    const visitorId = (event.data as Record<string, unknown>).visitor_id as string || 
                     (event.metadata as Record<string, unknown>).visitor_id as string ||
                     uuidv4();
    const sessionId = (event.data as Record<string, unknown>).session_id as string ||
                      (event.metadata as Record<string, unknown>).session_id as string ||
                      uuidv4();

    const query = `
      INSERT INTO attribution_touchpoints (
        id, tenant_id, workspace_id, visitor_id, session_id, touchpoint_type,
        touchpoint_id, touchpoint_data, channel, source, medium, campaign,
        first_interaction_at, last_interaction_at, interaction_count, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 1, NOW()
      )
      ON CONFLICT DO NOTHING
    `;

    const now = new Date();
    const values = [
      uuidv4(),
      event.tenantId,
      event.workspaceId,
      visitorId,
      sessionId,
      enrichments.touchpointType,
      enrichments.touchpointId,
      JSON.stringify(enrichments),
      enrichments.channel,
      enrichments.source,
      enrichments.medium,
      enrichments.campaign,
      now,
      now,
    ];

    try {
      await pool.query(query, values);
    } catch (error) {
      logger.error('Failed to create touchpoint', { error, eventId: event.id });
    }
  }

  private async updateRealTimeMetrics(event: CanonicalEvent): Promise<void> {
    const query = `
      INSERT INTO real_time_metrics (
        id, tenant_id, workspace_id, metric_name, metric_value, metric_type,
        dimensions, window_start, window_end, recorded_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `;

    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000);
    
    const metrics = [
      { name: `${event.eventType}.count`, value: 1, type: 'counter' },
      { name: 'events.total', value: 1, type: 'counter' },
    ];

    for (const metric of metrics) {
      const values = [
        uuidv4(),
        event.tenantId,
        event.workspaceId,
        metric.name,
        metric.value,
        metric.type,
        JSON.stringify({ event_type: event.eventType, source: event.source }),
        windowStart,
        now,
      ];

      try {
        await pool.query(query, values);
      } catch (error) {
        logger.error('Failed to update real-time metric', { error, metricName: metric.name });
      }
    }
  }

  async getEvents(
    tenantId: string,
    options: {
      workspaceId?: string;
      eventType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ events: CanonicalEvent[]; total: number }> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.workspaceId) {
      conditions.push(`workspace_id = $${paramIndex++}`);
      values.push(options.workspaceId);
    }
    if (options.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      values.push(options.eventType);
    }
    if (options.startDate) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(options.endDate);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM canonical_events WHERE ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(options.limit || 100);
    values.push(options.offset || 0);

    const result = await pool.query(
      `SELECT * FROM canonical_events WHERE ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );

    return {
      events: result.rows.map(row => this.mapToCanonicalEvent(row)),
      total,
    };
  }

  cleanupDeduplicationCache(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.deduplicationCache.entries()) {
      if (now - timestamp > this.DEDUP_CACHE_TTL_MS) {
        this.deduplicationCache.delete(key);
      }
    }
  }
}

export const eventIngestionService = new EventIngestionService();
setInterval(() => {
  eventIngestionService.cleanupDeduplicationCache();
}, 300000);
