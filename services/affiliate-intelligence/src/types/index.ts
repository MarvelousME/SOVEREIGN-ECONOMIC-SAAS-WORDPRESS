export enum LinkStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CONFLICT = 'conflict',
  INVALID = 'invalid',
  PENDING = 'pending',
}

export enum OfferType {
  COUPON = 'coupon',
  DEAL = 'deal',
  CASHBACK = 'cashback',
  DISCOUNT = 'discount',
  BUNDLE = 'bundle',
  FREE_SHIPPING = 'free_shipping',
  AUTO_APPLY = 'auto_apply',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  BUY_X_GET_Y = 'buy_x_get_y',
  FREE_SHIPPING = 'free_shipping',
  NO_MINIMUM = 'no_minimum',
}

export enum CommissionType {
  CPS = 'cps',
  CPL = 'cpl',
  CPA = 'cpa',
  REV_SHARE = 'rev_share',
  HYBRID = 'hybrid',
}

export enum EntityType {
  LINK = 'link',
  MERCHANT = 'merchant',
  OFFER = 'offer',
  PRODUCT = 'product',
}

export interface AffiliateLink {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  merchantId: string | null;
  productId: string | null;
  offerId: string | null;
  userId: string | null;
  status: LinkStatus;
  trackingParameters: Record<string, string>;
  strippedParameters: Record<string, string>;
  urlHash: string;
  clickCount: number;
  lastClickedAt: Date | null;
  firstSeenAt: Date;
  lastUpdatedAt: Date;
  freshnessScore: number | null;
  provenance: ProvenanceData;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProvenanceData {
  source: string;
  detectedAt: Date;
  detector: string;
  confidence: number;
  rawData?: Record<string, any>;
}

export interface Merchant {
  id: string;
  name: string;
  slug: string;
  network: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  categories: string[];
  commissionRules: CommissionRule[];
  averageCommission: number | null;
  commissionType: CommissionType | null;
  payoutThreshold: number | null;
  payoutFrequency: string | null;
  cookieDuration: number | null;
  isVerified: boolean;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommissionRule {
  offerType?: string;
  category?: string;
  commissionRate?: number;
  commissionAmount?: number;
  conditions?: Record<string, any>;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  imageUrl: string | null;
  productUrl: string | null;
  originalPrice: number | null;
  currentPrice: number | null;
  salePrice: number | null;
  currency: string;
  inStock: boolean;
  stockQuantity: number | null;
  specifications: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Offer {
  id: string;
  merchantId: string;
  offerCode: string | null;
  title: string;
  description: string | null;
  offerType: OfferType;
  discountType: DiscountType | null;
  discountValue: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  minimumPurchase: number | null;
  maximumDiscount: number | null;
  currency: string;
  startDate: Date | null;
  endDate: Date | null;
  isExclusive: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  usageCount: number;
  successRate: number | null;
  lastVerifiedAt: Date | null;
  status: string;
  categories: string[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferSnapshot {
  id: string;
  offerId: string;
  version: number;
  title: string;
  description: string | null;
  discountType: DiscountType | null;
  discountValue: number | null;
  commissionRate: number | null;
  commissionAmount: number | null;
  minimumPurchase: number | null;
  maximumDiscount: number | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string | null;
  priceAtSnapshot: number | null;
  commissionAtSnapshot: number | null;
  snapshotReason: SnapshotReason;
  metadata: Record<string, any>;
  createdAt: Date;
}

export enum SnapshotReason {
  CREATED = 'created',
  UPDATED = 'updated',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  RECHECKED = 'rechecked',
}

export interface UrlAnalysisResult {
  id: string;
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
  analysisDurationMs: number | null;
  isAffiliateUrl: boolean;
  confidenceScore: number;
  recommendations: string[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface FreshnessScore {
  id: string;
  entityType: EntityType;
  entityId: string;
  score: number;
  factors: FreshnessFactor[];
  breakdown: FreshnessBreakdown | null;
  calculatedAt: Date;
  expiresAt: Date;
  metadata: Record<string, any>;
}

export interface FreshnessFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
}

export interface FreshnessBreakdown {
  recency: number;
  accuracy: number;
  completeness: number;
  activity: number;
}

export interface NormalizedUrl {
  cleanUrl: string;
  baseUrl: string;
  pathSegments: string[];
  queryParams: Record<string, string>;
  fragment: string | null;
  strippedParams: Record<string, string>;
}

export interface ParsedAffiliateUrl {
  isAffiliate: boolean;
  network: string | null;
  merchant: string | null;
  merchantId: string | null;
  product: string | null;
  productId: string | null;
  offer: string | null;
  offerId: string | null;
  campaign: string | null;
  trackingId: string | null;
  subIds: Record<string, string>;
  confidence: number;
}

export interface AffiliateOpportunity {
  linkId: string;
  merchantId: string;
  merchantName: string;
  offerId: string | null;
  offerTitle: string | null;
  commissionRate: number;
  commissionAmount: number | null;
  freshnessScore: number;
  merchantCommission: number;
  offerSuccessRate: number | null;
  totalScore: number;
  reasons: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface IntakeRequest {
  url: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AnalyzeRequest {
  url: string;
  deepAnalysis?: boolean;
}
