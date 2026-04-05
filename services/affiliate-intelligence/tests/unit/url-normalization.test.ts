import { UrlNormalizationService } from '../../src/services/url-normalization.service';

describe('UrlNormalizationService', () => {
  let service: UrlNormalizationService;

  beforeEach(() => {
    service = new UrlNormalizationService();
  });

  describe('normalize', () => {
    it('should normalize a URL with tracking parameters', () => {
      const url = 'https://example.com/product?id=123&utm_source=test&utm_medium=affiliate&ref=abc';
      const result = service.normalize(url);

      expect(result.cleanUrl).toBe('https://example.com/product?id=123');
      expect(result.strippedParams).toHaveProperty('utm_source', 'test');
      expect(result.strippedParams).toHaveProperty('utm_medium', 'affiliate');
      expect(result.strippedParams).toHaveProperty('ref', 'abc');
    });

    it('should preserve non-tracking query parameters', () => {
      const url = 'https://example.com/product?id=123&sort=price&color=blue';
      const result = service.normalize(url);

      expect(result.cleanUrl).toBe('https://example.com/product?id=123&sort=price&color=blue');
      expect(result.queryParams).toHaveProperty('id', '123');
      expect(result.queryParams).toHaveProperty('sort', 'price');
      expect(result.queryParams).toHaveProperty('color', 'blue');
    });

    it('should extract path segments', () => {
      const url = 'https://example.com/shop/electronics/laptops';
      const result = service.normalize(url);

      expect(result.pathSegments).toEqual(['shop', 'electronics', 'laptops']);
      expect(result.baseUrl).toBe('https://example.com');
    });

    it('should handle URLs without query parameters', () => {
      const url = 'https://example.com/product/123';
      const result = service.normalize(url);

      expect(result.cleanUrl).toBe('https://example.com/product/123');
      expect(Object.keys(result.queryParams)).toHaveLength(0);
      expect(Object.keys(result.strippedParams)).toHaveLength(0);
    });

    it('should handle fragment identifiers', () => {
      const url = 'https://example.com/product#section';
      const result = service.normalize(url);

      expect(result.fragment).toBe('#section');
    });
  });

  describe('hashUrl', () => {
    it('should generate consistent hash for same URL', () => {
      const url = 'https://example.com/product?id=123';
      const hash1 = service.hashUrl(url);
      const hash2 = service.hashUrl(url);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different URLs', () => {
      const url1 = 'https://example.com/product?id=123';
      const url2 = 'https://example.com/product?id=456';

      const hash1 = service.hashUrl(url1);
      const hash2 = service.hashUrl(url2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate same hash regardless of case', () => {
      const url1 = 'https://Example.com/Product';
      const url2 = 'https://example.com/product';

      const hash1 = service.hashUrl(url1);
      const hash2 = service.hashUrl(url2);

      expect(hash1).toBe(hash2);
    });
  });

  describe('parseAffiliateUrl', () => {
    it('should detect CJ Affiliate URLs', () => {
      const url = 'https://www.cj.com/track?affid=12345&cjevent=67890';
      const result = service.parseAffiliateUrl(url);

      expect(result.isAffiliate).toBe(true);
      expect(result.network).toBe('cj_affiliate');
    });

    it('should detect Amazon Associates URLs', () => {
      const url = 'https://www.amazon.com/dp/product?tag=myassociatetag-20';
      const result = service.parseAffiliateUrl(url);

      expect(result.isAffiliate).toBe(true);
      expect(result.network).toBe('amazon_associates');
    });

    it('should detect ShareASale URLs', () => {
      const url = 'https://www.shareasale.com/track.cgi?affiliate=12345&merchantID=67890';
      const result = service.parseAffiliateUrl(url);

      expect(result.isAffiliate).toBe(true);
      expect(result.network).toBe('shareasale');
    });

    it('should extract merchant from URL path', () => {
      const url = 'https://example.com/nike/product-123?aff_id=12345';
      const result = service.parseAffiliateUrl(url);

      expect(result.merchant).toBe('nike');
    });

    it('should extract offer code from URL', () => {
      const url = 'https://example.com/product?code=SUMMER20&aff_id=12345';
      const result = service.parseAffiliateUrl(url);

      expect(result.offer).toBe('SUMMER20');
    });

    it('should extract sub IDs', () => {
      const url = 'https://example.com/product?aff_id=123&sub_id=456&sub_id2=789';
      const result = service.parseAffiliateUrl(url);

      expect(result.subIds).toHaveProperty('sub_id', '456');
      expect(result.subIds).toHaveProperty('sub_id2', '789');
    });

    it('should handle non-affiliate URLs with basic params', () => {
      const url = 'https://example.com/product?id=123';
      const result = service.parseAffiliateUrl(url);

      expect(result.isAffiliate).toBe(false);
    });
  });
});
