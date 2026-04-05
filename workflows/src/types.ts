// Shared types for workflows and activities

export interface User {
  id: string;
  walletAddress: string;
  createdAt: Date;
  lastActive: Date;
}

export interface LedgerTransaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  currency: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface RebalancingConfig {
  targetAllocations: AllocationTarget[];
  maxSlippage: number;
  dryRun?: boolean;
}

export interface AllocationTarget {
  strategy: string;
  targetPercentage: number;
}

export interface PayoutRequest {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentRail: 'bank' | 'crypto' | 'paypal';
  destination: string;
}

export interface Task {
  id: string;
  creatorId: string;
  title: string;
  reward: number;
  expiresAt: Date;
  status: 'open' | 'claimed' | 'completed' | 'expired';
}

export interface AgentExecutionRequest {
  id: string;
  agentId: string;
  userId: string;
  input: Record<string, any>;
  timeout: number;
  maxCost: number;
}

export interface GovernanceProposal {
  id: string;
  type: string;
  action: Record<string, any>;
  votesFor: number;
  votesAgainst: number;
  quorum: number;
  timeLockEnd: Date;
  status: 'passed' | 'failed' | 'executed';
}

export interface ReferralChain {
  refereeId: string;
  referrerId: string;
  tier: number;
  rewardPercentage: number;
}

export interface WorkflowSignals {
  pause: void;
  resume: void;
  cancel: { reason: string };
  updateConfig: Record<string, any>;
}

export interface WorkflowQueries {
  getStatus: WorkflowStatus;
  getProgress: WorkflowProgress;
}

export interface WorkflowStatus {
  state: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStep: string;
  error?: string;
}

export interface WorkflowProgress {
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  details: Record<string, any>;
}

export interface RetryPolicy {
  maximumAttempts: number;
  initialInterval: string;
  maximumInterval: string;
  backoffCoefficient: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maximumAttempts: 5,
  initialInterval: '1s',
  maximumInterval: '1m',
  backoffCoefficient: 2.0,
};

export interface DataVaultConsent {
  userId: string;
  dataTypes: string[];
  purposes: string[];
  expiresAt: Date;
}
