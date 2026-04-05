import { validateEvent, validateBatch, isCanonicalEventType, sanitizeString, sanitizeObject } from '../src/utils/validation';
import { CloudEvent, CANONICAL_EVENT_TYPES } from '../src/types';

describe('Validation Utils', () => {
  describe('validateEvent', () => {
    it('should validate a correct CloudEvent', () => {
      const validEvent: CloudEvent = {
        id: 'test-event-123',
        specversion: '1.0',
        type: 'lead.captured',
        source: '/affiliate/tracker',
        data: { lead_id: '123', email: 'test@example.com' },
        tenantid: '550e8400-e29b-41d4-a716-446655440000',
        workspaceid: '550e8400-e29b-41d4-a716-446655440001',
      };

      const result = validateEvent(validEvent);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validEvent);
    });

    it('should reject event without id', () => {
      const invalidEvent = {
        type: 'lead.captured',
        source: '/affiliate/tracker',
        data: {},
      };

      const result = validateEvent(invalidEvent);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject event with invalid type', () => {
      const invalidEvent = {
        id: 'test-event-123',
        type: 'invalid.event.type',
        source: '/affiliate/tracker',
        data: {},
      };

      const result = validateEvent(invalidEvent);
      expect(result.valid).toBe(false);
    });

    it('should accept event without optional fields', () => {
      const minimalEvent: CloudEvent = {
        id: 'test-event-123',
        type: 'page.generated',
        source: '/page/generator',
        data: { page_id: '456' },
      };

      const result = validateEvent(minimalEvent);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateBatch', () => {
    it('should validate a batch of valid events', () => {
      const validEvents: CloudEvent[] = [
        {
          id: 'event-1',
          type: 'lead.captured',
          source: '/source/1',
          data: { lead_id: '1' },
        },
        {
          id: 'event-2',
          type: 'page.published',
          source: '/source/2',
          data: { page_id: '2' },
        },
      ];

      const result = validateBatch(validEvents);
      expect(result.valid).toBe(true);
      expect(result.accepted).toHaveLength(2);
      expect(result.rejected).toHaveLength(0);
    });

    it('should separate valid and invalid events in batch', () => {
      const mixedEvents = [
        {
          id: 'event-1',
          type: 'lead.captured',
          source: '/source/1',
          data: { lead_id: '1' },
        },
        {
          id: 'event-2',
          type: 'invalid.type',
          source: '/source/2',
          data: {},
        },
      ];

      const result = validateBatch(mixedEvents);
      expect(result.valid).toBe(false);
      expect(result.accepted).toHaveLength(1);
      expect(result.rejected).toHaveLength(1);
    });

    it('should reject non-array input', () => {
      const result = validateBatch('not an array');
      expect(result.valid).toBe(false);
      expect(result.accepted).toHaveLength(0);
      expect(result.rejected).toHaveLength(1);
    });
  });

  describe('isCanonicalEventType', () => {
    it('should return true for valid event types', () => {
      expect(isCanonicalEventType('lead.captured')).toBe(true);
      expect(isCanonicalEventType('page.published')).toBe(true);
      expect(isCanonicalEventType('conversion.completed')).toBe(false);
    });

    it('should return false for invalid event types', () => {
      expect(isCanonicalEventType('invalid.event')).toBe(false);
      expect(isCanonicalEventType('')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(sanitizeString("Test'; DROP TABLE users;--")).toBe('Test DROP TABLE users--');
    });

    it('should preserve normal strings', () => {
      expect(sanitizeString('normal string 123')).toBe('normal string 123');
      expect(sanitizeString('test@example.com')).toBe('test@example.com');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize all string values in object', () => {
      const input = {
        name: '<b>test</b>',
        email: 'test<script></script>@example.com',
        nested: {
          value: 'nested<script>alert(1)</script>',
        },
        number: 123,
        bool: true,
      };

      const result = sanitizeObject(input);
      expect(result.name).toBe('btest/b');
      expect(result.email).toBe('testscript/example.com');
      expect(result.nested.value).toBe('nestedalert(1)/script');
      expect(result.number).toBe(123);
      expect(result.bool).toBe(true);
    });
  });
});

describe('Canonical Event Types', () => {
  it('should have all required event types defined', () => {
    const requiredTypes = [
      'tenant.created',
      'workspace.created',
      'affiliate_link.ingested',
      'merchant.extracted',
      'offer.detected',
      'page.generated',
      'page.published',
      'lead.captured',
      'lead.scored',
      'crm.deal.created',
      'message.drafted',
      'message.sent',
      'message.blocked',
      'consent.recorded',
      'suppression.updated',
      'reward.earned',
      'payout.requested',
      'agent.run_started',
      'agent.run_completed',
      'agent.run_failed',
      'policy.action_blocked',
      'audit.event_recorded',
    ];

    for (const eventType of requiredTypes) {
      expect(CANONICAL_EVENT_TYPES).toContain(eventType);
    }
  });
});
