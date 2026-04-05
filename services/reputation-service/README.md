# Reputation Service

Comprehensive reputation scoring, skill validation, and fraud detection system for the UBI-CMS platform.

## Overview

The Reputation Service calculates and maintains user reputation scores based on multiple factors, tracks skill proficiencies, detects fraud, and provides benefits based on reputation levels.

## Reputation Scoring Algorithm

### Overall Score: 0-1000 Points

**Formula:**
```
Overall Score = Task Score + Quality Score + Reliability Score + Community Score + Longevity Score + Agent Bonus - Decay
```

### Score Components

#### 1. Task Score (0-300 points)
Measures task completion volume and rate.

- **Volume Score** (0-150): `min(150, log10(completed_tasks + 1) * 50)`
  - Logarithmic scaling rewards consistent contribution
  - 10 tasks ≈ 50 points
  - 100 tasks ≈ 100 points
  - 1000+ tasks ≈ 150 points

- **Completion Score** (0-150): `(completion_rate / 100) * 150`
  - Linear scaling based on percentage
  - 80% completion = 120 points
  - 95% completion = 142.5 points

**Weighted Total:** `Volume * 0.4 + Completion * 0.6`

#### 2. Quality Score (0-250 points)
Measures work quality and approval rate.

- **Approval Score** (0-125): `(approval_rate / 100) * 125`
- **Quality Rating Score** (0-125): `(average_quality / 100) * 125`

**Weighted Total:** `Approval * 0.5 + Quality * 0.5`

#### 3. Reliability Score (0-200 points)
Measures dependability and consistency.

- **On-Time Delivery** (0-140): `(on_time_rate / 100) * 140`
- **Consistency** (0-60): Based on performance variance

**Weighted Total:** `OnTime * 0.7 + Consistency * 0.3`

#### 4. Community Score (0-150 points)
Measures community contributions.

- **Endorsements** (0-90): `min(90, sum(endorsement_weights) * 2)`
  - Weighted by endorser reputation
  - Diamond endorsement = 2.0x weight
  - Bronze endorsement = 0.5x weight

- **Referral Contribution** (0-60): `min(60, active_referrals * 5 + success_rate * 0.2)`

**Weighted Total:** `Endorsements * 0.6 + Referrals * 0.4`

#### 5. Longevity Score (0-100 points)
Rewards platform loyalty.

- **Formula:** `min(100, log10(account_age_days + 1) * 35)`
- 30 days ≈ 40 points
- 90 days ≈ 60 points
- 365 days ≈ 80 points
- 730+ days ≈ 100 points

#### 6. Agent Performance Bonus (0-50 points)
Bonus for agent marketplace performance.

- **Revenue Bonus** (0-25): `min(25, log10(total_revenue + 1) * 5)`
- **Rating Bonus** (0-25): `(avg_rating / 5) * 25`

### Reputation Levels

| Level | Score Range | Multiplier | Benefits |
|-------|-------------|------------|----------|
| 🆕 **Newcomer** | 0-199 | 1.0x | Basic platform access |
| 🥉 **Bronze** | 200-399 | 1.2x | +20% rewards, -10% fees |
| 🥈 **Silver** | 400-599 | 1.4x | +40% rewards, -20% fees |
| 🥇 **Gold** | 600-799 | 1.6x | +60% rewards, -30% fees |
| 💎 **Platinum** | 800-899 | 1.8x | +80% rewards, -40% fees |
| 💠 **Diamond** | 900-1000 | 2.0x | +100% rewards, -50% fees |

### Trust Index (0-100)
Separate metric measuring trustworthiness:

```
Trust Index = (approval_rate * 0.4) + (quality * 0.3) + (reliability * 0.2) + (community * 0.1)
```

### Reputation Decay

**Inactivity Penalty:**
- No decay for first 30 days of inactivity
- After 30 days: `decay_factor = (1 - 0.005)^inactive_days`
- Minimum retention: 50% (half-life ≈ 138 days)

**Example:**
- 60 days inactive: ~85% retention
- 90 days inactive: ~73% retention
- 180 days inactive: ~50% retention (minimum)

## Fraud Detection

### Detection Algorithms

#### 1. Unusual Activity Spike
**Z-Score Analysis:**
```
z_score = (recent_average - historical_average) / std_deviation
Alert if |z_score| > 3.0
```

#### 2. Fake Task Detection
Flags:
- Completion rate > 95% AND quality < 60%
- Task completion speed > 20 tasks/hour

#### 3. Review Manipulation
Flags:
- Rating variance < 0.15 (suspiciously consistent)
- Reviewer repetition > 70%

#### 4. Sybil Attack Detection
Compares behavior fingerprints:
- IP patterns
- Device fingerprints
- Activity patterns
- Transaction patterns

Alert if similarity > 85%

#### 5. System Gaming
Flags:
- Reputation growth > 50% in 24h
- Repetitive action pattern > 80%

### Alert Severity Levels

- 🟢 **LOW**: Minor anomaly, monitor
- 🟡 **MEDIUM**: Investigate
- 🟠 **HIGH**: Requires action
- 🔴 **CRITICAL**: Immediate intervention

## API Endpoints

### GET /api/v1/reputation/:userId
Get user reputation.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "overallScore": 750,
    "trustIndex": 85,
    "level": "GOLD",
    "calculatedAt": "2026-03-26T05:52:30Z",
    "components": {
      "taskScore": 240.5,
      "qualityScore": 210.0,
      "reliabilityScore": 165.5,
      "communityScore": 95.0,
      "longevityScore": 82.0
    }
  }
}
```

### GET /api/v1/reputation/:userId/skills
Get skill breakdown.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "skillId": "skill-456",
      "skillName": "Data Entry",
      "proficiencyLevel": 85,
      "tasksCompleted": 150,
      "averageRating": 4.7,
      "endorsements": 12,
      "lastValidated": "2026-03-20T10:00:00Z"
    }
  ]
}
```

