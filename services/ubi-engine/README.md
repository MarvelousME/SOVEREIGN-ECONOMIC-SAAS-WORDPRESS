# UBI Engine Service

The **UBI Engine** is the core differentiator of the UBI-CMS platform, implementing a sophisticated Universal Basic Income distribution system with activity-weighted algorithms, anti-abuse detection, and automated scheduling.

## Features

### Core Functionality
- **Dynamic UBI Pool Management** - Multi-tenant pool configuration and tracking
- **Activity-Weighted Distribution** - Rewards based on recent activity with decay factor
- **Contribution-Based Scoring** - Task completion, referrals, and revenue contributions
- **Automated Distribution Scheduling** - Temporal workflows for daily/weekly distributions
- **Multi-Tier Reward System** - Combined equal, activity, contribution, and reputation weights
- **Eligibility Calculation Engine** - Real-time scoring with caching

### Distribution Algorithms

#### 1. **Equal Distribution** (Baseline)
Every eligible user receives an equal share:
```
amount_per_user = total_pool / eligible_users_count
```

#### 2. **Activity-Weighted Distribution**
Recent activity receives higher rewards with exponential decay:
```
activity_score = Σ(event_score * e^(-0.1 * days_since_event))
bonus = (user_activity_score / total_activity_score) * activity_pool
```

#### 3. **Contribution-Weighted Distribution**
Rewards based on value contributions:
```
contribution_score = Σ(contribution_value * multiplier)
bonus = (user_contribution_score / total_contribution_score) * contribution_pool
```

#### 4. **Hybrid Algorithm** (Default)
Combines all approaches with configurable weights:
```
total_amount = (equal_share * W_equal) +
               (activity_bonus * W_activity) +
               (contribution_bonus * W_contribution) *
               (1 + reputation_score/100 * W_reputation)
```

Default weights:
- Equal: 40%
- Activity: 30%
- Contribution: 20%
- Reputation: 10%

### Anti-Abuse Features
- **Sybil Resistance** - IP-based account linking detection
- **Minimum Account Age** - Prevents new account farming (default: 7 days)
- **Participation Threshold** - Minimum activity score required (default: 10)
- **Maximum Cap Per User** - Prevents whale concentration (default: 1000 tokens)
- **Abuse Tracking** - Flagging system with manual review

### Vesting Schedule
- **Immediate Vesting**: 50% available immediately
- **Gradual Vesting**: 50% vests over configurable period (default: 7 days)

## API Endpoints

### Public Endpoints

#### GET /api/v1/ubi/balance
Get user's UBI balance
```bash
curl "http://localhost:3002/api/v1/ubi/balance?userId=user123&tenantId=tenant1"
```

Response:
```json
{
  "availableBalance": 150.50,
  "pendingBalance": 75.25,
  "lifetimeEarned": 500.00,
  "lifetimeClaimed": 350.00,
  "lastDistributionAt": "2024-03-26T10:00:00Z",
  "lastClaimAt": "2024-03-25T14:30:00Z"
}
```

#### POST /api/v1/ubi/claim
Claim pending UBI
```bash
curl -X POST http://localhost:3002/api/v1/ubi/claim \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "tenantId": "tenant1"}'
```

Response:
```json
{
  "success": true,
  "claimedAmount": 75.25,
  "message": "UBI claimed successfully"
}
```

#### GET /api/v1/ubi/history
Get distribution history
```bash
curl "http://localhost:3002/api/v1/ubi/history?userId=user123&limit=10"
```

#### GET /api/v1/ubi/eligibility
Check eligibility status
```bash
curl "http://localhost:3002/api/v1/ubi/eligibility?userId=user123&tenantId=tenant1&poolId=pool1"
```

Response:
```json
{
  "userId": "user123",
  "tenantId": "tenant1",
  "isEligible": true,
  "participationScore": 45,
  "activityScore": 67.5,
  "contributionScore": 82.3,
  "reputationScore": 75.0,
  "totalScore": 68.4,
  "accountAgeDays": 30,
  "flaggedForAbuse": false
}
```

#### GET /api/v1/ubi/stats
Get pool statistics
```bash
curl "http://localhost:3002/api/v1/ubi/stats?poolId=pool1"
```

### Admin Endpoints

#### POST /api/v1/ubi/pool
Configure UBI pool
```bash
curl -X POST http://localhost:3002/api/v1/ubi/pool \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant1",
    "totalAmount": 1000000,
    "distributionInterval": "daily",
    "weights": {
      "equal": 0.4,
      "activity": 0.3,
      "contribution": 0.2,
      "reputation": 0.1
    },
    "minParticipationScore": 10,
    "maxCapPerUser": 1000,
    "activityDecayDays": 30,
    "vestingPeriodDays": 7
  }'
```

