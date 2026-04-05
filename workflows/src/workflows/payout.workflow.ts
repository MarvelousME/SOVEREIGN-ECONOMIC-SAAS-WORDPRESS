import { proxyActivities, ApplicationFailure, defineQuery, setHandler } from '@temporalio/workflow';
import type * as activities from '../activities/payout.activities';
import type * as ubiActivities from '../activities/ubi.activities';
import { DEFAULT_RETRY_POLICY, PayoutRequest, WorkflowStatus } from '../types';

const {
  validatePayoutRequest,
  checkDailyLimit,
  lockFunds,
  unlockFunds,
  processPayment,
  sendPayoutConfirmation,
  holdForManualReview,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m',
  retry: {
    ...DEFAULT_RETRY_POLICY,
    maximumAttempts: 3, // Fewer retries for payments
  },
});

const { createLedgerTransaction } = proxyActivities<typeof ubiActivities>({
  startToCloseTimeout: '2m',
  retry: DEFAULT_RETRY_POLICY,
});

export const statusQuery = defineQuery<WorkflowStatus>('status');

export async function payoutWorkflow(request: PayoutRequest): Promise<{
  success: boolean;
  txId?: string;
  held?: boolean;
}> {
  let currentStep = 'validating';
  let lockId: string | null = null;

  setHandler(statusQuery, () => ({ state: 'running', currentStep }));

  try {
    // Step 1: Validate payout request
    const isValid = await validatePayoutRequest(request);
    if (!isValid) {
      throw ApplicationFailure.create({
        message: 'Invalid payout request',
        nonRetryable: true,
      });
    }

    // Step 2: Check OPA policies (daily limits)
    currentStep = 'checking_limits';
    const withinLimit = await checkDailyLimit(request.userId, request.amount);
    if (!withinLimit) {
      await holdForManualReview(request, 'Daily limit exceeded');
      return { success: false, held: true };
    }

    // Step 3: Lock funds
    currentStep = 'locking_funds';
    lockId = await lockFunds(request.userId, request.amount);

    // Step 4: Process payment via payment rail
    currentStep = 'processing_payment';
    let paymentResult;
    try {
      paymentResult = await processPayment(request);
    } catch (error) {
      // Unlock funds on payment failure
      if (lockId) {
        await unlockFunds(lockId);
      }
      
      // Hold for manual review after max retries
      await holdForManualReview(request, `Payment failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, held: true };
    }

    // Step 5: Update ledger
    currentStep = 'updating_ledger';
    await createLedgerTransaction(request.userId, -request.amount, 'payout', {
      payoutId: request.id,
      txId: paymentResult.txId,
      paymentRail: request.paymentRail,
    });

    // Step 6: Send confirmation notification
    currentStep = 'sending_confirmation';
    await sendPayoutConfirmation(request.userId, request.id, request.amount);

    currentStep = 'completed';
    return { success: true, txId: paymentResult.txId };
  } catch (error) {
    // Cleanup: unlock funds if locked
    if (lockId) {
      try {
        await unlockFunds(lockId);
      } catch {}
    }

    throw ApplicationFailure.create({
      message: `Payout workflow failed: ${error instanceof Error ? error.message : String(error)}`,
      nonRetryable: false,
    });
  }
}
