import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  ApplicationFailure,
} from '@temporalio/workflow';
import type * as activities from '../activities/treasury.activities';
import { WorkflowStatus, WorkflowProgress, DEFAULT_RETRY_POLICY, RebalancingConfig } from '../types';

const {
  checkOPAPermission,
  calculateTargetAllocations,
  executeRebalancingTrade,
  updateVaultBalance,
  recordPerformance,
  emitTreasuryEvent,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10m',
  retry: DEFAULT_RETRY_POLICY,
});

export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');
export const cancelSignal = defineSignal<[{ reason: string }]>('cancel');
export const statusQuery = defineQuery<WorkflowStatus>('status');
export const progressQuery = defineQuery<WorkflowProgress>('progress');

export interface TreasuryRebalanceInput {
  config?: RebalancingConfig;
  dryRun?: boolean;
  triggeredBy: 'threshold' | 'scheduled' | 'manual';
}

export async function treasuryRebalanceWorkflow(input: TreasuryRebalanceInput): Promise<{
  success: boolean;
  tradesExecuted: number;
  totalRebalanced: number;
}> {
  let isPaused = false;
  let isCancelled = false;
  let cancelReason = '';
  let currentStep = 'initializing';
  
  const progress = {
    totalSteps: 6,
    completedSteps: 0,
    percentage: 0,
    details: {},
  };

  setHandler(pauseSignal, () => { isPaused = true; });
  setHandler(resumeSignal, () => { isPaused = false; });
  setHandler(cancelSignal, ({ reason }) => { isCancelled = true; cancelReason = reason; });
  setHandler(statusQuery, () => ({
    state: isCancelled ? 'cancelled' : isPaused ? 'paused' : 'running',
    currentStep,
    error: cancelReason || undefined,
  }));
  setHandler(progressQuery, () => progress);

  const checkPauseAndCancel = async () => {
    await condition(() => !isPaused || isCancelled);
    if (isCancelled) {
      throw ApplicationFailure.create({
        message: `Workflow cancelled: ${cancelReason}`,
        nonRetryable: true,
      });
    }
  };

  try {
    // Step 1: Check OPA permission
    currentStep = 'checking_permissions';
    const allowed = await checkOPAPermission('rebalance', 'treasury', {
      triggeredBy: input.triggeredBy,
      dryRun: input.dryRun,
    });
    
    if (!allowed) {
      throw ApplicationFailure.create({
        message: 'Rebalancing not allowed by OPA policy',
        nonRetryable: true,
      });
    }
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    await checkPauseAndCancel();

    // Step 2: Calculate target allocations
    currentStep = 'calculating_allocations';
    const targets = input.config?.targetAllocations || await calculateTargetAllocations();
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.details.targets = targets;
    await checkPauseAndCancel();

    // Step 3: Execute rebalancing trades
    currentStep = 'executing_trades';
    let tradesExecuted = 0;
    let totalRebalanced = 0;
    
    for (let i = 0; i < targets.length - 1; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        const from = targets[i];
        const to = targets[j];
        
        // Calculate amount to rebalance (simplified logic)
        const amount = Math.abs(from.targetPercentage - to.targetPercentage) * 1000;
        
        if (amount > 0) {
          const result = await executeRebalancingTrade(
            from.strategy,
            to.strategy,
            amount,
            input.config?.maxSlippage || 0.01,
            input.dryRun || false
          );
          
          if (result.executed) {
            tradesExecuted++;
            totalRebalanced += result.actualAmount;
          }
        }
      }
    }
    
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.details.tradesExecuted = tradesExecuted;
    await checkPauseAndCancel();

    // Step 4: Update vault balances (skip if dry run)
    if (!input.dryRun) {
      currentStep = 'updating_vaults';
      for (const target of targets) {
        await updateVaultBalance(target.strategy, totalRebalanced / targets.length, 'add');
      }
    }
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    await checkPauseAndCancel();

    // Step 5: Record performance
    currentStep = 'recording_performance';
    for (const target of targets) {
      await recordPerformance(target.strategy, {
        allocationPercentage: target.targetPercentage,
        rebalancedAmount: totalRebalanced / targets.length,
      });
    }
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    await checkPauseAndCancel();

    // Step 6: Emit events
    currentStep = 'emitting_events';
    await emitTreasuryEvent('treasury.rebalanced', {
      triggeredBy: input.triggeredBy,
      tradesExecuted,
      totalRebalanced,
      dryRun: input.dryRun,
    });
    progress.completedSteps++;
    progress.percentage = 100;

    currentStep = 'completed';
    return { success: true, tradesExecuted, totalRebalanced };
  } catch (error) {
    throw ApplicationFailure.create({
      message: `Treasury rebalance failed: ${error instanceof Error ? error.message : String(error)}`,
      nonRetryable: false,
    });
  }
}
