package agents

# Agent Policy
# Controls agent deployment, resource access, and treasury spending

import future.keywords.if
import future.keywords.in

default allow = false

# Agent Deployment Rules
# Can user deploy agent?

# ALLOW: Deploy with good reputation and active subscription
allow_deploy_agent {
    input.action == "deploy_agent"
    has_minimum_reputation
    has_active_subscription
    within_deployment_quota
    not reputation_flagged
}

# DENY: Insufficient reputation
deny_deploy_agent[msg] {
    input.action == "deploy_agent"
    not has_minimum_reputation
    msg := sprintf("Minimum reputation score of %v required, user has %v", [min_reputation_score, user_reputation])
}

# DENY: No active subscription
deny_deploy_agent[msg] {
    input.action == "deploy_agent"
    not has_active_subscription
    msg := sprintf("Active subscription tier required. User tier: %v", [subscription_tier])
}

# DENY: Deployment quota exceeded
deny_deploy_agent[msg] {
    input.action == "deploy_agent"
    not within_deployment_quota
    msg := sprintf("Agent deployment quota exceeded: %v/%v agents deployed", [deployed_agents, max_agents])
}

# DENY: Reputation flagged
deny_deploy_agent[msg] {
    input.action == "deploy_agent"
    reputation_flagged
    msg := "Cannot deploy agents: reputation flagged for violations"
}

# Agent Resource Access Rules
# Can agent access resource?

# ALLOW: Agent has required scopes
allow_agent_access {
    input.action == "agent_access_resource"
    agent_has_scopes
    resource_within_quota
    not agent_suspended
}

# DENY: Missing required scopes
deny_agent_access[msg] {
    input.action == "agent_access_resource"
    not agent_has_scopes
    msg := sprintf("Agent missing required scopes: needs %v, has %v", [required_scopes, agent_scopes])
}

# DENY: Resource quota exceeded
deny_agent_access[msg] {
    input.action == "agent_access_resource"
    not resource_within_quota
    msg := sprintf("Agent resource quota exceeded: %v/%v API calls used", [agent_api_calls, max_api_calls])
}

# DENY: Agent suspended
deny_agent_access[msg] {
    input.action == "agent_access_resource"
    agent_suspended
    msg := sprintf("Agent '%s' is suspended", [input.agent.id])
}

# Agent Treasury Spending Rules
# Can agent spend from treasury?

# ALLOW: Agent spend within limits
allow_agent_spend {
    input.action == "agent_spend_treasury"
    within_agent_spend_limit
    owner_authorized
    not excessive_burn_rate
}

# DENY: Spend limit exceeded
deny_agent_spend[msg] {
    input.action == "agent_spend_treasury"
    not within_agent_spend_limit
    msg := sprintf("Agent spend limit exceeded: limit %v, attempted %v (daily spent: %v)", [agent_spend_limit, input.amount, agent_daily_spent])
}

# DENY: Owner not authorized
deny_agent_spend[msg] {
    input.action == "agent_spend_treasury"
    not owner_authorized
    msg := "Agent owner must authorize treasury spending"
}

# DENY: Excessive burn rate
deny_agent_spend[msg] {
    input.action == "agent_spend_treasury"
    excessive_burn_rate
    msg := sprintf("Agent burn rate too high: %v per hour (threshold: %v)", [current_burn_rate, max_burn_rate])
}

# Helper Functions

# Reputation checks
user_reputation := input.subject.reputation_score {
    input.subject.reputation_score
}

user_reputation := 0 {
    not input.subject.reputation_score
}

min_reputation_score := 50

has_minimum_reputation {
    user_reputation >= min_reputation_score
}

reputation_flagged {
    input.subject.reputation_flags
    count(input.subject.reputation_flags) > 0
}

# Subscription checks
subscription_tier := input.subject.subscription_tier {
    input.subject.subscription_tier
}

subscription_tier := "free" {
    not input.subject.subscription_tier
}

has_active_subscription {
    subscription_tier != "free"
    input.subject.subscription_active == true
}

has_active_subscription {
    subscription_tier == "free"
    # Free tier users can deploy 1 agent
    deployed_agents < 1
}

# Deployment quota
deployed_agents := count(input.subject.deployed_agents) {
    input.subject.deployed_agents
}

deployed_agents := 0 {
    not input.subject.deployed_agents
}

max_agents := tier_limits[subscription_tier].max_agents

tier_limits := {
    "free": {"max_agents": 1, "max_api_calls": 1000, "spend_limit": 10},
    "basic": {"max_agents": 5, "max_api_calls": 10000, "spend_limit": 100},
    "pro": {"max_agents": 25, "max_api_calls": 100000, "spend_limit": 1000},
    "enterprise": {"max_agents": 999, "max_api_calls": 999999, "spend_limit": 10000}
}

within_deployment_quota {
    deployed_agents < max_agents
}

# Agent scope checks
agent_scopes := input.agent.scopes {
    input.agent.scopes
}

agent_scopes := [] {
    not input.agent.scopes
}

required_scopes := input.resource.required_scopes {
    input.resource.required_scopes
}

required_scopes := [] {
    not input.resource.required_scopes
}

agent_has_scopes {
    count(required_scopes) == 0
}

agent_has_scopes {
    every scope in required_scopes {
        scope in agent_scopes
    }
}

# Resource quota
agent_api_calls := input.agent.api_calls_today {
    input.agent.api_calls_today
}

agent_api_calls := 0 {
    not input.agent.api_calls_today
}

max_api_calls := tier_limits[subscription_tier].max_api_calls

resource_within_quota {
    agent_api_calls < max_api_calls
}

# Agent status
agent_suspended {
    input.agent.status == "suspended"
}

# Spend limits
agent_spend_limit := tier_limits[subscription_tier].spend_limit

agent_daily_spent := input.agent.daily_spent {
    input.agent.daily_spent
}

agent_daily_spent := 0 {
    not input.agent.daily_spent
}

within_agent_spend_limit {
    agent_daily_spent + input.amount <= agent_spend_limit
}

owner_authorized {
    input.agent.owner_id == input.subject.id
}

owner_authorized {
    input.agent.authorized_spenders[_] == input.subject.id
}

# Burn rate checks
current_burn_rate := input.agent.hourly_spend {
    input.agent.hourly_spend
}

current_burn_rate := 0 {
    not input.agent.hourly_spend
}

max_burn_rate := agent_spend_limit / 24

excessive_burn_rate {
    current_burn_rate > max_burn_rate * 1.5
}

# Main decision
allow {
    allow_deploy_agent
}

allow {
    allow_agent_access
}

allow {
    allow_agent_spend
}

# Collect violations
violations[msg] {
    msg := deny_deploy_agent[_]
}

violations[msg] {
    msg := deny_agent_access[_]
}

violations[msg] {
    msg := deny_agent_spend[_]
}
