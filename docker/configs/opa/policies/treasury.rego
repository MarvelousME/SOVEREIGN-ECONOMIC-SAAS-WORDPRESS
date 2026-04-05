package treasury

# Treasury Policy
# Controls access to treasury operations: withdrawals, spending, allocations

import future.keywords.if
import future.keywords.in

default allow = false

# Withdrawal Rules
# Can user withdraw funds?

# ALLOW: Withdrawal with sufficient balance
allow_withdrawal {
    input.action == "withdraw"
    user_balance >= input.amount
    not exceeds_daily_limit
    kyc_verified
    not account_frozen
}

# DENY: Insufficient balance
deny_withdrawal[msg] {
    input.action == "withdraw"
    user_balance < input.amount
    msg := sprintf("Insufficient balance: have %v, requested %v", [user_balance, input.amount])
}

# DENY: Daily limit exceeded
deny_withdrawal[msg] {
    input.action == "withdraw"
    exceeds_daily_limit
    msg := sprintf("Daily withdrawal limit exceeded: limit is %v, attempted %v", [daily_limit, daily_spent + input.amount])
}

# DENY: KYC not verified
deny_withdrawal[msg] {
    input.action == "withdraw"
    not kyc_verified
    input.amount > kyc_threshold
    msg := sprintf("KYC verification required for withdrawals over %v", [kyc_threshold])
}

# DENY: Account frozen
deny_withdrawal[msg] {
    input.action == "withdraw"
    account_frozen
    msg := "Account is frozen, withdrawals disabled"
}

# Spending Rules
# Can spending exceed threshold?

# ALLOW: Small spends (under threshold)
allow_spend {
    input.action == "spend"
    input.amount <= spend_threshold
    has_role("treasury_member")
}

# ALLOW: Large spends with multi-sig
allow_spend {
    input.action == "spend"
    input.amount > spend_threshold
    has_multisig_approval
    has_role("treasury_admin")
}

# DENY: Spending over threshold without multi-sig
deny_spend[msg] {
    input.action == "spend"
    input.amount > spend_threshold
    not has_multisig_approval
    msg := sprintf("Multi-signature approval required for spends over %v", [spend_threshold])
}

# DENY: Unauthorized spender
deny_spend[msg] {
    input.action == "spend"
    not has_role("treasury_member")
    not has_role("treasury_admin")
    msg := "User not authorized to spend from treasury"
}

# Strategy Allocation Rules
# Can strategy allocation change?

# ALLOW: Admin can change allocations
allow_allocation {
    input.action == "change_allocation"
    has_role("treasury_admin")
    valid_allocation_sum
}

# ALLOW: DAO governance approved allocation
allow_allocation {
    input.action == "change_allocation"
    has_governance_approval
    valid_allocation_sum
}

# DENY: Invalid allocation sum
deny_allocation[msg] {
    input.action == "change_allocation"
    not valid_allocation_sum
    msg := sprintf("Allocation percentages must sum to 100, got %v", [allocation_sum])
}

# DENY: Unauthorized allocation change
deny_allocation[msg] {
    input.action == "change_allocation"
    not has_role("treasury_admin")
    not has_governance_approval
    msg := "Only treasury admins or DAO governance can change allocations"
}

# DENY: Risky allocation strategy
deny_allocation[msg] {
    input.action == "change_allocation"
    is_risky_allocation
    not has_explicit_risk_approval
    msg := "High-risk allocation strategy requires explicit approval"
}

# Helper Functions

user_balance := input.resource.balance {
    input.resource.balance
}

user_balance := 0 {
    not input.resource.balance
}

daily_limit := input.resource.daily_withdrawal_limit {
    input.resource.daily_withdrawal_limit
}

daily_limit := 10000 {
    not input.resource.daily_withdrawal_limit
}

daily_spent := input.resource.daily_spent {
    input.resource.daily_spent
}

daily_spent := 0 {
    not input.resource.daily_spent
}

exceeds_daily_limit {
    daily_spent + input.amount > daily_limit
}

kyc_verified {
    input.subject.kyc_status == "verified"
}

kyc_threshold := 1000

account_frozen {
    input.resource.status == "frozen"
}

spend_threshold := 50000

has_multisig_approval {
    count(input.approvals) >= input.required_signatures
    all_signatures_valid
}

all_signatures_valid {
    # In production, verify cryptographic signatures
    every approval in input.approvals {
        approval.signature
        approval.signer_address
    }
}

has_governance_approval {
    input.governance_proposal_id
    input.governance_proposal.status == "executed"
}

valid_allocation_sum {
    allocation_sum == 100
}

allocation_sum := sum([alloc.percentage | alloc := input.allocations[_]])

is_risky_allocation {
    some alloc in input.allocations
    alloc.risk_level == "high"
    alloc.percentage > 30
}

has_explicit_risk_approval {
    input.risk_acknowledged == true
    input.approvals
    count(input.approvals) >= 2
}

has_role(role) {
    input.subject.roles[_] == role
}

# Main decision
allow {
    allow_withdrawal
}

allow {
    allow_spend
}

allow {
    allow_allocation
}

# Collect violations
violations[msg] {
    msg := deny_withdrawal[_]
}

violations[msg] {
    msg := deny_spend[_]
}

violations[msg] {
    msg := deny_allocation[_]
}
