import { createHash } from 'crypto';
import { logger } from '../config/logger';
import { eventPublisher } from '../utils/event-publisher';

export type RewardEventType = 'social_post_published' | 'campaign_completed' | 'campaign_failed';

export interface RewardEventContext {
  tenantId: string;
  campaignId?: string;
  socialPostId?: string;
  pageId?: string;
  provider?: string;
  status?: string;
}

export interface UbiRewardPayload {
  [key: string]: unknown;
  eventType: RewardEventType;
  eventId: string;
  dedupeKey: string;
  timestamp: string;
  tenantId: string;
  campaignId?: string;
  socialPostId?: string;
  pageId?: string;
  provider?: string;
  status?: string;
  metadata: {
    source: 'landing-page-factory';
    dedupeKey: string;
  };
}

export function buildRewardDedupeKey(eventType: RewardEventType, context: RewardEventContext): string {
  const parts = [
    eventType,
    context.tenantId,
    context.campaignId || '',
    context.socialPostId || '',
    context.pageId || '',
    context.provider || '',
    context.status || '',
  ];
  return createHash('sha256').update(parts.join('|')).digest('hex');
}

export function buildUbiRewardPayload(
  eventType: RewardEventType,
  context: RewardEventContext,
  now = new Date()
): UbiRewardPayload {
  const dedupeKey = buildRewardDedupeKey(eventType, context);
  return {
    eventType,
    eventId: `reward:${eventType}:${dedupeKey.slice(0, 24)}`,
    dedupeKey,
    timestamp: now.toISOString(),
    tenantId: context.tenantId,
    campaignId: context.campaignId,
    socialPostId: context.socialPostId,
    pageId: context.pageId,
    provider: context.provider,
    status: context.status,
    metadata: {
      source: 'landing-page-factory',
      dedupeKey,
    },
  };
}

export class UbiRewardsService {
  async emitRewardEvent(eventType: RewardEventType, context: RewardEventContext): Promise<void> {
    const payload = buildUbiRewardPayload(eventType, context);
    const endpoint = process.env.UBI_REWARDS_ENDPOINT_URL?.trim();

    if (endpoint) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Idempotency-Key': payload.dedupeKey,
          'X-Event-Id': payload.eventId,
        };
        const token = process.env.UBI_REWARDS_API_TOKEN?.trim();
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          return;
        }

        logger.warn('UBI rewards endpoint returned non-OK response', {
          endpoint,
          status: res.status,
          eventType,
          dedupeKey: payload.dedupeKey,
        });
      } catch (error) {
        logger.warn('UBI rewards endpoint call failed', {
          endpoint,
          eventType,
          dedupeKey: payload.dedupeKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    try {
      await eventPublisher.publishUbiRewardEvent(payload);
    } catch (error) {
      logger.warn('UBI rewards fallback event publish failed', {
        eventType,
        dedupeKey: payload.dedupeKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

