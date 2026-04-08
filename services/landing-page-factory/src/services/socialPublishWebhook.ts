import { logger } from '../config/logger';

export type PublishWebhookPayload = {
  event: 'page.published';
  pageId: string;
  tenantId: string;
  urls: string[];
  shareLinks: Record<string, string>;
  targetTypes: string[];
};

/**
 * Optional integration hook (n8n, Make, internal poster). Fires after DB publish succeeds.
 * Set SOCIAL_PUBLISH_WEBHOOK_URL in env. Failures are logged, never thrown.
 */
export async function notifySocialPublishWebhook(payload: PublishWebhookPayload): Promise<void> {
  const hook = process.env.SOCIAL_PUBLISH_WEBHOOK_URL?.trim();
  if (!hook) return;

  try {
    const res = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn('Social publish webhook returned non-OK', { status: res.status, hook });
    }
  } catch (e) {
    logger.warn('Social publish webhook failed', { error: (e as Error).message, hook });
  }
}
