import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import {
  PageBlock,
  PageBlockType,
  PageMetadata,
  AIContext,
  GenerationResult,
  BrandTone,
  BlockContent,
  BlockItem,
  Testimonial,
  PricingTier,
  FAQ,
} from '../types';
import { logger } from '../config/logger';

export class PageGeneratorService {
  private openai: OpenAI;

  constructor(openaiApiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  async generatePage(context: AIContext): Promise<GenerationResult> {
    const { affiliateUrl, brandTone, locale, affiliateNetwork, businessContext } = context;

    logger.info('Generating landing page', { affiliateUrl, brandTone, locale });

    const blocks: PageBlock[] = [];
    const warnings: string[] = [];

    try {
      const offerData = await this.fetchAffiliateOfferData(affiliateUrl);
      const brandGuidelines = this.getBrandGuidelines(brandTone);

      const heroBlock = await this.generateHeroBlock(offerData, brandGuidelines, locale);
      blocks.push(heroBlock);

      const featuresBlock = await this.generateFeaturesBlock(offerData, brandGuidelines);
      blocks.push(featuresBlock);

      const benefitsBlock = await this.generateBenefitsBlock(offerData, brandGuidelines);
      blocks.push(benefitsBlock);

      const testimonialsBlock = await this.generateTestimonialsBlock(offerData, brandGuidelines);
      blocks.push(testimonialsBlock);

      const pricingBlock = await this.generatePricingBlock(offerData, brandGuidelines);
      blocks.push(pricingBlock);

      const ctaBlock = await this.generateCTABlock(offerData, brandGuidelines);
      blocks.push(ctaBlock);

      const faqBlock = await this.generateFAQBlock(offerData, brandGuidelines);
      blocks.push(faqBlock);

      const footerBlock = this.generateFooterBlock();
      blocks.push(footerBlock);

      const metadata = this.generateMetadata(offerData);

      warnings.push(...offerData.warnings);

      return {
        blocks,
        metadata,
        disclosures: [],
        version: 1,
        warnings,
      };
    } catch (error) {
      logger.error('Failed to generate page', { error, affiliateUrl });
      throw error;
    }
  }

  private async fetchAffiliateOfferData(affiliateUrl: string): Promise<AffiliateOfferData> {
    const systemPrompt = `You are an affiliate marketing expert. Analyze the provided affiliate offer URL and extract key information for creating a high-converting landing page. Return a JSON object with the following structure:
{
  "productName": "Name of the product/service",
  "headline": "Compelling headline for the landing page",
  "subheadline": "Supporting subheadline",
  "description": "Detailed product description",
  "keyFeatures": ["feature 1", "feature 2", "feature 3"],
  "benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "targetAudience": "Who this product is for",
  "painPoints": ["problem the product solves"],
  "socialProof": ["testimonial quotes or trust indicators"],
  "pricing": { "amount": "price if known", "currency": "USD" },
  "urgency": "Any urgency elements",
  "guarantee": "Any guarantee offered",
  "warnings": ["any product warnings or concerns"]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this affiliate offer: ${affiliateUrl}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const data = JSON.parse(content);
      return {
        productName: data.productName || 'Product',
        headline: data.headline || '',
        subheadline: data.subheadline || '',
        description: data.description || '',
        keyFeatures: data.keyFeatures || [],
        benefits: data.benefits || [],
        targetAudience: data.targetAudience || '',
        painPoints: data.painPoints || [],
        socialProof: data.socialProof || [],
        pricing: data.pricing || { amount: '', currency: 'USD' },
        urgency: data.urgency || '',
        guarantee: data.guarantee || '',
        warnings: data.warnings || [],
      };
    } catch (error) {
      logger.warn('OpenAI analysis failed, using fallback', { error });
      return this.getFallbackOfferData(affiliateUrl);
    }
  }

  private getFallbackOfferData(affiliateUrl: string): AffiliateOfferData {
    const urlObj = new URL(affiliateUrl);
    const domain = urlObj.hostname.replace('www.', '');

    return {
      productName: 'Featured Product',
      headline: `Discover ${domain} - Your Path to Success`,
      subheadline: 'Transform your life with this amazing opportunity',
      description: `Learn more about ${domain} and how it can help you achieve your goals. This comprehensive solution provides everything you need to get started today.`,
      keyFeatures: [
        'Easy to get started',
        'Comprehensive solution',
        'Proven results',
        'Money-back guarantee',
      ],
      benefits: [
        'Save time and money',
        'Achieve your goals faster',
        'Get expert support',
        'Join thousands of satisfied customers',
      ],
      targetAudience: 'Anyone looking to improve their situation',
      painPoints: [
        'Looking for a better solution',
        'Tired of ineffective methods',
        'Want results that last',
      ],
      socialProof: [
        '"This changed my life!" - Satisfied Customer',
        '"Highly recommended" - Industry Expert',
      ],
      pricing: { amount: '$47', currency: 'USD' },
      urgency: 'Limited time offer',
      guarantee: '30-day money-back guarantee',
      warnings: [],
    };
  }

  private getBrandGuidelines(tone: BrandTone): BrandGuidelines {
    const guidelines: Record<BrandTone, BrandGuidelines> = {
      [BrandTone.PROFESSIONAL]: {
        ctaText: 'Get Started',
        ctaSecondaryText: 'Learn More',
        urgencyLanguage: 'Start your journey today',
        formalityLevel: 'formal',
      },
      [BrandTone.CASUAL]: {
        ctaText: 'Check This Out',
        ctaSecondaryText: 'See Details',
        urgencyLanguage: "Don't miss out",
        formalityLevel: 'informal',
      },
      [BrandTone.PLAYFUL]: {
        ctaText: 'Join the Fun!',
        ctaSecondaryText: 'Learn More',
        urgencyLanguage: "You're missing out!",
        formalityLevel: 'casual',
      },
      [BrandTone.LUXURIOUS]: {
        ctaText: 'Discover Now',
        ctaSecondaryText: 'View Collection',
        urgencyLanguage: 'Exclusive opportunity',
        formalityLevel: 'elegant',
      },
      [BrandTone.MINIMALIST]: {
        ctaText: 'Get Started',
        ctaSecondaryText: 'Learn More',
        urgencyLanguage: 'Available now',
        formalityLevel: 'minimal',
      },
      [BrandTone.AUTHORITY]: {
        ctaText: 'Claim Your Spot',
        ctaSecondaryText: 'Read More',
        urgencyLanguage: 'Limited availability',
        formalityLevel: 'authoritative',
      },
    };

    return guidelines[tone] || guidelines[BrandTone.PROFESSIONAL];
  }

  private async generateHeroBlock(
    offerData: AffiliateOfferData,
    brandGuidelines: BrandGuidelines,
    locale: string
  ): Promise<PageBlock> {
    const content: BlockContent = {
      title: offerData.headline,
      subtitle: offerData.subheadline,
      description: offerData.description,
      ctaText: brandGuidelines.ctaText,
      ctaUrl: '{{AFFILIATE_LINK}}',
      ctaSecondaryText: brandGuidelines.ctaSecondaryText,
      ctaSecondaryUrl: '{{LEARN_MORE_LINK}}',
      brandColor: '#4F46E5',
      brandName: offerData.productName,
    };

    return {
      id: uuidv4(),
      type: PageBlockType.HERO,
      order: 0,
      config: {
        width: 'full',
        backgroundColor: '#ffffff',
        padding: { top: 80, right: 24, bottom: 80, left: 24 },
      },
      content,
    };
  }

  private async generateFeaturesBlock(
    offerData: AffiliateOfferData,
    brandGuidelines: BrandGuidelines
  ): Promise<PageBlock> {
    const items: BlockItem[] = offerData.keyFeatures.map((feature, index) => ({
      id: uuidv4(),
      title: feature,
      description: `Discover the power of ${feature.toLowerCase()} and how it can transform your experience.`,
      icon: this.getIconForFeature(index),
    }));

    const content: BlockContent = {
      title: `Everything You Need to ${offerData.productName.split(' ')[0]}`,
      subtitle: 'Powerful features designed for results',
      items,
    };

    return {
      id: uuidv4(),
      type: PageBlockType.FEATURES,
      order: 1,
      config: {
        width: 'contained',
        padding: { top: 60, right: 24, bottom: 60, left: 24 },
      },
      content,
    };
  }

  private getIconForFeature(index: number): string {
    const icons = ['star', 'shield', 'rocket', 'chart', 'users', 'cog'];
    return icons[index % icons.length];
  }

  private async generateBenefitsBlock(
    offerData: AffiliateOfferData,
    brandGuidelines: BrandGuidelines
  ): Promise<PageBlock> {
    const items: BlockItem[] = offerData.benefits.map((benefit) => ({
      id: uuidv4(),
      title: benefit,
      description: `Experience the advantage of ${benefit.toLowerCase()} with our proven solution.`,
    }));

    const content: BlockContent = {
      title: 'Why Choose This Solution?',
      subtitle: 'Real benefits, real results',
      items,
    };

    return {
      id: uuidv4(),
      type: PageBlockType.BENEFITS,
      order: 2,
      config: {
        width: 'contained',
        backgroundColor: '#F9FAFB',
        padding: { top: 60, right: 24, bottom: 60, left: 24 },
      },
      content,
    };
  }

  private async generateTestimonialsBlock(
    offerData: AffiliateOfferData,
    brandGuidelines: BrandGuidelines
  ): Promise<PageBlock> {
    const testimonials: Testimonial[] = offerData.socialProof.map((quote, index) => ({
      id: uuidv4(),
      name: this.getFakeName(index),
      role: 'Verified Buyer',
      company: '',
      quote: quote.replace(/^"|"$/g, ''),
      rating: 5,
    }));

    const content: BlockContent = {
      title: 'What Our Customers Say',
      subtitle: 'Join thousands of satisfied customers',
      testimonials,
    };

    return {
      id: uuidv4(),
      type: PageBlockType.TESTIMONIALS,
      order: 3,
      config: {
        width: 'contained',
        padding: { top: 60, right: 24, bottom: 60, left: 24 },
      },
      content,
    };
  }

  private getFakeName(index: number): string {
    const names = ['Sarah M.', 'John D.', 'Mike R.', 'Lisa K.', 'David W.'];
    return names[index % names.length];
  }

  private async generatePricingBlock(
    offerData: AffiliateOfferData,
    brandGuidelines: BrandGuidelines
  ): Promise<PageBlock> {
    const pricingTiers: PricingTier[] = [
      {
        id: uuidv4(),
        name: 'Best Value',
        price: offerData.pricing.amount || '$47',
        period: 'one-time',
        description: 'Everything you need to get started',
        features: offerData.keyFeatures.slice(0, 4),
        ctaText: brandGuidelines.ctaText,
        ctaUrl: '{{AFFILIATE_LINK}}',
        isPopular: true,
        badge: 'Most Popular',
      },
    ];

    const content: BlockContent = {
      title: 'Simple, Transparent Pricing',
      subtitle: offerData.guarantee || '30-day money-back guarantee',
      pricingTiers,
    };

    return {
      id: uuidv4(),
      type: PageBlockType.PRICING,
      order: 4,
      config: {
        width: 'contained',
        backgroundColor: '#ffffff',
        padding: { top: 60, right: 24, bottom: 60, left: 24 },
      },
      content,
    };
  }

  private async generateCTABlock(
    offerData: AffiliateOfferData,
    brandGuidelines: BrandGuidelines
  ): Promise<PageBlock> {
    const content: BlockContent = {
      title: offerData.urgency || brandGuidelines.urgencyLanguage,
      subtitle: "Don't wait - your transformation starts now",
      description: offerData.description.substring(0, 200) + '...',
      ctaText: brandGuidelines.ctaText,
      ctaUrl: '{{AFFILIATE_LINK}}',
      brandColor: '#4F46E5',
    };

    return {
      id: uuidv4(),
      type: PageBlockType.CTA,
      order: 5,
      config: {
        width: 'full',
        backgroundColor: '#4F46E5',
        padding: { top: 80, right: 24, bottom: 80, left: 24 },
      },
      content,
    };
  }

  private async generateFAQBlock(
    offerData: AffiliateOfferData,
    brandGuidelines: BrandGuidelines
  ): Promise<PageBlock> {
    const faqs: FAQ[] = [
      {
        id: uuidv4(),
        question: 'Is this right for me?',
        answer: offerData.targetAudience
          ? `This solution is perfect for ${offerData.targetAudience.toLowerCase()}.`
          : "If you're looking for a proven solution to achieve your goals, this is for you.",
      },
      {
        id: uuidv4(),
        question: 'What if it does not work?',
        answer: offerData.guarantee || "We offer a 30-day money-back guarantee. If you're not satisfied, simply contact us for a full refund.",
      },
      {
        id: uuidv4(),
        question: 'How quickly will I see results?',
        answer: 'Results vary by individual, but many customers report seeing changes within the first few weeks of consistent use.',
      },
      {
        id: uuidv4(),
        question: 'Is my information secure?',
        answer: 'Yes! We take privacy seriously and use industry-standard encryption to protect your data. Your information is never sold or shared.',
      },
    ];

    const content: BlockContent = {
      title: 'Frequently Asked Questions',
      subtitle: 'Got questions? We have answers.',
      faqs,
    };

    return {
      id: uuidv4(),
      type: PageBlockType.FAQ,
      order: 6,
      config: {
        width: 'contained',
        backgroundColor: '#F9FAFB',
        padding: { top: 60, right: 24, bottom: 60, left: 24 },
      },
      content,
    };
  }

  private generateFooterBlock(): PageBlock {
    const content: BlockContent = {
      brandName: '{{BRAND_NAME}}',
      copyright: `© ${new Date().getFullYear()} {{BRAND_NAME}}. All rights reserved.`,
      footerLinks: [
        { id: uuidv4(), text: 'Privacy Policy', url: '/privacy' },
        { id: uuidv4(), text: 'Terms of Service', url: '/terms' },
        { id: uuidv4(), text: 'Contact Us', url: '/contact' },
      ],
    };

    return {
      id: uuidv4(),
      type: PageBlockType.FOOTER,
      order: 7,
      config: {
        width: 'full',
        backgroundColor: '#1F2937',
        padding: { top: 40, right: 24, bottom: 40, left: 24 },
      },
      content,
    };
  }

  private generateMetadata(offerData: AffiliateOfferData): PageMetadata {
    return {
      title: offerData.headline,
      metaTitle: offerData.headline,
      metaDescription: offerData.description.substring(0, 160),
      keywords: [
        ...offerData.keyFeatures.map((f) => f.toLowerCase()),
        offerData.targetAudience.toLowerCase(),
      ],
    };
  }
}

interface AffiliateOfferData {
  productName: string;
  headline: string;
  subheadline: string;
  description: string;
  keyFeatures: string[];
  benefits: string[];
  targetAudience: string;
  painPoints: string[];
  socialProof: string[];
  pricing: { amount: string; currency: string };
  urgency: string;
  guarantee: string;
  warnings: string[];
}

interface BrandGuidelines {
  ctaText: string;
  ctaSecondaryText: string;
  urgencyLanguage: string;
  formalityLevel: string;
}
