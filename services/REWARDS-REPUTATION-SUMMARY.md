# Rewards Engine + Reputation Service - Implementation Summary

## Overview

Two tightly coupled microservices providing comprehensive rewards calculation and reputation scoring for the UBI-CMS platform.

## Services Deployed

### 1. Rewards Engine (`/services/rewards-engine/`)
**Port:** 3003  
**Purpose:** Calculate and distribute rewards with dynamic multipliers

**Key Features:**
- ✅ Multi-source reward calculation (6 sources)
- ✅ 4-tier multiplier system (max 4.68x)
- ✅ Real-time reward tracking
- ✅ Automated distribution via ledger integration
- ✅ Reward pooling and allocation
- ✅ 3-tier referral program (10%/5%/2%)
- ✅ Agent marketplace revenue sharing (70/30 split)

### 2. Reputation Service (`/services/reputation-service/`)
**Port:** 3002  
**Purpose:** Track reputation, validate skills, detect fraud

**Key Features:**
- ✅ Comprehensive scoring algorithm (0-1000 points)
- ✅ 5-component reputation calculation
- ✅ 6 reputation levels (Newcomer → Diamond)
- ✅ Trust index (0-100)
- ✅ Skill proficiency tracking
- ✅ Fraud detection (5 algorithms)
- ✅ Achievement system
- ✅ Reputation decay for inactivity

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UBI-CMS Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌─────────────────────┐       │
│  │ Reputation       │◄────────┤  Rewards Engine     │       │
│  │ Service          │         │                     │       │
│  │                  │ Score   │  - Multipliers      │       │
│  │ - Scoring        │────────►│  - Distribution     │       │
│  │ - Skills         │         │  - Pooling          │       │
│  │ - Fraud          │         │  - Referrals        │       │
│  │ - Achievements   │         └─────────────────────┘       │
│  └──────────────────┘                   │                    │
│           │                              │                    │
│           ▼                              ▼                    │
│  ┌──────────────────┐         ┌─────────────────────┐       │
│  │   PostgreSQL     │         │  Ledger Service     │       │
│  │   (Shared DB)    │         │  (Transactions)     │       │
│  └──────────────────┘         └─────────────────────┘       │
│           │                                                   │
│           ▼                                                   │
│  ┌──────────────────┐         ┌─────────────────────┐       │
│  │   Redis Cache    │         │   NATS EventBus     │       │
│  │   (Fast Lookup)  │         │   (Async Events)    │       │
│  └──────────────────┘         └─────────────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Tight Coupling Integration

### Data Flow

1. **Task Completion:**
   ```
   Task Approved → Reputation Service (update metrics)
                → Rewards Engine (calculate reward with reputation multiplier)
                → Ledger Service (record transaction)
   ```

2. **Reputation Update:**
   ```
   Metrics Updated → Reputation Calculator (recalculate score)
                   → Redis Cache (update cached score)
                   → NATS Event (notify rewards engine)
   ```

3. **Fraud Detection:**
   ```
   Suspicious Activity → Fraud Detector (analyze patterns)
                       → Fraud Alert (create alert)
                       → Block Rewards (prevent gaming)
   ```

### Service Communication

| From | To | Method | Purpose |
|------|-----|--------|---------|
| Rewards → Reputation | HTTP GET | Fetch reputation score for multiplier |
| Reputation → Rewards | NATS Event | Notify score changes |
| Rewards → Ledger | HTTP POST | Create distribution transactions |
| Task System → Reputation | NATS Event | Update task metrics |
| Task System → Rewards | NATS Event | Calculate task rewards |

## Scoring Algorithms

### Reputation Score (0-1000)

```javascript
Overall Score = TaskScore + QualityScore + ReliabilityScore 
              + CommunityScore + LongevityScore + AgentBonus
              - Decay

Components:
- Task Score (0-300):      40% volume + 60% completion rate
- Quality Score (0-250):   50% approval + 50% quality rating
- Reliability (0-200):     70% on-time + 30% consistency
- Community (0-150):       60% endorsements + 40% referrals
- Longevity (0-100):       Logarithmic account age
- Agent Bonus (0-50):      Revenue + rating based
```

### Reward Multipliers

```javascript
Total Multiplier = Reputation × Loyalty × Staking × Volume

1. Reputation (1.0 - 2.0x):  1.0 + (score / 1000)
2. Loyalty (1.0 - 1.5x):     1.0 + log_growth(account_age) * 0.5
3. Staking (1.0 - 1.3x):     1.0 + log_growth(staked_tokens) * 0.3
4. Volume (1.0 - 1.2x):      1.0 + min(volume, 50k) / 50k * 0.2

Maximum Combined: 2.0 × 1.5 × 1.3 × 1.2 = 4.68x
```

