import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities';

const { 
  calculateDistribution, 
  persistDistribution, 
  updatePoolBalance,
  notifyDistributionComplete 
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
  },
});

export interface DistributionWorkflowParams {
  poolId: string;
  tenantId: string;
  distributionDate: Date;
}

/**
 * Daily UBI Distribution Workflow
 * Calculates and executes UBI distribution for all eligible users
 */
export async function dailyDistributionWorkflow(
  params: DistributionWorkflowParams
): Promise<void> {
  const { poolId, tenantId, distributionDate } = params;

  // Step 1: Calculate distribution for all eligible users
  const distributionResult = await calculateDistribution({
    poolId,
    tenantId,
    distributionDate
  });

  if (!distributionResult.success) {
    throw new Error(`Distribution calculation failed: ${distributionResult.error}`);
  }

  // Step 2: Persist distribution records
  await persistDistribution({
    distributionId: distributionResult.distributionId,
    distributions: distributionResult.distributions
  });

  // Step 3: Update pool balance
  await updatePoolBalance({
    poolId,
    distributedAmount: distributionResult.totalDistributed
  });

  // Step 4: Notify completion
  await notifyDistributionComplete({
    distributionId: distributionResult.distributionId,
    poolId,
    tenantId,
    recipientCount: distributionResult.recipientCount,
    totalDistributed: distributionResult.totalDistributed
  });
}

/**
 * Weekly Pool Rebalancing Workflow
 * Rebalances UBI pool and adjusts distribution parameters
 */
export async function weeklyRebalancingWorkflow(
  poolId: string
): Promise<void> {
  const { 
    checkPoolSustainability,
    adjustPoolParameters
  } = proxyActivities<typeof activities>({
    startToCloseTimeout: '2 minutes',
  });

  // Check pool sustainability
  const sustainabilityCheck = await checkPoolSustainability({ poolId });

  if (!sustainabilityCheck.isSustainable) {
    // Adjust parameters if pool is depleting too fast
    await adjustPoolParameters({
      poolId,
      adjustments: sustainabilityCheck.recommendations
    });
  }
}

/**
 * Eligibility Recalculation Workflow
 * Recalculates eligibility for all users (runs daily)
 */
export async function eligibilityRecalculationWorkflow(
  params: {
    tenantId: string;
    poolId: string;
  }
): Promise<void> {
  const { recalculateAllEligibility } = proxyActivities<typeof activities>({
    startToCloseTimeout: '10 minutes',
  });

  await recalculateAllEligibility({
    tenantId: params.tenantId,
    poolId: params.poolId
  });
}
