# UBI Distribution Algorithms

This document provides an in-depth explanation of the UBI distribution algorithms implemented in the UBI Engine.

## Algorithm Overview

The UBI Engine implements four distribution strategies that can be combined through a **Hybrid Algorithm**:

1. **Equal Distribution** - Fair baseline
2. **Activity-Weighted** - Rewards recent participation
3. **Contribution-Weighted** - Rewards value creation
4. **Reputation-Multiplied** - Quality multiplier

---

## 1. Equal Distribution (Baseline)

### Purpose
Provides a baseline UBI that ensures every eligible user receives a minimum share regardless of activity or contribution levels.

### Formula
```
amount_per_user = (total_pool × W_equal) / eligible_users_count
```

### Example
- Pool: 10,000 tokens
- Equal weight: 40%
- Eligible users: 100
- Result: Each user gets 40 tokens baseline

### Pros
- Fair and predictable
- Prevents inequality
- Easy to understand

### Cons
- Doesn't incentivize participation
- Can be gamed with Sybil attacks

---

## 2. Activity-Weighted Distribution

### Purpose
Rewards users who are actively participating in the platform, with recent activity valued more than old activity through exponential decay.

### Decay Function
```
weighted_score = Σ(event_score × e^(-decay_rate × days_since_event))
```

Where:
- `decay_rate = 0.1` (configurable)
- `days_since_event` = time elapsed since activity
- `event_score` = points assigned to activity type

### Activity Scoring
```
Task completed:      +10 points
Referral converted:  +25 points
Agent revenue:       +15 points
```

### Bonus Calculation
```
user_activity_bonus = (user_activity_score / total_activity_score) × (total_pool × W_activity)
```

### Example
User A:
- 5 tasks completed (last 10 days): 5 × 10 × e^(-0.1×10) = 18.4 points
- 1 referral (last 5 days): 1 × 25 × e^(-0.1×5) = 15.2 points
- Total: 33.6 points

User B:
- 2 tasks completed (last 30 days): 2 × 10 × e^(-0.1×30) = 1.0 points
- Total: 1.0 points

Distribution (assuming 30% activity weight on 10,000 pool):
- Total activity score: 34.6
- User A bonus: (33.6/34.6) × 3000 = 2,913 tokens
- User B bonus: (1.0/34.6) × 3000 = 87 tokens

### Decay Chart
```
Days Since Activity  Multiplier
0                   1.00 (100%)
7                   0.50 (50%)
14                  0.25 (25%)
30                  0.05 (5%)
60                  0.00 (0%)
```

### Pros
- Incentivizes ongoing participation
- Recent activity valued more
- Reduces reward for inactive accounts

### Cons
- Penalizes users with temporary inactivity
- Complex calculation

---

## 3. Contribution-Weighted Distribution

### Purpose
Rewards users based on the economic value they bring to the platform through tasks, referrals, and revenue generation.

### Contribution Types
```
Task completion:     value × 1.0 multiplier
Referral:           value × 2.0 multiplier
Agent revenue:      revenue_amount × 1.5 multiplier
```

### Scoring Formula
```
contribution_score = Σ(contribution_value × multiplier)
```

### Bonus Calculation
```
user_contribution_bonus = (user_contribution_score / total_contribution_score) × (total_pool × W_contribution)
```

### Example
User A:
- 10 tasks completed: 10 × 1.0 = 10 points
- 3 referrals: 3 × 2.0 = 6 points
- $50 agent revenue: 50 × 1.5 = 75 points
- Total: 91 points

User B:
- 5 tasks completed: 5 × 1.0 = 5 points
- 0 referrals: 0
- $10 agent revenue: 10 × 1.5 = 15 points
- Total: 20 points

Distribution (assuming 20% contribution weight on 10,000 pool):
- Total contribution score: 111
- User A bonus: (91/111) × 2000 = 1,640 tokens
- User B bonus: (20/111) × 2000 = 360 tokens

