package governance

# Governance Policy
# Controls proposal creation, voting, and execution

import future.keywords.if
import future.keywords.in

default allow = false

# Proposal Creation Rules
# Can user create proposal?

# ALLOW: Create proposal with minimum reputation
allow_create_proposal {
    input.action == "create_proposal"
    has_minimum_reputation
    has_minimum_stake
    valid_proposal
    not proposal_spam
}

# DENY: Insufficient reputation
deny_create_proposal[msg] {
    input.action == "create_proposal"
    not has_minimum_reputation
    msg := sprintf("Minimum reputation of %v required, user has %v", [min_proposal_reputation, user_reputation])
}

# DENY: Insufficient stake
deny_create_proposal[msg] {
    input.action == "create_proposal"
    not has_minimum_stake
    msg := sprintf("Minimum stake of %v tokens required, user has %v", [min_proposal_stake, user_stake])
}

# DENY: Invalid proposal
deny_create_proposal[msg] {
    input.action == "create_proposal"
    not valid_proposal
    msg := "Proposal validation failed: title, description, and actions required"
}

# DENY: Proposal spam
deny_create_proposal[msg] {
    input.action == "create_proposal"
    proposal_spam
    msg := sprintf("Too many proposals created recently: %v in last 24h (max: %v)", [proposals_24h, max_proposals_per_day])
}

# Voting Rules
# Can user vote on proposal?

# ALLOW: Vote with voting power
allow_vote {
    input.action == "vote"
    proposal_active
    not already_voted
    has_voting_power
    not vote_manipulation_detected
}

# DENY: Proposal not active
deny_vote[msg] {
    input.action == "vote"
    not proposal_active
    msg := sprintf("Proposal not in voting phase: status is %v", [proposal_status])
}

# DENY: Already voted
deny_vote[msg] {
    input.action == "vote"
    already_voted
    msg := "User has already voted on this proposal"
}

# DENY: No voting power
deny_vote[msg] {
    input.action == "vote"
    not has_voting_power
    msg := "User has no voting power (requires reputation or stake)"
}

# DENY: Vote manipulation detected
deny_vote[msg] {
    input.action == "vote"
    vote_manipulation_detected
    msg := "Vote manipulation detected: suspicious voting pattern"
}

# Voting Power Calculation

voting_power := calculated_power {
    calculated_power := reputation_power + stake_power
}

reputation_power := user_reputation / 10 {
    user_reputation >= 10
}

reputation_power := 0 {
    user_reputation < 10
}

stake_power := user_stake {
    user_stake > 0
}

stake_power := 0 {
    user_stake == 0
}

has_voting_power {
    voting_power > 0
}

# Proposal Execution Rules
# Can proposal execute?

# ALLOW: Execute passed proposal
allow_execute_proposal {
    input.action == "execute_proposal"
    proposal_passed
    quorum_met
    delay_elapsed
    not execution_blocked
}

# DENY: Proposal not passed
deny_execute_proposal[msg] {
    input.action == "execute_proposal"
    not proposal_passed
    msg := sprintf("Proposal did not pass: %v for, %v against (needed %v%%)", [votes_for, votes_against, pass_threshold])
}

# DENY: Quorum not met
deny_execute_proposal[msg] {
    input.action == "execute_proposal"
    not quorum_met
    msg := sprintf("Quorum not met: %v/%v votes (need %v%%)", [total_votes, total_voting_power, quorum_percentage])
}

# DENY: Delay not elapsed
deny_execute_proposal[msg] {
    input.action == "execute_proposal"
    not delay_elapsed
    msg := sprintf("Execution delay not elapsed: %v hours remaining", [remaining_delay_hours])
}

# DENY: Execution blocked
deny_execute_proposal[msg] {
    input.action == "execute_proposal"
    execution_blocked
    msg := sprintf("Execution blocked: %v", [block_reason])
}

# Helper Functions

# User reputation
user_reputation := input.subject.reputation_score {
    input.subject.reputation_score
}

user_reputation := 0 {
    not input.subject.reputation_score
}

min_proposal_reputation := 100

has_minimum_reputation {
    user_reputation >= min_proposal_reputation
}

# User stake
user_stake := input.subject.staked_tokens {
    input.subject.staked_tokens
}

user_stake := 0 {
    not input.subject.staked_tokens
}

min_proposal_stake := 1000

has_minimum_stake {
    user_stake >= min_proposal_stake
}

# Proposal validation
valid_proposal {
    input.proposal.title
    count(input.proposal.title) >= 10
    input.proposal.description
    count(input.proposal.description) >= 100
    input.proposal.actions
    count(input.proposal.actions) > 0
}

# Spam detection
proposals_24h := input.subject.proposals_created_24h {
    input.subject.proposals_created_24h
}

proposals_24h := 0 {
    not input.subject.proposals_created_24h
}

max_proposals_per_day := 3

proposal_spam {
    proposals_24h >= max_proposals_per_day
}

# Proposal status
proposal_status := input.resource.status {
    input.resource.status
}

proposal_status := "unknown" {
    not input.resource.status
}

proposal_active {
    proposal_status == "active"
}

proposal_active {
    proposal_status == "voting"
}

# Voting tracking
already_voted {
    input.resource.voters[_] == input.subject.id
}

# Vote manipulation detection
vote_manipulation_detected {
    # Detect if multiple accounts from same IP voted
    input.subject.ip_address
    suspicious_ip_votes > 5
}

suspicious_ip_votes := count([v | 
    v := input.resource.votes[_]
    v.ip_address == input.subject.ip_address
])

# Proposal passing logic
votes_for := input.resource.votes_for {
    input.resource.votes_for
}

votes_for := 0 {
    not input.resource.votes_for
}

votes_against := input.resource.votes_against {
    input.resource.votes_against
}

votes_against := 0 {
    not input.resource.votes_against
}

total_votes := votes_for + votes_against

pass_threshold := 66.67

proposal_passed {
    total_votes > 0
    percentage_for >= pass_threshold
}

percentage_for := (votes_for / total_votes) * 100

# Quorum calculation
total_voting_power := input.resource.total_voting_power {
    input.resource.total_voting_power
}

total_voting_power := 10000 {
    not input.resource.total_voting_power
}

quorum_percentage := 20

quorum_met {
    (total_votes / total_voting_power) * 100 >= quorum_percentage
}

# Execution delay
delay_elapsed {
    input.resource.voting_ended_at
    time.now_ns() - input.resource.voting_ended_at >= execution_delay_ns
}

execution_delay_ns := 172800000000000 # 48 hours in nanoseconds

remaining_delay_hours := hours {
    not delay_elapsed
    remaining_ns := execution_delay_ns - (time.now_ns() - input.resource.voting_ended_at)
    hours := remaining_ns / 3600000000000
}

# Execution blocking
execution_blocked {
    input.resource.blocked == true
}

block_reason := input.resource.block_reason {
    input.resource.block_reason
}

block_reason := "unknown" {
    not input.resource.block_reason
}

# Main decision
allow {
    allow_create_proposal
}

allow {
    allow_vote
}

allow {
    allow_execute_proposal
}

# Collect violations
violations[msg] {
    msg := deny_create_proposal[_]
}

violations[msg] {
    msg := deny_vote[_]
}

violations[msg] {
    msg := deny_execute_proposal[_]
}

# Additional data for client
decision_metadata := {
    "voting_power": voting_power,
    "reputation_power": reputation_power,
    "stake_power": stake_power,
    "user_reputation": user_reputation,
    "user_stake": user_stake
}
