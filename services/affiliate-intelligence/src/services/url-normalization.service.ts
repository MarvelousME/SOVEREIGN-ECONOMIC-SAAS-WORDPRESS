import { createHash } from 'crypto';
import URL from 'url-parse';
import { NormalizedUrl, ParsedAffiliateUrl } from '../types';
import logger from '../utils/logger';

const TRACKING_PARAMETERS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'referer', 'referrer', 'source', 'src', 'affiliate', 'aff_id',
  'partner', 'campaign', 'c_id', 'click_id', 'clk_id', 'tracking_id',
  'aff_ref', 'ref_id', 'affiliate_id', 'associate_id', 'aff_click',
  'a_aid', 'a_bid', 'a_zid', 'a_xid', 'cjaffid', 'cjcid', 'cjpid',
  'shareasale', 'saa', 'sae', ' affiliate', 'tag', 'irgwc', 'linkid',
  'mc_cid', 'mc_eid', 'fbclid', 'gclid', 'dclid', 'msclkid', 'twclid',
  'igshid', 's_kwcid', 'sc_campaign', 'sc_content', 'sc_medium', 'sc_outcome', 'sc_geo', 'sc_country',
];

const NETWORK_PATTERNS: Record<string, { domain: string; paramMapping: Record<string, string> }> = {
  'cj_affiliate': {
    domain: 'cj.com',
    paramMapping: {
      'affid': 'affiliate_id',
      'cjevent': 'cj_event',
    }
  },
  'shareasale': {
    domain: 'shareasale.com',
    paramMapping: {
      'affiliate': 'affiliate_id',
      'merchantId': 'merchant_id',
      'transtype': 'transaction_type',
    }
  },
  'amazon_associates': {
    domain: 'amazon.',
    paramMapping: {
      'tag': 'associate_tag',
      'ref': 'ref_tag',
    }
  },
  'awin': {
    domain: 'awin1.com',
    paramMapping: {
      'ref': 'affiliate_ref',
      'clickref': 'click_ref',
    }
  },
  'impact': {
    domain: 'impact.com',
    paramMapping: {
      'campaign': 'campaign_id',
    }
  },
  'rackspace': {
    domain: 'rackspace.com',
    paramMapping: {},
  },
};

export class UrlNormalizationService {
  normalize(rawUrl: string): NormalizedUrl {
    try {
      const parsed = new URL(rawUrl, true);
      const queryParams = parsed.query || {};
      const strippedParams: Record<string, string> = {};
      const cleanQueryParams: Record<string, string> = {};

      for (const [key, value] of Object.entries(queryParams)) {
        const lowerKey = key.toLowerCase();
        const isTracking = TRACKING_PARAMETERS.some(
          tp => lowerKey === tp || lowerKey.includes(tp)
        );

        if (isTracking && value) {
          strippedParams[key] = String(value);
        } else if (value !== undefined && value !== null && value !== '') {
          cleanQueryParams[key] = String(value);
        }
      }

      const cleanUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}${this.buildQueryString(cleanQueryParams)}${parsed.hash || ''}`;

      const pathSegments = parsed.pathname
        .split('/')
        .filter(seg => seg.length > 0);

      return {
        cleanUrl,
        baseUrl: `${parsed.protocol}//${parsed.host}`,
        pathSegments,
        queryParams: cleanQueryParams,
        fragment: parsed.hash || null,
        strippedParams,
      };
    } catch (error) {
      logger.error('Failed to normalize URL', { url: rawUrl, error });
      throw new Error(`URL normalization failed: ${error}`);
    }
  }

  hashUrl(url: string): string {
    return createHash('sha256').update(url.toLowerCase().trim()).digest('hex');
  }

  parseAffiliateUrl(rawUrl: string): ParsedAffiliateUrl {
    const result: ParsedAffiliateUrl = {
      isAffiliate: false,
      network: null,
      merchant: null,
      merchantId: null,
      product: null,
      productId: null,
      offer: null,
      offerId: null,
      campaign: null,
      trackingId: null,
      subIds: {},
      confidence: 0,
    };

    try {
      const parsed = new URL(rawUrl, true);
      const hostname = parsed.hostname.toLowerCase();
      const queryParams = parsed.query || {};

      for (const [networkName, networkInfo] of Object.entries(NETWORK_PATTERNS)) {
        if (hostname.includes(networkInfo.domain)) {
          result.network = networkName;
          result.isAffiliate = true;
          result.confidence = 0.7;
          break;
        }
      }

      if (!result.network) {
        for (const [networkName, networkInfo] of Object.entries(NETWORK_PATTERNS)) {
          for (const [paramKey, _mappedKey] of Object.entries(networkInfo.paramMapping)) {
            if (queryParams[paramKey]) {
              result.network = networkName;
              result.isAffiliate = true;
              result.confidence = Math.max(result.confidence, 0.5);
              break;
            }
          }
          if (result.network) break;
        }
      }

      if (queryParams.affiliate || queryParams.aff || queryParams.aff_id) {
        result.trackingId = String(queryParams.affiliate || queryParams.aff || queryParams.aff_id);
        result.isAffiliate = true;
        result.confidence = Math.max(result.confidence, 0.6);
      }

      if (queryParams.merchant || queryParams.merchantId || queryParams.merch_id) {
        result.merchantId = String(queryParams.merchant || queryParams.merchantId || queryParams.merch_id);
      }

      if (queryParams.product || queryParams.productId || queryParams.pid) {
        result.productId = String(queryParams.product || queryParams.productId || queryParams.pid);
      }

      if (queryParams.offer || queryParams.offerId || queryParams.code || queryParams.promo) {
        result.offer = String(queryParams.offer || queryParams.offerId || queryParams.code || queryParams.promo);
      }

      if (queryParams.campaign || queryParams.campaignId || queryParams.c_id) {
        result.campaign = String(queryParams.campaign || queryParams.campaignId || queryParams.c_id);
      }

      const subIdParams = ['sub_id', 'subid', 'sub_id1', 'sub_id2', 'sub_id3', 'sid', 'aff_sub', 'aff_sub1', 'aff_sub2'];
      for (const param of subIdParams) {
        if (queryParams[param]) {
          result.subIds[param] = String(queryParams[param]);
        }
      }

      const pathParts = parsed.pathname.split('/').filter(p => p.length > 0);
      if (pathParts.length > 0) {
        const potentialMerchant = pathParts[0].toLowerCase();
        if (!result.merchant) {
          result.merchant = potentialMerchant;
          result.confidence = Math.max(result.confidence, 0.4);
        }
      }

      if (result.isAffiliate && result.confidence >= 0.5) {
        logger.debug('Parsed affiliate URL', { url: rawUrl, result });
      }

      return result;
    } catch (error) {
      logger.error('Failed to parse affiliate URL', { url: rawUrl, error });
      return result;
    }
  }

  private buildQueryString(params: Record<string, string>): string {
    const keys = Object.keys(params);
    if (keys.length === 0) return '';
    return '?' + keys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  }
}

export const urlNormalizationService = new UrlNormalizationService();
