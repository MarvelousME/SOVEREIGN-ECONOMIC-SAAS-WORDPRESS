import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  ApplicationFailure,
} from '@temporalio/workflow';
import type * as activities from '../activities/treasury.activities';
import { WorkflowStatus, WorkflowProgress, DEFAULT_RETRY_POLICY } from '../types';

const {
  harvestYield,
  reallocateToStrategy,
  recordPerformance,
  distributeToUBIPool,
  emitTreasuryEvent,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '10m',
  retry: DEFAULT_RETRY_POLICY,
});

export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');
export const statusQuery = defineQuery<WorkflowStatus>('status');
export const progressQuery = defineQuery<WorkflowProgress>('progress');

export interface TreasuryCompoundInput {
  strategies: string[];
  minThreshold: number;
  ubiPoolPercentage: number; // Percentage to distribute to UBI pool
}

export async function treasuryCompoundWorkflow(input: TreasuryCompoundInput): Promise<{
  success: boolean;
  totalHarvested: number;
  compounded: number;
  distributedToUBI: number;
}> {
  let isPaused = false;
  let currentStep = 'initializing';
  
  const progress = {
    totalSteps: 5,
    completedSteps: 0,
    percentage: 0,
    details: {},
  };

  setHandler(pauseSignal, () => { isPaused = true; });
  setHandler(resumeSignal, () => { isPaused = false; });
  setHandler(statusQuery, () => ({ state: isPaused ? 'paused' : 'running', currentStep }));
  setHandler(progressQuery, () => progress);

  const checkPause = async () => {
    await condition(() => !isPaused);
  };

  try {
    // Step 1: Harvest yield from all strategies
    currentStep = 'harvesting_yield';
    let totalHarvested = 0;
    const harvestedAmounts = new Map<string, number>();
    
    for (const strategy of input.strategies) {
      const amount = await harvestYield(strategy);
      harvestedAmounts.set(strategy, amount);
      totalHarvested += amount;
    }
    
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.details.totalHarvested = totalHarvested;
    await checkPause();

    if (totalHarvested < input.minThreshold) {
      return {
        success: true,
        totalHarvested,
        compounded: 0,
        distributedToUBI: 0,
      };
    }

    // Step 2: Calculate compound amounts
    currentStep = 'calculating_compound';
    const ubiAmount = totalHarvested * (input.ubiPoolPercentage / 100);
    const compoundAmount = totalHarvested - ubiAmount;
    
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    progress.details.compoundAmount = compoundAmount;
    progress.details.ubiAmount = ubiAmount;
    await checkPause();

    // Step 3: Reallocate to strategies
    currentStep = 'reallocating_to_strategies';
    const amountPerStrategy = compoundAmount / input.strategies.length;
    
    for (const strategy of input.strategies) {
      await reallocateToStrategy(strategy, amountPerStrategy);
    }
    
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    await checkPause();

    // Step 4: Update performance metrics
    currentStep = 'updating_performance';
    for (const strategy of input.strategies) {
      await recordPerformance(strategy, {
        yieldHarvested: harvestedAmounts.get(strategy) || 0,
        compounded: amountPerStrategy,
      });
    }
    progress.completedSteps++;
    progress.percentage = (progress.completedSteps / progress.totalSteps) * 100;
    await checkPause();

    // Step 5: Distribute portion to UBI pool
    currentStep = 'distributing_to_ubi';
    if (ubiAmount > 0) {
      await distributeToUBIPool(ubiAmount);
    }
    
    await emitTreasuryEvent('treasury.compounded', {
      totalHarvested,
      compounded: compoundAmount,
      distributedToUBI: ubiAmount,
    });
    
    progress.completedSteps++;
    progress.percentage = 100;

    currentStep = 'completed';
    return {
      success: true,
      totalHarvested,
      compounded: compoundAmount,
      distributedToUBI: ubiAmount,
    };
  } catch (error) {
    throw ApplicationFailure.create({
      message: `Treasury compound failed: ${error instanceof Error ? error.message : String(error)}`,
      nonRetryable: false,
    });
  }
}
