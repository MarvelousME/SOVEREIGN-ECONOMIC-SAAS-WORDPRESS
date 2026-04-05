-- Migration: 009_create_governance_schema.sql
-- Description: Create governance and voting tables
-- Created: 2026-03-26

-- Create enum types
CREATE TYPE proposal_type AS ENUM ('parameter_change', 'treasury_allocation', 'feature_request', 'rule_change', 'emergency', 'general');
CREATE TYPE proposal_status AS ENUM ('draft', 'active', 'passed', 'rejected', 'executed', 'cancelled', 'expired');
CREATE TYPE vote_type AS ENUM ('for', 'against', 'abstain');
CREATE TYPE voting_mechanism AS ENUM ('simple_majority', 'supermajority', 'quadratic', 'ranked_choice', 'approval');

-- Governance config table
CREATE TABLE governance_config (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    voting_mechanism voting_mechanism NOT NULL DEFAULT 'simple_majority',
    quorum NUMERIC(5, 4) NOT NULL DEFAULT 0.10,
    approval_threshold NUMERIC(5, 4) NOT NULL DEFAULT 0.51,
    execution_delay_hours INTEGER NOT NULL DEFAULT 48,
    voting_period_hours INTEGER NOT NULL DEFAULT 168,
    config JSONB NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_tenant_governance UNIQUE (tenant_id),
    CONSTRAINT quorum_range CHECK (quorum >= 0 AND quorum <= 1),
    CONSTRAINT threshold_range CHECK (approval_threshold > 0.5 AND approval_threshold <= 1),
    CONSTRAINT positive_execution_delay CHECK (execution_delay_hours >= 0),
    CONSTRAINT positive_voting_period CHECK (voting_period_hours > 0)
);

-- Create indexes for governance_config
CREATE INDEX idx_governance_config_tenant_id ON governance_config(tenant_id);
CREATE INDEX idx_governance_config_active ON governance_config(active);
CREATE INDEX idx_governance_config_config ON governance_config USING GIN(config);

-- Proposals table
CREATE TABLE proposals (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    proposer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    proposal_type proposal_type NOT NULL,
    status proposal_status NOT NULL DEFAULT 'draft',
    voting_starts_at TIMESTAMPTZ,
    voting_ends_at TIMESTAMPTZ,
    execution_eta TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    snapshot_block BIGINT,
    total_votes INTEGER NOT NULL DEFAULT 0,
    votes_for NUMERIC(20, 8) NOT NULL DEFAULT 0,
    votes_against NUMERIC(20, 8) NOT NULL DEFAULT 0,
    votes_abstain NUMERIC(20, 8) NOT NULL DEFAULT 0,
    quorum_reached BOOLEAN NOT NULL DEFAULT false,
    actions JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_voting_period CHECK (
        voting_starts_at IS NULL OR 
        voting_ends_at IS NULL OR 
        voting_ends_at > voting_starts_at
    ),
    CONSTRAINT valid_execution_eta CHECK (
        execution_eta IS NULL OR 
        voting_ends_at IS NULL OR 
        execution_eta > voting_ends_at
    )
);

-- Create indexes for proposals
CREATE INDEX idx_proposals_tenant_id ON proposals(tenant_id);
CREATE INDEX idx_proposals_proposer_id ON proposals(proposer_id);
CREATE INDEX idx_proposals_type ON proposals(proposal_type);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_voting_ends_at ON proposals(voting_ends_at DESC);
CREATE INDEX idx_proposals_quorum ON proposals(quorum_reached);
CREATE INDEX idx_proposals_metadata ON proposals USING GIN(metadata);
CREATE INDEX idx_proposals_actions ON proposals USING GIN(actions);

-- Votes table
CREATE TABLE votes (
    id BIGSERIAL PRIMARY KEY,
    proposal_id BIGINT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_type vote_type NOT NULL,
    voting_power NUMERIC(20, 8) NOT NULL DEFAULT 1,
    reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_voter_proposal UNIQUE (proposal_id, voter_id),
    CONSTRAINT positive_voting_power CHECK (voting_power > 0)
);

-- Create indexes for votes
CREATE INDEX idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX idx_votes_voter_id ON votes(voter_id);
CREATE INDEX idx_votes_vote_type ON votes(vote_type);
CREATE INDEX idx_votes_voted_at ON votes(voted_at DESC);
CREATE INDEX idx_votes_voting_power ON votes(voting_power DESC);
CREATE INDEX idx_votes_metadata ON votes USING GIN(metadata);

-- Voting power snapshots table
CREATE TABLE voting_power_snapshots (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    proposal_id BIGINT REFERENCES proposals(id) ON DELETE CASCADE,
    voting_power NUMERIC(20, 8) NOT NULL,
    source_breakdown JSONB NOT NULL DEFAULT '{}',
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT positive_power CHECK (voting_power >= 0)
);

-- Create indexes for voting_power_snapshots
CREATE INDEX idx_voting_power_snapshots_user_id ON voting_power_snapshots(user_id);
CREATE INDEX idx_voting_power_snapshots_tenant_id ON voting_power_snapshots(tenant_id);
CREATE INDEX idx_voting_power_snapshots_proposal_id ON voting_power_snapshots(proposal_id);
CREATE INDEX idx_voting_power_snapshots_snapshot_at ON voting_power_snapshots(snapshot_at DESC);
CREATE INDEX idx_voting_power_snapshots_breakdown ON voting_power_snapshots USING GIN(source_breakdown);

