package treasury

import future.keywords.if
import future.keywords.in

# Default deny
default allow = false

# Treasury admin permissions
allow if {
    input.action == "admin"
    is_treasury_admin
}

# Allow deposits with limits
allow if {
    input.action == "deposit"
    input.amount
    deposit_within_limits
}

# Allow withdrawals with daily limits
allow if {
    input.action == "withdraw"
    input.amount
    withdrawal_within_daily_limit
}

# Allow rebalancing for admins only
allow if {
    input.action == "rebalance"
    is_treasury_admin
}

# Helper rules
is_treasury_admin if {
    user_roles := data.users[input.user_id].roles
    "treasury_admin" in user_roles
}

deposit_within_limits if {
    amount := to_number(input.amount)
    amount > 0
    amount <= 10000000  # Max single deposit: $10M
}

withdrawal_within_daily_limit if {
    amount := to_number(input.amount)
    amount > 0
    daily_withdrawn := get_daily_withdrawn_amount(input.user_id, input.vault_id)
    total := amount + daily_withdrawn
    total <= data.config.max_withdrawal_daily
}

# Calculate daily withdrawn amount (simplified - would query actual data)
get_daily_withdrawn_amount(user_id, vault_id) = amount if {
    # In production, this would query the transaction database
    # For now, return a mock value
    amount := 0
}

# Risk assessment
assess_vault_risk(vault_id) = risk_score if {
    vault := data.vaults[vault_id]
    strategy := data.strategies[vault.strategy_id]
    risk_score := strategy.risk_level
}

# Check if vault should be paused
should_pause_vault(vault_id) if {
    risk_score := assess_vault_risk(vault_id)
    risk_score > 8
}

# Spending limits
check_spending_limit(user_id, amount) if {
    user := data.users[user_id]
    limit := user.daily_limit
    spent_today := get_daily_spent(user_id)
    to_number(amount) + spent_today <= limit
}

get_daily_spent(user_id) = spent if {
    # Would query transaction history
    spent := 0
}
