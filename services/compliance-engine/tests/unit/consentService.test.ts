import { ConsentService } from '../../src/services/consentService';
import { db } from '../../src/utils/database';
import { eventService } from '../../src/services/events.service';
import { ConsentBasis, ConsentChannel, Regulation } from '../../src/types';

jest.mock('../../src/utils/database');
jest.mock('../../src/services/events.service');

describe('ConsentService', () => {
  let consentService: ConsentService;

  beforeEach(() => {
    consentService = new ConsentService();
    jest.clearAllMocks();
  });

  describe('recordConsent', () => {
    it('should record a new consent successfully', async () => {
      const mockConsent = {
        id: 'test-uuid',
        contact_id: 'contact-123',
        purpose: 'marketing',
        basis: ConsentBasis.EXPLICIT,
        channels: JSON.stringify([ConsentChannel.EMAIL]),
        regulations: JSON.stringify([Regulation.GDPR]),
        status: 'granted',
        granted_at: new Date(),
        expires_at: null,
        revoked_at: null,
        proof_type: 'web_form',
        proof_data: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockConsent] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const input = {
        contactId: 'contact-123',
        purpose: 'marketing',
        basis: ConsentBasis.EXPLICIT,
        channels: [ConsentChannel.EMAIL],
        regulations: [Regulation.GDPR],
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      };

      const result = await consentService.recordConsent(input);

      expect(result).toBeDefined();
      expect(result.contactId).toBe('contact-123');
      expect(result.purpose).toBe('marketing');
      expect(result.status).toBe('granted');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(eventService.publish).toHaveBeenCalledWith(
        'consent.recorded',
        expect.objectContaining({
          consentId: expect.any(String),
          contactId: 'contact-123'
        })
      );
    });

    it('should calculate expiration date when expiresInDays is provided', async () => {
      const mockConsent = {
        id: 'test-uuid',
        contact_id: 'contact-123',
        purpose: 'marketing',
        basis: ConsentBasis.EXPLICIT,
        channels: JSON.stringify([ConsentChannel.EMAIL]),
        regulations: JSON.stringify([Regulation.GDPR]),
        status: 'granted',
        granted_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revoked_at: null,
        proof_type: 'web_form',
        proof_data: JSON.stringify({}),
        ip_address: null,
        user_agent: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockConsent] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const input = {
        contactId: 'contact-123',
        purpose: 'marketing',
        basis: ConsentBasis.EXPLICIT,
        channels: [ConsentChannel.EMAIL],
        regulations: [Regulation.GDPR],
        expiresInDays: 30
      };

      const result = await consentService.recordConsent(input);

      expect(result.expiresAt).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('getConsentStatus', () => {
    it('should return valid consent status for granted consent', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const mockConsents = [{
        id: 'consent-1',
        contact_id: 'contact-123',
        purpose: 'marketing',
        basis: ConsentBasis.EXPLICIT,
        channels: JSON.stringify([ConsentChannel.EMAIL, ConsentChannel.SMS]),
        regulations: JSON.stringify([Regulation.GDPR]),
        status: 'granted',
        granted_at: new Date(),
        expires_at: futureDate,
        revoked_at: null,
        proof_type: 'web_form',
        proof_data: JSON.stringify({}),
        ip_address: null,
        user_agent: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      }];

      (db.query as jest.Mock).mockResolvedValue({ rows: mockConsents });

      const result = await consentService.getConsentStatus('contact-123');

      expect(result.hasValidConsent).toBe(true);
      expect(result.consents).toHaveLength(1);
      expect(result.channels).toContain(ConsentChannel.EMAIL);
      expect(result.channels).toContain(ConsentChannel.SMS);
      expect(result.regulations).toContain(Regulation.GDPR);
    });

    it('should return no valid consent for expired consent', async () => {
      const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const mockConsents = [{
        id: 'consent-1',
        contact_id: 'contact-123',
        purpose: 'marketing',
        basis: ConsentBasis.EXPLICIT,
        channels: JSON.stringify([ConsentChannel.EMAIL]),
        regulations: JSON.stringify([Regulation.GDPR]),
        status: 'granted',
        granted_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        expires_at: pastDate,
        revoked_at: null,
        proof_type: 'web_form',
        proof_data: JSON.stringify({}),
        ip_address: null,
        user_agent: null,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      }];

      (db.query as jest.Mock).mockResolvedValue({ rows: mockConsents });

      const result = await consentService.getConsentStatus('contact-123');

      expect(result.hasValidConsent).toBe(false);
      expect(result.consents).toHaveLength(0);
    });
  });

  describe('revokeConsent', () => {
    it('should revoke consent successfully', async () => {
      const mockConsent = {
        id: 'consent-1',
        contact_id: 'contact-123',
        purpose: 'marketing',
        basis: ConsentBasis.EXPLICIT,
        channels: JSON.stringify([ConsentChannel.EMAIL]),
        regulations: JSON.stringify([Regulation.GDPR]),
        status: 'revoked',
        granted_at: new Date(),
        expires_at: null,
        revoked_at: new Date(),
        proof_type: 'web_form',
        proof_data: JSON.stringify({}),
        ip_address: null,
        user_agent: null,
        metadata: JSON.stringify({ revocationReason: 'User requested' }),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockConsent] });
      (eventService.publish as jest.Mock).mockResolvedValue(undefined);

      const result = await consentService.revokeConsent('consent-1', 'User requested');

      expect(result.status).toBe('revoked');
      expect(eventService.publish).toHaveBeenCalledWith(
        'consent.revoked',
        expect.objectContaining({
          consentId: 'consent-1',
          reason: 'User requested'
        })
      );
    });

    it('should throw error for non-existent consent', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(consentService.revokeConsent('non-existent'))
        .rejects.toThrow('Consent record not found');
    });
  });
});
