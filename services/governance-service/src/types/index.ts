export enum ProposalType {
  TREASURY_ALLOCATION = 'treasury_allocation',
  UBI_RULE_CHANGE = 'ubi_rule_change',
  FEATURE_PROPOSAL = 'feature_proposal',
  PARAMETER_UPDATE = 'parameter_update',
  EMERGENCY_ACTION = 'emergency_action'
}

export enum ProposalStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PASSED = 'passed',
  REJECTED = 'rejected',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled'
}

export enum VotingMechanism {
  SIMPLE_MAJORITY = 'simple_majority',
  REPUTATION_WEIGHTED = 'reputation_weighted',
  STAKE_WEIGHTED = 'stake_weighted',
  QUADRATIC = 'quadratic',
  CONVICTION = 'conviction'
}

export enum VoteChoice {
  YES = 'yes',
  NO = 'no',
  ABSTAIN = 'abstain'
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposalType: ProposalType;
  votingMechanism: VotingMechanism;
  proposerId: string;
  deposit: number;
  status: ProposalStatus;
  votingStartTime: Date;
  votingEndTime: Date;
  executionTime?: Date;
  executedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vote {
  id: string;
  proposalId: string;
  voterId: string;
  choice: VoteChoice;
  votingPower: number;
  weight: number;
  convictionMultiplier?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface VotingPower {
  userId: string;
  reputationScore: number;
  stakeAmount: number;
  delegatedPower: number;
  totalPower: number;
  lastUpdated: Date;
}

export interface Delegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  votingPower: number;
  startTime: Date;
  endTime?: Date;
  active: boolean;
  createdAt: Date;
}

export interface ProposalResults {
  proposalId: string;
  totalVotes: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  yesWeight: number;
  noWeight: number;
  abstainWeight: number;
  quorumReached: boolean;
  passed: boolean;
  totalEligibleVoters: number;
  participationRate: number;
}

export interface CreateProposalRequest {
  title: string;
  description: string;
  proposalType: ProposalType;
  votingMechanism: VotingMechanism;
  deposit: number;
  metadata?: Record<string, any>;
}

export interface CastVoteRequest {
  proposalId: string;
  choice: VoteChoice;
  convictionMultiplier?: number;
}

export interface DelegateVotingPowerRequest {
  delegateId: string;
  votingPower: number;
  duration?: number; // in days
}
