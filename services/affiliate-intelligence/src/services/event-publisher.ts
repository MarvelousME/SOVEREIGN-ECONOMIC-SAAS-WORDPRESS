import { natsClient } from '../utils/nats-client';
import logger from '../utils/logger';
import {
  AffiliateLink,
  Merchant,
  Offer,
  FreshnessScore,
  UrlAnalysisResult
} from '../types';

export interface AffiliateEvent {
  eventType: string;
  timestamp: Date;
  data: any;
}

export interface AffiliateEvent {
  eventType: string;
  timestamp: Date;
  data: any;
}

export class EventPublisher {
  async publishLinkIngested(link: AffiliateLink): Promise<void> {
    const event: AffiliateEvent = {
      eventType: 'affiliate.link.ingested',
      timestamp: new Date(),
      data: {
        linkId: link.id,
        originalUrl: link.originalUrl,
        normalizedUrl: link.normalizedUrl,
        merchantId: link.merchantId,
        offerId: link.offerId,
        userId: link.userId,
        freshnessScore: link.freshnessScore,
      }
    };

    try {
      await natsClient.publish('affiliate.link.ingested', event);
      logger.info('Published affiliate.link.ingested event', { linkId: link.id });
    } catch (error) {
      logger.error('Failed to publish affiliate.link.ingested event', { error, linkId: link.id });
    }
  }

  async publishLinkNormalized(link: AffiliateLink, normalizedUrl: string): Promise<void> {
    const event: AffiliateEvent = {
      eventType: 'affiliate.link.normalized',
      timestamp: new Date(),
      data: {
        linkId: link.id,
        originalUrl: link.originalUrl,
        normalizedUrl,
        strippedParameters: link.strippedParameters,
        urlHash: link.urlHash,
      }
    };

    try {
      await natsClient.publish('affiliate.link.normalized', event);
      logger.info('Published affiliate.link.normalized event', { linkId: link.id });
    } catch (error) {
      logger.error('Failed to publish affiliate.link.normalized event', { error, linkId: link.id });
    }
  }

  async publishMerchantExtracted(merchant: Merchant, source: string): Promise<void> {
    const event: AffiliateEvent = {
      eventType: 'merchant.extracted',
      timestamp: new Date(),
      data: {
        merchantId: merchant.id,
        name: merchant.name,
        slug: merchant.slug,
        network: merchant.network,
        source,
      }
    };

    try {
      await natsClient.publish('merchant.extracted', event);
      logger.info('Published merchant.extracted event', { merchantId: merchant.id, name: merchant.name });
    } catch (error) {
      logger.error('Failed to publish merchant.extracted event', { error, merchantId: merchant.id });
    }
  }

  async publishOfferDetected(offer: Offer, source: string): Promise<void> {
    const event: AffiliateEvent = {
      eventType: 'offer.detected',
      timestamp: new Date(),
      data: {
        offerId: offer.id,
        merchantId: offer.merchantId,
        title: offer.title,
        offerType: offer.offerType,
        commissionRate: offer.commissionRate,
        discountValue: offer.discountValue,
        endDate: offer.endDate,
        source,
      }
    };

    try {
      await natsClient.publish('offer.detected', event);
      logger.info('Published offer.detected event', { offerId: offer.id, title: offer.title });
    } catch (error) {
      logger.error('Failed to publish offer.detected event', { error, offerId: offer.id });
    }
  }

  async publishOfferUpdated(offer: Offer, previousSnapshot?: any): Promise<void> {
    const event: AffiliateEvent = {
      eventType: 'offer.updated',
      timestamp: new Date(),
      data: {
        offerId: offer.id,
        merchantId: offer.merchantId,
        title: offer.title,
        changes: previousSnapshot ? this.computeChanges(offer, previousSnapshot) : {},
        previousSnapshot,
        currentOffer: offer,
      }
    };

    try {
      await natsClient.publish('offer.updated', event);
      logger.info('Published offer.updated event', { offerId: offer.id });
    } catch (error) {
      logger.error('Failed to publish offer.updated event', { error, offerId: offer.id });
    }
  }

  async publishFreshnessScored(entityType: string, entityId: string, score: FreshnessScore): Promise<void> {
    const event: AffiliateEvent = {
      eventType: 'affiliate.freshness.scored',
      timestamp: new Date(),
      data: {
        entityType,
        entityId,
        score: score.score,
        factors: score.factors,
        calculatedAt: score.calculatedAt,
        expiresAt: score.expiresAt,
      }
    };

    try {
      await natsClient.publish('affiliate.freshness.scored', event);
      logger.debug('Published affiliate.freshness.scored event', { entityType, entityId, score: score.score });
    } catch (error) {
      logger.error('Failed to publish affiliate.freshness.scored event', { error, entityType, entityId });
    }
  }

  async publishUrlAnalyzed(result: UrlAnalysisResult): Promise<void> {
    const event: AffiliateEvent = {
      eventType: 'affiliate.url.analyzed',
      timestamp: new Date(),
      data: {
        analysisId: result.id,
        urlHash: result.urlHash,
        parseSuccess: result.parseSuccess,
        merchantId: result.merchantId,
        productId: result.productId,
        offerId: result.offerId,
        isAffiliateUrl: result.isAffiliateUrl,
        confidenceScore: result.confidenceScore,
      }
    };

    try {
      await natsClient.publish('affiliate.url.analyzed', event);
      logger.info('Published affiliate.url.analyzed event', { analysisId: result.id });
    } catch (error) {
      logger.error('Failed to publish affiliate.url.analyzed event', { error, analysisId: result.id });
    }
  }

  private computeChanges(current: Offer, previous: any): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};

    if (previous.title !== current.title) {
      changes.title = { from: previous.title, to: current.title };
    }
    if (previous.discountValue !== current.discountValue) {
      changes.discountValue = { from: previous.discountValue, to: current.discountValue };
    }
    if (previous.commissionRate !== current.commissionRate) {
      changes.commissionRate = { from: previous.commissionRate, to: current.commissionRate };
    }
    if (previous.endDate !== current.endDate) {
      changes.endDate = { from: previous.endDate, to: current.endDate };
    }
    if (previous.status !== current.status) {
      changes.status = { from: previous.status, to: current.status };
    }

    return changes;
  }
}

export const eventPublisher = new EventPublisher();
