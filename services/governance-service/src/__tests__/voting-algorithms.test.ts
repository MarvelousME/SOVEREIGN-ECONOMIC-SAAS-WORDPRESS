import {
  calculateVoteWeight,
  calculateQuorumRequirement,
  hasProposalPassed,
  calculateParticipationRate,
  getConvictionMultiplier,
  calculateTotalVotingPower
} from '../utils/voting-algorithms';
import { VotingMechanism, VoteChoice, Vote, VotingPower } from '../types';

describe('Voting Algorithms', () => {
  const createMockVote = (choice: VoteChoice, convictionMultiplier?: number): Vote => ({
    id: 'vote-1',
    proposalId: 'proposal-1',
    voterId: 'user-1',
    choice,
    votingPower: 100,
    weight: 0,
    convictionMultiplier,
    timestamp: new Date()
  });

  const createMockVotingPower = (
    reputationScore: number = 100,
    stakeAmount: number = 100,
    delegatedPower: number = 0
  ): VotingPower => ({
    userId: 'user-1',
    reputationScore,
    stakeAmount,
    delegatedPower,
    totalPower: reputationScore + stakeAmount + delegatedPower,
    lastUpdated: new Date()
  });

  describe('calculateVoteWeight', () => {
    it('should return 1 for SIMPLE_MAJORITY mechanism', () => {
      const vote = createMockVote(VoteChoice.YES);
      const votingPower = createMockVotingPower();
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.SIMPLE_MAJORITY);
      expect(weight).toBe(1);
    });

    it('should return reputation score for REPUTATION_WEIGHTED mechanism', () => {
      const vote = createMockVote(VoteChoice.YES);
      const votingPower = createMockVotingPower(150, 50);
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.REPUTATION_WEIGHTED);
      expect(weight).toBe(150);
    });

    it('should return minimum 1 for REPUTATION_WEIGHTED with 0 reputation', () => {
      const vote = createMockVote(VoteChoice.YES);
      const votingPower = createMockVotingPower(0, 100);
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.REPUTATION_WEIGHTED);
      expect(weight).toBe(1);
    });

    it('should return stake amount for STAKE_WEIGHTED mechanism', () => {
      const vote = createMockVote(VoteChoice.YES);
      const votingPower = createMockVotingPower(50, 200);
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.STAKE_WEIGHTED);
      expect(weight).toBe(200);
    });

    it('should return minimum 1 for STAKE_WEIGHTED with 0 stake', () => {
      const vote = createMockVote(VoteChoice.YES);
      const votingPower = createMockVotingPower(100, 0);
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.STAKE_WEIGHTED);
      expect(weight).toBe(1);
    });

    it('should return sqrt of total power for QUADRATIC mechanism', () => {
      const vote = createMockVote(VoteChoice.YES);
      const votingPower = createMockVotingPower(100, 100);
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.QUADRATIC);
      expect(weight).toBe(Math.sqrt(200));
    });

    it('should return minimum 1 for QUADRATIC with 0 power', () => {
      const vote = createMockVote(VoteChoice.YES);
      const votingPower = createMockVotingPower(0, 0);
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.QUADRATIC);
      expect(weight).toBe(1);
    });

    it('should apply conviction multiplier for CONVICTION mechanism', () => {
      const vote = createMockVote(VoteChoice.YES, 4);
      const votingPower = createMockVotingPower(50, 50, 0);
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.CONVICTION);
      expect(weight).toBe(400);
    });

    it('should use 1 as default conviction multiplier for CONVICTION mechanism', () => {
      const vote = createMockVote(VoteChoice.YES);
      const votingPower = createMockVotingPower(100, 0, 0);
      const weight = calculateVoteWeight(vote, votingPower, VotingMechanism.CONVICTION);
      expect(weight).toBe(100);
    });
  });

  describe('calculateQuorumRequirement', () => {
    it('should calculate 20% quorum correctly', () => {
      const quorum = calculateQuorumRequirement(100, 20);
      expect(quorum).toBe(20);
    });

    it('should round up to nearest integer', () => {
      const quorum = calculateQuorumRequirement(15, 20);
      expect(quorum).toBe(3);
    });

    it('should return 0 for 0 eligible voters', () => {
      const quorum = calculateQuorumRequirement(0, 20);
      expect(quorum).toBe(0);
    });

    it('should handle 100% quorum requirement', () => {
      const quorum = calculateQuorumRequirement(50, 100);
      expect(quorum).toBe(50);
    });

    it('should handle small percentages', () => {
      const quorum = calculateQuorumRequirement(1000, 5);
      expect(quorum).toBe(50);
    });
  });

  describe('hasProposalPassed', () => {
    it('should fail when quorum is not reached', () => {
      const passed = hasProposalPassed(
        60, 40, 10,
        5, 20,
        VotingMechanism.SIMPLE_MAJORITY
      );
      expect(passed).toBe(false);
    });

    it('should pass when yes votes exceed no votes and quorum reached', () => {
      const passed = hasProposalPassed(
        60, 40, 10,
        30, 20,
        VotingMechanism.SIMPLE_MAJORITY
      );
      expect(passed).toBe(true);
    });

    it('should fail when no votes exceed yes votes despite quorum', () => {
      const passed = hasProposalPassed(
        40, 60, 10,
        30, 20,
        VotingMechanism.SIMPLE_MAJORITY
      );
      expect(passed).toBe(false);
    });

    it('should fail when yes equals no votes (tie)', () => {
      const passed = hasProposalPassed(
        50, 50, 0,
        30, 20,
        VotingMechanism.SIMPLE_MAJORITY
      );
      expect(passed).toBe(false);
    });

    it('should fail when total voting weight is 0', () => {
      const passed = hasProposalPassed(
        0, 0, 30,
        30, 20,
        VotingMechanism.SIMPLE_MAJORITY
      );
      expect(passed).toBe(false);
    });

    it('should pass with all voting mechanisms when conditions met', () => {
      const passed = hasProposalPassed(
        100, 50, 10,
        50, 20,
        VotingMechanism.REPUTATION_WEIGHTED
      );
      expect(passed).toBe(true);
    });

    it('should not count abstain votes in the decision', () => {
      const passed = hasProposalPassed(
        10, 10, 100,
        30, 20,
        VotingMechanism.SIMPLE_MAJORITY
      );
      expect(passed).toBe(false);
    });
  });

  describe('calculateParticipationRate', () => {
    it('should calculate correct percentage', () => {
      const rate = calculateParticipationRate(50, 100);
      expect(rate).toBe(50);
    });

    it('should return 0 when no eligible voters', () => {
      const rate = calculateParticipationRate(10, 0);
      expect(rate).toBe(0);
    });

    it('should handle 100% participation', () => {
      const rate = calculateParticipationRate(100, 100);
      expect(rate).toBe(100);
    });

    it('should handle low participation', () => {
      const rate = calculateParticipationRate(1, 1000);
      expect(rate).toBe(0.1);
    });

    it('should handle no participation', () => {
      const rate = calculateParticipationRate(0, 100);
      expect(rate).toBe(0);
    });
  });

  describe('getConvictionMultiplier', () => {
    it('should return 8x for 90+ days lock', () => {
      expect(getConvictionMultiplier(90)).toBe(8);
      expect(getConvictionMultiplier(180)).toBe(8);
    });

    it('should return 4x for 30-89 days lock', () => {
      expect(getConvictionMultiplier(30)).toBe(4);
      expect(getConvictionMultiplier(60)).toBe(4);
      expect(getConvictionMultiplier(89)).toBe(4);
    });

    it('should return 2x for 7-29 days lock', () => {
      expect(getConvictionMultiplier(7)).toBe(2);
      expect(getConvictionMultiplier(14)).toBe(2);
      expect(getConvictionMultiplier(29)).toBe(2);
    });

    it('should return 1x for less than 7 days lock', () => {
      expect(getConvictionMultiplier(0)).toBe(1);
      expect(getConvictionMultiplier(1)).toBe(1);
      expect(getConvictionMultiplier(6)).toBe(1);
    });
  });

  describe('calculateTotalVotingPower', () => {
    it('should sum all power components', () => {
      const votingPower = createMockVotingPower(100, 200, 50);
      const total = calculateTotalVotingPower(votingPower, 50);
      expect(total).toBe(350);
    });

    it('should handle zero values', () => {
      const votingPower = createMockVotingPower(0, 0, 0);
      const total = calculateTotalVotingPower(votingPower, 0);
      expect(total).toBe(0);
    });

    it('should handle delegated power correctly', () => {
      const votingPower = createMockVotingPower(50, 50, 100);
      const total = calculateTotalVotingPower(votingPower, 50);
      expect(total).toBe(150);
    });
  });
});
