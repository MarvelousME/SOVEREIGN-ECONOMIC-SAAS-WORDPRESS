import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  ApplicationFailure,
} from '@temporalio/workflow';
import type * as dataVaultActivities from '../activities/dataVault.activities';
import { DEFAULT_RETRY_POLICY, WorkflowStatus, WorkflowProgress } from '../types';

const {
  checkUserConsent,
  anonymizeUserData,
  revokeUserData,
  exportAnonymizedData,
  verifyAnonymization,
} = proxyActivities<typeof dataVaultActivities>({
  startToCloseTimeout: '5m',
  retry: DEFAULT_RETRY_POLICY,
});

export const requestConsentSignal = defineSignal('requestConsent');
export const cancelSignal = defineSignal<[{ reason: string }]>('cancel');

export const statusQuery = defineQuery<WorkflowStatus>('status');
export const progressQuery = defineQuery<WorkflowProgress>('progress');

export type AnonymizationStrategy = 'k-anonymity' | 'differential-privacy' | 'pseudonymization' | 'full-anonymization';

export interface DataVaultAnonymizationInput {
  userId: string;
  purpose: string;
  strategy: AnonymizationStrategy;
  piiFields: string[];
  requestConsentIfMissing?: boolean;
  consentExpiryDays?: number;
}

export interface DataVaultAnonymizationResult {
  success: boolean;
  userId: string;
  auditId?: string;
  status: 'completed' | 'consent_required' | 'consent_denied' | 'failed';
  message?: string;
}

const CONSENT_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

export async function dataVaultAnonymizationWorkflow(
  input: DataVaultAnonymizationInput
): Promise<DataVaultAnonymizationResult> {
  let isCancelled = false;
  let cancelReason = '';
  let currentStep = 'initializing';
  let consentReceived = false;
  let consentRequestInitiated = false;

  const progress: WorkflowProgress = {
    totalSteps: 6,
    completedSteps: 0,
    percentage: 0,
    details: {},
  };

  setHandler(cancelSignal, ({ reason }) => {
    isCancelled = true;
    cancelReason = reason;
  });

  setHandler(requestConsentSignal, () => {
    consentReceived = true;
  });

  setHandler(statusQuery, () => ({
    state: isCancelled ? 'cancelled' : 'running',
    currentStep,
    error: cancelReason || undefined,
  }));

  setHandler(progressQuery, () => progress);

  const checkAndThrowIfCancelled = () => {
    if (isCancelled) {
      throw ApplicationFailure.create({
        message: `Workflow cancelled: ${cancelReason}`,
        nonRetryable: true,
      });
    }
  };

  try {
    checkAndThrowIfCancelled();

    currentStep = 'checking_consent';
    progress.details.consentCheckPurpose = input.purpose;

    const consentResult = await checkUserConsent(input.userId, input.purpose);
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.details.consentStatus = consentResult.status;

    if (consentResult.status === 'not_found') {
      if (input.requestConsentIfMissing) {
        currentStep = 'requesting_consent';
        consentRequestInitiated = true;
        progress.details.consentRequested = true;

        await emitConsentRequestEvent(input.userId, input.purpose);

        const consentTimeout = (input.consentExpiryDays || 7) * 24 * 60 * 60 * 1000;

        const consentGiven = await condition(() => consentReceived || isCancelled, consentTimeout);

        if (!consentGiven) {
          return {
            success: false,
            userId: input.userId,
            status: 'consent_required',
            message: `Consent not received within ${input.consentExpiryDays || 7} days`,
          };
        }

        checkAndThrowIfCancelled();

        currentStep = 'rechecking_consent';
        const retryConsentResult = await checkUserConsent(input.userId, input.purpose);
        progress.details.consentStatus = retryConsentResult.status;

        if (retryConsentResult.status !== 'granted') {
          return {
            success: false,
            userId: input.userId,
            status: 'consent_denied',
            message: `Consent status: ${retryConsentResult.status}`,
          };
        }
      } else {
        return {
          success: false,
          userId: input.userId,
          status: 'consent_required',
          message: 'Consent not found and requestConsentIfMissing is false',
        };
      }
    }

    if (consentResult.status === 'revoked') {
      throw ApplicationFailure.create({
        message: `Consent revoked for user ${input.userId}`,
        nonRetryable: true,
      });
    }

    if (consentResult.status === 'expired') {
      throw ApplicationFailure.create({
        message: `Consent expired for user ${input.userId}`,
        nonRetryable: true,
      });
    }

    if (consentResult.status === 'partial') {
      return {
        success: false,
        userId: input.userId,
        status: 'consent_denied',
        message: 'Partial consent granted, insufficient for requested purpose',
      };
    }

    checkAndThrowIfCancelled();

    currentStep = 'anonymizing_data';
    progress.details.strategy = input.strategy;
    progress.details.piiFields = input.piiFields;

    const anonymizeResult = await anonymizeUserData(input.userId, input.strategy, input.piiFields);
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.details.anonymizationAuditId = anonymizeResult.auditId;

    checkAndThrowIfCancelled();

    currentStep = 'verifying_compliance';

    const verifyResult = await verifyAnonymization(input.userId, input.piiFields);
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.details.isCompliant = verifyResult.isCompliant;

    if (!verifyResult.isCompliant && verifyResult.violations.length > 0) {
      progress.details.complianceViolations = verifyResult.violations;
      throw ApplicationFailure.create({
        message: `Anonymization compliance verification failed: ${verifyResult.violations.join(', ')}`,
        nonRetryable: false,
      });
    }

    checkAndThrowIfCancelled();

    currentStep = 'emitting_anonymization_event';
    await emitAnonymizationEvent(input.userId, anonymizeResult.auditId, input.strategy, input.piiFields);
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;

    checkAndThrowIfCancelled();

    currentStep = 'sending_notifications';
    await sendAnonymizationNotification(input.userId, anonymizeResult.auditId, input.purpose);
    progress.completedSteps++;
    progress.percentage = 100;

    currentStep = 'completed';

    return {
      success: true,
      userId: input.userId,
      auditId: anonymizeResult.auditId,
      status: 'completed',
      message: 'Data anonymization completed successfully',
    };
  } catch (error) {
    if (isCancelled) {
      return {
        success: false,
        userId: input.userId,
        status: 'failed',
        message: `Workflow cancelled: ${cancelReason}`,
      };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNonRetryable = error instanceof ApplicationFailure && error.nonRetryable;

    if (consentRequestInitiated && !isNonRetryable) {
      try {
        await revokeUserData(input.userId);
      } catch {
      }
    }

    throw ApplicationFailure.create({
      message: `Data Vault anonymization failed: ${errorMessage}`,
      nonRetryable: isNonRetryable,
    });
  }
}

async function emitConsentRequestEvent(userId: string, purpose: string): Promise<void> {
  try {
    await fetch('http://localhost:4009/api/events/consent-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        purpose,
        eventType: 'gdpr_consent_requested',
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
  }
}

async function emitAnonymizationEvent(
  userId: string,
  auditId: string,
  strategy: AnonymizationStrategy,
  piiFields: string[]
): Promise<void> {
  try {
    await fetch('http://localhost:4009/api/events/anonymization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        auditId,
        strategy,
        piiFields,
        eventType: 'gdpr_data_anonymized',
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
  }
}

async function sendAnonymizationNotification(
  userId: string,
  auditId: string,
  purpose: string
): Promise<void> {
  try {
    await fetch('http://localhost:4009/api/notifications/anonymization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        auditId,
        purpose,
        eventType: 'gdpr_anonymization_completed',
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
  }
}
