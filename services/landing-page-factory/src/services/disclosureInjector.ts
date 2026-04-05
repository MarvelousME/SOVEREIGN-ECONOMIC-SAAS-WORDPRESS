import { v4 as uuidv4 } from 'uuid';
import {
  PageBlock,
  PageDisclosure,
  PageBlockType,
  DisclosureType,
  BrandTone,
} from '../types';
import { eventPublisher } from '../utils/event-publisher';
import { logger } from '../config/logger';

export class DisclosureInjectorService {
  private disclosureRules: Map<string, DisclosureRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.addRule({
      id: 'ftc-affiliate-default',
      type: DisclosureType.FTC_AFFILIATE,
      appliesTo: { all: true },
      content: this.getFTCDisclosureContent('en-US'),
      position: 'bottom',
      isRequired: true,
      jurisdictions: ['US'],
    });

    this.addRule({
      id: 'gdpr-privacy-default',
      type: DisclosureType.GDPR_PRIVACY,
      appliesTo: { all: true },
      content: this.getGDPRDisclosureContent('en-US'),
      position: 'bottom',
      isRequired: true,
      jurisdictions: ['EU', 'UK'],
    });

    this.addRule({
      id: 'cookie-consent-default',
      type: DisclosureType.COOKIE_CONSENT,
      appliesTo: { all: true },
      content: this.getCookieConsentContent('en-US'),
      position: 'bottom',
      isRequired: true,
      jurisdictions: ['EU', 'UK'],
    });

