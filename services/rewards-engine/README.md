# Rewards Engine Service

Comprehensive rewards calculation and distribution system for the UBI-CMS platform.

## Overview

The Rewards Engine calculates, tracks, and distributes rewards from multiple sources with dynamic multipliers based on user reputation, loyalty, staking, and volume.

## Features

### Core Functionality
- ✅ Multi-source reward calculation
- ✅ Dynamic multiplier system (1.0x - 4.16x total)
- ✅ Real-time reward tracking
- ✅ Automated distribution
- ✅ Reward pooling and allocation
- ✅ Referral program (3-tier)
- ✅ Agent marketplace revenue sharing

### Reward Sources

| Source | Description | Base Calculation |
|--------|-------------|------------------|
| **Task Completion** | Completing verified tasks | Base reward × quality × complexity × urgency |
| **Referrals** | Multi-tier referral bonuses | 10% (tier 1), 5% (tier 2), 2% (tier 3) |
| **Agent Revenue** | Agent marketplace sales | 70% to creator, 30% platform fee |
| **Data Monetization** | Selling data contributions | $0.01/point × quality × demand |
| **Staking** | Token staking rewards | APY-based + reputation bonus |
| **Loyalty Bonus** | Consecutive activity streaks | Milestone-based bonuses |

### Multiplier System

**Total Multiplier = Reputation × Loyalty × Staking × Volume**

#### 1. Reputation Multiplier (1.0x - 2.0x)
- Based on reputation score (0-1000)
- Linear scaling: `1.0 + (score / 1000)`
- Examples:
  - Score 0: 1.0x
  - Score 500: 1.5x
  - Score 1000: 2.0x

#### 2. Loyalty Multiplier (1.0x - 1.5x)
- Based on account age (logarithmic)
- 30 days: ~1.1x
- 90 days: ~1.2x
- 365 days: ~1.4x
- 730+ days: 1.5x

#### 3. Staking Multiplier (1.0x - 1.3x)
- Based on locked tokens (logarithmic)
- 1,000 tokens: ~1.1x
- 10,000 tokens: ~1.2x
- 100,000+ tokens: 1.3x

#### 4. Volume Multiplier (1.0x - 1.2x)
- Based on 30-day transaction volume
- Linear scaling up to $50,000
- Encourages platform activity

**Maximum Combined Multiplier: 2.0 × 1.5 × 1.3 × 1.2 = 4.68x**

## API Endpoints

### POST /api/v1/rewards/calculate
Calculate reward for an action.

**Request:**
```json
{
  "userId": "user-123",
  "source": "TASK_COMPLETION",
  "baseAmount": 100.00,
  "metadata": {
    "taskId": "task-456",
    "quality": 95,
    "complexity": 4,
    "urgency": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "rewardId": "reward-789",
    "userId": "user-123",
    "source": "TASK_COMPLETION",
    "baseAmount": 100.00,
    "multipliers": {
      "reputationMultiplier": 1.750,
      "loyaltyMultiplier": 1.200,
      "stakingMultiplier": 1.150,
      "volumeMultiplier": 1.080
    },
    "totalMultiplier": 2.619,
    "finalAmount": 261.90,
    "status": "CALCULATED",
    "calculatedAt": "2026-03-26T05:52:30Z"
  }
}
```

### GET /api/v1/rewards/history
Get user reward history.

**Query Parameters:**
- `userId` - User ID (optional if authenticated)
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)
- `source` - Filter by source (optional)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rewardId": "reward-789",
      "source": "TASK_COMPLETION",
      "finalAmount": 261.90,
      "status": "CLAIMED",
      "calculatedAt": "2026-03-26T05:52:30Z"
    }
  ]
}
```

### GET /api/v1/rewards/pending
Get pending (unclaimed) rewards.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rewardId": "reward-790",
      "source": "REFERRAL",
      "finalAmount": 25.50,
      "status": "APPROVED",
      "calculatedAt": "2026-03-26T06:00:00Z"
    }
  ]
}
```

### POST /api/v1/rewards/claim
Claim pending rewards.

**Request:**
```json
{
  "rewardIds": ["reward-790", "reward-791"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAmount": 287.40,
    "claimedRewards": ["reward-790", "reward-791"],
    "transactionId": "txn-123"
  }
}
```

