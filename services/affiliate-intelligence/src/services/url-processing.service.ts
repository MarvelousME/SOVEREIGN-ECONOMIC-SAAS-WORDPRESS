import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import {
  UrlAnalysisResult,
  AffiliateLink,
  ParsedAffiliateUrl,
  NormalizedUrl,
  ProvenanceData,
} from '../types';
import { urlNormalizationService } from './url-normalization.service';
import { merchantService } from './merchant.service';
import { offerService } from './offer.service';
import { affiliateLinkService } from './affiliate-link.service';
import { eventPublisher } from './event-publisher';
import logger from '../utils/logger';

export class UrlProcessingService {
  async processIntake(rawUrl: string, userId?: string, metadata?: Record<string, any>): Promise<{
    link: AffiliateLink;
    analysis: UrlAnalysisResult;
  }> {
    const startTime = Date.now();
    const parsingErrors: string[] = [];
    let parseSuccess = false;
    let isAffiliateUrl = false;
    let confidenceScore = 0;

    let merchantId: string | null = null;
    let productId: string | null = null;
    let offerId: string | null = null;
    let merchantDetected: string | null = null;
    let productDetected: string | null = null;
    let offerDetected: string | null = null;
    let detectedParameters: Record<string, string> = {};

    try {
      const normalized: NormalizedUrl = urlNormalizationService.normalize(rawUrl);

      const urlHash = urlNormalizationService.hashUrl(normalized.cleanUrl);

      const existingLink = await affiliateLinkService.findByUrlHash(urlHash);
      if (existingLink) {
        logger.info('URL already processed', { urlHash, linkId: existingLink.id });
        const analysis = await this.createAnalysisResult({
          url: rawUrl,
          urlHash,
          parseSuccess: true,
          merchantDetected: existingLink.merchantId,
          merchantId: existingLink.merchantId,
          productDetected: existingLink.productId,
          productId: existingLink.productId,
          offerDetected: existingLink.offerId,
          offerId: existingLink.offerId,
          detectedParameters: normalized.strippedParams,
          cleanedUrl: normalized.cleanUrl,
          extractionConfidence: 1,
          parsingErrors: [],
          analysisDurationMs: Date.now() - startTime,
          isAffiliateUrl: true,
          confidenceScore: 1,
          recommendations: ['URL already in database'],
          metadata,
        });
        return { link: existingLink, analysis };
      }

      const parsed: ParsedAffiliateUrl = urlNormalizationService.parseAffiliateUrl(rawUrl);
      isAffiliateUrl = parsed.isAffiliate;
      confidenceScore = parsed.confidence;
      detectedParameters = { ...parsed.subIds };
      if (parsed.trackingId) {
        detectedParameters['tracking_id'] = parsed.trackingId;
      }

      if (parsed.merchant) {
        merchantDetected = parsed.merchant;
        try {
          let merchant = await merchantService.findBySlug(parsed.merchant);
          if (!merchant && parsed.merchantId) {
            merchant = await merchantService.findById(parsed.merchantId);
          }
          if (!merchant) {
            merchant = await merchantService.create({
              name: parsed.merchant.charAt(0).toUpperCase() + parsed.merchant.slice(1).replace(/-/g, ' '),
              slug: parsed.merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              network: parsed.network || undefined,
            });
          }
          merchantId = merchant.id;
        } catch (err) {
          parsingErrors.push(`Failed to process merchant: ${err}`);
        }
      }

      if (parsed.offer) {
        offerDetected = parsed.offer;
        if (merchantId) {
          try {
            let offer = await offerService.findByCode(merchantId, parsed.offer);
            if (!offer) {
              offer = await offerService.create({
                merchantId,
                offerCode: parsed.offer,
                title: `Offer: ${parsed.offer}`,
                offerType: 'coupon' as any,
              });
            }
            offerId = offer.id;
          } catch (err) {
            parsingErrors.push(`Failed to process offer: ${err}`);
          }
        }
      }

      parseSuccess = true;

      const provenance: ProvenanceData = {
        source: 'url_intake',
        detectedAt: new Date(),
        detector: 'url-processing-pipeline',
        confidence: confidenceScore,
        rawData: {
          network: parsed.network,
          pathSegments: normalized.pathSegments,
        },
      };

      const link = await affiliateLinkService.create({
        originalUrl: rawUrl,
        normalizedUrl: normalized.cleanUrl,
        urlHash,
        merchantId: merchantId ?? undefined,
        productId: productId ?? undefined,
        offerId: offerId ?? undefined,
        userId: userId ?? undefined,
        trackingParameters: detectedParameters,
        strippedParameters: normalized.strippedParams,
        provenance,
        metadata,
      });

      const recommendations: string[] = [];
      if (!merchantId) recommendations.push('Consider adding merchant information');
      if (!offerId) recommendations.push('No offer detected - consider checking for available offers');
      if (confidenceScore < 0.5) recommendations.push('Low confidence - verify URL manually');

      const analysis = await this.createAnalysisResult({
        url: rawUrl,
        urlHash,
        parseSuccess,
        merchantDetected,
        merchantId,
        productDetected,
        productId,
        offerDetected,
        offerId,
        detectedParameters,
        cleanedUrl: normalized.cleanUrl,
        extractionConfidence: confidenceScore,
        parsingErrors,
        analysisDurationMs: Date.now() - startTime,
        isAffiliateUrl,
        confidenceScore,
        recommendations,
        metadata,
      });

      return { link, analysis };
    } catch (error) {
      logger.error('URL processing failed', { url: rawUrl, error });
      parsingErrors.push(`Processing error: ${error}`);

      const urlHash = urlNormalizationService.hashUrl(rawUrl);
      await this.createAnalysisResult({
        url: rawUrl,
        urlHash,
        parseSuccess: false,
        merchantDetected: null,
        merchantId: null,
        productDetected: null,
        productId: null,
        offerDetected: null,
        offerId: null,
        detectedParameters: {},
        cleanedUrl: null,
        extractionConfidence: 0,
        parsingErrors,
        analysisDurationMs: Date.now() - startTime,
        isAffiliateUrl: false,
        confidenceScore: 0,
        recommendations: ['Processing failed - please check URL format'],
        metadata,
      });

      throw new Error(`URL processing failed: ${error}`);
    }
  }

