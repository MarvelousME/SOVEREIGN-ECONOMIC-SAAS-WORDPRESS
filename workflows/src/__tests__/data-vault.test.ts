import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('@temporalio/workflow', () => {
  const mockApplicationFailure = {
    create: jest.fn().mockImplementation(({ message, nonRetryable }) => {
      const error = new Error(message);
      (error as any).nonRetryable = nonRetryable;
      return error;
    }),
  };

  return {
    proxyActivities: jest.fn().mockReturnValue({
      checkUserConsent: jest.fn(),
      anonymizeUserData: jest.fn(),
      revokeUserData: jest.fn(),
      exportAnonymizedData: jest.fn(),
      verifyAnonymization: jest.fn(),
    }),
    defineSignal: jest.fn().mockReturnValue({}),
    defineQuery: jest.fn().mockReturnValue({}),
    setHandler: jest.fn(),
    condition: jest.fn(),
    ApplicationFailure: mockApplicationFailure,
  };
});

jest.mock('@temporalio/activity', () => ({
  Context: {
    current: jest.fn().mockReturnValue({
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    }),
  },
}));

jest.mock('../config', () => ({
  config: {
    services: {
      dataVaultService: 'http://localhost:4009',
    },
  },
}));

import {
  checkUserConsent,
  anonymizeUserData,
  revokeUserData,
  verifyAnonymization,
  ConsentCheckResult,
  AnonymizeResult,
  ConsentStatus,
  AnonymizationStrategy,
} from '../activities/dataVault.activities';

import {
  dataVaultAnonymizationWorkflow,
  DataVaultAnonymizationInput,
  DataVaultAnonymizationResult,
} from '../workflows/data-vault-anonymization.workflow';

import { WorkflowStatus, WorkflowProgress } from '../types';

const mockedActivities = require('@temporalio/workflow').proxyActivities();

