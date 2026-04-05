import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import {
  Proposal,
  Vote,
  VotingPower,
  Delegation,
  ProposalResults,
  CreateProposalRequest,
  CastVoteRequest,
  DelegateVotingPowerRequest,
  ProposalStatus,
  VoteChoice,
  VotingMechanism
} from '../types';
import {
  calculateVoteWeight,
  calculateQuorumRequirement,
  hasProposalPassed,
  calculateParticipationRate,
  getConvictionMultiplier
} from '../utils/voting-algorithms';
import { config } from '../config';
import { EventService } from './events.service';

export class GovernanceService {
  private eventService: EventService;

  constructor() {
    this.eventService = new EventService();
  }

  /**
   * Create a new proposal
   */
  async createProposal(
    userId: string,
    request: CreateProposalRequest
  ): Promise<Proposal> {
    // Validate deposit
    if (request.deposit < config.governance.minProposalDeposit) {
      throw new Error(
        `Minimum deposit of ${config.governance.minProposalDeposit} required`
      );
    }

    const proposalId = uuidv4();
    const now = new Date();
    const votingEndTime = new Date(
      now.getTime() + config.governance.votingPeriodDays * 24 * 60 * 60 * 1000
    );

    const query = `
      INSERT INTO proposals (
        id, title, description, proposal_type, voting_mechanism,
        proposer_id, deposit, status, voting_start_time, voting_end_time,
        metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await db.query<Proposal>(query, [
      proposalId,
      request.title,
      request.description,
      request.proposalType,
      request.votingMechanism,
      userId,
      request.deposit,
      ProposalStatus.ACTIVE,
      now,
      votingEndTime,
      JSON.stringify(request.metadata || {}),
      now,
      now
    ]);

    const proposal = result.rows[0];

    // Publish event
    await this.eventService.publish('proposal.created', {
      proposalId,
      proposerId: userId,
      title: request.title,
      proposalType: request.proposalType
    });

    logger.info('Proposal created', { proposalId, userId });

    return proposal;
  }

  /**
   * Get proposal by ID
   */
  async getProposal(proposalId: string): Promise<Proposal | null> {
    const query = 'SELECT * FROM proposals WHERE id = $1';
    const result = await db.query<Proposal>(query, [proposalId]);
    return result.rows[0] || null;
  }

  /**
   * List proposals with filters
   */
  async listProposals(
    status?: ProposalStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<Proposal[]> {
    let query = 'SELECT * FROM proposals';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await db.query<Proposal>(query, params);
    return result.rows;
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(
    userId: string,
    request: CastVoteRequest
  ): Promise<Vote> {
    return await db.transaction(async (client) => {
      // Get proposal
      const proposalResult = await client.query<Proposal>(
        'SELECT * FROM proposals WHERE id = $1 FOR UPDATE',
        [request.proposalId]
      );

      const proposal = proposalResult.rows[0];
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      // Validate proposal status
      if (proposal.status !== ProposalStatus.ACTIVE) {
        throw new Error('Proposal is not active');
      }

      // Check voting period
      const now = new Date();
      if (now < proposal.votingStartTime || now > proposal.votingEndTime) {
        throw new Error('Voting period has ended');
      }

      // Check for existing vote
      const existingVoteResult = await client.query(
        'SELECT id FROM votes WHERE proposal_id = $1 AND voter_id = $2',
        [request.proposalId, userId]
      );

      if (existingVoteResult.rows.length > 0) {
        throw new Error('User has already voted on this proposal');
      }

      // Get voting power
      const votingPower = await this.getVotingPower(userId);

      // Calculate vote weight
      const voteId = uuidv4();
      const weight = calculateVoteWeight(
        {
          id: voteId,
          proposalId: request.proposalId,
          voterId: userId,
          choice: request.choice,
          votingPower: votingPower.totalPower,
          weight: 0,
          convictionMultiplier: request.convictionMultiplier,
          timestamp: now
        },
        votingPower,
        proposal.votingMechanism
      );

      // Insert vote
      const insertQuery = `
        INSERT INTO votes (
          id, proposal_id, voter_id, choice, voting_power, weight,
          conviction_multiplier, timestamp, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const voteResult = await client.query<Vote>(insertQuery, [
        voteId,
        request.proposalId,
        userId,
        request.choice,
        votingPower.totalPower,
        weight,
        request.convictionMultiplier || 1,
        now,
        '{}'
      ]);

      const vote = voteResult.rows[0];

      // Publish event
      await this.eventService.publish('vote.cast', {
        voteId,
        proposalId: request.proposalId,
        voterId: userId,
        choice: request.choice
      });

      logger.info('Vote cast', { voteId, proposalId: request.proposalId, userId });

      return vote;
    });
  }

  /**
   * Get voting power for a user
   */
  async getVotingPower(userId: string): Promise<VotingPower> {
    // Get base voting power (reputation + stake)
    const query = `
      SELECT 
        user_id,
        reputation_score,
        stake_amount,
        COALESCE(
          (SELECT SUM(voting_power) 
           FROM delegations 
           WHERE delegate_id = $1 AND active = true),
          0
        ) as delegated_power
      FROM voting_power
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      // Initialize voting power if not exists
      return {
        userId,
        reputationScore: 0,
        stakeAmount: 0,
        delegatedPower: 0,
        totalPower: 0,
        lastUpdated: new Date()
      };
    }

    const row = result.rows[0];
    const totalPower = row.reputation_score + row.stake_amount + row.delegated_power;

    return {
      userId: row.user_id,
      reputationScore: row.reputation_score,
      stakeAmount: row.stake_amount,
      delegatedPower: row.delegated_power,
      totalPower,
      lastUpdated: new Date()
    };
  }

  /**
   * Delegate voting power to another user
   */
  async delegateVotingPower(
    userId: string,
    request: DelegateVotingPowerRequest
  ): Promise<Delegation> {
    return await db.transaction(async (client) => {
      // Validate delegation
      if (userId === request.delegateId) {
        throw new Error('Cannot delegate to yourself');
      }

      // Get current voting power
      const votingPower = await this.getVotingPower(userId);

      if (request.votingPower > votingPower.totalPower) {
        throw new Error('Insufficient voting power to delegate');
      }

      // Deactivate existing delegations
      await client.query(
        'UPDATE delegations SET active = false WHERE delegator_id = $1 AND active = true',
        [userId]
      );

      // Create new delegation
      const delegationId = uuidv4();
      const now = new Date();
      const endTime = request.duration
        ? new Date(now.getTime() + request.duration * 24 * 60 * 60 * 1000)
        : null;

      const query = `
        INSERT INTO delegations (
          id, delegator_id, delegate_id, voting_power, start_time, end_time, active, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await client.query<Delegation>(query, [
        delegationId,
        userId,
        request.delegateId,
        request.votingPower,
        now,
        endTime,
        true,
        now
      ]);

      const delegation = result.rows[0];

      // Publish event
      await this.eventService.publish('voting_power.delegated', {
        delegationId,
        delegatorId: userId,
        delegateId: request.delegateId,
        votingPower: request.votingPower
      });

      logger.info('Voting power delegated', {
        delegationId,
        delegatorId: userId,
        delegateId: request.delegateId
      });

      return delegation;
    });
  }

  /**
   * Calculate proposal results
   */
  async calculateProposalResults(proposalId: string): Promise<ProposalResults> {
    const query = `
      SELECT 
        p.id,
        p.voting_mechanism,
        COUNT(v.id) as total_votes,
        SUM(CASE WHEN v.choice = 'yes' THEN 1 ELSE 0 END) as yes_votes,
        SUM(CASE WHEN v.choice = 'no' THEN 1 ELSE 0 END) as no_votes,
        SUM(CASE WHEN v.choice = 'abstain' THEN 1 ELSE 0 END) as abstain_votes,
        SUM(CASE WHEN v.choice = 'yes' THEN v.weight ELSE 0 END) as yes_weight,
        SUM(CASE WHEN v.choice = 'no' THEN v.weight ELSE 0 END) as no_weight,
        SUM(CASE WHEN v.choice = 'abstain' THEN v.weight ELSE 0 END) as abstain_weight,
        (SELECT COUNT(*) FROM voting_power) as total_eligible_voters
      FROM proposals p
      LEFT JOIN votes v ON p.id = v.proposal_id
      WHERE p.id = $1
      GROUP BY p.id, p.voting_mechanism
    `;

    const result = await db.query(query, [proposalId]);

    if (result.rows.length === 0) {
      throw new Error('Proposal not found');
    }

    const row = result.rows[0];
    const totalVotes = parseInt(row.total_votes) || 0;
    const totalEligibleVoters = parseInt(row.total_eligible_voters) || 0;
    const quorumRequired = calculateQuorumRequirement(
      totalEligibleVoters,
      config.governance.minQuorumPercentage
    );

    const yesWeight = parseFloat(row.yes_weight) || 0;
    const noWeight = parseFloat(row.no_weight) || 0;
    const abstainWeight = parseFloat(row.abstain_weight) || 0;

    const quorumReached = totalVotes >= quorumRequired;
    const passed = hasProposalPassed(
      yesWeight,
      noWeight,
      abstainWeight,
      totalVotes,
      quorumRequired,
      row.voting_mechanism as VotingMechanism
    );

    const participationRate = calculateParticipationRate(
      totalVotes,
      totalEligibleVoters
    );

    return {
      proposalId,
      totalVotes,
      yesVotes: parseInt(row.yes_votes) || 0,
      noVotes: parseInt(row.no_votes) || 0,
      abstainVotes: parseInt(row.abstain_votes) || 0,
      yesWeight,
      noWeight,
      abstainWeight,
      quorumReached,
      passed,
      totalEligibleVoters,
      participationRate
    };
  }

  /**
   * Execute a proposal if it passed
   */
  async executeProposal(proposalId: string): Promise<void> {
    return await db.transaction(async (client) => {
      // Get proposal
      const proposalResult = await client.query<Proposal>(
        'SELECT * FROM proposals WHERE id = $1 FOR UPDATE',
        [proposalId]
      );

      const proposal = proposalResult.rows[0];
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      // Check status
      if (proposal.status !== ProposalStatus.PASSED) {
        throw new Error('Proposal has not passed');
      }

      // Check execution delay
      const now = new Date();
      const executionTime = new Date(
        proposal.votingEndTime.getTime() +
        config.governance.executionDelayHours * 60 * 60 * 1000
      );

      if (now < executionTime) {
        throw new Error('Execution delay period has not passed');
      }

      // Update proposal status
      await client.query(
        'UPDATE proposals SET status = $1, executed_at = $2 WHERE id = $3',
        [ProposalStatus.EXECUTED, now, proposalId]
      );

      // Publish event for execution
      await this.eventService.publish('proposal.executed', {
        proposalId,
        proposalType: proposal.proposalType,
        metadata: proposal.metadata
      });

      logger.info('Proposal executed', { proposalId });
    });
  }

  /**
   * Finalize voting for proposals that have ended
   */
  async finalizeVoting(proposalId: string): Promise<void> {
    return await db.transaction(async (client) => {
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      // Check if voting period has ended
      const now = new Date();
      if (now <= proposal.votingEndTime) {
        throw new Error('Voting period has not ended');
      }

      if (proposal.status !== ProposalStatus.ACTIVE) {
        throw new Error('Proposal is not active');
      }

      // Calculate results
      const results = await this.calculateProposalResults(proposalId);

      // Update proposal status
      const newStatus = results.passed ? ProposalStatus.PASSED : ProposalStatus.REJECTED;

      await client.query(
        'UPDATE proposals SET status = $1, updated_at = $2 WHERE id = $3',
        [newStatus, now, proposalId]
      );

      // Publish event
      await this.eventService.publish('proposal.finalized', {
        proposalId,
        status: newStatus,
        results
      });

      logger.info('Proposal voting finalized', { proposalId, status: newStatus });
    });
  }
}
