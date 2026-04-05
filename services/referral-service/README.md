# Referral Service

Multi-tier referral tracking and reward distribution service for the UBI-CMS platform.

## Features

- **Multi-tier Referral System**: Track up to 5 levels of referrals
- **Automatic Reward Calculation**: Distribute rewards based on referee activity
- **Fraud Detection**: IP, device fingerprinting, and velocity-based fraud prevention
- **Referral Analytics**: Comprehensive stats, leaderboards, and tree visualization
- **Cookie Tracking**: 30-day referral tracking via cookies
- **Event-Driven**: Integrates with NATS for real-time event processing
- **Milestone Bonuses**: Rewards for reaching referral milestones (10, 50, 100)

## Architecture

```
┌─────────────────┐
│  API Gateway    │
└────────┬────────┘
         │
┌────────▼────────────────────────────────────────┐
│          Referral Service (Port 3007)           │
├─────────────────────────────────────────────────┤
│  Controllers                                    │
│  ├─ ReferralController                          │
│  └─ Events (NATS)                               │
├─────────────────────────────────────────────────┤
│  Services                                       │
│  ├─ ReferralService (Core logic)                │
│  ├─ FraudDetectionService                       │
│  └─ EventListener                               │
├─────────────────────────────────────────────────┤
│  Models                                         │
│  ├─ ReferralModel                               │
│  └─ RewardModel                                 │
└────────┬────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼───┐
│ PG   │  │Redis │
└──────┘  └──────┘
```

## API Endpoints

### GET /api/v1/referrals/my-code
Get authenticated user's referral code and link.

**Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": "AbC123Xy",
    "referralLink": "https://app.example.com?ref=AbC123Xy"
  }
}
```

### POST /api/v1/referrals/register
Register a new user with a referral code.

**Request:**
```json
{
  "userId": "user123",
  "referralCode": "AbC123Xy"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user123",
    "referrerId": "referrer-id",
    "tier": 1,
    "status": "active",
    "fraudScore": 0
  }
}
```

### GET /api/v1/referrals/stats
Get referral statistics for authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "referralCode": "AbC123Xy",
    "totalReferrals": 25,
    "activeReferrals": 20,
    "suspiciousReferrals": 3,
    "blockedReferrals": 2,
    "referralsByTier": {
      "1": 15,
      "2": 8,
      "3": 2
    },
    "totalEarnings": 1250.50,
    "pendingEarnings": 250.00,
    "distributedEarnings": 1000.50,
    "conversionRate": 80.0
  }
}
```

### GET /api/v1/referrals/tree
Get referral tree visualization.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user123",
      "referralCode": "AbC123Xy"
    },
    "tier": 0,
    "children": [
      {
        "user": { "id": "user456", "referralCode": "Xyz789Qw" },
        "tier": 1,
        "children": [],
        "stats": {
          "totalReferrals": 5,
          "activeReferrals": 4,
          "totalEarnings": 150.00
        }
      }
    ],
    "stats": {
      "totalReferrals": 25,
      "activeReferrals": 20,
      "totalEarnings": 1250.50
    }
  }
}
```

### GET /api/v1/referrals/rewards
Get reward history.

**Query Parameters:**
- `limit` (default: 100)
- `offset` (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "referrerId": "user123",
      "refereeId": "user456",
      "tier": 1,
      "amount": 10.00,
      "currency": "USD",
      "source": "task_completion",
      "status": "distributed",
      "calculatedAt": "2024-01-01T00:00:00Z",
      "distributedAt": "2024-01-02T00:00:00Z"
    }
  ]
}
```

### GET /api/v1/referrals/leaderboard
Get top referrers.

**Query Parameters:**
- `limit` (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "user123",
      "referralCode": "AbC123Xy",
      "totalReferrals": 150,
      "activeReferrals": 120,
      "tier1Referrals": 100,
      "totalEarnings": 5000.00
    }
  ]
}
```

### POST /api/v1/referrals/payout
Request reward payout.

**Request:**
```json
{
  "amount": 100.00,
  "method": "bank_transfer"
}
```

## Referral Tiers

| Tier | Percentage | Max Per Referee | Description |
|------|------------|-----------------|-------------|
| 1    | 10%        | $1000          | Direct referrals |
| 2    | 5%         | $500           | Referrals of your referrals |
| 3    | 3%         | $300           | Third level |
| 4    | 2%         | $200           | Fourth level |
| 5    | 1%         | $100           | Fifth level |

## Conversion Milestones

1. **Registration**: User completes account registration
2. **First Task**: User completes their first task
3. **First Agent**: User deploys their first agent
4. **$100 Earned**: User earns $100 on the platform
5. **Active 30 Days**: User remains active for 30 days

## Fraud Detection

The system employs multiple fraud detection mechanisms:

- **IP Tracking**: Max 5 referrals per IP address
- **Device Fingerprinting**: Max 3 referrals per device
- **Velocity Detection**: Max 10 referrals per hour
- **Fraud Scoring**: Automatic scoring with blocking at 80+ score

## Environment Variables

```bash
NODE_ENV=development
PORT=3007

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ubi_cms
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# NATS
NATS_URL=nats://localhost:4222

# Referral Settings
REFERRAL_CODE_LENGTH=8
REFERRAL_COOKIE_DAYS=30
MAX_REFERRAL_TIERS=5

# Tier Percentages (basis points)
TIER_1_PERCENTAGE=1000  # 10%
TIER_2_PERCENTAGE=500   # 5%
TIER_3_PERCENTAGE=300   # 3%
TIER_4_PERCENTAGE=200   # 2%
TIER_5_PERCENTAGE=100   # 1%

# Fraud Detection
MAX_REFERRALS_PER_IP=5
MAX_REFERRALS_PER_DEVICE=3
SUSPICIOUS_VELOCITY_MINUTES=60
SUSPICIOUS_VELOCITY_COUNT=10

# Rewards
MAX_REWARD_PER_REFEREE=1000
MAX_DAILY_PAYOUT=10000
```

## Events

### Listens To:
- `user.registered` - New user registration
- `task.completed` - Task completion (triggers reward calculation)
- `agent.deployed` - Agent deployment milestone
- `reward.distributed` - Reward distribution (triggers referral rewards)

### Emits:
- `referral.registered` - New referral registered
- `referral.converted` - Referral milestone achieved
- `referral.reward.calculated` - Referral reward calculated

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Build
npm run build

# Start production
npm start

# Lint
npm run lint

# Type check
npm run typecheck
```

## Database Migration

Run the migration to create required tables:

```bash
psql -U postgres -d ubi_cms -f migrations/008_create_referral_tables.sql
```

## Testing

```bash
# Run all tests with coverage
npm test

# Run specific test file
npm test -- fraudDetection.test.ts

# Run integration tests
npm run test:integration
```

## Security Considerations

1. **Rate Limiting**: Implement rate limiting on registration endpoints
2. **JWT Verification**: Ensure proper JWT token verification in production
3. **Fraud Monitoring**: Monitor fraud scores and adjust thresholds
4. **Payout Verification**: Implement manual review for large payouts
5. **Data Privacy**: Hash/encrypt sensitive tracking data

## Performance Optimization

- **Database Indexes**: All foreign keys and frequently queried fields are indexed
- **Redis Caching**: Fraud detection uses Redis for fast lookups
- **Batch Processing**: Reward calculations can be batched for high volume
- **Recursive CTEs**: Efficient referral tree queries using PostgreSQL CTEs

## License

Proprietary - UBI-CMS Platform
