package treasury

# Test suite for treasury policy

# Withdrawal Tests

test_allow_withdrawal_sufficient_balance {
    allow_withdrawal with input as {
        "action": "withdraw",
        "amount": 1000,
        "subject": {
            "kyc_status": "verified"
        },
        "resource": {
            "balance": 10000,
            "daily_spent": 0,
            "daily_withdrawal_limit": 5000,
            "status": "active"
        }
    }
}

test_deny_withdrawal_insufficient_balance {
    count(deny_withdrawal) > 0 with input as {
        "action": "withdraw",
        "amount": 15000,
        "resource": {
            "balance": 10000
        }
    }
}

test_deny_withdrawal_daily_limit_exceeded {
    count(deny_withdrawal) > 0 with input as {
        "action": "withdraw",
        "amount": 3000,
        "resource": {
            "balance": 10000,
            "daily_spent": 3000,
            "daily_withdrawal_limit": 5000
        }
    }
}

test_deny_withdrawal_kyc_not_verified {
    count(deny_withdrawal) > 0 with input as {
        "action": "withdraw",
        "amount": 2000,
        "subject": {
            "kyc_status": "pending"
        }
    }
}

test_deny_withdrawal_account_frozen {
    count(deny_withdrawal) > 0 with input as {
        "action": "withdraw",
        "amount": 1000,
        "subject": {
            "kyc_status": "verified"
        },
        "resource": {
            "balance": 10000,
            "status": "frozen"
        }
    }
}

# Spending Tests

test_allow_small_spend {
    allow_spend with input as {
        "action": "spend",
        "amount": 10000,
        "subject": {
            "roles": ["treasury_member"]
        }
    }
}

test_allow_large_spend_with_multisig {
    allow_spend with input as {
        "action": "spend",
        "amount": 100000,
        "subject": {
            "roles": ["treasury_admin"]
        },
        "approvals": [
            {"signature": "sig1", "signer_address": "0x123"},
            {"signature": "sig2", "signer_address": "0x456"}
        ],
        "required_signatures": 2
    }
}

test_deny_large_spend_without_multisig {
    count(deny_spend) > 0 with input as {
        "action": "spend",
        "amount": 100000,
        "subject": {
            "roles": ["treasury_admin"]
        },
        "approvals": []
    }
}

test_deny_spend_unauthorized {
    count(deny_spend) > 0 with input as {
        "action": "spend",
        "amount": 1000,
        "subject": {
            "roles": ["user"]
        }
    }
}

# Allocation Tests

test_allow_allocation_by_admin {
    allow_allocation with input as {
        "action": "change_allocation",
        "subject": {
            "roles": ["treasury_admin"]
        },
        "allocations": [
            {"strategy": "conservative", "percentage": 60},
            {"strategy": "moderate", "percentage": 40}
        ]
    }
}

test_allow_allocation_by_governance {
    allow_allocation with input as {
        "action": "change_allocation",
        "governance_proposal_id": "prop-123",
        "governance_proposal": {
            "status": "executed"
        },
        "allocations": [
            {"strategy": "conservative", "percentage": 100}
        ]
    }
}

test_deny_allocation_invalid_sum {
    count(deny_allocation) > 0 with input as {
        "action": "change_allocation",
        "subject": {
            "roles": ["treasury_admin"]
        },
        "allocations": [
            {"strategy": "conservative", "percentage": 60},
            {"strategy": "moderate", "percentage": 30}
        ]
    }
}

test_deny_allocation_unauthorized {
    count(deny_allocation) > 0 with input as {
        "action": "change_allocation",
        "subject": {
            "roles": ["user"]
        },
        "allocations": [
            {"strategy": "conservative", "percentage": 100}
        ]
    }
}

test_deny_allocation_risky_without_approval {
    count(deny_allocation) > 0 with input as {
        "action": "change_allocation",
        "subject": {
            "roles": ["treasury_admin"]
        },
        "allocations": [
            {"strategy": "aggressive", "percentage": 50, "risk_level": "high"},
            {"strategy": "conservative", "percentage": 50}
        ],
        "risk_acknowledged": false
    }
}

# Helper function tests

test_user_balance_default {
    user_balance == 0 with input as {"resource": {}}
}

test_daily_limit_default {
    daily_limit == 10000 with input as {"resource": {}}
}

test_exceeds_daily_limit_calculation {
    exceeds_daily_limit with input as {
        "amount": 3000,
        "resource": {
            "daily_spent": 3000,
            "daily_withdrawal_limit": 5000
        }
    }
}

test_allocation_sum_calculation {
    allocation_sum == 100 with input as {
        "allocations": [
            {"percentage": 60},
            {"percentage": 40}
        ]
    }
}
