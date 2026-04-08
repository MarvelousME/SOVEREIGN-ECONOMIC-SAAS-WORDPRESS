export enum PageBlockType {
  HERO = 'hero',
  FEATURES = 'features',
  BENEFITS = 'benefits',
  PRICING = 'pricing',
  TESTIMONIALS = 'testimonials',
  CTA = 'cta',
  FAQ = 'faq',
  FOOTER = 'footer',
  COOKIE_CONSENT = 'cookie_consent',
  AFFILIATE_DISCLOSURE = 'affiliate_disclosure',
  LEAD_FORM = 'lead_form',
  VIDEO_EMBED = 'video_embed',
  COMPARISON_TABLE = 'comparison_table',
}

export enum PageStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PublishStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
}

export enum DisclosureType {
  FTC_AFFILIATE = 'ftc_affiliate',
  GDPR_PRIVACY = 'gdpr_privacy',
  COOKIE_CONSENT = 'cookie_consent',
  CHANNEL_SPECIFIC = 'channel_specific',
}

export enum PublishTargetType {
  CDN = 'cdn',
  EMBEDDED = 'embedded',
  SUBDOMAIN = 'subdomain',
  CUSTOM_DOMAIN = 'custom_domain',
}

export interface PageBlock {
  id: string;
  type: PageBlockType;
  order: number;
  config: BlockConfig;
  content: BlockContent;
  styles?: Record<string, unknown>;
}

export interface BlockConfig {
  width?: 'full' | 'contained' | 'narrow';
  backgroundColor?: string;
  padding?: { top: number; right: number; bottom: number; left: number };
  customClass?: string;
}

export interface BlockContent {
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaSecondaryText?: string;
  ctaSecondaryUrl?: string;
  items?: BlockItem[];
  testimonials?: Testimonial[];
  pricingTiers?: PricingTier[];
  faqs?: FAQ[];
  formFields?: FormField[];
  tableRows?: TableRow[];
  tableHeaders?: string[];
  disclosureText?: string;
  disclosureType?: DisclosureType;
  footerLinks?: FooterLink[];
  logo?: string;
  copyright?: string;
  brandColor?: string;
  brandName?: string;
}

export interface BlockItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
  image?: string;
  link?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role?: string;
  company?: string;
  avatar?: string;
  quote: string;
  rating?: number;
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
  isPopular?: boolean;
  badge?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

export interface TableRow {
  id: string;
  cells: string[];
}

export interface FooterLink {
  id: string;
  text: string;
  url: string;
  isExternal?: boolean;
}

export interface PageVersion {
  id: string;
  pageId: string;
  version: number;
  blocks: PageBlock[];
  metadata: PageMetadata;
  createdAt: Date;
  createdBy: string;
  changeDescription?: string;
  rollbackToken?: string;
}

export interface PageMetadata {
  title: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
  schemaMarkup?: Record<string, unknown>;
}

