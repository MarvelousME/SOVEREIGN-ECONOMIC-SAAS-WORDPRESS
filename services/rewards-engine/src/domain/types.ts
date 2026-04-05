// Domain types for Rewards Engine

export enum RewardSource {
  TASK_COMPLETION = 'TASK_COMPLETION',
  REFERRAL = 'REFERRAL',
  AGENT_REVENUE = 'AGENT_REVENUE',
  DATA_MONETIZATION = 'DATA_MONETIZATION',
  STAKING = 'STAKING',
  LOYALTY_BONUS = 'LOYALTY_BONUS',
}

export enum RewardStatus {
  PENDING = 'PENDING',
  CALCULATED = 'CALCULATED',
  APPROVED = 'APPROVED',
  DISTRIBUTED = 'DISTRIBUTED',
  CLAIMED = 'CLAIMED',
  FAILED = 'FAILED',
}

export interface RewardCalculationInput {
  userId: string;
  source: RewardSource;
  baseAmount: number;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface RewardMultipliers {
  reputationMultiplier: number; // 1.0 - 2.0 based on reputation
  loyaltyMultiplier: number; // 1.0 - 1.5 based on time on platform
  stakingMultiplier: number; // 1.0 - 1.3 based on tokens staked
  volumeMultiplier: number; // 1.0 - 1.2 based on transaction volume
}

export interface RewardCalculationResult {
  rewardId: string;
  userId: string;
  source: RewardSource;
  baseAmount: number;
  multipliers: RewardMultipliers;
  totalMultiplier: number;
  finalAmount: number;
  status: RewardStatus;
  metadata: Record<string, any>;
  calculatedAt: Date;
}

export interface ReferralReward {
  referrerId: string;
  refereeId: string;
  tier: number; // 1, 2, 3 (multi-tier referral)
  percentage: number; // Percentage of referee's rewards
  amount: number;
}

export interface AgentRevenueShare {
  agentId: string;
  creatorId: string;
  saleAmount: number;
  creatorSharePercentage: number;
  platformFeePercentage: number;
  creatorReward: number;
}

export interface RewardDistribution {
  distributionId: string;
  userId: string;
  rewards: RewardCalculationResult[];
  totalAmount: number;
  currency: string;
  distributedAt: Date;
  transactionId: string;
}

export interface RewardStats {
  userId?: string;
  totalRewardsEarned: number;
  totalRewardsClaimed: number;
  totalRewardsPending: number;
  rewardsBySource: Record<RewardSource, number>;
  averageMultiplier: number;
  lastRewardDate: Date;
}

export interface RewardPool {
  poolId: string;
  source: RewardSource;
  totalAllocated: number;
  totalDistributed: number;
  remaining: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}
