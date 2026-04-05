import { AbuseScoringService } from '../../src/services/abuseScoringService';
import { db } from '../../src/utils/database';
import { eventService } from '../../src/services/events.service';
import { AbuseSignalType } from '../../src/types';

jest.mock('../../src/utils/database');
jest.mock('../../src/services/events.service');

describe('AbuseScoringService', () => {
  let abuseScoringService: AbuseScoringService;

  beforeEach(() => {
    abuseScoringService = new AbuseScoringService();
    jest.clearAllMocks();
  });

  describe('calculateAbuseScore', () => {
    it('should return low score for clean email', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await abuseScoringService.calculateAbuseScore({
        email: 'john.doe@example.com'
      });

      expect(result.score).toBeLessThan(50);
      expect(result.isBlocked).toBe(false);
    });

    it('should detect disposable email domains', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await abuseScoringService.calculateAbuseScore({
        email: 'user@mailinator.com'
      });

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: AbuseSignalType.DISPOSABLE_EMAIL,
          severity: 70
        })
      );
    });

    it('should detect spam trap patterns', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await abuseScoringService.calculateAbuseScore({
        email: 'info@example.com'
      });

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: AbuseSignalType.SPAM_TRAP,
          severity: 90
        })
      );
    });

    it('should detect suspicious content patterns', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await abuseScoringService.calculateAbuseScore({
        content: {
          message: 'Act now! Limited time only! Click here for free money!'
        }
      });

      expect(result.signals.some((s: any) => s.type === AbuseSignalType.SUSPICIOUS_PATTERN)).toBe(true);
    });

    it('should flag suspicious URLs with risky TLDs', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await abuseScoringService.calculateAbuseScore({
        content: {
          message: 'Check out this link: https://spam-link.xyz/offer'
        }
      });

      expect(result.signals).toContainEqual(
        expect.objectContaining({
          type: AbuseSignalType.FRAUD_INDICATOR
        })
      );
    });

    it('should block high-risk scores', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await abuseScoringService.calculateAbuseScore({
        email: 'info@mailinator.com',
        content: {
          message: 'Act now! Free money! Click here: https://spam.xyz'
        }
      });

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.isBlocked).toBe(true);
    });
  });

  describe('detectPatterns', () => {
    it('should detect mass registration patterns', async () => {
      const emails = [
        'user1@spam.xyz',
        'user2@spam.xyz',
        'user3@spam.xyz',
        'user4@spam.xyz'
      ];

      const results = await abuseScoringService.detectPatterns({ emails });

      expect(results).toContainEqual(
        expect.objectContaining({
          patternType: 'mass_registration',
          details: expect.objectContaining({
            domain: 'spam.xyz',
            count: 4
          })
        })
      );
    });

    it('should detect duplicate phone numbers', async () => {
      const phones = [
        '1234567890',
        '1234567890',
        '1234567890'
      ];

      const results = await abuseScoringService.detectPatterns({ phones });

      expect(results).toContainEqual(
        expect.objectContaining({
          patternType: 'duplicate_numbers',
          details: expect.objectContaining({
            number: '1234567890',
            count: 3
          })
        })
      );
    });

    it('should detect shared URLs in content', async () => {
      const contentSamples = [
        { message: 'Check https://example.com/offer1' },
        { message: 'Also see https://example.com/offer2' },
        { message: 'More at https://example.com/offer3' }
      ];

      const results = await abuseScoringService.detectPatterns({ contentSamples });

      expect(results).toContainEqual(
        expect.objectContaining({
          patternType: 'shared_urls'
        })
      );
    });
  });

  describe('getSignalsByContact', () => {
    it('should return signals for a contact', async () => {
      const mockSignals = [
        {
          id: 'signal-1',
          contact_id: 'contact-123',
          email: 'test@example.com',
          phone: null,
          type: AbuseSignalType.DISPOSABLE_EMAIL,
          severity: 70,
          confidence: 90,
          details: JSON.stringify({ domain: 'mailinator.com' }),
          metadata: JSON.stringify({}),
          resolved_at: null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (db.query as jest.Mock).mockResolvedValue({ rows: mockSignals });

      const result = await abuseScoringService.getSignalsByContact('contact-123');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(AbuseSignalType.DISPOSABLE_EMAIL);
    });
  });

  describe('resolveSignal', () => {
    it('should mark signal as resolved', async () => {
      const resolvedSignal = {
        id: 'signal-1',
        contact_id: 'contact-123',
        email: 'test@example.com',
        phone: null,
        type: AbuseSignalType.DISPOSABLE_EMAIL,
        severity: 70,
        confidence: 90,
        details: JSON.stringify({ domain: 'mailinator.com' }),
        metadata: JSON.stringify({ resolved: true }),
        resolved_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [resolvedSignal] });

      const result = await abuseScoringService.resolveSignal('signal-1');

      expect(result.resolvedAt).toBeDefined();
    });

    it('should throw error for non-existent signal', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(abuseScoringService.resolveSignal('non-existent'))
        .rejects.toThrow('Signal not found');
    });
  });
});