  async analyzeDeep(rawUrl: string): Promise<UrlAnalysisResult> {
    const startTime = Date.now();

    try {
      const normalized = urlNormalizationService.normalize(rawUrl);
      const parsed = urlNormalizationService.parseAffiliateUrl(rawUrl);
      const urlHash = urlNormalizationService.hashUrl(normalized.cleanUrl);

      let merchantId: string | null = null;
      let productId: string | null = null;
      let offerId: string | null = null;

      if (parsed.merchantId) {
        const merchant = await merchantService.findById(parsed.merchantId);
        if (merchant) merchantId = merchant.id;
      }

      if (parsed.productId) {
        const product = await db.queryOne('SELECT id FROM products WHERE id = $1', [parsed.productId]);
        if (product) productId = product.id;
      }

      if (parsed.offer && merchantId) {
        const offer = await offerService.findByCode(merchantId, parsed.offer);
        if (offer) offerId = offer.id;
      }

      const existingAnalysis = await db.queryOne<any>(
        'SELECT * FROM url_analysis_results WHERE url_hash = $1 ORDER BY created_at DESC LIMIT 1',
        [urlHash]
      );

      if (existingAnalysis) {
        return this.mapRowToAnalysis(existingAnalysis);
      }

      const recommendations: string[] = [];
      if (parsed.isAffiliate) {
        recommendations.push('Valid affiliate URL detected');
        if (parsed.network) {
          recommendations.push(`Network: ${parsed.network}`);
        }
      } else {
        recommendations.push('No affiliate markers found');
      }

      return this.createAnalysisResult({
        url: rawUrl,
        urlHash,
        parseSuccess: true,
        merchantDetected: parsed.merchant,
        merchantId,
        productDetected: parsed.product,
        productId,
        offerDetected: parsed.offer,
        offerId,
        detectedParameters: parsed.subIds,
        cleanedUrl: normalized.cleanUrl,
        extractionConfidence: parsed.confidence,
        parsingErrors: [],
        analysisDurationMs: Date.now() - startTime,
        isAffiliateUrl: parsed.isAffiliate,
        confidenceScore: parsed.confidence,
        recommendations,
        metadata: {
          network: parsed.network,
          trackingId: parsed.trackingId,
          campaign: parsed.campaign,
        },
      });
    } catch (error) {
      logger.error('Deep analysis failed', { url: rawUrl, error });
      const urlHash = urlNormalizationService.hashUrl(rawUrl);
      return this.createAnalysisResult({
        url: rawUrl,
        urlHash,
        parseSuccess: false,
        merchantDetected: null,
        merchantId: null,
        productDetected: null,
        productId: null,
        offerDetected: null,
        offerId: null,
        detectedParameters: {},
        cleanedUrl: null,
        extractionConfidence: 0,
        parsingErrors: [`Analysis failed: ${error}`],
        analysisDurationMs: Date.now() - startTime,
        isAffiliateUrl: false,
        confidenceScore: 0,
        recommendations: ['Analysis failed'],
        metadata: {},
      });
    }
  }

