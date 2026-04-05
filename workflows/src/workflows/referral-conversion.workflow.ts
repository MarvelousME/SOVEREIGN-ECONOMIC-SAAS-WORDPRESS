import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities/referral.activities';
import type * as ubiActivities from '../activities/ubi.activities';
import { DEFAULT_RETRY_POLICY } from '../types';

const {
  validateReferralChain,
  calculateMultiTierRewards,
  createRewardRecord,
  sendReferralNotification,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '3m',
  retry: DEFAULT_RETRY_POLICY,
});

const { createLedgerTransaction } = proxyActivities<typeof ubiActivities>({
  startToCloseTimeout: '2m',
  retry: DEFAULT_RETRY_POLICY,
});

export interface ReferralConversionInput {
  refereeId: string;
  conversionValue: number;
  conversionType: string;
}

export async function referralConversionWorkflow(input: ReferralConversionInput): Promise<{
  success: boolean;
  rewardsDistributed: number;
  referrersRewarded: number;
}> {
  // Step 1: Validate referral chain (multi-tier)
  const chain = await validateReferralChain(input.refereeId);

  if (chain.length === 0) {
    return { success: true, rewardsDistributed: 0, referrersRewarded: 0 };
  }

  // Step 2: Calculate rewards for all tiers
  const rewards = await calculateMultiTierRewards(input.conversionValue, chain);

  let totalRewards = 0;
  let referrersCount = 0;

  // Step 3-5: Create reward records, update ledger, send notifications
  for (const [referrerId, amount] of rewards.entries()) {
    const referrerChain = chain.find(c => c.referrerId === referrerId);
    
    if (referrerChain) {
      // Create reward record
      await createRewardRecord(
        referrerId,
        input.refereeId,
        amount,
        referrerChain.tier
      );

      // Update ledger
      await createLedgerTransaction(referrerId, amount, 'referral_reward', {
        refereeId: input.refereeId,
        tier: referrerChain.tier,
        conversionType: input.conversionType,
      });

      // Send notification to referrer
      await sendReferralNotification(referrerId, amount, input.refereeId);

      totalRewards += amount;
      referrersCount++;
    }
  }

  return {
    success: true,
    rewardsDistributed: totalRewards,
    referrersRewarded: referrersCount,
  };
}
