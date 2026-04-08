jest.mock('../src/config', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { pool } from '../src/config';
import { EventIngestionService } from '../src/services/eventIngestion';

describe('Event Ingestion Contracts', () => {
  const mockedQuery = pool.query as jest.Mock;
  const service = new EventIngestionService();

  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it('persists social publish event into touchpoint and conversion storage', async () => {
    const cloudEvent = {
      id: 'evt-social-001',
      specversion: '1.0',
      type: 'social.post_published',
      source: 'landing-page-factory',
      time: '2026-01-01T12:00:00.000Z',
      tenantid: '550e8400-e29b-41d4-a716-446655440000',
      workspaceid: '550e8400-e29b-41d4-a716-446655440001',
      data: {
        socialPostId: 'sp_123',
        postId: 'provider_123',
        provider: 'x',
        campaign: 'launch-campaign',
        visitor_id: 'social:x:sp_123',
        session_id: 'social:x:sp_123',
        channel: 'social',
        source: 'x',
        medium: 'organic',
      },
    };

    mockedQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'canonical_1',
            event_id: cloudEvent.id,
            tenant_id: cloudEvent.tenantid,
            workspace_id: cloudEvent.workspaceid,
            event_type: cloudEvent.type,
            source: cloudEvent.source,
            spec_version: cloudEvent.specversion,
            event_type_schema: null,
            data: cloudEvent.data,
            metadata: {},
            correlation_id: null,
            causation_id: null,
            timestamp: cloudEvent.time,
            processing_time_ms: 4,
            created_at: cloudEvent.time,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.ingestEvent(cloudEvent);
    expect(result.success).toBe(true);
    expect(result.eventId).toBe('canonical_1');

    const executedSql = mockedQuery.mock.calls.map((call) => String(call[0]));
    expect(executedSql.some((sql) => sql.includes('INSERT INTO attribution_touchpoints'))).toBe(true);
    expect(executedSql.some((sql) => sql.includes('INSERT INTO conversions'))).toBe(true);

    const conversionInsertCall = mockedQuery.mock.calls.find((call) =>
      String(call[0]).includes('INSERT INTO conversions')
    );
    expect(conversionInsertCall).toBeDefined();
    expect(conversionInsertCall?.[1]).toEqual(
      expect.arrayContaining(['social_post_published', 'social', 'x', 'organic', 'launch-campaign'])
    );
  });
});