  private async createAnalysisResult(data: {
    url: string;
    urlHash: string;
    parseSuccess: boolean;
    merchantDetected: string | null;
    merchantId: string | null;
    productDetected: string | null;
    productId: string | null;
    offerDetected: string | null;
    offerId: string | null;
    detectedParameters: Record<string, string>;
    cleanedUrl: string | null;
    extractionConfidence: number;
    parsingErrors: string[];
    analysisDurationMs: number;
    isAffiliateUrl: boolean;
    confidenceScore: number;
    recommendations: string[];
    metadata?: Record<string, any>;
  }): Promise<UrlAnalysisResult> {
    const id = uuidv4();

    await db.query(
      `INSERT INTO url_analysis_results (
        id, url, url_hash, parse_success, merchant_detected, merchant_id,
        product_detected, product_id, offer_detected, offer_id, detected_parameters,
        cleaned_url, extraction_confidence, parsing_errors, analysis_duration_ms,
        is_affiliate_url, confidence_score, recommendations, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        id,
        data.url,
        data.urlHash,
        data.parseSuccess,
        data.merchantDetected,
        data.merchantId,
        data.productDetected,
        data.productId,
        data.offerDetected,
        data.offerId,
        JSON.stringify(data.detectedParameters),
        data.cleanedUrl,
        data.extractionConfidence,
        JSON.stringify(data.parsingErrors),
        data.analysisDurationMs,
        data.isAffiliateUrl,
        data.confidenceScore,
        JSON.stringify(data.recommendations),
        JSON.stringify(data.metadata || {}),
      ]
    );

    const row = await db.queryOne<any>('SELECT * FROM url_analysis_results WHERE id = $1', [id]);
    const result = this.mapRowToAnalysis(row);

    await eventPublisher.publishUrlAnalyzed(result);

    return result;
  }

  private mapRowToAnalysis(row: any): UrlAnalysisResult {
    return {
      id: row.id,
      url: row.url,
      urlHash: row.url_hash,
      parseSuccess: row.parse_success,
      merchantDetected: row.merchant_detected,
      merchantId: row.merchant_id,
      productDetected: row.product_detected,
      productId: row.product_id,
      offerDetected: row.offer_detected,
      offerId: row.offer_id,
      detectedParameters: row.detected_parameters ? JSON.parse(row.detected_parameters) : {},
      cleanedUrl: row.cleaned_url,
      extractionConfidence: row.extraction_confidence ? parseFloat(row.extraction_confidence) : 0,
      parsingErrors: row.parsing_errors ? JSON.parse(row.parsing_errors) : [],
      analysisDurationMs: row.analysis_duration_ms,
      isAffiliateUrl: row.is_affiliate_url,
      confidenceScore: row.confidence_score ? parseFloat(row.confidence_score) : 0,
      recommendations: row.recommendations ? JSON.parse(row.recommendations) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
    };
  }
}

export const urlProcessingService = new UrlProcessingService();
