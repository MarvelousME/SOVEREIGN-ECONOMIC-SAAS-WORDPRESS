-- Seed File: 003_seed_governance_rewards.sql
-- Description: Seed data for governance, rewards, and reputation schemas
-- Created: 2026-04-08
-- Requirements: Extensions (uuid-ossp), existing users, tenants, achievements, reward_pools

BEGIN;

SET session_replication_role = replica;

\echo '==============================================='
\echo 'Governance, Rewards & Reputation Seed Data'
\echo 'Loading test data...'
\echo '==============================================='

-- ============================================
-- GOVERNANCE CONFIG
-- ============================================
\echo 'Seeding governance_config...'

INSERT INTO governance_config (tenant_id, voting_mechanism, quorum, approval_threshold, execution_delay_hours, voting_period_hours, active) VALUES
(1, 'simple_majority', 0.1000, 0.5100, 48, 168, true),
(1, 'supermajority', 0.2000, 0.6667, 72, 336, true),
(2, 'simple_majority', 0.1500, 0.5500, 24, 120, true);

-- ============================================
-- PROPOSALS (12 proposals with various states)
-- ============================================
\echo 'Seeding proposals...'

-- Draft proposals
INSERT INTO proposals (tenant_id, proposer_id, title, description, proposal_type, status, voting_starts_at, voting_ends_at) VALUES
(1, 1, 'Increase UBI Base Distribution', 'Proposal to increase the monthly UBI base amount from $500 to $600 per eligible member to address inflation concerns.', 'parameter_change', 'draft', NULL, NULL),
(1, 2, 'Add Machine Learning Skill Category', 'Introduce a new task category for ML/AI-related tasks to expand the task marketplace offerings.', 'feature_request', 'draft', NULL, NULL);

-- Active proposals (voting in progress)
INSERT INTO proposals (tenant_id, proposer_id, title, description, proposal_type, status, voting_starts_at, voting_ends_at, total_votes, votes_for, votes_against, votes_abstain) VALUES
(1, 1, 'Treasury Reserve Allocation for Q2', 'Allocate 15% of treasury reserves to strategic investments in emerging markets for Q2 2026.', 'treasury_allocation', 'active', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 0, 0, 0, 0),
(1, 3, 'Reduce Task Submission Timeout', 'Reduce the task submission timeout from 72 hours to 48 hours to improve task completion rates.', 'parameter_change', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 0, 0, 0, 0),
(1, 2, 'Implement Quadratic Voting', 'Adopt quadratic voting mechanism for all governance proposals to reduce wealth bias.', 'rule_change', 'active', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 0, 0, 0, 0),
(2, 4, 'Community Event Budget Increase', 'Increase the monthly community event budget from $2000 to $3500 for virtual meetups.', 'treasury_allocation', 'active', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 0, 0, 0, 0);

