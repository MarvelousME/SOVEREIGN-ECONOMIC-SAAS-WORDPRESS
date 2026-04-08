import { WorkspaceBrandingService } from '../../src/services/workspace-branding.service';

describe('WorkspaceBrandingService', () => {
  it('returns default runtime binding when record is missing', async () => {
    const db = {
      query: jest.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    };
    const service = new WorkspaceBrandingService(db);

    const binding = await service.getRuntimeBinding(
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002'
    );

    expect(binding.themeId).toBe('castellar');
    expect(binding.themeOverrides).toEqual({});
  });
});