-- Delegations table (for vote delegation)
CREATE TABLE vote_delegations (
    delegator_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delegate_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    scope VARCHAR(100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    
    PRIMARY KEY (delegator_id, tenant_id, scope),
    CONSTRAINT no_self_delegation CHECK (delegator_id != delegate_id)
);

-- Create indexes for vote_delegations
CREATE INDEX idx_vote_delegations_delegator ON vote_delegations(delegator_id);
CREATE INDEX idx_vote_delegations_delegate ON vote_delegations(delegate_id);
CREATE INDEX idx_vote_delegations_tenant ON vote_delegations(tenant_id);
CREATE INDEX idx_vote_delegations_active ON vote_delegations(active);

-- Function to update proposal vote counts
CREATE OR REPLACE FUNCTION update_proposal_votes()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE proposals
    SET 
        total_votes = total_votes + 1,
        votes_for = votes_for + CASE WHEN NEW.vote_type = 'for' THEN NEW.voting_power ELSE 0 END,
        votes_against = votes_against + CASE WHEN NEW.vote_type = 'against' THEN NEW.voting_power ELSE 0 END,
        votes_abstain = votes_abstain + CASE WHEN NEW.vote_type = 'abstain' THEN NEW.voting_power ELSE 0 END,
        updated_at = NOW()
    WHERE id = NEW.proposal_id;
    
    -- Check if quorum is reached
    UPDATE proposals p
    SET quorum_reached = (
        (p.votes_for + p.votes_against + p.votes_abstain) >= 
        (SELECT gc.quorum FROM governance_config gc WHERE gc.tenant_id = p.tenant_id AND gc.active = true LIMIT 1) *
        (SELECT COUNT(DISTINCT user_id) FROM users WHERE tenant_id = p.tenant_id)
    )
    WHERE p.id = NEW.proposal_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update proposal votes
CREATE TRIGGER update_proposal_votes_trigger
    AFTER INSERT ON votes
    FOR EACH ROW EXECUTE FUNCTION update_proposal_votes();

-- Function to auto-update proposal status
CREATE OR REPLACE FUNCTION auto_update_proposal_status()
RETURNS TRIGGER AS $$
DECLARE
    config_record governance_config%ROWTYPE;
    approval_reached BOOLEAN;
BEGIN
    -- Get governance config
    SELECT * INTO config_record
    FROM governance_config
    WHERE tenant_id = NEW.tenant_id AND active = true
    LIMIT 1;
    
    -- Check if voting has ended
    IF NEW.voting_ends_at IS NOT NULL AND NEW.voting_ends_at <= NOW() AND NEW.status = 'active' THEN
        -- Check if quorum is reached
        IF NEW.quorum_reached THEN
            -- Check if approval threshold is met
            approval_reached := (NEW.votes_for / (NEW.votes_for + NEW.votes_against)) >= config_record.approval_threshold;
            
            IF approval_reached THEN
                NEW.status := 'passed';
                NEW.execution_eta := NOW() + (config_record.execution_delay_hours || ' hours')::INTERVAL;
            ELSE
                NEW.status := 'rejected';
            END IF;
        ELSE
            NEW.status := 'rejected';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update proposal status
CREATE TRIGGER auto_update_proposal_status_trigger
    BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION auto_update_proposal_status();

-- Update timestamps trigger
CREATE TRIGGER update_governance_config_updated_at BEFORE UPDATE ON governance_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE governance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_power_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_delegations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY tenant_isolation_policy ON governance_config
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON proposals
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON votes
    USING (
        proposal_id IN (
            SELECT id FROM proposals 
            WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT
        )
    );

CREATE POLICY tenant_isolation_policy ON voting_power_snapshots
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

CREATE POLICY tenant_isolation_policy ON vote_delegations
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::BIGINT);

-- Rollback
-- DROP POLICY IF EXISTS tenant_isolation_policy ON vote_delegations;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON voting_power_snapshots;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON votes;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON proposals;
-- DROP POLICY IF EXISTS tenant_isolation_policy ON governance_config;
-- DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
-- DROP TRIGGER IF EXISTS update_governance_config_updated_at ON governance_config;
-- DROP TRIGGER IF EXISTS auto_update_proposal_status_trigger ON proposals;
-- DROP TRIGGER IF EXISTS update_proposal_votes_trigger ON votes;
-- DROP FUNCTION IF EXISTS auto_update_proposal_status CASCADE;
-- DROP FUNCTION IF EXISTS update_proposal_votes CASCADE;
-- DROP TABLE IF EXISTS vote_delegations CASCADE;
-- DROP TABLE IF EXISTS voting_power_snapshots CASCADE;
-- DROP TABLE IF EXISTS votes CASCADE;
-- DROP TABLE IF EXISTS proposals CASCADE;
-- DROP TABLE IF EXISTS governance_config CASCADE;
-- DROP TYPE IF EXISTS voting_mechanism CASCADE;
-- DROP TYPE IF EXISTS vote_type CASCADE;
-- DROP TYPE IF EXISTS proposal_status CASCADE;
-- DROP TYPE IF EXISTS proposal_type CASCADE;
