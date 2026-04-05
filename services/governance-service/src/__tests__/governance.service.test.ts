import { GovernanceService } from '../services/governance.service';
import { EventService } from '../services/events.service';
import { db } from '../utils/database';
import {
  ProposalStatus,
  VoteChoice,
  VotingMechanism,
  ProposalType,
  CreateProposalRequest,
  CastVoteRequest
} from '../types';

jest.mock('../services/events.service');
jest.mock('../utils/database');

const mockDb = db as jest.Mocked<typeof db>;
const mockPublish = EventService.prototype.publish = jest.fn().mockResolvedValue(undefined);

describe('GovernanceService', () => {
  let governanceService: GovernanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    governanceService = new GovernanceService();
  });

  const createMockClient = (queryResults: any[]): any => {
    let callIndex = 0;
    return {
      query: jest.fn().mockImplementation(() => {
        const result = queryResults[callIndex] || { rows: [], rowCount: 0 };
        callIndex++;
        return Promise.resolve(result);
      }),
      release: jest.fn()
    };
  };

  describe('createProposal', () => {
    const userId = 'user-123';
    const validRequest: CreateProposalRequest = {
      title: 'Test Proposal',
      description: 'Test Description',
      proposalType: ProposalType.TREASURY_ALLOCATION,
      votingMechanism: VotingMechanism.SIMPLE_MAJORITY,
      deposit: 100,
      metadata: {}
    };

    it('should create a proposal successfully with valid deposit', async () => {
      const mockProposal = {
        id: 'proposal-123',
        ...validRequest,
        proposerId: userId,
        status: ProposalStatus.ACTIVE,
        votingStartTime: new Date(),
        votingEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProposal], rowCount: 1 } as any);

      const result = await governanceService.createProposal(userId, validRequest);

      expect(result).toEqual(mockProposal);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(mockPublish).toHaveBeenCalledWith('proposal.created', expect.any(Object));
    });

    it('should throw error when deposit is below minimum', async () => {
      const invalidRequest = { ...validRequest, deposit: 50 };

      await expect(governanceService.createProposal(userId, invalidRequest))
        .rejects.toThrow('Minimum deposit of 100 required');
    });

    it('should throw error when deposit is exactly at minimum', async () => {
      const minDepositRequest = { ...validRequest, deposit: 100 };
      const mockProposal = {
        id: 'proposal-123',
        ...minDepositRequest,
        proposerId: userId,
        status: ProposalStatus.ACTIVE,
        votingStartTime: new Date(),
        votingEndTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProposal], rowCount: 1 } as any);

      const result = await governanceService.createProposal(userId, minDepositRequest);
      expect(result).toBeDefined();
    });
  });

  describe('getProposal', () => {
    it('should return proposal when found', async () => {
      const mockProposal = {
        id: 'proposal-123',
        title: 'Test',
        status: ProposalStatus.ACTIVE
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockProposal], rowCount: 1 } as any);

      const result = await governanceService.getProposal('proposal-123');

      expect(result).toEqual(mockProposal);
    });

    it('should return null when proposal not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await governanceService.getProposal('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listProposals', () => {
    it('should return all proposals without filters', async () => {
      const mockProposals = [
        { id: 'proposal-1', status: ProposalStatus.ACTIVE },
        { id: 'proposal-2', status: ProposalStatus.PASSED }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockProposals, rowCount: 2 } as any);

      const result = await governanceService.listProposals();

      expect(result).toEqual(mockProposals);
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM proposals'), expect.any(Array));
    });

    it('should filter proposals by status', async () => {
      const mockProposals = [{ id: 'proposal-1', status: ProposalStatus.ACTIVE }];

      mockDb.query.mockResolvedValueOnce({ rows: mockProposals, rowCount: 1 } as any);

      const result = await governanceService.listProposals(ProposalStatus.ACTIVE);

      expect(result).toEqual(mockProposals);
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE status = $1'), expect.any(Array));
    });

    it('should apply limit and offset', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await governanceService.listProposals(undefined, 10, 20);

      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1 OFFSET $2'), [10, 20]);
    });
  });

  describe('castVote', () => {
    const mockVotingPower = {
      userId: 'user-1',
      reputationScore: 100,
      stakeAmount: 100,
      delegatedPower: 50,
      totalPower: 250,
      lastUpdated: new Date()
    };

    const createMockProposal = (overrides = {}) => ({
      id: 'proposal-123',
      title: 'Test Proposal',
      status: ProposalStatus.ACTIVE,
      votingStartTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      votingEndTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      votingMechanism: VotingMechanism.SIMPLE_MAJORITY,
      ...overrides
    });

    beforeEach(() => {
      jest.spyOn(governanceService, 'getVotingPower').mockResolvedValue(mockVotingPower);
    });

    it('should cast vote successfully', async () => {
      const mockVote = {
        id: 'vote-123',
        proposalId: 'proposal-123',
        voterId: 'user-1',
        choice: VoteChoice.YES,
        votingPower: 250,
        weight: 1,
        timestamp: new Date()
      };

      const mockClient = createMockClient([
        { rows: [createMockProposal()], rowCount: 1 },
        { rows: [], rowCount: 0 },
        { rows: [mockVote], rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      const request: CastVoteRequest = {
        proposalId: 'proposal-123',
        choice: VoteChoice.YES
      };

      const result = await governanceService.castVote('user-1', request);

      expect(result).toEqual(mockVote);
    });

    it('should throw error when proposal not found', async () => {
      const mockClient = createMockClient([
        { rows: [], rowCount: 0 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      const request: CastVoteRequest = {
        proposalId: 'nonexistent',
        choice: VoteChoice.YES
      };

      await expect(governanceService.castVote('user-1', request))
        .rejects.toThrow('Proposal not found');
    });

    it('should throw error when proposal is not active', async () => {
      const mockClient = createMockClient([
        { rows: [createMockProposal({ status: ProposalStatus.PASSED })], rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      const request: CastVoteRequest = {
        proposalId: 'proposal-123',
        choice: VoteChoice.YES
      };

      await expect(governanceService.castVote('user-1', request))
        .rejects.toThrow('Proposal is not active');
    });

    it('should throw error when voting period has not started', async () => {
      const mockClient = createMockClient([
        { rows: [createMockProposal({
          votingStartTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
        })], rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      const request: CastVoteRequest = {
        proposalId: 'proposal-123',
        choice: VoteChoice.YES
      };

      await expect(governanceService.castVote('user-1', request))
        .rejects.toThrow('Voting period has ended');
    });

    it('should throw error when voting period has ended', async () => {
      const mockClient = createMockClient([
        { rows: [createMockProposal({
          votingEndTime: new Date(Date.now() - 24 * 60 * 60 * 1000)
        })], rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      const request: CastVoteRequest = {
        proposalId: 'proposal-123',
        choice: VoteChoice.YES
      };

      await expect(governanceService.castVote('user-1', request))
        .rejects.toThrow('Voting period has ended');
    });

    it('should throw error when user has already voted', async () => {
      const mockClient = createMockClient([
        { rows: [createMockProposal()], rowCount: 1 },
        { rows: [{ id: 'existing-vote' }], rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      const request: CastVoteRequest = {
        proposalId: 'proposal-123',
        choice: VoteChoice.YES
      };

      await expect(governanceService.castVote('user-1', request))
        .rejects.toThrow('User has already voted on this proposal');
    });
  });

  describe('getVotingPower', () => {
    it('should return voting power when user exists', async () => {
      const mockRow = {
        user_id: 'user-1',
        reputation_score: 100,
        stake_amount: 200,
        delegated_power: 50
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as any);

      const result = await governanceService.getVotingPower('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.reputationScore).toBe(100);
      expect(result.stakeAmount).toBe(200);
      expect(result.delegatedPower).toBe(50);
      expect(result.totalPower).toBe(350);
    });

    it('should return zero voting power when user does not exist', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await governanceService.getVotingPower('new-user');

      expect(result.userId).toBe('new-user');
      expect(result.totalPower).toBe(0);
    });
  });

  describe('delegateVotingPower', () => {
    it('should throw error when delegating to self', async () => {
      await expect(governanceService.delegateVotingPower('user-1', {
        delegateId: 'user-1',
        votingPower: 100
      })).rejects.toThrow('Cannot delegate to yourself');
    });

    it('should throw error when insufficient voting power', async () => {
      jest.spyOn(governanceService, 'getVotingPower').mockResolvedValue({
        userId: 'user-1',
        reputationScore: 50,
        stakeAmount: 50,
        delegatedPower: 0,
        totalPower: 100,
        lastUpdated: new Date()
      });

      await expect(governanceService.delegateVotingPower('user-1', {
        delegateId: 'user-2',
        votingPower: 200
      })).rejects.toThrow('Insufficient voting power to delegate');
    });

    it('should delegate voting power successfully', async () => {
      jest.spyOn(governanceService, 'getVotingPower').mockResolvedValue({
        userId: 'user-1',
        reputationScore: 100,
        stakeAmount: 100,
        delegatedPower: 0,
        totalPower: 200,
        lastUpdated: new Date()
      });

      const mockDelegation = {
        id: 'delegation-123',
        delegatorId: 'user-1',
        delegateId: 'user-2',
        votingPower: 100,
        startTime: new Date(),
        endTime: null,
        active: true,
        createdAt: new Date()
      };

      const mockClient = createMockClient([
        { rows: [], rowCount: 0 },
        { rows: [mockDelegation], rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      const result = await governanceService.delegateVotingPower('user-1', {
        delegateId: 'user-2',
        votingPower: 100
      });

      expect(result).toEqual(mockDelegation);
    });

    it('should calculate end time when duration is provided', async () => {
      jest.spyOn(governanceService, 'getVotingPower').mockResolvedValue({
        userId: 'user-1',
        reputationScore: 100,
        stakeAmount: 100,
        delegatedPower: 0,
        totalPower: 200,
        lastUpdated: new Date()
      });

      const mockClient = createMockClient([
        { rows: [], rowCount: 0 },
        { rows: [{ id: 'delegation-123' }], rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      await governanceService.delegateVotingPower('user-1', {
        delegateId: 'user-2',
        votingPower: 100,
        duration: 30
      });

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([expect.any(Date), expect.any(Date)]));
    });
  });

  describe('calculateProposalResults', () => {
    it('should calculate results correctly when proposal passes', async () => {
      const mockRow = {
        id: 'proposal-123',
        voting_mechanism: VotingMechanism.SIMPLE_MAJORITY,
        total_votes: '30',
        yes_votes: '20',
        no_votes: '10',
        abstain_votes: '5',
        yes_weight: '20',
        no_weight: '10',
        abstain_weight: '5',
        total_eligible_voters: '100'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as any);

      const result = await governanceService.calculateProposalResults('proposal-123');

      expect(result.proposalId).toBe('proposal-123');
      expect(result.totalVotes).toBe(30);
      expect(result.yesVotes).toBe(20);
      expect(result.noVotes).toBe(10);
      expect(result.abstainVotes).toBe(5);
      expect(result.quorumReached).toBe(true);
      expect(result.passed).toBe(true);
      expect(result.participationRate).toBe(30);
    });

    it('should calculate results correctly when quorum not reached', async () => {
      const mockRow = {
        id: 'proposal-123',
        voting_mechanism: VotingMechanism.SIMPLE_MAJORITY,
        total_votes: '10',
        yes_votes: '8',
        no_votes: '2',
        abstain_votes: '0',
        yes_weight: '8',
        no_weight: '2',
        abstain_weight: '0',
        total_eligible_voters: '100'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as any);

      const result = await governanceService.calculateProposalResults('proposal-123');

      expect(result.quorumReached).toBe(false);
      expect(result.passed).toBe(false);
    });

    it('should calculate results correctly when proposal fails (more no than yes)', async () => {
      const mockRow = {
        id: 'proposal-123',
        voting_mechanism: VotingMechanism.SIMPLE_MAJORITY,
        total_votes: '30',
        yes_votes: '10',
        no_votes: '20',
        abstain_votes: '0',
        yes_weight: '10',
        no_weight: '20',
        abstain_weight: '0',
        total_eligible_voters: '100'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as any);

      const result = await governanceService.calculateProposalResults('proposal-123');

      expect(result.quorumReached).toBe(true);
      expect(result.passed).toBe(false);
    });

    it('should handle tie votes', async () => {
      const mockRow = {
        id: 'proposal-123',
        voting_mechanism: VotingMechanism.SIMPLE_MAJORITY,
        total_votes: '30',
        yes_votes: '15',
        no_votes: '15',
        abstain_votes: '0',
        yes_weight: '15',
        no_weight: '15',
        abstain_weight: '0',
        total_eligible_voters: '100'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as any);

      const result = await governanceService.calculateProposalResults('proposal-123');

      expect(result.passed).toBe(false);
    });

    it('should throw error when proposal not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(governanceService.calculateProposalResults('nonexistent'))
        .rejects.toThrow('Proposal not found');
    });

    it('should handle zero eligible voters', async () => {
      const mockRow = {
        id: 'proposal-123',
        voting_mechanism: VotingMechanism.SIMPLE_MAJORITY,
        total_votes: '0',
        yes_votes: '0',
        no_votes: '0',
        abstain_votes: '0',
        yes_weight: '0',
        no_weight: '0',
        abstain_weight: '0',
        total_eligible_voters: '0'
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as any);

      const result = await governanceService.calculateProposalResults('proposal-123');

      expect(result.passed).toBe(false);
      expect(result.participationRate).toBe(0);
    });
  });

  describe('executeProposal', () => {
    it('should throw error when proposal not found', async () => {
      const mockClient = createMockClient([
        { rows: [], rowCount: 0 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      await expect(governanceService.executeProposal('nonexistent'))
        .rejects.toThrow('Proposal not found');
    });

    it('should throw error when proposal has not passed', async () => {
      const mockClient = createMockClient([{
        rows: [{
          id: 'proposal-123',
          status: ProposalStatus.ACTIVE,
          votingEndTime: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }],
        rowCount: 1
      }]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      await expect(governanceService.executeProposal('proposal-123'))
        .rejects.toThrow('Proposal has not passed');
    });

    it('should throw error when execution delay has not passed', async () => {
      const mockClient = createMockClient([{
        rows: [{
          id: 'proposal-123',
          status: ProposalStatus.PASSED,
          votingEndTime: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }],
        rowCount: 1
      }]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      await expect(governanceService.executeProposal('proposal-123'))
        .rejects.toThrow('Execution delay period has not passed');
    });

    it('should execute proposal successfully when all conditions met', async () => {
      const mockClient = createMockClient([{
        rows: [{
          id: 'proposal-123',
          status: ProposalStatus.PASSED,
          votingEndTime: new Date(Date.now() - 49 * 60 * 60 * 1000),
          proposalType: ProposalType.TREASURY_ALLOCATION,
          metadata: {}
        }],
        rowCount: 1
      },
      { rowCount: 1 }]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      await expect(governanceService.executeProposal('proposal-123')).resolves.not.toThrow();
    });
  });

  describe('finalizeVoting', () => {
    const createMockProposal = (overrides = {}) => ({
      id: 'proposal-123',
      status: ProposalStatus.ACTIVE,
      votingEndTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
      votingMechanism: VotingMechanism.SIMPLE_MAJORITY,
      ...overrides
    });

    beforeEach(() => {
      jest.spyOn(governanceService, 'getProposal');
      jest.spyOn(governanceService, 'calculateProposalResults');
    });

    it('should throw error when proposal not found', async () => {
      (governanceService.getProposal as jest.Mock).mockResolvedValueOnce(null);

      await expect(governanceService.finalizeVoting('nonexistent'))
        .rejects.toThrow('Proposal not found');
    });

    it('should throw error when voting period has not ended', async () => {
      (governanceService.getProposal as jest.Mock).mockResolvedValueOnce({
        ...createMockProposal(),
        votingEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      await expect(governanceService.finalizeVoting('proposal-123'))
        .rejects.toThrow('Voting period has not ended');
    });

    it('should throw error when proposal is not active', async () => {
      (governanceService.getProposal as jest.Mock).mockResolvedValueOnce({
        ...createMockProposal({ status: ProposalStatus.PASSED })
      });

      await expect(governanceService.finalizeVoting('proposal-123'))
        .rejects.toThrow('Proposal is not active');
    });

    it('should finalize proposal as PASSED when results pass', async () => {
      (governanceService.getProposal as jest.Mock).mockResolvedValueOnce(createMockProposal());
      (governanceService.calculateProposalResults as jest.Mock).mockResolvedValueOnce({
        passed: true,
        quorumReached: true
      });

      const mockClient = createMockClient([
        { rowCount: 1 },
        { rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      await governanceService.finalizeVoting('proposal-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE proposals SET status'),
        expect.arrayContaining([ProposalStatus.PASSED])
      );
    });

    it('should finalize proposal as REJECTED when results fail', async () => {
      (governanceService.getProposal as jest.Mock).mockResolvedValueOnce(createMockProposal());
      (governanceService.calculateProposalResults as jest.Mock).mockResolvedValueOnce({
        passed: false,
        quorumReached: true
      });

      const mockClient = createMockClient([
        { rowCount: 1 },
        { rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      await governanceService.finalizeVoting('proposal-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE proposals SET status'),
        expect.arrayContaining([ProposalStatus.REJECTED])
      );
    });

    it('should publish proposal.finalized event', async () => {
      (governanceService.getProposal as jest.Mock).mockResolvedValueOnce(createMockProposal());
      (governanceService.calculateProposalResults as jest.Mock).mockResolvedValueOnce({
        passed: true,
        quorumReached: true
      });

      const mockClient = createMockClient([
        { rowCount: 1 },
        { rowCount: 1 }
      ]);

      mockDb.transaction.mockImplementation(async (callback) => callback(mockClient));

      await governanceService.finalizeVoting('proposal-123');

      expect(mockPublish).toHaveBeenCalledWith(
        'proposal.finalized',
        expect.objectContaining({
          proposalId: 'proposal-123',
          status: ProposalStatus.PASSED
        })
      );
    });
  });
});
