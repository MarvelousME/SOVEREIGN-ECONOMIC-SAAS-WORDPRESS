import { SocialAccount, SocialProvider } from '../models/social.model';
import { decryptString } from './crypto';
import { emitSocialPostPublished } from './analyticsClient';

export interface PublishSocialInput {
  tenantId: string;
  pageId: string;
  socialPostId: string;
  account: SocialAccount;
  text: string;
  linkUrl: string;
  campaign: string;
}

export interface PublishSocialResult {
  providerPostId: string;
  providerPostUrl?: string;
  responsePayload?: Record<string, unknown>;
}

export class SocialPublisherService {
  async publish(input: PublishSocialInput): Promise<PublishSocialResult> {
    const accessToken = decryptString(input.account.accessTokenEncrypted);
    const provider = input.account.provider;

    let result: PublishSocialResult;
    if (provider === 'x') {
      result = await this.publishToX(accessToken, input.text, input.linkUrl);
    } else if (provider === 'linkedin') {
      result = await this.publishToLinkedIn(input.account, accessToken, input.text, input.linkUrl);
    } else if (provider === 'facebook') {
      result = await this.publishToFacebook(input.account, accessToken, input.text, input.linkUrl);
    } else if (provider === 'tiktok') {
      result = await this.publishToTikTok(input.account, accessToken, input.text, input.linkUrl);
    } else {
      throw new Error(`Unsupported provider: ${provider satisfies SocialProvider}`);
    }

    await emitSocialPostPublished({
      tenantId: input.tenantId,
      workspaceId: input.tenantId,
      pageId: input.pageId,
      socialPostId: input.socialPostId,
      provider,
      postId: result.providerPostId,
      postUrl: result.providerPostUrl,
      campaign: input.campaign,
      linkUrl: input.linkUrl,
      publishedAt: new Date().toISOString(),
    });

    return result;
  }

  private async publishToX(accessToken: string, text: string, linkUrl: string): Promise<PublishSocialResult> {
    const payload = { text: `${text} ${linkUrl}`.trim() };
    const resp = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`X publish failed: ${resp.status}`);
    const json = (await resp.json()) as { data?: { id?: string } } & Record<string, unknown>;
    const id = json.data?.id;
    if (!id) throw new Error('X publish missing tweet id');
    return { providerPostId: id, providerPostUrl: `https://x.com/i/web/status/${id}`, responsePayload: json };
  }

  private async publishToLinkedIn(
    account: SocialAccount,
    accessToken: string,
    text: string,
    linkUrl: string
  ): Promise<PublishSocialResult> {
    const author = `urn:li:person:${account.accountRef}`;
    const payload = {
      author,
      commentary: `${text} ${linkUrl}`.trim(),
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    const resp = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202405',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error(`LinkedIn publish failed: ${resp.status}`);
    const rawId = resp.headers.get('x-restli-id') || resp.headers.get('location') || '';
    const postId = rawId || `li-${Date.now()}`;
    return { providerPostId: postId, responsePayload: { rawId } };
  }

  private async publishToFacebook(
    account: SocialAccount,
    accessToken: string,
    text: string,
    linkUrl: string
  ): Promise<PublishSocialResult> {
    const pageAccessToken =
      typeof account.metadata.pageAccessToken === 'string' ? account.metadata.pageAccessToken : accessToken;
    const body = new URLSearchParams({
      message: text,
      link: linkUrl,
      access_token: pageAccessToken,
    });
    const resp = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(account.accountRef)}/feed`, {
      method: 'POST',
      body,
    });
    if (!resp.ok) throw new Error(`Facebook publish failed: ${resp.status}`);
    const json = (await resp.json()) as { id?: string } & Record<string, unknown>;
    if (!json.id) throw new Error('Facebook publish missing post id');
    return { providerPostId: json.id, responsePayload: json };
  }

  private async publishToTikTok(
    account: SocialAccount,
    accessToken: string,
    text: string,
    linkUrl: string
  ): Promise<PublishSocialResult> {
    const webhook = process.env.TIKTOK_PUBLISH_WEBHOOK_URL?.trim();
    if (webhook) {
      const resp = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          accountRef: account.accountRef,
          caption: text,
          linkUrl,
        }),
      });
      if (!resp.ok) throw new Error(`TikTok webhook publish failed: ${resp.status}`);
      const json = (await resp.json()) as { id?: string; url?: string } & Record<string, unknown>;
      const id = json.id || `tt-${Date.now()}`;
      return { providerPostId: id, providerPostUrl: json.url, responsePayload: json };
    }

    // Fallback: API bridge endpoint for custom publisher worker.
    const bridgeUrl = process.env.TIKTOK_PUBLISH_BRIDGE_URL?.trim();
    if (!bridgeUrl) {
      throw new Error(
        'TikTok publish requires TIKTOK_PUBLISH_WEBHOOK_URL or TIKTOK_PUBLISH_BRIDGE_URL'
      );
    }
    const resp = await fetch(bridgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        accountRef: account.accountRef,
        caption: text,
        linkUrl,
      }),
    });
    if (!resp.ok) throw new Error(`TikTok bridge publish failed: ${resp.status}`);
    const json = (await resp.json()) as { id?: string; url?: string } & Record<string, unknown>;
    const id = json.id || `tt-${Date.now()}`;
    return { providerPostId: id, providerPostUrl: json.url, responsePayload: json };
  }
}

