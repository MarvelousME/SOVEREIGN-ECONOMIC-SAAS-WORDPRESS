import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SocialModel, SocialProvider } from '../models/social.model';
import { SocialOAuthService } from '../services/socialOAuth';
import { encryptString } from '../services/crypto';
import { SocialQueueService } from '../services/socialQueue';
import { CampaignModel } from '../models/campaign.model';

const startOAuthQuery = z.object({
  redirectUri: z.string().url().optional(),
});

const callbackOAuthQuery = z.object({
  code: z.string().min(2),
  state: z.string().min(8),
});

const listPostsQuery = z.object({
  scope: z.enum(['own', 'workspace']).optional().default('workspace'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const createSocialPostBody = z.object({
  pageId: z.string().uuid(),
  socialAccountId: z.string().uuid(),
  text: z.string().min(1).max(2000),
  linkUrl: z.string().url(),
  campaignId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
      content: z.string().optional(),
    })
    .optional(),
});

interface TenantContext {
  tenantId: string;
  userId: string;
}

export class SocialController {
  private oauth = new SocialOAuthService();

  constructor(
    private socialModel: SocialModel,
    private queue: SocialQueueService,
    private campaignModel: CampaignModel
  ) {}

  startOAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const provider = req.params.provider as SocialProvider;
      const _query = startOAuthQuery.parse(req.query);
      const started = this.oauth.start(provider, tenantId);

      await this.socialModel.saveOAuthState({
        tenantId,
        userId,
        provider,
        stateHash: SocialOAuthService.stateHash(started.state),
        codeVerifierHash: started.codeVerifier
          ? SocialOAuthService.codeVerifierHash(started.codeVerifier)
          : undefined,
        redirectUri: started.redirectUri,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      res.json({
        success: true,
        data: {
          provider,
          authUrl: started.authUrl,
          state: started.state,
          codeVerifier: started.codeVerifier, // client keeps this for PKCE callback
          redirectUri: started.redirectUri,
          scope: started.scope,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  oauthCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const provider = req.params.provider as SocialProvider;
      const query = callbackOAuthQuery.parse(req.query);
      const codeVerifier = typeof req.query.codeVerifier === 'string' ? req.query.codeVerifier : undefined;

      const stateRow = await this.socialModel.consumeOAuthState(
        tenantId,
        provider,
        SocialOAuthService.stateHash(query.state)
      );
      if (!stateRow) {
        res.status(400).json({ success: false, error: 'Invalid or expired OAuth state' });
        return;
      }
      if (stateRow.userId !== userId) {
        res.status(403).json({ success: false, error: 'OAuth state user mismatch' });
        return;
      }
      if (stateRow.codeVerifierHash && (!codeVerifier || SocialOAuthService.codeVerifierHash(codeVerifier) !== stateRow.codeVerifierHash)) {
        res.status(400).json({ success: false, error: 'Invalid code verifier' });
        return;
      }

      const tokens = await this.oauth.exchangeCodeForTokens(provider, query.code, stateRow.redirectUri, codeVerifier);
      const profile = await this.oauth.resolveProfile(provider, tokens.accessToken);
      const metadata = { ...(profile.metadata || {}) };

      const account = await this.socialModel.upsertSocialAccount({
        tenantId,
        provider,
        accountRef: profile.accountRef,
        displayName: profile.displayName,
        scopes: tokens.scope ? tokens.scope.split(/\s+/).filter(Boolean) : [],
        accessTokenEncrypted: encryptString(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken ? encryptString(tokens.refreshToken) : undefined,
        expiresAt: tokens.expiresAt,
        metadata,
        createdBy: userId,
      });

      res.json({ success: true, data: account });
    } catch (err) {
      next(err);
    }
  };

  listAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const data = await this.socialModel.listSocialAccounts(tenantId);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  };

  createPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const body = createSocialPostBody.parse(req.body);

      const account = await this.socialModel.getSocialAccountById(tenantId, body.socialAccountId);
      if (!account) {
        res.status(404).json({ success: false, error: 'Social account not found' });
        return;
      }
      if (body.campaignId) {
        const campaign = await this.campaignModel.findById(tenantId, body.campaignId);
        if (!campaign) {
          res.status(404).json({ success: false, error: 'Campaign not found' });
          return;
        }
      }

      const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : undefined;
      const post = await this.socialModel.createSocialPost({
        tenantId,
        pageId: body.pageId,
        campaignId: body.campaignId,
        socialAccountId: body.socialAccountId,
        provider: account.provider,
        status: scheduledFor ? 'scheduled' : 'queued',
        text: body.text,
        linkUrl: body.linkUrl,
        utmParams: body.utm || {},
        scheduledFor,
        maxAttempts: 5,
        metadata: {},
        createdBy: userId,
      });

      const delayMs = scheduledFor ? Math.max(0, scheduledFor.getTime() - Date.now()) : 0;
      await this.queue.enqueuePublishJob({ tenantId, socialPostId: post.id }, delayMs);

      res.status(201).json({ success: true, data: post });
    } catch (err) {
      next(err);
    }
  };

  listPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId, userId } = req.body as TenantContext;
      const query = listPostsQuery.parse(req.query);
      const result = await this.socialModel.listSocialPosts(tenantId, {
        scope: query.scope,
        userId,
        limit: query.limit,
        offset: query.offset,
      });
      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          limit: query.limit,
          offset: query.offset,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  cancelPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tenantId } = req.body as TenantContext;
      const id = req.params.id;
      const existing = await this.socialModel.getSocialPostById(tenantId, id);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Social post not found' });
        return;
      }
      if (existing.status === 'published') {
        res.status(409).json({ success: false, error: 'Cannot cancel already published post' });
        return;
      }

      await this.socialModel.updateSocialPostStatus(tenantId, id, {
        status: 'cancelled',
        cancelledAt: new Date(),
      });
      res.json({ success: true, message: 'Social post cancelled' });
    } catch (err) {
      next(err);
    }
  };
}

