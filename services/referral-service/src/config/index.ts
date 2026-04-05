import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3007', 10),
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'ubi_cms',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },
  
  referral: {
    codeLength: parseInt(process.env.REFERRAL_CODE_LENGTH || '8', 10),
    cookieDays: parseInt(process.env.REFERRAL_COOKIE_DAYS || '30', 10),
    maxTiers: parseInt(process.env.MAX_REFERRAL_TIERS || '5', 10),
  },
  
  tiers: {
    tier1Percentage: parseInt(process.env.TIER_1_PERCENTAGE || '1000', 10),
    tier2Percentage: parseInt(process.env.TIER_2_PERCENTAGE || '500', 10),
    tier3Percentage: parseInt(process.env.TIER_3_PERCENTAGE || '300', 10),
    tier4Percentage: parseInt(process.env.TIER_4_PERCENTAGE || '200', 10),
    tier5Percentage: parseInt(process.env.TIER_5_PERCENTAGE || '100', 10),
  },
  
  fraud: {
    maxReferralsPerIP: parseInt(process.env.MAX_REFERRALS_PER_IP || '5', 10),
    maxReferralsPerDevice: parseInt(process.env.MAX_REFERRALS_PER_DEVICE || '3', 10),
    suspiciousVelocityMinutes: parseInt(process.env.SUSPICIOUS_VELOCITY_MINUTES || '60', 10),
    suspiciousVelocityCount: parseInt(process.env.SUSPICIOUS_VELOCITY_COUNT || '10', 10),
  },
  
  milestones: {
    bonus10: parseFloat(process.env.MILESTONE_10_BONUS || '100'),
    bonus50: parseFloat(process.env.MILESTONE_50_BONUS || '500'),
    bonus100: parseFloat(process.env.MILESTONE_100_BONUS || '1000'),
  },
  
  rewards: {
    maxRewardPerReferee: parseFloat(process.env.MAX_REWARD_PER_REFEREE || '1000'),
    maxDailyPayout: parseFloat(process.env.MAX_DAILY_PAYOUT || '10000'),
  },
  
  payout: {
    minimumAmount: parseFloat(process.env.PAYOUT_MINIMUM_AMOUNT || '10'),
    maximumAmount: parseFloat(process.env.PAYOUT_MAXIMUM_AMOUNT || '10000'),
    dailyLimit: parseFloat(process.env.PAYOUT_DAILY_LIMIT || '5000'),
    currency: process.env.PAYOUT_CURRENCY || 'USD',
  },
};

export default config;