### Pros
- Directly rewards value creation
- Incentivizes high-value activities
- Encourages referrals

### Cons
- Can create inequality
- May favor power users

---

## 4. Reputation Multiplier

### Purpose
Acts as a quality multiplier on the combined base+activity+contribution amounts, rewarding users with positive reputation.

### Reputation Score
Range: 0-100 (currently placeholder, will integrate with reputation system)

### Multiplier Calculation
```
reputation_multiplier = 1 + (reputation_score / 100) × W_reputation
```

### Example
With 10% reputation weight:
- User with 80 reputation: multiplier = 1 + (80/100) × 0.1 = 1.08 (8% boost)
- User with 50 reputation: multiplier = 1 + (50/100) × 0.1 = 1.05 (5% boost)
- User with 20 reputation: multiplier = 1 + (20/100) × 0.1 = 1.02 (2% boost)

### Application
```
final_amount = (base + activity_bonus + contribution_bonus) × reputation_multiplier
```

### Pros
- Rewards good behavior
- Modest boost prevents inequality
- Can integrate with community voting

### Cons
- Requires robust reputation system
- Potential for gaming

---

## 5. Hybrid Algorithm (Default)

### Purpose
Combines all algorithms to create a balanced, fair, and incentive-compatible distribution system.

### Default Weights
```
W_equal        = 0.4 (40%)
W_activity     = 0.3 (30%)
W_contribution = 0.2 (20%)
W_reputation   = 0.1 (10%)
```

### Complete Formula
```
Step 1: Calculate components
base_amount          = (total_pool × W_equal) / eligible_users_count
activity_bonus       = (user_activity_score / total_activity) × (total_pool × W_activity)
contribution_bonus   = (user_contribution_score / total_contribution) × (total_pool × W_contribution)
reputation_multiplier = 1 + (reputation_score / 100) × W_reputation

Step 2: Combine with multiplier
total_amount = (base_amount + activity_bonus + contribution_bonus) × reputation_multiplier

Step 3: Apply cap
final_amount = min(total_amount, max_cap_per_user)
```

### Complete Example

**Scenario**: 10,000 token pool, 100 eligible users

**User A** (Power User):
- Activity score: 80 (out of 1000 total)
- Contribution score: 120 (out of 500 total)
- Reputation: 90

```
base = (10000 × 0.4) / 100 = 40
activity = (80/1000) × (10000 × 0.3) = 240
contribution = (120/500) × (10000 × 0.2) = 480
reputation_mult = 1 + (90/100) × 0.1 = 1.09
total = (40 + 240 + 480) × 1.09 = 827.4 tokens
```

**User B** (Average User):
- Activity score: 10 (out of 1000 total)
- Contribution score: 5 (out of 500 total)
- Reputation: 50

```
base = (10000 × 0.4) / 100 = 40
activity = (10/1000) × (10000 × 0.3) = 30
contribution = (5/500) × (10000 × 0.2) = 20
reputation_mult = 1 + (50/100) × 0.1 = 1.05
total = (40 + 30 + 20) × 1.05 = 94.5 tokens
```

**User C** (Inactive User):
- Activity score: 1 (out of 1000 total)
- Contribution score: 0 (out of 500 total)
- Reputation: 30

```
base = (10000 × 0.4) / 100 = 40
activity = (1/1000) × (10000 × 0.3) = 3
contribution = (0/500) × (10000 × 0.2) = 0
reputation_mult = 1 + (30/100) × 0.1 = 1.03
total = (40 + 3 + 0) × 1.03 = 44.3 tokens
```

### Distribution Ratio
- User A: 827.4 tokens (18.7× baseline)
- User B: 94.5 tokens (2.1× baseline)
- User C: 44.3 tokens (1.0× baseline)

