import { buildRewardDedupeKey, buildUbiRewardPayload } from '../../src/services/ubiRewards';

describe('UBI rewards helpers', () => {
  it('buildRewardDedupeKey is stable for same input', () => {
    const context = {
      tenantId: 'tenant-1',
      campaignId: 'cmp-1',
      socialPostId: 'sp-1',
      pageId: 'pg-1',
      provider: 'x',
      status: 'published',
    };

    const a = buildRewardDedupeKey('social_post_published', context);
    const b = buildRewardDedupeKey('social_post_published', context);

    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('buildRewardDedupeKey changes when event context changes', () => {
    const base = buildRewardDedupeKey('campaign_completed', {
      tenantId: 'tenant-1',
      campaignId: 'cmp-1',
      status: 'completed',
    });
    const changed = buildRewardDedupeKey('campaign_completed', {
      tenantId: 'tenant-1',
      campaignId: 'cmp-2',
      status: 'completed',
    });

    expect(base).not.toBe(changed);
  });

  it('buildUbiRewardPayload includes idempotency metadata', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const payload = buildUbiRewardPayload(
      'campaign_failed',
      {
        tenantId: 'tenant-1',
        campaignId: 'cmp-1',
        socialPostId: 'sp-9',
        pageId: 'pg-2',
        status: 'failed',
      },
      now
    );

    expect(payload.eventType).toBe('campaign_failed');
    expect(payload.timestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(payload.eventId).toContain('reward:campaign_failed:');
    expect(payload.metadata.dedupeKey).toBe(payload.dedupeKey);
    expect(payload.tenantId).toBe('tenant-1');
  });
});

