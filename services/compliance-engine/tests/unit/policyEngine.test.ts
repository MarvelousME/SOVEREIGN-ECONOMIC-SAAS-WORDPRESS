import { PolicyEngine } from '../../src/services/policyEngine';
import { db } from '../../src/utils/database';
import { eventService } from '../../src/services/events.service';
import { PolicyAction, Regulation } from '../../src/types';

jest.mock('../../src/utils/database');
jest.mock('../../src/services/events.service');

describe('PolicyEngine', () => {
  let policyEngine: PolicyEngine;

  beforeEach(() => {
    policyEngine = new PolicyEngine();
    jest.clearAllMocks();
  });

  describe('checkContent', () => {
    it('should return ALLOW for compliant content', async () => {
      const mockPolicy = {
        id: 'policy-1',
        channel: 'email',
        regulation: Regulation.CAN_SPAM,
        rule_set: 'can_spam_basic',
        requirements: JSON.stringify({
          requiresPhysicalAddress: true,
          requiresUnsubscribeHeader: true,
          requiresCompanyName: true
        }),
        is_active: true,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockPolicy] });

      const result = await policyEngine.checkContent({
        contentType: 'email',
        content: {
          physicalAddress: '123 Main St, City, State 12345',
          unsubscribeLink: 'https://example.com/unsubscribe',
          companyName: 'Example Inc',
          hasDisclosure: true
        },
        channel: 'email'
      });

      expect(result.action).toBe(PolicyAction.ALLOW);
      expect(result.violations).toHaveLength(0);
    });

    it('should return BLOCK for content missing required fields', async () => {
      const mockPolicy = {
        id: 'policy-1',
        channel: 'email',
        regulation: Regulation.CAN_SPAM,
        rule_set: 'can_spam_basic',
        requirements: JSON.stringify({
          requiresPhysicalAddress: true,
          requiresUnsubscribeHeader: true,
          requiresCompanyName: true
        }),
        is_active: true,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockPolicy] });

      const result = await policyEngine.checkContent({
        contentType: 'email',
        content: {
          message: 'Hello World'
        },
        channel: 'email'
      });

      expect(result.action).toBe(PolicyAction.BLOCK);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations).toContain('Missing physical address (required for email marketing)');
      expect(result.violations).toContain('Missing unsubscribe mechanism');
      expect(result.violations).toContain('Missing company/sender name');
    });

    it('should return REVIEW for high-risk content', async () => {
      const mockPolicy = {
        id: 'policy-1',
        channel: 'web',
        regulation: Regulation.FTC,
        rule_set: 'ftc_basic',
        requirements: JSON.stringify({
          requiresDisclosure: true
        }),
        is_active: true,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockPolicy] });

      const result = await policyEngine.checkContent({
        contentType: 'blog_post',
        content: {
          hasAffiliateLink: true,
          includesEarningsClaim: true,
          includesTestimonial: true
        },
        channel: 'web'
      });

      expect([PolicyAction.BLOCK, PolicyAction.REVIEW]).toContain(result.action);
    });

    it('should return ALLOW when no policy exists for channel', async () => {
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await policyEngine.checkContent({
        contentType: 'custom',
        content: { message: 'test' },
        channel: 'unknown_channel'
      });

      expect(result.action).toBe(PolicyAction.ALLOW);
    });
  });

  describe('SMS content validation', () => {
    it('should require written consent for SMS', async () => {
      const mockPolicy = {
        id: 'policy-1',
        channel: 'sms',
        regulation: Regulation.TCPA,
        rule_set: 'tcpa_sms',
        requirements: JSON.stringify({
          requiresWrittenConsent: true,
          requiresOptInConsent: true,
          maxMessageLength: 160
        }),
        is_active: true,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockPolicy] });

      const result = await policyEngine.checkContent({
        contentType: 'sms',
        content: {
          message: 'Hello, this is a test message'
        },
        channel: 'sms'
      });

      expect(result.action).toBe(PolicyAction.BLOCK);
      expect(result.violations).toContain('Written/explicit consent required for SMS');
      expect(result.violations).toContain('Contact has not provided opt-in consent');
    });

    it('should flag messages exceeding max length', async () => {
      const mockPolicy = {
        id: 'policy-1',
        channel: 'sms',
        regulation: Regulation.TCPA,
        rule_set: 'tcpa_sms',
        requirements: JSON.stringify({
          requiresWrittenConsent: true,
          requiresOptInConsent: true,
          maxMessageLength: 160
        }),
        is_active: true,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockPolicy] });

      const longMessage = 'A'.repeat(200);

      const result = await policyEngine.checkContent({
        contentType: 'sms',
        content: {
          message: longMessage,
          writtenConsent: true,
          hasOptInConsent: true
        },
        channel: 'sms'
      });

      expect(result.violations).toContain('Message exceeds maximum length of 160 characters');
    });
  });

  describe('createChannelPolicy', () => {
    it('should create a new channel policy', async () => {
      const mockPolicy = {
        id: 'policy-new',
        channel: 'social',
        regulation: Regulation.FTC,
        rule_set: 'ftc_social',
        requirements: JSON.stringify({ requiresDisclosure: true }),
        is_active: true,
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      };

      (db.query as jest.Mock).mockResolvedValue({ rows: [mockPolicy] });

      const result = await policyEngine.createChannelPolicy({
        channel: 'social',
        regulation: Regulation.FTC,
        ruleSet: 'ftc_social',
        requirements: { requiresDisclosure: true }
      });

      expect(result.channel).toBe('social');
      expect(result.regulation).toBe(Regulation.FTC);
    });
  });
});
