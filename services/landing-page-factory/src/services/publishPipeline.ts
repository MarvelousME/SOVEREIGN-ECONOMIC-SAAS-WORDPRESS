import { Pool } from 'pg';
import { LandingPageModel, PublishTargetModel } from '../models/landing-page.model';
import { PublishTarget, PublishTargetType, PageBlock } from '../types';
import { config } from '../config';
import { logger } from '../config/logger';
import { eventPublisher } from '../utils/event-publisher';

export class PublishPipelineService {
  private pageModel: LandingPageModel;
  private targetModel: PublishTargetModel;

  constructor(db: Pool) {
    this.pageModel = new LandingPageModel(db);
    this.targetModel = new PublishTargetModel(db);
  }

  async deployToCDN(
    tenantId: string,
    pageId: string,
    blocks: PageBlock[]
  ): Promise<{ distributionId: string; cdnUrl: string }> {
    const page = await this.pageModel.findById(tenantId, pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const distributionId = `dist-${Date.now()}-${pageId.substring(0, 8)}`;
    const cdnUrl = `${config.cdnBaseUrl}/pages/${tenantId}/${pageId}/${page.slug}`;

    await this.targetModel.create(pageId, PublishTargetType.CDN, {
      cdnDistributionId: distributionId,
      cdnUrl,
      url: cdnUrl,
      metadata: {
        deployedAt: new Date().toISOString(),
        blockCount: blocks.length,
      },
    });

    logger.info('Deployed to CDN', { pageId, distributionId, cdnUrl });

    return { distributionId, cdnUrl };
  }

  async deployToSubdomain(
    tenantId: string,
    pageId: string,
    subdomain: string
  ): Promise<{ target: PublishTarget; url: string }> {
    const page = await this.pageModel.findById(tenantId, pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const url = `https://${subdomain}.${config.embeddedBaseUrl.replace('https://', '')}`;

    const target = await this.targetModel.create(pageId, PublishTargetType.SUBDOMAIN, {
      subdomain,
      url,
      metadata: {
        deployedAt: new Date().toISOString(),
      },
    });

    logger.info('Deployed to subdomain', { pageId, subdomain, url });

    return { target, url };
  }

  async deployToCustomDomain(
    tenantId: string,
    pageId: string,
    customDomain: string
  ): Promise<{ target: PublishTarget; url: string }> {
    const page = await this.pageModel.findById(tenantId, pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    const url = `https://${customDomain}`;

    const target = await this.targetModel.create(pageId, PublishTargetType.CUSTOM_DOMAIN, {
      domain: customDomain,
      url,
      metadata: {
        deployedAt: new Date().toISOString(),
      },
    });

    logger.info('Deployed to custom domain', { pageId, customDomain, url });

    return { target, url };
  }

  async generateEmbedCode(pageId: string, targetId: string): Promise<string> {
    const targets = await this.targetModel.findByPageId(pageId);
    const target = targets.find((t) => t.id === targetId);

    if (!target) {
      throw new Error(`Target not found: ${targetId}`);
    }

    const embedCode = `<div id="sovereign-page-${pageId}" data-page-id="${pageId}" data-target-id="${targetId}"></div>
<script src="${config.embeddedBaseUrl}/embed.js" defer></script>
<script>
  window.sovereignPageConfig = {
    pageId: "${pageId}",
    targetId: "${targetId}",
    baseUrl: "${config.embeddedBaseUrl}"
  };
</script>`;

    await this.targetModel.create(pageId, PublishTargetType.EMBEDDED, {
      embedCode,
      url: target.url,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });

    return embedCode;
  }

  async publish(
    tenantId: string,
    pageId: string,
    options: {
      targetType?: PublishTargetType;
      subdomain?: string;
      customDomain?: string;
    } = {}
  ): Promise<{ pageId: string; targets: PublishTarget[]; urls: string[] }> {
    const page = await this.pageModel.findById(tenantId, pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    if (page.status !== 'approved' && page.status !== 'published') {
      throw new Error(`Page must be approved before publishing. Current status: ${page.status}`);
    }

    const targets: PublishTarget[] = [];
    const urls: string[] = [];

    const targetType = options.targetType || PublishTargetType.CDN;

    switch (targetType) {
      case PublishTargetType.CDN: {
        const { distributionId, cdnUrl } = await this.deployToCDN(tenantId, pageId, page.blocks);
        targets.push(
          await this.targetModel.create(pageId, PublishTargetType.CDN, {
            cdnDistributionId: distributionId,
            cdnUrl,
            url: cdnUrl,
          })
        );
        urls.push(cdnUrl);
        break;
      }

      case PublishTargetType.SUBDOMAIN: {
        if (!options.subdomain) {
          throw new Error('Subdomain is required for subdomain deployment');
        }
        const { target, url } = await this.deployToSubdomain(tenantId, pageId, options.subdomain);
        targets.push(target);
        urls.push(url);
        break;
      }

      case PublishTargetType.CUSTOM_DOMAIN: {
        if (!options.customDomain) {
          throw new Error('Custom domain is required for custom domain deployment');
        }
        const { target, url } = await this.deployToCustomDomain(tenantId, pageId, options.customDomain);
        targets.push(target);
        urls.push(url);
        break;
      }

      case PublishTargetType.EMBEDDED: {
        const embedCode = await this.generateEmbedCode(pageId, '');
        const target = await this.targetModel.create(pageId, PublishTargetType.EMBEDDED, {
          embedCode,
          url: config.embeddedBaseUrl,
        });
        targets.push(target);
        urls.push(config.embeddedBaseUrl);
        break;
      }
    }

    await this.pageModel.markAsPublished(tenantId, pageId);

    for (const target of targets) {
      await eventPublisher.publishPagePublished({
        pageId,
        tenantId,
        publishTargetId: target.id,
        targetType: target.type,
        url: target.url,
      });
    }

    logger.info('Published page', { pageId, targetType, urls });

    return { pageId, targets, urls };
  }

  async unpublish(tenantId: string, pageId: string): Promise<void> {
    const targets = await this.targetModel.findByPageId(pageId);

    for (const target of targets) {
      if (target.status === 'published') {
        await this.targetModel.updateStatus(target.id, 'unpublished');
      }
    }

    await this.pageModel.updateStatus(tenantId, pageId, 'approved');

    logger.info('Unpublished page', { pageId });
  }

  async getPublishTargets(pageId: string): Promise<PublishTarget[]> {
    return this.targetModel.findByPageId(pageId);
  }

  async getPreviewUrl(tenantId: string, pageId: string): Promise<string> {
    const page = await this.pageModel.findById(tenantId, pageId);
    if (!page) {
      throw new Error(`Page not found: ${pageId}`);
    }

    return `${config.embeddedBaseUrl}/preview/${tenantId}/${pageId}`;
  }

  async generateHTML(pageId: string, blocks: PageBlock[]): Promise<string> {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{PAGE_TITLE}}</title>
  <meta name="description" content="{{PAGE_DESCRIPTION}}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .block { padding: 60px 24px; }
    .block.hero { background: #ffffff; text-align: center; }
    .block.features { background: #f9fafb; }
    .block.benefits { background: #ffffff; }
    .block.testimonials { background: #f9fafb; }
    .block.pricing { background: #ffffff; text-align: center; }
    .block.cta { background: #4F46E5; color: #ffffff; text-align: center; }
    .block.faq { background: #f9fafb; }
    .block.footer { background: #1F2937; color: #ffffff; }
    .block.cookie_consent { background: #1F2937; color: #ffffff; position: fixed; bottom: 0; width: 100%; }
    .block.affiliate_disclosure { background: #FEF3C7; padding: 16px 24px; font-size: 14px; }
    h1 { font-size: 48px; margin-bottom: 16px; }
    h2 { font-size: 36px; margin-bottom: 24px; }
    h3 { font-size: 24px; margin-bottom: 16px; }
    p { margin-bottom: 16px; }
    .btn { display: inline-block; padding: 16px 32px; background: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .btn-secondary { background: transparent; border: 2px solid #ffffff; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; }
    .card { background: #ffffff; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .testimonial { background: #ffffff; padding: 24px; border-radius: 12px; margin-bottom: 16px; }
    .testimonial-quote { font-style: italic; margin-bottom: 16px; }
    .testimonial-author { font-weight: 600; }
  </style>
</head>
<body>
  <main>
`;

    for (const block of blocks) {
      html += this.renderBlockToHTML(block);
    }

    html += `  </main>
</body>
</html>`;

    return html;
  }

  private renderBlockToHTML(block: PageBlock): string {
    const { type, content, config: blockConfig } = block;
    const padding = blockConfig?.padding || { top: 60, right: 24, bottom: 60, left: 24 };
    const bgColor = blockConfig?.backgroundColor || '#ffffff';

    switch (type) {
      case 'hero':
        return `
    <section class="block hero" style="background: ${bgColor}; padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;">
      <div class="container">
        <h1>${content.title || ''}</h1>
        <p style="font-size: 20px;">${content.subtitle || ''}</p>
        <p>${content.description || ''}</p>
        <div style="margin-top: 32px;">
          ${content.ctaText ? `<a href="${content.ctaUrl || '#'}" class="btn">${content.ctaText}</a>` : ''}
          ${content.ctaSecondaryText ? `<a href="${content.ctaSecondaryUrl || '#'}" class="btn btn-secondary" style="margin-left: 16px;">${content.ctaSecondaryText}</a>` : ''}
        </div>
      </div>
    </section>`;

      case 'features':
        return `
    <section class="block features" style="background: ${bgColor}; padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;">
      <div class="container">
        <h2>${content.title || ''}</h2>
        <p style="font-size: 20px; margin-bottom: 48px;">${content.subtitle || ''}</p>
        <div class="grid">
          ${(content.items || []).map((item: any) => `
            <div class="card">
              <h3>${item.title}</h3>
              <p>${item.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>`;

      case 'cta':
        return `
    <section class="block cta" style="background: ${bgColor || '#4F46E5'}; padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;">
      <div class="container">
        <h2 style="color: #ffffff;">${content.title || ''}</h2>
        <p style="font-size: 20px; margin-bottom: 32px;">${content.subtitle || ''}</p>
        ${content.ctaText ? `<a href="${content.ctaUrl || '#'}" class="btn" style="background: #ffffff; color: #4F46E5;">${content.ctaText}</a>` : ''}
      </div>
    </section>`;

      case 'footer':
        return `
    <section class="block footer" style="background: ${bgColor}; padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;">
      <div class="container">
        <p>${content.copyright || ''}</p>
      </div>
    </section>`;

      case 'affiliate_disclosure':
        return `
    <section class="block affiliate_disclosure" style="padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;">
      <div class="container">
        <p>${content.disclosureText || ''}</p>
      </div>
    </section>`;

      default:
        return `    <!-- Unknown block type: ${type} -->
`;
    }
  }
}
