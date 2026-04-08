import { Context } from '@temporalio/activity';
import { config } from '../config';
import { DataVaultConsent } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type ConsentStatus = 'granted' | 'expired' | 'revoked' | 'partial' | 'not_found';

export interface ConsentCheckResult {
  status: ConsentStatus;
  userId: string;
  purpose: string;
  expiresAt?: Date;
  grantedDataTypes?: string[];
}

export type AnonymizationStrategy = 'k-anonymity' | 'differential-privacy' | 'pseudonymization' | 'full-anonymization';

export interface AnonymizeResult {
  success: boolean;
  originalUserId: string;
  anonymizedData: Record<string, any>;
  strategy: AnonymizationStrategy;
  anonymizedFields: string[];
  auditId: string;
}

const DATA_VAULT_SERVICE_URL = config.services.dataVaultService || 'http://localhost:4009';

export async function checkUserConsent(userId: string, purpose: string): Promise<ConsentCheckResult> {
  const activityLogger = Context.current().log;

  activityLogger.info(`Checking consent for user ${userId}, purpose: ${purpose}`);

  try {
    const response = await fetch(`${DATA_VAULT_SERVICE_URL}/api/consent/${userId}`);

    if (response.status === 404) {
      activityLogger.warn(`Consent not found for user ${userId}`);
      return {
        status: 'not_found',
        userId,
        purpose,
      };
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch consent: ${response.statusText}`);
    }

    const consent: DataVaultConsent & { status?: string; revoked?: boolean } = await response.json();

    if (consent.revoked || consent.status === 'revoked') {
      activityLogger.info(`Consent revoked for user ${userId}, purpose: ${purpose}`);
      return {
        status: 'revoked',
        userId,
        purpose,
        expiresAt: consent.expiresAt ? new Date(consent.expiresAt) : undefined,
        grantedDataTypes: consent.dataTypes,
      };
    }

    if (consent.expiresAt) {
      const expiresAt = new Date(consent.expiresAt);
      if (expiresAt < new Date()) {
        activityLogger.info(`Consent expired for user ${userId}, purpose: ${purpose}, expired at: ${expiresAt.toISOString()}`);
        return {
          status: 'expired',
          userId,
          purpose,
          expiresAt,
          grantedDataTypes: consent.dataTypes,
        };
      }
    }

    if (!consent.purposes || !consent.purposes.includes(purpose)) {
      activityLogger.info(`Partial consent for user ${userId}: granted for ${consent.purposes?.join(', ') || 'none'}, requested: ${purpose}`);
      return {
        status: 'partial',
        userId,
        purpose,
        expiresAt: consent.expiresAt ? new Date(consent.expiresAt) : undefined,
        grantedDataTypes: consent.dataTypes,
      };
    }

    activityLogger.info(`Consent granted for user ${userId}, purpose: ${purpose}`);
    return {
      status: 'granted',
      userId,
      purpose,
      expiresAt: consent.expiresAt ? new Date(consent.expiresAt) : undefined,
      grantedDataTypes: consent.dataTypes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    activityLogger.error(`Error checking consent for user ${userId}: ${errorMessage}`);
    throw new Error(`Consent check failed for user ${userId}: ${errorMessage}`);
  }
}

interface PseudonymMapping {
  [fieldValue: string]: string;
}

const pseudonymMappings: Map<string, PseudonymMapping> = new Map();

function getPseudonym(fieldName: string, originalValue: string): string {
  if (!pseudonymMappings.has(fieldName)) {
    pseudonymMappings.set(fieldName, {});
  }
  const mapping = pseudonymMappings.get(fieldName)!;
  if (!mapping[originalValue]) {
    mapping[originalValue] = `psn_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  }
  return mapping[originalValue];
}

function generalizeDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function generalizeAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.floor(age / 5) * 5;
}

function generalizeNumeric(value: number, precision: number): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value / multiplier) * multiplier;
}

function addDifferentialPrivacyNoise(value: number, epsilon: number = 1.0): number {
  const scale = 1.0 / epsilon;
  const noise = (Math.random() + Math.random() - 1) * scale * 2;
  return value + noise;
}

function anonymizeFieldByStrategy(
  value: any,
  strategy: AnonymizationStrategy,
  fieldName: string
): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    switch (strategy) {
      case 'k-anonymity':
        return generalizeDate(value);
      case 'full-anonymization':
        return '[REDACTED]';
      default:
        return value.toISOString();
    }
  }

  if (typeof value === 'string') {
    if (strategy === 'full-anonymization') {
      return '[REDACTED]';
    }
    if (strategy === 'pseudonymization') {
      return getPseudonym(fieldName, value);
    }
    if (strategy === 'k-anonymity') {
      if (fieldName.toLowerCase().includes('email')) {
        const parts = value.split('@');
        if (parts.length === 2) {
          const domain = parts[1];
          const username = parts[0].substring(0, 2) + '***';
          return `${username}@${domain}`;
        }
      }
      if (fieldName.toLowerCase().includes('phone')) {
        return value.substring(0, 3) + '****' + value.substring(value.length - 2);
      }
      return value;
    }
    return value;
  }

  if (typeof value === 'number') {
    switch (strategy) {
      case 'differential-privacy':
        return addDifferentialPrivacyNoise(value);
      case 'k-anonymity':
        return generalizeNumeric(value, 2);
      case 'full-anonymization':
        return '[REDACTED]';
      default:
        return value;
    }
  }

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        anonymizeFieldByStrategy(item, strategy, `${fieldName}[${index}]`)
      );
    }
    const anonymized: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      anonymized[key] = anonymizeFieldByStrategy(val, strategy, key);
    }
    return anonymized;
  }

  return value;
}