    logger.info('Initialized disclosure rules');
  }

  private addRule(rule: DisclosureRule): void {
    this.disclosureRules.set(rule.id, rule);
  }

  async injectDisclosures(
    pageId: string,
    tenantId: string,
    blocks: PageBlock[],
    options: {
      locale?: string;
      affiliateNetwork?: string;
      brandTone?: BrandTone;
      forceInject?: boolean;
    } = {}
  ): Promise<{ blocks: PageBlock[]; disclosures: PageDisclosure[] }> {
    const locale = options.locale || 'en-US';
    const disclosures: PageDisclosure[] = [];
    let updatedBlocks = [...blocks];

    const ftcDisclosure = this.createDisclosureBlock(
      pageId,
      DisclosureType.FTC_AFFILIATE,
      this.getFTCDisclosureContent(locale, options.affiliateNetwork),
      'bottom'
    );
    disclosures.push(ftcDisclosure);

    const gdprDisclosure = this.createDisclosureBlock(
      pageId,
      DisclosureType.GDPR_PRIVACY,
      this.getGDPRDisclosureContent(locale),
      'bottom'
    );
    disclosures.push(gdprDisclosure);

    const existingCookieIndex = updatedBlocks.findIndex(
      (b) => b.type === PageBlockType.COOKIE_CONSENT
    );
    if (existingCookieIndex === -1) {
      const cookieBlock = this.createCookieConsentBlock(
        pageId,
        this.getCookieConsentContent(locale)
      );
      updatedBlocks.push(cookieBlock);
    }

    const existingAffiliateIndex = updatedBlocks.findIndex(
      (b) => b.type === PageBlockType.AFFILIATE_DISCLOSURE
    );
    if (existingAffiliateIndex === -1) {
      const affiliateBlock = this.createAffiliateDisclosureBlock(
        pageId,
        this.getFTCDisclosureContent(locale, options.affiliateNetwork)
      );
      updatedBlocks.push(affiliateBlock);
    }

    for (const disclosure of disclosures) {
      await eventPublisher.publishDisclosureInjected({
        pageId,
        tenantId,
        disclosureType: disclosure.type,
        position: disclosure.position,
        jurisdictions: disclosure.jurisdictions,
      });
    }

    logger.info('Injected disclosures', {
      pageId,
      disclosureCount: disclosures.length,
    });

    return { blocks: updatedBlocks, disclosures };
  }

  private createDisclosureBlock(
    pageId: string,
    type: DisclosureType,
    content: string,
    position: 'top' | 'bottom' | 'inline'
  ): PageDisclosure {
    return {
      id: uuidv4(),
      pageId,
      type,
      content,
      position,
      isRequired: true,
      jurisdictions: this.getJurisdictionsForType(type),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private createCookieConsentBlock(pageId: string, content: string): PageBlock {
    return {
      id: uuidv4(),
      type: PageBlockType.COOKIE_CONSENT,
      order: 999,
      config: {
        width: 'full',
        backgroundColor: '#1F2937',
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        customClass: 'cookie-consent-banner',
      },
      content: {
        title: 'Cookie Notice',
        description: content,
        ctaText: 'Accept Cookies',
        ctaSecondaryText: 'Cookie Settings',
      },
    };
  }

  private createAffiliateDisclosureBlock(pageId: string, content: string): PageBlock {
    return {
      id: uuidv4(),
      type: PageBlockType.AFFILIATE_DISCLOSURE,
      order: 1000,
      config: {
        width: 'contained',
        backgroundColor: '#F9FAFB',
        padding: { top: 16, right: 24, bottom: 16, left: 24 },
        customClass: 'affiliate-disclosure',
      },
      content: {
        disclosureText: content,
        disclosureType: DisclosureType.FTC_AFFILIATE,
      },
    };
  }

  private getFTCDisclosureContent(locale: string, affiliateNetwork?: string): string {
    const networkText = affiliateNetwork
      ? ` through ${affiliateNetwork}`
      : '';

    const contentByLocale: Record<string, string> = {
      'en-US':
        `Disclosure: This page contains affiliate links${networkText}. If you click on a link and make a purchase or sign up, we may receive a commission at no additional cost to you. We only recommend products and services that we believe in.`,
      'en-GB':
        `Disclosure: This page contains affiliate links${networkText}. We may earn a commission if you make a purchase through these links, at no extra cost to you.`,
      'de-DE':
        `Offenlegung: Diese Seite enthält Affiliate-Links${networkText}. Wenn Sie auf einen Link klicken und einen Kauf tätigen, können wir eine Provision erhalten.`,
      'fr-FR':
        `Divulgation: Cette page contient des liens d'affiliation${networkText}. Nous pouvons recevoir une commission si vous effectuez un achat.`,
    };

    return contentByLocale[locale] || contentByLocale['en-US'];
  }

  private getGDPRDisclosureContent(locale: string): string {
    const contentByLocale: Record<string, string> = {
      'en-US':
        'Privacy Notice: We collect and process personal data in accordance with our Privacy Policy. This includes cookies and tracking technologies.',
      'en-GB':
        'We process your personal data in accordance with the UK GDPR. For more information, please see our Privacy Policy.',
      'de-DE':
        'Wir verarbeiten Ihre personenbezogenen Daten gemäß unserer Datenschutzerklärung und den geltenden Datenschutzgesetzen.',
      'fr-FR':
        'Nous traitons vos données personnelles conformément à notre politique de confidentialité et au RGPD.',
    };

    return contentByLocale[locale] || contentByLocale['en-US'];
  }

  private getCookieConsentContent(locale: string): string {
    const contentByLocale: Record<string, string> = {
      'en-US':
        'We use cookies to enhance your browsing experience and analyze site traffic. By clicking "Accept Cookies", you consent to our use of cookies.',
      'en-GB':
        'We use cookies to improve your experience and analyse site traffic. By clicking "Accept All", you agree to our use of cookies.',
      'de-DE':
        'Wir verwenden Cookies, um Ihre Browser-Erfahrung zu verbessern und den Website-Traffic zu analysieren. Mit einem Klick auf "Alle akzeptieren" stimmen Sie der Verwendung von Cookies zu.',
      'fr-FR':
        'Nous utilisons des cookies pour améliorer votre expérience de navigation et analyser le trafic du site. En cliquant sur "Accepter", vous acceptez notre utilisation des cookies.',
    };

    return contentByLocale[locale] || contentByLocale['en-US'];
  }

  private getJurisdictionsForType(type: DisclosureType): string[] {
    switch (type) {
      case DisclosureType.FTC_AFFILIATE:
        return ['US', 'CA'];
      case DisclosureType.GDPR_PRIVACY:
        return ['EU', 'UK', 'CH'];
      case DisclosureType.COOKIE_CONSENT:
        return ['EU', 'UK'];
      case DisclosureType.CHANNEL_SPECIFIC:
        return [];
      default:
        return [];
    }
  }

  async getApplicableDisclosures(
    pageId: string,
    tenantId: string,
    locale: string,
    affiliateNetwork?: string
  ): Promise<PageDisclosure[]> {
    const disclosures: PageDisclosure[] = [];

    disclosures.push(
      this.createDisclosureBlock(
        pageId,
        DisclosureType.FTC_AFFILIATE,
        this.getFTCDisclosureContent(locale, affiliateNetwork),
        'bottom'
      )
    );

    if (locale.startsWith('en') && !locale.startsWith('en-US')) {
      disclosures.push(
        this.createDisclosureBlock(
          pageId,
          DisclosureType.FTC_AFFILIATE,
          this.getFTCDisclosureContent('en-GB', affiliateNetwork),
          'bottom'
        )
      );
    }

    return disclosures;
  }

  validateDisclosures(disclosures: PageDisclosure[]): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const requiredTypes = [DisclosureType.FTC_AFFILIATE];
    const missing: string[] = [];
    const warnings: string[] = [];

    for (const type of requiredTypes) {
      if (!disclosures.some((d) => d.type === type)) {
        missing.push(type);
      }
    }

    for (const disclosure of disclosures) {
      if (disclosure.content.length < 10) {
        warnings.push(`Disclosure ${disclosure.type} has minimal content`);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }
}

interface DisclosureRule {
  id: string;
  type: DisclosureType;
  appliesTo: { all: boolean; channels?: string[] };
  content: string;
  position: 'top' | 'bottom' | 'inline';
  isRequired: boolean;
  jurisdictions: string[];
}