### Fraud Detection

**5 Detection Algorithms:**

1. **Unusual Activity Spike**
   - Z-score > 3.0 triggers alert
   - Compares recent vs. historical average

2. **Fake Task Detection**
   - Completion > 95% + Quality < 60% = suspicious
   - Task speed > 20/hour = suspicious

3. **Review Manipulation**
   - Rating variance < 0.15 = suspicious
   - Reviewer repetition > 70% = suspicious

4. **Sybil Attack**
   - Behavior fingerprint similarity > 85% = critical

5. **System Gaming**
   - Reputation growth > 50% in 24h = suspicious
   - Action repetition > 80% = suspicious

## API Endpoints Summary

### Rewards Engine (7 endpoints)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/rewards/calculate` | Calculate reward |
| GET | `/api/v1/rewards/history` | Reward history |
| GET | `/api/v1/rewards/pending` | Pending rewards |
| POST | `/api/v1/rewards/claim` | Claim rewards |
| GET | `/api/v1/rewards/stats` | Aggregate stats |
| GET | `/api/v1/rewards/pools` | Active pools |
| GET | `/api/v1/rewards/multipliers/:userId` | User multipliers |

### Reputation Service (10 endpoints)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/reputation/:userId` | Get reputation |
| GET | `/api/v1/reputation/:userId/skills` | Skill breakdown |
| POST | `/api/v1/reputation/validate-skill` | Validate skill |
| GET | `/api/v1/reputation/leaderboard` | Top users |
| GET | `/api/v1/reputation/:userId/history` | Score history |
| GET | `/api/v1/reputation/:userId/achievements` | Achievements |
| POST | `/api/v1/reputation/endorse` | Endorse user |
| GET | `/api/v1/reputation/:userId/benefits` | Reputation benefits |
| POST | `/api/v1/reputation/recalculate/:userId` | Force recalc |
| GET | `/api/v1/reputation/:userId/fraud-alerts` | Fraud alerts |

## Database Schema

**Tables Created:** 18

### Rewards Engine Tables (5)
- `rewards` - All reward records
- `referral_rewards` - Referral details
- `agent_revenue_shares` - Agent marketplace
- `reward_pools` - Pool allocations
- `reward_distributions` - Distribution records

### Reputation Service Tables (13)
- `reputation_scores` - Current scores
- `task_metrics` - Task performance
- `skill_proficiencies` - Skill levels
- `referral_metrics` - Referral stats
- `agent_performance_metrics` - Agent stats
- `community_endorsements` - Peer endorsements
- `fraud_alerts` - Fraud detections
- `achievements` - Achievement defs
- `user_achievements` - Unlocked achievements
- `reputation_history` - Score changes
- `reputation_stakes` - Staking records
- Views: `reputation_leaderboard`, `user_reward_summary`

## Events (NATS)

### Published Events

**Rewards Engine:**
- `reward.calculated` - Reward calculated
- `reward.distributed` - Rewards claimed

**Reputation Service:**
- `reputation.updated` - Score changed
- `achievement.unlocked` - Achievement earned
- `fraud.detected` - Fraud alert created

### Subscribed Events

**Rewards Engine:**
- `task.approved` - Calculate task reward
- `referral.converted` - Calculate referral reward
- `agent.revenue` - Calculate revenue share

**Reputation Service:**
- `task.completed` - Update metrics
- `task.approved` - Update metrics
- `endorsement.created` - Recalculate score

## Reputation Levels & Benefits

| Level | Score | Reward Mult. | Fee Discount | UBI Mult. | Voting Power |
|-------|-------|--------------|--------------|-----------|--------------|
| 🆕 Newcomer | 0-199 | 1.00-1.20x | 0-10% | 1.00-1.10x | 0-45 |
| 🥉 Bronze | 200-399 | 1.20-1.40x | 10-20% | 1.10-1.20x | 45-63 |
| 🥈 Silver | 400-599 | 1.40-1.60x | 20-30% | 1.20-1.30x | 63-77 |
| 🥇 Gold | 600-799 | 1.60-1.80x | 30-40% | 1.30-1.40x | 77-89 |
| 💎 Platinum | 800-899 | 1.80-1.90x | 40-45% | 1.40-1.45x | 89-95 |
| 💠 Diamond | 900-1000 | 1.90-2.00x | 45-50% | 1.45-1.50x | 95-100 |

## Technology Stack

### Runtime
- Node.js 18+
- TypeScript 5.3

### Frameworks
- Express.js (API)
- Zod (Validation)

### Databases
- PostgreSQL (Primary)
- Redis (Caching)

### Messaging
- NATS (Event Bus)

### Workflow
- Temporal (Background jobs)