-- Passed proposals
INSERT INTO proposals (tenant_id, proposer_id, title, description, proposal_type, status, voting_starts_at, voting_ends_at, executed_at, total_votes, votes_for, votes_against, votes_abstain, quorum_reached) VALUES
(1, 1, 'Weekly UBI Distribution Frequency', 'Change UBI distribution from monthly to weekly for better cash flow management.', 'parameter_change', 'passed', NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days', 45, 3200.5000, 850.2500, 120.5000, true),
(1, 2, 'Introduce Task Quality Badges', 'Add quality-based badges (Bronze, Silver, Gold, Platinum) for task performers.', 'feature_request', 'passed', NOW() - INTERVAL '21 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days', 38, 2100.0000, 600.0000, 150.0000, true),
(1, 3, 'Reduce Proposal Deposit Requirement', 'Lower the minimum deposit for proposals from 1000 to 500 tokens.', 'parameter_change', 'passed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days', 52, 4500.7500, 1200.2500, 200.0000, true);

-- Rejected proposals
INSERT INTO proposals (tenant_id, proposer_id, title, description, proposal_type, status, voting_starts_at, voting_ends_at, total_votes, votes_for, votes_against, votes_abstain, quorum_reached) VALUES
(1, 1, 'Eliminate Task Platform Fees', 'Remove all platform fees for task completion to boost volume.', 'parameter_change', 'rejected', NOW() - INTERVAL '10 days', NOW() - INTERVAL '3 days', 28, 800.0000, 2400.5000, 100.0000, false),
(1, 2, 'Extend Voting Period to 30 Days', 'Extend governance voting period from 7 days to 30 days for more deliberation.', 'rule_change', 'rejected', NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', 35, 1100.0000, 1800.0000, 100.0000, true);

-- Executed proposal
INSERT INTO proposals (tenant_id, proposer_id, title, description, proposal_type, status, voting_starts_at, voting_ends_at, executed_at, total_votes, votes_for, votes_against, votes_abstain, quorum_reached) VALUES
(1, 1, 'Emergency Treasury Diversification', 'Immediately diversify 25% of treasury into stablecoins due to market volatility.', 'emergency', 'executed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 62, 5800.0000, 400.0000, 50.0000, true);

-- Cancelled proposal
INSERT INTO proposals (tenant_id, proposer_id, title, description, proposal_type, status, voting_starts_at, voting_ends_at, total_votes, votes_for, votes_against, votes_abstain) VALUES
(1, 3, 'Introduce Agent Revenue Sharing', 'Share 10% of agent revenue with top contributors (cancelled due to legal review).', 'feature_request', 'cancelled', NOW() - INTERVAL '7 days', NULL, 5, 200.0000, 50.0000, 10.0000);

-- ============================================
-- VOTES (50+ votes distributed across proposals)
-- ============================================
\echo 'Seeding votes...'

-- Votes for proposal 3 (Treasury Reserve Allocation - Active)
INSERT INTO votes (proposal_id, voter_id, vote_type, voting_power, reason) VALUES
(3, 1, 'for', 150.0000, 'Strategic diversification is essential'),
(3, 2, 'for', 120.0000, 'Good risk management'),
(3, 3, 'for', 85.0000, 'Emerging markets have growth potential'),
(3, 4, 'against', 45.0000, 'Too risky during volatility'),
(3, 5, 'against', 30.0000, 'Prefer conservative approach'),
(3, 1, 'against', 150.0000, 'Better to hold cash reserves'),
(3, 2, 'abstain', 120.0000, 'Need more analysis'),
(3, 3, 'for', 85.0000, 'Diversification benefits outweigh risks'),
(3, 4, 'for', 45.0000, 'Long-term growth opportunity'),
(3, 5, 'for', 30.0000, 'Support treasury team'),
(3, 1, 'for', 150.0000, 'Emerging markets allocation is smart'),
(3, 2, 'against', 120.0000, 'Market timing is uncertain');

-- Votes for proposal 4 (Task Timeout - Active)
INSERT INTO votes (proposal_id, voter_id, vote_type, voting_power, reason) VALUES
(4, 1, 'for', 150.0000, '48 hours is reasonable'),
(4, 2, 'for', 120.0000, 'Faster turnaround improves platform'),
(4, 3, 'against', 85.0000, 'Some tasks need more time'),
(4, 4, 'for', 45.0000, 'Agree with stricter deadlines'),
(4, 5, 'against', 30.0000, '72 hours is industry standard'),
(4, 1, 'against', 150.0000, 'Quality will suffer'),
(4, 2, 'for', 120.0000, 'Task completion rates will improve'),
(4, 3, 'for', 85.0000, 'Support platform efficiency'),
(4, 4, 'abstain', 45.0000, 'Depends on task type'),
(4, 5, 'for', 30.0000, 'Agree with reduction');

-- Votes for proposal 5 (Quadratic Voting - Active)
INSERT INTO votes (proposal_id, voter_id, vote_type, voting_power, reason) VALUES
(5, 1, 'for', 150.0000, 'Reduces wealth influence in voting'),
(5, 2, 'for', 120.0000, 'More democratic process'),
(5, 3, 'against', 85.0000, 'Simple majority is sufficient'),
(5, 4, 'for', 45.0000, 'Support equal voting rights'),
(5, 5, 'against', 30.0000, 'May lead to rushed decisions'),
(5, 1, 'for', 150.0000, 'Better for community engagement'),
(5, 2, 'abstain', 120.0000, 'Need implementation details'),
(5, 3, 'for', 85.0000, 'Quadratic is the future'),
(5, 4, 'against', 45.0000, 'Current system works fine'),
(5, 5, 'for', 30.0000, 'Innovation is good'),
(5, 1, 'against', 150.0000, 'Too experimental'),
(5, 2, 'for', 120.0000, 'Worth trying');

-- Votes for proposal 6 (Community Event Budget - Active)
INSERT INTO votes (proposal_id, voter_id, vote_type, voting_power, reason) VALUES
(6, 4, 'for', 100.0000, 'Community engagement is priority'),
(6, 5, 'for', 80.0000, 'More events build community'),
(6, 4, 'against', 100.0000, 'Budget constraints'),
(6, 5, 'abstain', 80.0000, 'Need breakdown'),
(6, 4, 'for', 100.0000, 'Virtual meetups have ROI'),
(6, 5, 'for', 80.0000, 'Support team recommendation');

-- Votes for proposal 7 (Weekly UBI - Passed)
INSERT INTO votes (proposal_id, voter_id, vote_type, voting_power) VALUES
(7, 1, 'for', 150.0000),
(7, 2, 'for', 120.0000),
(7, 3, 'for', 85.0000),
(7, 4, 'for', 45.0000),
(7, 5, 'for', 30.0000),
(7, 1, 'for', 150.0000),
(7, 2, 'for', 120.0000),
(7, 3, 'against', 85.0000),
(7, 4, 'against', 45.0000),
(7, 5, 'against', 30.0000);

-- Votes for proposal 11 (Emergency Treasury - Executed)
INSERT INTO votes (proposal_id, voter_id, vote_type, voting_power, reason) VALUES
(11, 1, 'for', 150.0000, 'Emergency action justified'),
(11, 2, 'for', 120.0000, 'Market volatility requires action'),
(11, 3, 'for', 85.0000, 'Protect treasury value'),
(11, 4, 'for', 45.0000, 'Agree with emergency measure'),
(11, 5, 'for', 30.0000, 'Diversification needed'),
(11, 1, 'for', 150.0000, 'Swift action was correct'),
(11, 2, 'against', 120.0000, 'Panic selling is bad'),
(11, 3, 'for', 85.0000, 'Stablecoins are safe haven');

-- ============================================
-- VOTING POWER SNAPSHOTS
-- ============================================
\echo 'Seeding voting_power_snapshots...'

INSERT INTO voting_power_snapshots (user_id, tenant_id, proposal_id, voting_power, source_breakdown, snapshot_at) VALUES
(1, 1, 3, 150.0000, '{"reputation": 100, "stake": 50}', NOW() - INTERVAL '3 days'),
(2, 1, 3, 120.0000, '{"reputation": 80, "stake": 40}', NOW() - INTERVAL '3 days'),
(3, 1, 3, 85.0000, '{"reputation": 60, "stake": 25}', NOW() - INTERVAL '3 days'),
(4, 1, 3, 45.0000, '{"reputation": 30, "stake": 15}', NOW() - INTERVAL '3 days'),
(5, 1, 3, 30.0000, '{"reputation": 20, "stake": 10}', NOW() - INTERVAL '3 days'),
(1, 1, 4, 150.0000, '{"reputation": 100, "stake": 50}', NOW() - INTERVAL '1 day'),
(2, 1, 4, 120.0000, '{"reputation": 80, "stake": 40}', NOW() - INTERVAL '1 day'),
(3, 1, 4, 85.0000, '{"reputation": 60, "stake": 25}', NOW() - INTERVAL '1 day'),
(4, 1, 4, 45.0000, '{"reputation": 30, "stake": 15}', NOW() - INTERVAL '1 day'),
(5, 1, 4, 30.0000, '{"reputation": 20, "stake": 10}', NOW() - INTERVAL '1 day'),
(1, 1, 5, 150.0000, '{"reputation": 100, "stake": 50}', NOW() - INTERVAL '2 days'),
(2, 1, 5, 120.0000, '{"reputation": 80, "stake": 40}', NOW() - INTERVAL '2 days'),
(3, 1, 5, 85.0000, '{"reputation": 60, "stake": 25}', NOW() - INTERVAL '2 days'),
(4, 2, 6, 100.0000, '{"reputation": 70, "stake": 30}', NOW() - INTERVAL '1 day'),
(5, 2, 6, 80.0000, '{"reputation": 55, "stake": 25}', NOW() - INTERVAL '1 day');

-- ============================================
-- VOTE DELEGATIONS
-- ============================================
\echo 'Seeding vote_delegations...'

INSERT INTO vote_delegations (delegator_id, delegate_id, tenant_id, scope, active, created_at) VALUES
(3, 1, 1, 'general', true, NOW() - INTERVAL '30 days'),
(4, 1, 1, 'treasury', true, NOW() - INTERVAL '20 days'),
(5, 2, 1, 'general', true, NOW() - INTERVAL '15 days'),
(5, 1, 1, 'parameter_changes', true, NOW() - INTERVAL '10 days'),
(4, 2, 1, 'general', true, NOW() - INTERVAL '5 days'),
(3, 2, 1, 'feature_requests', false, NOW() - INTERVAL '45 days'),
(5, 4, 2, 'general', true, NOW() - INTERVAL '7 days');

-- ============================================
-- REWARDS (40+ records)
-- ============================================
\echo 'Seeding rewards...'

-- Get pool IDs for reference
DO $$
DECLARE
    task_pool_id UUID;
    referral_pool_id UUID;
    loyalty_pool_id UUID;
BEGIN
    SELECT pool_id INTO task_pool_id FROM reward_pools WHERE source = 'TASK_COMPLETION' LIMIT 1;
    SELECT pool_id INTO referral_pool_id FROM reward_pools WHERE source = 'REFERRAL' LIMIT 1;
    SELECT pool_id INTO loyalty_pool_id FROM reward_pools WHERE source = 'LOYALTY_BONUS' LIMIT 1;

    -- Task completion rewards
    INSERT INTO rewards (reward_id, user_id, source, base_amount, reputation_multiplier, loyalty_multiplier, staking_multiplier, volume_multiplier, total_multiplier, final_amount, status, calculated_at, transaction_id) VALUES
    (uuid_generate_v4(), 'user_001', 'TASK_COMPLETION', 100.00, 1.200, 1.050, 1.000, 1.100, 1.3860, 138.60, 'DISTRIBUTED', NOW() - INTERVAL '25 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'TASK_COMPLETION', 150.00, 1.150, 1.080, 1.000, 1.050, 1.3035, 195.53, 'DISTRIBUTED', NOW() - INTERVAL '24 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_003', 'TASK_COMPLETION', 75.00, 1.100, 1.020, 1.000, 1.000, 1.1220, 84.15, 'CLAIMED', NOW() - INTERVAL '23 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_001', 'TASK_COMPLETION', 200.00, 1.200, 1.050, 1.050, 1.200, 1.5120, 302.40, 'DISTRIBUTED', NOW() - INTERVAL '20 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_004', 'TASK_COMPLETION', 50.00, 1.050, 1.000, 1.000, 1.000, 1.0500, 52.50, 'CLAIMED', NOW() - INTERVAL '19 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'TASK_COMPLETION', 120.00, 1.150, 1.080, 1.000, 1.080, 1.3418, 161.02, 'DISTRIBUTED', NOW() - INTERVAL '18 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_005', 'TASK_COMPLETION', 180.00, 1.300, 1.100, 1.050, 1.150, 1.7425, 313.65, 'PENDING', NOW() - INTERVAL '5 days', NULL),
    (uuid_generate_v4(), 'user_001', 'TASK_COMPLETION', 90.00, 1.200, 1.050, 1.000, 1.050, 1.3230, 119.07, 'DISTRIBUTED', NOW() - INTERVAL '15 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_003', 'TASK_COMPLETION', 250.00, 1.100, 1.020, 1.100, 1.200, 1.4659, 366.48, 'CLAIMED', NOW() - INTERVAL '12 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'TASK_COMPLETION', 110.00, 1.150, 1.080, 1.000, 1.020, 1.2655, 139.21, 'DISTRIBUTED', NOW() - INTERVAL '10 days', uuid_generate_v4());

    -- Referral rewards
    INSERT INTO rewards (reward_id, user_id, source, base_amount, reputation_multiplier, loyalty_multiplier, staking_multiplier, volume_multiplier, total_multiplier, final_amount, status, calculated_at, transaction_id) VALUES
    (uuid_generate_v4(), 'user_001', 'REFERRAL', 50.00, 1.200, 1.050, 1.000, 1.000, 1.2600, 63.00, 'DISTRIBUTED', NOW() - INTERVAL '22 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'REFERRAL', 75.00, 1.150, 1.080, 1.000, 1.000, 1.2420, 93.15, 'CLAIMED', NOW() - INTERVAL '21 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_003', 'REFERRAL', 60.00, 1.100, 1.020, 1.000, 1.000, 1.1220, 67.32, 'DISTRIBUTED', NOW() - INTERVAL '18 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_001', 'REFERRAL', 100.00, 1.200, 1.050, 1.000, 1.000, 1.2600, 126.00, 'PENDING', NOW() - INTERVAL '3 days', NULL),
    (uuid_generate_v4(), 'user_004', 'REFERRAL', 45.00, 1.050, 1.000, 1.000, 1.000, 1.0500, 47.25, 'CLAIMED', NOW() - INTERVAL '14 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'REFERRAL', 80.00, 1.150, 1.080, 1.000, 1.000, 1.2420, 99.36, 'DISTRIBUTED', NOW() - INTERVAL '8 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_005', 'REFERRAL', 55.00, 1.300, 1.100, 1.000, 1.000, 1.4300, 78.65, 'PENDING', NOW() - INTERVAL '2 days', NULL),
    (uuid_generate_v4(), 'user_003', 'REFERRAL', 70.00, 1.100, 1.020, 1.000, 1.000, 1.1220, 78.54, 'DISTRIBUTED', NOW() - INTERVAL '6 days', uuid_generate_v4());

    -- Loyalty rewards
    INSERT INTO rewards (reward_id, user_id, source, base_amount, reputation_multiplier, loyalty_multiplier, staking_multiplier, volume_multiplier, total_multiplier, final_amount, status, calculated_at, transaction_id) VALUES
    (uuid_generate_v4(), 'user_001', 'LOYALTY_BONUS', 200.00, 1.200, 1.500, 1.000, 1.000, 1.8000, 360.00, 'DISTRIBUTED', NOW() - INTERVAL '30 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'LOYALTY_BONUS', 180.00, 1.150, 1.400, 1.000, 1.000, 1.6100, 289.80, 'CLAIMED', NOW() - INTERVAL '28 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_003', 'LOYALTY_BONUS', 150.00, 1.100, 1.300, 1.000, 1.000, 1.4300, 214.50, 'DISTRIBUTED', NOW() - INTERVAL '25 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_001', 'LOYALTY_BONUS', 250.00, 1.200, 1.500, 1.000, 1.000, 1.8000, 450.00, 'PENDING', NOW() - INTERVAL '1 day', NULL),
    (uuid_generate_v4(), 'user_004', 'LOYALTY_BONUS', 120.00, 1.050, 1.200, 1.000, 1.000, 1.2600, 151.20, 'CLAIMED', NOW() - INTERVAL '20 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'LOYALTY_BONUS', 190.00, 1.150, 1.400, 1.000, 1.000, 1.6100, 305.90, 'DISTRIBUTED', NOW() - INTERVAL '15 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_005', 'LOYALTY_BONUS', 160.00, 1.300, 1.450, 1.000, 1.000, 1.8850, 301.60, 'PENDING', NOW() - INTERVAL '4 days', NULL),
    (uuid_generate_v4(), 'user_003', 'LOYALTY_BONUS', 175.00, 1.100, 1.300, 1.000, 1.000, 1.4300, 250.25, 'DISTRIBUTED', NOW() - INTERVAL '10 days', uuid_generate_v4());

    -- Agent revenue rewards
    INSERT INTO rewards (reward_id, user_id, source, base_amount, reputation_multiplier, loyalty_multiplier, staking_multiplier, volume_multiplier, total_multiplier, final_amount, status, calculated_at, transaction_id) VALUES
    (uuid_generate_v4(), 'user_001', 'AGENT_REVENUE', 500.00, 1.200, 1.050, 1.100, 1.200, 1.6138, 806.90, 'DISTRIBUTED', NOW() - INTERVAL '26 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'AGENT_REVENUE', 350.00, 1.150, 1.080, 1.050, 1.100, 1.4300, 500.50, 'CLAIMED', NOW() - INTERVAL '22 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_003', 'AGENT_REVENUE', 420.00, 1.100, 1.020, 1.080, 1.150, 1.4046, 589.93, 'DISTRIBUTED', NOW() - INTERVAL '19 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_001', 'AGENT_REVENUE', 600.00, 1.200, 1.050, 1.100, 1.200, 1.6138, 968.28, 'PENDING', NOW() - INTERVAL '2 days', NULL),
    (uuid_generate_v4(), 'user_004', 'AGENT_REVENUE', 280.00, 1.050, 1.000, 1.000, 1.050, 1.1025, 308.70, 'CLAIMED', NOW() - INTERVAL '16 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'AGENT_REVENUE', 380.00, 1.150, 1.080, 1.050, 1.100, 1.4300, 543.40, 'DISTRIBUTED', NOW() - INTERVAL '11 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_005', 'AGENT_REVENUE', 450.00, 1.300, 1.100, 1.080, 1.150, 1.7769, 799.61, 'PENDING', NOW() - INTERVAL '3 days', NULL),
    (uuid_generate_v4(), 'user_003', 'AGENT_REVENUE', 320.00, 1.100, 1.020, 1.000, 1.080, 1.2134, 388.29, 'DISTRIBUTED', NOW() - INTERVAL '7 days', uuid_generate_v4());

    -- Governance participation rewards
    INSERT INTO rewards (reward_id, user_id, source, base_amount, reputation_multiplier, loyalty_multiplier, staking_multiplier, volume_multiplier, total_multiplier, final_amount, status, calculated_at, transaction_id) VALUES
    (uuid_generate_v4(), 'user_001', 'GOVERNANCE', 25.00, 1.200, 1.050, 1.000, 1.000, 1.2600, 31.50, 'DISTRIBUTED', NOW() - INTERVAL '7 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'GOVERNANCE', 25.00, 1.150, 1.080, 1.000, 1.000, 1.2420, 31.05, 'CLAIMED', NOW() - INTERVAL '7 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_003', 'GOVERNANCE', 25.00, 1.100, 1.020, 1.000, 1.000, 1.1220, 28.05, 'DISTRIBUTED', NOW() - INTERVAL '7 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_001', 'GOVERNANCE', 25.00, 1.200, 1.050, 1.000, 1.000, 1.2600, 31.50, 'PENDING', NOW() - INTERVAL '1 day', NULL),
    (uuid_generate_v4(), 'user_004', 'GOVERNANCE', 25.00, 1.050, 1.000, 1.000, 1.000, 1.0500, 26.25, 'CLAIMED', NOW() - INTERVAL '6 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'GOVERNANCE', 25.00, 1.150, 1.080, 1.000, 1.000, 1.2420, 31.05, 'DISTRIBUTED', NOW() - INTERVAL '5 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_005', 'GOVERNANCE', 25.00, 1.300, 1.100, 1.000, 1.000, 1.4300, 35.75, 'PENDING', NOW() - INTERVAL '2 days', NULL),
    (uuid_generate_v4(), 'user_003', 'GOVERNANCE', 25.00, 1.100, 1.020, 1.000, 1.000, 1.1220, 28.05, 'DISTRIBUTED', NOW() - INTERVAL '4 days', uuid_generate_v4());

    -- Quality bonus rewards
    INSERT INTO rewards (reward_id, user_id, source, base_amount, reputation_multiplier, loyalty_multiplier, staking_multiplier, volume_multiplier, total_multiplier, final_amount, status, calculated_at, transaction_id) VALUES
    (uuid_generate_v4(), 'user_001', 'QUALITY_BONUS', 50.00, 1.200, 1.050, 1.000, 1.200, 1.5120, 75.60, 'CLAIMED', NOW() - INTERVAL '17 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'QUALITY_BONUS', 40.00, 1.150, 1.080, 1.000, 1.150, 1.4300, 57.20, 'DISTRIBUTED', NOW() - INTERVAL '14 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_003', 'QUALITY_BONUS', 60.00, 1.100, 1.020, 1.000, 1.180, 1.3232, 79.39, 'CLAIMED', NOW() - INTERVAL '11 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_001', 'QUALITY_BONUS', 55.00, 1.200, 1.050, 1.000, 1.200, 1.5120, 83.16, 'PENDING', NOW() - INTERVAL '1 day', NULL),
    (uuid_generate_v4(), 'user_004', 'QUALITY_BONUS', 35.00, 1.050, 1.000, 1.000, 1.100, 1.1550, 40.43, 'CLAIMED', NOW() - INTERVAL '9 days', uuid_generate_v4()),
    (uuid_generate_v4(), 'user_002', 'QUALITY_BONUS', 45.00, 1.150, 1.080, 1.000, 1.150, 1.4300, 64.35, 'DISTRIBUTED', NOW() - INTERVAL '6 days', uuid_generate_v4());
END $$;

-- ============================================
-- REPUTATION SCORES
-- ============================================
\echo 'Seeding reputation_scores...'

INSERT INTO reputation_scores (user_id, overall_score, trust_index, level, task_score, quality_score, reliability_score, community_score, longevity_score, calculated_at) VALUES
('user_001', 850, 92, 'ELITE', 95.50, 92.00, 88.00, 85.00, 90.00, NOW()),
('user_002', 720, 85, 'ADVANCED', 82.00, 78.00, 88.00, 75.00, 82.00, NOW()),
('user_003', 650, 78, 'INTERMEDIATE', 75.00, 72.00, 80.00, 68.00, 75.00, NOW()),
('user_004', 480, 65, 'INTERMEDIATE', 60.00, 55.00, 70.00, 58.00, 65.00, NOW()),
('user_005', 890, 95, 'ELITE', 98.00, 95.00, 92.00, 88.00, 94.00, NOW()),
('user_006', 320, 45, 'NEWCOMER', 40.00, 35.00, 45.00, 38.00, 30.00, NOW()),
('user_007', 550, 70, 'INTERMEDIATE', 65.00, 62.00, 72.00, 60.00, 68.00, NOW()),
('user_008', 780, 88, 'ADVANCED', 88.00, 85.00, 82.00, 78.00, 84.00, NOW()),
('user_009', 420, 58, 'NEWCOMER', 52.00, 48.00, 55.00, 50.00, 45.00, NOW()),
('user_010', 920, 97, 'ELITE', 99.00, 98.00, 95.00, 92.00, 96.00, NOW());

-- ============================================
-- SKILL PROFICIENCIES (skill validations)
-- ============================================
\echo 'Seeding skill_proficiencies...'

INSERT INTO skill_proficiencies (id, user_id, skill_id, skill_name, proficiency_level, tasks_completed, average_rating, endorsements, last_validated, validated_by) VALUES
(uuid_generate_v4(), 'user_001', 'skill_js', 'JavaScript', 95, 150, 4.85, 25, NOW() - INTERVAL '2 days', '["user_002", "user_003", "user_005"]'),
(uuid_generate_v4(), 'user_001', 'skill_py', 'Python', 88, 120, 4.72, 18, NOW() - INTERVAL '5 days', '["user_003", "user_008"]'),
(uuid_generate_v4(), 'user_001', 'skill_react', 'React', 92, 180, 4.90, 32, NOW() - INTERVAL '1 day', '["user_002", "user_005", "user_010"]'),
(uuid_generate_v4(), 'user_002', 'skill_js', 'JavaScript', 78, 85, 4.50, 12, NOW() - INTERVAL '3 days', '["user_001"]'),
(uuid_generate_v4(), 'user_002', 'skill_node', 'Node.js', 82, 95, 4.65, 15, NOW() - INTERVAL '4 days', '["user_001", "user_003"]'),
(uuid_generate_v4(), 'user_003', 'skill_py', 'Python', 72, 65, 4.35, 8, NOW() - INTERVAL '6 days', '["user_001"]'),
(uuid_generate_v4(), 'user_003', 'skill_ml', 'Machine Learning', 85, 55, 4.75, 20, NOW() - INTERVAL '2 days', '["user_001", "user_008", "user_010"]'),
(uuid_generate_v4(), 'user_004', 'skill_figma', 'Figma', 55, 40, 4.20, 5, NOW() - INTERVAL '8 days', '["user_005"]'),
(uuid_generate_v4(), 'user_004', 'skill_ui', 'UI Design', 60, 50, 4.30, 7, NOW() - INTERVAL '5 days', '["user_001", "user_005"]'),
(uuid_generate_v4(), 'user_005', 'skill_js', 'JavaScript', 98, 200, 4.95, 45, NOW() - INTERVAL '1 day', '["user_001", "user_002", "user_008", "user_010"]'),
(uuid_generate_v4(), 'user_005', 'skill_ts', 'TypeScript', 96, 185, 4.92, 40, NOW() - INTERVAL '2 days', '["user_001", "user_002", "user_010"]'),
(uuid_generate_v4(), 'user_005', 'skill_react', 'React', 99, 220, 4.98, 50, NOW() - INTERVAL '1 day', '["user_001", "user_002", "user_003", "user_008"]'),
(uuid_generate_v4(), 'user_006', 'skill_copy', 'Copywriting', 35, 15, 3.80, 2, NOW() - INTERVAL '10 days', '[]'),
(uuid_generate_v4(), 'user_007', 'skill_marketing', 'Marketing', 62, 45, 4.25, 6, NOW() - INTERVAL '7 days', '["user_005"]'),
(uuid_generate_v4(), 'user_008', 'skill_py', 'Python', 90, 130, 4.80, 22, NOW() - INTERVAL '3 days', '["user_001", "user_003", "user_010"]'),
(uuid_generate_v4(), 'user_008', 'skill_data', 'Data Analysis', 88, 110, 4.78, 19, NOW() - INTERVAL '4 days', '["user_001", "user_010"]'),
(uuid_generate_v4(), 'user_009', 'skill_seo', 'SEO', 45, 25, 4.00, 3, NOW() - INTERVAL '9 days', '["user_007"]'),
(uuid_generate_v4(), 'user_010', 'skill_js', 'JavaScript', 100, 250, 5.00, 60, NOW(), '["user_001", "user_002", "user_003", "user_005", "user_008"]'),
(uuid_generate_v4(), 'user_010', 'skill_arch', 'System Architecture', 95, 100, 4.95, 35, NOW() - INTERVAL '1 day', '["user_001", "user_005"]');

-- ============================================
-- COMMUNITY ENDORSEMENTS (skill validations)
-- ============================================
\echo 'Seeding community_endorsements...'

INSERT INTO community_endorsements (endorsement_id, endorser_id, endorsee_id, skill_id, message, weight, created_at) VALUES
(uuid_generate_v4(), 'user_002', 'user_001', 'skill_js', 'Exceptional JavaScript developer with deep knowledge', 1.000, NOW() - INTERVAL '2 days'),
(uuid_generate_v4(), 'user_003', 'user_001', 'skill_js', 'One of the best code reviewers I have worked with', 0.950, NOW() - INTERVAL '5 days'),
(uuid_generate_v4(), 'user_005', 'user_001', 'skill_react', 'Top-tier React expertise, consistently delivers quality', 1.000, NOW() - INTERVAL '1 day'),
(uuid_generate_v4(), 'user_001', 'user_002', 'skill_node', 'Reliable backend developer, great communication', 0.900, NOW() - INTERVAL '4 days'),
(uuid_generate_v4(), 'user_001', 'user_003', 'skill_ml', 'Impressive ML implementation skills', 1.000, NOW() - INTERVAL '2 days'),
(uuid_generate_v4(), 'user_005', 'user_004', 'skill_ui', 'Creative designer with great attention to detail', 0.850, NOW() - INTERVAL '6 days'),
(uuid_generate_v4(), 'user_001', 'user_005', 'skill_ts', 'TypeScript wizard, elevates any team', 1.000, NOW() - INTERVAL '1 day'),
(uuid_generate_v4(), 'user_002', 'user_005', 'skill_react', 'Best React developer I have ever worked with', 1.000, NOW() - INTERVAL '2 days'),
(uuid_generate_v4(), 'user_008', 'user_005', 'skill_js', 'Consistently outstanding JavaScript code', 0.950, NOW() - INTERVAL '3 days'),
(uuid_generate_v4(), 'user_001', 'user_010', 'skill_arch', 'Outstanding system architecture capabilities', 1.000, NOW() - INTERVAL '1 day');

-- ============================================
-- REFERRALS (10+ referral records)
-- ============================================
\echo 'Seeding referrals...'

INSERT INTO referrals (id, user_id, referral_code, referrer_id, tier, registered_at, ip_address, device_fingerprint, user_agent, status, fraud_score, created_at) VALUES
(uuid_generate_v4(), 'user_006', 'REFABC001', 'user_001', 1, NOW() - INTERVAL '60 days', '192.168.1.100', 'fp_abc123def456', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '60 days'),
(uuid_generate_v4(), 'user_007', 'REFABC002', 'user_001', 1, NOW() - INTERVAL '45 days', '192.168.1.101', 'fp_def456ghi789', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '45 days'),
(uuid_generate_v4(), 'user_008', 'REFABC003', 'user_002', 1, NOW() - INTERVAL '30 days', '192.168.1.102', 'fp_ghi789jkl012', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '30 days'),
(uuid_generate_v4(), 'user_009', 'REFABC004', 'user_002', 1, NOW() - INTERVAL '20 days', '192.168.1.103', 'fp_jkl012mno345', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '20 days'),
(uuid_generate_v4(), 'user_010', 'REFABC005', 'user_003', 1, NOW() - INTERVAL '15 days', '192.168.1.104', 'fp_mno345pqr678', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '15 days'),
(uuid_generate_v4(), 'user_011', 'REFDEF001', 'user_001', 2, NOW() - INTERVAL '55 days', '192.168.1.105', 'fp_pqr678stu901', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '55 days'),
(uuid_generate_v4(), 'user_012', 'REFDEF002', 'user_002', 2, NOW() - INTERVAL '40 days', '192.168.1.106', 'fp_stu901vwx234', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '40 days'),
(uuid_generate_v4(), 'user_013', 'REFDEF003', 'user_003', 2, NOW() - INTERVAL '25 days', '192.168.1.107', 'fp_vwx234yza567', 'Mozilla/5.0', 'pending', 10, NOW() - INTERVAL '25 days'),
(uuid_generate_v4(), 'user_014', 'REFABC006', 'user_005', 1, NOW() - INTERVAL '10 days', '192.168.1.108', 'fp_yza567bcd890', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '10 days'),
(uuid_generate_v4(), 'user_015', 'REFABC007', 'user_005', 1, NOW() - INTERVAL '5 days', '192.168.1.109', 'fp_bcd890efg123', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '5 days'),
(uuid_generate_v4(), 'user_016', 'REFGHI001', 'user_008', 3, NOW() - INTERVAL '50 days', '192.168.1.110', 'fp_efg123fhi456', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '50 days'),
(uuid_generate_v4(), 'user_017', 'REFGHI002', 'user_010', 3, NOW() - INTERVAL '35 days', '192.168.1.111', 'fp_fhi456ijk789', 'Mozilla/5.0', 'active', 0, NOW() - INTERVAL '35 days');

-- ============================================
-- REFERRAL METRICS
-- ============================================
\echo 'Seeding referral_metrics...'

INSERT INTO referral_metrics (user_id, total_referrals, active_referrals, referral_success_rate, referral_value, updated_at) VALUES
('user_001', 3, 3, 100.00, 1500.00, NOW()),
('user_002', 3, 3, 100.00, 1200.00, NOW()),
('user_003', 2, 1, 50.00, 600.00, NOW()),
('user_005', 2, 2, 100.00, 800.00, NOW()),
('user_008', 1, 1, 100.00, 400.00, NOW()),
('user_010', 1, 1, 100.00, 350.00, NOW());

-- ============================================
-- USER ACHIEVEMENTS (link users to achievements)
-- ============================================
\echo 'Seeding user_achievements...'

-- Get achievement IDs
DO $$
DECLARE
    ach_first_task UUID;
    ach_task_master UUID;
    ach_quality_pro UUID;
    ach_community_leader UUID;
    ach_loyal_member UUID;
    ach_referral_king UUID;
BEGIN
    SELECT achievement_id INTO ach_first_task FROM achievements WHERE name = 'First Task' LIMIT 1;
    SELECT achievement_id INTO ach_task_master FROM achievements WHERE name = 'Task Master' LIMIT 1;
    SELECT achievement_id INTO ach_quality_pro FROM achievements WHERE name = 'Quality Pro' LIMIT 1;
    SELECT achievement_id INTO ach_community_leader FROM achievements WHERE name = 'Community Leader' LIMIT 1;
    SELECT achievement_id INTO ach_loyal_member FROM achievements WHERE name = 'Loyal Member' LIMIT 1;
    SELECT achievement_id INTO ach_referral_king FROM achievements WHERE name = 'Referral King' LIMIT 1;

    -- User 001 achievements
    INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at, progress) VALUES
    (uuid_generate_v4(), 'user_001', ach_first_task, NOW() - INTERVAL '180 days', 100.00),
    (uuid_generate_v4(), 'user_001', ach_task_master, NOW() - INTERVAL '90 days', 100.00),
    (uuid_generate_v4(), 'user_001', ach_quality_pro, NOW() - INTERVAL '60 days', 100.00),
    (uuid_generate_v4(), 'user_001', ach_community_leader, NOW() - INTERVAL '30 days', 100.00),
    (uuid_generate_v4(), 'user_001', ach_loyal_member, NOW() - INTERVAL '15 days', 100.00),
    (uuid_generate_v4(), 'user_001', ach_referral_king, NOW() - INTERVAL '5 days', 100.00);

    -- User 002 achievements
    INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at, progress) VALUES
    (uuid_generate_v4(), 'user_002', ach_first_task, NOW() - INTERVAL '150 days', 100.00),
    (uuid_generate_v4(), 'user_002', ach_task_master, NOW() - INTERVAL '75 days', 100.00),
    (uuid_generate_v4(), 'user_002', ach_quality_pro, NOW() - INTERVAL '45 days', 100.00),
    (uuid_generate_v4(), 'user_002', ach_loyal_member, NOW() - INTERVAL '20 days', 100.00);

    -- User 003 achievements
    INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at, progress) VALUES
    (uuid_generate_v4(), 'user_003', ach_first_task, NOW() - INTERVAL '120 days', 100.00),
    (uuid_generate_v4(), 'user_003', ach_task_master, NOW() - INTERVAL '60 days', 100.00),
    (uuid_generate_v4(), 'user_003', ach_quality_pro, NOW() - INTERVAL '30 days', 85.00);

    -- User 005 achievements
    INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at, progress) VALUES
    (uuid_generate_v4(), 'user_005', ach_first_task, NOW() - INTERVAL '200 days', 100.00),
    (uuid_generate_v4(), 'user_005', ach_task_master, NOW() - INTERVAL '100 days', 100.00),
    (uuid_generate_v4(), 'user_005', ach_quality_pro, NOW() - INTERVAL '70 days', 100.00),
    (uuid_generate_v4(), 'user_005', ach_community_leader, NOW() - INTERVAL '40 days', 100.00),
    (uuid_generate_v4(), 'user_005', ach_loyal_member, NOW() - INTERVAL '25 days', 100.00);

    -- User 010 achievements (new user, only first task)
    INSERT INTO user_achievements (id, user_id, achievement_id, unlocked_at, progress) VALUES
    (uuid_generate_v4(), 'user_010', ach_first_task, NOW() - INTERVAL '10 days', 100.00);
END $$;

-- ============================================
-- REPUTATION HISTORY
-- ============================================
\echo 'Seeding reputation_history...'

INSERT INTO reputation_history (id, user_id, timestamp, score, change, reason, metadata) VALUES
(uuid_generate_v4(), 'user_001', NOW() - INTERVAL '7 days', 850, 15, 'Task completion bonus', '{"task_id": "task_001", "quality": 95}'),
(uuid_generate_v4(), 'user_001', NOW() - INTERVAL '14 days', 835, 20, 'Quality endorsement received', '{"endorser_id": "user_005"}'),
(uuid_generate_v4(), 'user_002', NOW() - INTERVAL '5 days', 720, 10, 'Consistent task delivery', '{"tasks_completed": 5}'),
(uuid_generate_v4(), 'user_003', NOW() - INTERVAL '10 days', 650, -5, 'Late submission penalty', '{"task_id": "task_045"}'),
(uuid_generate_v4(), 'user_005', NOW() - INTERVAL '3 days', 890, 25, 'Exceptional community contribution', '{"endorsements": 8}'),
(uuid_generate_v4(), 'user_010', NOW() - INTERVAL '2 days', 920, 50, 'Elite performance milestone', '{"tasks_completed": 100}');

-- ============================================
-- REPUTATION STAKES
-- ============================================
\echo 'Seeding reputation_stakes...'

INSERT INTO reputation_stakes (stake_id, user_id, amount, locked_until, multiplier_bonus, created_at, withdrawn_at) VALUES
(uuid_generate_v4(), 'user_001', 5000.00, NOW() + INTERVAL '90 days', 1.150, NOW() - INTERVAL '30 days', NULL),
(uuid_generate_v4(), 'user_002', 3000.00, NOW() + INTERVAL '60 days', 1.100, NOW() - INTERVAL '20 days', NULL),
(uuid_generate_v4(), 'user_005', 7500.00, NOW() + INTERVAL '120 days', 1.200, NOW() - INTERVAL '45 days', NULL),
(uuid_generate_v4(), 'user_010', 10000.00, NOW() + INTERVAL '180 days', 1.250, NOW() - INTERVAL '60 days', NULL),
(uuid_generate_v4(), 'user_001', 2000.00, NOW() + INTERVAL '30 days', 1.050, NOW() - INTERVAL '15 days', NULL);

-- ============================================
-- TASK METRICS
-- ============================================
\echo 'Seeding task_metrics...'

INSERT INTO task_metrics (user_id, total_tasks, completed_tasks, approved_tasks, rejected_tasks, completion_rate, approval_rate, average_quality, on_time_delivery_rate, updated_at) VALUES
('user_001', 150, 148, 145, 3, 98.67, 97.97, 4.85, 96.50, NOW()),
('user_002', 95, 92, 88, 4, 96.84, 95.65, 4.50, 94.20, NOW()),
('user_003', 75, 70, 65, 5, 93.33, 92.86, 4.35, 91.00, NOW()),
('user_004', 45, 40, 38, 2, 88.89, 95.00, 4.20, 88.50, NOW()),
('user_005', 200, 198, 196, 2, 99.00, 98.99, 4.95, 98.00, NOW()),
('user_006', 20, 15, 12, 3, 75.00, 80.00, 3.80, 70.00, NOW()),
('user_007', 50, 45, 42, 3, 90.00, 93.33, 4.25, 88.00, NOW()),
('user_008', 120, 115, 110, 5, 95.83, 95.65, 4.80, 94.00, NOW()),
('user_009', 30, 25, 22, 3, 83.33, 88.00, 4.00, 82.00, NOW()),
('user_010', 250, 248, 246, 2, 99.20, 99.19, 5.00, 99.00, NOW());

-- Re-enable Row Level Security
SET session_replication_role = DEFAULT;

COMMIT;

\echo ''
\echo '==============================================='
\echo 'Seed data loaded successfully!'
\echo '==============================================='
\echo ''
\echo 'Summary:'
\echo '  - 3 governance_config records'
\echo '  - 12 proposals (2 draft, 4 active, 3 passed, 2 rejected, 1 executed, 1 cancelled)'
\echo '  - 50+ votes (balanced for/against)'
\echo '  - 15 voting_power_snapshots'
\echo '  - 7 vote_delegations'
\echo '  - 40+ rewards (various sources)'
\echo '  - 10 reputation_scores'
\echo '  - 19 skill_proficiencies'
\echo '  - 10 community_endorsements'
\echo '  - 12 referrals'
\echo '  - 6 referral_metrics'
\echo '  - 15 user_achievements'
\echo '  - 6 reputation_history records'
\echo '  - 5 reputation_stakes'
\echo '  - 10 task_metrics'
\echo ''

-- ============================================
-- ROLLBACK SECTION
-- ============================================
-- To rollback this seed data, run:
-- BEGIN;
-- DELETE FROM task_metrics WHERE user_id IN ('user_001', 'user_002', 'user_003', 'user_004', 'user_005', 'user_006', 'user_007', 'user_008', 'user_009', 'user_010');
-- DELETE FROM reputation_stakes WHERE user_id IN ('user_001', 'user_002', 'user_005', 'user_010');
-- DELETE FROM reputation_history WHERE user_id IN ('user_001', 'user_002', 'user_003', 'user_005', 'user_010');
-- DELETE FROM user_achievements WHERE user_id IN ('user_001', 'user_002', 'user_003', 'user_005', 'user_010');
-- DELETE FROM referral_metrics WHERE user_id IN ('user_001', 'user_002', 'user_003', 'user_005', 'user_008', 'user_010');
-- DELETE FROM referrals WHERE user_id LIKE 'user_%';
-- DELETE FROM community_endorsements WHERE endorsee_id LIKE 'user_%';
-- DELETE FROM skill_proficiencies WHERE user_id LIKE 'user_%';
-- DELETE FROM reputation_scores WHERE user_id LIKE 'user_%';
-- DELETE FROM rewards WHERE user_id LIKE 'user_%';
-- DELETE FROM vote_delegations WHERE delegator_id IN (1, 2, 3, 4, 5);
-- DELETE FROM voting_power_snapshots WHERE user_id IN (1, 2, 3, 4, 5);
-- DELETE FROM votes WHERE proposal_id BETWEEN 3 AND 12;
-- DELETE FROM proposals WHERE id BETWEEN 1 AND 12;
-- DELETE FROM governance_config WHERE tenant_id IN (1, 2);
-- COMMIT;