### POST /api/v1/reputation/validate-skill
Validate another user's skill (peer validation).

**Request:**
```json
{
  "userId": "user-123",
  "skillId": "skill-456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "validated": true,
    "validatorId": "user-789",
    "timestamp": "2026-03-26T05:52:30Z"
  }
}
```

### GET /api/v1/reputation/leaderboard
Get top users by reputation.

**Query Parameters:**
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "userId": "user-456",
      "username": "top_contributor",
      "score": 950,
      "level": "DIAMOND",
      "change24h": +5
    }
  ]
}
```

### GET /api/v1/reputation/:userId/history
Get reputation history.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2026-03-26T05:52:30Z",
      "score": 750,
      "change": +15,
      "reason": "Task completion bonus",
      "metadata": {
        "taskId": "task-123"
      }
    }
  ]
}
```

### GET /api/v1/reputation/:userId/achievements
Get user achievements.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "achievementId": "achieve-1",
      "name": "Task Master",
      "description": "Complete 100 tasks",
      "category": "TASKS",
      "pointValue": 100,
      "unlockedAt": "2026-03-15T12:00:00Z",
      "progress": 100
    }
  ]
}
```

### POST /api/v1/reputation/endorse
Endorse another user's skill.

**Request:**
```json
{
  "endorseeId": "user-123",
  "skillId": "skill-456",
  "message": "Excellent work quality and communication"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "endorsementId": "endorse-789",
    "weight": 1.75,
    "createdAt": "2026-03-26T05:52:30Z"
  }
}
```

### GET /api/v1/reputation/:userId/benefits
Get reputation benefits.

**Response:**
```json
{
  "success": true,
  "data": {
    "level": "GOLD",
    "rewardMultiplier": 1.6,
    "transactionFeeDiscount": 30,
    "ubiMultiplier": 1.3,
    "votingPower": 77.5,
    "taskAccessLevel": 4
  }
}
```

### POST /api/v1/reputation/recalculate/:userId
Trigger reputation recalculation (admin only).

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "previousScore": 735,
    "newScore": 750,
    "change": +15
  }
}
```

### GET /api/v1/reputation/:userId/fraud-alerts
Get fraud alerts for user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "alertId": "alert-456",
      "alertType": "UNUSUAL_ACTIVITY",
      "severity": "MEDIUM",
      "description": "Activity spike detected. Z-score: 3.2",
      "detectedAt": "2026-03-25T14:30:00Z",
      "resolved": false
    }
  ]
}
```

## Reputation Benefits

### Reward Multipliers
Based on overall score (0-1000):
```javascript
rewardMultiplier = 1.0 + (score / 1000)
// Score 750 = 1.75x multiplier
```

### Transaction Fee Discounts
Up to 50% discount:
```javascript
discount = min(50, (score / 1000) * 50)
// Score 750 = 37.5% discount
```

### UBI Multipliers
Up to 1.5x UBI allocation:
```javascript
ubiMultiplier = 1.0 + (score / 1000) * 0.5
// Score 750 = 1.375x UBI
```

### Voting Power
Quadratic scaling for fairness:
```javascript
votingPower = sqrt(score / 1000) * 100
// Score 750 = 86.6 voting power
```

## Setup

### Environment Variables
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ubi_cms
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
REWARDS_SERVICE_URL=http://localhost:3003
PORT=3002
NODE_ENV=production
```

### Installation
```bash
cd services/reputation-service
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
- `reputation_scores` - Current reputation scores
- `task_metrics` - Task performance metrics
- `skill_proficiencies` - User skill levels
- `community_endorsements` - Peer endorsements
- `fraud_alerts` - Fraud detection alerts
- `achievements` - Achievement definitions
- `user_achievements` - Unlocked achievements
- `reputation_history` - Score change history

## Temporal Workflows

### Reputation Decay
Daily workflow to apply decay for inactive users:
- Identify users inactive > 30 days
- Calculate decay factor
- Update reputation scores
- Log changes

### Achievement Checks
Event-driven workflow:
- Triggered on task completion, endorsements, etc.
- Check achievement requirements
- Unlock achievements
- Award bonus points

## Performance

- **Redis Caching**: 1-minute cache for frequently accessed scores
- **Materialized Views**: Pre-calculated leaderboards
- **Batch Processing**: Bulk recalculations
- **Indexed Queries**: Optimized for fast lookups

## Security

- **Authentication**: JWT-based auth
- **Rate Limiting**: Prevents abuse
- **Endorsement Limits**: 5 endorsements/minute
- **Validation Rules**: Prevent self-endorsement
- **Audit Logging**: All score changes tracked

## Integration with Rewards Engine

Tight coupling for:
1. **Multiplier Calculation**: Provides reputation score for rewards
2. **Fraud Detection**: Flags suspicious reward patterns
3. **Achievement Rewards**: Triggers reward calculations

## Monitoring

### Metrics
- Average reputation score
- Score distribution
- Fraud alert rate
- Endorsement velocity
- Achievement unlock rate

### Logging
- Score calculations
- Fraud detections
- Endorsements
- Achievement unlocks

## Future Enhancements

- [ ] ML-based fraud detection
- [ ] Skill relationship graph
- [ ] Dynamic weight adjustment
- [ ] Reputation NFTs
- [ ] Cross-platform reputation portability
- [ ] Reputation insurance/staking
- [ ] Anonymous reputation queries

## License

MIT
