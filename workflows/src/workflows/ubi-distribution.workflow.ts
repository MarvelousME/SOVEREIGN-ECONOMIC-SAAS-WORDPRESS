import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  sleep,
  condition,
  ApplicationFailure,
} from '@temporalio/workflow';
import type * as activities from '../activities/ubi.activities';
import { WorkflowStatus, WorkflowProgress, DEFAULT_RETRY_POLICY } from '../types';

const {
  calculateEligibleUsers,
  calculateDistributionAmounts,
  lockUBIPool,
  unlockUBIPool,
  createLedgerTransaction,
  updateUserBalance,
  emitDistributionEvent,
  sendDistributionNotification,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5m',
  retry: DEFAULT_RETRY_POLICY,
});

export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');
export const cancelSignal = defineSignal<[{ reason: string }]>('cancel');

export const statusQuery = defineQuery<WorkflowStatus>('status');
export const progressQuery = defineQuery<WorkflowProgress>('progress');

export interface UBIDistributionInput {
  distributionId: string;
  dryRun?: boolean;
  /** Passed through to NATS / notification payloads */
  tenantId?: string;
  poolId?: string;
}

export async function ubiDistributionWorkflow(
  input: UBIDistributionInput
): Promise<{ success: boolean; totalDistributed: number; recipientCount: number }> {
  let isPaused = false;
  let isCancelled = false;
  let cancelReason = '';
  let currentStep = 'initializing';
  let lockId: string | null = null;
  
  const progress = {
    totalSteps: 7,
    completedSteps: 0,
    percentage: 0,
    details: {},
  };

  // Signal handlers
  setHandler(pauseSignal, () => {
    isPaused = true;
  });
  
  setHandler(resumeSignal, () => {
    isPaused = false;
  });
  
  setHandler(cancelSignal, ({ reason }) => {
    isCancelled = true;
    cancelReason = reason;
  });

  // Query handlers
  setHandler(statusQuery, () => ({
    state: isCancelled ? 'cancelled' : isPaused ? 'paused' : 'running',
    currentStep,
    error: cancelReason || undefined,
  }));

  setHandler(progressQuery, () => progress);

  try {
    // Check for pause/cancel before each step
    await checkPauseAndCancel();

    // Step 1: Calculate eligible users
    currentStep = 'calculating_eligible_users';
    const users = await calculateEligibleUsers();
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.details.eligibleUsers = users.length;

    if (users.length === 0) {
      return { success: true, totalDistributed: 0, recipientCount: 0 };
    }

    await checkPauseAndCancel();

    // Step 2: Calculate distribution amounts
    currentStep = 'calculating_amounts';
    const amounts = await calculateDistributionAmounts(users);
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;

    const totalAmount = Array.from(amounts.values()).reduce((sum, amt) => sum + amt, 0);
    progress.details.totalAmount = totalAmount;

    if (input.dryRun) {
      return { success: true, totalDistributed: totalAmount, recipientCount: users.length };
    }

    await checkPauseAndCancel();

    // Step 3: Lock UBI pool
    currentStep = 'locking_pool';
    lockId = await lockUBIPool(totalAmount);
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;

    await checkPauseAndCancel();

    // Step 4: Create ledger transactions
    currentStep = 'creating_transactions';
    for (const user of users) {
      const amount = amounts.get(user.id) || 0;
      await createLedgerTransaction(user.id, amount, 'ubi_distribution', {
        distributionId: input.distributionId,
      });
    }
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;

    await checkPauseAndCancel();

    // Step 5: Update user balances
    currentStep = 'updating_balances';
    for (const user of users) {
      const amount = amounts.get(user.id) || 0;
      await updateUserBalance(user.id, amount);
    }
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;

    await checkPauseAndCancel();

    // Step 6: Emit distribution events
    currentStep = 'emitting_events';
    for (const user of users) {
      const amount = amounts.get(user.id) || 0;
      await emitDistributionEvent(
        user.id,
        amount,
        input.distributionId,
        input.tenantId,
        input.poolId
      );
    }
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;

    await checkPauseAndCancel();

    // Step 7: Send notifications (best effort)
    currentStep = 'sending_notifications';
    for (const user of users) {
      const amount = amounts.get(user.id) || 0;
      await sendDistributionNotification(user.id, amount);
    }
    progress.completedSteps++;
    progress.percentage = 100;

    currentStep = 'completed';
    return {
      success: true,
      totalDistributed: totalAmount,
      recipientCount: users.length,
    };
  } catch (error) {
    // Rollback: unlock pool if locked
    if (lockId) {
      try {
        await unlockUBIPool(lockId);
      } catch (rollbackError) {
        // Log rollback error but don't mask original error
      }
    }

    throw ApplicationFailure.create({
      message: `UBI distribution failed: ${error instanceof Error ? error.message : String(error)}`,
      nonRetryable: false,
    });
  }

  async function checkPauseAndCancel() {
    // Wait while paused
    await condition(() => !isPaused || isCancelled);
    
    // Throw if cancelled
    if (isCancelled) {
      if (lockId) {
        await unlockUBIPool(lockId);
      }
      throw ApplicationFailure.create({
        message: `Workflow cancelled: ${cancelReason}`,
        nonRetryable: true,
      });
    }
  }
}
