export enum BusinessTemplate {
  ECOMMERCE = 'ecommerce',
  SERVICE_MARKETPLACE = 'service_marketplace',
  LEAD_GENERATION = 'lead_generation',
  MEMBERSHIP_SITE = 'membership_site',
  COURSE_PLATFORM = 'course_platform',
  BOOKING_SCHEDULING = 'booking_scheduling',
  AFFILIATE_PROGRAM = 'affiliate_program',
}

export enum BusinessStatus {
  DRAFT = 'draft',
  CONFIGURING = 'configuring',
  DEPLOYING = 'deploying',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum PaymentProcessor {
  STRIPE = 'stripe',
  PAYFAST = 'payfast',
  PAYPAL = 'paypal',
}

export enum EmailProvider {
  SENDGRID = 'sendgrid',
  MAILCHIMP = 'mailchimp',
  CUSTOM = 'custom',
}

export enum PageType {
  LANDING = 'landing',
  LEAD_CAPTURE = 'lead_capture',
  PAYMENT = 'payment',
  THANK_YOU = 'thank_you',
  UPSELL = 'upsell',
  CHECKOUT = 'checkout',
}

export interface BrandingConfig {
  businessType: string;
  targetAudience: string;
  keywords: string[];
  industry?: string;
  tone?: 'professional' | 'casual' | 'playful' | 'luxurious' | 'minimalist';
}

export interface BrandingOutput {
  logo?: {
    url: string;
    prompt: string;
    variations: string[];
  };
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    accent?: string;
  };
  tagline: string;
  alternativeTaglines: string[];
  brandGuidelines: {
    voice: string;
    messaging: string[];
    doNots: string[];
  };
}

export interface PageBuilderComponent {
  id: string;
  type: 'header' | 'hero' | 'form' | 'cta' | 'footer' | 'features' | 'pricing' | 'testimonials' | 'gallery';
  config: Record<string, unknown>;
  styles?: Record<string, unknown>;
  content?: Record<string, unknown>;
}

export interface PageConfig {
  id: string;
  businessId: string;
  type: PageType;
  title: string;
  slug: string;
  components: PageBuilderComponent[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage?: string;
  };
  abTestVariant?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FunnelConfig {
  id: string;
  businessId: string;
  name: string;
  pages: string[]; // Page IDs
  emailSequences: EmailSequence[];
  conversionGoal: string;
  trackingPixels?: Record<string, string>;
}

export interface EmailSequence {
  id: string;
  name: string;
  trigger: 'signup' | 'purchase' | 'abandoned_cart' | 'custom';
  delay: number; // Minutes
  emails: EmailTemplate[];
}

export interface EmailTemplate {
  id: string;
  subject: string;
  body: string;
  delayAfterPrevious: number; // Minutes
}

export interface IntegrationConfig {
  payment?: {
    provider: PaymentProcessor;
    apiKey?: string;
    webhookSecret?: string;
    config: Record<string, unknown>;
  };
  email?: {
    provider: EmailProvider;
    apiKey?: string;
    config: Record<string, unknown>;
  };
  analytics?: {
    googleAnalyticsId?: string;
    facebookPixelId?: string;
    customTracking?: Record<string, string>;
  };
  crm?: {
    type: 'custom' | 'external';
    endpoint?: string;
    apiKey?: string;
  };
}

export interface DomainConfig {
  customDomain?: string;
  subdomain: string;
  sslEnabled: boolean;
  sslCertificate?: {
    issuer: string;
    expiresAt: Date;
  };
}

export interface Business {
  id: string;
  tenantId: string;
  userId: string;
  template: BusinessTemplate;
  name: string;
  description: string;
  status: BusinessStatus;
  branding?: BrandingOutput;
  domain: DomainConfig;
  integrations: IntegrationConfig;
  funnels: FunnelConfig[];
  pages: PageConfig[];
  revenue: {
    total: number;
    platformFee: number; // 5%
    lastUpdated: Date;
  };
  analytics: {
    visitors: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    period: 'day' | 'week' | 'month' | 'year';
  };
  features: {
    abTesting: boolean;
    advancedAnalytics: boolean;
    premiumTemplates: boolean;
    customIntegrations: boolean;
  };
  subscription?: {
    tier: 'free' | 'starter' | 'pro' | 'enterprise';
    price: number;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
}

export interface CreateBusinessRequest {
  template: BusinessTemplate;
  name: string;
  description: string;
  brandingConfig?: BrandingConfig;
  domain: {
    subdomain: string;
    customDomain?: string;
  };
}

export interface UpdateBusinessRequest {
  name?: string;
  description?: string;
  status?: BusinessStatus;
  branding?: Partial<BrandingOutput>;
  integrations?: Partial<IntegrationConfig>;
  features?: Partial<Business['features']>;
}

export interface BusinessMetrics {
  businessId: string;
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  metrics: {
    visitors: number;
    uniqueVisitors: number;
    pageViews: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    platformFee: number;
    topPages: Array<{
      path: string;
      views: number;
      conversions: number;
    }>;
    trafficSources: Array<{
      source: string;
      visitors: number;
      conversions: number;
    }>;
    devices: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
  };
}

export interface TemplateDefinition {
  id: BusinessTemplate;
  name: string;
  description: string;
  category: string;
  features: string[];
  defaultPages: Array<{
    type: PageType;
    title: string;
    slug: string;
    components: PageBuilderComponent[];
  }>;
  defaultFunnel: Omit<FunnelConfig, 'id' | 'businessId'>;
  pricing: {
    isFree: boolean;
    price?: number;
  };
  estimatedSetupTime: number; // Minutes
  preview?: string; // URL to preview
}