### Fairness Analysis
- Everyone gets baseline (40 tokens minimum)
- Active users rewarded proportionally
- Top user gets 18.7× more, not 100× more (prevented by weights)
- Maximum cap prevents whale concentration

---

## Anti-Abuse Measures

### 1. Eligibility Requirements
```
✓ Account age ≥ 7 days
✓ Participation score ≥ 10
✓ Not flagged for abuse
```

### 2. Maximum Cap
```
if (total_amount > max_cap_per_user) {
  total_amount = max_cap_per_user  // default: 1000 tokens
}
```

### 3. Sybil Detection
- IP-based account linking
- Device fingerprinting
- Behavioral pattern analysis
- Manual review for flagged accounts

### 4. Activity Decay
Prevents old inactive accounts from receiving rewards:
```
score × e^(-0.1 × days_inactive)
```

---

## Vesting Schedule

### Purpose
Prevents users from immediately dumping tokens, encourages long-term holding.

### Schedule
```
Immediate:  50% vested (available to claim)
Gradual:    50% vests over 7 days (linear)
```

### Calculation
```
vested_amount = total_amount × 0.5
unvested_amount = total_amount × 0.5
vesting_complete_at = distribution_date + 7 days
```

### Daily Unlock
```
daily_unlock = unvested_amount / 7
```

---

## Pool Sustainability

### Sustainability Check (Weekly)
```
remaining_percent = (remaining_amount / total_amount) × 100

if (remaining_percent < 20%) {
  // Reduce distribution rate
  new_distribution_rate = 0.05  // down from 0.10
  
  // Or increase pool
  add_to_pool(additional_tokens)
}
```

### Distribution Rate
Default: 10% of remaining pool per distribution
```
distribution_amount = remaining_amount × 0.10
```

This ensures the pool lasts for at least 10 distributions if no new funds added.

---

## Customization

### Adjusting Weights
Weights must sum to 1.0:
```javascript
// More equal distribution
{ equal: 0.6, activity: 0.2, contribution: 0.15, reputation: 0.05 }

// More meritocratic
{ equal: 0.2, activity: 0.3, contribution: 0.4, reputation: 0.1 }

// Reputation-focused
{ equal: 0.3, activity: 0.2, contribution: 0.2, reputation: 0.3 }
```

### Adjusting Activity Decay
```javascript
// Slower decay (rewards stay longer)
decay_rate = 0.05

// Faster decay (only recent activity counts)
decay_rate = 0.2
```

### Adjusting Contribution Multipliers
```javascript
// Higher referral value
referral_multiplier = 3.0

// Higher agent revenue value
agent_revenue_multiplier = 2.0
```

---

## Performance Optimization

### Caching Strategy
- Eligibility scores: 1 hour TTL
- Pool stats: 5 minutes TTL
- User balances: Real-time (no cache)

### Batch Processing
- Process 1000 users per batch
- Parallel eligibility calculation
- Transaction batching for database writes

### Database Indexes
```sql
CREATE INDEX idx_user_eligibility_eligible ON user_eligibility(is_eligible);
CREATE INDEX idx_activity_events_occurred ON activity_events(occurred_at);
CREATE INDEX idx_contribution_records_type ON contribution_records(contribution_type);
```

---

## Future Enhancements

1. **Machine Learning Scoring** - Predict user value based on patterns
2. **Dynamic Weight Adjustment** - AI-optimized weights per tenant
3. **Quadratic Funding** - Community-weighted distributions
4. **Staking Boost** - Lock tokens for higher multiplier
5. **Achievement Bonuses** - One-time rewards for milestones

---

## References

- [Universal Basic Income Theory](https://en.wikipedia.org/wiki/Universal_basic_income)
- [Sybil Attack Prevention](https://en.wikipedia.org/wiki/Sybil_attack)
- [Exponential Decay](https://en.wikipedia.org/wiki/Exponential_decay)
- [Quadratic Funding](https://wtfisqf.com/)
