export interface Referral {
  id: string;
  userId: string;
  referralCode: string;
  referrerId: string | null;
  tier: number;
  registeredAt: Date;
  ipAddress: string;
  deviceFingerprint: string;
  userAgent: string;
  status: ReferralStatus;
  fraudScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReferralStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPICIOUS = 'suspicious',
  BLOCKED = 'blocked',
}

export interface ReferralConversion {
  id: string;
  referralId: string;
  milestone: ConversionMilestone;
  convertedAt: Date;
  metadata: Record<string, any>;
}

export enum ConversionMilestone {
  REGISTRATION = 'registration',
  FIRST_TASK = 'first_task',
  FIRST_AGENT = 'first_agent',
  EARNED_100 = 'earned_100',
  ACTIVE_30_DAYS = 'active_30_days',
}

export interface ReferralReward {
  id: string;
  referrerId: string;
  refereeId: string;
  tier: number;
  amount: number;
  currency: string;
  source: string;
  sourceId: string;
  status: RewardStatus;
  calculatedAt: Date;
  distributedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum RewardStatus {
  PENDING = 'pending',
  DISTRIBUTED = 'distributed',
  VESTED = 'vested',
  CANCELLED = 'cancelled',
}

export interface ReferralTree {
  user: {
    id: string;
    referralCode: string;
  };
  tier: number;
  children: ReferralTree[];
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
  };
}

export interface ReferralStats {
  userId: string;
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  suspiciousReferrals: number;
  blockedReferrals: number;
  referralsByTier: Record<number, number>;
  totalEarnings: number;
  pendingEarnings: number;
  distributedEarnings: number;
  conversionRate: number;
  lastReferralAt: Date | null;
}

export interface ReferralCampaign {
  id: string;
  name: string;
  code: string;
  description: string;
  startDate: Date;
  endDate: Date | null;
  tierMultipliers: Record<number, number>;
  bonusRewards: Record<string, number>;
  isActive: boolean;
  createdAt: Date;
}

export interface TrackingCookie {
  referralCode: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

export interface FraudDetectionResult {
  isSuspicious: boolean;
  score: number;
  reasons: string[];
  shouldBlock: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  tier1Referrals: number;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  method: PayoutMethod;
  status: PayoutStatus;
  requestedAt: Date;
  processedAt: Date | null;
  metadata: Record<string, any>;
}

export enum PayoutMethod {
  BANK_TRANSFER = 'bank_transfer',
  CRYPTO = 'crypto',
  PLATFORM_CREDIT = 'platform_credit',
}

export enum PayoutStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface TierConfig {
  tier: number;
  percentage: number; // basis points (1000 = 10%)
  maxRewardPerReferee: number;
}

export const DEFAULT_TIER_CONFIG: TierConfig[] = [
  { tier: 1, percentage: 1000, maxRewardPerReferee: 1000 }, // 10%
  { tier: 2, percentage: 500, maxRewardPerReferee: 500 },   // 5%
  { tier: 3, percentage: 300, maxRewardPerReferee: 300 },   // 3%
  { tier: 4, percentage: 200, maxRewardPerReferee: 200 },   // 2%
  { tier: 5, percentage: 100, maxRewardPerReferee: 100 },   // 1%
];
