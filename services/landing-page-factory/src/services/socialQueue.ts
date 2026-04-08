import { Queue, Worker, JobsOptions } from 'bullmq';
import { createHash } from 'crypto';
import { Pool } from 'pg';
import { logger } from '../config/logger';
import { SocialModel } from '../models/social.model';
import { SocialPublisherService } from './socialPublisher';
import { CampaignModel } from '../models/campaign.model';
import { UbiRewardsService } from './ubiRewards';

export interface SocialPublishJobData {
  tenantId: string;
  socialPostId: string;
}

const QUEUE_NAME = 'social-publish';

function queueConnection() {
  const url = process.env.REDIS_URL?.trim() || 'redis://127.0.0.1:6379';
  return { url };
}

function stableCampaign(postId: string): string {
  return `social-${createHash('sha1').update(postId).digest('hex').slice(0, 10)}`;
}

export class SocialQueueService {
  private queue: Queue<SocialPublishJobData>;
  private worker?: Worker<SocialPublishJobData>;
  private socialModel: SocialModel;
  private campaignModel: CampaignModel;
  private publisher: SocialPublisherService;
  private ubiRewards: UbiRewardsService;

  constructor(db: Pool) {
    this.queue = new Queue<SocialPublishJobData>(QUEUE_NAME, { connection: queueConnection() });
    this.socialModel = new SocialModel(db);
    this.campaignModel = new CampaignModel(db);
    this.publisher = new SocialPublisherService();
    this.ubiRewards = new UbiRewardsService();
  }

  async enqueuePublishJob(data: SocialPublishJobData, delayMs = 0): Promise<void> {
    const options: JobsOptions = {
      delay: Math.max(0, delayMs),
      attempts: 5,
      backoff: { type: 'exponential', delay: 15_000 },
      removeOnComplete: 1000,
      removeOnFail: false,
      jobId: `publish:${data.socialPostId}`,
    };
    await this.queue.add('publish', data, options);
  }

  startWorker(): void {
    if (this.worker) return;
    this.worker = new Worker<SocialPublishJobData>(
      QUEUE_NAME,
      async (job) => {
        const { tenantId, socialPostId } = job.data;
        const post = await this.socialModel.getSocialPostById(tenantId, socialPostId);
        if (!post) throw new Error(`Social post not found: ${socialPostId}`);
        if (post.status === 'cancelled' || post.status === 'published') return;

        const account = await this.socialModel.getSocialAccountById(tenantId, post.socialAccountId);
        if (!account) throw new Error(`Social account not found: ${post.socialAccountId}`);

        await this.socialModel.updateSocialPostStatus(tenantId, socialPostId, {
          status: 'publishing',
          attemptsIncrement: true,
        });

        try {
          if (post.campaignId) {
            try {
              await this.campaignModel.transitionStatus({
                tenantId,
                campaignId: post.campaignId,
                toStatus: 'running',
                userId: post.createdBy || account.createdBy || tenantId,
                reason: 'Social publish worker started campaign execution',
                metadata: { socialPostId },
              });
            } catch (error) {
              logger.warn('Campaign transition to running skipped', {
                tenantId,
                campaignId: post.campaignId,
                socialPostId,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          }

          const result = await this.publisher.publish({
            tenantId,
            pageId: post.pageId,
            socialPostId,
            account,
            text: post.text,
            linkUrl: post.linkUrl,
            campaign: post.campaignId || stableCampaign(post.id),
          });

          await this.socialModel.createPostAttempt({
            socialPostId,
            attemptNumber: post.attempts + 1,
            status: 'published',
            responsePayload: result.responsePayload,
          });

          await this.socialModel.updateSocialPostStatus(tenantId, socialPostId, {
            status: 'published',
            publishedAt: new Date(),
            providerPostId: result.providerPostId,
            providerPostUrl: result.providerPostUrl,
          });
          await this.ubiRewards.emitRewardEvent('social_post_published', {
            tenantId,
            campaignId: post.campaignId || undefined,
            socialPostId,
            pageId: post.pageId,
            provider: account.provider,
            status: 'published',
          });

          if (post.campaignId) {
            const counts = await this.socialModel.getCampaignPostStatusCounts(tenantId, post.campaignId);
            if (counts.total > 0 && counts.published >= counts.total) {
              try {
                await this.campaignModel.transitionStatus({
                  tenantId,
                  campaignId: post.campaignId,
                  toStatus: 'completed',
                  userId: post.createdBy || account.createdBy || tenantId,
                  reason: 'All linked social posts published successfully',
                  metadata: counts,
                });
                await this.ubiRewards.emitRewardEvent('campaign_completed', {
                  tenantId,
                  campaignId: post.campaignId,
                  pageId: post.pageId,
                  status: 'completed',
                });
              } catch (error) {
                logger.warn('Campaign completion transition skipped', {
                  tenantId,
                  campaignId: post.campaignId,
                  socialPostId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown publish error';
          await this.socialModel.createPostAttempt({
            socialPostId,
            attemptNumber: post.attempts + 1,
            status: 'failed',
            errorMessage: message,
          });
          throw err;
        }
      },
      { connection: queueConnection() }
    );

    this.worker.on('failed', async (job, err) => {
      if (!job) return;
      const { tenantId, socialPostId } = job.data;
      const exhausted = (job.attemptsMade || 0) >= (job.opts.attempts || 1);
      const post = await this.socialModel.getSocialPostById(tenantId, socialPostId);
      await this.socialModel.updateSocialPostStatus(tenantId, socialPostId, {
        status: exhausted ? 'dead_letter' : 'failed',
        errorMessage: err.message,
      });
      if (exhausted && post?.campaignId) {
        try {
          await this.campaignModel.transitionStatus({
            tenantId,
            campaignId: post.campaignId,
            toStatus: 'failed',
            userId: post.createdBy || tenantId,
            reason: 'One or more linked social posts exhausted retries',
            metadata: { socialPostId, attemptsMade: job.attemptsMade, maxAttempts: job.opts.attempts },
          });
          await this.ubiRewards.emitRewardEvent('campaign_failed', {
            tenantId,
            campaignId: post.campaignId,
            socialPostId,
            pageId: post.pageId,
            status: 'failed',
          });
        } catch (error) {
          logger.warn('Campaign transition to failed skipped', {
            tenantId,
            campaignId: post.campaignId,
            socialPostId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
      logger.error('Social publish job failed', {
        socialPostId,
        tenantId,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        error: err.message,
      });
    });
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = undefined;
    }
    await this.queue.close();
  }
}

