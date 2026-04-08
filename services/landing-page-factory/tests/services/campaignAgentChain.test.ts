import { CampaignAgentChainService, getAgentChainStages } from '../../src/services/campaignAgentChain.service';

describe('campaign agent chain runtime', () => {
  it('executes stages in research -> strategy -> compliance order', async () => {
    expect(getAgentChainStages()).toEqual(['research', 'strategy', 'compliance']);

    const service = new CampaignAgentChainService();
    const run = await service.runChain({
      tenantId: 'tenant-1',
      campaignId: 'campaign-1',
      createdBy: 'user-1',
      payload: {
        goal: 'Increase qualified signups',
        channels: ['linkedin', 'email'],
        locale: 'en-US',
      },
    });

    expect(run.stages.map((s) => s.stage)).toEqual(['research', 'strategy', 'compliance']);
    expect(run.stages.every((s) => s.status === 'success')).toBe(true);
  });
});