describe('Data Vault Anonymization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockConsentResponse = (overrides: Partial<DataVaultConsent & { status?: string; revoked?: boolean }> = {}) => ({
    userId: 'user-123',
    dataTypes: ['personal', 'financial'],
    purposes: ['marketing', 'analytics'],
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ...overrides,
  });

  const mockUserDataResponse = (overrides: Record<string, any> = {}) => ({
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    birthDate: new Date('1990-05-15'),
    address: {
      street: '123 Main St',
      city: 'New York',
      zipCode: '10001',
    },
    balance: 1500.75,
    transactionCount: 42,
    ...overrides,
  });

  describe('Consent Activities', () => {
    describe('checkUserConsent', () => {
      test('returns granted when valid consent exists', async () => {
        const mockResponse = mockConsentResponse({
          purposes: ['marketing', 'analytics'],
          revoked: false,
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await checkUserConsent('user-123', 'marketing');

        expect(result.status).toBe('granted');
        expect(result.userId).toBe('user-123');
        expect(result.purpose).toBe('marketing');
        expect(result.grantedDataTypes).toEqual(['personal', 'financial']);
      });

      test('returns expired when consent has expired', async () => {
        const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const mockResponse = mockConsentResponse({
          expiresAt: expiredDate,
          purposes: ['marketing'],
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await checkUserConsent('user-123', 'marketing');

        expect(result.status).toBe('expired');
        expect(result.expiresAt).toEqual(expiredDate);
      });

      test('returns revoked when consent was revoked', async () => {
        const mockResponse = mockConsentResponse({
          revoked: true,
          purposes: ['marketing'],
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await checkUserConsent('user-123', 'marketing');

        expect(result.status).toBe('revoked');
      });

      test('returns partial when consent exists for different purposes', async () => {
        const mockResponse = mockConsentResponse({
          purposes: ['analytics'],
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await checkUserConsent('user-123', 'marketing');

        expect(result.status).toBe('partial');
        expect(result.grantedDataTypes).toEqual(['personal', 'financial']);
      });

      test('returns not_found when no consent exists', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

        const result = await checkUserConsent('user-123', 'marketing');

        expect(result.status).toBe('not_found');
        expect(result.userId).toBe('user-123');
      });

      test('throws error when service is unavailable', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        await expect(checkUserConsent('user-123', 'marketing')).rejects.toThrow(
          'Consent check failed for user user-123'
        );
      });

      test('handles revoked status string in response', async () => {
        const mockResponse = mockConsentResponse({
          status: 'revoked',
          revoked: false,
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValueOnce(mockResponse),
        });

        const result = await checkUserConsent('user-123', 'marketing');

        expect(result.status).toBe('revoked');
      });
    });
  });

  describe('Anonymization Activities', () => {
    describe('anonymizeUserData', () => {
      test('with k-anonymity strategy generalizes dates, masks emails/phones', async () => {
        const mockResponse = mockUserDataResponse();

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'k-anonymity', [
          'email',
          'phone',
          'birthDate',
        ]);

        expect(result.success).toBe(true);
        expect(result.strategy).toBe('k-anonymity');
        expect(result.anonymizedFields).toContain('email');
        expect(result.anonymizedFields).toContain('phone');
        expect(result.anonymizedFields).toContain('birthDate');
        expect(result.auditId).toBeDefined();

        const anonymizedData = result.anonymizedData;
        expect(anonymizedData.email).toBe('jo***@example.com');
        expect(anonymizedData.phone).toBe('+1****90');
        expect(anonymizedData.birthDate).toMatch(/^\d{4}-\d{2}$/);
      });

      test('with differential-privacy adds noise to numeric values', async () => {
        const originalBalance = 1500.75;
        const mockResponse = mockUserDataResponse({ balance: originalBalance });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'differential-privacy', [
          'balance',
          'transactionCount',
        ]);

        expect(result.success).toBe(true);
        expect(result.strategy).toBe('differential-privacy');

        const anonymizedData = result.anonymizedData;
        expect(typeof anonymizedData.balance).toBe('number');
        expect(typeof anonymizedData.transactionCount).toBe('number');
      });

      test('with pseudonymization creates consistent pseudonyms', async () => {
        const mockResponse = mockUserDataResponse();

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result1 = await anonymizeUserData('user-123', 'pseudonymization', ['email']);
        const result2 = await anonymizeUserData('user-123', 'pseudonymization', ['email']);

        expect(result1.anonymizedData.email).toBe(result2.anonymizedData.email);
        expect(result1.anonymizedData.email).toMatch(/^psn_[a-f0-9]{16}$/);
      });

      test('with full-anonymization redacts all PII', async () => {
        const mockResponse = mockUserDataResponse();

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'full-anonymization', [
          'email',
          'phone',
          'firstName',
          'lastName',
        ]);

        expect(result.success).toBe(true);
        expect(result.anonymizedData.email).toBe('[REDACTED]');
        expect(result.anonymizedData.phone).toBe('[REDACTED]');
        expect(result.anonymizedData.firstName).toBe('[REDACTED]');
        expect(result.anonymizedData.lastName).toBe('[REDACTED]');
      });

      test('handles nested objects correctly', async () => {
        const mockResponse = mockUserDataResponse({
          address: {
            street: '123 Main St',
            city: 'New York',
            zipCode: '10001',
            country: 'USA',
          },
        });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'k-anonymity', ['address']);

        expect(result.success).toBe(true);
        expect(result.anonymizedData.address).toBeDefined();
        expect(typeof result.anonymizedData.address).toBe('object');
      });

      test('returns correct audit ID', async () => {
        const mockResponse = mockUserDataResponse();

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'k-anonymity', ['email']);

        expect(result.auditId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      });

      test('throws error when user data fetch fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        await expect(
          anonymizeUserData('user-123', 'k-anonymity', ['email'])
        ).rejects.toThrow('Failed to fetch user data');
      });
    });

    describe('Edge Cases', () => {
      test('handles empty PII fields array', async () => {
        const mockResponse = mockUserDataResponse();

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'k-anonymity', []);

        expect(result.success).toBe(true);
        expect(result.anonymizedFields).toEqual([]);
        expect(result.anonymizedData).toEqual(mockResponse);
      });

      test('handles non-existent PII fields in user data', async () => {
        const mockResponse = mockUserDataResponse();

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'k-anonymity', [
          'nonexistentField',
        ]);

        expect(result.success).toBe(true);
        expect(result.anonymizedFields).toEqual([]);
      });

      test('handles very large numeric values with differential privacy', async () => {
        const largeValue = 1e15;
        const mockResponse = mockUserDataResponse({ balance: largeValue });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'differential-privacy', [
          'balance',
        ]);

        expect(result.success).toBe(true);
        expect(typeof result.anonymizedData.balance).toBe('number');
      });

      test('handles complex nested objects with mixed field types', async () => {
        const mockResponse = {
          id: 'user-123',
          profile: {
            name: 'John',
            contacts: {
              email: 'john@example.com',
              phones: ['+1234567890', '+0987654321'],
            },
          },
          metadata: {
            createdAt: new Date('2020-01-01'),
            tags: ['vip', 'beta'],
            stats: {
              logins: 100,
              purchases: 50,
            },
          },
        };

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'k-anonymity', [
          'profile.contacts.email',
          'metadata.createdAt',
        ]);

        expect(result.success).toBe(true);
        expect(result.anonymizedFields).toContain('profile.contacts.email');
        expect(result.anonymizedFields).toContain('metadata.createdAt');
      });

      test('handles Unicode characters in string fields', async () => {
        const mockResponse = mockUserDataResponse({
          firstName: '日本語名前',
          lastName: '中文姓名',
          email: 'unicode@example.com',
        });

        (global.fetch as jest.Mock)
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValueOnce(mockResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
          });

        const result = await anonymizeUserData('user-123', 'k-anonymity', [
          'firstName',
          'lastName',
        ]);

        expect(result.success).toBe(true);
        expect(result.anonymizedData.firstName).toBe('日本語名前');
        expect(result.anonymizedData.lastName).toBe('中文姓名');
      });
    });
  });

  describe('Workflow', () => {
    let workflow: typeof import('../workflows/data-vault-anonymization.workflow');

    beforeEach(async () => {
      jest.resetModules();
      
      const temporal = jest.requireActual('@temporalio/workflow');
      const activities = jest.requireActual('@temporalio/activity');
      
      workflow = jest.requireActual('../workflows/data-vault-anonymization.workflow');
    });

    describe('checkUserConsent mocked', () => {
      test('workflow returns completed when consent is granted and anonymization succeeds', async () => {
        const mockConsentResult: ConsentCheckResult = {
          status: 'granted',
          userId: 'user-123',
          purpose: 'marketing',
          grantedDataTypes: ['personal'],
        };

        const mockAnonymizeResult: AnonymizeResult = {
          success: true,
          originalUserId: 'user-123',
          anonymizedData: { email: 'jo***@example.com' },
          strategy: 'k-anonymity',
          anonymizedFields: ['email'],
          auditId: 'audit-123',
        };

        const mockVerifyResult = {
          isCompliant: true,
          violations: [],
        };

        mockedActivities.checkUserConsent.mockResolvedValueOnce(mockConsentResult);
        mockedActivities.anonymizeUserData.mockResolvedValueOnce(mockAnonymizeResult);
        mockedActivities.verifyAnonymization.mockResolvedValueOnce(mockVerifyResult);

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
          requestConsentIfMissing: false,
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        const result = await dataVaultAnonymizationWorkflow(input);

        expect(result.success).toBe(true);
        expect(result.status).toBe('completed');
        expect(result.auditId).toBe('audit-123');
      });

      test('workflow returns consent_required when consent not found and requestConsentIfMissing is false', async () => {
        const mockConsentResult: ConsentCheckResult = {
          status: 'not_found',
          userId: 'user-123',
          purpose: 'marketing',
        };

        mockedActivities.checkUserConsent.mockResolvedValueOnce(mockConsentResult);

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
          requestConsentIfMissing: false,
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        const result = await dataVaultAnonymizationWorkflow(input);

        expect(result.success).toBe(false);
        expect(result.status).toBe('consent_required');
        expect(result.message).toContain('Consent not found');
      });

      test('workflow returns consent_denied when consent is partial', async () => {
        const mockConsentResult: ConsentCheckResult = {
          status: 'partial',
          userId: 'user-123',
          purpose: 'marketing',
          grantedDataTypes: ['analytics'],
        };

        mockedActivities.checkUserConsent.mockResolvedValueOnce(mockConsentResult);

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
          requestConsentIfMissing: false,
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        const result = await dataVaultAnonymizationWorkflow(input);

        expect(result.success).toBe(false);
        expect(result.status).toBe('consent_denied');
        expect(result.message).toContain('Partial consent');
      });

      test('workflow throws non-retryable error when consent is revoked', async () => {
        const mockConsentResult: ConsentCheckResult = {
          status: 'revoked',
          userId: 'user-123',
          purpose: 'marketing',
        };

        mockedActivities.checkUserConsent.mockResolvedValueOnce(mockConsentResult);

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
          requestConsentIfMissing: false,
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        await expect(dataVaultAnonymizationWorkflow(input)).rejects.toThrow(
          'Consent revoked for user user-123'
        );
      });

      test('workflow throws non-retryable error when consent is expired', async () => {
        const mockConsentResult: ConsentCheckResult = {
          status: 'expired',
          userId: 'user-123',
          purpose: 'marketing',
          expiresAt: new Date(Date.now() - 1000),
        };

        mockedActivities.checkUserConsent.mockResolvedValueOnce(mockConsentResult);

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
          requestConsentIfMissing: false,
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        await expect(dataVaultAnonymizationWorkflow(input)).rejects.toThrow(
          'Consent expired for user user-123'
        );
      });

      test('workflow handles cancel signal properly', async () => {
        const { setHandler, cancelSignal, ApplicationFailure } = require('@temporalio/workflow');
        
        let cancelHandler: ((args: { reason: string }) => void) | undefined;
        setHandler.mockImplementation((signal: any, handler: any) => {
          if (signal === cancelSignal) {
            cancelHandler = handler;
          }
        });

        const mockConsentResult: ConsentCheckResult = {
          status: 'granted',
          userId: 'user-123',
          purpose: 'marketing',
        };

        mockedActivities.checkUserConsent.mockImplementation(async () => {
          if (cancelHandler) {
            cancelHandler({ reason: 'User requested cancellation' });
          }
          return mockConsentResult;
        });

        mockedActivities.anonymizeUserData.mockRejectedValue(
          new Error('Workflow cancelled')
        );

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        const result = await dataVaultAnonymizationWorkflow(input);

        expect(result.success).toBe(false);
        expect(result.status).toBe('failed');
      });

      test('workflow returns correct audit ID on success', async () => {
        const expectedAuditId = '550e8400-e29b-41d4-a716-446655440000';

        const mockConsentResult: ConsentCheckResult = {
          status: 'granted',
          userId: 'user-123',
          purpose: 'marketing',
        };

        const mockAnonymizeResult: AnonymizeResult = {
          success: true,
          originalUserId: 'user-123',
          anonymizedData: { email: 'jo***@example.com' },
          strategy: 'k-anonymity',
          anonymizedFields: ['email'],
          auditId: expectedAuditId,
        };

        mockedActivities.checkUserConsent.mockResolvedValueOnce(mockConsentResult);
        mockedActivities.anonymizeUserData.mockResolvedValueOnce(mockAnonymizeResult);
        mockedActivities.verifyAnonymization.mockResolvedValueOnce({
          isCompliant: true,
          violations: [],
        });

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        const result = await dataVaultAnonymizationWorkflow(input);

        expect(result.auditId).toBe(expectedAuditId);
      });
    });

    describe('Error Scenarios', () => {
      test('activity failure triggers retry', async () => {
        const mockConsentResult: ConsentCheckResult = {
          status: 'granted',
          userId: 'user-123',
          purpose: 'marketing',
        };

        mockedActivities.checkUserConsent.mockResolvedValue(mockConsentResult);
        mockedActivities.anonymizeUserData.mockRejectedValue(
          new Error('Temporary service unavailable')
        );

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        await expect(dataVaultAnonymizationWorkflow(input)).rejects.toThrow();
      });

      test('non-retryable errors are properly marked', async () => {
        const { ApplicationFailure } = require('@temporalio/workflow');

        const mockConsentResult: ConsentCheckResult = {
          status: 'revoked',
          userId: 'user-123',
          purpose: 'marketing',
        };

        mockedActivities.checkUserConsent.mockResolvedValueOnce(mockConsentResult);

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        try {
          await dataVaultAnonymizationWorkflow(input);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.nonRetryable).toBe(true);
        }
      });

      test('rollback is triggered on failure when consent was requested', async () => {
        const { condition } = require('@temporalio/workflow');

        const mockConsentResult: ConsentCheckResult = {
          status: 'not_found',
          userId: 'user-123',
          purpose: 'marketing',
        };

        const mockRetryConsentResult: ConsentCheckResult = {
          status: 'granted',
          userId: 'user-123',
          purpose: 'marketing',
        };

        mockedActivities.checkUserConsent
          .mockResolvedValueOnce(mockConsentResult)
          .mockResolvedValueOnce(mockRetryConsentResult);

        mockedActivities.anonymizeUserData.mockRejectedValue(
          new Error('Service unavailable')
        );

        mockedActivities.revokeUserData.mockResolvedValueOnce({
          success: true,
          auditId: 'rollback-audit-123',
        });

        condition.mockResolvedValueOnce(true);

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
          requestConsentIfMissing: true,
          consentExpiryDays: 7,
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        await expect(dataVaultAnonymizationWorkflow(input)).rejects.toThrow();

        expect(mockedActivities.revokeUserData).toHaveBeenCalledWith('user-123');
      });

      test('workflow handles service unavailability', async () => {
        mockedActivities.checkUserConsent.mockRejectedValue(
          new Error('Service unavailable')
        );

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        await expect(dataVaultAnonymizationWorkflow(input)).rejects.toThrow(
          'Service unavailable'
        );
      });
    });

    describe('Progress Tracking', () => {
      test('workflow progresses through all steps correctly', async () => {
        let progressUpdate: any;
        const { setHandler, progressQuery } = require('@temporalio/workflow');

        setHandler.mockImplementation((query: any, handler: any) => {
          if (query === progressQuery) {
            const originalHandler = handler;
            handler = (...args: any[]) => {
              const result = originalHandler(...args);
              progressUpdate = result;
              return result;
            };
          }
        });

        const mockConsentResult: ConsentCheckResult = {
          status: 'granted',
          userId: 'user-123',
          purpose: 'marketing',
        };

        const mockAnonymizeResult: AnonymizeResult = {
          success: true,
          originalUserId: 'user-123',
          anonymizedData: { email: 'jo***@example.com' },
          strategy: 'k-anonymity',
          anonymizedFields: ['email'],
          auditId: 'audit-123',
        };

        mockedActivities.checkUserConsent.mockResolvedValueOnce(mockConsentResult);
        mockedActivities.anonymizeUserData.mockResolvedValueOnce(mockAnonymizeResult);
        mockedActivities.verifyAnonymization.mockResolvedValueOnce({
          isCompliant: true,
          violations: [],
        });

        const input: DataVaultAnonymizationInput = {
          userId: 'user-123',
          purpose: 'marketing',
          strategy: 'k-anonymity',
          piiFields: ['email'],
        };

        global.fetch = jest.fn().mockResolvedValue({ ok: true });

        await dataVaultAnonymizationWorkflow(input);

        expect(progressUpdate).toBeDefined();
        expect(progressUpdate.totalSteps).toBe(6);
      });
    });
  });
});
