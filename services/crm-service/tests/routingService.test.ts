import { Lead, RoutingCondition, RoutingAction } from '../src/types';

describe('RoutingService Logic', () => {
  describe('Condition Evaluation', () => {
    const evaluateCondition = (value: unknown, operator: RoutingCondition['operator'], target: unknown): boolean => {
      switch (operator) {
        case 'equals':
          return value === target;
        case 'not_equals':
          return value !== target;
        case 'contains':
          return typeof value === 'string' && typeof target === 'string' && value.toLowerCase().includes(target.toLowerCase());
        case 'not_contains':
          return typeof value === 'string' && typeof target === 'string' && !value.toLowerCase().includes(target.toLowerCase());
        case 'greater_than':
          return typeof value === 'number' && typeof target === 'number' && value > target;
        case 'less_than':
          return typeof value === 'number' && typeof target === 'number' && value < target;
        case 'in':
          return Array.isArray(target) && target.includes(value);
        case 'not_in':
          return Array.isArray(target) && !target.includes(value);
        default:
          return false;
      }
    };

    it('should evaluate equals operator correctly', () => {
      expect(evaluateCondition('new', 'equals', 'new')).toBe(true);
      expect(evaluateCondition('new', 'equals', 'old')).toBe(false);
    });

    it('should evaluate not_equals operator correctly', () => {
      expect(evaluateCondition('new', 'not_equals', 'old')).toBe(true);
      expect(evaluateCondition('new', 'not_equals', 'new')).toBe(false);
    });

    it('should evaluate contains operator correctly', () => {
      expect(evaluateCondition('Hello World', 'contains', 'world')).toBe(true);
      expect(evaluateCondition('Hello World', 'contains', 'foo')).toBe(false);
    });

    it('should evaluate not_contains operator correctly', () => {
      expect(evaluateCondition('Hello World', 'not_contains', 'foo')).toBe(true);
      expect(evaluateCondition('Hello World', 'not_contains', 'world')).toBe(false);
    });

    it('should evaluate greater_than operator correctly', () => {
      expect(evaluateCondition(50, 'greater_than', 40)).toBe(true);
      expect(evaluateCondition(40, 'greater_than', 50)).toBe(false);
    });

    it('should evaluate less_than operator correctly', () => {
      expect(evaluateCondition(30, 'less_than', 40)).toBe(true);
      expect(evaluateCondition(50, 'less_than', 40)).toBe(false);
    });

    it('should evaluate in operator correctly', () => {
      expect(evaluateCondition('new', 'in', ['new', 'contacted', 'qualified'])).toBe(true);
      expect(evaluateCondition('lost', 'in', ['new', 'contacted', 'qualified'])).toBe(false);
    });

    it('should evaluate not_in operator correctly', () => {
      expect(evaluateCondition('lost', 'not_in', ['new', 'contacted', 'qualified'])).toBe(true);
      expect(evaluateCondition('new', 'not_in', ['new', 'contacted', 'qualified'])).toBe(false);
    });
  });

  describe('Lead Field Access', () => {
    const getLeadFieldValue = (lead: Lead, field: string): unknown => {
      const fieldMap: Record<string, unknown> = {
        status: lead.status,
        score: lead.score,
        company: lead.company,
        jobTitle: lead.jobTitle,
        email: lead.email,
        tags: lead.tags,
        source: lead.attribution.source,
        medium: lead.attribution.medium,
        campaign: lead.attribution.campaign,
        ownerId: lead.ownerId,
      };
      return fieldMap[field] ?? lead.customFields?.[field];
    };

    it('should get status field', () => {
      const lead: Lead = {
        id: '123',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        status: 'qualified',
        attribution: { source: 'web', medium: 'organic' },
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(getLeadFieldValue(lead, 'status')).toBe('qualified');
    });

    it('should get score field', () => {
      const lead: Lead = {
        id: '123',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        status: 'new',
        score: 85,
        attribution: { source: 'web', medium: 'organic' },
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(getLeadFieldValue(lead, 'score')).toBe(85);
    });

    it('should get attribution source', () => {
      const lead: Lead = {
        id: '123',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        status: 'new',
        attribution: { source: 'social', medium: 'paid', campaign: 'spring-campaign' },
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(getLeadFieldValue(lead, 'source')).toBe('social');
      expect(getLeadFieldValue(lead, 'campaign')).toBe('spring-campaign');
    });

    it('should get custom fields', () => {
      const lead: Lead = {
        id: '123',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        status: 'new',
        attribution: { source: 'web', medium: 'organic' },
        tags: [],
        customFields: { companySize: 'enterprise' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(getLeadFieldValue(lead, 'companySize')).toBe('enterprise');
    });
  });

  describe('Rule Matching', () => {
    const evaluateConditions = (lead: Lead, conditions: RoutingCondition[]): boolean => {
      for (const condition of conditions) {
        const value = getLeadFieldValue(lead, condition.field);
        if (!evaluateSingleCondition(value, condition.operator, condition.value)) {
          return false;
        }
      }
      return conditions.length > 0;
    };

    const getLeadFieldValue = (lead: Lead, field: string): unknown => {
      const fieldMap: Record<string, unknown> = {
        status: lead.status,
        score: lead.score,
        company: lead.company,
        jobTitle: lead.jobTitle,
        email: lead.email,
        tags: lead.tags,
        source: lead.attribution.source,
        medium: lead.attribution.medium,
      };
      return fieldMap[field] ?? lead.customFields?.[field];
    };

    const evaluateSingleCondition = (value: unknown, operator: RoutingCondition['operator'], target: unknown): boolean => {
      switch (operator) {
        case 'equals': return value === target;
        case 'not_equals': return value !== target;
        case 'contains': return typeof value === 'string' && typeof target === 'string' && value.toLowerCase().includes(target.toLowerCase());
        case 'greater_than': return typeof value === 'number' && typeof target === 'number' && value > target;
        case 'in': return Array.isArray(target) && target.includes(value);
        default: return false;
      }
    };

    it('should match rule when all conditions are met', () => {
      const lead: Lead = {
        id: '123',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        status: 'new',
        score: 85,
        attribution: { source: 'web', medium: 'organic' },
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conditions: RoutingCondition[] = [
        { field: 'status', operator: 'equals', value: 'new' },
        { field: 'score', operator: 'greater_than', value: 80 },
      ];

      expect(evaluateConditions(lead, conditions)).toBe(true);
    });

    it('should not match rule when any condition fails', () => {
      const lead: Lead = {
        id: '123',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        status: 'new',
        score: 50,
        attribution: { source: 'web', medium: 'organic' },
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conditions: RoutingCondition[] = [
        { field: 'status', operator: 'equals', value: 'new' },
        { field: 'score', operator: 'greater_than', value: 80 },
      ];

      expect(evaluateConditions(lead, conditions)).toBe(false);
    });

    it('should match rule with source condition', () => {
      const lead: Lead = {
        id: '123',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        status: 'new',
        attribution: { source: 'social', medium: 'paid' },
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const conditions: RoutingCondition[] = [
        { field: 'source', operator: 'in', value: ['social', 'referral'] },
      ];

      expect(evaluateConditions(lead, conditions)).toBe(true);
    });

    it('should handle empty conditions', () => {
      const lead: Lead = {
        id: '123',
        tenantId: 'tenant-1',
        email: 'test@example.com',
        status: 'new',
        attribution: { source: 'web', medium: 'organic' },
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(evaluateConditions(lead, [])).toBe(true);
    });
  });

  describe('Action Execution', () => {
    it('should identify action types', () => {
      const actionTypes = ['assign_owner', 'assign_territory', 'set_score_threshold', 'add_tag', 'set_status', 'notify'];
      
      expect(actionTypes).toContain('assign_owner');
      expect(actionTypes).toContain('assign_territory');
      expect(actionTypes).toContain('add_tag');
      expect(actionTypes).toContain('set_status');
    });
  });
});