#### POST /api/v1/ubi/distribute
Manually trigger distribution
```bash
curl -X POST http://localhost:3002/api/v1/ubi/distribute \
  -H "Content-Type: application/json" \
  -d '{"poolId": "pool1", "tenantId": "tenant1"}'
```

#### GET /api/v1/ubi/admin/distributions
Get all distributions
```bash
curl "http://localhost:3002/api/v1/ubi/admin/distributions?poolId=pool1&limit=50"
```

#### PUT /api/v1/ubi/admin/pool/:poolId
Update pool settings
```bash
curl -X PUT http://localhost:3002/api/v1/ubi/admin/pool/pool1 \
  -H "Content-Type: application/json" \
  -d '{"totalAmount": 2000000, "isActive": true}'
```

## Event Integration

### Consumed Events
- `task.completed` - Records task completion for contribution scoring
- `referral.converted` - Records referral with bonus multiplier
- `agent.revenue` - Records AI agent revenue contribution

### Published Events
- `ubi.distribution.scheduled` - Distribution workflow started
- `ubi.distribution.completed` - Distribution successfully completed
- `ubi.claimed` - User claimed UBI (also triggers `ledger.transfer.request`)
- `ubi.distribution.failed` - Distribution failed with error

## Temporal Workflows

### Daily Distribution Workflow
Runs daily at configured interval:
1. Calculate distribution for all eligible users
2. Persist distribution records to database
3. Update pool balance
4. Publish completion event

### Weekly Rebalancing Workflow
Runs weekly to maintain pool sustainability:
1. Check pool sustainability metrics
2. Adjust distribution parameters if needed
3. Log recommendations

### Eligibility Recalculation Workflow
Runs daily to refresh eligibility scores:
1. Fetch all active users
2. Recalculate eligibility scores
3. Update cache and database

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- NATS Server 2.9+
- Temporal Server 1.20+

### Installation

1. **Install dependencies**:
```bash
cd services/ubi-engine
npm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run database migrations**:
```bash
psql -U ubi_user -d ubi_engine -f src/database/migrations/001_init.sql
```

4. **Start development server**:
```bash
npm run dev
```

5. **Build for production**:
```bash
npm run build
npm start
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Docker Deployment
```bash
docker build -t ubi-engine:latest .
docker run -p 3002:3002 --env-file .env ubi-engine:latest
```

## Configuration

### Distribution Weights
Weights must sum to 1.0:
```env
WEIGHT_EQUAL=0.4
WEIGHT_ACTIVITY=0.3
WEIGHT_CONTRIBUTION=0.2
WEIGHT_REPUTATION=0.1
```

### Anti-Abuse Settings
```env
MAX_ACCOUNTS_PER_IP=3
MIN_ACCOUNT_AGE_DAYS=7
SYBIL_DETECTION_ENABLED=true
```

### UBI Parameters
```env
UBI_POOL_INITIAL=1000000
UBI_DISTRIBUTION_INTERVAL=daily
UBI_MIN_PARTICIPATION_SCORE=10
UBI_MAX_CAP_PER_USER=1000
UBI_ACTIVITY_DECAY_DAYS=30
UBI_VESTING_PERIOD_DAYS=7
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     UBI Engine Service                   │
├─────────────────────────────────────────────────────────┤
│  API Layer                                              │
│  ├── UBI Controller (balance, claim, history)           │
│  └── Admin Controller (pool config, trigger)            │
├─────────────────────────────────────────────────────────┤
│  Distribution Engine                                     │
│  ├── Eligibility Scorer (scoring algorithm)             │
│  ├── Distribution Calculator (hybrid algorithm)         │
│  └── Vesting Manager                                    │
├─────────────────────────────────────────────────────────┤
│  Event System                                           │
│  ├── Event Consumer (task, referral, revenue)          │
│  └── Event Publisher (distribution, claim)              │
├─────────────────────────────────────────────────────────┤
│  Temporal Workflows                                     │
│  ├── Daily Distribution Workflow                        │
│  ├── Weekly Rebalancing Workflow                       │
│  └── Eligibility Recalculation Workflow                │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  ├── PostgreSQL (pools, distributions, eligibility)    │
│  ├── Redis (eligibility cache)                         │
│  └── NATS (event bus)                                   │
└─────────────────────────────────────────────────────────┘
```

## Performance

- **Eligibility Caching**: 1 hour TTL, < 10ms response time
- **Batch Calculations**: Processes 10,000 users in < 30 seconds
- **Event Processing**: < 100ms per event
- **Distribution Workflow**: Completes in < 5 minutes for 100,000 users

## Monitoring

Health check endpoint:
```bash
curl http://localhost:3002/health
```

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## License

MIT License - See LICENSE file for details
