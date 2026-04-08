export interface SocialPublishAnalyticsPayload {
  tenantId: string;
  workspaceId: string;
  pageId: string;
  socialPostId: string;
  provider: string;
  postId?: string;
  postUrl?: string;
  campaign: string;
  linkUrl: string;
  publishedAt: string;
}

export async function emitSocialPostPublished(payload: SocialPublishAnalyticsPayload): Promise<void> {
  const baseUrl = process.env.ANALYTICS_SERVICE_URL?.trim();
  if (!baseUrl) return;

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const url = `${normalizedBase}/analytics/events/ingest`;
  const eventId = `social-post:${payload.provider}:${payload.socialPostId}:${payload.publishedAt}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': payload.tenantId,
      'x-workspace-id': payload.workspaceId,
    },
    body: JSON.stringify({
      id: eventId,
      specversion: '1.0',
      type: 'social.post_published',
      source: 'landing-page-factory',
      subject: payload.socialPostId,
      time: payload.publishedAt,
      datacontenttype: 'application/json',
      tenantid: payload.tenantId,
      workspaceid: payload.workspaceId,
      data: payload,
    }),
  });

  if (!response.ok) {
    const payloadText = await response.text();
    throw new Error(`Analytics ingest failed (${response.status}): ${payloadText}`);
  }
}

