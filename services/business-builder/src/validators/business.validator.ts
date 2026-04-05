import { z } from 'zod';
import { BusinessTemplate, BusinessStatus, PaymentProcessor, EmailProvider, PageType } from '../types';

export const brandingConfigSchema = z.object({
  businessType: z.string().min(3).max(100),
  targetAudience: z.string().min(3).max(200),
  keywords: z.array(z.string()).min(1).max(10),
  industry: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'playful', 'luxurious', 'minimalist']).optional(),
});

export const createBusinessSchema = z.object({
  template: z.nativeEnum(BusinessTemplate),
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  brandingConfig: brandingConfigSchema.optional(),
  domain: z.object({
    subdomain: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
    customDomain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/).optional(),
  }),
});

export const updateBusinessSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(500).optional(),
  status: z.nativeEnum(BusinessStatus).optional(),
  branding: z.object({
    colorScheme: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
      background: z.string(),
      text: z.string(),
    }).optional(),
    fonts: z.object({
      heading: z.string(),
      body: z.string(),
      accent: z.string().optional(),
    }).optional(),
    tagline: z.string().optional(),
  }).optional(),
  integrations: z.object({
    payment: z.object({
      provider: z.nativeEnum(PaymentProcessor),
      apiKey: z.string().optional(),
      webhookSecret: z.string().optional(),
      config: z.record(z.unknown()),
    }).optional(),
    email: z.object({
      provider: z.nativeEnum(EmailProvider),
      apiKey: z.string().optional(),
      config: z.record(z.unknown()),
    }).optional(),
  }).optional(),
  features: z.object({
    abTesting: z.boolean().optional(),
    advancedAnalytics: z.boolean().optional(),
    premiumTemplates: z.boolean().optional(),
    customIntegrations: z.boolean().optional(),
  }).optional(),
});

export const pageComponentSchema = z.object({
  id: z.string(),
  type: z.enum(['header', 'hero', 'form', 'cta', 'footer', 'features', 'pricing', 'testimonials', 'gallery']),
  config: z.record(z.unknown()),
  styles: z.record(z.unknown()).optional(),
  content: z.record(z.unknown()).optional(),
});

export const createPageSchema = z.object({
  businessId: z.string().uuid(),
  type: z.nativeEnum(PageType),
  title: z.string().min(3).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  components: z.array(pageComponentSchema),
  seo: z.object({
    metaTitle: z.string().min(10).max(60),
    metaDescription: z.string().min(50).max(160),
    keywords: z.array(z.string()).max(10),
    ogImage: z.string().url().optional(),
  }),
  abTestVariant: z.string().optional(),
});

export const deployBusinessSchema = z.object({
  enableSsl: z.boolean().default(true),
  customDomain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/).optional(),
  notifyEmail: z.string().email().optional(),
});

export const analyticsQuerySchema = z.object({
  period: z.enum(['day', 'week', 'month', 'year']).default('week'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
export type BrandingConfigInput = z.infer<typeof brandingConfigSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type DeployBusinessInput = z.infer<typeof deployBusinessSchema>;
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