### Security
- Helmet (Security headers)
- JWT (Authentication)
- Rate limiting

## Performance Optimizations

### Caching Strategy
- **Reputation scores:** 1-minute TTL
- **Reward stats:** 5-minute TTL
- **Leaderboard:** 5-minute TTL
- **User multipliers:** On-demand calculation

### Database Optimization
- Proper indexing on all foreign keys
- Materialized views for leaderboards
- Connection pooling
- Prepared statements

### Event-Driven
- Asynchronous processing via NATS
- Non-blocking reward calculations
- Background score recalculations

## Security Features

1. **Authentication:** JWT-based auth middleware
2. **Rate Limiting:** Per-endpoint limits
3. **Input Validation:** Zod schemas
4. **SQL Injection:** Parameterized queries
5. **Fraud Detection:** Real-time monitoring
6. **Audit Logging:** All operations logged
7. **Transaction Safety:** ACID compliance

## Deployment

### Prerequisites
```bash
# Database
PostgreSQL 14+
Redis 7+
NATS 2.9+

# Node.js
Node 18+
npm/yarn
```

### Installation
```bash
# Run migration
psql -U user -d ubi_cms -f migrations/008_rewards_reputation_schema.sql

# Install rewards engine
cd services/rewards-engine
cp .env.example .env
npm install
npm run build
npm start

# Install reputation service
cd services/reputation-service
cp .env.example .env
npm install
npm run build
npm start
```

### Docker Compose (Optional)
```yaml
services:
  rewards-engine:
    build: ./services/rewards-engine
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - NATS_URL=nats://nats:4222
    
  reputation-service:
    build: ./services/reputation-service
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - NATS_URL=nats://nats:4222
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Coverage
- Target: 80%+ coverage
- Jest with ts-jest

## Monitoring

### Metrics to Track
- Reward calculation latency
- Reputation calculation time
- Fraud detection rate
- Average multipliers
- Pool depletion rate
- Cache hit ratio
- Event processing time

### Logging
- Winston structured logging
- Log levels: error, warn, info, debug
- Log rotation
- Centralized logging (optional)

## Future Enhancements

### Rewards Engine
- [ ] Dynamic pool allocation
- [ ] ML-based reward prediction
- [ ] Cross-chain reward portability
- [ ] Reward NFTs

### Reputation Service
- [ ] ML-based fraud detection
- [ ] Skill relationship graph
- [ ] Dynamic weight adjustment
- [ ] Reputation insurance/staking
- [ ] Verifiable credentials

## Key Files

### Rewards Engine
```
services/rewards-engine/
├── src/
│   ├── domain/
│   │   ├── types.ts                    # Type definitions
│   │   ├── RewardsCalculator.ts        # Core calculation engine
│   │   └── services/
│   │       └── RewardsService.ts       # Business logic
│   ├── api/
│   │   ├── routes.ts                   # API routes
│   │   └── controllers/
│   │       └── RewardsController.ts    # Request handlers
│   ├── infrastructure/
│   │   ├── middleware/                 # Auth, validation, etc.
│   │   ├── events/                     # Event bus
│   │   └── logger.ts                   # Logging
│   └── index.ts                        # Entry point
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
└── README.md
```

### Reputation Service
```
services/reputation-service/
├── src/
│   ├── domain/
│   │   ├── types.ts                    # Type definitions
│   │   ├── ReputationCalculator.ts     # Scoring algorithm
│   │   ├── FraudDetector.ts            # Fraud detection
│   │   └── services/
│   │       └── ReputationService.ts    # Business logic
│   ├── api/
│   │   ├── routes.ts                   # API routes
│   │   └── controllers/
│   │       └── ReputationController.ts # Request handlers
│   ├── infrastructure/
│   │   ├── middleware/                 # Auth, validation, etc.
│   │   ├── events/                     # Event bus
│   │   └── logger.ts                   # Logging
│   └── index.ts                        # Entry point
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env.example
└── README.md
```

### Database
```
migrations/
└── 008_rewards_reputation_schema.sql   # Complete schema
```

## Success Metrics

✅ **Complete implementations** for both services  
✅ **18 database tables** with proper relationships  
✅ **17 API endpoints** (7 rewards + 10 reputation)  
✅ **Comprehensive algorithms** documented  
✅ **Fraud detection** with 5 algorithms  
✅ **Event-driven architecture** with NATS  
✅ **Redis caching** for performance  
✅ **Full TypeScript** with strict typing  
✅ **Security** features implemented  
✅ **Detailed README** files for each service  

## License

MIT

---

**Status:** ✅ PRODUCTION READY

Both services are fully implemented and ready for deployment with comprehensive documentation, algorithms, and database schemas.
