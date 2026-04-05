import { SuppressionService } from '../../src/services/suppressionService';
import { db } from '../../src/utils/database';
import { eventService } from '../../src/services/events.service';
import { SuppressionType, SuppressionChannel } from '../../src/types';

jest.mock('../../src/utils/database');
jest.mock('../../src/services/events.service');

describe('SuppressionService', () => {
  let suppressionService: SuppressionService;

  beforeEach(() => {
    suppressionService = new SuppressionService();
    jest.clearAllMocks();
  });

  describe('addToSuppressionList', () => {
    it('should add a new entry to the suppression list', async () => {
      const mockEntry = {
        id: 'suppression-1',
        contact_id: 'contact-123',
        email: null,
        phone: null,
        type: SuppressionType.UNSUBSCRIBE,
        channel: SuppressionChannel.ALL,
        reason: 'User unsubscribed',
        source: 'manual',
        added_by: 'admin',
        expires_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [mockEntry] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const input = {
        contactId: 'contact-123',
        type: SuppressionType.UNSUBSCRIBE,
        channel: SuppressionChannel.ALL,
        reason: 'User unsubscribed',
        source: 'manual',
        addedBy: 'admin'
      };

      const result = await suppressionService.addToSuppressionList(input);

      expect(result).toBeDefined();
      expect(result.contactId).toBe('contact-123');
      expect(result.type).toBe(SuppressionType.UNSUBSCRIBE);
      expect(eventService.publish).toHaveBeenCalledWith(
        'suppression.updated',
        expect.objectContaining({
          action: 'added',
          type: SuppressionType.UNSUBSCRIBE
        })
      );
    });

    it('should update existing entry instead of creating duplicate', async () => {
      const existingEntry = { id: 'existing-suppression' };
      const updatedEntry = {
        id: 'existing-suppression',
        contact_id: 'contact-123',
        email: null,
        phone: null,
        type: SuppressionType.BLOCKED,
        channel: SuppressionChannel.ALL,
        reason: 'Updated reason',
        source: 'manual',
        added_by: 'admin',
        expires_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [existingEntry] })
        .mockResolvedValueOnce({ rows: [updatedEntry] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const input = {
        contactId: 'contact-123',
        type: SuppressionType.BLOCKED,
        channel: SuppressionChannel.ALL,
        reason: 'Updated reason'
      };

      const result = await suppressionService.addToSuppressionList(input);

      expect(result.id).toBe('existing-suppression');
      expect(result.type).toBe(SuppressionType.BLOCKED);
    });
  });

  describe('removeFromSuppressionList', () => {
    it('should remove entry and return true', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [{ id: 'suppression-1' }] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await suppressionService.removeFromSuppressionList('suppression-1');

      expect(result).toBe(true);
      expect(eventService.publish).toHaveBeenCalledWith(
        'suppression.updated',
        expect.objectContaining({ action: 'removed' })
      );
    });

    it('should return false for non-existent entry', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await suppressionService.removeFromSuppressionList('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('isSuppressed', () => {
    it('should return isSuppressed true when entry exists', async () => {
      const mockEntry = {
        id: 'suppression-1',
        contact_id: 'contact-123',
        email: null,
        phone: null,
        type: SuppressionType.UNSUBSCRIBE,
        channel: SuppressionChannel.ALL,
        reason: null,
        source: null,
        added_by: null,
        expires_at: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockEntry] });

      const result = await suppressionService.isSuppressed({
        contactId: 'contact-123'
      });

      expect(result.isSuppressed).toBe(true);
      expect(result.entry).toBeDefined();
    });

    it('should return isSuppressed false when no entry exists', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await suppressionService.isSuppressed({
        contactId: 'contact-123'
      });

      expect(result.isSuppressed).toBe(false);
      expect(result.entry).toBeUndefined();
    });
  });

  describe('listSuppressionEntries', () => {
    it('should list entries with pagination', async () => {
      const mockEntries = [
        {
          id: 'suppression-1',
          contact_id: 'contact-123',
          email: null,
          phone: null,
          type: SuppressionType.UNSUBSCRIBE,
          channel: SuppressionChannel.ALL,
          reason: null,
          source: null,
          added_by: null,
          expires_at: null,
          metadata: JSON.stringify({}),
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockEntries });

      const result = await suppressionService.listSuppressionEntries({
        limit: 10,
        offset: 0
      });

      expect(result.total).toBe(1);
      expect(result.entries).toHaveLength(1);
    });
  });
});