### GET /api/v1/rewards/stats
Get aggregate reward statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "totalRewardsEarned": 15750.50,
    "totalRewardsClaimed": 14200.00,
    "totalRewardsPending": 1550.50,
    "rewardsBySource": {
      "TASK_COMPLETION": 12000.00,
      "REFERRAL": 2500.00,
      "AGENT_REVENUE": 1250.50
    },
    "averageMultiplier": 2.341,
    "lastRewardDate": "2026-03-26T05:52:30Z"
  }
}
```

### GET /api/v1/rewards/pools
Get active reward pools.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "poolId": "pool-1",
      "source": "TASK_COMPLETION",
      "totalAllocated": 1000000.00,
      "totalDistributed": 350000.00,
      "remaining": 650000.00,
      "startDate": "2026-01-01T00:00:00Z",
      "endDate": "2026-03-31T23:59:59Z",
      "isActive": true
    }
  ]
}
```

### GET /api/v1/rewards/multipliers/:userId
Get current multipliers for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "reputationMultiplier": 1.750,
    "loyaltyMultiplier": 1.200,
    "stakingMultiplier": 1.150,
    "volumeMultiplier": 1.080
  }
}
```

## Events

### Published Events

#### reward.calculated
Emitted when a reward is calculated.
```json
{
  "rewardId": "reward-789",
  "userId": "user-123",
  "source": "TASK_COMPLETION",
  "finalAmount": 261.90
}
```

#### reward.distributed
Emitted when rewards are claimed.
```json
{
  "userId": "user-123",
  "totalAmount": 287.40,
  "transactionId": "txn-123",
  "rewardIds": ["reward-790", "reward-791"]
}
```

### Subscribed Events

#### task.approved
Triggers task completion reward calculation.

#### referral.converted
Triggers referral reward calculation.

#### agent.revenue
Triggers agent revenue share calculation.

## Setup

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ubi_cms
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
REPUTATION_SERVICE_URL=http://localhost:3002
LEDGER_SERVICE_URL=http://localhost:3001
PORT=3003
NODE_ENV=production
```

### Installation
```bash
cd services/rewards-engine
npm install
npm run build
```

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Testing
```bash
npm test
npm run test:watch
npm run test:integration
```

## Database Schema

See `migrations/008_rewards_reputation_schema.sql` for complete schema.

### Key Tables
- `rewards` - All reward records
- `referral_rewards` - Referral reward details
- `agent_revenue_shares` - Agent marketplace shares
- `reward_pools` - Reward pool allocations
- `reward_distributions` - Distribution records

## Integration with Reputation Service

The rewards engine tightly integrates with the reputation service:

1. **Reputation Multiplier**: Fetches current reputation score
2. **Achievement Unlocks**: Rewards trigger achievement checks
3. **Fraud Prevention**: Suspicious rewards flagged in reputation service

## Temporal Workflows

### Reward Pool Management
Automated workflow to manage reward pool lifecycles:
- Monitor pool balances
- Trigger refills when low
- Archive expired pools

### Loyalty Bonus Distribution
Daily workflow to calculate and distribute loyalty bonuses:
- Check consecutive activity streaks
- Calculate milestone bonuses
- Distribute rewards

## Performance

- **Redis Caching**: 5-minute cache for user stats
- **Batch Processing**: Claim multiple rewards in single transaction
- **Event-Driven**: Asynchronous processing via NATS
- **Database Indexing**: Optimized queries with proper indexes

## Security

- **Authentication**: JWT-based auth middleware
- **Rate Limiting**: Per-endpoint rate limits
- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Parameterized queries
- **Transaction Safety**: ACID compliance

## Monitoring

### Metrics
- Reward calculation latency
- Distribution success rate
- Pool depletion rate
- Average multipliers
- Fraud detection hits

### Logging
- Winston logger with structured logs
- Error tracking with stack traces
- Performance metrics
- Audit trail for claims

## Future Enhancements

- [ ] Dynamic pool allocation based on demand
- [ ] Advanced fraud detection with ML
- [ ] Reward prediction API
- [ ] Gamification elements
- [ ] Cross-platform reward portability
- [ ] Reward NFTs for special achievements

## License

MIT
