/**
 * Event Schema Definitions for UBI-CMS
 * CloudEvents Envelope Format
 * @see https://cloudevents.io/
 */

// ============================================================================
// Base Event Interface (CloudEvents v1.0)
// ============================================================================

export interface CloudEvent<T = unknown> {
  /** CloudEvents version */
  specversion: '1.0';
  /** Event type identifier */
  type: string;
  /** Event source (service that generated the event) */
  source: string;
  /** Unique event identifier */
  id: string;
  /** Event timestamp */
  time: string;
  /** MIME type of data */
  datacontenttype: string;
  /** Tenant identifier (custom extension) */
  tenantid: string;
  /** Correlation ID for tracing related events */
  correlationid?: string;
  /** Causation ID (ID of event that caused this event) */
  causationid?: string;
  /** Event data payload */
  data: T;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Common Types
// ============================================================================

export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Currency = 'UBI' | 'USD' | 'ETH';

export interface MoneyAmount {
  amount: string; // Decimal string to avoid precision issues
  currency: Currency;
}

export interface UserReference {
  userId: string;
  username?: string;
  email?: string;
}

// ============================================================================
// LEDGER Events
// ============================================================================

export interface TransactionCreatedData {
  transactionId: string;
  tenantId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: MoneyAmount;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'reward' | 'ubi_distribution';
  description: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface TransactionReversedData {
  transactionId: string;
  originalTransactionId: string;
  tenantId: string;
  reason: string;
  reversedBy: UserReference;
  timestamp: string;
}

export interface BalanceUpdatedData {
  accountId: string;
  tenantId: string;
  previousBalance: MoneyAmount;
  newBalance: MoneyAmount;
  change: MoneyAmount;
  transactionId: string;
  timestamp: string;
}

export type LedgerTransactionCreated = CloudEvent<TransactionCreatedData>;
export type LedgerTransactionReversed = CloudEvent<TransactionReversedData>;
export type LedgerBalanceUpdated = CloudEvent<BalanceUpdatedData>;

// ============================================================================
// UBI Events
// ============================================================================

export interface UBIDistributionScheduledData {
  distributionId: string;
  tenantId: string;
  amount: MoneyAmount;
  recipientCount: number;
  scheduledFor: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdBy: UserReference;
}

export interface UBIDistributionCompletedData {
  distributionId: string;
  tenantId: string;
  amount: MoneyAmount;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  totalDistributed: MoneyAmount;
  completedAt: string;
  duration: number; // milliseconds
}

export interface UBIClaimedData {
  claimId: string;
  distributionId: string;
  tenantId: string;
  userId: string;
  amount: MoneyAmount;
  claimedAt: string;
  transactionId: string;
}

export type UBIDistributionScheduled = CloudEvent<UBIDistributionScheduledData>;
export type UBIDistributionCompleted = CloudEvent<UBIDistributionCompletedData>;
export type UBIClaimed = CloudEvent<UBIClaimedData>;

// ============================================================================
// TREASURY Events
// ============================================================================

export interface TreasuryDepositData {
  depositId: string;
  tenantId: string;
  amount: MoneyAmount;
  source: string;
  depositedBy: UserReference;
  transactionId: string;
  timestamp: string;
}

export interface TreasuryWithdrawData {
  withdrawalId: string;
  tenantId: string;
  amount: MoneyAmount;
  destination: string;
  withdrawnBy: UserReference;
  reason: string;
  approvedBy: UserReference;
  transactionId: string;
  timestamp: string;
}

export interface TreasuryCompoundedData {
  compoundId: string;
  tenantId: string;
  principalAmount: MoneyAmount;
  interestEarned: MoneyAmount;
  newBalance: MoneyAmount;
  rate: string; // Decimal percentage
  period: string; // e.g., "daily", "monthly"
  timestamp: string;
}

export interface TreasuryRebalancedData {
  rebalanceId: string;
  tenantId: string;
  previousAllocation: Record<string, MoneyAmount>;
  newAllocation: Record<string, MoneyAmount>;
  strategy: string;
  triggeredBy: 'automatic' | 'manual';
  executor: UserReference;
  timestamp: string;
}

export type TreasuryDeposit = CloudEvent<TreasuryDepositData>;
export type TreasuryWithdraw = CloudEvent<TreasuryWithdrawData>;
export type TreasuryCompounded = CloudEvent<TreasuryCompoundedData>;
export type TreasuryRebalanced = CloudEvent<TreasuryRebalancedData>;

// ============================================================================
// TASK Events
// ============================================================================

export interface TaskCreatedData {
  taskId: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  reward: MoneyAmount;
  estimatedDuration: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  createdBy: UserReference;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskClaimedData {
  taskId: string;
  tenantId: string;
  claimedBy: UserReference;
  claimedAt: string;
  expectedCompletionDate: string;
}

export interface TaskSubmittedData {
  taskId: string;
  tenantId: string;
  submittedBy: UserReference;
  submittedAt: string;
  submissionUrl?: string;
  notes?: string;
  attachments?: string[];
}

export interface TaskApprovedData {
  taskId: string;
  tenantId: string;
  approvedBy: UserReference;
  approvedAt: string;
  reward: MoneyAmount;
  rating?: number;
  feedback?: string;
  transactionId: string;
}

export interface TaskRejectedData {
  taskId: string;
  tenantId: string;
  rejectedBy: UserReference;
  rejectedAt: string;
  reason: string;
  allowResubmission: boolean;
}

export type TaskCreated = CloudEvent<TaskCreatedData>;
export type TaskClaimed = CloudEvent<TaskClaimedData>;
export type TaskSubmitted = CloudEvent<TaskSubmittedData>;
export type TaskApproved = CloudEvent<TaskApprovedData>;
export type TaskRejected = CloudEvent<TaskRejectedData>;

// ============================================================================
// REWARD Events
// ============================================================================

export interface RewardCalculatedData {
  calculationId: string;
  tenantId: string;
  userId: string;
  period: {
    start: string;
    end: string;
  };
  baseReward: MoneyAmount;
  bonuses: Array<{
    type: string;
    amount: MoneyAmount;
    reason: string;
  }>;
  penalties: Array<{
    type: string;
    amount: MoneyAmount;
    reason: string;
  }>;
  totalReward: MoneyAmount;
  calculatedAt: string;
}

export interface RewardDistributedData {
  distributionId: string;
  calculationId: string;
  tenantId: string;
  userId: string;
  amount: MoneyAmount;
  distributedAt: string;
  transactionId: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface RewardClaimedData {
  claimId: string;
  calculationId: string;
  tenantId: string;
  userId: string;
  amount: MoneyAmount;
  claimedAt: string;
  transactionId: string;
}

export type RewardCalculated = CloudEvent<RewardCalculatedData>;
export type RewardDistributed = CloudEvent<RewardDistributedData>;
export type RewardClaimed = CloudEvent<RewardClaimedData>;

// ============================================================================
// AGENT Events
// ============================================================================

export interface AgentDeployedData {
  agentId: string;
  tenantId: string;
  name: string;
  type: string;
  version: string;
  configuration: Record<string, unknown>;
  deployedBy: UserReference;
  deployedAt: string;
  endpoint?: string;
}

export interface AgentExecutedData {
  executionId: string;
  agentId: string;
  tenantId: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'success' | 'failed';
  duration: number; // milliseconds
  executedAt: string;
  error?: string;
}

export interface AgentRevenueData {
  revenueId: string;
  agentId: string;
  tenantId: string;
  amount: MoneyAmount;
  source: string;
  usageCount: number;
  period: {
    start: string;
    end: string;
  };
  recordedAt: string;
}

export interface AgentErrorData {
  errorId: string;
  agentId: string;
  tenantId: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context: Record<string, unknown>;
  occurredAt: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type AgentDeployed = CloudEvent<AgentDeployedData>;
export type AgentExecuted = CloudEvent<AgentExecutedData>;
export type AgentRevenue = CloudEvent<AgentRevenueData>;
export type AgentError = CloudEvent<AgentErrorData>;

// ============================================================================
// GOVERNANCE Events
// ============================================================================

export interface ProposalCreatedData {
  proposalId: string;
  tenantId: string;
  title: string;
  description: string;
  type: 'feature' | 'parameter' | 'treasury' | 'other';
  proposedBy: UserReference;
  votingStartsAt: string;
  votingEndsAt: string;
  quorumRequired: number;
  metadata?: Record<string, unknown>;
}

export interface VoteCastData {
  voteId: string;
  proposalId: string;
  tenantId: string;
  votedBy: UserReference;
  vote: 'for' | 'against' | 'abstain';
  weight: number;
  votedAt: string;
  reason?: string;
}

export interface ProposalExecutedData {
  proposalId: string;
  tenantId: string;
  result: 'passed' | 'rejected';
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalWeight: number;
  quorum: number;
  executedBy: UserReference;
  executedAt: string;
  actions?: Array<{
    type: string;
    parameters: Record<string, unknown>;
  }>;
}

export type GovernanceProposalCreated = CloudEvent<ProposalCreatedData>;
export type GovernanceVoteCast = CloudEvent<VoteCastData>;
export type GovernanceProposalExecuted = CloudEvent<ProposalExecutedData>;

// ============================================================================
// Event Type Constants
// ============================================================================

export const EventTypes = {
  // Ledger
  LEDGER_TRANSACTION_CREATED: 'ledger.transaction.created',
  LEDGER_TRANSACTION_REVERSED: 'ledger.transaction.reversed',
  LEDGER_BALANCE_UPDATED: 'ledger.balance.updated',
  
  // UBI
  UBI_DISTRIBUTION_SCHEDULED: 'ubi.distribution.scheduled',
  UBI_DISTRIBUTION_COMPLETED: 'ubi.distribution.completed',
  UBI_CLAIMED: 'ubi.claimed',
  
  // Treasury
  TREASURY_DEPOSIT: 'treasury.deposit',
  TREASURY_WITHDRAW: 'treasury.withdraw',
  TREASURY_COMPOUNDED: 'treasury.compounded',
  TREASURY_REBALANCED: 'treasury.rebalanced',
  
  // Task
  TASK_CREATED: 'task.created',
  TASK_CLAIMED: 'task.claimed',
  TASK_SUBMITTED: 'task.submitted',
  TASK_APPROVED: 'task.approved',
  TASK_REJECTED: 'task.rejected',
  
  // Reward
  REWARD_CALCULATED: 'reward.calculated',
  REWARD_DISTRIBUTED: 'reward.distributed',
  REWARD_CLAIMED: 'reward.claimed',
  
  // Agent
  AGENT_DEPLOYED: 'agent.deployed',
  AGENT_EXECUTED: 'agent.executed',
  AGENT_REVENUE: 'agent.revenue',
  AGENT_ERROR: 'agent.error',
  
  // Governance
  GOVERNANCE_PROPOSAL_CREATED: 'governance.proposal.created',
  GOVERNANCE_VOTE_CAST: 'governance.vote.cast',
  GOVERNANCE_PROPOSAL_EXECUTED: 'governance.proposal.executed',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

// ============================================================================
// Stream Subject Mapping
// ============================================================================

export const StreamSubjects = {
  LEDGER: 'ledger.*',
  UBI: 'ubi.*',
  TREASURY: 'treasury.*',
  TASK: 'task.*',
  REWARD: 'reward.*',
  AGENT: 'agent.*',
  GOVERNANCE: 'governance.*',
} as const;
