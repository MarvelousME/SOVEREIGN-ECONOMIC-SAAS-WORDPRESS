import { VotingMechanism, Vote, VoteChoice, VotingPower } from '../types';

/**
 * Calculate vote weight based on voting mechanism
 */
export function calculateVoteWeight(
  vote: Vote,
  votingPower: VotingPower,
  mechanism: VotingMechanism
): number {
  switch (mechanism) {
    case VotingMechanism.SIMPLE_MAJORITY:
      return 1;

    case VotingMechanism.REPUTATION_WEIGHTED:
      return calculateReputationWeight(votingPower);

    case VotingMechanism.STAKE_WEIGHTED:
      return calculateStakeWeight(votingPower);

    case VotingMechanism.QUADRATIC:
      return calculateQuadraticWeight(votingPower);

    case VotingMechanism.CONVICTION:
      return calculateConvictionWeight(vote, votingPower);

    default:
      return 1;
  }
}

/**
 * Simple majority - one person, one vote
 */
function calculateSimpleWeight(): number {
  return 1;
}

/**
 * Reputation-weighted voting
 * Weight based on user's reputation score
 */
function calculateReputationWeight(votingPower: VotingPower): number {
  // Linear scaling: 1 point per reputation score
  return Math.max(1, votingPower.reputationScore);
}

/**
 * Stake-weighted voting
 * Weight proportional to tokens staked
 */
function calculateStakeWeight(votingPower: VotingPower): number {
  // Linear scaling: 1 point per token staked
  return Math.max(1, votingPower.stakeAmount);
}

/**
 * Quadratic voting
 * Cost of votes increases quadratically (sqrt of voting power)
 * This reduces the influence of large stakeholders
 */
function calculateQuadraticWeight(votingPower: VotingPower): number {
  const totalPower = votingPower.stakeAmount + votingPower.reputationScore;
  // Square root to dampen large stakes
  return Math.max(1, Math.sqrt(totalPower));
}

/**
 * Conviction voting
 * Weight increases with time commitment (conviction multiplier)
 * Longer lock periods = more voting power
 */
function calculateConvictionWeight(vote: Vote, votingPower: VotingPower): number {
  const baseWeight = votingPower.totalPower;
  const convictionMultiplier = vote.convictionMultiplier || 1;
  
  // Conviction multiplier: 1x (no lock), 2x (7 days), 4x (30 days), 8x (90 days)
  return baseWeight * convictionMultiplier;
}

/**
 * Calculate quorum requirement
 */
export function calculateQuorumRequirement(
  totalEligibleVoters: number,
  minQuorumPercentage: number
): number {
  return Math.ceil((totalEligibleVoters * minQuorumPercentage) / 100);
}

/**
 * Check if proposal passed based on mechanism
 */
export function hasProposalPassed(
  yesWeight: number,
  noWeight: number,
  abstainWeight: number,
  totalVotes: number,
  quorumRequired: number,
  mechanism: VotingMechanism
): boolean {
  // Check quorum first
  if (totalVotes < quorumRequired) {
    return false;
  }

  // For all mechanisms, simple majority of voting weight
  const totalVotingWeight = yesWeight + noWeight;
  
  if (totalVotingWeight === 0) {
    return false;
  }

  // Requires more than 50% of voting weight (excluding abstain)
  return yesWeight > noWeight;
}

/**
 * Calculate participation rate
 */
export function calculateParticipationRate(
  totalVotes: number,
  totalEligibleVoters: number
): number {
  if (totalEligibleVoters === 0) {
    return 0;
  }
  return (totalVotes / totalEligibleVoters) * 100;
}

/**
 * Get conviction multiplier based on lock duration (in days)
 */
export function getConvictionMultiplier(lockDurationDays: number): number {
  if (lockDurationDays >= 90) {
    return 8;
  } else if (lockDurationDays >= 30) {
    return 4;
  } else if (lockDurationDays >= 7) {
    return 2;
  }
  return 1;
}

/**
 * Calculate total voting power including delegations
 */
export function calculateTotalVotingPower(
  baseVotingPower: VotingPower,
  delegatedToUser: number
): number {
  return baseVotingPower.reputationScore + 
         baseVotingPower.stakeAmount + 
         delegatedToUser;
}