export interface PageTemplate {
  id: string;
  tenantId?: string;
  createdBy?: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string;
  blocks: PageBlock[];
  defaultMetadata: PageMetadata;
  variables: TemplateVariable[];
  isPublic: boolean;
  isAbTestable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum TemplateCategory {
  LEAD_GEN = 'lead_generation',
  SALES = 'sales',
  WEBINAR = 'webinar',
  ECOMMERCE = 'ecommerce',
  AFFILIATE = 'affiliate',
  REVIEW = 'review',
  COMPARISON = 'comparison',
  TEMPLATE = 'template',
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'image';
  defaultValue?: string;
  description?: string;
  required?: boolean;
}

export interface PageDisclosure {
  id: string;
  pageId: string;
  type: DisclosureType;
  content: string;
  position: 'top' | 'bottom' | 'inline';
  isRequired: boolean;
  jurisdictions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishTarget {
  id: string;
  pageId: string;
  type: PublishTargetType;
  url?: string;
  domain?: string;
  subdomain?: string;
  cdnDistributionId?: string;
  cdnUrl?: string;
  embedCode?: string;
  status: PublishStatus;
  publishedAt?: Date;
  unpublishedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface LandingPage {
  id: string;
  tenantId: string;
  userId: string;
  businessId?: string;
  templateId?: string;
  name: string;
  slug: string;
  description?: string;
  blocks: PageBlock[];
  metadata: PageMetadata;
  status: PageStatus;
  reviewStatus?: ReviewStatus;
  reviewNotes?: string;
  reviewReviewedBy?: string;
  reviewReviewedAt?: Date;
  publishTargets: PublishTarget[];
  abTestVariant?: string;
  affiliateUrl?: string;
  affiliateNetwork?: string;
  brandTone: BrandTone;
  locale: string;
  version: number;
  currentVersionId?: string;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum BrandTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  PLAYFUL = 'playful',
  LUXURIOUS = 'luxurious',
  MINIMALIST = 'minimalist',
  AUTHORITY = 'authority',
}

export interface CreatePageRequest {
  name: string;
  slug: string;
  description?: string;
  businessId?: string;
  templateId?: string;
  affiliateUrl?: string;
  affiliateNetwork?: string;
  brandTone?: BrandTone;
  locale?: string;
}

export interface UpdatePageRequest {
  name?: string;
  slug?: string;
  description?: string;
  blocks?: PageBlock[];
  metadata?: Partial<PageMetadata>;
  brandTone?: BrandTone;
  locale?: string;
}

export interface GeneratePageRequest {
  affiliateUrl: string;
  name: string;
  slug: string;
  description?: string;
  businessId?: string;
  templateId?: string;
  affiliateNetwork?: string;
  brandTone?: BrandTone;
  locale?: string;
  includeDisclosures?: boolean;
  forceRegenerate?: boolean;
}

export interface PublishPageRequest {
  targetType?: PublishTargetType;
  domain?: string;
  subdomain?: string;
  customDomain?: string;
}

export interface RollbackRequest {
  versionId?: string;
  rollbackToken?: string;
  reason?: string;
}

export interface CreateTemplateRequest {
  tenantId?: string;
  createdBy?: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail?: string;
  blocks: PageBlock[];
  defaultMetadata: PageMetadata;
  variables?: TemplateVariable[];
  isPublic?: boolean;
  isAbTestable?: boolean;
}

export interface PageListQuery {
  page?: number;
  limit?: number;
  status?: PageStatus;
  businessId?: string;
  search?: string;
  scope?: 'own' | 'workspace';
  userId?: string;
}

export type CampaignStatus =
  | 'draft'
  | 'ready'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'archived';

export interface CampaignOrchestration {
  id: string;
  tenantId: string;
  businessId?: string;
  pageId?: string;
  name: string;
  description?: string;
  objective?: string;
  budget?: number;
  status: CampaignStatus;
  startsAt?: Date;
  endsAt?: Date;
  metadata: Record<string, unknown>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignStateEvent {
  id: string;
  campaignId: string;
  tenantId: string;
  fromStatus: CampaignStatus;
  toStatus: CampaignStatus;
  reason?: string;
  metadata: Record<string, unknown>;
  changedBy?: string;
  createdAt: Date;
}

export type CampaignNextAction =
  | 'link_social_posts'
  | 'schedule_posts'
  | 'resume_execution'
  | 'investigate_failures'
  | 'archive_campaign'
  | 'monitor_progress';

export interface CampaignExecutionSummary {
  campaignId: string;
  status: CampaignStatus;
  socialPostCounts: {
    total: number;
    queued: number;
    scheduled: number;
    publishing: number;
    published: number;
    failed: number;
    deadLetter: number;
    cancelled: number;
  };
  progressPercent: number;
  hasFailures: boolean;
  lastFailureReason?: string;
  lastStatusChangeAt?: Date;
  nextAction: CampaignNextAction;
}

export interface CampaignReportKpis {
  totalPosts: number;
  publishedPosts: number;
  failedPosts: number;
  successRate: number;
  failureRate: number;
  publishThroughputPerDay: number;
}

export interface CampaignReportRow {
  campaignId: string;
  campaignName: string;
  campaignStatus: CampaignStatus;
  ownerUserId?: string;
  updatedAt: Date;
  kpis: CampaignReportKpis;
}

export interface CampaignReportSummary {
  dateFrom: Date;
  dateTo: Date;
  daysInRange: number;
  campaignsMatched: number;
  kpis: CampaignReportKpis;
}

export interface CampaignReportResult {
  summary: CampaignReportSummary;
  rows: CampaignReportRow[];
  total: number;
}

export interface TenantBrandingConfig {
  tenantBrandingDomain?: string;
  tenantBrandingSubdomain?: string;
}

export interface DeploymentReadinessConfig {
  regionTag?: string;
  multiRegionReady?: boolean;
  whiteLabelReady?: boolean;
  tenantBranding?: TenantBrandingConfig;
}

export type AgentChainStageType = 'research' | 'strategy' | 'compliance';
export type AgentChainStageStatus = 'success' | 'failed';

export interface AgentChainResearchOutput {
  audienceInsights: string[];
  competitorSignals: string[];
}

export interface AgentChainStrategyOutput {
  messagingPillars: string[];
  channelPlan: string[];
}

export interface AgentChainComplianceOutput {
  requiredDisclosures: string[];
  policyChecks: string[];
}

export type AgentChainStageOutput =
  | AgentChainResearchOutput
  | AgentChainStrategyOutput
  | AgentChainComplianceOutput;

export interface AgentChainStageResult {
  stage: AgentChainStageType;
  status: AgentChainStageStatus;
  output: AgentChainStageOutput;
  startedAt: string;
  completedAt: string;
}

export interface CampaignAgentChainRun {
  runId: string;
  campaignId: string;
  tenantId: string;
  input: {
    goal: string;
    channels: string[];
    locale?: string;
  };
  stages: AgentChainStageResult[];
  createdBy: string;
  createdAt: string;
}

export interface PageVersionListQuery {
  page?: number;
  limit?: number;
}

export interface PageDiff {
  added: PageBlock[];
  removed: PageBlock[];
  modified: Array<{
    blockId: string;
    before: Partial<BlockContent>;
    after: Partial<BlockContent>;
  }>;
  metadataChanges: Array<{
    field: string;
    before: unknown;
    after: unknown;
  }>;
}

export interface ABTestConfig {
  enabled: boolean;
  variantA: string;
  variantB: string;
  trafficSplit: number;
  goalConversion: string;
}

export interface AIContext {
  affiliateUrl: string;
  affiliateNetwork?: string;
  businessContext?: {
    name: string;
    industry?: string;
    targetAudience?: string;
  };
  brandTone: BrandTone;
  locale: string;
}

export interface GenerationResult {
  blocks: PageBlock[];
  metadata: PageMetadata;
  disclosures: PageDisclosure[];
  version: number;
  warnings?: string[];
}
