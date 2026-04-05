import { GovernanceController } from '../controllers/governance.controller';
import { GovernanceService } from '../services/governance.service';
import { Request, Response } from 'express';
import { ProposalStatus, VoteChoice, VotingMechanism, ProposalType } from '../types';

jest.mock('../services/governance.service');

const mockGovernanceService = GovernanceService as jest.MockedClass<typeof GovernanceService>;

describe('GovernanceController', () => {
  let controller: GovernanceController;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new GovernanceController();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };
  });

  const mockRequestWithUser = (userId: string | undefined, body: any = {}, params: any = {}, query: any = {}): any => ({
    body,
    params,
    query,
    user: userId ? { id: userId } : undefined
  });

  describe('createProposal', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = mockRequestWithUser(undefined, {
        title: 'Test',
        description: 'Test',
        proposalType: ProposalType.TREASURY_ALLOCATION,
        votingMechanism: VotingMechanism.SIMPLE_MAJORITY,
        deposit: 100
      });

      await controller.createProposal(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should create proposal successfully', async () => {
      const mockProposal = {
        id: 'proposal-123',
        title: 'Test Proposal',
        status: ProposalStatus.ACTIVE
      };

      mockGovernanceService.prototype.createProposal.mockResolvedValueOnce(mockProposal as any);

      const mockRequest = mockRequestWithUser('user-123', {
        title: 'Test Proposal',
        description: 'Test',
        proposalType: ProposalType.TREASURY_ALLOCATION,
        votingMechanism: VotingMechanism.SIMPLE_MAJORITY,
        deposit: 100
      });

      await controller.createProposal(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockProposal);
    });

    it('should return 400 when service throws error', async () => {
      mockGovernanceService.prototype.createProposal.mockRejectedValueOnce(
        new Error('Minimum deposit required')
      );

      const mockRequest = mockRequestWithUser('user-123', {
        title: 'Test',
        deposit: 50
      });

      await controller.createProposal(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Minimum deposit required' });
    });
  });

  describe('getProposal', () => {
    it('should return proposal when found', async () => {
      const mockProposal = {
        id: 'proposal-123',
        title: 'Test'
      };

      mockGovernanceService.prototype.getProposal.mockResolvedValueOnce(mockProposal as any);

      const mockRequest = mockRequestWithUser(undefined, {}, { id: 'proposal-123' });

      await controller.getProposal(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(mockProposal);
    });

    it('should return 404 when proposal not found', async () => {
      mockGovernanceService.prototype.getProposal.mockResolvedValueOnce(null);

      const mockRequest = mockRequestWithUser(undefined, {}, { id: 'nonexistent' });

      await controller.getProposal(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Proposal not found' });
    });

    it('should return 500 on service error', async () => {
      mockGovernanceService.prototype.getProposal.mockRejectedValueOnce(
        new Error('Database error')
      );

      const mockRequest = mockRequestWithUser(undefined, {}, { id: 'proposal-123' });

      await controller.getProposal(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('listProposals', () => {
    it('should list all proposals without filters', async () => {
      const mockProposals = [
        { id: 'proposal-1' },
        { id: 'proposal-2' }
      ];

      mockGovernanceService.prototype.listProposals.mockResolvedValueOnce(mockProposals as any);

      const mockRequest = mockRequestWithUser(undefined, {}, {}, {});

      await controller.listProposals(mockRequest as Request, mockResponse as Response);

      expect(mockGovernanceService.prototype.listProposals).toHaveBeenCalledWith(undefined, 50, 0);
      expect(mockJson).toHaveBeenCalledWith(mockProposals);
    });

    it('should list proposals with status filter', async () => {
      mockGovernanceService.prototype.listProposals.mockResolvedValueOnce([] as any);

      const mockRequest = mockRequestWithUser(undefined, {}, {}, { status: ProposalStatus.ACTIVE });

      await controller.listProposals(mockRequest as Request, mockResponse as Response);

      expect(mockGovernanceService.prototype.listProposals).toHaveBeenCalledWith(
        ProposalStatus.ACTIVE,
        50,
        0
      );
    });

    it('should parse limit and offset from query', async () => {
      mockGovernanceService.prototype.listProposals.mockResolvedValueOnce([] as any);

      const mockRequest = mockRequestWithUser(undefined, {}, {}, { limit: '25', offset: '10' });

      await controller.listProposals(mockRequest as Request, mockResponse as Response);

      expect(mockGovernanceService.prototype.listProposals).toHaveBeenCalledWith(undefined, 25, 10);
    });

    it('should use defaults for invalid limit/offset', async () => {
      mockGovernanceService.prototype.listProposals.mockResolvedValueOnce([] as any);

      const mockRequest = mockRequestWithUser(undefined, {}, {}, { limit: 'invalid', offset: 'invalid' });

      await controller.listProposals(mockRequest as Request, mockResponse as Response);

      expect(mockGovernanceService.prototype.listProposals).toHaveBeenCalledWith(undefined, 50, 0);
    });
  });

  describe('castVote', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = mockRequestWithUser(undefined, { choice: VoteChoice.YES }, { id: 'proposal-123' });

      await controller.castVote(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should cast vote successfully', async () => {
      const mockVote = {
        id: 'vote-123',
        proposalId: 'proposal-123',
        choice: VoteChoice.YES
      };

      mockGovernanceService.prototype.castVote.mockResolvedValueOnce(mockVote as any);

      const mockRequest = mockRequestWithUser('user-123', { choice: VoteChoice.YES }, { id: 'proposal-123' });

      await controller.castVote(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockVote);
    });

    it('should pass conviction multiplier if provided', async () => {
      mockGovernanceService.prototype.castVote.mockResolvedValueOnce({} as any);

      const mockRequest = mockRequestWithUser('user-123', { choice: VoteChoice.YES, convictionMultiplier: 2 }, { id: 'proposal-123' });

      await controller.castVote(mockRequest as Request, mockResponse as Response);

      expect(mockGovernanceService.prototype.castVote).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ convictionMultiplier: 2 })
      );
    });

    it('should return 400 when service throws error', async () => {
      mockGovernanceService.prototype.castVote.mockRejectedValueOnce(
        new Error('Voting period has ended')
      );

      const mockRequest = mockRequestWithUser('user-123', { choice: VoteChoice.YES }, { id: 'proposal-123' });

      await controller.castVote(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Voting period has ended' });
    });
  });

  describe('executeProposal', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = mockRequestWithUser(undefined, {}, { id: 'proposal-123' });

      await controller.executeProposal(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should execute proposal successfully', async () => {
      mockGovernanceService.prototype.executeProposal.mockResolvedValueOnce();

      const mockRequest = mockRequestWithUser('user-123', {}, { id: 'proposal-123' });

      await controller.executeProposal(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({ message: 'Proposal executed successfully' });
    });

    it('should return 400 when service throws error', async () => {
      mockGovernanceService.prototype.executeProposal.mockRejectedValueOnce(
        new Error('Execution delay has not passed')
      );

      const mockRequest = mockRequestWithUser('user-123', {}, { id: 'proposal-123' });

      await controller.executeProposal(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Execution delay has not passed' });
    });
  });

  describe('delegateVotingPower', () => {
    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = mockRequestWithUser(undefined, { delegateId: 'user-2', votingPower: 100 });

      await controller.delegateVotingPower(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it('should delegate voting power successfully', async () => {
      const mockDelegation = {
        id: 'delegation-123',
        delegatorId: 'user-1',
        delegateId: 'user-2',
        votingPower: 100
      };

      mockGovernanceService.prototype.delegateVotingPower.mockResolvedValueOnce(mockDelegation as any);

      const mockRequest = mockRequestWithUser('user-1', { delegateId: 'user-2', votingPower: 100 });

      await controller.delegateVotingPower(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(mockDelegation);
    });

    it('should include duration if provided', async () => {
      mockGovernanceService.prototype.delegateVotingPower.mockResolvedValueOnce({} as any);

      const mockRequest = mockRequestWithUser('user-1', { delegateId: 'user-2', votingPower: 100, duration: 30 });

      await controller.delegateVotingPower(mockRequest as Request, mockResponse as Response);

      expect(mockGovernanceService.prototype.delegateVotingPower).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ duration: 30 })
      );
    });
  });

  describe('getVotingPower', () => {
    it('should get voting power successfully', async () => {
      const mockVotingPower = {
        userId: 'user-123',
        totalPower: 250
      };

      mockGovernanceService.prototype.getVotingPower.mockResolvedValueOnce(mockVotingPower as any);

      const mockRequest = mockRequestWithUser(undefined, {}, { userId: 'user-123' });

      await controller.getVotingPower(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(mockVotingPower);
    });

    it('should return 500 on service error', async () => {
      mockGovernanceService.prototype.getVotingPower.mockRejectedValueOnce(
        new Error('Database error')
      );

      const mockRequest = mockRequestWithUser(undefined, {}, { userId: 'user-123' });

      await controller.getVotingPower(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('getProposalResults', () => {
    it('should get proposal results successfully', async () => {
      const mockResults = {
        proposalId: 'proposal-123',
        passed: true,
        totalVotes: 30
      };

      mockGovernanceService.prototype.calculateProposalResults.mockResolvedValueOnce(mockResults as any);

      const mockRequest = mockRequestWithUser(undefined, {}, { id: 'proposal-123' });

      await controller.getProposalResults(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith(mockResults);
    });

    it('should return 500 on service error', async () => {
      mockGovernanceService.prototype.calculateProposalResults.mockRejectedValueOnce(
        new Error('Proposal not found')
      );

      const mockRequest = mockRequestWithUser(undefined, {}, { id: 'proposal-123' });

      await controller.getProposalResults(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('finalizeVoting', () => {
    it('should finalize voting successfully', async () => {
      mockGovernanceService.prototype.finalizeVoting.mockResolvedValueOnce();

      const mockRequest = mockRequestWithUser(undefined, {}, { id: 'proposal-123' });

      await controller.finalizeVoting(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({ message: 'Voting finalized successfully' });
    });

    it('should return 400 when service throws error', async () => {
      mockGovernanceService.prototype.finalizeVoting.mockRejectedValueOnce(
        new Error('Voting period has not ended')
      );

      const mockRequest = mockRequestWithUser(undefined, {}, { id: 'proposal-123' });

      await controller.finalizeVoting(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Voting period has not ended' });
    });
  });
});
