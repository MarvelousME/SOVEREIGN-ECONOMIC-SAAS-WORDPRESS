import { calculateCampaignReportKpis } from '../../src/models/campaign.model';

describe('campaign reporting KPI aggregation', () => {
  it('computes success/failure rates and throughput', () => {
    const kpis = calculateCampaignReportKpis(20, 15, 3, 5);
    expect(kpis).toEqual({
      totalPosts: 20,
      publishedPosts: 15,
      failedPosts: 3,
      successRate: 75,
      failureRate: 15,
      publishThroughputPerDay: 3,
    });
  });

  it('handles empty totals without NaN rates', () => {
    const kpis = calculateCampaignReportKpis(0, 0, 0, 10);
    expect(kpis.successRate).toBe(0);
    expect(kpis.failureRate).toBe(0);
    expect(kpis.publishThroughputPerDay).toBe(0);
  });
});
