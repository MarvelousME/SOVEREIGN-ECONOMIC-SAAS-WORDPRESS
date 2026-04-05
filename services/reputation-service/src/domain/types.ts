// Domain types for Reputation Service

export interface ReputationScore {
  userId: string;
  overallScore: number; // 0-1000
  trustIndex: number; // 0-100
  level: ReputationLevel;
  calculatedAt: Date;
  components: ScoreComponents;
}

export enum ReputationLevel {
  NEWCOMER = 'NEWCOMER', // 0-199
  BRONZE = 'BRONZE', // 200-399
  SILVER = 'SILVER', // 400-599
  GOLD = 'GOLD', // 600-799
  PLATINUM = 'PLATINUM', // 800-899
  DIAMOND = 'DIAMOND', // 900-1000
}

export interface ScoreComponents {
  taskScore: number; // 0-300 points
  qualityScore: number; // 0-250 points
  reliabilityScore: number; // 0-200 points
  communityScore: number; // 0-150 points
  longevityScore: number; // 0-100 points
}

export interface SkillProficiency {
  userId: string;
  skillId: string;
  skillName: string;
  proficiencyLevel: number; // 0-100
  tasksCompleted: number;
  averageRating: number;
  endorsements: number;
  lastValidated: Date;
  validatedBy: string[];
}

export interface TaskMetrics {
  userId: string;
  totalTasks: number;
  completedTasks: number;
  approvedTasks: number;
  rejectedTasks: number;
  completionRate: number; // percentage
  approvalRate: number; // percentage
  averageQuality: number; // 0-100
  onTimeDeliveryRate: number; // percentage
}

export interface ReferralMetrics {
  userId: string;
  totalReferrals: number;
  activeReferrals: number;
  referralSuccessRate: number; // percentage
  referralValue: number;
}

export interface AgentPerformanceMetrics {
  userId: string;
  agentId: string;
  totalSales: number;
  revenue: number;
  averageRating: number;
  activeUsers: number;
}

export interface CommunityEndorsement {
  endorsementId: string;
  endorserId: string;
  endorseeId: string;
  skillId: string;
  message: string;
  weight: number; // Based on endorser's reputation
  createdAt: Date;
}

export interface FraudAlert {
  alertId: string;
  userId: string;
  alertType: FraudAlertType;
  severity: AlertSeverity;
  description: string;
  detectedAt: Date;
  resolved: boolean;
}

export enum FraudAlertType {
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  FAKE_TASKS = 'FAKE_TASKS',
  REVIEW_MANIPULATION = 'REVIEW_MANIPULATION',
  SYBIL_ATTACK = 'SYBIL_ATTACK',
  GAMING_SYSTEM = 'GAMING_SYSTEM',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ReputationBenefit {
  minScore: number;
  rewardMultiplier: number;
  taskAccessLevel: number;
  transactionFeeDiscount: number; // percentage
  ubiMultiplier: number;
  votingPower: number;
}

export interface Achievement {
  achievementId: string;
  name: string;
  description: string;
  category: AchievementCategory;
  pointValue: number;
  requirement: Record<string, any>;
}

export enum AchievementCategory {
  TASKS = 'TASKS',
  QUALITY = 'QUALITY',
  COMMUNITY = 'COMMUNITY',
  REFERRALS = 'REFERRALS',
  LONGEVITY = 'LONGEVITY',
  SPECIAL = 'SPECIAL',
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  progress: number; // percentage
}

export interface ReputationHistory {
  userId: string;
  timestamp: Date;
  score: number;
  change: number;
  reason: string;
  metadata: Record<string, any>;
}

export interface ReputationStake {
  stakeId: string;
  userId: string;
  amount: number;
  lockedUntil: Date;
  multiplierBonus: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  level: ReputationLevel;
  change24h: number;
}
