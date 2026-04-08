import { csvExportService } from './csvExport.service';
import { ReportingService } from './reporting.service';
import { logger } from '../utils/logger';

describe('CsvExportService', () => {
  const mockTenantId = 'test-tenant-123';

  describe('exportDashboardCsv', () => {
    it('should return a readable stream', async () => {
      const stream = await csvExportService.exportDashboardCsv(mockTenantId);
      expect(stream).toBeDefined();
      expect(typeof stream.pipe === 'function').toBe(true);
    });
  });

  describe('exportRevenueCsv', () => {
    it('should return a readable stream with options', async () => {
      const stream = await csvExportService.exportRevenueCsv(mockTenantId, { period: '30d' });
      expect(stream).toBeDefined();
      expect(typeof stream.pipe === 'function').toBe(true);
    });
  });

  describe('exportExpensesCsv', () => {
    it('should return a readable stream', async () => {
      const stream = await csvExportService.exportExpensesCsv(mockTenantId);
      expect(stream).toBeDefined();
    });
  });

  describe('exportCashFlowCsv', () => {
    it('should return a readable stream', async () => {
      const stream = await csvExportService.exportCashFlowCsv(mockTenantId);
      expect(stream).toBeDefined();
    });
  });

  describe('escapeCsvField', () => {
    it('should escape fields with commas', () => {
      // Access via any to test private method indirectly
      const service = csvExportService as any;
      expect(service.escapeCsvField('hello,world')).toBe('"hello,world"');
    });

    it('should escape fields with quotes', () => {
      const service = csvExportService as any;
      expect(service.escapeCsvField('say "hello"')).toBe('"say ""hello"""');
    });

    it('should escape fields with newlines', () => {
      const service = csvExportService as any;
      expect(service.escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should handle null and undefined', () => {
      const service = csvExportService as any;
      expect(service.escapeCsvField(null)).toBe('');
      expect(service.escapeCsvField(undefined)).toBe('');
    });

    it('should return plain strings when no escaping needed', () => {
      const service = csvExportService as any;
      expect(service.escapeCsvField('simple')).toBe('simple');
      expect(service.escapeCsvField('123')).toBe('123');
    });
  });
});