export async function anonymizeUserData(
  userId: string,
  strategy: AnonymizationStrategy,
  piiFields: string[]
): Promise<AnonymizeResult> {
  const activityLogger = Context.current().log;
  const auditId = uuidv4();

  activityLogger.info(`Starting anonymization for user ${userId} with strategy ${strategy}`, {
    auditId,
    piiFields,
  });

  try {
    const response = await fetch(`${DATA_VAULT_SERVICE_URL}/api/users/${userId}/data`);

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }

    const userData = await response.json();
    const anonymizedData: Record<string, any> = {};
    const anonymizedFields: string[] = [];

    for (const field of piiFields) {
      const value = getNestedValue(userData, field);
      if (value !== undefined) {
        anonymizedData[field] = anonymizeFieldByStrategy(value, strategy, field);
        anonymizedFields.push(field);
      }
    }

    for (const [key, value] of Object.entries(userData)) {
      if (!piiFields.includes(key)) {
        anonymizedData[key] = value;
      }
    }

    await logAnonymizationAudit(auditId, userId, strategy, piiFields, anonymizedFields);

    activityLogger.info(`Anonymization completed for user ${userId}`, {
      auditId,
      strategy,
      anonymizedFields,
    });

    return {
      success: true,
      originalUserId: userId,
      anonymizedData,
      strategy,
      anonymizedFields,
      auditId,
    };
  } catch (error) {
    activityLogger.error(`Anonymization failed for user ${userId}: ${error}`, {
      auditId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function logAnonymizationAudit(
  auditId: string,
  userId: string,
  strategy: AnonymizationStrategy,
  requestedFields: string[],
  processedFields: string[]
): Promise<void> {
  const response = await fetch(`${DATA_VAULT_SERVICE_URL}/api/audit/anonymization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auditId,
      userId,
      strategy,
      requestedFields,
      processedFields,
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    Context.current().log.warn(`Failed to log anonymization audit: ${response.statusText}`);
  }
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  return current;
}

export async function revokeUserData(userId: string): Promise<{ success: boolean; auditId: string }> {
  const activityLogger = Context.current().log;
  const auditId = uuidv4();

  activityLogger.info(`Revoking all data for user ${userId}`, { auditId });

  try {
    const response = await fetch(`${DATA_VAULT_SERVICE_URL}/api/users/${userId}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditId, timestamp: new Date().toISOString() }),
    });

    if (!response.ok) {
      throw new Error(`Failed to revoke user data: ${response.statusText}`);
    }

    activityLogger.info(`Data revocation completed for user ${userId}`, { auditId });

    return { success: true, auditId };
  } catch (error) {
    activityLogger.error(`Data revocation failed for user ${userId}: ${error}`, { auditId });
    throw error;
  }
}

export async function exportAnonymizedData(
  userId: string,
  format: 'json' | 'csv' = 'json'
): Promise<{ success: boolean; data: string; auditId: string }> {
  const activityLogger = Context.current().log;
  const auditId = uuidv4();

  activityLogger.info(`Exporting anonymized data for user ${userId} in format ${format}`, { auditId });

  try {
    const response = await fetch(
      `${DATA_VAULT_SERVICE_URL}/api/users/${userId}/export?format=${format}`
    );

    if (!response.ok) {
      throw new Error(`Failed to export user data: ${response.statusText}`);
    }

    const data = await response.json();

    activityLogger.info(`Data export completed for user ${userId}`, { auditId });

    return { success: true, data: typeof data === 'string' ? data : JSON.stringify(data), auditId };
  } catch (error) {
    activityLogger.error(`Data export failed for user ${userId}: ${error}`, { auditId });
    throw error;
  }
}

export async function verifyAnonymization(
  userId: string,
  piiFields: string[]
): Promise<{ isCompliant: boolean; violations: string[] }> {
  const activityLogger = Context.current().log;
  const auditId = uuidv4();

  activityLogger.info(`Verifying anonymization compliance for user ${userId}`, { auditId });

  try {
    const response = await fetch(
      `${DATA_VAULT_SERVICE_URL}/api/users/${userId}/verify-anonymization`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ piiFields, auditId }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to verify anonymization: ${response.statusText}`);
    }

    const result = await response.json();

    activityLogger.info(`Anonymization verification completed for user ${userId}`, {
      auditId,
      isCompliant: result.isCompliant,
    });

    return result;
  } catch (error) {
    activityLogger.error(`Anonymization verification failed for user ${userId}: ${error}`, {
      auditId,
    });
    throw error;
  }
}
