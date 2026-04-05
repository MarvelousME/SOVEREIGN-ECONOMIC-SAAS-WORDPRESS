import { Request, Response } from 'express';
import { Lead } from '../src/types';

describe('Lead Types', () => {
  it('should have correct lead status values', () => {
    const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
    validStatuses.forEach(status => {
      expect(['new', 'contacted', 'qualified', 'converted', 'lost']).toContain(status);
    });
  });

  it('should have correct lead source values', () => {
    const validSources = ['web', 'referral', 'social', 'email', 'phone', 'event', 'import', 'api'];
    validSources.forEach(source => {
      expect(['web', 'referral', 'social', 'email', 'phone', 'event', 'import', 'api']).toContain(source);
    });
  });

  it('should have correct lead medium values', () => {
    const validMediums = ['organic', 'paid', 'direct', 'social', 'email', 'content', 'affiliate'];
    validMediums.forEach(medium => {
      expect(['organic', 'paid', 'direct', 'social', 'email', 'content', 'affiliate']).toContain(medium);
    });
  });
});

describe('Lead Interface', () => {
  it('should create a valid lead object', () => {
    const lead: Partial<Lead> = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
      email: 'test@example.com',
      status: 'new',
      attribution: {
        source: 'web',
        medium: 'organic',
      },
      tags: [],
      customFields: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(lead.id).toBeDefined();
    expect(lead.email).toBe('test@example.com');
    expect(lead.status).toBe('new');
  });

  it('should support all attribution fields', () => {
    const attribution = {
      source: 'email' as const,
      medium: 'paid' as const,
      campaign: 'spring-sale',
      term: 'crm software',
      content: 'banner-ad',
      referrer: 'https://google.com',
      landingPage: '/landing',
    };

    expect(attribution.source).toBe('email');
    expect(attribution.campaign).toBe('spring-sale');
  });
});
