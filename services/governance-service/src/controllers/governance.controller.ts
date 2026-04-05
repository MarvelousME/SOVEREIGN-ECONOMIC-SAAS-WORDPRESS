import { Request, Response } from 'express';
import { GovernanceService } from '../services/governance.service';
import { CreateProposalRequest, CastVoteRequest, DelegateVotingPowerRequest, ProposalStatus } from '../types';
import { logger } from '../utils/logger';

export class GovernanceController {
  private governanceService: GovernanceService;

  constructor() {
    this.governanceService = new GovernanceService();
  }

  /**
   * Create a new proposal
   */
  createProposal = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: CreateProposalRequest = req.body;
      const proposal = await this.governanceService.createProposal(userId, request);

      res.status(201).json(proposal);
    } catch (error) {
      logger.error('Error creating proposal', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Get proposal by ID
   */
  getProposal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const proposal = await this.governanceService.getProposal(id);

      if (!proposal) {
        res.status(404).json({ error: 'Proposal not found' });
        return;
      }

      res.json(proposal);
    } catch (error) {
      logger.error('Error getting proposal', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * List proposals
   */
  listProposals = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = req.query.status as ProposalStatus | undefined;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const proposals = await this.governanceService.listProposals(status, limit, offset);

      res.json(proposals);
    } catch (error) {
      logger.error('Error listing proposals', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Cast a vote
   */
  castVote = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const request: CastVoteRequest = {
        proposalId: id,
        ...req.body
      };

      const vote = await this.governanceService.castVote(userId, request);

      res.status(201).json(vote);
    } catch (error) {
      logger.error('Error casting vote', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Execute a proposal
   */
  executeProposal = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      await this.governanceService.executeProposal(id);

      res.json({ message: 'Proposal executed successfully' });
    } catch (error) {
      logger.error('Error executing proposal', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Delegate voting power
   */
  delegateVotingPower = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: DelegateVotingPowerRequest = req.body;
      const delegation = await this.governanceService.delegateVotingPower(userId, request);

      res.status(201).json(delegation);
    } catch (error) {
      logger.error('Error delegating voting power', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };

  /**
   * Get voting power
   */
  getVotingPower = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const votingPower = await this.governanceService.getVotingPower(userId);

      res.json(votingPower);
    } catch (error) {
      logger.error('Error getting voting power', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Get proposal results
   */
  getProposalResults = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const results = await this.governanceService.calculateProposalResults(id);

      res.json(results);
    } catch (error) {
      logger.error('Error getting proposal results', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  /**
   * Finalize voting
   */
  finalizeVoting = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.governanceService.finalizeVoting(id);

      res.json({ message: 'Voting finalized successfully' });
    } catch (error) {
      logger.error('Error finalizing voting', { error });
      res.status(400).json({ error: (error as Error).message });
    }
  };
}
