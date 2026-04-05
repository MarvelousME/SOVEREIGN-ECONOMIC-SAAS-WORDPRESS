-- Governance Service Schema

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id UUID PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    proposal_type VARCHAR(50) NOT NULL CHECK (proposal_type IN (
        'treasury_allocation', 'ubi_rule_change', 'feature_proposal', 
        'parameter_update', 'emergency_action'
    )),
    voting_mechanism VARCHAR(50) NOT NULL CHECK (voting_mechanism IN (
        'simple_majority', 'reputation_weighted', 'stake_weighted', 
        'quadratic', 'conviction'
    )),
    proposer_id UUID NOT NULL,
    deposit DECIMAL(18, 6) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'draft', 'active', 'passed', 'rejected', 'executed', 'cancelled'
    )),
    voting_start_time TIMESTAMP NOT NULL,
    voting_end_time TIMESTAMP NOT NULL,
    execution_time TIMESTAMP,
    executed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_proposer ON proposals(proposer_id);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_type ON proposals(proposal_type);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL,
    choice VARCHAR(10) NOT NULL CHECK (choice IN ('yes', 'no', 'abstain')),
    voting_power DECIMAL(18, 6) NOT NULL,
    weight DECIMAL(18, 6) NOT NULL,
    conviction_multiplier INTEGER DEFAULT 1,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    UNIQUE(proposal_id, voter_id)
);

CREATE INDEX idx_votes_proposal ON votes(proposal_id);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_timestamp ON votes(timestamp);

-- Voting power table
CREATE TABLE IF NOT EXISTS voting_power (
    user_id UUID PRIMARY KEY,
    reputation_score DECIMAL(18, 6) DEFAULT 0,
    stake_amount DECIMAL(18, 6) DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voting_power_reputation ON voting_power(reputation_score DESC);
CREATE INDEX idx_voting_power_stake ON voting_power(stake_amount DESC);

-- Delegations table
CREATE TABLE IF NOT EXISTS delegations (
    id UUID PRIMARY KEY,
    delegator_id UUID NOT NULL,
    delegate_id UUID NOT NULL,
    voting_power DECIMAL(18, 6) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (delegator_id != delegate_id)
);

CREATE INDEX idx_delegations_delegator ON delegations(delegator_id);
CREATE INDEX idx_delegations_delegate ON delegations(delegate_id);
CREATE INDEX idx_delegations_active ON delegations(active) WHERE active = TRUE;

-- Proposal discussion threads table
CREATE TABLE IF NOT EXISTS proposal_discussions (
    id UUID PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    parent_id UUID REFERENCES proposal_discussions(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_discussions_proposal ON proposal_discussions(proposal_id);
CREATE INDEX idx_discussions_parent ON proposal_discussions(parent_id);
CREATE INDEX idx_discussions_user ON proposal_discussions(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON proposal_discussions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
