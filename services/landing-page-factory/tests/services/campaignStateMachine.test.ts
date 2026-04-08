import { canTransitionCampaignStatus } from '../../src/models/campaign.model';

describe('campaign orchestration state machine', () => {
  it('allows valid transitions', () => {
    expect(canTransitionCampaignStatus('draft', 'ready')).toBe(true);
    expect(canTransitionCampaignStatus('ready', 'scheduled')).toBe(true);
    expect(canTransitionCampaignStatus('scheduled', 'running')).toBe(true);
    expect(canTransitionCampaignStatus('running', 'completed')).toBe(true);
    expect(canTransitionCampaignStatus('failed', 'draft')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(canTransitionCampaignStatus('draft', 'completed')).toBe(false);
    expect(canTransitionCampaignStatus('completed', 'running')).toBe(false);
    expect(canTransitionCampaignStatus('archived', 'draft')).toBe(false);
    expect(canTransitionCampaignStatus('ready', 'completed')).toBe(false);
  });
});
